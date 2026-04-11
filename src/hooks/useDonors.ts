import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDonors, registerDonation, updateDonorType, updateDonor, Donor, DonorType } from "@/lib/donationService";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppThankYou } from "@/lib/whatsappService";


export const useDonors = () => {
  const queryClient = useQueryClient();

  // Fetch donors with React Query
  const { data: donors = [], isLoading, error } = useQuery({
    queryKey: ['donors'],
    queryFn: getDonors,
  });

  // Mutation to add a donation
  const donationMutation = useMutation({
    mutationFn: ({ donorId, amount, campaignId, paymentMethod }: { donorId: number; amount: number; campaignId?: string; paymentMethod?: string }) => 
      registerDonation(donorId, amount, campaignId, paymentMethod),
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh data (totals, counts, and classification happen on DB side)
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      
      // Auto-send WhatsApp Thank You message
      const donor = donors.find(d => d.id === variables.donorId);
      if (donor && donor.phone) {
        sendWhatsAppThankYou(
          donor.name, 
          variables.amount, 
          donor.phone, 
          variables.campaignId || "Doação Geral"
        );
      }
    },
  });

  // Mutation to register a new donor
  const addDonorMutation = useMutation({
    mutationFn: async (newDonor: Partial<Donor>) => {
      const { data, error } = await supabase
        .from('donors')
        .insert([newDonor])
        .select();
        
      if (error) throw error;
      return data?.[0];
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

  const addDonation = (donorId: number, amount: number, campaignId?: string, paymentMethod?: string) => {
    return donationMutation.mutate({ donorId, amount, campaignId, paymentMethod });
  };

  const cleanData = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
      cleaned[key] = data[key] === "" ? null : data[key];
    });
    return cleaned;
  };

  const registerNewDonor = async (donorData: any) => {
    // Map cpf_cnpj from form to document_id for DB
    const { cpf_cnpj, ...rest } = donorData;
    const cleaned = cleanData(rest);
    
    return await addDonorMutation.mutateAsync({ 
      ...cleaned,
      document_id: cpf_cnpj === "" ? null : cpf_cnpj,
      phone: donorData.phone?.replace(/\D/g, ""),
      type: donorData.type || 'lead',
      total_donated: 0,
      donation_count: 0
    });
  };

  const handleUpdateDonor = async (id: number, donorData: any) => {
    const { cpf_cnpj, ...rest } = donorData;
    const cleaned = cleanData(rest);
    
    return await updateDonorMutation.mutateAsync({ 
      id, 
      data: {
        ...cleaned,
        document_id: cpf_cnpj === "" ? null : cpf_cnpj,
        phone: donorData.phone?.replace(/\D/g, "")
      } 
    });
  };

  const updateType = (donorId: number, newType: DonorType) => {
    return updateTypeMutation.mutate({ donorId, newType });
  };

  const findDonorByEmailOrPhone = (query: string) => {
    const cleanQuery = query.toLowerCase().replace(/\D/g, "");
    return donors.find(d => 
      d.email?.toLowerCase() === query.toLowerCase() || 
      d.phone?.replace(/\D/g, "") === cleanQuery ||
      d.document_id?.replace(/\D/g, "") === cleanQuery
    );
  };

  return {
    donors,
    isLoading,
    error,
    addDonation,
    registerNewDonor,
    updateDonor: handleUpdateDonor,
    updateType,
    findDonorByEmailOrPhone,
    isRegistering: donationMutation.isPending || addDonorMutation.isPending || updateTypeMutation.isPending || updateDonorMutation.isPending,
  };
};
