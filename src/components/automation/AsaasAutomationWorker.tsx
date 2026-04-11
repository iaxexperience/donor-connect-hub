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
    
    // We removed the automatic interval simulation to avoid "phantom" donations.
    // Events can still be triggered manually from the Integrações page.

    return () => {};

  }, [donors, registerNewDonor, addDonation]);

  return null; // This is a background worker
};
