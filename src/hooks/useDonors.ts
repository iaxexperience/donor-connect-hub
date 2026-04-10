import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDonors, registerDonation, updateDonorType, updateDonor, Donor, DonorType } from "@/lib/donationService";
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

  // Mutation to update donor type
  const updateTypeMutation = useMutation({
    mutationFn: ({ donorId, newType }: { donorId: number; newType: DonorType }) => 
      updateDonorType(donorId, newType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
  });

  // Mutation to update an existing donor
  const updateDonorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Donor> }) => {
      return await updateDonor(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
    },
  });

  const addDonation = (donorId: number, amount: number, campaignId?: string) => {
    return donationMutation.mutate({ donorId, amount, campaignId });
  };

  const registerNewDonor = async (donorData: any) => {
    // Map cpf_cnpj from form to document_id for DB
    const { cpf_cnpj, ...rest } = donorData;
    
    return await addDonorMutation.mutateAsync({ 
      ...rest,
      document_id: cpf_cnpj,
      phone: donorData.phone?.replace(/\D/g, ""),
      type: donorData.type || 'lead',
      total_donated: 0,
      donation_count: 0
    });
  };

  const handleUpdateDonor = async (id: number, donorData: any) => {
    const { cpf_cnpj, ...rest } = donorData;
    return await updateDonorMutation.mutateAsync({ 
      id, 
      data: {
        ...rest,
        document_id: cpf_cnpj,
        phone: donorData.phone?.replace(/\D/g, "")
      } 
    });
  };

  const updateType = (donorId: number, newType: DonorType) => {
    return updateTypeMutation.mutate({ donorId, newType });
  };

  return {
    donors,
    isLoading,
    error,
    addDonation,
    registerNewDonor,
    updateDonor: handleUpdateDonor,
    updateType,
    isRegistering: donationMutation.isPending || addDonorMutation.isPending || updateTypeMutation.isPending || updateDonorMutation.isPending,
  };
};
