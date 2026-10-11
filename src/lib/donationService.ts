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
  const PAGE_SIZE = 1000;
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching donors:', error);
      throw error;
    }

    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
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
export const getTelemarketingQueue = async (operatorId?: string | null): Promise<Donor[]> => {
  let donors = await getDonors();
  if (operatorId) {
    donors = donors.filter(d => d.assigned_operator_id === operatorId);
  }

  const { data: settings } = await supabase
    .from('follow_up_settings')
    .select('rules')
    .eq('id', 1)
    .maybeSingle();
  const rules = ((settings?.rules as any[]) || []) as { type: string; followUpDays: number }[];
  const daysByType: Record<string, number> = {};
  for (const r of rules) daysByType[r.type] = r.followUpDays;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { data: callsToday } = await supabase
    .from('telemarketing_calls')
    .select('donor_id')
    .gte('created_at', startOfToday.toISOString());
  const contactedTodayIds = new Set((callsToday || []).map((c: any) => c.donor_id));

  const ready = donors.filter(donor => {
    if (contactedTodayIds.has(donor.id)) return false;
    if (donor.type === 'lead') return true;
    if (!donor.last_donation_date) return true;
    const limitDays = daysByType[donor.type] ?? 30;
    const daysSince = (Date.now() - new Date(donor.last_donation_date).getTime()) / 86400000;
    return daysSince >= limitDays;
  });

  // Mais atrasados (ou nunca contatados) primeiro.
  ready.sort((a, b) => {
    const dateA = a.last_donation_date ? new Date(a.last_donation_date).getTime() : 0;
    const dateB = b.last_donation_date ? new Date(b.last_donation_date).getTime() : 0;
    return dateA - dateB;
  });

  return ready;
};
