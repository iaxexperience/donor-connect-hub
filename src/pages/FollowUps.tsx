import { useState } from "react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type DonorType = "unico" | "esporadico" | "recorrente";
type FollowUpStatus = "pendente" | "agendado" | "concluido" | "atrasado";
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
  { id: 1, donorName: "Maria Silva", donorType: "recorrente", phone: "(11) 99888-1234", email: "maria@email.com", lastDonation: "2026-03-25", lastContact: "2026-03-28", dueDate: "2026-04-10", status: "pendente", channel: "whatsapp", campaign: "Natal Solidário", totalDonations: 12, notes: "Doadora fiel, prefere WhatsApp" },
  { id: 2, donorName: "João Santos", donorType: "unico", phone: "(21) 98777-5678", email: "joao@email.com", lastDonation: "2026-01-15", lastContact: "2026-01-20", dueDate: "2026-04-15", status: "agendado", channel: "telefone", campaign: "Educação para Todos", totalDonations: 1, notes: "Primeira doação, abordar com cuidado" },
  { id: 3, donorName: "Ana Oliveira", donorType: "esporadico", phone: "(31) 97666-9012", email: "ana@email.com", lastDonation: "2026-02-10", lastContact: "2026-02-15", dueDate: "2026-04-05", status: "atrasado", channel: "email", campaign: "Alimentação Infantil", totalDonations: 3, notes: "Preferência por e-mail" },
  { id: 4, donorName: "Carlos Mendes", donorType: "recorrente", phone: "(41) 96555-3456", email: "carlos@email.com", lastDonation: "2026-03-30", lastContact: "2026-04-01", dueDate: "2026-04-12", status: "pendente", channel: "telefone", campaign: "Natal Solidário", totalDonations: 8, notes: "Disponível após 18h" },
  { id: 5, donorName: "Patrícia Lima", donorType: "unico", phone: "(51) 95444-7890", email: "patricia@email.com", lastDonation: "2025-12-20", lastContact: "2025-12-22", dueDate: "2026-03-20", status: "atrasado", channel: "whatsapp", campaign: "Educação para Todos", totalDonations: 1, notes: "Sem resposta anterior" },
  { id: 6, donorName: "Roberto Alves", donorType: "esporadico", phone: "(61) 94333-2345", email: "roberto@email.com", lastDonation: "2026-03-01", lastContact: "2026-03-05", dueDate: "2026-04-08", status: "concluido", channel: "telefone", campaign: "Alimentação Infantil", totalDonations: 4, notes: "Confirmou interesse em recorrência" },
  { id: 7, donorName: "Fernanda Costa", donorType: "recorrente", phone: "(71) 93222-6789", email: "fernanda@email.com", lastDonation: "2026-04-01", lastContact: "2026-04-03", dueDate: "2026-04-15", status: "agendado", channel: "whatsapp", campaign: "Natal Solidário", totalDonations: 15, notes: "Top doadora, tratamento VIP" },
];

const initialAutomationRules: AutomationRule[] = [
  { type: "unico", label: "Único", rule: "1 doação registrada", followUpDays: 90, enabled: true, channel: "whatsapp", template: "follow_up_primeiro_doador", color: "text-amber-600", bg: "bg-amber-100", icon: UserMinus, maxRetries: 2, sendHour: "10:00" },
  { type: "esporadico", label: "Esporádico", rule: "2+ doações em 6 meses", followUpDays: 60, enabled: true, channel: "whatsapp", template: "follow_up_engajamento", color: "text-blue-600", bg: "bg-blue-100", icon: Users, maxRetries: 3, sendHour: "14:00" },
  { type: "recorrente", label: "Recorrente", rule: "3+ doações em 3 meses", followUpDays: 30, enabled: true, channel: "whatsapp", template: "follow_up_fidelizacao", color: "text-green-600", bg: "bg-green-100", icon: UserCheck, maxRetries: 1, sendHour: "09:00" },
];

const automationLogs: AutomationLog[] = [
  { id: 1, donorName: "Maria Silva", donorType: "recorrente", channel: "whatsapp", template: "follow_up_fidelizacao", sentAt: "2026-04-10 09:00", status: "enviado", retryCount: 0 },
  { id: 2, donorName: "Carlos Mendes", donorType: "recorrente", channel: "whatsapp", template: "follow_up_fidelizacao", sentAt: "2026-04-10 09:01", status: "enviado", retryCount: 0 },
  { id: 3, donorName: "Ana Oliveira", donorType: "esporadico", channel: "whatsapp", template: "follow_up_engajamento", sentAt: "2026-04-05 14:00", status: "falha", retryCount: 2 },
  { id: 4, donorName: "João Santos", donorType: "unico", channel: "whatsapp", template: "follow_up_primeiro_doador", sentAt: "2026-04-09 10:00", status: "aguardando", retryCount: 0 },
  { id: 5, donorName: "Patrícia Lima", donorType: "unico", channel: "whatsapp", template: "follow_up_primeiro_doador", sentAt: "2026-03-20 10:00", status: "falha", retryCount: 2 },
  { id: 6, donorName: "Roberto Alves", donorType: "esporadico", channel: "whatsapp", template: "follow_up_engajamento", sentAt: "2026-04-08 14:00", status: "enviado", retryCount: 0 },
  { id: 7, donorName: "Fernanda Costa", donorType: "recorrente", channel: "whatsapp", template: "follow_up_fidelizacao", sentAt: "2026-04-03 09:00", status: "enviado", retryCount: 0 },
];

const donorTypeLabel: Record<string, string> = { unico: "Único", esporadico: "Esporádico", recorrente: "Recorrente" };
const donorTypeBadge: Record<string, string> = { 
  unico: "bg-blue-100 text-blue-700 border-blue-200", 
  esporadico: "bg-orange-100 text-orange-700 border-orange-200", 
  recorrente: "bg-green-100 text-green-700 border-green-200" 
};
const statusLabel: Record<string, string> = { pendente: "Pendente", agendado: "Agendado", concluido: "Concluído", atrasado: "Atrasado" };
const statusColor: Record<string, string> = { pendente: "bg-amber-100 text-amber-800", agendado: "bg-blue-100 text-blue-800", concluido: "bg-green-100 text-green-800", atrasado: "bg-red-100 text-red-800" };
const channelIcon: Record<string, any> = { telefone: Phone, whatsapp: MessageSquare, email: Mail };
const logStatusColor: Record<string, string> = { enviado: "bg-green-100 text-green-800", falha: "bg-red-100 text-red-800", aguardando: "bg-amber-100 text-amber-800" };

import { useFollowUps } from "@/hooks/useFollowUps";

const FollowUps = () => {
  const { followUps: dbFollowUps, isLoading, updateFollowUp } = useFollowUps();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [automationRules, setAutomationRules] = useState(initialAutomationRules);
  const [automationGlobal, setAutomationGlobal] = useState(true);
  const { toast } = useToast();

  const realStats = [
    { label: "Pendentes", value: dbFollowUps.filter(f => f.status === "pendente").length, icon: Clock, color: "text-amber-600" },
    { label: "Agendados", value: dbFollowUps.filter(f => f.status === "agendado").length, icon: CalendarClock, color: "text-primary" },
    { label: "Atrasados", value: dbFollowUps.filter(f => f.status === "atrasado").length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Concluídos", value: dbFollowUps.filter(f => f.status === "concluido").length, icon: CheckCircle2, color: "text-green-600" },
  ];

  const followUpList = dbFollowUps.map(f => ({
    ...f,
    dueDate: f.due_date,
    donorType: (f as any).donorType || "unico",
    lastDonation: (f as any).lastDonation || "Nunca",
    lastContact: (f as any).last_date || "Sem contato",
    channel: "whatsapp",
    totalDonations: (f as any).totalDonations || 0,
    campaign: (f as any).campaign || "Geral"
  }));

  const filtered = followUpList.filter((f) => {
    if (filterType !== "all" && f.donorType !== filterType) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });


  const completionRate = followUpList.length > 0 ? Math.round(
    (followUpList.filter(f => f.status === "concluido").length / followUpList.length) * 100
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
  const totalSent = automationLogs.filter(l => l.status === "enviado").length;
  const totalFailed = automationLogs.filter(l => l.status === "falha").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Follow-ups</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie o acompanhamento dos doadores com base na classificação automática.
          </p>
        </div>
        <Button className="bg-primary">
          <CalendarClock className="w-4 h-4 mr-2" /> Agendar Follow-up
        </Button>
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

      {/* Taxa de conclusão */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Taxa de Conclusão de Follow-ups</span>
            <span className="text-sm font-bold text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Follow-ups</TabsTrigger>
          <TabsTrigger value="automacao" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Automação
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5">
            <History className="w-3.5 h-3.5" /> Histórico de Envios
          </TabsTrigger>
          <TabsTrigger value="regras">Regras de Classificação</TabsTrigger>
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
                      <SelectItem value="unico">Único</SelectItem>
                      <SelectItem value="esporadico">Esporádico</SelectItem>
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
                      <SelectItem value="concluido">Concluído</SelectItem>
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
                    <TableHead>Classificação</TableHead>
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
                            <p className="font-medium">{f.donorName}</p>
                            <p className="text-xs text-muted-foreground">{f.phone}</p>
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
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedFollowUp(f); setDialogOpen(true); }}>
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

        {/* Tab Automação */}
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
                    <p className="font-medium text-foreground">
                      Automação {automationGlobal ? "Ativa" : "Pausada"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {automationGlobal
                        ? `${activeRulesCount} regra(s) ativa(s) · Mensagens enviadas automaticamente ao atingir o prazo`
                        : "Nenhuma mensagem será enviada automaticamente"}
                    </p>
                  </div>
                </div>
                <Switch checked={automationGlobal} onCheckedChange={setAutomationGlobal} />
              </div>
            </CardContent>
          </Card>

          {/* KPIs de automação */}
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

          {/* Regras de automação */}
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
                    <Label className="text-xs text-muted-foreground">Disparo automático após</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.followUpDays <= 30 ? "destructive" : rule.followUpDays <= 60 ? "default" : "secondary"}>
                        {rule.followUpDays} dias
                      </Badge>
                      <span className="text-xs text-muted-foreground">da última doação</span>
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
                    <Label className="text-xs text-muted-foreground">Horário de envio</Label>
                    <Input type="time" value={rule.sendHour} onChange={(e) => updateRuleSendHour(rule.type, e.target.value)} className="h-8 text-xs" disabled={!automationGlobal || !rule.enabled} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tentativas máximas</Label>
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
                  <p className="font-medium text-foreground">Como funciona a automação</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>O sistema verifica diariamente os doadores que atingiram o prazo de follow-up.</li>
                    <li>Mensagens são enviadas automaticamente via o canal configurado, usando templates pré-aprovados.</li>
                    <li>Somente doadores com <strong className="text-foreground">opt-in ativo</strong> recebem mensagens.</li>
                    <li>Em caso de falha, o sistema tenta novamente até o limite de tentativas configurado.</li>
                    <li>Follow-ups manuais continuam funcionando normalmente na aba "Lista".</li>
                  </ul>
                  <p className="text-xs mt-2 text-amber-600">⚠️ Para ativar o envio real, habilite o Lovable Cloud e configure a API do WhatsApp na página de Integrações.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => toast({ title: "Configurações salvas", description: "As regras de automação foram atualizadas com sucesso." })}>
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Tab Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Envios Automáticos</CardTitle>
              <CardDescription>Registro de todas as mensagens disparadas automaticamente pelo sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doador</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationLogs.map((log) => {
                    const ChannelIcon = channelIcon[log.channel];
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.donorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={donorTypeBadge[log.donorType]}>{donorTypeLabel[log.donorType]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ChannelIcon className="w-4 h-4" />
                            <span className="text-xs capitalize">{log.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.template}</TableCell>
                        <TableCell className="text-sm">{log.sentAt}</TableCell>
                        <TableCell className="text-sm text-center">{log.retryCount}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${logStatusColor[log.status]}`}>
                            {log.status === "enviado" ? "Enviado" : log.status === "falha" ? "Falha" : "Aguardando"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                      <span className="text-muted-foreground">Follow-up automático</span>
                      <span className="font-medium text-foreground">{rule.followUpDays} dias</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prioridade</span>
                      <Badge variant={rule.followUpDays <= 30 ? "destructive" : rule.followUpDays <= 60 ? "default" : "secondary"}>
                        {rule.followUpDays <= 30 ? "Alta" : rule.followUpDays <= 60 ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funciona a classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>O sistema classifica automaticamente os doadores com base no histórico de doações e agenda follow-ups de acordo com as regras configuradas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Doador Único:</strong> Realizou apenas 1 doação. Follow-up em 90 dias para incentivar nova contribuição.</li>
                <li><strong className="text-foreground">Doador Esporádico:</strong> 2 ou mais doações nos últimos 6 meses. Follow-up em 60 dias para manter engajamento.</li>
                <li><strong className="text-foreground">Doador Recorrente:</strong> 3 ou mais doações nos últimos 3 meses. Follow-up em 30 dias para fidelização e upgrade.</li>
              </ul>
              <p>Os follow-ups podem ser realizados via <strong className="text-foreground">telefone</strong>, <strong className="text-foreground">WhatsApp</strong> ou <strong className="text-foreground">e-mail</strong>, de acordo com a preferência do doador.</p>
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
                <DialogTitle>Follow-up — {selectedFollowUp.donorName}</DialogTitle>
                <DialogDescription>
                  Doador {donorTypeLabel[selectedFollowUp.donorType]} · {selectedFollowUp.totalDonations} doações realizadas
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
                    <Label className="text-muted-foreground">Última doação</Label>
                    <p className="font-medium">{new Date(selectedFollowUp.lastDonation).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Último contato</Label>
                    <p className="font-medium">{new Date(selectedFollowUp.lastContact).toLocaleDateString("pt-BR")}</p>
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
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1">{selectedFollowUp.notes}</p>
                </div>
                <div>
                  <Label>Registrar contato</Label>
                  <Textarea placeholder="Descreva o resultado do contato..." className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Novo status</Label>
                    <Select defaultValue={selectedFollowUp.status}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Próximo contato</Label>
                    <Input type="date" className="mt-1" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => setDialogOpen(false)}>Salvar Registro</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUps;
