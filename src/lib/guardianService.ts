import { supabase } from "@/integrations/supabase/client";

export type GuardianEvent = "login_failed" | "role_changed" | "user_deactivated" | "user_activated";

/**
 * Envia um evento de segurança ao IAX Guardian pela Edge Function
 * "guardian-event" (a chave fica no servidor). Nunca lança erro e não
 * bloqueia a tela: se o Guardian estiver desligado ou fora do ar, só ignora.
 */
export function sendGuardianEvent(
  eventType: GuardianEvent,
  opts: { actorEmail?: string; metadata?: Record<string, string | number | boolean> } = {}
): void {
  supabase.functions
    .invoke("guardian-event", {
      body: { action: "event", event_type: eventType, actor_email: opts.actorEmail, metadata: opts.metadata },
    })
    .catch(() => { /* silencioso */ });
}

/**
 * Pergunta ao IAX Guardian (pela Edge Function, com o IP real) se este e-mail
 * pode tentar entrar agora. Falha aberta: erro, função fora do ar ou demora
 * acima de 2,5 s → libera, para o Guardian nunca travar o login.
 */
export async function guardianLoginDecision(email: string): Promise<{ allow: boolean; message?: string }> {
  try {
    const call = supabase.functions.invoke("guardian-event", { body: { action: "decision", email } });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const res = await Promise.race([call, timeout]);
    if (!res || res.error || !res.data) return { allow: true };
    return { allow: res.data.allow !== false, message: res.data.message };
  } catch {
    return { allow: true };
  }
}
