import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Neutral name to avoid CSP/AdBlocker filtering
// This is a generic proxy for all outbound API requests

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { service, action, config, payload } = body;

    console.log(`[api-proxy] Service: ${service}, Action: ${action}`);

    // ── META / WHATSAPP ─────────────────────────────────────────────────────
    if (service === 'meta') {
      const { waba_id, phone_number_id, access_token } = config || {};

      if (action === 'create_template') {
        if (!waba_id || !access_token) {
          return ok({ __error: true, error: 'WABA ID e Access Token são necessários.' });
        }

        const url = `https://graph.facebook.com/v22.0/${waba_id}/message_templates`;
        console.log(`[api-proxy] POST ${url}`);
        console.log(`[api-proxy] Payload:`, JSON.stringify(payload));

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        console.log(`[api-proxy] Meta Response ${res.status}:`, JSON.stringify(data));

        // Always return 200 — embed meta_status so frontend can check
        return ok({ ...data, __meta_status: res.status });
      }

      if (action === 'get_templates') {
        if (!waba_id || !access_token) {
          return ok({ __error: true, error: 'WABA ID e Access Token são necessários.' });
        }

        const url = `https://graph.facebook.com/v22.0/${waba_id}/message_templates?limit=100`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        return ok({ ...data, __meta_status: res.status });
      }

      if (action === 'send_message' || action === 'send_template') {
        if (!phone_number_id || !access_token) {
          return ok({ __error: true, error: 'Phone Number ID e Access Token são necessários.' });
        }

        const url = `https://graph.facebook.com/v22.0/${phone_number_id}/messages`;
        console.log(`[api-proxy] ${action} → ${url}`);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        console.log(`[api-proxy] Meta Response ${res.status}:`, JSON.stringify(data));
        return ok({ ...data, __meta_status: res.status });
      }

      if (action === 'ping') {
        return ok({ ok: true, service: 'meta', timestamp: new Date().toISOString() });
      }

      return ok({ __error: true, error: 'Ação desconhecida.' });
    }

    // ── HEALTHCHECK ──────────────────────────────────────────────────────────
    if (action === 'ping' || !service) {
      return ok({ ok: true, timestamp: new Date().toISOString() });
    }

    return ok({ __error: true, error: `Serviço '${service}' não reconhecido.` });

  } catch (err: any) {
    console.error('[api-proxy] Error:', err);
    return ok({ __error: true, error: err.message });
  }
});

// Always return HTTP 200 so the Supabase SDK never throws "non-2xx status code"
function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
