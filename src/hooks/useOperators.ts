import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Operator {
  id: string;
  name: string;
}

/**
 * Quem pode mudar a carteira de um doador. Mesma regra da função do banco
 * assign_donor_operator (20261101_donor_operator_assignment.sql).
 */
export const CARTEIRA_MANAGER_ROLES = ["admin", "coordenador"];

/** Operadores de telemarketing ativos (os únicos que podem ter carteira). */
export const useOperators = (enabled = true) =>
  useQuery({
    queryKey: ["operators-ativos"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "operador")
        .eq("status", "Ativo")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Operator[];
    },
    staleTime: 5 * 60_000,
  });

/**
 * Coloca doadores na carteira de um operador (ou tira de qualquer carteira,
 * com operatorId = null). Registra no log de auditoria pelo próprio banco.
 */
export const useAssignDonors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ donorIds, operatorId }: { donorIds: number[]; operatorId: string | null }) => {
      const { error } = await supabase.rpc("assign_donor_operator", {
        p_donor_ids: donorIds,
        p_operator_id: operatorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      // Lista de doadores, contagens da Distribuição de Carteiras e fila do telemarketing.
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    },
  });
};
