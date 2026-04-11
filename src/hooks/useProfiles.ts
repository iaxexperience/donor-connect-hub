import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "gestor" | "operador" | "visualizador";
  status: string;
  last_access?: string;
}

export const useProfiles = () => {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Profile[];
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (newProfile: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          ...newProfile,
          id: crypto.randomUUID(), // Temporário até integrar com Auth real
          status: 'Ativo'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  return {
    profiles,
    isLoading,
    createProfile: createProfileMutation.mutateAsync,
  };
};
