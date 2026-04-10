import { useState, useEffect, useCallback } from "react";
import { Donor, processNewDonation, DonorType } from "@/lib/donationService";

const INITIAL_DONORS: Donor[] = [
  { id: 1, name: "Maria Silva", email: "maria@email.com", phone: "5511999990001", type: "recorrente", totalDonated: 4500.00, lastDonationDate: new Date("2026-04-02"), donationCount: 12, donations: [] },
  { id: 2, name: "João Santos", email: "joao@email.com", phone: "5521988880002", type: "esporadico", totalDonated: 1200.00, lastDonationDate: new Date("2026-03-15"), donationCount: 3, donations: [] },
  { id: 3, name: "Ana Oliveira", email: "ana@email.com", phone: "5531977770003", type: "unico", totalDonated: 300.00, lastDonationDate: new Date("2026-01-10"), donationCount: 1, donations: [] },
  { id: 4, name: "Carlos Souza", email: "carlos@email.com", phone: "5541966660004", type: "recorrente", totalDonated: 8900.00, lastDonationDate: new Date("2026-04-05"), donationCount: 15, donations: [] },
  { id: 5, name: "Beatriz Lima", email: "beatriz@email.com", phone: "5551955550005", type: "esporadico", totalDonated: 750.00, lastDonationDate: new Date("2026-02-28"), donationCount: 2, donations: [] },
];

export const useDonors = () => {
  const [donors, setDonors] = useState<Donor[]>(() => {
    const saved = localStorage.getItem("doacflow_donors");
    if (!saved) return INITIAL_DONORS;
    try {
      return JSON.parse(saved).map((d: any) => ({
        ...d,
        lastDonationDate: new Date(d.lastDonationDate)
      }));
    } catch (e) {
      return INITIAL_DONORS;
    }
  });

  useEffect(() => {
    localStorage.setItem("doacflow_donors", JSON.stringify(donors));
  }, [donors]);

  const addDonation = useCallback((donorId: number, amount: number, campaign: string) => {
    setDonors(prev => {
      const index = prev.findIndex(d => d.id === donorId);
      if (index === -1) return prev;

      const { updatedDonor, nextFollowUp } = processNewDonation(prev[index], amount, campaign);
      const newState = [...prev];
      newState[index] = updatedDonor;

      // Update follow-ups in localStorage
      const followUps = JSON.parse(localStorage.getItem("doacflow_followups") || "[]");
      followUps.push({
        id: Date.now(),
        donorId: updatedDonor.id,
        donorName: updatedDonor.name,
        phone: updatedDonor.phone,
        classification: updatedDonor.type,
        dueDate: nextFollowUp,
        status: "pendente",
        campaign: campaign
      });
      localStorage.setItem("doacflow_followups", JSON.stringify(followUps));

      return newState;
    });
  }, []);

  const registerNewDonor = useCallback((name: string, email: string, phone: string) => {
    const newDonor: Donor = {
      id: Math.floor(Math.random() * 1000000),
      name,
      email,
      phone: phone.replace(/\D/g, ""),
      type: "unico",
      totalDonated: 0,
      lastDonationDate: new Date(),
      donationCount: 0,
      donations: []
    };

    setDonors(prev => [...prev, newDonor]);
    return newDonor;
  }, []);

  const findDonorByEmailOrPhone = useCallback((email?: string, phone?: string) => {
    return donors.find(d => 
      (email && d.email.toLowerCase() === email.toLowerCase()) || 
      (phone && d.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))
    );
  }, [donors]);

  return {
    donors,
    addDonation,
    registerNewDonor,
    findDonorByEmailOrPhone,
  };
};
