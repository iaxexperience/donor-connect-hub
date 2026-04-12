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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    const { event, payment } = body;

    // Log every event for audit trail (idempotency handled by waba_message_id)
    await supabase.from('payments_logs').insert([{
      event,
      payload: body,
    }]);

    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED'].includes(event)) {
      return new Response(JSON.stringify({ message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const asaasPaymentId = payment?.id;
    if (!asaasPaymentId) {
      return new Response(JSON.stringify({ error: 'No payment id' }), { status: 400 });
    }

    // Map Asaas event to our status
    const statusMap: Record<string, string> = {
      PAYMENT_RECEIVED: 'confirmed',
      PAYMENT_CONFIRMED: 'confirmed',
      PAYMENT_OVERDUE: 'overdue',
      PAYMENT_DELETED: 'cancelled',
    };
    const newStatus = statusMap[event] || 'pending';

    // Update donation
    const { data: updated, error } = await supabase
      .from('donations')
      .update({ 
        status: newStatus,
        confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null
      })
      .eq('asaas_payment_id', asaasPaymentId)
      .select();

    if (error) throw error;

    console.log(`[Asaas Webhook] ${event} → donation updated:`, updated);

    return new Response(JSON.stringify({ success: true, updated: updated?.length || 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Asaas Webhook] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
