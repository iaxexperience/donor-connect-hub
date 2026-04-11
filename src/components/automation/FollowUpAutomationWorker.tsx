import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppThankYou } from "@/lib/whatsappService";
import { toast } from "sonner";

export const FollowUpAutomationWorker = () => {
  useEffect(() => {
    const processFollowUps = async () => {
      // Check if automation is globally enabled
      const isEnabled = localStorage.getItem("automation_global") === "true";
      if (!isEnabled) {
        console.log("Follow-up Automation is globally disabled.");
        return;
      }

      console.log("Running Follow-up Automation Check...");
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch pending follow-ups due today or earlier
      const { data: followUps, error } = await supabase
        .from('follow_ups')
        .select('*, donors(name, phone, last_donation_amount, last_donation_campaign)')
        .eq('status', 'pendente')
        .lte('due_date', today);

      if (error) {
        console.error("Error fetching follow-ups for automation:", error);
        return;
      }

      if (!followUps || followUps.length === 0) {
        console.log("No pending follow-ups for today.");
        return;
      }

      console.log(`Found ${followUps.length} follow-ups to process.`);

      for (const followUp of followUps) {
        const donor = followUp.donors;
        if (!donor || !donor.phone) {
          console.warn(`Donor missing phone for follow-up ${followUp.id}`);
          continue;
        }

        try {
          // Send the message (this uses our WhatsApp simulation service)
          await sendWhatsAppThankYou(
            donor.name, 
            donor.last_donation_amount || 0, 
            donor.phone, 
            donor.last_donation_campaign || "Follow-up"
          );

          // Update status in database
          await supabase
            .from('follow_ups')
            .update({ status: 'concluido', note: 'Enviado via automação real' })
            .eq('id', followUp.id);
            
          console.log(`Follow-up ${followUp.id} processed for ${donor.name}`);
        } catch (err) {
          console.error(`Failed to process follow-up ${followUp.id}:`, err);
        }
      }
    };

    // Initial check
    processFollowUps();

    // Check every 5 minutes
    const interval = setInterval(processFollowUps, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null; // Background worker
};
