import { useEffect } from "react";
import { useDonors } from "@/hooks/useDonors";
import { handleAsaasDonation, generateMockAsaasEvent } from "@/lib/asaasIntegrationService";
import { toast } from "sonner";

export const AsaasAutomationWorker = () => {
  const { findDonorByEmailOrPhone, registerNewDonor, addDonation } = useDonors();

  useEffect(() => {
    // Check if automation is enabled in localStorage
    const isEnabled = localStorage.getItem("asaas_automation_enabled") !== "false";
    
    if (!isEnabled) return;

    console.log("Asaas Automation Worker Started (Simulated)");

    const interval = setInterval(async () => {
      // 5% chance of a new donation every 30 seconds for simulation purposes
      if (Math.random() < 0.05) {
        console.log("Simulating Inbound Asaas Donation...");
        const mockEvent = generateMockAsaasEvent();
        
        await handleAsaasDonation(
          mockEvent,
          findDonorByEmailOrPhone,
          registerNewDonor,
          addDonation
        );
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [findDonorByEmailOrPhone, registerNewDonor, addDonation]);

  return null; // This is a background worker
};
