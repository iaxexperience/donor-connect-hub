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
      .select('client_id, client_secret, app_key, agencia, conta, sandbox')
      .eq('id', 1)
      .maybeSingle();

    if (dbErr) throw dbErr;
    if (!bbSettings || !bbSettings.client_id || !bbSettings.app_key) {
      throw new Error('As credenciais do Banco do Brasil não estão cadastradas na base de dados (tabela bb_settings). Preencha na tela "API & Config".');
    }

    const { client_id: clientId, client_secret: clientSecret, app_key: appKey, sandbox: isSandbox } = bbSettings;

    // Preventive check for JWT used as Client ID
    if (clientId.trim().startsWith('ey')) {
      throw new Error('DETECTADO: Você parece estar tentando usar um "Access Token" (que começa com ey...) no campo "Client ID". No Banco do Brasil, o Client ID é um código alfanumérico curto ou UUID. Verifique no portal developers.bb.com.br.');
    }
    if (clientSecret.trim().startsWith('ey')) {
      throw new Error('DETECTADO: O seu "Client Secret" parece ser um Token (começa com ey...). Verifique se copiou o campo "Secret" correto no portal do BB.');
    }

    // 2. Fetch BB Token directly here instead of calling another function to avoid internal latency
    const credentials = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
    const tokenUrl = isSandbox
      ? 'https://oauth.sandbox.bb.com.br/oauth/token'
      : 'https://oauth.bb.com.br/oauth/token';

    console.log(`[BB OAuth] Attempting token fetch for ${isSandbox ? 'Sandbox' : 'Production'}...`);
    
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
        'scope': 'extrato.read'
      }).toString(),
    });

    const tokenRaw = await tokenResponse.text();
    let tokenData: any = {};
    try {
        tokenData = JSON.parse(tokenRaw);
    } catch {
        tokenData = { _raw: tokenRaw };
    }

    if (!tokenResponse.ok) {
      const detail = tokenData.error_description || tokenData.error || tokenData.mensagem || tokenRaw || JSON.stringify(tokenData);
      const possibleFix = tokenResponse.status === 400 ? ' (DICA: Verifique se o Client ID e Secret estão corretos e se você não incluiu espaços extras)' : '';
      throw new Error(`BB OAuth Error (${tokenResponse.status}): ${detail}${possibleFix}`);
    }
    const accessToken = tokenData.access_token;

    // 3. Build date range (default: today)
    const today = new Date();
    const since = dataInicio || today.toISOString().split('T')[0];
    const until = dataFim || today.toISOString().split('T')[0];

    const agencia = numeroAgencia || bbSettings.agencia || '';
    const conta = numeroConta || bbSettings.conta || '';

    const baseUrl = isSandbox
      ? 'https://api.sandbox.bb.com.br'
      : 'https://api.bb.com.br';
      
    // 4. Fetch transactions from BB API
    const params = new URLSearchParams({
      'dataInicio': since,
      'dataFim': until,
      'numeroAgencia': agencia,
      'numeroConta': conta,
    });

    let retries = 3;
    let response: Response | null = null;
    while (retries > 0) {
      try {
        response = await fetch(`${baseUrl}/extrato/v1/conta?${params}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'gw-dev-app-key': appKey
          },
        });
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 1000 * (3 - retries))); // exponential backoff
      }
    }

    const data = await response!.json();
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
