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

        // ─────────────────────────────────────────────────────────────────────
        // Persist sent message to Supabase (required for Chat ao Vivo to work)
        // ─────────────────────────────────────────────────────────────────────
        if (res.ok && !data.error) {
          try {
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
            );

            const toPhone = (payload?.to ?? '').replace(/\D/g, '');
            const wamId = data?.messages?.[0]?.id ?? null;
            const donorId = body.donor_id ?? null;

            // Determine readable text to save in the chat
            let textBody = '';
            if (action === 'send_message' && payload?.type === 'text') {
              textBody = payload?.text?.body ?? '';
            } else if (action === 'send_template') {
              textBody = `Template: ${payload?.template?.name ?? ''}`;
            } else if (payload?.type === 'image') {
              textBody = `📷 Imagem`;
            } else if (payload?.type === 'video') {
              textBody = `🎬 Vídeo`;
            }

            // 1. Find or create whatsapp_chats entry
            const { data: existingChat } = await supabase
              .from('whatsapp_chats')
              .select('id')
              .eq('telefone', toPhone)
              .maybeSingle();

            let chatId: string | null = existingChat?.id ?? null;

            if (!chatId) {
              let chatName = 'Contato';
              if (donorId) {
                const { data: donor } = await supabase
                  .from('donors')
                  .select('name')
                  .eq('id', donorId)
                  .maybeSingle();
                if (donor?.name) chatName = donor.name;
              }
              const { data: newChat } = await supabase
                .from('whatsapp_chats')
                .upsert([{
                  telefone: toPhone,
                  nome: chatName,
                  last_message: textBody,
                  last_message_at: new Date().toISOString(),
                  unread_count: 0,
                }], { onConflict: 'telefone' })
                .select('id')
                .maybeSingle();
              chatId = newChat?.id ?? null;
            } else {
              await supabase
                .from('whatsapp_chats')
                .update({
                  last_message: textBody,
                  last_message_at: new Date().toISOString(),
                })
                .eq('id', chatId);
            }

            // 2. Insert into whatsapp_messages — triggers Realtime in the frontend
            if (chatId) {
              const { error: msgErr } = await supabase
                .from('whatsapp_messages')
                .insert([{
                  chat_id: chatId,
                  telefone: toPhone,
                  text_body: textBody,
                  is_from_me: true,
                  status: 'sent',
                  message_id: wamId,
                  donor_id: donorId,
                }]);
              if (msgErr) {
                console.error('[api-proxy] whatsapp_messages insert error:', JSON.stringify(msgErr));
              } else {
                console.log(`[api-proxy] Message saved to DB. chat_id=${chatId}`);
              }
            }

            // 3. Log to whatsapp_historicos for the Histórico tab
            await supabase.from('whatsapp_historicos').insert([{
              donor_id: donorId,
              destinatario: toPhone,
              template: action === 'send_template' ? payload?.template?.name : null,
              mensagem: action === 'send_message' ? textBody : null,
              status: 'sent',
              meta_msg_id: wamId,
              lote: body.batch_id ?? null,
            }]);

          } catch (dbErr: any) {
            // Non-critical: don't fail the HTTP response if DB write fails
            console.error('[api-proxy] DB persist error:', dbErr.message);
          }
        }

        return ok({ ...data, __meta_status: res.status });
      }

      if (action === 'ping') {
        return ok({ ok: true, service: 'meta', timestamp: new Date().toISOString() });
      }

      return ok({ __error: true, error: 'Ação desconhecida.' });
    }

    // ── ASAAS ───────────────────────────────────────────────────────────────
    if (service === 'asaas') {
      const { api_key, sandbox } = config || {};
      
      if (action === 'get_balance') {
        if (!api_key) {
          return ok({ __error: true, error: 'Asaas API Key necessária' });
        }
        
        const baseUrl = sandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
        const res = await fetch(`${baseUrl}/finance/balance`, {
          headers: { 'access_token': api_key }
        });
        
        const data = await res.json().catch(() => ({}));
        return ok({ ...data, __meta_status: res.status });
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
