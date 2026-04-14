import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const body = await req.json().catch(() => ({}));
    const { dataInicio, dataFim, numeroAgencia, numeroConta } = body;

    // 1. Get tokens and settings from DB
    const { data: bbSettings, error: dbErr } = await supabase
      .from('bb_settings')
      .select('client_id, client_secret, app_key, agencia, conta, sandbox, client_cert, client_key')
      .eq('id', 1)
      .maybeSingle();

    if (dbErr) throw dbErr;
    if (!bbSettings || !bbSettings.client_id || !bbSettings.app_key) {
      throw new Error('As credenciais do Banco do Brasil não estão cadastradas na base de dados (tabela bb_settings). Preencha na tela "API & Config".');
    }

    const { client_id: clientId, client_secret: clientSecret, app_key: appKey, sandbox: isSandbox, client_cert: cert, client_key: key } = bbSettings;

    // Initialize mTLS client if certificate is provided
    let httpClient: any = undefined;
    if (cert && key) {
      console.log("[BB mTLS] Certificate detected. Initializing mTLS client...");
      try {
        httpClient = Deno.createHttpClient({
          cert: cert,
          key: key,
        });
      } catch (e) {
        console.error("[BB mTLS] Failed to create HTTP client:", e.message);
      }
    }

    // 2. Fetch BB Token
    const credentials = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
    
    // Per BB official spec: OAuth URL for Sandbox is oauth.hm.bb.com.br, Production is oauth.bb.com.br
    const tokenUrl = isSandbox
      ? 'https://oauth.hm.bb.com.br/oauth/token'
      : 'https://oauth.bb.com.br/oauth/token';

    console.log(`[BB OAuth] Attempting token fetch for ${isSandbox ? 'Sandbox (hm)' : 'Production'}...`);
    
    // Per BB official spec: OAuth scope is 'extrato-info'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'gw-dev-app-key': appKey.trim()
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'extrato-info',
      }).toString(),
      // @ts-ignore: Deno-specific fetch option
      client: httpClient,
    });

    const tokenRaw = await tokenResponse.text();
    console.log(`[BB OAuth] Response Status: ${tokenResponse.status}`);
    
    let tokenData: any = {};
    try {
        tokenData = JSON.parse(tokenRaw);
    } catch {
        console.error(`[BB OAuth] Failed to parse as JSON. Raw response: ${tokenRaw.substring(0, 500)}`);
        throw new Error(`BB OAuth HTML Error (${tokenResponse.status}): Verifique se o certificado foi enviado ao portal do BB corretamente.`);
    }

    if (!tokenResponse.ok) {
      const detail = tokenData.error_description || tokenData.error || tokenData.mensagem || tokenRaw || JSON.stringify(tokenData);
      throw new Error(`BB OAuth Error (${tokenResponse.status}): ${detail}`);
    }
    const accessToken = tokenData.access_token;
    console.log(`[BB OAuth] Token obtained successfully.`);

    // 3. Build date range (default: last 7 days for sandbox)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const since = dataInicio || weekAgo.toISOString().split('T')[0];
    const until = dataFim || today.toISOString().split('T')[0];

    const agencia = numeroAgencia || bbSettings.agencia || '';
    const conta = numeroConta || bbSettings.conta || '';

    if (!agencia || !conta) {
      throw new Error('Agência e Conta são obrigatórias. Preencha na aba "API & Config".');
    }

    // Per BB official OpenAPI spec: Endpoints
    // Sandbox with mTLS: https://api-extratos.hm.bb.com.br/extratos/v1
    // Production:        https://api-extratos.bb.com.br/extratos/v1
    const baseUrl = isSandbox
      ? 'https://api-extratos.hm.bb.com.br/extratos/v1'
      : 'https://api-extratos.bb.com.br/extratos/v1';
      
    // BB requires dates as integers in DDMMAAAA format
    const formatDateBB = (dateStr: string): number => {
      const [year, month, day] = dateStr.split('-');
      return parseInt(`${day}${month}${year}`, 10);
    };

    // Per spec: PATH params are agencia and conta, QUERY params are gw-dev-app-key and dates
    const params = new URLSearchParams({
      'gw-dev-app-key': appKey.trim(),
      'dataInicioSolicitacao': formatDateBB(since).toString(),
      'dataFimSolicitacao': formatDateBB(until).toString(),
    });

    const apiUrl = `${baseUrl}/conta-corrente/agencia/${agencia}/conta/${conta}?${params}`;
    console.log(`[BB Extrato] Request URL: ${apiUrl}`);
    
    // The x-br-com-bb-ipa-mciteste header is REQUIRED for Sandbox tests
    const sandboxHeader = isSandbox ? { 'x-br-com-bb-ipa-mciteste': '26968930' } : {};

    let retries = 3;
    let response: Response | null = null;
    while (retries > 0) {
      try {
        response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            ...sandboxHeader,
          },
          // @ts-ignore: Deno-specific fetch option
          client: httpClient,
        });
        break;
      } catch (e) {
        console.error(`[BB Extrato] Fetch failed (attempt ${4-retries}):`, e.message);
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 1000 * (3 - retries)));
      }
    }

    const rawResponse = await response!.text();
    console.log(`[BB Extrato] Response Status: ${response!.status}`);
    
    let data: any = {};
    try {
      data = JSON.parse(rawResponse);
    } catch {
      console.error(`[BB Extrato] Failed to parse as JSON. Raw response snippet: ${rawResponse.substring(0, 1000)}`);
      if (rawResponse.includes('<!DOCTYPE') || rawResponse.includes('<html')) {
        const titleMatch = rawResponse.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : "Sem título";
        throw new Error(`BB API HTML Error (${response!.status}): ${title} - Conta ${agencia}/${conta}`);
      }
      throw new Error(`BB API Format Error (${response!.status}): Formato inválido.`);
    }

    if (!response!.ok) throw new Error(data.erros?.[0]?.mensagem || `BB API Error ${response!.status}`);

    // 4. Filter credits only and normalize
    // Per BB API spec, the response field is 'listaLancamento'
    const allTransactions = data.listaLancamento
      ? (Array.isArray(data.listaLancamento) ? data.listaLancamento : Object.values(data.listaLancamento))
      : [...(data.lancamentos || []), ...(data.extratoLancamentos || [])];
    
    // Per spec: indicadorSinalLancamento 'C' = crédito, 'D' = débito
    const credits = allTransactions.filter((t: any) => {
      const sinal = t.indicadorSinalLancamento || t.tipoLancamento || t.tipo || '';
      return sinal === 'C' || sinal === 'CREDITO';
    });

    // 5. Upsert to bank_transactions avoiding duplicates
    let inserted = 0;
    let skipped = 0;

    for (const t of credits) {
      // Per spec: numeroDocumento is the transaction identifier
      const txId = t.numeroDocumento?.toString() || t.identificador || `${t.dataLancamento}_${t.valorLancamento}_${Math.random()}`;
      const amount = parseFloat(t.valorLancamento || t.valor || '0');
      // Per spec: textoDescricaoHistorico is the description
      const desc = t.textoDescricaoHistorico || t.textoInformacaoComplementar || t.descricao || 'Crédito';
      // Per spec: dataLancamento is in DDMMAAAA integer format, e.g. 11112022
      const dateRaw = t.dataLancamento?.toString() || since.replace(/-/g, '');
      let dateISO = since;
      if (dateRaw && dateRaw.length === 8) {
        dateISO = `${dateRaw.substring(4,8)}-${dateRaw.substring(2,4)}-${dateRaw.substring(0,2)}`;
      }

      const { error } = await supabase
        .from('bank_transactions')
        .upsert([{
          transaction_id: txId,
          amount,
          type: 'credit',
          description: desc,
          date: new Date(date).toISOString(),
          matched: false,
          raw_data: t,
          source: 'banco_brasil',
        }], {
          onConflict: 'transaction_id',
          ignoreDuplicates: true,
        });

      if (error) {
        console.error('[BB Transactions] Upsert error:', error);
        skipped++;
      } else {
        inserted++;
      }
    }

    await supabase.from('integration_logs').insert([{
      source: 'banco_brasil',
      event: 'transactions_fetched',
      payload: { since, until, total: credits.length, inserted, skipped },
      status: 'success'
    }]).catch(() => {});

    return new Response(JSON.stringify({ 
      success: true, 
      total: credits.length,
      inserted,
      skipped,
      period: { since, until }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    const errorMsg = err.message || 'Unknown error';
    console.error('[BB Fetch Transactions] Error:', errorMsg);
    
    // Attempt to log error if supabase is available
    if (typeof supabase !== 'undefined' && supabase) {
      await supabase.from('integration_logs').insert([{
        source: 'banco_brasil',
        event: 'transactions_fetch_error',
        payload: { error: errorMsg },
        status: 'error'
      }]).catch((e: any) => console.error('Failed to log to integration_logs:', e.message));
    }

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
