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
    const { name, email, phone, donor_id } = await req.json();

    if (!name || !donor_id) {
      throw new Error('Name and donor_id are required');
    }

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) throw new Error('ASAAS_API_KEY is not set');

    const isSandbox = Deno.env.get('ASAAS_SANDBOX') === 'true';
    const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    // Call Asaas API
    const response = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, phone, externalReference: donor_id })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.description || 'Failed to create customer on Asaas');
    }

    const customerId = data.id;

    // Update donor in database with asaas_customer_id
    const { error: updateError } = await supabase
      .from('donors')
      .update({ asaas_customer_id: customerId })
      .eq('id', donor_id);

    if (updateError) {
      console.error('Error updating donor with Asaas customer ID:', updateError);
    }

    return new Response(JSON.stringify({ success: true, customer_id: customerId, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Asaas Create Customer] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
