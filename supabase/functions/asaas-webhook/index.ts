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

    // Log every event for audit trail
    const { error: logErr } = await supabase.from('payments_logs').insert([{
      event,
      payload: body,
      source: 'asaas'
    }]);
    
    if (logErr) console.error('[Asaas Webhook] Log Error:', logErr);

    if (!['PAYMENT_CREATED', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'].includes(event)) {
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
      PAYMENT_CREATED: 'pendente',
      PAYMENT_RECEIVED: 'pago',
      PAYMENT_CONFIRMED: 'pago',
      PAYMENT_OVERDUE: 'vencido',
      PAYMENT_DELETED: 'cancelado',
      PAYMENT_REFUNDED: 'estornado',
      PAYMENT_CHARGEBACK_REQUESTED: 'estornado',
    };
    const newStatus = statusMap[event] || 'pendente';

    // Get confirmation date from payload if possible
    const confirmationDate = payment.confirmedDate ? new Date(payment.confirmedDate).toISOString() : 
                             payment.clientPaymentDate ? new Date(payment.clientPaymentDate).toISOString() :
                             newStatus === 'pago' ? new Date().toISOString() : null;

    // Check if donation already exists
    const { data: existingDonation } = await supabase
      .from('donations')
      .select('id, status, confirmed_at')
      .eq('asaas_payment_id', asaasPaymentId)
      .maybeSingle();

    let affectedRows = 0;

    if (existingDonation) {
      // IDEMPOTENCY: If already paid, don't update confirmed_at unless it's null
      const updateData: any = { status: newStatus };
      if (newStatus === 'pago' && !existingDonation.confirmed_at) {
        updateData.confirmed_at = confirmationDate;
      }

      console.log(`[Asaas Webhook] Updating existing donation ${asaasPaymentId}. Status: ${newStatus}`);
      const { data: updated, error: updateErr } = await supabase
        .from('donations')
        .update(updateData)
        .eq('asaas_payment_id', asaasPaymentId)
        .select();

      if (updateErr) throw updateErr;
      affectedRows = updated?.length || 0;
    } else {
      // Auto-register external donation
      console.log(`[Asaas Webhook] Payment ${asaasPaymentId} not found. Auto-registering...`);
      
      let donorId = null;
      if (payment.customer) {
        const { data: donor } = await supabase.from('donors')
          .select('id')
          .eq('asaas_customer_id', payment.customer)
          .maybeSingle();
        if (donor) donorId = donor.id;
      }

      const { data: newDonation, error: insertErr } = await supabase.from('donations').insert([{
        donor_id: donorId,
        amount: payment.value,
        status: newStatus,
        asaas_payment_id: asaasPaymentId,
        billing_type: payment.billingType || 'UNDEFINED',
        due_date: payment.dueDate,
        donation_date: payment.dateCreated || new Date().toISOString(),
        confirmed_at: newStatus === 'pago' ? confirmationDate : null,
        payment_method: 'Asaas'
      }]).select();

      if (insertErr) {
        // If it's a unique constraint error, someone else might have inserted it just now
        if (insertErr.code === '23505') {
          console.log('[Asaas Webhook] Concurrent insert detected. Skipping.');
          affectedRows = 1;
        } else {
          throw insertErr;
        }
      } else {
        affectedRows = newDonation ? newDonation.length : 1;
        console.log(`[Asaas Webhook] Auto-registered:`, asaasPaymentId);
      }
    }

    return new Response(JSON.stringify({ success: true, updated: affectedRows }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Asaas Webhook] Fatal Error:', err.message);
    // Return 200 for data errors to stop Asaas retry loop if it's not a server issue
    const isDataError = err.message?.includes('check constraint') || err.message?.includes('invalid input');
    return new Response(JSON.stringify({ error: err.message }), {
      status: isDataError ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

