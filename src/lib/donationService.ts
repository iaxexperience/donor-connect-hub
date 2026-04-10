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
  totalDonated: number;
  lastDonationDate: Date;
  donation_count: number;
  cpf_cnpj?: string;
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
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    type: d.type,
    totalDonated: d.total_donated,
    lastDonationDate: new Date(d.last_donation_date),
    donation_count: d.donation_count
  })) as unknown as Donor[];
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
