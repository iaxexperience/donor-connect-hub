import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const methodLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto Bancário",
};

function getPaymentLabel(method: string, tipo?: string): string {
  if (method === "cartao" && tipo) return tipo === "debito" ? "Cartão de Débito" : "Cartão de Crédito";
  return methodLabel[method] || method;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const hash = url.searchParams.get("hash") || url.pathname.split("/").pop();

  if (!hash || hash === "receipt-view") {
    return new Response("Hash não informado.", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const [{ data: rec }, { data: org }] = await Promise.all([
    supabase
      .from("caixa_transacoes")
      .select("receipt_number, donor_name, amount, payment_method, cartao_tipo, status, created_at")
      .eq("validation_hash", hash)
      .maybeSingle(),
    supabase.from("white_label_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const orgName = org?.system_name || "FAP Pulse";
  const orgCnpj = org?.cnpj || "";
  const orgAddress = org?.address || "";
  const orgLogo = org?.logo_url || "";
  const primaryColor = org?.primary_color || "#0066CC";

  const isValid = rec && (rec.status === "confirmado" || rec.status === "pago");
  const isPending = rec && rec.status === "pendente";

  let statusBlock = "";
  if (isValid) {
    statusBlock = `
      <div class="status valid">
        <span class="status-icon">✅</span>
        <div>
          <p class="status-title" style="color:#15803d">Recibo Válido</p>
          <p class="status-sub">Este recibo é autêntico e foi emitido por ${orgName}</p>
        </div>
      </div>
      <div class="details">
        <div class="row"><span>Nº do Recibo</span><strong>${rec!.receipt_number}</strong></div>
        <div class="row"><span>Doador</span><span>${rec!.donor_name}</span></div>
        <div class="row"><span>Valor</span><strong>${formatCurrency(Number(rec!.amount))}</strong></div>
        <div class="row"><span>Modalidade</span><span>${getPaymentLabel(rec!.payment_method, rec!.cartao_tipo)}</span></div>
        <div class="row"><span>Data</span><span>${formatDate(rec!.created_at)}</span></div>
        <div class="row"><span>Status</span><strong style="color:#15803d">✅ Confirmado</strong></div>
      </div>`;
  } else if (isPending) {
    statusBlock = `
      <div class="status pending">
        <span class="status-icon">⏳</span>
        <div>
          <p class="status-title" style="color:#b45309">Recibo Pendente</p>
          <p class="status-sub">Este recibo ainda aguarda confirmação de pagamento.</p>
        </div>
      </div>`;
  } else {
    statusBlock = `
      <div class="status invalid">
        <span class="status-icon">❌</span>
        <div>
          <p class="status-title" style="color:#b91c1c">Recibo Inválido</p>
          <p class="status-sub">Este recibo não foi encontrado ou é inválido.</p>
        </div>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Recibo de Doação — ${orgName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,.12); max-width: 420px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc); padding: 32px 24px; text-align: center; color: #fff; }
    .header img { height: 48px; object-fit: contain; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; }
    .header .heart { font-size: 36px; margin-bottom: 8px; }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header p { font-size: 12px; opacity: .7; margin-top: 4px; }
    .body { padding: 28px 24px; }
    .status { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
    .status-icon { font-size: 28px; line-height: 1; }
    .status-title { font-size: 18px; font-weight: 700; }
    .status-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .details { background: #f8fafc; border-radius: 16px; padding: 18px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .row span:first-child { color: #64748b; }
    .row span, .row strong { color: #1e293b; }
    .footer { padding: 16px 24px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${orgLogo ? `<img src="${orgLogo}" alt="Logo"/>` : '<div class="heart">❤️</div>'}
      <h1>${orgName}</h1>
      ${orgCnpj ? `<p>CNPJ: ${orgCnpj}</p>` : ""}
    </div>
    <div class="body">
      ${statusBlock}
    </div>
    <div class="footer">
      ${orgAddress ? `<p>${orgAddress}</p>` : ""}
      <p style="margin-top:4px">Validação antifraude • ${orgName}</p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
