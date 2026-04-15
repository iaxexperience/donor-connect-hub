import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDonors } from "./useDonors";
import { useCampaigns } from "./useCampaigns";

export const useDashboard = () => {
  const { donors } = useDonors();
  const { campaigns } = useCampaigns();

  const { data: donations = [], isLoading: donationsLoading } = useQuery({
    queryKey: ['donations-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*, donors(name, type)')
        .order('donation_date', { ascending: false });

      if (error) {
        console.error("[useDashboard] Supabase error fetching donations:", error);
        if (error.code === '42703' || error.message?.includes('does not exist')) {
            // Fallback para evitar travamento da tela toda
            const { data: fallbackData } = await supabase.from('donations').select('*, donors(name, type)');
            return fallbackData || [];
        }
        throw error;
      }
      return data;
    },
  });

  // Helper — 'pago' é o valor correto do enum donation_status no banco
  const isConfirmedStatus = (status: string) =>
    ['pago', 'confirmed', 'Confirmado', 'CONFIRMED'].includes(status);

  // 1. Recebimentos Mensais (Últimos 6 meses)
  const getMonthlyData = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[d.getMonth()];
      const total = donations
        .filter(don => {
          if (!isConfirmedStatus(don.status)) return false;
          const dateStr = don.confirmed_at || don.donation_date;
          if (!dateStr) return false;
          const donDate = new Date(dateStr);
          return donDate.getMonth() === d.getMonth() && donDate.getFullYear() === d.getFullYear();
        })
        .reduce((acc, don) => acc + (don.amount || 0), 0);

      result.push({ name: monthLabel, total });
    }
    return result;
  };

  // 2. Mix por Campanha
  const getCampaignMix = () => {
    if (campaigns.length === 0) return [{ name: "Sem Campanhas", value: 100, color: "#999999" }];

    const totalsByCampaign = campaigns.map(c => {
      const total = donations
        .filter(d => d.campaign_id === c.id)
        .reduce((acc, d) => acc + (d.amount || 0), 0);
      return { name: c.name, value: total, color: "#0066CC" };
    });

    const totalCollected = totalsByCampaign.reduce((acc, c) => acc + c.value, 0);
    if (totalCollected === 0) return campaigns.map(c => ({ name: c.name, value: 0, color: "#0066CC" }));

    return totalsByCampaign.map(c => ({
      ...c,
      value: Math.round((c.value / totalCollected) * 100)
    }));
  };

  // 3. Evolução de Doações (Últimos 30 dias)
  const getEvolutionData = () => {
    const result = [];
    const now = new Date();
    for (let i = 30; i >= 0; i -= 5) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const total = donations
        .filter(don => {
          const dateStr = don.confirmed_at || don.donation_date;
          if (!dateStr) return false;
          return new Date(dateStr).toDateString() === d.toDateString();
        })
        .reduce((acc, don) => acc + (don.amount || 0), 0);

      result.push({ day: dayLabel, value: total });
    }
    return result;
  };

  // 4. Maiores Doadores
  const getTopDonors = () => {
    return [...donors]
      .sort((a, b) => (b.total_donated || 0) - (a.total_donated || 0))
      .slice(0, 4)
      .map(d => ({
        name: d.name,
        total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.total_donated || 0),
        type: d.type === 'recorrente' ? 'Recorrente' : d.type === 'unico' ? 'Único' : 'Esporádico'
      }));
  };

  // 5. Doações Recentes
  const getRecentDonations = () => {
    return donations.slice(0, 4).map(d => ({
      name: d.donors?.name || "Anônimo",
      amount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.amount),
      time: new Date(d.confirmed_at || d.donation_date || new Date()).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      status: d.status || "Confirmado"
    }));
  };

  // "Recebidos Hoje" — doações confirmadas de hoje (Asaas + manuais)
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const todayDonationsTotal = donations
    .filter(d => {
      if (!isConfirmedStatus(d.status)) return false;
      const dateStr = d.confirmed_at || d.donation_date;
      if (!dateStr) return false;
      const donDate = new Date(dateStr);
      return donDate.getDate() === todayDay && 
             donDate.getMonth() === todayMonth && 
             donDate.getFullYear() === todayYear;
    })
    .reduce((acc, d) => acc + Number(d.amount || 0), 0);

  // Banco do Brasil credits for today
  const { data: bbTodayCredits = [] } = useQuery({
    queryKey: ['bb-today-credits'],
    queryFn: async () => {
      const startOfDay = new Date(todayYear, todayMonth, todayDay).toISOString();
      const endOfDay = new Date(todayYear, todayMonth, todayDay, 23, 59, 59).toISOString();
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('amount')
        .eq('type', 'credit')
        .gte('date', startOfDay)
        .lte('date', endOfDay);
      if (error) {
        console.error('[Dashboard] BB credits error:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 30000
  });

  const bbTodayTotal = bbTodayCredits.reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
  const todayTotal = todayDonationsTotal + bbTodayTotal;

  // Busca do "Saldo Real ASAAS" via Edge Function proxy
  // Isso substitui a soma burra das doações do banco pelo saldo financeiro real.
  const { data: realBalance = 0, isLoading: balanceLoading } = useQuery({
    queryKey: ['asaas-real-balance'],
    queryFn: async () => {
      const { data: settings } = await supabase.from('asaas_settings').select('*').eq('id', 1).maybeSingle();
      if (!settings?.api_key) return 0;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'asaas',
          action: 'get_balance',
          config: { api_key: settings.api_key, sandbox: settings.sandbox }
        })
      });
      const resData = await response.json().catch(() => null);
      if (resData && typeof resData.balance !== 'undefined') {
        return parseFloat(resData.balance);
      }
      return 0;
    },
    // Recarrega a cada 30 segundos
    refetchInterval: 30000 
  });

  // Mantemos fallback
  const totalDonations = realBalance;

  return {
    isLoading: donationsLoading || balanceLoading,
    monthlyData: getMonthlyData(),
    campaignData: getCampaignMix(),
    evolutionData: getEvolutionData(),
    topDonors: getTopDonors(),
    recentDonations: getRecentDonations(),
    todayTotal,
    totalDonations,
    avgTicket: donations.length > 0 ? donations.reduce((acc, d) => acc + Number(d.amount || 0), 0) / Math.max(donations.filter(d => isConfirmedStatus(d.status)).length, 1) : 0,
    donationsCount: donations.length
  };

};
