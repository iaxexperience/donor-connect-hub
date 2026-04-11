import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AutomationLog {
  id: number;
  donor_id: number;
  donorName: string;
  donorType: string;
  channel: string;
  template: string;
  sentAt: string;
  status: "enviado" | "falha" | "aguardando";
  retry_count: number;
  error_message?: string;
}

export const useFollowUpLogs = () => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['followup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_up_logs')
        .select('*, donors(name, type)')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        donor_id: log.donor_id,
        donorName: log.donors?.name || "Doador não encontrado",
        donorType: log.donors?.type || "unico",
        channel: log.channel,
        template: log.template,
        sentAt: log.sent_at,
        status: log.status as any,
        retry_count: log.retry_count,
        error_message: log.error_message,
      })) as AutomationLog[];
    },
  });

  return {
    logs,
    isLoading,
  };
};
