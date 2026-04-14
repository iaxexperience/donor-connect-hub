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

    // 2. Fetch BB Token directly here instead of calling another function to avoid internal latency
    const credentials = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
    const tokenUrl = isSandbox
      ? 'https://oauth.sandbox.bb.com.br/oauth/token'
      : 'https://oauth.bb.com.br/oauth/token';

    console.log(`[BB OAuth] Attempting token fetch for ${isSandbox ? 'Sandbox' : 'Production'}...`);
    
    // Note: We removed the 'scope' parameter because for many BB Sandbox apps, 
    // including it leads to a 400 Bad Request error.
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

    // 3. Build date range (default: today)
    const today = new Date();
    const since = dataInicio || today.toISOString().split('T')[0];
    const until = dataFim || today.toISOString().split('T')[0];

    const agencia = numeroAgencia || bbSettings.agencia || '';
    const conta = numeroConta || bbSettings.conta || '';

    if (!agencia || !conta) {
      throw new Error('Agência e Conta são obrigatórias para buscar o extrato. Preencha na aba "API & Config".');
    }

    const baseUrl = isSandbox
      ? 'https://api.sandbox.bb.com.br'
      : 'https://api.bb.com.br';
      
    // 4. Fetch transactions from BB API
    const params = new URLSearchParams({
      'dataInicio': since,
      'dataFim': until,
      'numeroAgencia': agencia.padStart(4, '0'),
      'numeroConta': conta,
    });

    console.log(`[BB Extrato] Request URL: ${baseUrl}/extrato/v1/conta?${params}`);
    
    let retries = 3;
    let response: Response | null = null;
    while (retries > 0) {
      try {
        response = await fetch(`${baseUrl}/extrato/v1/conta?${params}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'gw-dev-app-key': appKey
          },
          // @ts-ignore: Deno-specific fetch option
          client: httpClient,
        });
        break;
      } catch (e) {
        console.error(`[BB Extrato] Fetch failed (attempt ${4-retries}):`, e.message);
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 1000 * (3 - retries))); // exponential backoff
      }
    }

    const rawResponse = await response!.text();
    console.log(`[BB Extrato] Response Status: ${response!.status}`);
    
    let data: any = {};
    try {
      data = JSON.parse(rawResponse);
    } catch {
      console.error(`[BB Extrato] Failed to parse as JSON. Raw response snippet: ${rawResponse.substring(0, 1000)}`);
      // If the body contains "DOCTYPE", it's definitely HTML. Let's provide a better error.
      if (rawResponse.includes('<!DOCTYPE') || rawResponse.includes('<html')) {
        throw new Error(`BB API HTML Error (${response!.status}): O banco retornou uma página web. Verifique se a Agência/Conta ${agencia}/${conta} é válida para o Sandbox.`);
      }
      throw new Error(`BB API Format Error (${response!.status}): Formato inválido recebido do banco.`);
    }

    if (!response!.ok) throw new Error(data.erros?.[0]?.mensagem || 'BB API Error');

    // 4. Filter credits only and normalize
    const allTransactions = [
      ...(data.lancamentos || []),
      ...(data.extratoLancamentos || []),
    ];
    
    const credits = allTransactions.filter((t: any) => {
      const tipo = t.tipoLancamento || t.tipo || '';
      const valor = parseFloat(t.valor || t.valorLancamento || '0');
      return tipo === 'C' || tipo === 'CREDITO' || valor > 0;
    });

    // 5. Upsert to bank_transactions avoiding duplicates
    let inserted = 0;
    let skipped = 0;

    for (const t of credits) {
      const txId = t.identificador || t.codigoLancamento || `${t.data}_${t.valor}_${Math.random()}`;
      const amount = parseFloat(t.valor || t.valorLancamento || '0');
      const desc = t.descricaoHistorico || t.historico || t.descricao || 'Crédito';
      const date = t.dataLancamento || t.data || since;

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
