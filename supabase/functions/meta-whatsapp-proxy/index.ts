import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

/**
 * Normaliza números de telefone para evitar duplicidade 
 * No Brasil: Remove o 9º dígito (se houver) para garantir que 5511988887777 e 551188887777 
 * sejam tratados como o mesmo contato no banco de dados.
 */
function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  
  // Limpa múltiplos prefixos 55 (ex: 555555... -> 55)
  while (cleaned.length > 11 && cleaned.startsWith("5555")) {
    cleaned = cleaned.substring(2);
  }
  
  // Formato DDI(55) + DDD + Numero (12 ou 13 dígitos)
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const last8 = cleaned.substring(cleaned.length - 8);
    // SEMPRE retornamos DDI (55) + DDD + 8 dígitos finais
    return `55${ddd}${last8}`;
  }
  
  // Formato DDD + Numero (10 ou 11 dígitos) - Adiciona DDI 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const last8 = cleaned.substring(cleaned.length - 8);
    return `55${ddd}${last8}`;
  }
  
  return cleaned;
}

serve(async (req) => {
  console.log(`[Meta Proxy] Request Received: ${req.method} ${req.url}`);
  
  // CORS Handshake
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // 1. Meta Handshake (GET)
  if (req.method === 'GET') {
    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    
    console.log(`[Handshake] Mode: ${mode}, Token Received: ${token}, Challenge: ${challenge}`);
    console.log(`[Handshake] Expected Token: ${verifyToken}`);

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook Verificado com Sucesso!');
      return new Response(challenge, { status: 200 });
    }
    
    console.warn('Webhook Handshake FALHOU: Tokens não conferem.');
    return new Response('Token de verificação inválido', { status: 403 });
  }

  // 2. Main Logic
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    console.log('Evento Recebido:', JSON.stringify(body, null, 2));
    
    if (!body || Object.keys(body).length === 0) {
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ error: 'Corpo da requisição vazio' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // A. WEBHOOK (Incoming from Meta)
    if (body.entry?.[0]?.changes?.[0]?.value) {
      const value = body.entry[0].changes[0].value;
      
      // 1. Process Statuses (Read Receipts / Delivery)
      if (value.statuses && value.statuses.length > 0) {
        for (const statusUpdate of value.statuses) {
          const messageId = statusUpdate.id;
          const newStatus = statusUpdate.status;
          console.log(`[Webhook] Status update: ${messageId} -> ${newStatus}`);
          
          await supabase
            .from('whatsapp_messages')
            .update({ status: newStatus })
            .eq('message_id', messageId);
        }
      }

      // 2. Process Messages
      const message = value.messages?.[0];
      if (message) {
        const fromRaw = message.from;
        const fromNormalized = normalizePhone(fromRaw);
        const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';
        const messageId = message.id;
        const msgType = message.type;

        console.log(`[Webhook] Nova mensagem de ${fromRaw} (${fromNormalized})`);

        // Determine text from message type
        let text = '';
        if (msgType === 'text') {
          text = message.text?.body ?? '';
        } else if (msgType === 'image') {
          text = '📷 Imagem';
        } else if (msgType === 'audio') {
          text = '🎙️ Áudio';
        } else if (msgType === 'video') {
          text = '🎬 Vídeo';
        } else if (msgType === 'document') {
          text = `📄 Documento: ${message.document?.filename ?? ''}`;
        } else {
          text = `[${msgType}]`;
        }

        // Match Donor (Harden lookup with .limit(1) to avoid .maybeSingle error)
        let matchedDonorId = null;
        let matchedDonorName = profileName;

        const { data: donors } = await supabase
          .from('donors')
          .select('id, name')
          .or(`phone.like.%${fromNormalized.slice(-8)},phone.eq.${fromNormalized}`)
          .limit(1);

        if (donors && donors.length > 0) {
          matchedDonorId = donors[0].id;
          matchedDonorName = donors[0].name;
          console.log(`[Webhook] Doador identificado: ${matchedDonorName}`);
        }

        // Check/Create Chat
        let { data: chat } = await supabase
          .from('whatsapp_chats')
          .select('id, unread_count')
          .eq('telefone', fromNormalized)
          .maybeSingle();

        if (!chat) {
          console.log(`[Webhook] Criando novo chat para ${fromNormalized}`);
          const { data: newChat } = await supabase
            .from('whatsapp_chats')
            .upsert([{ 
              telefone: fromNormalized, 
              nome: matchedDonorName,
              last_message: text,
              unread_count: 1,
              donor_id: matchedDonorId
            }], { onConflict: 'telefone' })
            .select()
            .single();
          chat = newChat;
        } else {
          await supabase
            .from('whatsapp_chats')
            .update({ 
              last_message: text, 
              last_message_at: new Date().toISOString(),
              unread_count: (chat.unread_count || 0) + 1,
              donor_id: matchedDonorId
            })
            .eq('id', chat.id);
        }

        // Insert Message
        if (chat) {
          await supabase
            .from('whatsapp_messages')
            .insert([{
              chat_id: chat.id,
              telefone: fromNormalized,
              text_body: text,
              is_from_me: false,
              message_id: messageId,
              status: 'received',
              donor_id: matchedDonorId
            }]);
          console.log(`[Webhook] Mensagem salva com sucesso (Chat: ${chat.id})`);
        }
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // B. PROXY (Outgoing from Frontend)
    const { action, meta_data, config } = body;
    const payload = meta_data; // Mapping for compatibility with internal logic

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

    // General Action Handler
    if (action === 'get_templates' || action === 'create_template') {
      const { waba_id, access_token } = config || {};
      
      if (!waba_id || !access_token) {
        return new Response(JSON.stringify({ error: 'WABA ID e Access Token são necessários para esta ação.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const url = `https://graph.facebook.com/v22.0/${waba_id}/message_templates`;
      const method = action === 'get_templates' ? 'GET' : 'POST';
      
      console.log(`[Meta Proxy] Executing ${action} via ${method} at ${url}`);
      if (action === 'create_template') {
        console.log('[Meta Proxy] Create Template Payload Summary:', JSON.stringify({
          name: meta_data?.name,
          category: meta_data?.category,
          language: meta_data?.language,
          components_count: meta_data?.components?.length
        }));
      }

      try {
        const fetchOptions: any = {
          method: method,
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        };

        if (method === 'POST' && meta_data) {
          fetchOptions.body = JSON.stringify(meta_data);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json().catch(() => ({}));
        
        console.log(`[Meta Proxy] Status: ${response.status}`, JSON.stringify(data));

        return new Response(JSON.stringify(data), { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (fetchErr: any) {
        console.error('[Meta Proxy] Fetch Error:', fetchErr);
        return new Response(JSON.stringify({ error: { message: fetchErr.message } }), { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'ping') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), { status: 400, headers: corsHeaders });

  } catch (err: any) {
    console.error('Erro:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
