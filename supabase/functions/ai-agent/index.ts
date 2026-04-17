import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tool definitions ────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "get_donors",
    description: "Busca doadores cadastrados. Pode filtrar por tipo, nome, status ou retornar todos.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["recorrente", "esporadico", "unico", "todos"], description: "Tipo do doador" },
        search: { type: "string", description: "Busca por nome ou email" },
        limit: { type: "number", description: "Número máximo de resultados (padrão: 20)" },
      },
    },
  },
  {
    name: "get_donations",
    description: "Busca doações do banco de dados (tabela donations — integração Asaas). Pode filtrar por status, período ou doador.",
    input_schema: {
      type: "object",
      properties: {
        donor_id: { type: "number", description: "ID do doador (opcional)" },
        status: { type: "string", enum: ["pendente", "pago", "cancelado", "todos"], description: "Status da doação" },
        days_back: { type: "number", description: "Quantos dias atrás buscar (padrão: 30)" },
        limit: { type: "number", description: "Número máximo de resultados (padrão: 20)" },
      },
    },
  },
  {
    name: "get_caixa",
    description: "Busca transações do caixa de doações presenciais (dinheiro, pix, cartão, boleto). Use para consultar arrecadação do dia, semana ou mês no caixa físico.",
    input_schema: {
      type: "object",
      properties: {
        days_back: { type: "number", description: "Quantos dias atrás buscar (padrão: 30)" },
        payment_method: { type: "string", enum: ["dinheiro", "pix", "cartao", "boleto", "todos"], description: "Filtrar por modalidade" },
        status: { type: "string", enum: ["confirmado", "pendente", "cancelado", "todos"], description: "Status da transação" },
        limit: { type: "number", description: "Número máximo de resultados (padrão: 30)" },
      },
    },
  },
  {
    name: "get_doacoes_fisicas",
    description: "Busca doações físicas registradas (cabelo, alimentos, remédios, veículos, imóveis, etc.).",
    input_schema: {
      type: "object",
      properties: {
        tipo_doacao: { type: "string", description: "Tipo da doação física (cabelo, alimentos, remedios, veiculo, etc.)" },
        status: { type: "string", enum: ["pendente", "recebido", "cancelado", "todos"], description: "Status da doação física" },
        days_back: { type: "number", description: "Quantos dias atrás buscar (padrão: 30)" },
        limit: { type: "number", description: "Número máximo de resultados (padrão: 20)" },
      },
    },
  },
  {
    name: "get_stats",
    description: "Retorna estatísticas gerais do sistema: total arrecadado no caixa, doadores ativos, ticket médio, crescimento mensal e resumo de doações físicas.",
    input_schema: {
      type: "object",
      properties: {
        period_days: { type: "number", description: "Período em dias para calcular as estatísticas (padrão: 30)" },
      },
    },
  },
  {
    name: "get_followups",
    description: "Lista os follow-ups agendados ou realizados.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pendente", "concluido", "cancelado", "todos"], description: "Status do follow-up" },
        limit: { type: "number", description: "Número máximo de resultados (padrão: 20)" },
      },
    },
  },
  {
    name: "send_whatsapp_message",
    description: "Envia uma mensagem WhatsApp (texto simples) para um doador pelo número de telefone.",
    input_schema: {
      type: "object",
      required: ["phone", "message"],
      properties: {
        phone: { type: "string", description: "Número de telefone do doador (com DDI, ex: 5511999999999)" },
        message: { type: "string", description: "Texto da mensagem a enviar" },
        donor_name: { type: "string", description: "Nome do doador (para log)" },
      },
    },
  },
  {
    name: "create_pix_for_donor",
    description: "Gera um pagamento PIX para um doador via Asaas e retorna o código copia-e-cola.",
    input_schema: {
      type: "object",
      required: ["donor_id", "amount"],
      properties: {
        donor_id: { type: "number", description: "ID do doador" },
        amount: { type: "number", description: "Valor em reais" },
        description: { type: "string", description: "Descrição do pagamento" },
      },
    },
  },
  {
    name: "create_followup",
    description: "Agenda um follow-up para um doador.",
    input_schema: {
      type: "object",
      required: ["donor_id", "due_date"],
      properties: {
        donor_id: { type: "number", description: "ID do doador" },
        due_date: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
        note: { type: "string", description: "Nota ou observação sobre o follow-up" },
      },
    },
  },
];

// ─── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, input: any, supabase: any, metaConfig?: any): Promise<string> {
  try {
    switch (name) {

      case "get_donors": {
        let query = supabase
          .from("donors")
          .select("id, name, email, phone, type, last_donation_date, total_donated, donation_count")
          .order("total_donated", { ascending: false })
          .limit(input.limit ?? 20);
        if (input.type && input.type !== "todos") query = query.eq("type", input.type);
        if (input.search) query = query.or(`name.ilike.%${input.search}%,email.ilike.%${input.search}%`);
        const { data, error } = await query;
        if (error) return `Erro ao buscar doadores: ${error.message}`;
        return JSON.stringify({ total: data?.length ?? 0, donors: data ?? [] });
      }

      case "get_donations": {
        const daysBack = input.days_back ?? 30;
        const since = new Date(Date.now() - daysBack * 86400000).toISOString();
        let query = supabase
          .from("donations")
          .select("id, donor_id, amount, status, billing_type, due_date, confirmed_at, donors(name)")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(input.limit ?? 20);
        if (input.donor_id) query = query.eq("donor_id", input.donor_id);
        if (input.status && input.status !== "todos") query = query.eq("status", input.status);
        const { data, error } = await query;
        if (error) return `Erro ao buscar doações: ${error.message}`;
        const total = (data ?? []).reduce((sum: number, d: any) => sum + (d.status === "pago" ? d.amount : 0), 0);
        return JSON.stringify({ total_paid: total, count: data?.length ?? 0, donations: data ?? [] });
      }

      case "get_caixa": {
        const daysBack = input.days_back ?? 30;
        const since = new Date(Date.now() - daysBack * 86400000).toISOString();
        let query = supabase
          .from("caixa_transacoes")
          .select("id, donor_name, amount, payment_method, cartao_tipo, status, receipt_number, notes, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(input.limit ?? 30);
        if (input.payment_method && input.payment_method !== "todos") query = query.eq("payment_method", input.payment_method);
        if (input.status && input.status !== "todos") query = query.eq("status", input.status);
        const { data, error } = await query;
        if (error) return `Erro ao buscar caixa: ${error.message}`;
        const confirmadas = (data ?? []).filter((t: any) => t.status === "confirmado");
        const total = confirmadas.reduce((s: number, t: any) => s + Number(t.amount), 0);
        const porMetodo: Record<string, number> = {};
        for (const t of confirmadas) {
          const label = t.payment_method === "cartao" ? `cartao_${t.cartao_tipo ?? "geral"}` : t.payment_method;
          porMetodo[label] = (porMetodo[label] ?? 0) + Number(t.amount);
        }
        return JSON.stringify({ period_days: daysBack, total_confirmado: total, count: confirmadas.length, por_metodo: porMetodo, transacoes: data ?? [] });
      }

      case "get_doacoes_fisicas": {
        const daysBack = input.days_back ?? 30;
        const since = new Date(Date.now() - daysBack * 86400000).toISOString();
        let query = supabase
          .from("doacoes_fisicas")
          .select("id, donor_name, tipo_doacao, subtipo, descricao, quantidade, status, observacoes, created_at, recebido_em")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(input.limit ?? 20);
        if (input.tipo_doacao) query = query.eq("tipo_doacao", input.tipo_doacao);
        if (input.status && input.status !== "todos") query = query.eq("status", input.status);
        const { data, error } = await query;
        if (error) return `Erro ao buscar doações físicas: ${error.message}`;
        const porTipo: Record<string, number> = {};
        for (const d of data ?? []) porTipo[d.tipo_doacao] = (porTipo[d.tipo_doacao] ?? 0) + 1;
        return JSON.stringify({ period_days: daysBack, total: data?.length ?? 0, por_tipo: porTipo, doacoes: data ?? [] });
      }

      case "get_stats": {
        const days = input.period_days ?? 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

        const [donorsRes, caixaRes, prevCaixaRes, fisicasRes] = await Promise.all([
          supabase.from("donors").select("id, type").not("type", "is", null),
          supabase.from("caixa_transacoes").select("amount, payment_method").eq("status", "confirmado").gte("created_at", since),
          supabase.from("caixa_transacoes").select("amount").eq("status", "confirmado").gte("created_at", prevSince).lt("created_at", since),
          supabase.from("doacoes_fisicas").select("tipo_doacao, status").gte("created_at", since),
        ]);

        const donors = donorsRes.data ?? [];
        const caixa = caixaRes.data ?? [];
        const prevCaixa = prevCaixaRes.data ?? [];
        const fisicas = fisicasRes.data ?? [];

        const totalRaised = caixa.reduce((s: number, t: any) => s + Number(t.amount), 0);
        const prevRaised = prevCaixa.reduce((s: number, t: any) => s + Number(t.amount), 0);
        const growth = prevRaised > 0 ? ((totalRaised - prevRaised) / prevRaised) * 100 : 0;
        const avgTicket = caixa.length > 0 ? totalRaised / caixa.length : 0;
        const byType = donors.reduce((acc: any, d: any) => { acc[d.type] = (acc[d.type] ?? 0) + 1; return acc; }, {});
        const caixaByMethod = caixa.reduce((acc: any, t: any) => { acc[t.payment_method] = (acc[t.payment_method] ?? 0) + Number(t.amount); return acc; }, {});
        const fisicasByTipo = fisicas.reduce((acc: any, d: any) => { acc[d.tipo_doacao] = (acc[d.tipo_doacao] ?? 0) + 1; return acc; }, {});

        return JSON.stringify({
          period_days: days,
          caixa_total: totalRaised,
          caixa_count: caixa.length,
          caixa_por_metodo: caixaByMethod,
          average_ticket: avgTicket,
          growth_percent: growth,
          total_donors: donors.length,
          donors_by_type: byType,
          doacoes_fisicas_count: fisicas.length,
          doacoes_fisicas_por_tipo: fisicasByTipo,
        });
      }

      case "get_followups": {
        let query = supabase
          .from("follow_ups")
          .select("id, donor_id, due_date, status, note, donors(name, phone)")
          .order("due_date", { ascending: true })
          .limit(input.limit ?? 20);
        if (input.status && input.status !== "todos") query = query.eq("status", input.status);
        const { data, error } = await query;
        if (error) return `Erro ao buscar follow-ups: ${error.message}`;
        return JSON.stringify({ count: data?.length ?? 0, followups: data ?? [] });
      }

      case "send_whatsapp_message": {
        // Prioridade: config passada pelo frontend → env vars do Supabase
        const phoneNumberId = metaConfig?.phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        const accessToken   = metaConfig?.access_token   || Deno.env.get("WHATSAPP_ACCESS_TOKEN");

        if (!phoneNumberId || !accessToken) {
          return "Erro: credenciais WhatsApp não configuradas. Configure a integração no menu WhatsApp → aba API.";
        }

        const phone = input.phone.replace(/\D/g, "");
        const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: input.message } }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          return `Erro ao enviar WhatsApp: ${data.error?.message ?? res.statusText}`;
        }

        await supabase.from("whatsapp_messages").upsert([{
          telefone: phone,
          text_body: input.message,
          is_from_me: true,
          message_id: data.messages?.[0]?.id ?? `ai_${Date.now()}`,
          status: "sent",
        }], { onConflict: "message_id" }).catch(() => {});

        return `Mensagem enviada com sucesso para ${input.donor_name ?? phone}. ID: ${data.messages?.[0]?.id}`;
      }

      case "create_pix_for_donor": {
        const { data: donor } = await supabase
          .from("donors").select("id, name, email, phone, asaas_customer_id").eq("id", input.donor_id).single();
        if (!donor) return `Doador ID ${input.donor_id} não encontrado.`;

        let customerId = donor.asaas_customer_id;
        if (!customerId) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          const custRes = await fetch(`${supabaseUrl}/functions/v1/asaas-create-customer`, {
            method: "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ donor_id: donor.id, name: donor.name, email: donor.email ?? "", phone: donor.phone ?? "" }),
          });
          const custData = await custRes.json();
          customerId = custData?.customer_id ?? null;
        }
        if (!customerId) return `Não foi possível criar/obter cliente Asaas para ${donor.name}.`;

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
        const payRes = await fetch(`${supabaseUrl}/functions/v1/asaas-create-payment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ donor_id: donor.id, customer: customerId, billingType: "PIX", value: input.amount, dueDate, description: input.description ?? `Doação — ${donor.name}` }),
        });

        const payData = await payRes.json();
        if (!payRes.ok || payData.error) return `Erro ao criar PIX: ${payData.error ?? payRes.statusText}`;

        return JSON.stringify({
          success: true,
          donor: donor.name,
          amount: input.amount,
          payment_id: payData?.payment?.id,
          pix_copia_cola: payData?.pixQrCode?.payload ?? "PIX criado mas código copia-e-cola indisponível",
        });
      }

      case "create_followup": {
        const { data, error } = await supabase
          .from("follow_ups")
          .insert([{ donor_id: input.donor_id, due_date: input.due_date, status: "pendente", note: input.note ?? "Agendado pela IA" }])
          .select().single();
        if (error) return `Erro ao criar follow-up: ${error.message}`;
        return `Follow-up criado com sucesso para o doador ID ${input.donor_id} na data ${input.due_date}. ID: ${data.id}`;
      }

      default:
        return `Ferramenta desconhecida: ${name}`;
    }
  } catch (e: any) {
    return `Erro ao executar ${name}: ${e.message}`;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada nas secrets do Supabase." }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  try {
    const body = await req.json();
    const { messages: userMessages, meta_config: metaConfig } = body;

    if (!userMessages || !Array.isArray(userMessages)) {
      throw new Error("Campo 'messages' é obrigatório e deve ser um array.");
    }

    const systemPrompt = `Você é o Agente IA do FAP Pulse, sistema de gestão de doações.
Você tem acesso a ferramentas para:
- Consultar doadores, doações Asaas, caixa presencial e doações físicas
- Ver estatísticas completas do sistema
- Enviar mensagens WhatsApp para doadores
- Criar cobranças PIX via Asaas
- Agendar e listar follow-ups

Responda sempre em português brasileiro. Seja objetivo e prestativo.
Ao receber uma pergunta sobre arrecadação, use get_caixa ou get_stats para dados reais.
Quando solicitado a executar uma ação (enviar mensagem, criar PIX, agendar follow-up), execute imediatamente e informe o resultado.

Hoje é ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

    const messages: Anthropic.MessageParam[] = userMessages;
    let finalText = "";
    let iterations = 0;
    const MAX_ITER = 10;

    while (iterations < MAX_ITER) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      });

      const textBlocks = response.content.filter((b) => b.type === "text").map((b: any) => b.text);
      if (textBlocks.length > 0) finalText = textBlocks.join("\n");

      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            console.log(`[AI Agent] Tool: ${block.name}`, JSON.stringify(block.input));
            const result = await executeTool(block.name, block.input, supabase, metaConfig);
            console.log(`[AI Agent] Result: ${result.substring(0, 200)}`);
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      break;
    }

    return new Response(
      JSON.stringify({ reply: finalText, iterations }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[AI Agent] Erro:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
