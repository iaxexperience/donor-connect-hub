import { useQuery } from "@tanstack/react-query";
import { getTelemarketingQueue } from "@/lib/donationService";
import { useAuth } from "@/contexts/AuthContext";

const BATCH_SIZE = 10;

export const useTelemarketing = () => {
  const { user, role } = useAuth();
  // Carteira: só o operador tem a fila restrita aos próprios doadores.
  // Outros papéis (admin/coordenador/gestor) veem todos os prontos, para
  // fins de supervisão.
  const operatorId = role === "operador" ? user?.id ?? null : null;

  const {
    data: readyQueue = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['telemarketing-queue', operatorId],
    queryFn: () => getTelemarketingQueue(operatorId),
    refetchOnWindowFocus: false
  });

  // Mostra só um lote por vez; assim que os donors do lote são contatados
  // (e somem da fila "pronta" por já terem ligação hoje), o próximo lote
  // de prontos da carteira entra automaticamente na posição.
  const queue = readyQueue.slice(0, BATCH_SIZE);

  const stats = {
    totalQueue: readyQueue.length,
    leadsCount: readyQueue.filter(d => d.type === 'lead').length,
    inactiveCount: readyQueue.filter(d => d.type !== 'lead').length,
    averageTime: "4:32" // Manter estático por enquanto ou calcular
  };

  return {
    queue,
    stats,
    isLoading,
    error
  };
};
