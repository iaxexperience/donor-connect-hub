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
    const { donor_name, template_name = 'fapagra' } = await req.json();

    if (!donor_name) throw new Error('donor_name is required');

    // 1. Find the donor
    const { data: donor, error: donorErr } = await supabase
      .from('donors')
      .select('id, name, phone')
      .ilike('name', `%${donor_name}%`)
      .maybeSingle();

    if (donorErr || !donor) throw new Error(`Donor "${donor_name}" not found.`);
    if (!donor.phone) throw new Error(`Donor "${donor.name}" has no phone number.`);

    // 2. Get their latest donation amount
    const { data: latestDonation } = await supabase
      .from('donations')
      .select('amount')
      .eq('donor_id', donor.id)
      .eq('status', 'pago')
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const amount = latestDonation?.amount || 0;
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

    // 3. Get WhatsApp credentials
    const { data: waConfig } = await supabase
      .from('whatsapp_settings')
      .select('phone_number_id, access_token')
      .eq('id', 1)
      .maybeSingle();

    if (!waConfig?.phone_number_id || !waConfig?.access_token) {
      throw new Error('WhatsApp not configured in whatsapp_settings.');
    }

    // 4. Send the template
    const cleanPhone = donor.phone.replace(/\D/g, '');
    const waPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: template_name,
        language: { code: 'pt_BR' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: donor.name },
            { type: 'text', text: formattedAmount }
          ]
        }]
      }
    };

    console.log(`[Send Template] Sending '${template_name}' to ${donor.name} (${cleanPhone})...`);
    const waResponse = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${waConfig.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(waPayload)
    });

    const waResult = await waResponse.json();

    if (waResult.error) {
      throw new Error(`Meta API Error: ${waResult.error.message}`);
    }

    // 5. Log the message
    await supabase.from('whatsapp_messages').insert([{
      donor_id: donor.id,
      sender_id: 'me',
      text: `Template: ${template_name} - Agradecimento por doação de ${formattedAmount}`,
      status: 'sent',
      metadata: {
        waba_message_id: waResult.messages?.[0]?.id,
        template_name: template_name,
        trigger: 'manual_send'
      }
    }]);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Template '${template_name}' sent to ${donor.name} (${cleanPhone})`,
      amount: formattedAmount
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Send Template] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
