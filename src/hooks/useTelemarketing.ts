import { useQuery } from "@tanstack/react-query";
import { getTelemarketingQueue } from "@/lib/donationService";

export const useTelemarketing = () => {
  const { 
    data: queue = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['telemarketing-queue'],
    queryFn: getTelemarketingQueue,
    refetchOnWindowFocus: false
  });

  const stats = {
    totalQueue: queue.length,
    leadsCount: queue.filter(d => d.type === 'lead').length,
    inactiveCount: queue.filter(d => d.type !== 'lead').length,
    averageTime: "4:32" // Manter estático por enquanto ou calcular
  };

  return {
    queue,
    stats,
    isLoading,
    error
  };
};
