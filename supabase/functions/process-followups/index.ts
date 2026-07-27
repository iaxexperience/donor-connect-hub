import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Channel = "whatsapp" | "email" | "telefone";
type Rule = {
  type: string;
  enabled: boolean;
  channel: Channel;
  template: string;
  sendHour: string;
  followUpDays: number;
  maxRetries: number;
};

const DEFAULT_RULES: Rule[] = [
  { type: "unico", enabled: true, channel: "whatsapp", template: "follow_up_primeiro_doador", sendHour: "10:00", followUpDays: 90, maxRetries: 2 },
  { type: "esporadico", enabled: true, channel: "whatsapp", template: "follow_up_engajamento", sendHour: "14:00", followUpDays: 60, maxRetries: 3 },
  { type: "recorrente", enabled: true, channel: "whatsapp", template: "follow_up_fidelizacao", sendHour: "09:00", followUpDays: 30, maxRetries: 1 },
];

const today = () => new Date().toISOString().slice(0, 10);
const daysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
const saoPauloHour = () => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date());

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { manual = false, auto = false } = await req.json().catch(() => ({}));
    const { data: settings, error: settingsError } = await supabase
      .from("follow_up_settings").select("enabled, rules").eq("id", 1).maybeSingle();
    if (settingsError) throw settingsError;

    const rules = normalizeRules(settings?.rules);
    if (auto && !settings?.enabled) return json({ success: true, skipped: true, reason: "automation_disabled", sent: 0, failed: 0 });

    const { data: waConfig } = await supabase
      .from("whatsapp_settings").select("phone_number_id, access_token").eq("id", 1).maybeSingle();

    let sent = 0;
    let failed = 0;
    let queued = 0;
    let skipped = 0;
    const results: Record<string, unknown>[] = [];

    if (auto) {
      const currentHour = saoPauloHour();
      const activeRules = rules.filter((rule) => rule.enabled && currentHour >= rule.sendHour);
      const { data: donors, error } = await supabase
        .from("donors")
        .select("id, name, phone, email, type, last_donation_date, whatsapp_opt_in")
        .in("type", activeRules.map((rule) => rule.type))
        .not("last_donation_date", "is", null);
      if (error) throw error;

      for (const donor of donors || []) {
        const rule = activeRules.find((candidate) => candidate.type === donor.type);
        if (!rule || daysSince(donor.last_donation_date) < rule.followUpDays) continue;

        const { data: lastLog } = await supabase.from("follow_up_logs")
          .select("sent_at").eq("donor_id", donor.id).eq("template", rule.template)
          .order("sent_at", { ascending: false }).limit(1).maybeSingle();
        if (lastLog?.sent_at && daysSince(lastLog.sent_at) < rule.followUpDays) {
          skipped++;
          continue;
        }

        if (rule.channel !== "whatsapp") {
          await supabase.from("follow_ups").insert({ donor_id: donor.id, due_date: today(), status: "pendente", note: `Contato automático via ${rule.channel}` });
          await logAttempt(supabase, donor, rule, "aguardando", 0);
          queued++;
          continue;
        }

        const outcome = await processWhatsApp(supabase, waConfig, donor, rule);
        sent += outcome.sent;
        failed += outcome.failed;
        skipped += outcome.skipped;
        results.push(outcome.result);
        if (outcome.sent) {
          await supabase.from("follow_ups").insert({ donor_id: donor.id, due_date: today(), status: "enviado", note: `Automático: ${donor.type}` });
        }
      }
    }

    if (manual) {
      const { data: followUps, error } = await supabase.from("follow_ups")
        .select("*, donors(id, name, phone, email, type, whatsapp_opt_in)")
        .in("status", ["agendado", "pendente"])
        .lte("due_date", today());
      if (error) throw error;

      for (const followUp of followUps || []) {
        const donor = followUp.donors;
        const rule = rules.find((candidate) => candidate.type === donor?.type);
        if (!donor || !rule || !rule.enabled) {
          skipped++;
          continue;
        }
        if (rule.channel !== "whatsapp") {
          await logAttempt(supabase, donor, rule, "aguardando", 0);
          queued++;
          continue;
        }

        const outcome = await processWhatsApp(supabase, waConfig, donor, rule);
        sent += outcome.sent;
        failed += outcome.failed;
        skipped += outcome.skipped;
        results.push(outcome.result);
        if (outcome.sent) await supabase.from("follow_ups").update({ status: "enviado" }).eq("id", followUp.id);
        if (outcome.exhausted) await supabase.from("follow_ups").update({ status: "atrasado" }).eq("id", followUp.id);
      }
    }

    return json({ success: true, sent, failed, queued, skipped, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: message }, 500);
  }
});

function normalizeRules(value: unknown): Rule[] {
  if (!Array.isArray(value)) return DEFAULT_RULES;
  return DEFAULT_RULES.map((fallback) => {
    const saved = value.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).type === fallback.type) as Partial<Rule> | undefined;
    return { ...fallback, ...saved, type: fallback.type };
  });
}

async function processWhatsApp(supabase: any, waConfig: any, donor: any, rule: Rule) {
  if (!donor.whatsapp_opt_in) {
    return { sent: 0, failed: 0, skipped: 1, exhausted: false, result: { donor: donor.name, status: "ignorado", reason: "sem_opt_in" } };
  }
  if (!donor.phone || !waConfig?.phone_number_id || !waConfig?.access_token) {
    return { sent: 0, failed: 1, skipped: 0, exhausted: false, result: { donor: donor.name, status: "erro", reason: "whatsapp_nao_configurado" } };
  }

  const { data: failures } = await supabase.from("follow_up_logs")
    .select("retry_count").eq("donor_id", donor.id).eq("template", rule.template)
    .eq("status", "falha").order("sent_at", { ascending: false }).limit(rule.maxRetries);
  const retryCount = failures?.length || 0;
  if (retryCount >= rule.maxRetries) {
    return { sent: 0, failed: 0, skipped: 1, exhausted: true, result: { donor: donor.name, status: "ignorado", reason: "tentativas_esgotadas" } };
  }

  try {
    await sendWhatsApp(waConfig, donor, rule.template);
    await logAttempt(supabase, donor, rule, "enviado", retryCount);
    return { sent: 1, failed: 0, skipped: 0, exhausted: false, result: { donor: donor.name, status: "sucesso", template: rule.template } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no envio";
    const nextRetry = retryCount + 1;
    await logAttempt(supabase, donor, rule, "falha", nextRetry, message);
    return { sent: 0, failed: 1, skipped: 0, exhausted: nextRetry >= rule.maxRetries, result: { donor: donor.name, status: "erro", error: message } };
  }
}

async function logAttempt(supabase: any, donor: any, rule: Rule, status: "enviado" | "falha" | "aguardando", retryCount: number, errorMessage?: string) {
  await supabase.from("follow_up_logs").insert({
    donor_id: donor.id, donor_name: donor.name, donor_type: donor.type,
    channel: rule.channel, template: rule.template, status,
    retry_count: retryCount, error_message: errorMessage, sent_at: new Date().toISOString(),
  });
}

async function sendWhatsApp(waConfig: { phone_number_id: string; access_token: string }, donor: { phone: string }, template: string) {
  let phone = donor.phone.replace(/\D/g, "");
  if (!phone.startsWith("55")) phone = `55${phone}`;
  const response = await fetch(`https://graph.facebook.com/v20.0/${waConfig.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${waConfig.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "template", template: { name: template, language: { code: "pt_BR" } } }),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(`Meta API: ${result.error?.message || response.statusText}`);
  return result;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
