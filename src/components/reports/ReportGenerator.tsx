import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Calendar,
  Users,
  PhoneCall,
  Wallet,
  Gift,
  CheckCircle2,
  Clock,
  Loader2,
  BadgeDollarSign,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Baby,
  Package,
  Pill,
  Scissors
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  exportReportToPDF,
  exportReportToExcel,
  ReportColumn,
  ReportKPI,
} from "@/lib/reportExportService";

const fmtCurrency = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ReportGenerator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"donors_telemarketing" | "donations_monthly" | "caixa_external" | "physical_donations">("donors_telemarketing");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  // Common reference data
  const [profiles, setProfiles] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  // ─────────────────────────────────────────────────────────────
  // 1. Report 1 States: Donors & Telemarketing
  // ─────────────────────────────────────────────────────────────
  const [donorsData, setDonorsData] = useState<any[]>([]);
  const [donorFilterOperator, setDonorFilterOperator] = useState("all");
  const [donorFilterType, setDonorFilterType] = useState("all");
  const [donorSearchTerm, setDonorSearchTerm] = useState("");
  const [donorStartDate, setDonorStartDate] = useState("");
  const [donorEndDate, setDonorEndDate] = useState("");

  // ─────────────────────────────────────────────────────────────
  // 2. Report 2 States: Monthly Donations
  // ─────────────────────────────────────────────────────────────
  const [donationsData, setDonationsData] = useState<any[]>([]);
  const [donationFilterMonth, setDonationFilterMonth] = useState("current");
  const [donationStartDate, setDonationStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [donationEndDate, setDonationEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [donationFilterCampaign, setDonationFilterCampaign] = useState("all");
  const [donationFilterMethod, setDonationFilterMethod] = useState("all");
  const [donationFilterStatus, setDonationFilterStatus] = useState("all");
  const [donationSearchTerm, setDonationSearchTerm] = useState("");

  // ─────────────────────────────────────────────────────────────
  // 3. Report 3 States: Caixa & External Receipts
  // ─────────────────────────────────────────────────────────────
  const [caixaData, setCaixaData] = useState<any[]>([]);
  const [caixaStartDate, setCaixaStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [caixaEndDate, setCaixaEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [caixaFilterMethod, setCaixaFilterMethod] = useState("all");
  const [caixaFilterStatus, setCaixaFilterStatus] = useState("all");
  const [caixaSearchTerm, setCaixaSearchTerm] = useState("");

  // ─────────────────────────────────────────────────────────────
  // 4. Report 4 States: Physical Donations
  // ─────────────────────────────────────────────────────────────
  const [physicalData, setPhysicalData] = useState<any[]>([]);
  const [physicalStartDate, setPhysicalStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [physicalEndDate, setPhysicalEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [physicalFilterType, setPhysicalFilterType] = useState("all");
  const [physicalFilterStatus, setPhysicalFilterStatus] = useState("all");
  const [physicalSearchTerm, setPhysicalSearchTerm] = useState("");

  // ─────────────────────────────────────────────────────────────
  // Load Base Settings and Reference Data
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadRefs() {
      try {
        const [profRes, campRes, orgRes] = await Promise.all([
          supabase.from("profiles").select("id, name, email, role"),
          supabase.from("campaigns").select("id, name, is_active"),
          supabase.from("white_label_settings").select("*").eq("id", 1).maybeSingle(),
        ]);
        if (profRes.data) setProfiles(profRes.data);
        if (campRes.data) setCampaigns(campRes.data);
        if (orgRes.data) setOrgSettings(orgRes.data);
      } catch (err) {
        console.error("Erro ao carregar referências:", err);
      }
    }
    loadRefs();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Data Loaders by Report
  // ─────────────────────────────────────────────────────────────
  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === "donors_telemarketing") {
        // Fetch donors, follow-ups, and recent donations
        const [donorsRes, followUpsRes, donationsRes] = await Promise.all([
          supabase.from("donors").select("*").order("name", { ascending: true }),
          supabase.from("follow_ups").select("donor_id, assigned_to, note, created_at").order("created_at", { ascending: false }),
          supabase.from("donations").select("donor_id, amount, donation_date, payment_method, status, campaigns(name)").order("donation_date", { ascending: false })
        ]);

        const donors = donorsRes.data || [];
        const followUps = followUpsRes.data || [];
        const donations = donationsRes.data || [];

        // Build latest donation and assigned operator mapping
        const processed = donors.map((d) => {
          const donorFollowUp = followUps.find((f) => f.donor_id === d.id);
          const assignedId = d.metadata?.assigned_to || donorFollowUp?.assigned_to || null;
          const assignedProfile = profiles.find((p) => p.id === assignedId);
          const operatorName = assignedProfile ? assignedProfile.name : (d.metadata?.operator_name || "Não atribuído");

          const latestDonation = donations.find((don) => don.donor_id === d.id);

          return {
            ...d,
            operator_id: assignedId,
            operator_name: operatorName,
            latest_donation_date: latestDonation?.donation_date || d.last_donation_date || null,
            latest_donation_amount: latestDonation?.amount || 0,
            latest_donation_method: latestDonation?.payment_method || "—",
            latest_donation_campaign: (latestDonation?.campaigns as any)?.name || "Geral",
            latest_donation_status: latestDonation?.status || "—",
          };
        });

        setDonorsData(processed);
      } else if (activeTab === "donations_monthly") {
        let query = supabase
          .from("donations")
          .select("id, amount, donation_date, status, payment_method, billing_type, captured_by, donors(id, name, document_id, phone), campaigns(id, name)")
          .order("donation_date", { ascending: false });

        if (donationStartDate) {
          query = query.gte("donation_date", new Date(`${donationStartDate}T00:00:00`).toISOString());
        }
        if (donationEndDate) {
          query = query.lte("donation_date", new Date(`${donationEndDate}T23:59:59`).toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        setDonationsData(data || []);
      } else if (activeTab === "caixa_external") {
        let query = supabase
          .from("caixa_transacoes")
          .select("*, profiles(name), donors(name, document_id, phone)")
          .order("created_at", { ascending: false });

        if (caixaStartDate) {
          query = query.gte("created_at", new Date(`${caixaStartDate}T00:00:00`).toISOString());
        }
        if (caixaEndDate) {
          query = query.lte("created_at", new Date(`${caixaEndDate}T23:59:59`).toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        setCaixaData(data || []);
      } else if (activeTab === "physical_donations") {
        let query = supabase
          .from("doacoes_fisicas")
          .select("*")
          .order("created_at", { ascending: false });

        if (physicalStartDate) {
          query = query.gte("created_at", new Date(`${physicalStartDate}T00:00:00`).toISOString());
        }
        if (physicalEndDate) {
          query = query.lte("created_at", new Date(`${physicalEndDate}T23:59:59`).toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        setPhysicalData(data || []);
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados do relatório:", err);
      toast({
        title: "Erro ao consultar dados",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [
    activeTab,
    donationStartDate,
    donationEndDate,
    caixaStartDate,
    caixaEndDate,
    physicalStartDate,
    physicalEndDate,
    profiles.length
  ]);

  // Handle month selection shortcut for donations
  const handleDonationMonthChange = (val: string) => {
    setDonationFilterMonth(val);
    const now = new Date();
    if (val === "current") {
      setDonationStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
      setDonationEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (val === "last") {
      const prev = subMonths(now, 1);
      setDonationStartDate(format(startOfMonth(prev), "yyyy-MM-dd"));
      setDonationEndDate(format(endOfMonth(prev), "yyyy-MM-dd"));
    } else if (val === "3months") {
      const prev = subMonths(now, 2);
      setDonationStartDate(format(startOfMonth(prev), "yyyy-MM-dd"));
      setDonationEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (val === "year") {
      setDonationStartDate(`${now.getFullYear()}-01-01`);
      setDonationEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Filtered Datasets
  // ─────────────────────────────────────────────────────────────

  // 1. Donors & Telemarketing Filtered
  const filteredDonors = useMemo(() => {
    return donorsData.filter((d) => {
      if (donorFilterOperator !== "all") {
        if (donorFilterOperator === "unassigned") {
          if (d.operator_name !== "Não atribuído") return false;
        } else if (d.operator_id !== donorFilterOperator) {
          return false;
        }
      }
      if (donorFilterType !== "all" && d.type !== donorFilterType) {
        return false;
      }
      if (donorStartDate && d.latest_donation_date) {
        if (new Date(d.latest_donation_date) < new Date(`${donorStartDate}T00:00:00`)) return false;
      }
      if (donorEndDate && d.latest_donation_date) {
        if (new Date(d.latest_donation_date) > new Date(`${donorEndDate}T23:59:59`)) return false;
      }
      if (donorSearchTerm) {
        const term = donorSearchTerm.toLowerCase();
        const matchesName = d.name?.toLowerCase().includes(term);
        const matchesPhone = d.phone?.includes(term);
        const matchesEmail = d.email?.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [donorsData, donorFilterOperator, donorFilterType, donorStartDate, donorEndDate, donorSearchTerm]);

  // 2. Monthly Donations Filtered
  const filteredDonations = useMemo(() => {
    return donationsData.filter((d) => {
      if (donationFilterCampaign !== "all") {
        if (d.campaign_id !== donationFilterCampaign) return false;
      }
      if (donationFilterMethod !== "all") {
        const m = (d.payment_method || d.billing_type || "").toLowerCase();
        if (!m.includes(donationFilterMethod.toLowerCase())) return false;
      }
      if (donationFilterStatus !== "all") {
        const st = (d.status || "").toLowerCase();
        if (donationFilterStatus === "pago" && !["pago", "confirmed", "received"].includes(st)) return false;
        if (donationFilterStatus === "pendente" && !["pendente", "pending"].includes(st)) return false;
      }
      if (donationSearchTerm) {
        const term = donationSearchTerm.toLowerCase();
        const donorName = (d.donors as any)?.name?.toLowerCase() || "";
        const donorDoc = (d.donors as any)?.document_id?.toLowerCase() || "";
        if (!donorName.includes(term) && !donorDoc.includes(term)) return false;
      }
      return true;
    });
  }, [donationsData, donationFilterCampaign, donationFilterMethod, donationFilterStatus, donationSearchTerm]);

  // 3. Caixa Filtered
  const filteredCaixa = useMemo(() => {
    return caixaData.filter((t) => {
      if (caixaFilterMethod !== "all") {
        if (t.payment_method !== caixaFilterMethod) return false;
      }
      if (caixaFilterStatus !== "all") {
        if (t.status !== caixaFilterStatus) return false;
      }
      if (caixaSearchTerm) {
        const term = caixaSearchTerm.toLowerCase();
        const donorName = (t.donor_name || (t.donors as any)?.name || "").toLowerCase();
        const receipt = (t.receipt_number || "").toLowerCase();
        if (!donorName.includes(term) && !receipt.includes(term)) return false;
      }
      return true;
    });
  }, [caixaData, caixaFilterMethod, caixaFilterStatus, caixaSearchTerm]);

  // 4. Physical Donations Filtered
  const filteredPhysical = useMemo(() => {
    return physicalData.filter((p) => {
      if (physicalFilterType !== "all") {
        if (p.tipo_doacao !== physicalFilterType) return false;
      }
      if (physicalFilterStatus !== "all") {
        if (p.status !== physicalFilterStatus) return false;
      }
      if (physicalSearchTerm) {
        const term = physicalSearchTerm.toLowerCase();
        const donorName = (p.donor_name || "").toLowerCase();
        const desc = (p.descricao || "").toLowerCase();
        if (!donorName.includes(term) && !desc.includes(term)) return false;
      }
      return true;
    });
  }, [physicalData, physicalFilterType, physicalFilterStatus, physicalSearchTerm]);

  // ─────────────────────────────────────────────────────────────
  // Report Definition & Columns Mapping
  // ─────────────────────────────────────────────────────────────

  const getReportConfig = () => {
    const sysName = orgSettings?.system_name || "Pulse Doações — Hospital FAP";

    if (activeTab === "donors_telemarketing") {
      const totalArrecadado = filteredDonors.reduce((acc, d) => acc + Number(d.total_donated || 0), 0);
      const totalComDoacao = filteredDonors.filter((d) => d.total_donated > 0).length;

      const columns: ReportColumn[] = [
        { header: "Doador", dataKey: "name", align: "left" },
        { header: "Telefone", dataKey: "phone", align: "left", format: (v) => v || "—" },
        { header: "Tipo", dataKey: "type", align: "center", format: (v) => (v ? v.toUpperCase() : "LEAD") },
        { header: "Operador Telemarketing", dataKey: "operator_name", align: "left" },
        {
          header: "Última Doação",
          dataKey: "latest_donation_date",
          align: "center",
          format: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "Nunca"),
        },
        {
          header: "Valor Última",
          dataKey: "latest_donation_amount",
          align: "right",
          format: (v) => (v ? fmtCurrency(Number(v)) : "—"),
        },
        { header: "Campanha Última", dataKey: "latest_donation_campaign", align: "left" },
        {
          header: "Total Doado",
          dataKey: "total_donated",
          align: "right",
          format: (v) => fmtCurrency(Number(v || 0)),
        },
        { header: "Doações", dataKey: "donation_count", align: "center", format: (v) => String(v || 0) },
      ];

      const kpis: ReportKPI[] = [
        { label: "Doadores Listados", value: String(filteredDonors.length) },
        { label: "Doadores com Contribuição", value: String(totalComDoacao) },
        { label: "Total Acumulado", value: fmtCurrency(totalArrecadado) },
      ];

      return {
        filename: "relatorio_doadores_telemarketing",
        title: "Relatório de Cadastro de Doadores e Acompanhamento Telemarketing",
        subtitle: `Filtros: Operador: ${
          donorFilterOperator === "all"
            ? "Todos"
            : donorFilterOperator === "unassigned"
            ? "Não Atribuído"
            : profiles.find((p) => p.id === donorFilterOperator)?.name || donorFilterOperator
        } | Classificação: ${donorFilterType === "all" ? "Todas" : donorFilterType.toUpperCase()}`,
        columns,
        rows: filteredDonors,
        kpis,
        systemName: sysName,
        orientation: "landscape" as const,
      };
    }

    if (activeTab === "donations_monthly") {
      const totalAmount = filteredDonations.reduce((acc, d) => acc + Number(d.amount || 0), 0);
      const paidDonations = filteredDonations.filter((d) => ["pago", "confirmed", "received"].includes((d.status || "").toLowerCase()));
      const totalPaid = paidDonations.reduce((acc, d) => acc + Number(d.amount || 0), 0);
      const avg = filteredDonations.length > 0 ? totalAmount / filteredDonations.length : 0;

      const columns: ReportColumn[] = [
        {
          header: "Data",
          dataKey: "donation_date",
          align: "center",
          format: (v) => (v ? format(new Date(v), "dd/MM/yyyy HH:mm") : "—"),
        },
        {
          header: "Doador",
          dataKey: "donors",
          align: "left",
          format: (v) => (v as any)?.name || "Doador não identificado",
        },
        {
          header: "Contato",
          dataKey: "donors",
          align: "left",
          format: (v) => (v as any)?.phone || (v as any)?.document_id || "—",
        },
        {
          header: "Campanha",
          dataKey: "campaigns",
          align: "left",
          format: (v) => (v as any)?.name || "Doação Geral",
        },
        {
          header: "Pagamento",
          dataKey: "payment_method",
          align: "center",
          format: (v, r) => v || r.billing_type || "Pix",
        },
        {
          header: "Status",
          dataKey: "status",
          align: "center",
          format: (v) => (v ? v.toUpperCase() : "PAGO"),
        },
        {
          header: "Valor (R$)",
          dataKey: "amount",
          align: "right",
          format: (v) => fmtCurrency(Number(v || 0)),
        },
      ];

      const kpis: ReportKPI[] = [
        { label: "Total Recebido (Pago)", value: fmtCurrency(totalPaid) },
        { label: "Total Geral", value: fmtCurrency(totalAmount) },
        { label: "Qtd. Doações", value: String(filteredDonations.length) },
        { label: "Ticket Médio", value: fmtCurrency(avg) },
      ];

      return {
        filename: "relatorio_doacoes_mensais",
        title: "Relatório de Doações Recebidas Mensais",
        subtitle: `Período: ${donationStartDate ? format(new Date(`${donationStartDate}T00:00:00`), "dd/MM/yyyy") : "Início"} até ${donationEndDate ? format(new Date(`${donationEndDate}T00:00:00`), "dd/MM/yyyy") : "Hoje"} | Campanha: ${
          donationFilterCampaign === "all" ? "Todas" : campaigns.find((c) => c.id === donationFilterCampaign)?.name || donationFilterCampaign
        } | Pagamento: ${donationFilterMethod === "all" ? "Todos" : donationFilterMethod.toUpperCase()}`,
        columns,
        rows: filteredDonations,
        kpis,
        systemName: sysName,
        orientation: "landscape" as const,
      };
    }

    if (activeTab === "caixa_external") {
      const totalCaixa = filteredCaixa.reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const totalDinheiro = filteredCaixa.filter((t) => t.payment_method === "dinheiro").reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const totalDigital = totalCaixa - totalDinheiro;

      const columns: ReportColumn[] = [
        { header: "Recibo Nº", dataKey: "receipt_number", align: "center", format: (v) => v || "—" },
        {
          header: "Data/Hora",
          dataKey: "created_at",
          align: "center",
          format: (v) => (v ? format(new Date(v), "dd/MM/yyyy HH:mm") : "—"),
        },
        {
          header: "Doador",
          dataKey: "donor_name",
          align: "left",
          format: (v, r) => v || (r.donors as any)?.name || "Anônimo",
        },
        {
          header: "Forma de Pagamento",
          dataKey: "payment_method",
          align: "center",
          format: (v, r) => {
            const m = v ? v.toUpperCase() : "PIX";
            return r.cartao_tipo ? `${m} (${r.cartao_tipo.toUpperCase()})` : m;
          },
        },
        {
          header: "Operador do Caixa",
          dataKey: "profiles",
          align: "left",
          format: (v) => (v as any)?.name || "Operador FAP",
        },
        {
          header: "Status",
          dataKey: "status",
          align: "center",
          format: (v) => (v ? v.toUpperCase() : "CONFIRMADO"),
        },
        {
          header: "Valor (R$)",
          dataKey: "amount",
          align: "right",
          format: (v) => fmtCurrency(Number(v || 0)),
        },
        { header: "Obs", dataKey: "notes", align: "left", format: (v) => v || "" },
      ];

      const kpis: ReportKPI[] = [
        { label: "Total em Caixa", value: fmtCurrency(totalCaixa) },
        { label: "Total em Dinheiro", value: fmtCurrency(totalDinheiro) },
        { label: "Total Pix / Cartão", value: fmtCurrency(totalDigital) },
        { label: "Nº Transações", value: String(filteredCaixa.length) },
      ];

      return {
        filename: "relatorio_caixa_recebimentos_externos",
        title: "Relatório de Recebimentos Externos e Movimentações do Caixa",
        subtitle: `Período: ${caixaStartDate ? format(new Date(`${caixaStartDate}T00:00:00`), "dd/MM/yyyy") : "Início"} a ${caixaEndDate ? format(new Date(`${caixaEndDate}T00:00:00`), "dd/MM/yyyy") : "Hoje"} | Forma: ${caixaFilterMethod.toUpperCase()} | Status: ${caixaFilterStatus.toUpperCase()}`,
        columns,
        rows: filteredCaixa,
        kpis,
        systemName: sysName,
        orientation: "landscape" as const,
      };
    }

    // activeTab === "physical_donations"
    const totalItens = filteredPhysical.length;
    const recebidos = filteredPhysical.filter((p) => p.status === "recebido").length;
    const pendentes = filteredPhysical.filter((p) => p.status === "pendente").length;

    const tipoLabels: Record<string, string> = {
      cabelo: "Cabelo",
      fraldas_geriatricas: "Fraldas Geriátricas",
      alimentos: "Alimentos",
      remedios: "Remédios",
      veiculo: "Veículo",
      terreno: "Terreno",
      casa: "Casa/Imóvel",
      predio_comercial: "Prédio Comercial",
      outro: "Outro Material",
    };

    const columns: ReportColumn[] = [
      {
        header: "Data",
        dataKey: "created_at",
        align: "center",
        format: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "—"),
      },
      { header: "Doador", dataKey: "donor_name", align: "left" },
      {
        header: "Categoria",
        dataKey: "tipo_doacao",
        align: "left",
        format: (v) => tipoLabels[v] || v,
      },
      { header: "Subtipo / Especificação", dataKey: "subtipo", align: "left", format: (v) => v || "—" },
      { header: "Descrição / Medicamento", dataKey: "descricao", align: "left", format: (v) => v || "—" },
      { header: "Quantidade", dataKey: "quantidade", align: "center", format: (v) => v || "1 un" },
      {
        header: "Status",
        dataKey: "status",
        align: "center",
        format: (v) => (v ? v.toUpperCase() : "RECEBIDO"),
      },
      {
        header: "Recebido em",
        dataKey: "recebido_em",
        align: "center",
        format: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "—"),
      },
      { header: "Observações", dataKey: "observacoes", align: "left", format: (v) => v || "" },
    ];

    const kpis: ReportKPI[] = [
      { label: "Total de Doações Físicas", value: String(totalItens) },
      { label: "Itens Recebidos", value: String(recebidos) },
      { label: "Itens Pendentes", value: String(pendentes) },
    ];

    return {
      filename: "relatorio_doacoes_fisicas",
      title: "Relatório de Doações Físicas e Materiais",
      subtitle: `Período: ${physicalStartDate ? format(new Date(`${physicalStartDate}T00:00:00`), "dd/MM/yyyy") : "Início"} a ${physicalEndDate ? format(new Date(`${physicalEndDate}T00:00:00`), "dd/MM/yyyy") : "Hoje"} | Categoria: ${physicalFilterType === "all" ? "Todas" : tipoLabels[physicalFilterType] || physicalFilterType}`,
      columns,
      rows: filteredPhysical,
      kpis,
      systemName: sysName,
      orientation: "landscape" as const,
    };
  };

  // ─────────────────────────────────────────────────────────────
  // Export Handlers
  // ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    try {
      setDownloading("pdf");
      const config = getReportConfig();
      await exportReportToPDF(config);
      toast({
        title: "Relatório em PDF gerado!",
        description: `O arquivo ${config.filename}.pdf foi baixado com sucesso.`,
      });
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      toast({
        title: "Falha ao exportar PDF",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportExcel = () => {
    try {
      setDownloading("excel");
      const config = getReportConfig();
      exportReportToExcel(config);
      toast({
        title: "Planilha Excel gerada!",
        description: `O arquivo ${config.filename}.xlsx foi baixado com sucesso.`,
      });
    } catch (err: any) {
      console.error("Erro ao gerar Excel:", err);
      toast({
        title: "Falha ao exportar Excel",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const config = getReportConfig();

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Central de Relatórios Exportáveis (PDF & Excel)
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Selecione o tipo de relatório, aplique os filtros desejados e exporte documentos oficiais em PDF formatado ou planilhas do Excel (.xlsx).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={loading || downloading !== null || config.rows.length === 0}
              className="bg-white hover:bg-red-50 text-red-700 border-red-200 hover:border-red-300 font-medium shadow-sm transition-all"
            >
              {downloading === "pdf" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <FileText className="w-4 h-4 mr-1.5 text-red-600" />
              )}
              Baixar PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading || downloading !== null || config.rows.length === 0}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 font-medium shadow-sm transition-all"
            >
              {downloading === "excel" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
              )}
              Baixar Excel (.xlsx)
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={loadReportData}
              disabled={loading}
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Segmented Tabs for 4 Report Types */}
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="w-full space-y-4"
        >
          <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-slate-100/90 rounded-xl">
            <TabsTrigger
              value="donors_telemarketing"
              className="py-2.5 data-[state=checked]:bg-white data-[state=checked]:shadow-sm rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium"
            >
              <PhoneCall className="w-4 h-4 text-primary shrink-0" />
              <span>Doadores & Telemarketing</span>
            </TabsTrigger>

            <TabsTrigger
              value="donations_monthly"
              className="py-2.5 data-[state=checked]:bg-white data-[state=checked]:shadow-sm rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium"
            >
              <BadgeDollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Doações Recebidas Mensais</span>
            </TabsTrigger>

            <TabsTrigger
              value="caixa_external"
              className="py-2.5 data-[state=checked]:bg-white data-[state=checked]:shadow-sm rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium"
            >
              <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Recebimentos / Caixa</span>
            </TabsTrigger>

            <TabsTrigger
              value="physical_donations"
              className="py-2.5 data-[state=checked]:bg-white data-[state=checked]:shadow-sm rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium"
            >
              <Gift className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Doações Físicas</span>
            </TabsTrigger>
          </TabsList>

          {/* ─────────────────────────────────────────────────────────────
              FILTERS: Report 1 (Donors & Telemarketing)
             ───────────────────────────────────────────────────────────── */}
          <TabsContent value="donors_telemarketing" className="space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 border rounded-xl">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Operador de Telemarketing</Label>
                <Select value={donorFilterOperator} onValueChange={setDonorFilterOperator}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todos os operadores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Operadores</SelectItem>
                    <SelectItem value="unassigned">Sem operador (Não atribuído)</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.role === "operador" ? "(Operador)" : `(${p.role})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Classificação do Doador</Label>
                <Select value={donorFilterType} onValueChange={setDonorFilterType}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todas as classificações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Classificações</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="unico">Único</SelectItem>
                    <SelectItem value="esporadico">Esporádico</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                    <SelectItem value="desativado">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Última Doação (De)</Label>
                <Input
                  type="date"
                  value={donorStartDate}
                  onChange={(e) => setDonorStartDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Última Doação (Até)</Label>
                <Input
                  type="date"
                  value={donorEndDate}
                  onChange={(e) => setDonorEndDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>
            </div>
          </TabsContent>

          {/* ─────────────────────────────────────────────────────────────
              FILTERS: Report 2 (Monthly Donations)
             ───────────────────────────────────────────────────────────── */}
          <TabsContent value="donations_monthly" className="space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3.5 bg-slate-50/70 border rounded-xl">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Atalho de Período</Label>
                <Select value={donationFilterMonth} onValueChange={handleDonationMonthChange}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Mês Atual</SelectItem>
                    <SelectItem value="last">Mês Anterior</SelectItem>
                    <SelectItem value="3months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="year">Ano Atual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Input
                  type="date"
                  value={donationStartDate}
                  onChange={(e) => setDonationStartDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Input
                  type="date"
                  value={donationEndDate}
                  onChange={(e) => setDonationEndDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Campanha</Label>
                <Select value={donationFilterCampaign} onValueChange={setDonationFilterCampaign}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Campanhas</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                <Select value={donationFilterMethod} onValueChange={setDonationFilterMethod}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Formas</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="manual">Manual / Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ─────────────────────────────────────────────────────────────
              FILTERS: Report 3 (Caixa & External Receipts)
             ───────────────────────────────────────────────────────────── */}
          <TabsContent value="caixa_external" className="space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 border rounded-xl">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Input
                  type="date"
                  value={caixaStartDate}
                  onChange={(e) => setCaixaStartDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Input
                  type="date"
                  value={caixaEndDate}
                  onChange={(e) => setCaixaEndDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                <Select value={caixaFilterMethod} onValueChange={setCaixaFilterMethod}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Formas</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status do Caixa</Label>
                <Select value={caixaFilterStatus} onValueChange={setCaixaFilterStatus}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ─────────────────────────────────────────────────────────────
              FILTERS: Report 4 (Physical Donations)
             ───────────────────────────────────────────────────────────── */}
          <TabsContent value="physical_donations" className="space-y-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 border rounded-xl">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Input
                  type="date"
                  value={physicalStartDate}
                  onChange={(e) => setPhysicalStartDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Input
                  type="date"
                  value={physicalEndDate}
                  onChange={(e) => setPhysicalEndDate(e.target.value)}
                  className="bg-white h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoria do Material</Label>
                <Select value={physicalFilterType} onValueChange={setPhysicalFilterType}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    <SelectItem value="cabelo">Doação de Cabelo</SelectItem>
                    <SelectItem value="fraldas_geriatricas">Fraldas Geriátricas</SelectItem>
                    <SelectItem value="alimentos">Alimentos</SelectItem>
                    <SelectItem value="remedios">Remédios</SelectItem>
                    <SelectItem value="veiculo">Veículo</SelectItem>
                    <SelectItem value="terreno">Terreno</SelectItem>
                    <SelectItem value="casa">Casa / Imóvel</SelectItem>
                    <SelectItem value="predio_comercial">Prédio Comercial</SelectItem>
                    <SelectItem value="outro">Outros Materiais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status do Item</Label>
                <Select value={physicalFilterStatus} onValueChange={setPhysicalFilterStatus}>
                  <SelectTrigger className="bg-white h-9 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─────────────────────────────────────────────────────────────
            Summary KPI Cards
           ───────────────────────────────────────────────────────────── */}
        {config.kpis && config.kpis.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {config.kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-center"
              >
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {kpi.label}
                </span>
                <span className="text-lg font-bold text-foreground mt-0.5">
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            Preview Table
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Mostrando os primeiros <strong>{Math.min(config.rows.length, 15)}</strong> de{" "}
              <strong>{config.rows.length}</strong> registros encontrados.
            </span>
            <span className="hidden sm:inline">
              O relatório completo exportará todas as <strong>{config.rows.length}</strong> linhas.
            </span>
          </div>

          <div className="border rounded-xl overflow-hidden bg-white shadow-xs max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                <TableRow>
                  {config.columns.map((col, idx) => (
                    <TableHead
                      key={idx}
                      className={`text-xs font-semibold ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={config.columns.length}
                      className="h-28 text-center text-muted-foreground"
                    >
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-primary" />
                      Carregando dados do relatório...
                    </TableCell>
                  </TableRow>
                ) : config.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={config.columns.length}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  config.rows.slice(0, 15).map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-slate-50/60 text-xs">
                      {config.columns.map((col, colIdx) => {
                        const rawVal = row[col.dataKey];
                        const displayVal = col.format ? col.format(rawVal, row) : rawVal ?? "—";
                        return (
                          <TableCell
                            key={colIdx}
                            className={`${
                              col.align === "right"
                                ? "text-right font-medium"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                            }`}
                          >
                            {col.dataKey === "type" ? (
                              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                {String(displayVal)}
                              </Badge>
                            ) : col.dataKey === "status" ? (
                              <Badge
                                variant={
                                  String(displayVal).toLowerCase().includes("pago") ||
                                  String(displayVal).toLowerCase().includes("confirmado") ||
                                  String(displayVal).toLowerCase().includes("recebido")
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {String(displayVal)}
                              </Badge>
                            ) : (
                              String(displayVal)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


