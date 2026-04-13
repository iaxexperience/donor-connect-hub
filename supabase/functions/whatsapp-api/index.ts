import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-meta-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * whatsapp-api Edge Function
 * Minimal, high-compatibility proxy for Meta WhatsApp API Business templates.
 */
serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, meta_data, config } = body;
    const { waba_id, access_token } = config || {};

    console.log(`[WhatsApp API] Action: ${action}, WABA: ${waba_id}`);

    if (action === 'ping') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!waba_id || !access_token) {
      return new Response(JSON.stringify({ error: 'Missing WABA ID or Access Token' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const url = `https://graph.facebook.com/v22.0/${waba_id}/message_templates`;

    if (action === 'get_templates') {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), { 
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'create_template') {
      console.log('[WhatsApp API] Creating template:', JSON.stringify(meta_data));
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meta_data)
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), { 
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('[WhatsApp API] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
