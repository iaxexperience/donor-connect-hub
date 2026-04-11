import { useEffect } from "react";
import { useDonors } from "@/hooks/useDonors";
import { handleAsaasDonation, generateMockAsaasEvent } from "@/lib/asaasIntegrationService";
import { toast } from "sonner";

export const AsaasAutomationWorker = () => {
  const { donors, registerNewDonor, addDonation } = useDonors();

  useEffect(() => {
    const isEnabled = localStorage.getItem("asaas_automation_enabled") !== "false";
    if (!isEnabled) return;

    console.log("Asaas Automation Worker Started (Simulated)");

    const findDonorByEmailOrPhone = (email?: string, phone?: string) => {
      return donors.find(d => 
        (email && d.email === email) || (phone && d.phone === phone)
      );
    };

    const interval = setInterval(async () => {
      if (Math.random() < 0.05) {
        console.log("Simulating Inbound Asaas Donation...");
        const mockEvent = generateMockAsaasEvent();
        
        await handleAsaasDonation(
          mockEvent,
          findDonorByEmailOrPhone,
          (name, email, phone) => registerNewDonor({ name, email, phone }) as any,
          addDonation
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [donors, registerNewDonor, addDonation]);

  return null; // This is a background worker
};
