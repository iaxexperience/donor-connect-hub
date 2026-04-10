import { addDays, isAfter, subMonths } from "date-fns";

export type DonorType = "unico" | "esporadico" | "recorrente";

export interface Donation {
  id: string;
  donorId: number;
  amount: number;
  date: Date;
  campaign: string;
}

export interface Donor {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: DonorType;
  totalDonated: number;
  lastDonationDate: Date;
  donationCount: number;
  donations: Donation[];
}

export interface FollowUp {
  id: number;
  donorId: number;
  donorName: string;
  dueDate: Date;
  status: "pendente" | "agendado" | "enviado";
  classification: DonorType;
}

const CLASSIFICATION_RULES = {
  unico: { days: 90, label: "Único" },
  esporadico: { days: 60, label: "Esporádico" },
  recorrente: { days: 30, label: "Recorrente" },
};

export const typeLabel: Record<DonorType, string> = { 
  unico: "Único", 
  esporadico: "Esporádico", 
  recorrente: "Recorrente" 
};

/**
 * Classifies a donor based on their donation history.
 * - Recorrente: 3+ donations in the last 3 months.
 * - Esporádico: 2+ donations in the last 6 months.
 * - Único: 1 donation total.
 */
export const classifyDonor = (donations: Donation[]): DonorType => {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const sixMonthsAgo = subMonths(now, 6);

  const donationsLast3Months = donations.filter(d => isAfter(new Date(d.date), threeMonthsAgo)).length;
  const donationsLast6Months = donations.filter(d => isAfter(new Date(d.date), sixMonthsAgo)).length;

  if (donationsLast3Months >= 3) return "recorrente";
  if (donationsLast6Months >= 2) return "esporadico";
  return "unico";
};

/**
 * Calculates the next follow-up date based on donor type and last donation.
 */
export const calculateNextFollowUpDate = (lastDonationDate: Date, type: DonorType): Date => {
  const days = CLASSIFICATION_RULES[type].days;
  return addDays(lastDonationDate, days);
};

/**
 * Core function to handle a new donation and automate classification/follow-up.
 */
export const processNewDonation = (
  donor: Donor,
  amount: number,
  campaign: string
): { updatedDonor: Donor; nextFollowUp: Date } => {
  const newDonation: Donation = {
    id: Math.random().toString(36).substr(2, 9),
    donorId: donor.id,
    amount,
    date: new Date(),
    campaign,
  };

  const updatedDonations = [...donor.donations, newDonation];
  const newType = classifyDonor(updatedDonations);
  const newTotal = donor.totalDonated + amount;
  const newLastDate = newDonation.date;

  const updatedDonor: Donor = {
    ...donor,
    donations: updatedDonations,
    type: newType,
    totalDonated: newTotal,
    lastDonationDate: newLastDate,
    donationCount: updatedDonations.length,
  };

  const nextFollowUp = calculateNextFollowUpDate(newLastDate, newType);

  return { updatedDonor, nextFollowUp };
};
