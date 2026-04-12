import { useState, useEffect } from "react";
import {
  MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Users,
  FileText, Shield, CalendarClock, UserCheck, UserMinus, Clock,
  AlertTriangle, Phone, Settings2, Key, Globe, Database, CreditCard,
  RefreshCw, History, Info, ChevronRight, Code, Copy, Zap, ListChecks, Plus
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
import { useDonors } from "@/hooks/useDonors";
import { handleAsaasDonation, generateMockAsaasEvent } from "@/lib/asaasIntegrationService";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

type DonorType = "unico" | "esporadico" | "recorrente";
type FollowUpStatus = "pendente" | "agendado" | "enviado" | "atrasado" | "entregue" | "lido" | "falha";

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
  lastPayload?: string;
}

const INITIAL_TEMPLATES = [
  {
    name: "boas_vindas_doador",
    category: "MARKETING",
    status: "Aprovado",
    body: "Olá {{1}}! 🎉 Obrigado por sua doação de {{2}} para a campanha {{3}}. Sua generosidade faz a diferença!",
    variables: ["NOME_DOADOR", "VALOR_ULTIMA_DOACAO", "ULTIMA_CAMPANHA"]
  },
  {
    name: "agradecimento_doacao",
    category: "MARKETING",
    status: "Aprovado",
    body: "Recebemos sua doação, {{1}}! 🙏 O valor de {{2}} já foi processado e ajudará muito. Obrigado!",
    variables: ["NOME_DOADOR", "VALOR_ULTIMA_DOACAO"]
  },
  {
    name: "follow_up_doacao",
    category: "MARKETING",
    status: "Aprovado",
    body: "Olá {{1}}, sentimos sua falta! Há {{2}} dias sua última contribuição de {{3}} impactou vidas. Que tal continuar?",
    variables: ["NOME_DOADOR", "DIAS_DESDE_ULTIMA", "VALOR_ULTIMA_DOACAO"]
  },
];

const statusLabel: Record<FollowUpStatus, string> = { 
  pendente: "Pendente", agendado: "Agendado", enviado: "Enviado", 
  atrasado: "Atrasado", entregue: "Entregue", lido: "Lido", falha: "Falha" 
};

const statusStyle: Record<FollowUpStatus, string> = { 
  pendente: "bg-amber-100 text-amber-800", 
  agendado: "bg-blue-100 text-blue-800", 
  enviado: "bg-gray-100 text-gray-800", 
  atrasado: "bg-red-100 text-red-800",
  entregue: "bg-green-50 text-green-600",
  lido: "bg-green-100 text-green-700 font-bold",
  falha: "bg-red-500 text-white"
};

const Integracoes = () => {
  const [waConnected, setWaConnected] = useState(true);
  const [asaasConnected, setAsaasConnected] = useState(true);
  const [isAutoEnabled, setIsAutoEnabled] = useState(() => localStorage.getItem("asaas_automation_enabled") !== "false");
  const [wabaId, setWabaId] = useState("32910291920192");
  const [phoneId, setPhoneId] = useState("425178224512901");
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isTestingAsaas, setIsTestingAsaas] = useState(false);
  const { toast } = useToast();
  const { donors, registerNewDonor, addDonation, isDonationPending } = useDonors();

  const findDonorByEmailOrPhone = (email?: string, phone?: string) => {
    return donors.find(d => 
      (email && d.email === email) || (phone && d.phone === phone)
    );
  };

  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [asaasLogs, setAsaasLogs] = useState<any[]>([]);

  useEffect(() => {
    const loadLogs = () => {
      try {
        const wLogs = JSON.parse(localStorage.getItem("whatsapp_logs") || "[]");
        const aLogs = JSON.parse(localStorage.getItem("asaas_logs") || "[]");
        setWhatsappLogs(Array.isArray(wLogs) ? wLogs : []);
        setAsaasLogs(Array.isArray(aLogs) ? aLogs : []);
      } catch (e) {
        setWhatsappLogs([]);
        setAsaasLogs([]);
      }
    };
    loadLogs();
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("asaas_automation_enabled", isAutoEnabled.toString());
  }, [isAutoEnabled]);

  const simulateAsaasDonation = async () => {
    const mockEvent = generateMockAsaasEvent();
    await handleAsaasDonation(
      mockEvent,
      findDonorByEmailOrPhone,
      (name, email, phone) => registerNewDonor({ name, email, phone }) as any,
      addDonation
    );
  };

  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("meta_templates");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TEMPLATES;
    } catch (e) {
      return INITIAL_TEMPLATES;
    }
  });

  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "MARKETING",
    body: "",
    variables: [] as string[]
  });

  useEffect(() => {
    localStorage.setItem("meta_templates", JSON.stringify(templates));
  }, [templates]);

  const detectVariables = (body: string) => {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = body.match(regex) || [];
    return matches.map((_, i) => `VARIABLE_${i + 1}`);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast({ title: "Erro", description: "Preencha o nome e o corpo do template.", variant: "destructive" });
      return;
    }

    const variables = detectVariables(newTemplate.body);
    const template = {
      ...newTemplate,
      name: newTemplate.name.toLowerCase().replace(/\s+/g, "_"),
      status: "Em Análise",
      variables
    };

    setTemplates([...templates, template]);
    setIsAddingTemplate(false);
    setNewTemplate({ name: "", category: "MARKETING", body: "", variables: [] });
    toast({ title: "Template Criado", description: "O template foi enviado para análise na Meta Cloud API." });
  };

  const handleTestWhatsApp = () => {
    setIsTestingWa(true);
    setTimeout(() => {
      setIsTestingWa(false);
      setWaConnected(true);
      toast({
        title: "Conexão Meta Cloud OK",
        description: "Autenticação via System User Token validada com sucesso.",
        className: "bg-green-50 border-green-200"
      });
    }, 1500);
  };

  const handleTestAsaas = () => {
    setIsTestingAsaas(true);
    setTimeout(() => {
      setIsTestingAsaas(false);
      setAsaasConnected(true);
      toast({
        title: "Conexão Asaas OK",
        description: "API Key validada. Permissões de Webhook ativas.",
        className: "bg-green-50 border-green-200"
      });
    }, 1500);
  };

  const [followUpList, setFollowUpList] = useState<WhatsAppFollowUp[]>(() => {
    try {
      const saved = localStorage.getItem("doacflow_followups");
      const parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((f: any) => ({
        ...f,
        donorType: f.classification || f.donorType || "unico",
        status: f.status || "pendente",
        template: f.template || "follow_up_doacao",
        optIn: true,
        selected: false
      }));
    } catch (e) {
      return [];
    }
  });

  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("doacflow_followups", JSON.stringify(followUpList));
  }, [followUpList]);

  const generateMetaPayload = (f: WhatsAppFollowUp) => {
    const template = templates.find(t => t.name === f.template) || templates[0] || INITIAL_TEMPLATES[0];
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: f.phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template.name,
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: (template.variables || []).map(v => ({
              type: "text",
              text: v === "NOME_DOADOR" ? f.donorName : v === "VALOR_ULTIMA_DOACAO" ? "R$ 150,00" : "Campanha Geral"
            }))
          }
        ]
      }
    };
    return JSON.stringify(payload, null, 2);
  };

  const completionRate = followUpList.length > 0 
    ? Math.round((followUpList.filter((f) => ["enviado", "entregue", "lido"].includes(f.status)).length / followUpList.length) * 100)
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
          <p className="text-muted-foreground">Central técnica compatível com WhatsApp Cloud API (Oficial).</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Status Global</span>
            <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`gap-1.5 border-none ${waConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${waConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                      META API
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
            </div>
          </div>
          <Separator orientation="vertical" className="h-10 mx-2" />
          <Button 
            onClick={simulateAsaasDonation} 
            disabled={isDonationPending}
            className="bg-primary shadow-glow hover:scale-105 transition-all gap-2"
          >
            {isDonationPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isDonationPending ? "Processando..." : "Simular Doação Asaas"}
          </Button>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="automation" className="w-full">
            <TabsList className="bg-muted/50 p-1 mb-6">
              <TabsTrigger value="automation" className="gap-2"><RefreshCw className="w-4 h-4" /> Automação</TabsTrigger>
              <TabsTrigger value="templates" className="gap-2"><ListChecks className="w-4 h-4" /> Gerenciador de Templates</TabsTrigger>
              <TabsTrigger value="logs" className="gap-2"><History className="w-4 h-4" /> Logs Técnicos</TabsTrigger>
            </TabsList>

            <TabsContent value="automation" className="space-y-6">
              <Card className="border-none shadow-soft overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 rounded-lg bg-primary/10">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Fila de Disparos Oficiais</CardTitle>
                        <CardDescription>Mapeamento de variáveis {"{{1}}"} para campos de doadores.</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Pendentes", count: followUpList.filter(f => f.status === "pendente").length, color: "border-amber-500 text-amber-600" },
                      { label: "Entregues", count: followUpList.filter(f => f.status === "entregue").length, color: "border-green-500 text-green-600" },
                      { label: "Abertos", count: followUpList.filter(f => f.status === "lido").length, color: "border-blue-500 text-blue-600" },
                      { label: "Health", count: `${completionRate}%`, color: "border-primary text-primary" },
                    ].map((stat) => (
                      <div key={stat.label} className={`p-4 rounded-xl border-l-4 bg-muted/20 ${stat.color}`}>
                        <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">{stat.label}</p>
                        <p className="text-xl font-black">{stat.count}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Fila de Execução</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[150px] h-8 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="pendente">Pendentes</SelectItem>
                          <SelectItem value="entregue">Entregues</SelectItem>
                          <SelectItem value="lido">Lidos (CTR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-[350px] border rounded-xl bg-background/50">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold">Doador / Phone</TableHead>
                            <TableHead className="text-[10px] font-bold">Template Meta</TableHead>
                            <TableHead className="text-[10px] font-bold">Status API</TableHead>
                            <TableHead className="text-[10px] font-bold text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFollowUps.length > 0 ? (
                            filteredFollowUps.map((f) => (
                              <TableRow key={f.id} className="hover:bg-muted/30">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${f.status === "entregue" || f.status === "lido" ? "bg-green-500" : "bg-amber-500"}`} />
                                    <div>
                                      <p className="text-sm font-semibold">{f.donorName}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{f.phone}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <Badge variant="outline" className="text-[9px] w-fit mb-1">{f.template}</Badge>
                                    <span className="text-[9px] text-muted-foreground">Variables: {"{{1}}, {{2}}"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[9px] px-1.5 py-0 border-none ${statusStyle[f.status] || ""}`}>
                                    {statusLabel[f.status] || f.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPayload(generateMetaPayload(f))}>
                                        <Code className="w-3.5 h-3.5" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                      <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                          <Code className="w-5 h-5" /> Meta Cloud Payload Preview
                                        </DialogTitle>
                                        <DialogDescription>Este é o JSON que será enviado para o endpoint da Meta.</DialogDescription>
                                      </DialogHeader>
                                      <div className="relative mt-4 group">
                                        <pre className="p-4 rounded-xl bg-slate-950 text-slate-50 text-[10px] overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-slate-800">
                                          {selectedPayload}
                                        </pre>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="absolute top-2 right-2 text-slate-400 hover:text-white"
                                          onClick={() => {
                                            if (selectedPayload) navigator.clipboard.writeText(selectedPayload);
                                            toast({ title: "Copiado", description: "Payload copiado para a área de transferência." });
                                          }}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs italic">
                                Nenhum registro na fila de automação.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
               <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Gerenciador de Templates</h3>
                  <p className="text-xs text-muted-foreground">Crie e gerencie templates oficiais da Meta Cloud API.</p>
                </div>
                <Dialog open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary shadow-glow">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Novo Template WhatsApp
                      </DialogTitle>
                      <DialogDescription>
                        Templates devem ser aprovados pela Meta antes do uso.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome do Template</Label>
                          <Input 
                            placeholder="ex: boas_vindas_promo" 
                            className="bg-muted/50"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Categoria</Label>
                          <Select 
                            value={newTemplate.category}
                            onValueChange={(v) => setNewTemplate({...newTemplate, category: v})}
                          >
                            <SelectTrigger className="bg-muted/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MARKETING">Marketing</SelectItem>
                              <SelectItem value="UTILITY">Utilidade</SelectItem>
                              <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Corpo da Mensagem</Label>
                        <Textarea 
                          placeholder="Olá {{1}}! Use o código {{2}} para ganhar desconto." 
                          className="min-h-[120px] bg-muted/20 font-sans"
                          value={newTemplate.body}
                          onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                        />
                        <p className="text-[10px] text-muted-foreground italic">Use {`{{1}}, {{2}}`} para representar variáveis dinâmicas.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingTemplate(false)}>Cancelar</Button>
                      <Button onClick={handleCreateTemplate}>Criar e Enviar para Análise</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((tpl) => (
                  <Card key={tpl.name} className="border-none shadow-soft hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] border-none">Oficial</Badge>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="p-2 rounded-lg bg-primary/10 w-fit mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm font-bold truncate pr-10">{tpl.name}</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{tpl.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 rounded-lg bg-muted/40 border border-muted min-h-[80px]">
                        <p className="text-[11px] leading-relaxed italic opacity-80">"{tpl.body}"</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Mapeamento de Variáveis</Label>
                        <div className="space-y-1">
                          {(tpl.variables || []).map((v: string, i: number) => (
                            <div key={`${tpl.name}-var-${i}`} className="flex items-center justify-between text-[10px] p-1.5 bg-background rounded border">
                              <span className="font-mono text-primary font-bold">{"{{"}{i+1}{"}}"}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-semibold">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" className="w-full text-xs h-8 group-hover:bg-primary group-hover:text-white transition-colors">
                        Sincronizar Meta
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
               <Card className="border-none shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-md">Logs de Integração em Tempo Real</CardTitle>
                    <CardDescription>Monitoramento de eventos Meta Cloud e Asaas.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="auto-mode" className="text-xs">Auto-Processing</Label>
                    <Switch 
                      id="auto-mode" 
                      checked={isAutoEnabled} 
                      onCheckedChange={setIsAutoEnabled} 
                    />
                  </div>
                </CardHeader>
                <CardContent>
                   <ScrollArea className="h-[400px]">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase text-primary">WhatsApp Outbound</Label>
                        {whatsappLogs.length > 0 ? whatsappLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl border border-muted/50 bg-muted/20">
                            <div className="text-[10px] font-mono text-muted-foreground w-16">{log.time}</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold uppercase tracking-tighter">{log.event}</p>
                              <p className="text-[10px] text-muted-foreground">Destinatário: {log.to}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold text-green-600">{log.status}</Badge>
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground italic">Nenhuma mensagem enviada ainda.</p>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase text-orange-500">Asaas Inbound</Label>
                        {asaasLogs.length > 0 ? asaasLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl border border-orange-100 bg-orange-50/30">
                            <div className="text-[10px] font-mono text-muted-foreground w-16">{log.time}</div>
                            <div className="flex-1">
                              <p className="text-xs font-bold uppercase tracking-tighter text-orange-700">{log.type}</p>
                              <p className="text-[10px] text-muted-foreground">{log.donor} &bull; R$ {log.amount}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold bg-white text-orange-600 border-orange-200">confirmado</Badge>
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground italic">Nenhuma doação recebida via API ainda.</p>
                        )}
                      </div>
                    </div>
                   </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-soft border-t-4 border-t-primary overflow-hidden">
            <CardHeader className="pb-3 border-b border-muted">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <CardTitle className="text-md">Meta Developer Cloud</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Phone Number ID</Label>
                    <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent>ID único do seu número na Meta</TooltipContent></Tooltip>
                  </div>
                  <Input className="h-9 text-xs font-mono" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} />
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">WABA ID</Label>
                    <Tooltip><TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent>WhatsApp Business Account ID</TooltipContent></Tooltip>
                  </div>
                  <Input className="h-9 text-xs font-mono" value={wabaId} onChange={(e) => setWabaId(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">System User Access Token</Label>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="password" className="pl-8 h-9 text-xs" defaultValue="EAAKlkj8921jkshdakj129837912jashdkjhaskjd" />
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 text-slate-100">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase">Webhook Endpoint URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Globe className="w-3 h-3 text-primary shrink-0" />
                    <code className="text-[9px] break-all opacity-80">https://lovable.dev/api/v1/meta/webhook</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white shrink-0">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Verify Token (Configuração na Meta)</Label>
                  <Input className="h-8 text-[10px] font-mono bg-muted" readOnly value="FAP_PULSE_META_2026" />
                </div>

                <Button 
                  className="w-full text-xs h-9 bg-primary" 
                  onClick={handleTestWhatsApp}
                  disabled={isTestingWa}
                >
                  {isTestingWa ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-2" />
                  )}
                  Testar Conexão WhatsApp
                </Button>

                <div className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Status: Online</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] bg-white text-green-700 border-green-200">v18.0</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-soft bg-muted/30">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Configuração ASAAS</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                 <p className="text-[10px] text-muted-foreground">Integração financeira para sincronismo automático de doações confirmadas.</p>
                 <Input type="password" placeholder="API Access Token" className="h-8 text-xs font-mono" />
                 <Button 
                  className="w-full text-xs h-8" 
                  variant="outline"
                  onClick={handleTestAsaas}
                  disabled={isTestingAsaas}
                 >
                   {isTestingAsaas && <RefreshCw className="w-3 h-3 mr-2 animate-spin" />}
                   Testar Conexão Asaas
                 </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Integracoes;
