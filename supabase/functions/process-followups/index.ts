import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMPLATE_BY_TYPE: Record<string, string> = {
  unico: 'follow_up_primeiro_doador',
  esporadico: 'follow_up_engajamento',
  recorrente: 'follow_up_fidelizacao',
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
    const { force = false, manual = false } = await req.json().catch(() => ({}));
    console.log(`[Worker] Iniciando processamento (force: ${force}, manual: ${manual})...`);

    // 1. Carregar configurações de automação
    const { data: settings } = await supabase
      .from('follow_up_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    // Modo manual ignora a chave de automação global
    if (!manual && !settings?.enabled) {
      console.log("[Worker] Automação global desativada.");
      return new Response(JSON.stringify({ message: "Automação desativada" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Buscar follow-ups pendentes e agendados
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log(`[Worker] Data: ${todayStr}, Hora: ${currentHourMin}`);

    const { data: followUps, error: fuError } = await supabase
      .from('follow_ups')
      .select('*, donors(id, name, phone, type)')
      .in('status', ['agendado', 'pendente'])
      .lte('due_date', todayStr);

    if (fuError) throw fuError;

    console.log(`[Worker] Encontrados ${followUps?.length || 0} follow-ups para processar.`);

    // 3. Credenciais WhatsApp
    const { data: waConfig } = await supabase
      .from('whatsapp_settings')
      .select('phone_number_id, access_token')
      .eq('id', 1)
      .maybeSingle();

    if (!waConfig?.phone_number_id || !waConfig?.access_token) {
      throw new Error('WhatsApp não configurado em whatsapp_settings.');
    }

    let sentCount = 0;
    let failCount = 0;
    const results = [];

    for (const fu of (followUps || [])) {
      try {
        const donor = fu.donors;
        if (!donor?.name || !donor?.phone) {
          console.log(`[Worker] Doador sem nome ou telefone (ID: ${fu.id}), pulando.`);
          continue;
        }

        const donorType = donor.type || 'unico';

        // Verifica horário de envio (apenas em modo automático, não manual/force)
        if (!manual && !force && settings?.rules) {
          const rule = settings.rules.find((r: any) => r.type === donorType);
          if (rule?.enabled === false) {
            console.log(`[Worker] Regra desativada para tipo ${donorType}, pulando.`);
            continue;
          }
          if (rule?.sendHour && rule.sendHour > currentHourMin && fu.due_date === todayStr) {
            console.log(`[Worker] Aguardando horário ${rule.sendHour} para ${donor.name}`);
            continue;
          }
        }

        const templateName = TEMPLATE_BY_TYPE[donorType] || 'follow_up_primeiro_doador';

        // Buscar valor da última doação
        const { data: latestDonation } = await supabase
          .from('donations')
          .select('amount')
          .eq('donor_id', donor.id)
          .eq('status', 'pago')
          .order('confirmed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const amount = latestDonation?.amount || 0;
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

        // Formatar telefone com código do país
        let cleanPhone = donor.phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

        console.log(`[Worker] Enviando '${templateName}' para ${donor.name} (${cleanPhone})...`);

        const waResponse = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waConfig.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'pt_BR' },
              components: [{
                type: 'BODY',
                parameters: [
                  { type: 'text', text: donor.name },
                  { type: 'text', text: formattedAmount }
                ]
              }]
            }
          })
        });

        const waResult = await waResponse.json();

        if (waResult.error) {
          throw new Error(`Meta API: ${waResult.error.message}`);
        }

        // Atualiza status (service role ignora RLS)
        await supabase.from('follow_ups').update({ status: 'concluido' }).eq('id', fu.id);

        // Log de sucesso
        await supabase.from('follow_up_logs').insert([{
          donor_id: donor.id,
          donor_name: donor.name,
          donor_type: donorType,
          channel: 'whatsapp',
          template: templateName,
          status: 'enviado',
          sent_at: new Date().toISOString()
        }]);

        sentCount++;
        results.push({ donor: donor.name, status: 'sucesso', template: templateName });

      } catch (err: any) {
        console.error(`[Worker] Falha no follow-up ${fu.id}:`, err.message);
        await supabase.from('follow_up_logs').insert([{
          donor_id: fu.donors?.id,
          donor_name: fu.donors?.name,
          donor_type: fu.donors?.type || 'unico',
          channel: 'whatsapp',
          template: TEMPLATE_BY_TYPE[fu.donors?.type] || 'follow_up_primeiro_doador',
          status: 'falha',
          error_message: err.message,
          sent_at: new Date().toISOString()
        }]);

        failCount++;
        results.push({ donor: fu.donors?.name, status: 'erro', error: err.message });
      }
    }

    console.log(`[Worker] Concluído: ${sentCount} enviados, ${failCount} falhas.`);

    return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failCount, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Worker] Erro Fatal:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
