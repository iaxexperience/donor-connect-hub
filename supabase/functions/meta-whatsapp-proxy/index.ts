import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Normaliza números de telefone para evitar duplicidade 
 * Remove +, remove zeros à esquerda, e trata o 9º dígito brasileiro
 */
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  // Se for número brasileiro (começa com 55)
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(cleaned.length - 8);
    // Retornamos fixo 55 + DDD + 8 dígitos finais (removemos o 9 extra se existir para matching)
    return `55${ddd}${number}`;
  }
  
  return cleaned;
}

serve(async (req) => {
  // CORS Handshake
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Meta Handshake (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook Verificado com Sucesso!');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Token de verificação inválido', { status: 403 });
  }

  // 2. Main Logic
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Evento Recebido:', JSON.stringify(body, null, 2));

    // A. WEBHOOK (Incoming from Meta)
    if (body.entry?.[0]?.changes?.[0]?.value) {
      const value = body.entry[0].changes[0].value;
      const message = value.messages?.[0];

      if (message) {
        const fromRaw = message.from;
        const fromNormalized = normalizePhone(fromRaw);
        const text = message.text?.body || "Mensagem de mídia/outro";
        const messageId = message.id;
        const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';

        // Check/Create Chat
        let { data: chat, error: chatError } = await supabase
          .from('whatsapp_chats')
          .select('id, unread_count')
          .eq('telefone', fromNormalized)
          .maybeSingle();

        if (chatError || !chat) {
          const { data: newChat, error: createError } = await supabase
            .from('whatsapp_chats')
            .upsert([{ 
              telefone: fromNormalized, 
              nome: profileName,
              last_message: text,
              last_message_at: new Date().toISOString(),
              unread_count: 1
            }], { onConflict: 'telefone' })
            .select()
            .single();
          
          if (createError) throw createError;
          chat = newChat;
        } else {
          // Update Chat
          await supabase
            .from('whatsapp_chats')
            .update({ 
              last_message: text, 
              last_message_at: new Date().toISOString(),
              unread_count: (chat.unread_count || 0) + 1
            })
            .eq('id', chat.id);
        }

        // Insert Message
        await supabase
          .from('whatsapp_messages')
          .insert([{
            chat_id: chat.id,
            telefone: fromNormalized,
            text_body: text,
            is_from_me: false,
            message_id: messageId,
            status: 'received'
          }]);

        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      return new Response('Evento ignorado', { status: 200 });
    }

    // B. PROXY (Outgoing from Frontend)
    const { action, payload, config } = body;

    if (action === 'send_message' || action === 'send_template') {
      const { phone_number_id, access_token } = config;
      const url = `https://graph.facebook.com/v22.0/${phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const metaResult = await response.json();
      
      if (!response.ok) {
        return new Response(JSON.stringify({ error: metaResult }), { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // If successful sending, Log it
      if (payload.messaging_product === 'whatsapp') {
        let textBody = '';
        if (payload.type === 'text') textBody = payload.text?.body || '';
        else if (payload.type === 'image') textBody = `Arquivo de Imagem: ${payload.image?.link || 'Media ID'}`;
        else if (payload.type === 'video') textBody = `Arquivo de Vídeo: ${payload.video?.link || 'Media ID'}`;
        else if (action === 'send_template') textBody = `Template: ${payload.template?.name}`;
        const toRaw = payload.to;
        const toNormalized = normalizePhone(toRaw);
        const messageId = metaResult.messages?.[0]?.id;

        // Find/Create Chat
        let { data: chat } = await supabase
          .from('whatsapp_chats')
          .select('id')
          .eq('telefone', toNormalized)
          .maybeSingle();

        if (!chat) {
          const { data: newChat } = await supabase
            .from('whatsapp_chats')
            .upsert([{ telefone: toNormalized, nome: 'Contato' }], { onConflict: 'telefone' })
            .select()
            .single();
          chat = newChat;
        }

        // Save to whatsapp_messages
        await supabase.from('whatsapp_messages').insert([{
          chat_id: chat?.id,
          telefone: toNormalized,
          text_body: textBody,
          is_from_me: true,
          message_id: messageId,
          status: 'sent'
        }]);

        // Update Chat head info
        await supabase.from('whatsapp_chats').update({
          last_message: textBody,
          last_message_at: new Date().toISOString()
        }).eq('id', chat?.id);

        // Save up to historical logs
        await supabase.from('whatsapp_historicos').insert([{
          donor_id: body.donor_id,
          destinatario: toNormalized,
          template: payload.template?.name,
          mensagem: textBody,
          status: 'sent',
          message_id: messageId,
          lote: body.batch_id
        }]);
      }

      return new Response(JSON.stringify(metaResult), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'get_templates') {
      const { waba_id, access_token } = config;
      const url = `https://graph.facebook.com/v22.0/${waba_id}/message_templates`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        }
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'create_template') {
      const { waba_id, access_token } = config;
      const url = `https://graph.facebook.com/v22.0/${waba_id}/message_templates`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), { status: 400 });

  } catch (err: any) {
    console.error('Erro:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
