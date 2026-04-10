import { useState, useEffect } from "react";
import {
  MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Users,
  FileText, Shield, CalendarClock, UserCheck, UserMinus, Clock,
  AlertTriangle, Phone, Settings2, Key, Globe, Database, CreditCard,
  RefreshCw, History, Info
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const donorTypeLabel: Record<DonorType, string> = { unico: "Único", esporadico: "Esporádico", recorrente: "Recorrente" };
const donorTypeStyle = (type: DonorType) => {
  switch (type) {
    case "recorrente": return "bg-green-100 text-green-700 border-green-200";
    case "esporadico": return "bg-orange-100 text-orange-700 border-orange-200";
    case "unico": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "";
  }
};

const statusLabel: Record<FollowUpStatus, string> = { pendente: "Pendente", agendado: "Agendado", enviado: "Enviado", atrasado: "Atrasado" };
const statusStyle: Record<FollowUpStatus, string> = { 
  pendente: "bg-amber-100 text-amber-800", 
  agendado: "bg-blue-100 text-blue-800", 
  enviado: "bg-green-100 text-green-800", 
  atrasado: "bg-red-100 text-red-800" 
};

const Integracoes = () => {
  const [waConnected, setWaConnected] = useState(true);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [isAutoEnabled, setIsAutoEnabled] = useState(true);
  const { toast } = useToast();

  const [followUpList, setFollowUpList] = useState<WhatsAppFollowUp[]>(() => {
    const saved = localStorage.getItem("doacflow_followups");
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((f: any) => ({
        ...f,
        donorType: f.classification || f.donorType || "unico",
        status: f.status || "pendente",
        template: "follow_up_doacao",
        optIn: true,
        selected: false
      }));
    } catch (e) {
      console.error("Failed to parse followups", e);
      return [];
    }
  });

  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    localStorage.setItem("doacflow_followups", JSON.stringify(followUpList));
  }, [followUpList]);

  const processAutomations = () => {
    if (!waConnected) {
      toast({ title: "Erro de Conexão", description: "WhatsApp Business API não está conectada.", variant: "destructive" });
      return;
    }

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
        title: "Disparo Automático Concluído",
        description: `${updatedCount} doadores receberam mensagens de follow-up via WhatsApp.`,
      });
    } else {
      toast({
        title: "Tudo em dia!",
        description: "Não há disparos agendados para este momento.",
      });
    }
  };

  const completionRate = followUpList.length > 0 
    ? Math.round((followUpList.filter((f) => f.status === "enviado").length / followUpList.length) * 100)
    : 0;

  const filteredFollowUps = followUpList.filter((f) => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 container mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl text-foreground">Hub de Integrações</h1>
          <p className="text-muted-foreground">Gerencie a inteligência de comunicação e automações do FAP Pulse.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Status Global</span>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`gap-1.5 border-none ${waConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${waConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                      WABA API
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>WhatsApp Business Account</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`gap-1.5 border-none ${asaasConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${asaasConnected ? "bg-green-500" : "bg-gray-400"}`} />
                      ASAAS
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Gateway de Pagamentos</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Separator orientation="vertical" className="h-10 mx-2" />
          <Button onClick={processAutomations} className="bg-primary shadow-glow hover:scale-105 transition-all">
            <RefreshCw className="w-4 h-4 mr-2" />
            Processar Agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Central - Automações */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Automação de Follow-up WhatsApp</CardTitle>
                    <CardDescription>Gestão proativa baseada na classificação de doadores.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-background p-1.5 rounded-full border shadow-sm">
                  <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase">Automação</span>
                  <Switch checked={isAutoEnabled} onCheckedChange={setIsAutoEnabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Pendentes", count: followUpList.filter(f => f.status === "pendente").length, color: "border-amber-500 text-amber-600" },
                  { label: "Atrasados", count: followUpList.filter(f => f.status === "atrasado").length, color: "border-red-500 text-red-600" },
                  { label: "Enviados", count: followUpList.filter(f => f.status === "enviado").length, color: "border-green-500 text-green-600" },
                  { label: "Taxa", count: `${completionRate}%`, color: "border-primary text-primary" },
                ].map((stat) => (
                  <div key={stat.label} className={`p-4 rounded-xl border-l-4 bg-muted/20 ${stat.color}`}>
                    <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">{stat.label}</p>
                    <p className="text-xl font-black">{stat.count}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Fila de Disparos</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="enviado">Enviados</SelectItem>
                      <SelectItem value="atrasado">Atrasados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[350px] border rounded-xl bg-background/50">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold">Doador</TableHead>
                        <TableHead className="text-[10px] font-bold">Classificação</TableHead>
                        <TableHead className="text-[10px] font-bold">Data Alvo</TableHead>
                        <TableHead className="text-[10px] font-bold text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFollowUps.length > 0 ? (
                        filteredFollowUps.map((f) => (
                          <TableRow key={f.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="text-sm font-semibold">{f.donorName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{f.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 border-none ${donorTypeStyle(f.donorType)}`}>
                                {donorTypeLabel[f.donorType]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(f.dueDate).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className={`text-[9px] px-1.5 py-0 border-none ${statusStyle[f.status]}`}>
                                {statusLabel[f.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs italic">
                            Nenhum registro encontrado na fila.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Configurações Técnicas */}
        <div className="space-y-6">
          <Card className="border-none shadow-soft">
            <CardHeader className="pb-3 border-b border-muted">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-md">Configurações Técnicas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="waba" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-9">
                  <TabsTrigger value="waba" className="text-xs">WhatsApp</TabsTrigger>
                  <TabsTrigger value="asaas" className="text-xs">ASAAS</TabsTrigger>
                </TabsList>

                <TabsContent value="waba" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone Number ID</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input className="pl-8 h-9 text-xs" placeholder="Ex: 123456789012345" defaultValue="425178224512901" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Access Token (WABA)</Label>
                      <div className="relative">
                        <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input type="password" className="pl-8 h-9 text-xs" defaultValue="EAAKlkj8921jkshdakj129837912jashdkjhaskjd" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Webhook Verify Token</Label>
                      <div className="flex gap-2">
                        <Input className="h-9 text-[10px] font-mono bg-muted" readOnly value="FAP_PULSE_WEBHOOK_2026" />
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Button className="w-full" variant={waConnected ? "outline" : "default"}>
                      {waConnected ? "Conectado" : "Conectar API"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="asaas" className="space-y-4">
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Integração Financeira</p>
                          <p className="text-[10px] text-blue-700 dark:text-blue-300">Conecte sua chave ASAAS para sincronizar recebimentos em tempo real.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">API ACCESS TOKEN</Label>
                      <div className="relative">
                        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input type="password" placeholder="Insira seu token ASAAS" className="pl-8 h-9 text-xs" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] p-2 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">Webhooks Ativos</span>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Pendente</Badge>
                    </div>
                    <Button className="w-full" disabled={!asaasConnected}>Vincular Conta</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-none shadow-soft bg-gradient-to-br from-primary to-primary-foreground/20 text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Dica Técnica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] leading-relaxed opacity-90">
                A API Oficial da Meta exige que você use **Templates Aprovados** para disparar mensagens fora da janela de 24h do último contato do doador.
              </p>
              <Button variant="secondary" size="sm" className="w-full mt-4 h-8 text-xs font-bold text-primary">
                Gerenciar Templates
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Integracoes;
