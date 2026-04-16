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
    description: "Busca doadores do banco de dados. Pode filtrar por tipo, nome, status ou retornar todos.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["recorrente", "esporadico", "unico", "todos"], description: "Tipo do doador" },
        search: { type: "string", description: "Busca por nome ou email (opcional)" },
        limit: { type: "number", description: "Número máximo de resultados (padrão: 20)" },
      },
    },
  },
  {
    name: "get_donations",
    description: "Busca doações do banco de dados. Pode filtrar por status, período ou doador.",
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
    name: "get_stats",
    description: "Retorna estatísticas gerais do sistema: total arrecadado, número de doadores ativos, ticket médio, crescimento mensal.",
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

async function executeTool(name: string, input: any, supabase: any): Promise<string> {
  try {
    switch (name) {
      case "get_donors": {
        let query = supabase
          .from("donors")
          .select("id, name, email, phone, type, last_donation_date, total_donated, donation_count")
          .order("total_donated", { ascending: false })
          .limit(input.limit ?? 20);

        if (input.type && input.type !== "todos") {
          query = query.eq("type", input.type);
        }
        if (input.search) {
          query = query.or(`name.ilike.%${input.search}%,email.ilike.%${input.search}%`);
        }

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

      case "get_stats": {
        const days = input.period_days ?? 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

        const [donorsRes, donationsRes, prevDonationsRes] = await Promise.all([
          supabase.from("donors").select("id, type, last_donation_date").not("type", "is", null),
          supabase.from("donations").select("amount, status").eq("status", "pago").gte("confirmed_at", since),
          supabase.from("donations").select("amount").eq("status", "pago").gte("confirmed_at", prevSince).lt("confirmed_at", since),
        ]);

        const donors = donorsRes.data ?? [];
        const donations = donationsRes.data ?? [];
        const prevDonations = prevDonationsRes.data ?? [];

        const totalRaised = donations.reduce((s: number, d: any) => s + d.amount, 0);
        const prevRaised = prevDonations.reduce((s: number, d: any) => s + d.amount, 0);
        const growth = prevRaised > 0 ? ((totalRaised - prevRaised) / prevRaised) * 100 : 0;
        const avgTicket = donations.length > 0 ? totalRaised / donations.length : 0;

        const byType = donors.reduce((acc: any, d: any) => {
          acc[d.type] = (acc[d.type] ?? 0) + 1;
          return acc;
        }, {});

        return JSON.stringify({
          period_days: days,
          total_raised: totalRaised,
          total_donors: donors.length,
          donations_count: donations.length,
          average_ticket: avgTicket,
          growth_percent: growth,
          donors_by_type: byType,
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
        const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
        const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

        if (!phoneNumberId || !accessToken) {
          return "Erro: credenciais WhatsApp não configuradas (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN).";
        }

        const phone = input.phone.replace(/\D/g, "");
        const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: input.message },
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          return `Erro ao enviar WhatsApp: ${data.error?.message ?? res.statusText}`;
        }

        // Log the message
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
        // First get donor info
        const { data: donor } = await supabase
          .from("donors")
          .select("id, name, email, phone, asaas_customer_id")
          .eq("id", input.donor_id)
          .single();

        if (!donor) return `Doador ID ${input.donor_id} não encontrado.`;

        // Get or create Asaas customer
        let customerId = donor.asaas_customer_id;
        if (!customerId) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          const custRes = await fetch(`${supabaseUrl}/functions/v1/asaas-create-customer`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ donor_id: donor.id, name: donor.name, email: donor.email ?? "", phone: donor.phone ?? "" }),
          });
          const custData = await custRes.json();
          customerId = custData?.customer_id ?? null;
        }

        if (!customerId) return `Não foi possível criar/obter cliente Asaas para ${donor.name}.`;

        // Create PIX payment via edge function
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];

        const payRes = await fetch(`${supabaseUrl}/functions/v1/asaas-create-payment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            donor_id: donor.id,
            customer: customerId,
            billingType: "PIX",
            value: input.amount,
            dueDate,
            description: input.description ?? `Doação — ${donor.name}`,
          }),
        });

        const payData = await payRes.json();
        if (!payRes.ok || payData.error) {
          return `Erro ao criar PIX: ${payData.error ?? payRes.statusText}`;
        }

        const pixPayload = payData?.pixQrCode?.payload ?? null;
        return JSON.stringify({
          success: true,
          donor: donor.name,
          amount: input.amount,
          payment_id: payData?.payment?.id,
          pix_copia_cola: pixPayload ?? "PIX criado mas código copia-e-cola indisponível",
        });
      }

      case "create_followup": {
        const { data, error } = await supabase
          .from("follow_ups")
          .insert([{
            donor_id: input.donor_id,
            due_date: input.due_date,
            status: "pendente",
            note: input.note ?? "Agendado pela IA",
          }])
          .select()
          .single();

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
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  try {
    const { messages: userMessages } = await req.json();
    if (!userMessages || !Array.isArray(userMessages)) {
      throw new Error("Campo 'messages' é obrigatório e deve ser um array.");
    }

    const systemPrompt = `Você é o Agente IA do DonorConnect, um sistema de gestão de doações.
Você tem acesso a ferramentas para consultar doadores, doações, estatísticas, follow-ups,
enviar mensagens WhatsApp e criar cobranças PIX.

Responda sempre em português brasileiro. Seja objetivo e prestativo.
Quando o usuário pedir para fazer algo (enviar mensagem, criar PIX, agendar follow-up),
execute a ação usando as ferramentas disponíveis sem pedir confirmação extra — apenas informe o resultado.

Hoje é ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`;

    // Agentic loop
    const messages: Anthropic.MessageParam[] = userMessages;
    let finalText = "";
    let iterations = 0;
    const MAX_ITER = 10;

    while (iterations < MAX_ITER) {
      iterations++;

      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system: systemPrompt,
        tools,
        messages,
      });

      // Collect text from this response
      const textBlocks = response.content.filter((b) => b.type === "text").map((b: any) => b.text);
      if (textBlocks.length > 0) finalText = textBlocks.join("\n");

      // If Claude is done, break
      if (response.stop_reason === "end_turn") break;

      // If there are tool uses, execute them
      if (response.stop_reason === "tool_use") {
        // Push Claude's response to messages
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "tool_use") {
            console.log(`[AI Agent] Executando ferramenta: ${block.name}`, JSON.stringify(block.input));
            const result = await executeTool(block.name, block.input, supabase);
            console.log(`[AI Agent] Resultado de ${block.name}:`, result.substring(0, 200));
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
