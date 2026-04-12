import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('payment_id is required');
    }

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) throw new Error('ASAAS_API_KEY is not set');

    const isSandbox = Deno.env.get('ASAAS_SANDBOX') === 'true';
    const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    // Call Asaas API
    const response = await fetch(`${baseUrl}/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.description || 'Failed to get payment on Asaas');
    }

    return new Response(JSON.stringify({ success: true, payment: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Asaas Get Payment] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
