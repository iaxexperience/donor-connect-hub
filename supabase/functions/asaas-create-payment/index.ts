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
    const { customer, billingType, value, dueDate, description, donor_id } = await req.json();

    if (!customer || !billingType || !value || !dueDate || !donor_id) {
      throw new Error('customer (asaas_customer_id), billingType, value, dueDate and donor_id are required');
    }

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) throw new Error('ASAAS_API_KEY is not set');

    const isSandbox = Deno.env.get('ASAAS_SANDBOX') === 'true';
    const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    // Call Asaas API
    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer,
        billingType,
        value,
        dueDate,
        description: description || 'Doação',
        externalReference: donor_id
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.description || 'Failed to create payment on Asaas');
    }

    const paymentId = data.id;

    // For PIX payments, fetch the QR code / copia-e-cola
    let pixQrCode = null;
    if (billingType === 'PIX' && paymentId) {
      try {
        const pixRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
          method: 'GET',
          headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
        });
        if (pixRes.ok) {
          pixQrCode = await pixRes.json();
          console.log('[Asaas] PIX QR Code obtido:', pixQrCode?.payload?.substring(0, 40));
        }
      } catch (pixErr) {
        console.warn('[Asaas] Não foi possível obter PIX QR Code:', pixErr);
      }
    }

    // Create donation record in pending state
    const { data: donation, error: insertError } = await supabase
      .from('donations')
      .insert([{
        donor_id,
        amount: value,
        status: 'pendente',
        asaas_payment_id: paymentId,
        billing_type: billingType,
        due_date: dueDate
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating donation record:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, payment: data, donation, pixQrCode }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Asaas Create Payment] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
