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
    // 1. Get unmatched transactions
    const { data: transactions, error: txError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('matched', false)
      .eq('type', 'credit')
      .eq('source', 'banco_brasil')
      .order('date', { ascending: false });

    if (txError) throw txError;
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ message: 'No unmatched transactions to reconcile', matched: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get pending donations
    const { data: pendingDonations, error: donError } = await supabase
      .from('donations')
      .select('*')
      .eq('status', 'pending');

    if (donError) throw donError;

    let matchedCount = 0;
    const TOLERANCE = 0.01; // R$ 0.01 tolerance for float comparison

    for (const tx of transactions) {
      // Find matching donation by amount (within tolerance)
      const match = pendingDonations?.find(d => 
        Math.abs(parseFloat(d.amount) - parseFloat(tx.amount)) <= TOLERANCE &&
        !d.transaction_id // Not already matched
      );

      if (match) {
        // Mark donation as confirmed
        await supabase
          .from('donations')
          .update({ 
            status: 'confirmed',
            transaction_id: tx.id,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', match.id);

        // Mark transaction as matched
        await supabase
          .from('bank_transactions')
          .update({ 
            matched: true,
            matched_donation_id: match.id,
            matched_at: new Date().toISOString()
          })
          .eq('id', tx.id);

        matchedCount++;
        console.log(`[Reconcile] Matched tx ${tx.transaction_id} (R$ ${tx.amount}) with donation ${match.id}`);
      }
    }

    await supabase.from('integration_logs').insert([{
      source: 'banco_brasil',
      event: 'reconciliation_done',
      payload: { 
        transactions_checked: transactions.length,
        matched: matchedCount,
        pending_donations: pendingDonations?.length || 0
      },
      status: 'success'
    }]).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      transactions_checked: transactions.length,
      matched: matchedCount,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[BB Reconcile] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
