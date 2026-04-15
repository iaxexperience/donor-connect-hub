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
    // 1. Get Asaas Config from DB
    const { data: config, error: configErr } = await supabase
      .from('asaas_settings')
      .select('api_key, sandbox')
      .eq('id', 1)
      .maybeSingle();

    if (configErr || !config?.api_key) {
      throw new Error('Asaas configuration (API Key) not found in asaas_settings table.');
    }

    const asaasApiKey = config.api_key;
    const isSandbox = config.sandbox ?? true;
    const baseUrl = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    // 2. Find unique asaas_customer_id in donations with no donor_id
    const { data: missingDonors, error: selectErr } = await supabase
      .from('donations')
      .select('asaas_customer_id')
      .is('donor_id', null)
      .not('asaas_customer_id', 'is', null);

    if (selectErr) throw selectErr;

    const uniqueCustomerIds = [...new Set(missingDonors.map(d => d.asaas_customer_id))];
    console.log(`[Asaas Sync] Found ${uniqueCustomerIds.length} unique customer IDs to sync.`);

    const results = {
      synced: 0,
      errors: 0,
      details: [] as string[]
    };

    for (const customerId of uniqueCustomerIds) {
      try {
        console.log(`[Asaas Sync] Processing customer: ${customerId}`);
        
        // Check if donor already exists by ID
        const { data: existingDonor } = await supabase
          .from('donors')
          .select('id')
          .eq('asaas_customer_id', customerId)
          .maybeSingle();

        let donorId = existingDonor?.id;

        if (!donorId) {
          // 3. Fetch from Asaas
          console.log(`[Asaas Sync] Fetching details from Asaas API for ${customerId}...`);
          const response = await fetch(`${baseUrl}/customers/${customerId}`, {
            method: 'GET',
            headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            const errBody = await response.json();
            throw new Error(`Asaas API Error for ${customerId}: ${errBody.errors?.[0]?.description || response.statusText}`);
          }

          const customerData = await response.json();
          console.log(`[Asaas Sync] Customer data retrieved: ${customerData.name}`);

          // 4. Create in DB with all required fields and fallbacks
          const { data: newDonor, error: insertErr } = await supabase
            .from('donors')
            .insert([{
              name: customerData.name || 'Doador Asaas ' + customerId,
              email: customerData.email || `contato_${customerId}@asaas.com`, // Fallback for required email
              phone: (customerData.mobilePhone || customerData.phone || '00000000000').replace(/\D/g, ""), // Numeric only
              document_id: customerData.cpfCnpj,
              asaas_customer_id: customerId,
              type: 'unico',
              total_donated: 0,
              donation_count: 0
            }])
            .select()
            .single();

          if (insertErr) {
            console.error(`[Asaas Sync] Insert Error for ${customerId}:`, insertErr);
            throw new Error(`Database Insert Error: ${insertErr.message}`);
          }
          
          donorId = newDonor.id;
          console.log(`[Asaas Sync] Created new donor ID: ${donorId}`);
        }

        // 5. Update Donations
        console.log(`[Asaas Sync] Linking donations to donor ${donorId}...`);
        const { error: updateErr } = await supabase
          .from('donations')
          .update({ donor_id: donorId })
          .eq('asaas_customer_id', customerId)
          .is('donor_id', null);

        if (updateErr) {
          console.error(`[Asaas Sync] Update donations error for ${customerId}:`, updateErr);
          throw updateErr;
        }

        results.synced++;
        results.details.push(`Synced: ${customerId} (${donorId})`);

      } catch (err: any) {
        console.error(`[Asaas Sync] Error syncing ${customerId}:`, err.message);
        results.errors++;
        results.details.push(`Error: ${customerId} - ${err.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Asaas Sync] Fatal Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
