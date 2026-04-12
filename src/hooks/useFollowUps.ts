import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FollowUp {
  id: number;
  donor_id: number;
  due_date: string;
  status: string;
  note: string;
  donors?: {
    name: string;
    phone: string;
    email: string;
    type: string;
    total_donated: number;
    last_donation_date: string;
  };
}

export const useFollowUps = () => {
  const queryClient = useQueryClient();

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, donors(name, phone, email, type, total_donated, last_donation_date)')
        .order('due_date', { ascending: true });
      if (error) throw error;
      
      return data.map(f => ({
        ...f,
        donorName: f.donors?.name,
        phone: f.donors?.phone,
        email: f.donors?.email,
        donorType: f.donors?.type,
        totalDonations: f.donors?.total_donated || 0,
        lastDonation: f.donors?.last_donation_date || null,
      })) as unknown as FollowUp[];
    },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .update({ status, note })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async ({ donor_id, due_date, status, note }: { donor_id: number; due_date: string; status: string; note?: string }) => {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert([{ donor_id, due_date, status, note }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  return {
    followUps,
    isLoading,
    updateFollowUp: updateFollowUpMutation.mutate,
    createFollowUp: createFollowUpMutation.mutateAsync,
  };
};
