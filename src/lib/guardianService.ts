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
