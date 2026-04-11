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
 * Fetches all donors from Supabase.
 */
export const getDonors = async (): Promise<Donor[]> => {
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching donors:', error);
    throw error;
  }

  return data.map(d => ({
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
export const registerDonation = async (
  donorId: number,
  amount: number,
  campaignId?: string
) => {
  const { data, error } = await supabase
    .from('donations')
    .insert([{
      donor_id: donorId,
      amount,
      campaign_id: campaignId,
      status: 'pago'
    }])
    .select()
    .single();

  if (error) {
    console.error('Error registering donation:', error);
    throw error;
  }

  return data;
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
 * Logic: 
 * - All leads
 * - Non-leads with last donation > 30 days ago
 */
export const getTelemarketingQueue = async (): Promise<Donor[]> => {
  const donors = await getDonors();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return donors.filter(donor => {
    // Leads are always in the queue
    if (donor.type === 'lead') return true;
    
    // Inactive donors (last donation > 30 days)
    if (donor.last_donation_date) {
      const lastDate = new Date(donor.last_donation_date);
      return lastDate < thirtyDaysAgo;
    }

    // No donation yet but not a lead (should not happen normally but just in case)
    return true;
  });
};
