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
  
  // Limpa prefixos 5555...
  while (cleaned.length > 11 && cleaned.startsWith("5555")) cleaned = cleaned.substring(2);
  
  // Se começar com 55 e tiver 12 ou 13 dígitos (Normal do Brasil na Meta API)
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const last8 = cleaned.substring(cleaned.length - 8);
    return `55${ddd}${last8}`;
  }
  
  // Se tiver 10 ou 11 dígitos (DDD + Numero sem 55)
  if (cleaned.length === 10 || cleaned.length === 11) {
    const ddd = cleaned.substring(0, 2);
    const last8 = cleaned.substring(cleaned.length - 8);
    return `55${ddd}${last8}`;
  }

  // Fallback para o caso de o número já ser apenas o DDD + 8 dígitos
  if (cleaned.length === 8) {
    return cleaned; // Provavelmente incompleto mas mantemos
  }
  
  return cleaned;
}

/**
 * Chama a API de conversação do GPTMaker e retorna o texto da resposta do bot.
 * Requer as env vars: GPTMAKER_AGENT_ID e GPTMAKER_TOKEN
 */
async function callGPTMaker(phone: string, prompt: string, chatName: string): Promise<string | null> {
  const agentId = Deno.env.get('GPTMAKER_AGENT_ID');
  const token = Deno.env.get('GPTMAKER_TOKEN');

  if (!agentId || !token) {
    console.log('[GPTMaker] GPTMAKER_AGENT_ID ou GPTMAKER_TOKEN não configurados. Pulando.');
    return null;
  }

  try {
    console.log(`[GPTMaker] Chamando agente ${agentId} para contextId=${phone}`);
    const res = await fetch(`https://api.gptmaker.ai/v2/agent/${agentId}/conversation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contextId: phone,
        prompt,
        chatName: chatName || 'WhatsApp Contact',
        phone,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[GPTMaker] Erro HTTP ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    const reply = data?.message ?? null;
    console.log(`[GPTMaker] Resposta recebida: "${reply?.substring(0, 80)}..."`);
    return reply;
  } catch (err) {
    console.error('[GPTMaker] Falha na chamada:', err);
    return null;
  }
}

/**
 * Envia uma mensagem de texto de volta ao usuário via Meta API.
 * Retorna o ID real da mensagem (wam_xxx) para evitar duplicatas com o echo.
 * Requer as env vars: WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN
 */
async function sendMetaReply(toPhone: string, text: string): Promise<string | null> {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

  if (!phoneNumberId || !accessToken) {
    console.log('[Meta Reply] WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN não configurados. Não enviando resposta ao usuário.');
    return null;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const wamId = data?.messages?.[0]?.id ?? null;
    console.log(`[Meta Reply] Enviado ao usuário ${toPhone}: HTTP ${res.status}, wam_id=${wamId}`);
    return wamId;
  } catch (err) {
    console.error('[Meta Reply] Falha ao enviar resposta:', err);
    return null;
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    console.log('Evento Recebido:', JSON.stringify(body, null, 2));

    // Debug Log (Temporário para análise de mapeamento)
    if (Object.keys(body).length > 0) {
      await supabase.from('whatsapp_webhook_debug').insert([{ payload: body }]);
    }

    // A. IDENTIFICAÇÃO DO PROVEDOR
    const isMeta = !!body.entry?.[0]?.changes?.[0]?.value;

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

      // 1. Statuses (atualizações de entrega/leitura)
      if (value.statuses && value.statuses.length > 0) {
        for (const statusUpdate of value.statuses) {
          const messageId = statusUpdate.id;
          const newStatus = statusUpdate.status;
          await supabase.from('whatsapp_messages').update({ status: newStatus }).eq('message_id', messageId);
        }
      }

      // 2. Nova mensagem recebida
      const message = value.messages?.[0];
      if (message) {
        const messageId = message.id;
        const msgType = message.type;
        const isEcho = body.entry[0].id === message.from ||
          (value.metadata?.display_phone_number && value.metadata.display_phone_number.includes(message.from));

        let targetPhone = message.from;
        if (isEcho && message.to) targetPhone = message.to;

        const phoneNormalized = normalizePhone(targetPhone);
        const profileName = value.contacts?.[0]?.profile?.name || 'WhatsApp Contact';
        const text = msgType === 'text' ? (message.text?.body ?? '') : `[${msgType}]`;

        // 2a. Salva mensagem do usuário no banco
        await handleMessageSync(supabase, {
          messageId, phoneNormalized, text, isEcho, profileName, status: isEcho ? 'sent' : 'received'
        });

        // 2b. Se for mensagem RECEBIDA do usuário (não eco), chama o GPTMaker
        if (!isEcho && text && !text.startsWith('[')) {
          console.log(`[GPTMaker] Mensagem recebida do usuário: "${text}". Solicitando resposta do bot...`);
          const botReply = await callGPTMaker(phoneNormalized, text, profileName);

          if (botReply) {
            // Envia de volta ao usuário via Meta API e obtém o ID real (wam_xxx)
            // Usar o ID real evita duplicata quando a Meta mandar o echo desta mensagem
            const wamId = await sendMetaReply(phoneNormalized, botReply);

            // Salva resposta do bot com o ID real (wam_xxx) se disponível,
            // ou com ID gerado como fallback (quando não há credenciais Meta)
            await handleMessageSync(supabase, {
              messageId: wamId ?? `gpt_${messageId}_${Date.now()}`,
              phoneNormalized,
              text: botReply,
              isEcho: true,  // is_from_me = true (resposta do bot)
              profileName: 'GPTMaker Bot',
              status: 'sent'
            });
          }
        }
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

  console.log(`[Sync] Iniciando sincronização para o telefone ${phoneNormalized}`);

  try {
    // 1. TENTA LOCALIZAR OU CRIAR CHAT
    const { data: allRelatedChats, error: chatError } = await supabase.from('whatsapp_chats')
      .select('id, telefone, unread_count')
      .or(`telefone.eq.${phoneNormalized},telefone.like.%${phoneNormalized.slice(-8)}`)
      .order('created_at', { ascending: true });

    if (chatError) console.error(`[Sync] Erro ao buscar chats:`, chatError);

    let chat = (allRelatedChats && allRelatedChats.length > 0) ? allRelatedChats[0] : null;

    if (!chat) {
      console.log(`[Sync] Chat não encontrado para ${phoneNormalized}. Criando agora...`);
      const { data: newChat, error: createError } = await supabase.from('whatsapp_chats').insert([{ 
        telefone: phoneNormalized, 
        nome: profileName || 'Contato Novo', 
        last_message: text, 
        unread_count: isEcho ? 0 : 1
      }]).select().single();
      
      if (createError) {
        console.error(`[Sync] Falha ao criar chat para ${phoneNormalized}:`, createError);
      } else {
        chat = newChat;
      }
    }

    // 2. SALVA A MENSAGEM (Com ou sem chat_id de fallback)
    console.log(`[Sync] Salvando mensagem ID: ${messageId}`);
    const { error: msgError } = await supabase.from('whatsapp_messages').upsert([{
      chat_id: chat?.id || null, // Fallback para null se chat falhou
      telefone: phoneNormalized, 
      text_body: text, 
      is_from_me: isEcho, 
      message_id: messageId, 
      status: status || (isEcho ? 'sent' : 'received')
    }], { onConflict: 'message_id' });

    if (msgError) {
      console.error(`[Sync] ERRO CRÍTICO ao salvar mensagem ${messageId}:`, msgError);
    } else {
      console.log(`[Sync] Mensagem ${messageId} salva com sucesso.`);
    }

    // 3. FAXINA E ATUALIZAÇÃO (SEGUNDO PLANO)
    if (chat) {
      try {
        // Atualiza resumo do chat
        await supabase.from('whatsapp_chats').update({ 
          last_message: text, 
          last_message_at: new Date().toISOString(),
          unread_count: isEcho ? chat.unread_count : (chat.unread_count || 0) + 1
        }).eq('id', chat.id);

        // Limpeza de duplicados
        const otherChatIds = allRelatedChats?.slice(1).map(c => c.id) || [];
        if (otherChatIds.length > 0) {
          console.log(`[Cleaner] Fundindo ${otherChatIds.length} chats para ${phoneNormalized}`);
          await supabase.from('whatsapp_messages').update({ chat_id: chat.id }).in('chat_id', otherChatIds);
          await supabase.from('whatsapp_chats').delete().in('id', otherChatIds);
        }
      } catch (subErr) {
        console.warn(`[Sync] Erro menor em tarefas de limpeza:`, subErr);
      }
    }
  } catch (err) {
    console.error(`[Sync] FALHA TOTAL NO handleMessageSync:`, err);
  }
}
