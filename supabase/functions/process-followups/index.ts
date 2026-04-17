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
    const { force = false } = await req.json().catch(() => ({}));
    console.log(`[Worker] Iniciando processamento (Force: ${force})...`);

    // 1. Carregar configurações de automação
    const { data: settings } = await supabase
      .from('follow_up_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!settings?.enabled) {
      console.log("[Worker] Automação global desativada.");
      return new Response(JSON.stringify({ message: "Automação desativada" }), { status: 200 });
    }

    // 2. Buscar follow-ups agendados para HOJE ou ATRASADOS
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log(`[Worker] Data: ${todayStr}, Hora: ${currentHourMin}`);

    const { data: followUps, error: fuError } = await supabase
      .from('follow_ups')
      .select('*, donors(id, name, phone, type)')
      .eq('status', 'agendado')
      .lte('due_date', todayStr);

    if (fuError) throw fuError;

    console.log(`[Worker] Encontrados ${followUps?.length || 0} follow-ups agendados.`);

    const results = [];

    for (const fu of (followUps || [])) {
      try {
        const donor = fu.donors;
        const donorType = donor?.type || 'unico';
        
        // Acha a regra para este tipo de doador
        const rule = settings.rules.find((r: any) => r.type === donorType);
        
        if (!rule || !rule.enabled) {
          console.log(`[Worker] Nenhuma regra ativa para doador ${donorType} (ID: ${donor?.id})`);
          continue;
        }

        // Verifica o horário (Pula se 'force' for true)
        if (!force && rule.sendHour > currentHourMin && fu.due_date === todayStr) {
          console.log(`[Worker] Aguardando horário de envio (${rule.sendHour}) para ${donor?.name}`);
          continue;
        }

        console.log(`[Worker] Processando envio para ${donor?.name} (${donor?.phone}) via ${rule.channel}`);

        if (rule.channel === 'whatsapp' && donor?.phone) {
          // Enviar via WhatsApp (Meta API)
          const waResult = await sendWhatsAppTemplate(supabase, donor, rule.template);
          
          if (waResult.success) {
            await supabase.from('follow_ups').update({ status: 'concluido' }).eq('id', fu.id);
            await logAutomation(supabase, donor, rule, 'enviado');
            results.push({ donor: donor.name, status: 'sucesso' });
          } else {
            throw new Error(waResult.error);
          }
        } else {
          console.log(`[Worker] Canal ${rule.channel} não suportado ou sem telefone.`);
        }

      } catch (err: any) {
        console.error(`[Worker] Falha ao processar follow-up ${fu.id}:`, err.message);
        await supabase.from('follow_ups').update({ status: 'atrasado', note: `Falha no envio: ${err.message}` }).eq('id', fu.id);
        await logAutomation(supabase, fu.donors, {}, 'falha', err.message);
        results.push({ donor: fu.donors?.name, status: 'erro', error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Worker] Erro Fatal:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

async function sendWhatsAppTemplate(supabase: any, donor: any, templateName: string) {
  const { data: waConfig } = await supabase
    .from('whatsapp_settings')
    .select('phone_number_id, access_token')
    .eq('id', 1)
    .maybeSingle();

  if (!waConfig?.phone_number_id || !waConfig?.access_token) {
    return { success: false, error: 'WhatsApp não configurado' };
  }

  const cleanPhone = donor.phone.replace(/\D/g, '');
  const res = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${waConfig.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'pt_BR' },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', text: donor.name }]
        }]
      }
    })
  });

  const data = await res.json();
  if (data.error) return { success: false, error: data.error.message };
  
  return { success: true, messageId: data.messages?.[0]?.id };
}

async function logAutomation(supabase: any, donor: any, rule: any, status: string, error?: string) {
  await supabase.from('follow_up_logs').insert([{
    donor_id: donor.id,
    donor_name: donor.name,
    donor_type: donor.type,
    channel: rule.channel || 'whatsapp',
    template: rule.template || 'N/A',
    status,
    error_message: error
  }]);
}
