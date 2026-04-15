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

/**
 * Repassa o webhook para um agente externo (ex: GPTMaker)
 */
async function forwardToAgent(url: string, body: any, headers: Headers) {
  try {
    // Clona os headers originais para o repasse
    const forwardHeaders = new Headers();
    forwardHeaders.set('Content-Type', 'application/json');
    
    // Repassa o x-hub-signature se existir (usado pela Meta para segurança)
    const sig = headers.get('x-hub-signature-256');
    if (sig) forwardHeaders.set('x-hub-signature-256', sig);

    console.log(`[Bridge] Repassando evento para: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body)
    });
    
    console.log(`[Bridge] Resposta do Agente: ${response.status}`);
  } catch (err) {
    console.error(`[Bridge] Falha no repasse:`, err);
  }
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
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')?.trim();
    
    console.log(`[Handshake] Mode: ${mode}, Token Received: ${token}, Challenge: ${challenge}`);
    console.log(`[Handshake] Expected Token: ${verifyToken}`);

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook Verificado com Sucesso!');
      // Retornamos apenas o texto do challenge como Meta exige
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
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

    // A. IDENTIFICAÇÃO DO PROVEDOR E REPASSE
    const isMeta = !!body.entry?.[0]?.changes?.[0]?.value;
    const isGPTMaker = !!body.event || !!body.message_id || (!!body.contact && !!body.message);

    // Ponte para GPTMaker (Apenas se vier da Meta, para evitar loop infinito)
    const forwardUrl = Deno.env.get('FORWARD_WEBHOOK_URL');
    if (isMeta && forwardUrl && body && Object.keys(body).length > 0) {
      forwardToAgent(forwardUrl, body, req.headers);
    }
    
    if (!body || Object.keys(body).length === 0) {
      if (req.method === 'POST') {
        return new Response(JSON.stringify({ error: 'Corpo da requisição vazio' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // B. PROCESSAMENTO META (Padrão)
    if (isMeta) {
      const value = body.entry[0].changes[0].value;
      
      // 1. Statuses
      if (value.statuses && value.statuses.length > 0) {
        for (const statusUpdate of value.statuses) {
          const messageId = statusUpdate.id;
          const newStatus = statusUpdate.status;
          await supabase.from('whatsapp_messages').update({ status: newStatus }).eq('message_id', messageId);
        }
      }

      // 2. Messages
      const message = value.messages?.[0];
      if (message) {
        const messageId = message.id;
        const msgType = message.type;
        const isEcho = body.entry[0].id === message.from || (message.metadata?.display_phone_number && message.metadata.display_phone_number.includes(message.from));
        
        let targetPhone = message.from;
        if (isEcho && message.to) targetPhone = message.to;
        
        const phoneNormalized = normalizePhone(targetPhone);
        const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';
        let text = msgType === 'text' ? (message.text?.body ?? '') : `[${msgType}]`;

        await handleMessageSync(supabase, {
          messageId, phoneNormalized, text, isEcho, profileName, status: isEcho ? 'sent' : 'received'
        });
      }
    }
    
    // C. PROCESSAMENTO GPTMAKER (Plano B - Respostas do Theo)
    else if (isGPTMaker) {
      console.log('[Webhook] Processando formato GPTMaker/Externo');
      
      // Mapeamento flexível de campos do GPTMaker
      const messageId = body.id || body.message_id || `gtp_${Date.now()}`;
      const rawPhone = body.contact?.phone || body.sender?.phone || body.phone || body.from;
      const text = body.message?.text || body.content || body.text || body.message || '';
      const isEcho = body.direction === 'outbound' || body.event?.includes('sent') || !!body.user_id || true; // Geralmente se o GPTMaker nos avisa, é porque ele respondeu
      
      if (rawPhone && text) {
        const phoneNormalized = normalizePhone(rawPhone);
        await handleMessageSync(supabase, {
          messageId, phoneNormalized, text, isEcho, profileName: 'IAX - Theo', status: 'sent'
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('Erro:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

/**
 * Função unificada para salvar mensagens e atualizar chats
 */
async function handleMessageSync(supabase: any, data: any) {
  const { messageId, phoneNormalized, text, isEcho, profileName, status } = data;

  // 1. Doador
  let matchedDonorId = null;
  const { data: donors } = await supabase.from('donors').select('id, name').or(`phone.like.%${phoneNormalized.slice(-8)},phone.eq.${phoneNormalized}`).limit(1);
  if (donors && donors.length > 0) matchedDonorId = donors[0].id;

  // 2. Chat
  let { data: chat } = await supabase.from('whatsapp_chats').select('id, unread_count').eq('telefone', phoneNormalized).maybeSingle();

  if (!chat) {
    const { data: newChat } = await supabase.from('whatsapp_chats').upsert([{ 
      telefone: phoneNormalized, nome: profileName, last_message: text, unread_count: isEcho ? 0 : 1, donor_id: matchedDonorId
    }], { onConflict: 'telefone' }).select().single();
    chat = newChat;
  } else {
    await supabase.from('whatsapp_chats').update({ 
      last_message: text, last_message_at: new Date().toISOString(), unread_count: isEcho ? chat.unread_count : (chat.unread_count || 0) + 1, donor_id: matchedDonorId
    }).eq('id', chat.id);
  }

  // 3. Mensagem (Deduplicada)
  if (chat) {
    await supabase.from('whatsapp_messages').upsert([{
      chat_id: chat.id, telefone: phoneNormalized, text_body: text, is_from_me: isEcho, message_id: messageId, status, donor_id: matchedDonorId
    }], { onConflict: 'message_id' });
  }
}
