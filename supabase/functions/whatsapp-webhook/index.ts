import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.10.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com o Handshake da Meta (GET)
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

  // 2. Lidar com Mensagens de Entrada (POST)
  try {
    const body = await req.json();
    console.log('Evento do Webhook Recebido:', JSON.stringify(body, null, 2));

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from; // Número do remetente
      const text = message.text?.body;
      const messageId = message.id;

      if (!text) {
        return new Response('Apenas mensagens de texto são suportadas no momento', { status: 200 });
      }

      // Inicializar Cliente Supabase usando a chave Anonícia ou de Serviço (garantia de funcionamento)
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      // Limpar número para busca (Tratar variações de +55 / 9 digito)
      const cleanPhone = from.replace(/\D/g, "");
      // Versão curta para busca flexível (ex: sem 55 no início)
      const shortPhone = cleanPhone.startsWith("55") ? cleanPhone.slice(2) : cleanPhone;

      console.log(`Buscando doador para o telefone: ${cleanPhone} ou ${shortPhone}`);

      // Buscar doadores e fazer match ignorando formatação
      const { data: donors, error: donorError } = await supabase
        .from('donors')
        .select('id, name, phone');

      if (donorError || !donors || donors.length === 0) {
        console.warn('Erro ao buscar doadores ou lista vazia.');
        return new Response('Doador não identificado', { status: 200 });
      }

      // Encontrar primeiro doador que dê match (lidando com formatações e nono dígito do Brasil)
      const donor = donors.find((d: any) => {
        if (!d.phone) return false;
        const dbPhoneClean = d.phone.replace(/\D/g, "");
        
        // Match exato
        if (dbPhoneClean === cleanPhone || dbPhoneClean === shortPhone) return true;
        
        // Se ambos terminarem com o mesmo número ex: ultimos 8 digitos (ignora nono digito e DDD se falhar tudo)
        const last8DB = dbPhoneClean.slice(-8);
        const last8Meta = cleanPhone.slice(-8);

        // Checar se o código de área bate (assumindo formato brasileiro)
        const dddDB = dbPhoneClean.length >= 10 ? dbPhoneClean.slice(-10, -8) : "";
        const dddMeta = shortPhone.length >= 10 ? shortPhone.slice(0, 2) : "";

        if (last8DB === last8Meta && dddDB && dddMeta && dddDB === dddMeta) {
          return true;
        }

        return cleanPhone.endsWith(dbPhoneClean) || shortPhone.endsWith(dbPhoneClean);
      });

      if (!donor) {
        console.warn('Nenhum doador encontrado para este telefone:', cleanPhone);
        return new Response('Doador não identificado', { status: 200 });
      }

      console.log(`Mensagem vinculada ao doador: ${donor.name} (ID: ${donor.id})`);

      // Inserir mensagem no banco
      const { error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert([{
          donor_id: donor.id,
          sender_id: 'them', // 'them' identifica que é uma mensagem recebida
          text: text,
          status: 'received',
          metadata: { 
            display_phone_number: value.metadata?.display_phone_number,
            waba_message_id: messageId
          }
        }]);

      if (insertError) {
        console.error('Erro ao inserir mensagem:', insertError);
        throw insertError;
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response('Evento ignorado', { status: 200 });
  } catch (err) {
    console.error('Erro no processamento do Webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})
