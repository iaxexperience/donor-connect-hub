import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        const from = message.from; 
        const text = message.text?.body;
        const messageId = message.id;
        const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';

        if (!text) return new Response('Apenas texto suportado', { status: 200 });

        // Check/Create Chat
        let { data: chat, error: chatError } = await supabase
          .from('whatsapp_chats')
          .select('id')
          .eq('telefone', from)
          .single();

        if (chatError || !chat) {
          const { data: newChat, error: createError } = await supabase
            .from('whatsapp_chats')
            .insert([{ 
              telefone: from, 
              nome: profileName,
              last_message: text,
              unread_count: 1
            }])
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
              unread_count: 1 // For now just set to 1 or increment
            })
            .eq('id', chat.id);
        }

        // Insert Message
        await supabase
          .from('whatsapp_messages')
          .insert([{
            chat_id: chat.id,
            telefone: from,
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
        const textBody = payload.text?.body || (action === 'send_template' ? `Template: ${payload.template?.name}` : '');
        const to = payload.to;
        const messageId = metaResult.messages?.[0]?.id;

        // Find Chat
        let { data: chat } = await supabase.from('whatsapp_chats').select('id').eq('telefone', to).single();
        if (!chat) {
          const { data: newChat } = await supabase.from('whatsapp_chats').insert([{ telefone: to, nome: 'Contato' }]).select().single();
          chat = newChat;
        }

        // Save to whatsapp_messages
        await supabase.from('whatsapp_messages').insert([{
          chat_id: chat?.id,
          telefone: to,
          text_body: textBody,
          is_from_me: true,
          message_id: messageId,
          status: 'sent'
        }]);

        // Save to historical logs
        await supabase.from('whatsapp_historicos').insert([{
          donor_id: body.donor_id, // Passed from frontend if available
          destinatario: to,
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

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), { status: 400 });

  } catch (err: any) {
    console.error('Erro:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
