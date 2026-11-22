// ============================================================
// Envio de eventos de segurança para o IAX Guardian.
//
// O navegador chama esta função; ela lê a configuração (service role) e
// repassa ao Guardian com o cabeçalho x-api-key. A chave nunca vai ao
// navegador.
//
//  action "event":
//    - "login_failed": pode vir SEM login (tela de entrar). Limite por IP.
//    - "role_changed", "user_deactivated", "user_activated": exigem usuário
//      logado com papel admin ou coordenador; o autor vem do token, não do
//      corpo da requisição.
//  action "test": só admin; envia "connection_test" e devolve o status.
//
// Se o envio estiver desligado ou sem chave, responde { skipped: true } e
// nada quebra.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ANON_EVENTS = new Set(["login_failed"]);
const STAFF_EVENTS = new Set(["role_changed", "user_deactivated", "user_activated"]);
const MAX_ANON_PER_WINDOW = 20;
const WINDOW_MINUTES = 10;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Só aceita metadados simples (texto/número/booleano), no máximo 20 campos curtos.
function cleanMetadata(input: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, 20)) {
    if (!/^[a-z0-9_]{1,40}$/i.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Requisição inválida" }, 400); }

  // Quem está chamando (se estiver logado)
  let caller: { id: string; email: string | null; role: string | null } | null = null;
  const bearer = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user } } = await authClient.auth.getUser(bearer);
    if (user) {
      const { data: prof } = await admin.from("profiles").select("role, status").eq("id", user.id).maybeSingle();
      caller = { id: user.id, email: user.email ?? null, role: prof?.status === "Ativo" ? prof?.role ?? null : null };
    }
  }

  const { data: cfg } = await admin
    .from("guardian_settings")
    .select("ingest_url, api_key, source_company_id, enabled")
    .eq("id", 1)
    .maybeSingle();

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim();
  const userAgent = (req.headers.get("user-agent") || "").slice(0, 200);

  let eventType: string;
  let actorUserId: string | null = null;
  let actorEmail: string | null = null;
  let metadata: Record<string, string | number | boolean> = {};

  if (body?.action === "test") {
    if (caller?.role !== "admin") return json({ error: "Apenas administradores" }, 403);
    // O teste usa a URL/chave do formulário se vierem (antes de salvar), senão as salvas.
    if (body.ingest_url) cfg && (cfg.ingest_url = String(body.ingest_url));
    if (body.api_key) cfg && (cfg.api_key = String(body.api_key));
    eventType = "connection_test";
    actorUserId = caller.id;
    actorEmail = caller.email;
  } else if (body?.action === "event") {
    eventType = String(body.event_type || "");
    metadata = cleanMetadata(body.metadata);
    if (ANON_EVENTS.has(eventType)) {
      // Limite por IP para quem não está logado
      const ipHash = await sha256(`${ip}|${url}`);
      const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
      const { count } = await admin
        .from("guardian_event_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if ((count ?? 0) >= MAX_ANON_PER_WINDOW) return json({ skipped: true, reason: "rate_limited" });
      await admin.from("guardian_event_attempts").insert({ ip_hash: ipHash });
      actorEmail = String(body.actor_email || "").trim().toLowerCase().slice(0, 200) || null;
    } else if (STAFF_EVENTS.has(eventType)) {
      if (!caller || !["admin", "coordenador"].includes(caller.role ?? "")) return json({ error: "Sem permissão" }, 403);
      actorUserId = caller.id;
      actorEmail = caller.email;
    } else {
      return json({ error: "Tipo de evento não permitido" }, 400);
    }
  } else {
    return json({ error: "Ação inválida" }, 400);
  }

  if (!cfg?.api_key || !cfg?.ingest_url || (!cfg.enabled && body?.action !== "test")) {
    return json({ skipped: true, reason: "disabled" });
  }

  const payload = {
    event_type: eventType,
    source_company_id: cfg.source_company_id || "pulse-doacoes",
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    metadata: { ...metadata, ...(ip ? { ip } : {}), ...(userAgent ? { user_agent: userAgent } : {}), source_system: "pulse-doacoes" },
    occurred_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(cfg.ingest_url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.api_key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const text = (await res.text()).slice(0, 300);
    return json({ sent: res.ok, status: res.status, response: body?.action === "test" ? text : undefined });
  } catch (err: any) {
    console.error("[guardian-event] Falha no envio:", err?.message);
    return json({ sent: false, error: err?.message || "Falha de conexão" });
  }
});
