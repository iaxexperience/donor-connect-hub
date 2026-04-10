import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDonors, registerDonation, Donor } from "@/lib/donationService";
import { supabase } from "@/integrations/supabase/client";

export const useDonors = () => {
  const queryClient = useQueryClient();

  // Fetch donors with React Query
  const { data: donors = [], isLoading, error } = useQuery({
    queryKey: ['donors'],
    queryFn: getDonors,
  });

  // Mutation to add a donation
  const donationMutation = useMutation({
    mutationFn: ({ donorId, amount, campaignId }: { donorId: number; amount: number; campaignId?: string }) => 
      registerDonation(donorId, amount, campaignId),
    onSuccess: () => {
      // Invalidate queries to refresh data (totals, counts, and classification happen on DB side)
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
  });

  // Mutation to register a new donor
  const addDonorMutation = useMutation({
    mutationFn: async (newDonor: Partial<Donor>) => {
      const { data, error } = await supabase
        .from('donors')
        .insert([newDonor])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
  });

  const addDonation = (donorId: number, amount: number, campaignId?: string) => {
    return donationMutation.mutate({ donorId, amount, campaignId });
  };

  const registerNewDonor = (name: string, email: string, phone: string) => {
    return addDonorMutation.mutate({ 
      name, 
      email, 
      phone: phone.replace(/\D/g, ""),
      type: 'unico',
      total_donated: 0,
      donation_count: 0
    });
  };

  return {
    donors,
    isLoading,
    error,
    addDonation,
    registerNewDonor,
    isRegistering: donationMutation.isPending || addDonorMutation.isPending,
  };
};

