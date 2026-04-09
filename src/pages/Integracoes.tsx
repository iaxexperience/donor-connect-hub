import { useState } from "react";
import {
  MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Users,
  FileText, Shield, CalendarClock, UserCheck, UserMinus, Clock,
  AlertTriangle, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const templateExamples = [
  {
    name: "boas_vindas_doador",
    category: "MARKETING",
    status: "Aprovado",
    body: "Olá {{1}}! 🎉 Obrigado por sua doação de {{2}} para a campanha {{3}}. Sua generosidade faz a diferença!",
  },
  {
    name: "follow_up_doacao",
    category: "MARKETING",
    status: "Aprovado",
    body: "Olá {{1}}, sentimos sua falta! Há {{2}} dias sua última contribuição impactou vidas. Que tal continuar fazendo a diferença?",
  },
  {
    name: "lembrete_campanha",
    category: "UTILITY",
    status: "Pendente",
    body: "Olá {{1}}, a campanha {{2}} está a {{3}} do encerramento. Faltam apenas {{4}} para atingir a meta!",
  },
];

type DonorType = "unico" | "esporadico" | "recorrente";
type FollowUpStatus = "pendente" | "agendado" | "enviado" | "atrasado";

interface WhatsAppFollowUp {
  id: number;
  donorName: string;
  donorType: DonorType;
  phone: string;
  lastDonation: string;
  dueDate: string;
  status: FollowUpStatus;
  template: string;
  optIn: boolean;
  selected: boolean;
}

const initialFollowUps: WhatsAppFollowUp[] = [
  { id: 1, donorName: "Maria Silva", donorType: "recorrente", phone: "5511998881234", lastDonation: "2026-03-25", dueDate: "2026-04-10", status: "pendente", template: "follow_up_doacao", optIn: true, selected: false },
  { id: 2, donorName: "João Santos", donorType: "unico", phone: "5521987775678", lastDonation: "2026-01-15", dueDate: "2026-04-15", status: "agendado", template: "follow_up_doacao", optIn: true, selected: false },
  { id: 3, donorName: "Ana Oliveira", donorType: "esporadico", phone: "5531976669012", lastDonation: "2026-02-10", dueDate: "2026-04-05", status: "atrasado", template: "follow_up_doacao", optIn: true, selected: false },
  { id: 4, donorName: "Carlos Mendes", donorType: "recorrente", phone: "5541965553456", lastDonation: "2026-03-30", dueDate: "2026-04-12", status: "pendente", template: "follow_up_doacao", optIn: true, selected: false },
  { id: 5, donorName: "Patrícia Lima", donorType: "unico", phone: "5551954447890", lastDonation: "2025-12-20", dueDate: "2026-03-20", status: "atrasado", template: "follow_up_doacao", optIn: false, selected: false },
  { id: 6, donorName: "Roberto Alves", donorType: "esporadico", phone: "5561943332345", lastDonation: "2026-03-01", dueDate: "2026-04-08", status: "enviado", template: "follow_up_doacao", optIn: true, selected: false },
  { id: 7, donorName: "Fernanda Costa", donorType: "recorrente", phone: "5571932226789", lastDonation: "2026-04-01", dueDate: "2026-04-15", status: "agendado", template: "follow_up_doacao", optIn: true, selected: false },
];

const donorTypeLabel: Record<DonorType, string> = { unico: "Único", esporadico: "Esporádico", recorrente: "Recorrente" };
const donorTypeBadge: Record<DonorType, "outline" | "default" | "secondary"> = { unico: "outline", esporadico: "default", recorrente: "secondary" };
const statusLabel: Record<FollowUpStatus, string> = { pendente: "Pendente", agendado: "Agendado", enviado: "Enviado", atrasado: "Atrasado" };
const statusColor: Record<FollowUpStatus, string> = { pendente: "bg-amber-100 text-amber-800", agendado: "bg-blue-100 text-blue-800", enviado: "bg-green-100 text-green-800", atrasado: "bg-red-100 text-red-800" };

const Integracoes = () => {
  const [connected, setConnected] = useState(true);
  const [phoneNumberId, setPhoneNumberId] = useState("123456789");
  const [businessAccountId, setBusinessAccountId] = useState("987654321");
  const [testNumber, setTestNumber] = useState("");
  const [optInEnabled, setOptInEnabled] = useState(true);
  const [isAutoEnabled, setIsAutoEnabled] = useState(true);
  
  const [followUpList, setFollowUpList] = useState<WhatsAppFollowUp[]>(() => {
    const saved = localStorage.getItem("doacflow_followups");
    if (!saved) return [];
    return JSON.parse(saved).map((f: any) => ({
      ...f,
      donorType: f.classification || "unico",
      status: f.status || "pendente",
      template: "follow_up_doacao",
      optIn: true,
      selected: false
    }));
  });

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("doacflow_followups", JSON.stringify(followUpList));
  }, [followUpList]);

  const processAutomations = () => {
    if (!isAutoEnabled) return;

    const now = new Date();
    let updatedCount = 0;

    const newList = followUpList.map(f => {
      if (f.status === "pendente" && new Date(f.dueDate) <= now) {
        updatedCount++;
        return { ...f, status: "enviado" as FollowUpStatus };
      }
      return f;
    });

    if (updatedCount > 0) {
      setFollowUpList(newList);
      toast({
        title: "Automação Processada",
        description: `${updatedCount} mensagem(ns) enviada(s) automaticamente (data de vencimento atingida).`,
      });
    } else {
      toast({
        title: "Nenhuma pendência",
        description: "Todos os follow-ups estão em dia.",
      });
    }
  };

  const handleConnect = () => {
    setConnected(true);
    toast({ title: "Conectado", description: "WhatsApp Business API conectada com sucesso." });
  };

  const handleTestMessage = () => {
    if (!testNumber) {
      toast({ title: "Número obrigatório", description: "Informe um número de WhatsApp para enviar a mensagem de teste.", variant: "destructive" });
      return;
    }
    toast({ title: "⚠️ Backend necessário", description: "Para enviar mensagens via WhatsApp, habilite o Lovable Cloud e configure o token de acesso da Meta." });
  };

  const filteredFollowUps = followUpList.filter((f) => {
    if (filterType !== "all" && f.donorType !== filterType) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  const toggleSelect = (id: number) => {
    setFollowUpList((prev) => prev.map((f) => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const toggleSelectAll = () => {
    const allSelected = filteredFollowUps.every((f) => f.selected);
    const ids = new Set(filteredFollowUps.map((f) => f.id));
    setFollowUpList((prev) => prev.map((f) => ids.has(f.id) ? { ...f, selected: !allSelected } : f));
  };

  const selectedCount = followUpList.filter((f) => f.selected).length;
  const selectedWithOptIn = followUpList.filter((f) => f.selected && f.optIn).length;

  const handleBulkSend = () => {
    if (selectedCount === 0) {
      toast({ title: "Nenhum selecionado", description: "Selecione pelo menos um doador para enviar.", variant: "destructive" });
      return;
    }
    if (selectedWithOptIn < selectedCount) {
      toast({
        title: "Opt-in pendente",
        description: `${selectedCount - selectedWithOptIn} doador(es) selecionado(s) não possuem opt-in. Apenas ${selectedWithOptIn} receberão a mensagem.`,
      });
    }
    toast({ title: "⚠️ Backend necessário", description: "Para envio em massa via WhatsApp, habilite o Lovable Cloud." });
  };

  const completionRate = Math.round((followUpList.filter((f) => f.status === "enviado").length / followUpList.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Integrações</h1>
          <p className="text-muted-foreground text-sm">WhatsApp Business API e follow-ups automáticos com doadores.</p>
        </div>
        <Badge variant={connected ? "default" : "outline"} className="gap-1.5">
          {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {connected ? "Conectado" : "Desconectado"}
        </Badge>
      </div>

      <Tabs defaultValue="followups" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="followups">Follow-ups WhatsApp</TabsTrigger>
          <div className="flex items-center gap-2 ml-auto px-2 border-l border-r mx-2">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Automação</span>
            <Switch checked={isAutoEnabled} onCheckedChange={setIsAutoEnabled} />
          </div>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="envio">Envio de Teste</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* --- Follow-ups WhatsApp --- */}
        <TabsContent value="followups" className="space-y-4">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Pendentes", value: followUpList.filter(f => f.status === "pendente").length, icon: Clock, color: "text-amber-600" },
              { label: "Agendados", value: followUpList.filter(f => f.status === "agendado").length, icon: CalendarClock, color: "text-primary" },
              { label: "Atrasados", value: followUpList.filter(f => f.status === "atrasado").length, icon: AlertTriangle, color: "text-destructive" },
              { label: "Enviados", value: followUpList.filter(f => f.status === "enviado").length, icon: CheckCircle2, color: "text-green-600" },
            ].map((s) => (
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

          {/* Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Taxa de Envio de Follow-ups</span>
                <div className="flex items-center gap-3">
                  {isAutoEnabled && (
                    <Button variant="outline" size="sm" onClick={processAutomations} className="h-7 text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Processar Pendências
                    </Button>
                  )}
                  <span className="text-sm font-bold text-primary">{completionRate}%</span>
                </div>
              </div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>

          {/* Regras de classificação */}
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { type: "Único", rule: "1 doação → follow-up em 90 dias", icon: UserMinus, color: "text-amber-600", bg: "bg-amber-100" },
              { type: "Esporádico", rule: "2+ doações/6 meses → 60 dias", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
              { type: "Recorrente", rule: "3+ doações/3 meses → 30 dias", icon: UserCheck, color: "text-green-600", bg: "bg-green-100" },
            ].map((r) => (
              <Card key={r.type}>
                <CardContent className="flex items-center gap-3 pt-4 pb-4">
                  <div className={`p-2 rounded-lg ${r.bg}`}>
                    <r.icon className={`w-4 h-4 ${r.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.type}</p>
                    <p className="text-xs text-muted-foreground">{r.rule}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela com seleção */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Fila de Follow-ups via WhatsApp</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="unico">Único</SelectItem>
                      <SelectItem value="esporadico">Esporádico</SelectItem>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredFollowUps.length > 0 && filteredFollowUps.every((f) => f.selected)}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Doador</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Opt-in</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowUps.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Checkbox checked={f.selected} onCheckedChange={() => toggleSelect(f.id)} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{f.donorName}</p>
                          <p className="text-xs text-muted-foreground">{f.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={donorTypeBadge[f.donorType]}>{donorTypeLabel[f.donorType]}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{f.template}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(f.dueDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {f.optIn ? (
                          <Badge variant="secondary" className="text-green-700 bg-green-100">Sim</Badge>
                        ) : (
                          <Badge variant="destructive">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[f.status]}`}>
                          {statusLabel[f.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredFollowUps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum follow-up encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Ações em massa */}
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedCount > 0
                    ? `${selectedCount} selecionado(s) · ${selectedWithOptIn} com opt-in`
                    : "Selecione doadores para enviar follow-up via WhatsApp"}
                </p>
                <div className="flex gap-2">
                  <Select defaultValue="follow_up_doacao">
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateExamples.filter(t => t.status === "Aprovado").map((t) => (
                        <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleBulkSend} disabled={selectedCount === 0}>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar ({selectedWithOptIn})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Configuração --- */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <CardTitle className="text-base">WhatsApp Business API</CardTitle>
              </div>
              <CardDescription>
                Conecte sua conta do WhatsApp Business para enviar mensagens automáticas e follow-ups aos doadores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-medium mb-1">Pré-requisitos:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Conta no <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Meta Business Suite <ExternalLink className="w-3 h-3" /></a></li>
                  <li>App criado no <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Produto "WhatsApp" adicionado ao app</li>
                  <li>Token de acesso permanente gerado</li>
                </ul>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input placeholder="Ex: 123456789012345" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Encontrado em WhatsApp → API Setup no painel da Meta.</p>
                </div>
                <div className="space-y-2">
                  <Label>Business Account ID</Label>
                  <Input placeholder="Ex: 987654321098765" value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value)} />
                  <p className="text-xs text-muted-foreground">ID da conta comercial do WhatsApp Business.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Webhook Verify Token</Label>
                <Input readOnly value="doacflow_webhook_verify_2026" className="font-mono text-sm bg-muted" />
                <p className="text-xs text-muted-foreground">Use este token ao configurar o webhook no painel da Meta.</p>
              </div>
              <Button onClick={handleConnect} className="w-full sm:w-auto">
                <MessageSquare className="w-4 h-4 mr-2" /> Conectar WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Templates --- */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Templates de Mensagem</CardTitle>
              </div>
              <CardDescription>Templates pré-aprovados pela Meta para comunicação proativa com doadores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateExamples.map((tpl) => (
                <div key={tpl.name} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{tpl.name}</span>
                      <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                    </div>
                    <Badge variant={tpl.status === "Aprovado" ? "default" : "secondary"}>{tpl.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted rounded p-3 font-mono">{tpl.body}</p>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">
                Os templates devem ser criados e aprovados no{" "}
                <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  Gerenciador de Templates da Meta <ExternalLink className="w-3 h-3" />
                </a>.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Envio de Teste --- */}
        <TabsContent value="envio" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Envio de Teste</CardTitle>
              </div>
              <CardDescription>Envie uma mensagem de teste para verificar a configuração.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input placeholder="5511999990000" value={testNumber} onChange={(e) => setTestNumber(e.target.value)} />
                <p className="text-xs text-muted-foreground">Formato internacional sem + (ex: 5511999990000).</p>
              </div>
              <div className="space-y-2">
                <Label>Mensagem (template hello_world)</Label>
                <Textarea readOnly value="Olá! Esta é uma mensagem de teste do DoacFlow via WhatsApp Business API. 🎉" className="bg-muted resize-none" rows={3} />
              </div>
              <Button onClick={handleTestMessage} variant="outline">
                <Send className="w-4 h-4 mr-2" /> Enviar Mensagem de Teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Compliance --- */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Compliance & Opt-in</CardTitle>
              </div>
              <CardDescription>Configurações de conformidade com as políticas da Meta e LGPD.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Opt-in obrigatório</p>
                  <p className="text-xs text-muted-foreground">Exigir consentimento explícito do doador antes de enviar mensagens via WhatsApp.</p>
                </div>
                <Switch checked={optInEnabled} onCheckedChange={setOptInEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Registrar opt-in no CRM</p>
                  <p className="text-xs text-muted-foreground">Salvar data e hora do consentimento no perfil do doador.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Janela de 24 horas</p>
                  <p className="text-xs text-muted-foreground">Respeitar a janela de conversa de 24h — fora dela, apenas templates aprovados.</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-medium mb-1">📋 Política da Meta</p>
                <p className="text-xs">
                  Mensagens proativas (fora da janela de 24h) só podem ser enviadas usando templates pré-aprovados. O doador deve ter dado opt-in explícito para receber comunicações.{" "}
                  <a href="https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/" target="_blank" rel="noopener noreferrer" className="underline">Saiba mais</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integracoes;
