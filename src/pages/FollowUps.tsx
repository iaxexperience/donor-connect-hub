import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFollowUpLogs } from "@/hooks/useFollowUpLogs";
import {
  CalendarClock,
  UserCheck,
  UserMinus,
  Users,
  Phone,
  MessageSquare,
  Mail,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Zap,
  Play,
  Pause,
  History,
  Settings2,
  Save,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type DonorType = "unico" | "esporadico" | "recorrente";
type FollowUpStatus = "pendente" | "agendado" | "enviado" | "atrasado";
type FollowUpChannel = "telefone" | "whatsapp" | "email";

interface FollowUp {
  id: number;
  donorName: string;
  donorType: DonorType;
  phone: string;
  email: string;
  lastDonation: string;
  lastContact: string;
  dueDate: string;
  status: FollowUpStatus;
  channel: FollowUpChannel;
  campaign: string;
  totalDonations: number;
  notes: string;
}

interface AutomationRule {
  type: DonorType;
  label: string;
  rule: string;
  followUpDays: number;
  enabled: boolean;
  channel: FollowUpChannel;
  template: string;
  color: string;
  bg: string;
  icon: typeof UserCheck;
  maxRetries: number;
  sendHour: string;
}

interface AutomationLog {
  id: number;
  donorName: string;
  donorType: DonorType;
  channel: FollowUpChannel;
  template: string;
  sentAt: string;
  status: "enviado" | "falha" | "aguardando";
  retryCount: number;
}

const followUps: FollowUp[] = [
  { id: 1, donorName: "Maria Silva", donorType: "recorrente", phone: "(11) 99888-1234", email: "maria@email.com", lastDonation: "2026-03-25", lastContact: "2026-03-28", dueDate: "2026-04-10", status: "pendente", channel: "whatsapp", campaign: "Natal SolidÃ¡rio", totalDonations: 12, notes: "Doadora fiel, prefere WhatsApp" },
  { id: 2, donorName: "JoÃ£o Santos", donorType: "unico", phone: "(21) 98777-5678", email: "joao@email.com", lastDonation: "2026-01-15", lastContact: "2026-01-20", dueDate: "2026-04-15", status: "agendado", channel: "telefone", campaign: "EducaÃ§Ã£o para Todos", totalDonations: 1, notes: "Primeira doaÃ§Ã£o, abordar com cuidado" },
  { id: 3, donorName: "Ana Oliveira", donorType: "esporadico", phone: "(31) 97666-9012", email: "ana@email.com", lastDonation: "2026-02-10", lastContact: "2026-02-15", dueDate: "2026-04-05", status: "atrasado", channel: "email", campaign: "AlimentaÃ§Ã£o Infantil", totalDonations: 3, notes: "PreferÃªncia por e-mail" },
  { id: 4, donorName: "Carlos Mendes", donorType: "recorrente", phone: "(41) 96555-3456", email: "carlos@email.com", lastDonation: "2026-03-30", lastContact: "2026-04-01", dueDate: "2026-04-12", status: "pendente", channel: "telefone", campaign: "Natal SolidÃ¡rio", totalDonations: 8, notes: "DisponÃ­vel apÃ³s 18h" },
  { id: 5, donorName: "PatrÃ­cia Lima", donorType: "unico", phone: "(51) 95444-7890", email: "patricia@email.com", lastDonation: "2025-12-20", lastContact: "2025-12-22", dueDate: "2026-03-20", status: "atrasado", channel: "whatsapp", campaign: "EducaÃ§Ã£o para Todos", totalDonations: 1, notes: "Sem resposta anterior" },
  { id: 6, donorName: "Roberto Alves", donorType: "esporadico", phone: "(61) 94333-2345", email: "roberto@email.com", lastDonation: "2026-03-01", lastContact: "2026-03-05", dueDate: "2026-04-08", status: "enviado", channel: "telefone", campaign: "AlimentaÃ§Ã£o Infantil", totalDonations: 4, notes: "Confirmou interesse em recorrÃªncia" },
  { id: 7, donorName: "Fernanda Costa", donorType: "recorrente", phone: "(71) 93222-6789", email: "fernanda@email.com", lastDonation: "2026-04-01", lastContact: "2026-04-03", dueDate: "2026-04-15", status: "agendado", channel: "whatsapp", campaign: "Natal SolidÃ¡rio", totalDonations: 15, notes: "Top doadora, tratamento VIP" },
];

const initialAutomationRules: AutomationRule[] = [
  { type: "unico", label: "Ãšnico", rule: "1 doaÃ§Ã£o registrada", followUpDays: 90, enabled: true, channel: "whatsapp", template: "follow_up_primeiro_doador", color: "text-amber-600", bg: "bg-amber-100", icon: UserMinus, maxRetries: 2, sendHour: "10:00" },
  { type: "esporadico", label: "EsporÃ¡dico", rule: "2+ doaÃ§Ãµes em 6 meses", followUpDays: 60, enabled: true, channel: "whatsapp", template: "follow_up_engajamento", color: "text-blue-600", bg: "bg-blue-100", icon: Users, maxRetries: 3, sendHour: "14:00" },
  { type: "recorrente", label: "Recorrente", rule: "3+ doaÃ§Ãµes em 3 meses", followUpDays: 30, enabled: true, channel: "whatsapp", template: "follow_up_fidelizacao", color: "text-green-600", bg: "bg-green-100", icon: UserCheck, maxRetries: 1, sendHour: "09:00" },
];

const donorTypeLabel: Record<string, string> = { unico: "Ãšnico", esporadico: "EsporÃ¡dico", recorrente: "Recorrente" };
const donorTypeBadge: Record<string, string> = { 
  unico: "bg-blue-100 text-blue-700 border-blue-200", 
  esporadico: "bg-orange-100 text-orange-700 border-orange-200", 
  recorrente: "bg-green-100 text-green-700 border-green-200" 
};
const statusLabel: Record<string, string> = { pendente: "Pendente", agendado: "Agendado", enviado: "ConcluÃ­do", atrasado: "Atrasado" };
const statusColor: Record<string, string> = { pendente: "bg-amber-100 text-amber-800", agendado: "bg-blue-100 text-blue-800", enviado: "bg-green-100 text-green-800", atrasado: "bg-red-100 text-red-800" };
const channelIcon: Record<string, any> = { telefone: Phone, whatsapp: MessageSquare, email: Mail };
const logStatusColor: Record<string, string> = { enviado: "bg-green-100 text-green-800", falha: "bg-red-100 text-red-800", aguardando: "bg-amber-100 text-amber-800" };

import { useFollowUps } from "@/hooks/useFollowUps";
import { useDonors } from "@/hooks/useDonors";

const FollowUps = () => {
  const { followUps: dbFollowUps, isLoading: loadingFollowUps, updateFollowUp, createFollowUp } = useFollowUps();
  const { logs: dbLogs, isLoading: loadingLogs } = useFollowUpLogs();
  const { donors } = useDonors();
  
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactNote, setContactNote] = useState("");
  const [contactStatus, setContactStatus] = useState<FollowUpStatus>("pendente");
  const [nextContactDate, setNextContactDate] = useState("");
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  
  // New Follow-up states
  const [newFollowUpDonorId, setNewFollowUpDonorId] = useState("");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpNote, setNewFollowUpNote] = useState("");
  const [newFollowUpClassification, setNewFollowUpClassification] = useState("all");

  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(initialAutomationRules);
  const [automationGlobal, setAutomationGlobal] = useState(false);
  const [isProcessingNow, setIsProcessingNow] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isScheduling, setIsScheduling] = useState(false);

  const openFollowUpDetails = (followUp: any) => {
    setSelectedFollowUp(followUp);
    setContactNote(followUp.note || "");
    setContactStatus(followUp.status);
    setNextContactDate(followUp.dueDate || "");
    setDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!selectedFollowUp) return;
    setIsSavingContact(true);
    try {
      await updateFollowUp({
        id: selectedFollowUp.id,
        status: contactStatus,
        note: contactNote,
        due_date: nextContactDate,
      });
      toast({ title: "Registro salvo", description: "O follow-up foi atualizado com sucesso." });
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar registro",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o follow-up.",
        variant: "destructive",
      });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!newFollowUpDonorId || !newFollowUpDate) {
      toast({ title: "Preencha os campos obrigatÃ³rios", variant: "destructive", description: "Doador e data sÃ£o obrigatÃ³rios." });
      return;
    }
    
    setIsScheduling(true);
    try {
      if (newFollowUpDonorId === "all_in_class" || newFollowUpDonorId.startsWith("all:")) {
        const targetClassification = newFollowUpDonorId.startsWith("all:")
          ? newFollowUpDonorId.split(":")[1]
          : newFollowUpClassification;
        const targets = donors.filter(d => targetClassification === "all" || d.type === targetClassification);
        if (targets.length === 0) {
          toast({ title: "Nenhum doador encontrado nesta classificaÃ§Ã£o." });
          setIsScheduling(false);
          return;
        }
        
        let successCount = 0;
        for (const d of targets) {
          try {
            await createFollowUp({
              donor_id: d.id,
              due_date: newFollowUpDate,
              status: "agendado",
              note: newFollowUpNote
            });
            successCount++;
          } catch (e) {
            console.error("Erro ao agendar em lote para", d.name, e);
          }
        }
        
        toast({ title: "Agendamento em Lote ConcluÃ­do!", description: `${successCount} follow-ups foram agendados com sucesso.` });
      } else {
        await createFollowUp({
          donor_id: parseInt(newFollowUpDonorId),
          due_date: newFollowUpDate,
          status: "agendado",
          note: newFollowUpNote
        });
        toast({ title: "Follow-up agendado com sucesso!" });
      }
      
      setScheduleDialogOpen(false);
      setNewFollowUpDonorId("");
      setNewFollowUpDate("");
      setNewFollowUpNote("");
    } catch (e: any) {
      toast({ title: "Erro ao agendar", description: e.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  useEffect(() => {
    const loadAutomationSettings = async () => {
      const { data } = await supabase.from('follow_up_settings').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setAutomationGlobal(data.enabled);
        if (data.rules) {
          // Merge database data with initial rules to restore icons and colors
          const dbRules = data.rules as any[];
          const mergedRules = initialAutomationRules.map(initial => {
            const dbRule = dbRules.find(r => r.type === initial.type);
            if (!dbRule) return initial;
            
            // Explicitly keep UI fields from 'initial' and settings from 'dbRule'
            return {
              ...initial,
              ...dbRule,
              icon: initial.icon,
              color: initial.color,
              bg: initial.bg,
              label: initial.label,
              rule: initial.rule
            };
          });
          setAutomationRules(mergedRules);
        }
      }
    };

    loadAutomationSettings();
  }, []);

  const handleSaveAutomation = async () => {
    // Strip UI components (icons, colors) before saving to DB
    const rulesToSave = automationRules.map(({ type, enabled, channel, template, sendHour, followUpDays, maxRetries }) => ({
      type, enabled, channel, template, sendHour, followUpDays, maxRetries
    }));

    const { error } = await supabase
      .from('follow_up_settings')
      .upsert({ 
        id: 1,
        enabled: automationGlobal,
        rules: rulesToSave as any,
        updated_at: new Date().toISOString()
      });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ConfiguraÃ§Ãµes salvas", description: "As regras de automaÃ§Ã£o foram atualizadas no servidor." });
    }
  };

  const handleProcessNow = async () => {
    setIsProcessingNow(true);
    try {
      const { data: res, error: callError } = await supabase.functions.invoke('process-followups', {
        body: { manual: true }
      });

      if (callError) throw new Error(callError.message);

      await queryClient.refetchQueries({ queryKey: ['followups'] });
      await queryClient.refetchQueries({ queryKey: ['followup-logs'] });

      if (res?.sent > 0) {
        toast({ title: "Sucesso!", description: `${res.sent} mensagens enviadas e fila atualizada!` });
      } else if (res?.failed > 0) {
        toast({ title: "Aviso", description: `0 enviadas, ${res.failed} falhas. Verifique o HistÃ³rico.`, variant: "destructive" });
      } else {
        toast({ title: "Fila Vazia", description: "NÃ£o hÃ¡ follow-ups pendentes para hoje." });
      }
    } catch (err: any) {
      toast({ title: "Erro de ConexÃ£o", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessingNow(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const effectiveStatus = (followUp: { status?: string; due_date: string }) => {
    const status = followUp.status?.toLowerCase() || "pendente";
    return status !== "enviado" && followUp.due_date < today ? "atrasado" : status;
  };

  const realStats = [
    { label: "Pendentes", value: dbFollowUps.filter(f => effectiveStatus(f) === "pendente").length, icon: Clock, color: "text-amber-600" },
    { label: "Agendados", value: dbFollowUps.filter(f => effectiveStatus(f) === "agendado").length, icon: CalendarClock, color: "text-primary" },
    { label: "Atrasados", value: dbFollowUps.filter(f => effectiveStatus(f) === "atrasado").length, icon: AlertTriangle, color: "text-destructive" },
    { label: "ConcluÃ­dos", value: dbFollowUps.filter(f => f.status?.toLowerCase() === "enviado").length, icon: CheckCircle2, color: "text-green-600" },
  ];

  const followUpList = dbFollowUps.map(f => ({
    ...f,
    status: effectiveStatus(f),
    dueDate: f.due_date,
    donorName: f.donors?.name || 'Doador Desconhecido',
    phone: f.donors?.phone || '',
    donorType: (f as any).donorType || "unico",
    lastDonation: (f as any).lastDonation || "Nunca",
    lastContact: (f as any).last_date || "Sem contato",
    channel: "whatsapp",
    totalDonations: (f as any).totalDonations || 0,
    campaign: (f as any).campaign || "Geral"
  }));

  const filtered = followUpList.filter((f) => {
    const s = f.status?.toLowerCase();
    if (s === 'enviado') return false; // enviados sÃ³ aparecem no histÃ³rico
    if (filterType !== "all" && f.donorType !== filterType) return false;
    if (filterStatus !== "all" && s !== filterStatus) return false;
    return true;
  });

  const completionRate = followUpList.length > 0 ? Math.round(
    (followUpList.filter(f => f.status === "enviado").length / followUpList.length) * 100
  ) : 0;

  const toggleRuleEnabled = (type: DonorType) => {
    setAutomationRules(prev => prev.map(r => r.type === type ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRuleChannel = (type: DonorType, channel: FollowUpChannel) => {
    setAutomationRules(prev => prev.map(r => r.type === type ? { ...r, channel } : r));
  };

  const updateRuleSendHour = (type: DonorType, sendHour: string) => {
    setAutomationRules(prev => prev.map(r => r.type === type ? { ...r, sendHour } : r));
  };

  const updateRuleRetries = (type: DonorType, maxRetries: number) => {
    setAutomationRules(prev => prev.map(r => r.type === type ? { ...r, maxRetries } : r));
  };

  const activeRulesCount = automationRules.filter(r => r.enabled).length;
  const totalSent = dbLogs.filter(l => l.status === "enviado").length;
  const totalFailed = dbLogs.filter(l => l.status === "falha").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Follow-ups</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie o acompanhamento dos doadores com base na classificaÃ§Ã£o automÃ¡tica.
          </p>
        </div>
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <CalendarClock className="w-4 h-4 mr-2" /> Agendar Follow-up
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Novo Follow-up</DialogTitle>
              <DialogDescription>
                Selecione um doador e defina uma data para o prÃ³ximo contato.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Filtrar por ClassificaÃ§Ã£o</Label>
                <Select value={newFollowUpClassification} onValueChange={setNewFollowUpClassification}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as classificaÃ§Ãµes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as classificaÃ§Ãµes</SelectItem>
                    <SelectItem value="unico">Doador Ãšnico</SelectItem>
                    <SelectItem value="esporadico">Doador EsporÃ¡dico</SelectItem>
                    <SelectItem value="recorrente">Doador Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Doador</Label>
                <Select value={newFollowUpDonorId} onValueChange={setNewFollowUpDonorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um doador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all:recorrente" className="font-bold text-green-700">
                      Todos recorrentes ({donors.filter(d => d.type === "recorrente").length} doadores)
                    </SelectItem>
                    <SelectItem value="all:esporadico" className="font-bold text-orange-700">
                      Todos esporÃ¡dicos ({donors.filter(d => d.type === "esporadico").length} doadores)
                    </SelectItem>
                    <SelectItem value="all:unico" className="font-bold text-blue-700">
                      Todos Ãºnicos ({donors.filter(d => d.type === "unico").length} doadores)
                    </SelectItem>
                    {newFollowUpClassification !== "all" && (
                      <SelectItem value="all_in_class" className="font-bold text-blue-600">
                        Todos desta classificaÃ§Ã£o ({donors.filter(d => d.type === newFollowUpClassification).length} doadores)
                      </SelectItem>
                    )}
                    {newFollowUpClassification === "all" && (
                      <SelectItem value="all_in_class" className="font-bold text-blue-600">
                        Todos os doadores cadastrados ({donors.length} doadores)
                      </SelectItem>
                    )}
                    {donors
                      .filter(d => newFollowUpClassification === "all" || d.type === newFollowUpClassification)
                      .map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Contato</Label>
                <Input type="date" value={newFollowUpDate} onChange={(e) => setNewFollowUpDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ObservaÃ§Ã£o prÃ©via</Label>
                <Textarea 
                  placeholder="Motivo ou lembrete para o follow-up..." 
                  value={newFollowUpNote}
                  onChange={(e) => setNewFollowUpNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={isScheduling}>Cancelar</Button>
              <Button onClick={handleCreateFollowUp} disabled={isScheduling}>
                {isScheduling ? "Agendando..." : "Agendar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {realStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Taxa de conclusÃ£o */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Taxa de ConclusÃ£o de Follow-ups</span>
            <span className="text-sm font-bold text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Follow-ups</TabsTrigger>
          <TabsTrigger value="automacao" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" /> AutomaÃ§Ã£o
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5">
            <History className="w-3.5 h-3.5" /> HistÃ³rico de Envios
          </TabsTrigger>
          <TabsTrigger value="regras">Regras de ClassificaÃ§Ã£o</TabsTrigger>
        </TabsList>

        {/* Tab Lista */}
        <TabsContent value="lista" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Fila de Follow-ups</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo de doador" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="unico">Ãšnico</SelectItem>
                      <SelectItem value="esporadico">EsporÃ¡dico</SelectItem>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doador</TableHead>
                    <TableHead>ClassificaÃ§Ã£o</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => {
                    const ChannelIcon = channelIcon[f.channel];
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{f.donors?.name || 'Desconhecido'}</p>
                            <p className="text-xs text-muted-foreground">{f.donors?.phone || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={donorTypeBadge[f.donorType]}>{donorTypeLabel[f.donorType]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ChannelIcon className="w-4 h-4" />
                            <span className="text-xs capitalize">{f.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{f.campaign}</TableCell>
                        <TableCell className="text-sm">{new Date(f.dueDate).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[f.status]}`}>
                            {statusLabel[f.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openFollowUpDetails(f)}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum follow-up encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab AutomaÃ§Ã£o */}
        <TabsContent value="automacao" className="space-y-4">
          {/* Status global */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${automationGlobal ? "bg-green-100" : "bg-muted"}`}>
                    {automationGlobal ? <Play className="w-5 h-5 text-green-600" /> : <Pause className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        AutomaÃ§Ã£o {automationGlobal ? "Ativa" : "Pausada"}
                      </p>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 animate-pulse">
                        MODO TESTE: ENVIO DIRETO
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {automationGlobal
                        ? `${activeRulesCount} regra(s) ativa(s) Â· Mensagens enviadas automaticamente ao atingir o prazo`
                        : "Nenhuma mensagem serÃ¡ enviada automaticamente"}
                    </p>
                  </div>
                </div>
                <Switch checked={automationGlobal} onCheckedChange={setAutomationGlobal} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleProcessNow} disabled={isProcessingNow} className="gap-2">
              <Zap className={`w-4 h-4 ${isProcessingNow ? "animate-spin" : ""}`} /> 
              {isProcessingNow ? "Processando..." : "Processar Agora (Manual)"}
            </Button>
            <Button onClick={handleSaveAutomation}>
              <Save className="w-4 h-4 mr-2" /> Salvar ConfiguraÃ§Ãµes
            </Button>
          </div>

          {/* KPIs de automaÃ§Ã£o */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-green-100 text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalSent}</p>
                  <p className="text-sm text-muted-foreground">Enviados automaticamente</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-red-100 text-destructive"><AlertTriangle className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalFailed}</p>
                  <p className="text-sm text-muted-foreground">Falhas de envio</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><Settings2 className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{activeRulesCount}/3</p>
                  <p className="text-sm text-muted-foreground">Regras ativas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regras de automaÃ§Ã£o */}
          <div className="grid gap-4 md:grid-cols-3">
            {automationRules.map((rule) => (
              <Card key={rule.type} className={!automationGlobal || !rule.enabled ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${rule.bg}`}>
                        <rule.icon className={`w-5 h-5 ${rule.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">Doador {rule.label}</CardTitle>
                        <CardDescription className="text-xs">{rule.rule}</CardDescription>
                      </div>
                    </div>
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRuleEnabled(rule.type)} disabled={!automationGlobal} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Disparo automÃ¡tico apÃ³s</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.followUpDays <= 30 ? "destructive" : rule.followUpDays <= 60 ? "default" : "secondary"}>
                        {rule.followUpDays} dias
                      </Badge>
                      <span className="text-xs text-muted-foreground">da Ãºltima doaÃ§Ã£o</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Canal de envio</Label>
                    <Select value={rule.channel} onValueChange={(v) => updateRuleChannel(rule.type, v as FollowUpChannel)} disabled={!automationGlobal || !rule.enabled}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="telefone">Telefone (lembrete)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">HorÃ¡rio de envio</Label>
                    <Input type="time" value={rule.sendHour} onChange={(e) => updateRuleSendHour(rule.type, e.target.value)} className="h-8 text-xs" disabled={!automationGlobal || !rule.enabled} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tentativas mÃ¡ximas</Label>
                    <Select value={String(rule.maxRetries)} onValueChange={(v) => updateRuleRetries(rule.type, Number(v))} disabled={!automationGlobal || !rule.enabled}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 tentativa</SelectItem>
                        <SelectItem value="2">2 tentativas</SelectItem>
                        <SelectItem value="3">3 tentativas</SelectItem>
                        <SelectItem value="5">5 tentativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Template</Label>
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded">{rule.template}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Como funciona a automaÃ§Ã£o</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>O sistema verifica diariamente os doadores que atingiram o prazo de follow-up.</li>
                    <li>WhatsApp é enviado automaticamente; telefone e e-mail geram lembretes para atendimento manual.</li>
                    <li>Somente doadores com <strong className="text-foreground">opt-in ativo</strong> recebem mensagens.</li>
                    <li>Em caso de falha, o sistema tenta novamente atÃ© o limite de tentativas configurado.</li>
                    <li>Follow-ups manuais continuam funcionando normalmente na aba "Lista".</li>
                  </ul>
                  <p className="text-xs mt-2 text-amber-600">âš ï¸ Para ativar o envio real, habilite o Lovable Cloud e configure a API do WhatsApp na pÃ¡gina de IntegraÃ§Ãµes.</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Tab HistÃ³rico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">HistÃ³rico de Envios AutomÃ¡ticos</CardTitle>
              <CardDescription>Registro de todas as mensagens disparadas automaticamente pelo sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doador</TableHead>
                    <TableHead>ClassificaÃ§Ã£o</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dbLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhum envio registrado no histÃ³rico.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dbLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.donor_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={donorTypeBadge[log.donor_type || 'unico']}>
                            {donorTypeLabel[log.donor_type || 'unico']}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs">WhatsApp</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.template || "PadrÃ£o"}</TableCell>
                        <TableCell className="text-sm">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString('pt-BR') : 'Agora'}
                        </TableCell>
                        <TableCell className="text-sm text-center">{log.retry_count || 0}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${logStatusColor[log.status || 'aguardando']}`}>
                            {log.status === "enviado" ? "Enviado" : log.status === "falha" ? "Falha" : "Aguardando"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Regras */}
        <TabsContent value="regras" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {initialAutomationRules.map((rule) => (
              <Card key={rule.type}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${rule.bg}`}>
                      <rule.icon className={`w-6 h-6 ${rule.color}`} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">Doador {rule.label}</h3>
                      <p className="text-xs text-muted-foreground">{rule.rule}</p>
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Follow-up automÃ¡tico</span>
                      <span className="font-medium text-foreground">{rule.followUpDays} dias</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prioridade</span>
                      <Badge variant={rule.followUpDays <= 30 ? "destructive" : rule.followUpDays <= 60 ? "default" : "secondary"}>
                        {rule.followUpDays <= 30 ? "Alta" : rule.followUpDays <= 60 ? "MÃ©dia" : "Baixa"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funciona a classificaÃ§Ã£o</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>O sistema classifica automaticamente os doadores com base no histÃ³rico de doaÃ§Ãµes e agenda follow-ups de acordo com as regras configuradas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Doador Ãšnico:</strong> Realizou apenas 1 doaÃ§Ã£o. Follow-up em 90 dias para incentivar nova contribuiÃ§Ã£o.</li>
                <li><strong className="text-foreground">Doador EsporÃ¡dico:</strong> 2 ou mais doaÃ§Ãµes nos Ãºltimos 6 meses. Follow-up em 60 dias para manter engajamento.</li>
                <li><strong className="text-foreground">Doador Recorrente:</strong> 3 ou mais doaÃ§Ãµes nos Ãºltimos 3 meses. Follow-up em 30 dias para fidelizaÃ§Ã£o e upgrade.</li>
              </ul>
              <p>Os follow-ups podem ser realizados via <strong className="text-foreground">telefone</strong>, <strong className="text-foreground">WhatsApp</strong> ou <strong className="text-foreground">e-mail</strong>, de acordo com a preferÃªncia do doador.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedFollowUp && (
            <>
              <DialogHeader>
                <DialogTitle>Follow-up â€” {selectedFollowUp.donorName}</DialogTitle>
                <DialogDescription>
                  Doador {donorTypeLabel[selectedFollowUp.donorType]} Â· {selectedFollowUp.totalDonations} doaÃ§Ãµes realizadas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedFollowUp.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{selectedFollowUp.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ãšltima doaÃ§Ã£o</Label>
                    <p className="font-medium">{selectedFollowUp.lastDonation ? new Date(`${selectedFollowUp.lastDonation}T12:00:00`).toLocaleDateString("pt-BR") : "Sem registro"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ãšltimo contato</Label>
                    <p className="font-medium">{selectedFollowUp.lastContact && selectedFollowUp.lastContact !== "Sem contato" ? new Date(selectedFollowUp.lastContact).toLocaleDateString("pt-BR") : "Sem contato"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Campanha</Label>
                    <p className="font-medium">{selectedFollowUp.campaign}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Canal preferido</Label>
                    <p className="font-medium capitalize">{selectedFollowUp.channel}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">ObservaÃ§Ãµes</Label>
                  <p className="text-sm mt-1">{selectedFollowUp.note || "Sem observações"}</p>
                </div>
                <div>
                  <Label>Registrar contato</Label>
                  <Textarea placeholder="Descreva o resultado do contato..." className="mt-1" value={contactNote} onChange={(event) => setContactNote(event.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Novo status</Label>
                    <Select value={contactStatus} onValueChange={(value) => setContactStatus(value as FollowUpStatus)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="enviado">ConcluÃ­do</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>PrÃ³ximo contato</Label>
                    <Input type="date" className="mt-1" value={nextContactDate} onChange={(event) => setNextContactDate(event.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSavingContact}>Cancelar</Button>
                <Button onClick={handleSaveContact} disabled={isSavingContact}>{isSavingContact ? "Salvando..." : "Salvar Registro"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUps;


