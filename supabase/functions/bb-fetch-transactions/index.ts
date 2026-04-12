import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { dataInicio, dataFim, numeroAgencia, numeroConta } = body;

    // 1. Get token from bb-get-token function
    const tokenResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bb-get-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
    const tokenData = await tokenResp.json();
    if (tokenData.error) throw new Error(tokenData.error);
    const accessToken = tokenData.access_token;

    // 2. Build date range (default: today)
    const today = new Date();
    const since = dataInicio || today.toISOString().split('T')[0];
    const until = dataFim || today.toISOString().split('T')[0];

    const agencia = numeroAgencia || Deno.env.get('BB_AGENCIA') || '';
    const conta = numeroConta || Deno.env.get('BB_CONTA') || '';

    const isSandbox = Deno.env.get('BB_SANDBOX') === 'true';
    const baseUrl = isSandbox
      ? 'https://api.sandbox.bb.com.br'
      : 'https://api.bb.com.br';
      
    const appKey = Deno.env.get('BB_APP_KEY');
    if (!appKey) throw new Error('BB_APP_KEY is required but not configured.');

    // 3. Fetch transactions from BB API
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
    console.error('[BB Fetch Transactions] Error:', err.message);
    await supabase.from('integration_logs').insert([{
      source: 'banco_brasil',
      event: 'transactions_fetch_error',
      payload: { error: err.message },
      status: 'error'
    }]).catch(() => {});
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
