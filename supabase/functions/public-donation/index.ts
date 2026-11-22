// ============================================================
// Doação pelo site (landing page), sem login.
//
// action "create": valida os dados, encontra ou cadastra o doador, cria o
//   cliente e a cobrança no Asaas e registra a doação como "pendente".
//   Pix → devolve QR code e "copia e cola"; cartão/boleto → devolve o link
//   da página de pagamento segura do Asaas.
// action "status": devolve só o status de uma cobrança criada aqui
//   (para a tela mostrar "pagamento confirmado").
//
// A confirmação do pagamento continua vindo pelo asaas-webhook, que marca a
// doação como "pago" (e o gatilho do banco atualiza o doador).
//
// A chave do Asaas NUNCA sai do servidor: vem do segredo ASAAS_API_KEY ou,
// se não houver, da tabela asaas_settings (lida com service role).
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

const MIN_AMOUNT = 5;
const MAX_AMOUNT = 50000;
const MAX_ATTEMPTS_PER_WINDOW = 6; // por IP
const WINDOW_MINUTES = 15;

const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const todayInSaoPaulo = (addDays = 0) => {
  const d = new Date(Date.now() + addDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d); // AAAA-MM-DD
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requisição inválida" }, 400);
  }

  // ── Status de uma cobrança criada por esta função ─────────
  if (body?.action === "status") {
    const paymentId = String(body.payment_id || "");
    if (!/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId)) return json({ error: "Cobrança inválida" }, 400);
    const { data } = await supabase
      .from("donations")
      .select("status")
      .eq("asaas_payment_id", paymentId)
      .eq("source", "site")
      .maybeSingle();
    return json({ status: data?.status ?? "desconhecido" });
  }

  if (body?.action !== "create") return json({ error: "Ação inválida" }, 400);

  // ── Validações ─────────────────────────────────────────────
  if (body.website) return json({ error: "Requisição inválida" }, 400); // campo-isca para robôs
  if (body.consent !== true) return json({ error: "É preciso aceitar o uso dos dados para processar a doação." }, 400);

  const name = String(body.name || "").trim().replace(/\s+/g, " ");
  const email = String(body.email || "").trim().toLowerCase();
  const phone = onlyDigits(body.phone);
  const document = onlyDigits(body.document);
  const amount = Math.round(Number(body.amount) * 100) / 100;
  const method = body.method === "PIX" ? "PIX" : "UNDEFINED"; // UNDEFINED = página do Asaas (cartão/boleto/Pix)

  if (name.length < 3 || name.length > 120) return json({ error: "Informe seu nome completo." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return json({ error: "Informe um e-mail válido." }, 400);
  if (phone.length < 10 || phone.length > 13) return json({ error: "Informe um telefone com DDD." }, 400);
  if (!(isValidCpf(document) || isValidCnpj(document))) return json({ error: "Informe um CPF ou CNPJ válido." }, 400);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return json({ error: `O valor deve ser entre R$ ${MIN_AMOUNT} e R$ ${MAX_AMOUNT.toLocaleString("pt-BR")}.` }, 400);
  }

  // ── Limite de tentativas por IP ────────────────────────────
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "desconhecido").split(",")[0].trim();
  const ipHash = await sha256(`${ip}|${Deno.env.get("SUPABASE_URL")}`);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
  const { count } = await supabase
    .from("public_donation_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
    return json({ error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." }, 429);
  }
  await supabase.from("public_donation_attempts").insert({ ip_hash: ipHash });

  try {
    // ── Credencial do Asaas (só no servidor) ──────────────────
    // Candidatas, na ordem: a chave da tela "Integração Asaas" (a que o admin mantém
    // atualizada) e depois o segredo ASAAS_API_KEY. O ambiente vem do prefixo da chave
    // ($aact_prod_ = produção, $aact_hmlg_ = sandbox) quando houver; senão da configuração.
    const { data: settings } = await supabase.from("asaas_settings").select("api_key, sandbox").eq("id", 1).maybeSingle();
    const clean = (k: unknown) => String(k ?? "").trim().split("::")[0].trim();
    const envSandbox = Deno.env.get("ASAAS_SANDBOX");
    const candidates = [
      { key: clean(settings?.api_key), sandbox: !!settings?.sandbox },
      { key: clean(Deno.env.get("ASAAS_API_KEY")), sandbox: envSandbox ? envSandbox === "true" : !!settings?.sandbox },
    ].filter((c, i, all) => c.key && all.findIndex((o) => o.key === c.key) === i);
    if (!candidates.length) throw new Error("Doações online indisponíveis no momento (Asaas não configurado).");

    const urlFor = (c: { key: string; sandbox: boolean }) => {
      if (/^\$?aact_prod_/.test(c.key)) return "https://api.asaas.com/v3";
      if (/^\$?aact_hmlg_/.test(c.key)) return "https://sandbox.asaas.com/api/v3";
      return c.sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";
    };

    // Descobre qual chave o Asaas aceita (consulta leve, sem criar nada).
    let active: { key: string; baseUrl: string } | null = null;
    for (const c of candidates) {
      const baseUrl = urlFor(c);
      const res = await fetch(`${baseUrl}/customers?limit=1`, {
        headers: { access_token: c.key, "User-Agent": "PulseDoacoes" },
      });
      if (res.ok) { active = { key: c.key, baseUrl }; break; }
      console.error(`[public-donation] Chave recusada pelo Asaas (${baseUrl}): HTTP ${res.status}`);
    }
    if (!active) {
      throw new Error("Doações online indisponíveis no momento: a chave do Asaas cadastrada não foi aceita. Avise a instituição.");
    }

    const asaas = async (path: string, init?: RequestInit) => {
      const res = await fetch(`${active!.baseUrl}${path}`, {
        ...init,
        headers: { access_token: active!.key, "Content-Type": "application/json", "User-Agent": "PulseDoacoes" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.errors?.[0]?.description || `Asaas respondeu ${res.status}`);
      return data;
    };

    const { data: org } = await supabase.from("white_label_settings").select("system_name").eq("id", 1).maybeSingle();
    const orgName = org?.system_name || "Pulse Doações";

    // ── Doador: procura por CPF/CNPJ, depois por e-mail; senão cadastra ──
    let { data: donor } = await supabase
      .from("donors")
      .select("id, name, asaas_customer_id")
      .eq("document_id", document)
      .limit(1)
      .maybeSingle();
    if (!donor) {
      ({ data: donor } = await supabase
        .from("donors")
        .select("id, name, asaas_customer_id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle());
    }
    if (!donor) {
      const { data: created, error } = await supabase
        .from("donors")
        .insert([{ name, email, phone, document_id: document, type: "lead", total_donated: 0, donation_count: 0 }])
        .select("id, name, asaas_customer_id")
        .single();
      if (error) throw new Error(`Não foi possível registrar o doador: ${error.message}`);
      donor = created;
    }

    // ── Cliente no Asaas ──────────────────────────────────────
    let customerId = donor!.asaas_customer_id as string | null;
    if (!customerId) {
      const customer = await asaas("/customers", {
        method: "POST",
        body: JSON.stringify({ name, email, mobilePhone: phone, cpfCnpj: document, externalReference: String(donor!.id), notificationDisabled: false }),
      });
      customerId = customer.id;
      await supabase.from("donors").update({ asaas_customer_id: customerId }).eq("id", donor!.id);
    }

    // ── Cobrança ─────────────────────────────────────────────
    const dueDate = todayInSaoPaulo(method === "PIX" ? 1 : 3);
    const payment = await asaas("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: method,
        value: amount,
        dueDate,
        description: `Doação para ${orgName}`,
        externalReference: String(donor!.id),
      }),
    });

    let pix: { image: string; payload: string; expiration: string } | null = null;
    if (method === "PIX") {
      const qr = await asaas(`/payments/${payment.id}/pixQrCode`);
      pix = { image: qr.encodedImage, payload: qr.payload, expiration: qr.expirationDate };
    }

    const { error: donErr } = await supabase.from("donations").insert([{
      donor_id: donor!.id,
      amount,
      status: "pendente",
      asaas_payment_id: payment.id,
      asaas_customer_id: customerId,
      billing_type: method,
      due_date: dueDate,
      donation_date: new Date().toISOString(),
      payment_method: "Asaas",
      source: "site",
      notes: "[Site] Doação feita pela página pública",
    }]);
    if (donErr) console.error("[public-donation] Erro ao registrar doação:", donErr.message);

    return json({
      payment_id: payment.id,
      invoice_url: payment.invoiceUrl,
      amount,
      pix,
    });
  } catch (err: any) {
    console.error("[public-donation] Erro:", err?.message);
    return json({ error: err?.message || "Não foi possível gerar a doação agora." }, 502);
  }
});
