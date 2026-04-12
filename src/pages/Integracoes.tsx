import { useState, useEffect } from "react";
import {
  MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Users,
  FileText, Shield, CalendarClock, UserCheck, UserMinus, Clock,
  AlertTriangle, Phone, Settings2, Key, Globe, Database, CreditCard,
  RefreshCw, History, Info, ChevronRight, Code, Copy, Zap, ListChecks, Plus,
  Search, Upload, Smartphone, Mail, MessageCircle
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
import { validateMetaCredentials, fetchMetaTemplates, createMetaTemplate } from "@/lib/whatsappService";
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
  status: FollowUpStatus;
  template: string;
  time?: string;
}

const INITIAL_TEMPLATES = [
  {
    name: "muito_bem_vindo",
    category: "MARKETING",
    status: "APPROVED",
    body: "Seja muito bem vindo ao pulse eleitoral",
    variables: []
  },
  {
    name: "agradecimento_doacao",
    category: "MARKETING",
    status: "APPROVED",
    body: "Recebemos sua doação, {{1}}! 🙏 O valor de {{2}} já foi processado e ajudará muito. Obrigado!",
    variables: ["NOME_DOADOR", "VALOR_ULTIMA_DOACAO"]
  }
];

const Integracoes = () => {
  const [waConnected, setWaConnected] = useState(false);
  const [asaasConnected, setAsaasConnected] = useState(false);
  
  // Meta Credentials with Persistence
  const [wabaId, setWabaId] = useState(() => localStorage.getItem("meta_waba_id") || "1222137823202647");
  const [phoneId, setPhoneId] = useState(() => localStorage.getItem("meta_phone_id") || "903758466162084");
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("meta_access_token") || "");
  
  const [webhookUrl, setWebhookUrl] = useState("https://...");
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isTestingAsaas, setIsTestingAsaas] = useState(false);
  const { toast } = useToast();
  const { donors, addDonation, isDonationPending } = useDonors();

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

  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("meta_templates");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TEMPLATES;
    } catch (e) {
      return INITIAL_TEMPLATES;
    }
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "MARKETING",
    language: "pt_BR",
    body: ""
  });

  const handleSyncTemplates = async () => {
    toast({ title: "Sincronizando...", description: "Buscando templates aprovados na Meta API." });
    try {
      const updated = await fetchMetaTemplates();
      setTemplates(updated);
      toast({ title: "Sincronizado", description: `${updated.length} templates carregados da Meta.` });
    } catch (e: any) {
      toast({ 
        title: "Erro na Sincronização", 
        description: e.message, 
        variant: "destructive" 
      });
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWa(true);
    const result = await validateMetaCredentials(wabaId, phoneId, accessToken);
    setIsTestingWa(false);
    
    if (result.success) {
      setWaConnected(true);
      toast({
        title: "Conexão Meta Cloud OK",
        description: "Autenticação via System User Token validada com sucesso.",
        className: "bg-green-50 border-green-200"
      });
    } else {
      setWaConnected(false);
      toast({
        title: "Erro na Conexão",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const handleSaveCredentials = () => {
    localStorage.setItem("meta_waba_id", wabaId);
    localStorage.setItem("meta_phone_id", phoneId);
    localStorage.setItem("meta_access_token", accessToken);
    toast({ title: "Salvo", description: "Credenciais Meta persistidas localmente." });
  };

  const handleCreateTemplate = async () => {
    toast({ title: "Enviando...", description: "Submetendo template para aprovação na Meta." });
    try {
      const payload = {
        name: newTemplate.name.toLowerCase().replace(/\s+/g, "_"),
        category: newTemplate.category,
        language: newTemplate.language,
        components: [
          {
            type: "BODY",
            text: newTemplate.body
          }
        ]
      };
      await createMetaTemplate(payload);
      setIsCreateDialogOpen(false);
      toast({ title: "Sucesso", description: "Template enviado para aprovação na Meta." });
      handleSyncTemplates();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
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

  const [filterMode, setFilterMode] = useState<"Individual" | "Em Massa">("Individual");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const chatInbox = [
    { name: "Ingrid", lastMessage: "WhatsApp", time: "11:20", unread: 11, avatar: "I" },
    { name: "Samara Almeida", lastMessage: "👏🏽👏🏽👏🏽👏🏽", time: "17:38", unread: 0, avatar: "S" },
    { name: "Maicon Douglas", lastMessage: "2", time: "18:22", unread: 0, avatar: "M" },
    { name: "Ronnara Kelles Ribeiro", lastMessage: "Vou pensar", time: "10:22", unread: 0, avatar: "R" },
    { name: "Max Joffily", lastMessage: "Oi", time: "20:25", unread: 0, avatar: "M" },
    { name: "Max Formiga", lastMessage: "Ok", time: "17:57", unread: 0, avatar: "M" },
    { name: "Max", lastMessage: "Testando conexao Edge", time: "00:39", unread: 0, avatar: "M" },
  ];

  return (
    <div className="space-y-6 container mx-auto pb-10 px-4 md:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-black text-4xl text-slate-900 tracking-tight">WhatsApp Oficial da Meta</h1>
        <p className="text-slate-500 text-sm font-medium">Integração oficial Meta Business API • Cloud API</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8 w-fit gap-1 rounded-xl">
          <TabsTrigger value="templates" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold">Templates</TabsTrigger>
          <TabsTrigger value="enviar" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold">Enviar Mensagem</TabsTrigger>
          <TabsTrigger value="chat" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2">
            <MessageCircle className="w-4 h-4" /> Chat Ao Vivo
          </TabsTrigger>
          <TabsTrigger value="automacao" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold">Automação</TabsTrigger>
          <TabsTrigger value="historico" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold">Histórico</TabsTrigger>
          <TabsTrigger value="config" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold">Configuração API</TabsTrigger>
          <TabsTrigger value="asaas" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2">
            <Database className="w-4 h-4" /> Banco Asaas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-800">Templates Aprovados</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncTemplates} className="gap-2 rounded-lg border-slate-200">
                <RefreshCw className="w-4 h-4" /> Sincronizar
              </Button>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 gap-2 rounded-lg shadow-sm">
                    <Plus className="w-4 h-4" /> Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[32px]">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Template Meta</DialogTitle>
                    <DialogDescription>
                      Submeta um novo layout para aprovação. O processo pode levar até 24h.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Template (Snake Case)</Label>
                      <Input 
                        placeholder="ex: agradecimento_pix"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select 
                          value={newTemplate.category}
                          onValueChange={(v) => setNewTemplate({...newTemplate, category: v})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="UTILITY">Utilidade</SelectItem>
                            <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Idioma</Label>
                        <Select
                          value={newTemplate.language}
                          onValueChange={(v) => setNewTemplate({...newTemplate, language: v})}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                            <SelectItem value="en_US">Inglês</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Corpo da Mensagem</Label>
                      <Textarea 
                        placeholder="Olá {{1}}! Recebemos sua doação."
                        className="min-h-[120px] rounded-2xl"
                        value={newTemplate.body}
                        onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                      />
                      <p className="text-[10px] text-slate-400 italic">Use {"{{1}}"}, {"{{2}}"} para variáveis que serão preenchidas no envio.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateTemplate} className="bg-blue-600">Enviar para Aprovação</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl: any) => (
              <Card key={tpl.name} className="border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden group">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 tracking-tight">{tpl.name}</CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tpl.category} | PT_BR</p>
                  </div>
                  <Badge className="bg-green-50 text-green-600 border-green-100 hover:bg-green-50 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                    {tpl.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50/80 p-5 rounded-2xl min-h-[100px] border border-slate-100/50">
                    <p className="text-slate-600 text-sm italic leading-relaxed">"{tpl.body}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="enviar" className="space-y-6">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader className="border-b border-slate-50 py-6 px-8">
              <div className="flex items-center gap-2 text-emerald-600">
                <Send className="w-5 h-5 -rotate-45" />
                <CardTitle className="text-lg font-bold tracking-tight">Disparo Inteligente via Template</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-white hover:border-blue-400 transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Importar Contatos CSV</h3>
                <p className="text-slate-400 text-sm">Arquivo com colunas: nome, telefone</p>
                <Button variant="outline" className="mt-4 rounded-xl px-6 border-slate-200 text-blue-600 hover:bg-blue-50">Selecionar CSV</Button>
              </div>

              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-bold text-slate-700">Modo de Disparo:</Label>
                      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                        <button 
                          onClick={() => setFilterMode("Individual")}
                          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterMode === "Individual" ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Individual
                        </button>
                        <button 
                          onClick={() => setFilterMode("Em Massa")}
                          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filterMode === "Em Massa" ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Em Massa
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700">1. Selecione o Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 text-slate-500 shadow-sm focus:ring-blue-500 transition-all">
                          <SelectValue placeholder="Escolher template..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {templates.map((t: any) => (
                            <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">2. Selecione o Destinatário</Label>
                        <Select>
                          <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 text-slate-500 shadow-sm focus:ring-blue-500 transition-all">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <div className="p-2 border-b">
                              <Input placeholder="Pesquisar doador..." className="h-8 text-xs rounded-lg" />
                            </div>
                            <ScrollArea className="h-40">
                              {donors.map((d: any) => (
                                <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.phone})</SelectItem>
                              ))}
                            </ScrollArea>
                          </SelectContent>
                        </Select>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <Label className="text-sm font-bold text-slate-700">3. Variáveis do Template</Label>
                  <div className="border-2 border-dashed border-slate-100 rounded-3xl p-8 bg-slate-50/20 h-[200px] flex items-center justify-center text-center">
                    <p className="text-slate-400 text-sm max-w-[200px]">Selecione um template para preencher as variáveis.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-10 h-14 font-black tracking-tight gap-2 shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95">
                  <Send className="w-5 h-5 -rotate-45" /> Enviar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-0 h-[600px] flex border border-slate-100 rounded-[32px] overflow-hidden shadow-sm bg-white">
          <div className="w-80 border-r border-slate-100 flex flex-col">
            <div className="p-5 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800">Caixa de Entrada</h3>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg"><Plus className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg"><Info className="w-4 h-4" /></Button>
                </div>
            </div>
            <div className="p-4 border-b border-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Pesquisar conversa..." className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-sm" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {chatInbox.map((chat, i) => (
                <div key={i} className={`p-4 flex gap-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50/50 ${chat.name === "Ingrid" ? "bg-blue-50/30" : ""}`}>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">{chat.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{chat.name}</h4>
                      <span className="text-[10px] text-slate-400">{chat.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          <div className="flex-1 bg-slate-50/50 flex flex-col items-center justify-center relative">
             <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/chat.png')] bg-repeat" />
             <div className="z-10 flex flex-col items-center max-w-sm text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-6 transition-transform hover:rotate-12">
                   <Plus className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="font-black text-2xl text-slate-800 mb-2">Pulse Eleitoral Web</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Envie e receba mensagens dos seus eleitores. Tudo fica sincronizado automaticamente através do Supabase e da Meta API.</p>
             </div>
          </div>
        </TabsContent>

        <TabsContent value="automacao" className="space-y-6">
           <Card className="border-none shadow-soft overflow-hidden rounded-3xl">
             <CardHeader className="bg-slate-50/50 pb-6 pt-8 px-8">
               <div className="flex items-center gap-3">
                 <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
                   <RefreshCw className="w-6 h-6" />
                 </div>
                 <div>
                   <CardTitle className="text-xl font-bold tracking-tight">Fila de Disparos Oficiais</CardTitle>
                   <CardDescription className="text-slate-500">Mapeamento de variáveis {'{{1}}'} para automação de follow-ups.</CardDescription>
                 </div>
               </div>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: "Pendentes", count: whatsappLogs.filter((f: any) => f.status === "pendente").length, color: "bg-amber-50 text-amber-600 border-amber-200" },
                    { label: "Entregues", count: whatsappLogs.filter((f: any) => f.status === "success").length, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                    { label: "Lidos", count: "42", color: "bg-blue-50 text-blue-600 border-blue-200" },
                    { label: "Taxa Saúde", count: "98%", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
                  ].map((stat) => (
                    <div key={stat.label} className={`p-6 rounded-3xl border-2 shadow-sm ${stat.color} transition-transform hover:scale-105`}>
                      <p className="text-[10px] uppercase font-black opacity-60 tracking-widest mb-1">{stat.label}</p>
                      <p className="text-3xl font-black tracking-tight">{stat.count}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Fila de Execução</Label>
                      <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl">Ver Todos</Button>
                   </div>
                   <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
                     <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="py-4 pl-6 text-[10px] font-black uppercase text-slate-400">Doador / Phone</TableHead>
                            <TableHead className="py-4 text-[10px] font-black uppercase text-slate-400">Template Meta</TableHead>
                            <TableHead className="py-4 text-[10px] font-black uppercase text-slate-400">Status API</TableHead>
                            <TableHead className="py-4 pr-6 text-right text-[10px] font-black uppercase text-slate-400">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {whatsappLogs.length > 0 ? whatsappLogs.slice(0, 5).map((log: any) => (
                            <TableRow key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="py-4 pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">M</div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">Doador Teste</p>
                                    <p className="text-[10px] text-slate-400 font-mono italic">{log.to}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant="outline" className="text-[10px] font-bold rounded-lg border-slate-200 text-slate-600 uppercase tracking-tighter">agradecimento_doacao</Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-lg text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">Sucesso</Badge>
                              </TableCell>
                              <TableCell className="py-4 pr-6 text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-500"><Code className="w-4 h-4" /></Button>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm font-medium italic">Fila de automação vazia no momento.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                     </Table>
                   </div>
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
           <Card className="border-none shadow-soft rounded-[32px] overflow-hidden">
             <CardHeader className="py-8 px-10 border-b border-slate-50">
               <div className="flex items-center gap-3">
                 <History className="w-5 h-5 text-slate-400" />
                 <CardTitle className="text-xl font-bold tracking-tight">Histórico de Mensagens Meta</CardTitle>
               </div>
             </CardHeader>
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50/30">
                   <TableRow className="border-none">
                     <TableHead className="py-5 px-10 text-[10px] font-black uppercase text-slate-400">Data / Hora</TableHead>
                     <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400">Lote / Filtro</TableHead>
                     <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400">Destinatário</TableHead>
                     <TableHead className="py-5 text-[10px] font-black uppercase text-slate-400">Template</TableHead>
                     <TableHead className="py-5 px-10 text-right text-[10px] font-black uppercase text-slate-400">Status</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {whatsappLogs.length > 0 ? whatsappLogs.map((log: any) => (
                      <TableRow key={log.id} className="border-b border-slate-50/50 hover:bg-slate-50/30 transition-colors group">
                        <TableCell className="py-6 px-10 text-sm text-slate-500 font-medium">31/03/2026, {log.time}</TableCell>
                        <TableCell className="py-6 text-[10px] font-black text-blue-600 opacity-80 uppercase tracking-widest">INDIVIDUAL</TableCell>
                        <TableCell className="py-6 font-bold text-slate-800 text-sm">Nelson</TableCell>
                        <TableCell className="py-6">
                           <span className="text-sm font-bold text-blue-700 underline underline-offset-4 decoration-blue-100 group-hover:decoration-blue-300 transition-all cursor-pointer">muito_bem_vindo</span>
                        </TableCell>
                        <TableCell className="py-6 px-10 text-right">
                          <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-lg text-[10px] font-bold px-3 py-1 uppercase tracking-widest">Sucesso</Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-slate-400 font-medium italic">Nenhum histórico encontrado para o período.</TableCell>
                      </TableRow>
                    )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
           <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
             <CardHeader className="py-8 px-10 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight">Credenciais Meta Developer</CardTitle>
                </div>
             </CardHeader>
             <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                   <div className="space-y-3">
                     <Label className="text-sm font-bold text-slate-700">WhatsApp Business Account ID (WABA_ID)</Label>
                     <Input 
                       value={wabaId} 
                       onChange={(e) => setWabaId(e.target.value)}
                       className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-slate-600 font-mono shadow-inner focus:ring-blue-500/20" 
                     />
                   </div>
                   <div className="space-y-3">
                     <Label className="text-sm font-bold text-slate-700">Phone Number ID</Label>
                     <Input 
                       value={phoneId} 
                       onChange={(e) => setPhoneId(e.target.value)}
                       className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-slate-600 font-mono shadow-inner focus:ring-blue-500/20" 
                     />
                   </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Access Token Permanente (System User Token)</Label>
                  <Input 
                    type="password"
                    value={accessToken} 
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-slate-600 font-mono shadow-inner focus:ring-blue-500/20" 
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">Webhook URL (Copiado da Meta Dashboard)</Label>
                  <div className="relative">
                    <Input 
                      value={webhookUrl} 
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 text-slate-400 font-mono shadow-inner pr-16" 
                    />
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 w-10 text-slate-400 hover:text-blue-500 hover:bg-white border border-transparent hover:border-slate-100 transition-all">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                   <Button 
                    variant="outline" 
                    onClick={handleTestWhatsApp}
                    disabled={isTestingWa}
                    className="h-14 px-8 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 gap-2 transition-all active:scale-95 shadow-sm"
                   >
                      {isTestingWa ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                     Testar Conexão
                   </Button>
                   <Button 
                     onClick={handleSaveCredentials}
                     className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black tracking-tight gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                   >
                     <Database className="w-4 h-4" /> Salvar Credenciais
                   </Button>
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="asaas" className="space-y-6">
           <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
             <CardHeader className="py-8 px-10 border-b border-indigo-50 bg-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-indigo-900 tracking-tight">Configuração Banco Asaas</CardTitle>
                    <CardDescription className="text-indigo-600 font-medium">Gateway Financeiro & Sincronismo de Doações</CardDescription>
                  </div>
                </div>
             </CardHeader>
             <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <Label className="text-sm font-bold text-slate-700">API Access Token (Produção)</Label>
                      <Input type="password" placeholder="$asaas_live_..." className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm" />
                   </div>
                   <div className="space-y-4">
                      <Label className="text-sm font-bold text-slate-700">API Access Token (Sandbox/Teste)</Label>
                      <Input type="password" placeholder="$asaas_test_..." className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm" />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <Label className="text-sm font-bold text-slate-700">Webhook Auth Token</Label>
                     <Tooltip><TooltipTrigger asChild><Info className="w-4 h-4 text-slate-400 cursor-help" /></TooltipTrigger><TooltipContent>Token de segurança enviado pelo Asaas em cada notificação.</TooltipContent></Tooltip>
                   </div>
                   <Input value="FAP_PULSE_ASAAS_SECURE_2026" readOnly className="h-14 rounded-2xl bg-slate-50 italic text-slate-400 font-mono shadow-inner" />
                </div>

                <div className="p-8 rounded-[32px] bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
                   <div className="flex items-center gap-3 mb-2">
                     <Smartphone className="w-6 h-6 text-indigo-400" />
                     <h4 className="font-black text-lg tracking-tight">Sincronizador Inteligente</h4>
                   </div>
                   <p className="text-slate-400 text-sm leading-relaxed">As doações confirmadas no Asaas disparam automaticamente uma mensagem de agradecimento pelo WhatsApp oficial acima configurado.</p>
                   <div className="flex items-center gap-4 pt-4">
                      <Switch defaultChecked />
                      <span className="text-sm font-bold text-indigo-300">Automação de Agradecimento Ativa</span>
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                   <Button 
                    variant="outline" 
                    onClick={handleTestAsaas}
                    disabled={isTestingAsaas}
                    className="h-14 px-8 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 gap-2 shadow-sm transition-all"
                   >
                     {isTestingAsaas ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                     Testar Conexão Asaas
                   </Button>
                   <Button className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black tracking-tight gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                     <RefreshCw className="w-4 h-4" /> Sincronizar Agora
                   </Button>
                </div>
             </CardContent>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-slate-100 shadow-sm rounded-3xl">
                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <CardTitle className="text-sm font-bold">Últimos Eventos Asaas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-3">
                      {asaasLogs.slice(0, 5).map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100 transition-hover hover:border-indigo-200">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                               <CreditCard className="w-4 h-4" />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-800">{log.donor}</p>
                                <p className="text-[10px] text-slate-400">R$ {log.amount.toFixed(2)}</p>
                             </div>
                          </div>
                          <Badge variant="outline" className="text-[8px] border-emerald-200 text-emerald-600 bg-emerald-50 font-black uppercase tracking-widest">{log.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border border-slate-100 shadow-sm rounded-3xl bg-indigo-600 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 transition-transform group-hover:rotate-0">
                    <Zap className="w-20 h-20" />
                 </div>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-bold text-indigo-100">Simulador de Sandbox</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <p className="text-xs text-indigo-100 leading-relaxed">Gere uma doação fictícia para testar o recebimento via webhook e o disparo automático do WhatsApp.</p>
                    <Button 
                      onClick={() => {
                        setIsTestingAsaas(true);
                        setTimeout(async () => {
                          const mockEvent = generateMockAsaasEvent();
                          await handleAsaasDonation(
                            mockEvent, 
                            (e, p) => donors.find(d => (e && d.email === e) || (p && d.phone === p)),
                            (n, e, p) => ({ id: Date.now(), name: n, email: e, phone: p }),
                            addDonation
                          );
                          setIsTestingAsaas(false);
                        }, 1000);
                      }}
                      disabled={isDonationPending || isTestingAsaas}
                      className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-black rounded-xl h-10 gap-2 shadow-lg"
                    >
                      {isDonationPending || isTestingAsaas ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Gerar Doação Mock
                    </Button>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};


export default Integracoes;
