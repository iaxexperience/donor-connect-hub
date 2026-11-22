import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";

export type DonorType = "lead" | "unico" | "esporadico" | "recorrente" | "desativado";

export interface Donation {
  id: string;
  donor_id: number;
  amount: number;
  donation_date: string;
  campaign_id?: string;
}

export interface Donor {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp_opt_in?: boolean;
  type: DonorType;
  total_donated: number;
  last_donation_date: string | null;
  donation_count: number;
  document_id?: string;
  birth_date?: string;
  zip_code?: string;
  address?: string;
  address_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  assigned_operator_id?: string | null;
}

export interface FollowUp {
  id: number;
  donor_id: number;
  due_date: string;
  status: "pendente" | "agendado" | "enviado";
  note?: string;
}

export const typeLabel: Record<DonorType, string> = { 
  lead: "Lead",
  unico: "Único", 
  esporadico: "Esporádico", 
  recorrente: "Recorrente",
  desativado: "Desativado"
};

export const typeBadgeStyle = (type: string) => {
  switch (type) {
    case "lead": return "bg-purple-100 text-purple-700 border-purple-200";
    case "recorrente": return "bg-green-100 text-green-700 border-green-200";
    case "esporadico": return "bg-orange-100 text-orange-700 border-orange-200";
    case "unico": return "bg-blue-100 text-blue-700 border-blue-200";
    case "desativado": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-gray-100 text-gray-700";
  }
};

/**
 * Fetches all donors from Supabase using pagination to bypass the 1000-row default limit.
 */
export const getDonors = async (): Promise<Donor[]> => {
  // O Supabase devolve no máximo 1000 linhas por vez. Em vez de buscar as páginas
  // uma depois da outra, conta o total e busca todas as páginas ao mesmo tempo.
  const PAGE_SIZE = 1000;
  const { count, error: countError } = await supabase
    .from('donors')
    .select('id', { count: 'exact', head: true });
  if (countError) {
    console.error('Error counting donors:', countError);
    throw countError;
  }

  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      supabase
        .from('donors')
        .select('*')
        .order('name', { ascending: true })
        .order('id', { ascending: true }) // desempate estável entre páginas
        .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1),
    ),
  );

  const all: any[] = [];
  for (const { data, error } of results) {
    if (error) {
      console.error('Error fetching donors:', error);
      throw error;
    }
    all.push(...(data ?? []));
  }

  // Se alguém cadastrou doadores entre a contagem e a busca, pega o restante.
  if (all.length === pages * PAGE_SIZE) {
    let from = all.length;
    while (true) {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      all.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return all.map(d => ({
    ...d,
    name: d.name || "Doador sem Nome",
    email: d.email || "sem@email.com",
    total_donated: d.total_donated || 0,
    donation_count: d.donation_count || 0,
    last_donation_date: d.last_donation_date
  })) as Donor[];
};

/**
 * Fetches a single donor with their donations.
 */
export const getDonorDetails = async (donorId: number) => {
  const { data, error } = await supabase
    .from('donors')
    .select('*, donations(*)')
    .eq('id', donorId)
    .single();

  if (error) {
    console.error('Error fetching donor details:', error);
    throw error;
  }

  return data;
};

/**
 * Registers a new donation. 
 * The SQL Trigger tr_after_donation_inserted will handle:
 * - Updating donor total_donated and donation_count
 * - Recalculating donor type
 * - Scheduling next follow-up
 */
/**
 * Registers a new donation. 
 * Includes manual fallback to update donor stats in case SQL triggers are not active.
 */
export const registerDonation = async (
  donorId: number,
  amount: number,
  campaignId?: string,
  paymentMethod: string = "Manual"
) => {
  // 1. Insert the donation
  // The database trigger 'tr_after_donation_inserted' will automatically 
  // update donor totals and classification.
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .insert([{
      donor_id: donorId,
      amount,
      campaign_id: campaignId,
      status: 'pago',
      payment_method: paymentMethod,
      donation_date: new Date().toISOString()
    }])
    .select()
    .single();

  if (donationError) {
    console.error('Error registering donation:', donationError);
    throw donationError;
  }

  // 2. Fallback / Manually update Campaign Total
  if (campaignId && campaignId !== "Doação Geral") {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('current_amount')
      .eq('id', campaignId)
      .single();
      
    if (campaign) {
      await supabase
        .from('campaigns')
        .update({ current_amount: (campaign.current_amount || 0) + amount })
        .eq('id', campaignId);
    }
  }

  return donation;
};



/**
 * Fetches upcoming follow-ups.
 */
export const getFollowUps = async () => {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*, donors(name)')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching follow-ups:', error);
    throw error;
  }

  return data;
};

/**
 * Updates a donor's type/classification.
 */
export const updateDonorType = async (donorId: number, newType: DonorType) => {
  const { data, error } = await supabase
    .from('donors')
    .update({ type: newType })
    .eq('id', donorId)
    .select()
    .single();

  if (error) {
    console.error('Error updating donor type:', error);
    throw error;
  }

  return data;
};
/**
 * Updates an entire donor record.
 */
export const updateDonor = async (donorId: number, updateData: Partial<Donor>) => {
  const { data, error } = await supabase
    .from('donors')
    .update(updateData)
    .eq('id', donorId)
    .select();

  if (error) {
    console.error('Error updating donor:', error);
    throw error;
  }

  return data?.[0];
};

/**
 * Fetches donors who need telemarketing contact.
 *
 * Regra de prontidão: usa a MESMA configuração por tipo da automação de
 * follow-up (`follow_up_settings.rules`: recorrente/esporádico/único têm
 * cadências diferentes), em vez de um número fixo de dias para todos.
 *
 * Escopo: quando `operatorId` é informado, a fila é restrita à carteira
 * desse operador (`donors.assigned_operator_id`) — cada telemarketing só
 * trabalha os próprios doadores. Doadores já contatados hoje (qualquer
 * tentativa registrada em `telemarketing_calls`) saem da lista do dia,
 * o que faz a lista "repor" automaticamente o próximo pronto da carteira
 * assim que o operador avança.
 */
// Prazo para o doador voltar à fila, contado da última doação.
export const CONTACT_INTERVAL_DAYS: Record<string, number> = {
  recorrente: 30,
  esporadico: 60,
  unico: 90,
};

const normalizeDonor = (d: any): Donor => ({
  ...d,
  name: d.name || "Doador sem Nome",
  email: d.email || "sem@email.com",
  total_donated: d.total_donated || 0,
  donation_count: d.donation_count || 0,
});

/**
 * Fila do telemarketing (por carteira). Regra em
 * supabase/migrations/20261122_telemarketing_queue.sql:
 *  - recorrente volta 30 dias após a última doação, esporádico 60, único 90;
 *    leads e quem nunca doou aparecem sempre; desativados nunca;
 *  - quem já recebeu ligação hoje sai da fila do dia;
 *  - quem foi contatado no ciclo e não doou vai para o final da fila.
 */
export const getTelemarketingQueue = async (operatorId?: string | null): Promise<Donor[]> => {
  const { data, error } = await (supabase as any).rpc('telemarketing_queue', { p_operator: operatorId ?? null });
  if (!error) return ((data || []) as any[]).map(normalizeDonor);

  // A função do banco ainda não existe (SQL não rodado): mesma regra no navegador.
  console.warn('[telemarketing] usando fila local:', error.message);
  return getTelemarketingQueueLocal(operatorId);
};

const spDay = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(value));

const getTelemarketingQueueLocal = async (operatorId?: string | null): Promise<Donor[]> => {
  let donors = await getDonors();
  if (operatorId) donors = donors.filter(d => d.assigned_operator_id === operatorId);

  // Última ligação de cada doador (paginado: o Supabase devolve até 1000 por vez).
  const lastCall = new Map<number, string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('telemarketing_calls')
      .select('donor_id, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    for (const c of (data || []) as any[]) {
      if (!lastCall.has(c.donor_id)) lastCall.set(c.donor_id, c.created_at);
    }
    if (!data || data.length < 1000) break;
  }

  const today = spDay(new Date());
  const rows = donors
    .filter(d => d.type !== 'desativado')
    .map(d => {
      let dueDay: string | null = null;
      if (d.type !== 'lead' && d.last_donation_date) {
        const due = new Date(String(d.last_donation_date).slice(0, 10) + "T12:00:00");
        due.setDate(due.getDate() + (CONTACT_INTERVAL_DAYS[d.type] ?? 0));
        dueDay = due.toISOString().slice(0, 10);
      }
      const call = lastCall.get(d.id) ?? null;
      const callDay = call ? spDay(call) : null;
      const calledInCycle = call && (!dueDay || callDay! >= dueDay) ? call : null;
      return { d, dueDay, callDay, calledInCycle };
    })
    .filter(r => (!r.dueDay || r.dueDay <= today) && (!r.callDay || r.callDay < today));

  rows.sort((a, b) => {
    if (!a.calledInCycle !== !b.calledInCycle) return a.calledInCycle ? 1 : -1; // contatados vão para o fim
    if (a.calledInCycle && b.calledInCycle && a.calledInCycle !== b.calledInCycle) {
      return a.calledInCycle < b.calledInCycle ? -1 : 1;
    }
    if (a.dueDay !== b.dueDay) {
      if (!a.dueDay) return 1;
      if (!b.dueDay) return -1;
      return a.dueDay < b.dueDay ? -1 : 1;
    }
    return a.d.id - b.d.id;
  });

  return rows.map(r => r.d);
};
