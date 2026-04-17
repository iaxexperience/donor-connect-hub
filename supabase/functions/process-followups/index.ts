import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RULES: Record<string, { days: number; template: string }> = {
  recorrente: { days: 30, template: 'follow_up_fidelizacao' },
  esporadico: { days: 60, template: 'follow_up_engajamento' },
  unico:      { days: 90, template: 'follow_up_primeiro_doador' },
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { manual = false, force = false, auto = false } = await req.json().catch(() => ({}));
    console.log(`[Worker] Iniciando (manual:${manual} force:${force} auto:${auto})...`);

    // Credenciais WhatsApp
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
    const results: any[] = [];

    // ── MODO AUTO: verifica doadores por data da última doação ────────────────
    if (auto) {
      console.log('[Worker] Modo AUTO: verificando doadores por última doação...');

      const { data: donors, error: donorErr } = await supabase
        .from('donors')
        .select('id, name, phone, type, last_donation_date, total_donated, donation_count')
        .in('type', ['recorrente', 'esporadico', 'unico'])
        .not('phone', 'is', null)
        .not('last_donation_date', 'is', null);

      if (donorErr) throw donorErr;
      console.log(`[Worker] ${donors?.length || 0} doadores elegíveis encontrados.`);

      for (const donor of donors || []) {
        const rule = RULES[donor.type];
        if (!rule) continue;

        const elapsed = daysSince(donor.last_donation_date);
        if (elapsed < rule.days) continue; // ainda não atingiu o prazo

        // Verifica se já foi enviado recentemente (dentro do mesmo período)
        const { data: lastLog } = await supabase
          .from('follow_up_logs')
          .select('sent_at')
          .eq('donor_id', donor.id)
          .eq('status', 'enviado')
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastLog?.sent_at && daysSince(lastLog.sent_at) < rule.days) {
          console.log(`[Worker] ${donor.name} já recebeu follow-up há menos de ${rule.days} dias, pulando.`);
          continue;
        }

        console.log(`[Worker] ${donor.name} (${donor.type}) — ${elapsed} dias desde última doação → enviando ${rule.template}...`);

        try {
          await sendWhatsApp(supabase, waConfig, donor, rule.template);

          // Registra na fila como enviado
          await supabase.from('follow_ups').insert([{
            donor_id: donor.id,
            due_date: new Date().toISOString().split('T')[0],
            status: 'enviado',
            note: `Auto: ${donor.type} ${elapsed}d`,
          }]);

          await supabase.from('follow_up_logs').insert([{
            donor_id: donor.id,
            channel: 'whatsapp',
            template: rule.template,
            status: 'enviado',
            sent_at: new Date().toISOString(),
          }]);

          sentCount++;
          results.push({ donor: donor.name, type: donor.type, days: elapsed, template: rule.template, status: 'sucesso' });
          console.log(`[Worker] ✓ Enviado para ${donor.name}`);

        } catch (err: any) {
          console.error(`[Worker] Falha para ${donor.name}:`, err.message);

          await supabase.from('follow_up_logs').insert([{
            donor_id: donor.id,
            channel: 'whatsapp',
            template: rule.template,
            status: 'falha',
            error_message: err.message,
            sent_at: new Date().toISOString(),
          }]);

          failCount++;
          results.push({ donor: donor.name, status: 'erro', error: err.message });
        }
      }
    }

    // ── MODO MANUAL / FILA: processa follow_ups existentes ───────────────────
    if (manual || force) {
      console.log('[Worker] Modo MANUAL: processando fila de follow-ups...');

      const { data: followUps, error: fuError } = await supabase
        .from('follow_ups')
        .select('*, donors(id, name, phone, type)')
        .in('status', ['agendado', 'pendente']);

      if (fuError) throw fuError;
      console.log(`[Worker] ${followUps?.length || 0} follow-ups na fila.`);

      for (const fu of followUps || []) {
        const donor = fu.donors;
        if (!donor?.name || !donor?.phone) continue;

        const templateName = RULES[donor.type]?.template || 'follow_up_primeiro_doador';

        try {
          await sendWhatsApp(supabase, waConfig, donor, templateName);

          const { error: updateErr } = await supabase
            .from('follow_ups')
            .update({ status: 'enviado' })
            .eq('id', fu.id);

          if (updateErr) console.error(`[Worker] Falha ao atualizar status ${fu.id}:`, updateErr.message);

          await supabase.from('follow_up_logs').insert([{
            donor_id: donor.id,
            channel: 'whatsapp',
            template: templateName,
            status: 'enviado',
            sent_at: new Date().toISOString(),
          }]);

          sentCount++;
          results.push({ donor: donor.name, status: 'sucesso', template: templateName });

        } catch (err: any) {
          console.error(`[Worker] Falha para ${donor.name}:`, err.message);

          await supabase.from('follow_up_logs').insert([{
            donor_id: donor.id,
            channel: 'whatsapp',
            template: templateName,
            status: 'falha',
            error_message: err.message,
            sent_at: new Date().toISOString(),
          }]);

          failCount++;
          results.push({ donor: donor.name, status: 'erro', error: err.message });
        }
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

async function sendWhatsApp(supabase: any, waConfig: any, donor: any, templateName: string) {
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

  let cleanPhone = donor.phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

  const waResponse = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${waConfig.access_token}`,
      'Content-Type': 'application/json',
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
            { type: 'text', text: formattedAmount },
          ],
        }],
      },
    }),
  });

  const waResult = await waResponse.json();
  if (waResult.error) throw new Error(`Meta API: ${waResult.error.message}`);

  return waResult;
}
