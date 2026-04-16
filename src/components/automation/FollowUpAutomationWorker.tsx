import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { metaService, MetaConfig } from "@/services/metaService";
import { asaasService } from "@/lib/asaasService";

// ── Regras de Follow-up por tipo de doador ────────────────────────────────────
const RULES = {
  recorrente: {
    reminderDays: 30,   // lembrete simples
    paymentDays: 60,    // PIX + template
    reminderTemplate: "follow_up_fidelizacao",
    paymentTemplate:  "follow_up_fidelizacao",
  },
  esporadico: {
    reminderDays: 60,
    paymentDays: null,
    reminderTemplate: "follow_up_engajamento",
    paymentTemplate:  null,
  },
  unico: {
    reminderDays: null,
    paymentDays: 90,    // PIX + template
    reminderTemplate: null,
    paymentTemplate:  "follow_up_primeiro_doador",
  },
} as const;

const TEMPLATE_LANGUAGE = "pt_BR";

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function getOrCreateAsaasCustomer(donor: any): Promise<string | null> {
  if (donor.asaas_customer_id) return donor.asaas_customer_id;
  try {
    const result = await asaasService.createCustomer(
      donor.id,
      donor.name,
      donor.email || "",
      donor.phone || ""
    );
    return result?.customer_id ?? null;
  } catch (e) {
    console.warn(`[FollowUp] Falha ao criar cliente Asaas para ${donor.name}:`, e);
    return null;
  }
}

async function createPixPayment(donor: any, customerId: string): Promise<string | null> {
  try {
    const avgAmount =
      donor.total_donated && donor.donation_count > 0
        ? Math.round(donor.total_donated / donor.donation_count)
        : 50;

    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const result = await asaasService.createPayment({
      donor_id: donor.id,
      customer: customerId,
      billingType: "PIX",
      value: Math.min(Math.max(avgAmount, 10), 1000), // entre R$10 e R$1000
      dueDate,
      description: `Follow-up automático — ${donor.name}`,
    });

    // pixQrCode.payload = copia-e-cola PIX
    return result?.pixQrCode?.payload ?? result?.payment?.pixTransaction?.payload ?? null;
  } catch (e) {
    console.warn(`[FollowUp] Falha ao criar PIX para ${donor.name}:`, e);
    return null;
  }
}

async function sendTemplate(
  donor: any,
  templateName: string,
  pixCopiaECola: string | null,
  metaConfig: MetaConfig
): Promise<void> {
  const parameters: any[] = [{ type: "text", text: donor.name }];
  if (pixCopiaECola) {
    parameters.push({ type: "text", text: pixCopiaECola });
  }

  const components = [{ type: "body", parameters }];

  await metaService.sendTemplateMessage(
    donor.phone,
    templateName,
    TEMPLATE_LANGUAGE,
    components,
    metaConfig,
    donor.id
  );
}

async function logFollowUp(
  donorId: number,
  todayStr: string,
  templateName: string,
  status: "enviado" | "falha",
  logType: string,
  errorMessage?: string
): Promise<void> {
  // Registra na tabela follow_ups para aparecer na lista
  await supabase.from("follow_ups").insert([{
    donor_id: donorId,
    due_date: todayStr,
    status: "concluido",
    note: `Auto: ${logType}`,
  }]).catch(() => {});

  // Registra no histórico de envios automáticos
  await supabase.from("follow_up_logs").insert([{
    donor_id: donorId,
    channel: "whatsapp",
    template: templateName,
    sent_at: new Date().toISOString(),
    status,
    retry_count: 0,
    error_message: errorMessage ?? null,
  }]).catch(() => {});
}

// ── Worker principal ──────────────────────────────────────────────────────────
export const FollowUpAutomationWorker = () => {
  useEffect(() => {
    const run = async () => {
      const isEnabled = localStorage.getItem("automation_global") === "true";
      if (!isEnabled) return;

      const savedConfig = localStorage.getItem("meta_config");
      if (!savedConfig) return;

      const metaConfig: MetaConfig = JSON.parse(savedConfig);
      if (!metaConfig.phone_number_id || !metaConfig.access_token) return;

      console.log("[FollowUp] Iniciando verificação de follow-ups automáticos...");

      const today = new Date().toISOString().split("T")[0];

      // Busca todos os doadores ativos com tipo elegível
      const { data: donors, error } = await supabase
        .from("donors")
        .select("id, name, phone, email, type, last_donation_date, total_donated, donation_count, asaas_customer_id")
        .in("type", ["recorrente", "esporadico", "unico"])
        .not("phone", "is", null);

      if (error || !donors) {
        console.error("[FollowUp] Erro ao buscar doadores:", error);
        return;
      }

      for (const donor of donors) {
        if (!donor.last_donation_date || !donor.phone) continue;

        const rule = RULES[donor.type as keyof typeof RULES];
        if (!rule) continue;

        const elapsed = daysSince(donor.last_donation_date);

        // Verifica o follow-up mais recente para evitar spam
        const { data: lastLog } = await supabase
          .from("follow_up_logs")
          .select("sent_at")
          .eq("donor_id", donor.id)
          .eq("status", "enviado")
          .order("sent_at", { ascending: false })
          .limit(1);

        const daysSinceLastSend = lastLog?.[0]?.sent_at
          ? daysSince(lastLog[0].sent_at)
          : 999;

        // ── Recorrente: 60 dias → PIX ─────────────────────────────────────────
        if (donor.type === "recorrente" && rule.paymentDays && elapsed >= rule.paymentDays && daysSinceLastSend >= rule.paymentDays) {
          console.log(`[FollowUp] ${donor.name} (recorrente) — 60 dias, gerando PIX...`);
          try {
            const customerId = await getOrCreateAsaasCustomer(donor);
            const pixKey = customerId ? await createPixPayment(donor, customerId) : null;
            await sendTemplate(donor, rule.paymentTemplate!, pixKey, metaConfig);
            await logFollowUp(donor.id, today, rule.paymentTemplate!, "enviado", "recorrente_60d_pix");
            console.log(`[FollowUp] ✓ PIX enviado para ${donor.name}`);
          } catch (e: any) {
            await logFollowUp(donor.id, today, rule.paymentTemplate!, "falha", "recorrente_60d_pix", e.message);
          }
          continue;
        }

        // ── Recorrente: 30 dias → lembrete ────────────────────────────────────
        if (donor.type === "recorrente" && rule.reminderDays && elapsed >= rule.reminderDays && daysSinceLastSend >= rule.reminderDays) {
          console.log(`[FollowUp] ${donor.name} (recorrente) — 30 dias, enviando lembrete...`);
          try {
            await sendTemplate(donor, rule.reminderTemplate!, null, metaConfig);
            await logFollowUp(donor.id, today, rule.reminderTemplate!, "enviado", "recorrente_30d_lembrete");
            console.log(`[FollowUp] ✓ Lembrete enviado para ${donor.name}`);
          } catch (e: any) {
            await logFollowUp(donor.id, today, rule.reminderTemplate!, "falha", "recorrente_30d_lembrete", e.message);
          }
          continue;
        }

        // ── Esporádico: 60 dias → lembrete ────────────────────────────────────
        if (donor.type === "esporadico" && rule.reminderDays && elapsed >= rule.reminderDays && daysSinceLastSend >= rule.reminderDays) {
          console.log(`[FollowUp] ${donor.name} (esporadico) — 60 dias, enviando lembrete...`);
          try {
            await sendTemplate(donor, rule.reminderTemplate!, null, metaConfig);
            await logFollowUp(donor.id, today, rule.reminderTemplate!, "enviado", "esporadico_60d_lembrete");
            console.log(`[FollowUp] ✓ Lembrete enviado para ${donor.name}`);
          } catch (e: any) {
            await logFollowUp(donor.id, today, rule.reminderTemplate!, "falha", "esporadico_60d_lembrete", e.message);
          }
          continue;
        }

        // ── Único: 90 dias → PIX ──────────────────────────────────────────────
        if (donor.type === "unico" && rule.paymentDays && elapsed >= rule.paymentDays && daysSinceLastSend >= rule.paymentDays) {
          console.log(`[FollowUp] ${donor.name} (unico) — 90 dias, gerando PIX...`);
          try {
            const customerId = await getOrCreateAsaasCustomer(donor);
            const pixKey = customerId ? await createPixPayment(donor, customerId) : null;
            await sendTemplate(donor, rule.paymentTemplate!, pixKey, metaConfig);
            await logFollowUp(donor.id, today, rule.paymentTemplate!, "enviado", "unico_90d_pix");
            console.log(`[FollowUp] ✓ PIX enviado para ${donor.name}`);
          } catch (e: any) {
            await logFollowUp(donor.id, today, rule.paymentTemplate!, "falha", "unico_90d_pix", e.message);
          }
          continue;
        }
      }

      console.log("[FollowUp] Verificação concluída.");
    };

    run();
    const interval = setInterval(run, 5 * 60 * 1000); // verifica a cada 5 min
    return () => clearInterval(interval);
  }, []);

  return null; // background worker, não renderiza nada
};
