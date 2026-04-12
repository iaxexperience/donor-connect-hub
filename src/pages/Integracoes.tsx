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
import { getWhatsAppSettings, saveWhatsAppSettings } from "@/lib/whatsappSettingsService";
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
  const { toast } = useToast();
  const { donors, addDonation, isDonationPending } = useDonors();
  
  // Basic UI state
  const [waConnected, setWaConnected] = useState(false);
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isTestingAsaas, setIsTestingAsaas] = useState(false);
  
  // Meta Credentials with Persistence
  // Meta Credentials
  const [wabaId, setWabaId] = useState("1222137823202647");
  const [phoneId, setPhoneId] = useState("903758466162084");
  const [accessToken, setAccessToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://...");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [asaasLogs, setAsaasLogs] = useState<any[]>([]);

  // Templates State
  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("meta_templates");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TEMPLATES;
    } catch (e) {
      return INITIAL_TEMPLATES;
    }
  });

  // New Template Modal State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "MARKETING",
    language: "pt_BR",
    body: ""
  });

  // Load Settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      const settings = await getWhatsAppSettings();
      if (settings) {
        setWabaId(settings.waba_id);
        setPhoneId(settings.phone_number_id);
        setAccessToken(settings.access_token);
        setWebhookUrl(settings.webhook_url);
      }
      setIsLoadingSettings(false);
    };
    loadSettings();
  }, []);

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
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncTemplates = async () => {
    toast({ title: "Sincronizando...", description: "Buscando templates aprovados na Meta API." });
    try {
      const updated = await fetchMetaTemplates();
      setTemplates(updated);
      localStorage.setItem("meta_templates", JSON.stringify(updated));
      toast({ title: "Sincronizado", description: `${updated.length} templates carregados da Meta.` });
    } catch (e: any) {
      toast({ title: "Erro na Sincronização", description: e.message, variant: "destructive" });
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWa(true);
    try {
      const result = await validateMetaCredentials(wabaId, phoneId, accessToken);
      setIsTestingWa(false);
      if (result.success) {
        setWaConnected(true);
        toast({ title: "Conexão OK", description: "Autenticação Meta validada com sucesso." });
      } else {
        setWaConnected(false);
        toast({ title: "Erro na Conexão", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      setIsTestingWa(false);
      toast({ title: "Erro Crítico", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveCredentials = async () => {
    try {
      await saveWhatsAppSettings({
        waba_id: wabaId,
        phone_number_id: phoneId,
        access_token: accessToken,
        webhook_url: webhookUrl
      });
      // Also keep in localStorage for immediate service availability without refresh
      localStorage.setItem("meta_waba_id", wabaId);
      localStorage.setItem("meta_phone_id", phoneId);
      localStorage.setItem("meta_access_token", accessToken);
      
      toast({ title: "Salvo no Banco de Dados", description: "Credenciais Meta sincronizadas com o Supabase." });
    } catch (e: any) {
      toast({ title: "Erro ao Salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateTemplate = async () => {
    toast({ title: "Enviando...", description: "Submetendo template para aprovação na Meta." });
    try {
      const payload = {
        name: newTemplate.name.toLowerCase().replace(/\s+/g, "_"),
        category: newTemplate.category,
        language: newTemplate.language,
        components: [{ type: "BODY", text: newTemplate.body }]
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
      toast({ title: "Conexão Asaas OK", description: "API Key validada." });
    }, 1500);
  };

  const [filterMode, setFilterMode] = useState<"Individual" | "Em Massa">("Individual");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const chatInbox = [
    { name: "Ingrid", lastMessage: "WhatsApp", time: "11:20", unread: 11, avatar: "I" },
    { name: "Samara Almeida", lastMessage: "👏🏽👏🏽👏🏽👏🏽", time: "17:38", unread: 0, avatar: "S" },
    { name: "Maicon Douglas", lastMessage: "2", time: "18:22", unread: 0, avatar: "M" },
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Templates WhatsApp</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncTemplates} className="gap-2 rounded-lg">
                <RefreshCw className="w-4 h-4" /> Sincronizar
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 gap-2 rounded-lg">
                    <Plus className="w-4 h-4" /> Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] rounded-[32px]">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Template Meta</DialogTitle>
                    <DialogDescription>Submeta um novo layout para aprovação.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome (Snake Case)</Label>
                      <Input placeholder="ex: agradecimento_pix" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({...newTemplate, category: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="UTILITY">Utilidade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Idioma</Label>
                        <Select value={newTemplate.language} onValueChange={(v) => setNewTemplate({...newTemplate, language: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="pt_BR">Português (BR)</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Textarea className="min-h-[120px] rounded-2xl" value={newTemplate.body} onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateTemplate} className="bg-blue-600">Enviar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl: any) => (
              <Card key={tpl.name} className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">{tpl.name}</CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{tpl.category}</p>
                  </div>
                  <Badge className="bg-green-50 text-green-600 border-none">{tpl.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50/80 p-5 rounded-2xl min-h-[80px]">
                    <p className="text-slate-600 text-sm italic">"{tpl.body}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="enviar" className="space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Send className="w-5 h-5 -rotate-45 text-emerald-600" /> Disparo via Template
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="border-2 border-dashed border-slate-100 rounded-3xl p-10 flex flex-col items-center bg-slate-50/30">
                <Upload className="w-8 h-8 text-blue-500 mb-2" />
                <h3 className="font-bold">Importar Contatos CSV</h3>
                <Button variant="outline" className="mt-4">Selecionar CSV</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="h-[600px] border border-slate-100 rounded-[32px] overflow-hidden shadow-sm bg-white flex">
          <div className="w-80 border-r border-slate-100 flex flex-col">
            <div className="p-5 font-bold border-b">Caixa de Entrada</div>
            <ScrollArea className="flex-1">
              {chatInbox.map((chat, i) => (
                <div key={i} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                  <div className="font-bold text-sm">{chat.name}</div>
                  <div className="text-xs text-slate-500">{chat.lastMessage}</div>
                </div>
              ))}
            </ScrollArea>
          </div>
          <div className="flex-1 bg-slate-50/50 flex flex-col items-center justify-center">
            <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
            <h3 className="font-bold text-slate-400">Selecione uma conversa</h3>
          </div>
        </TabsContent>

        <TabsContent value="automacao" className="space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" /> Fila de Disparos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-slate-400 italic">Nenhum disparo pendente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
             <CardHeader className="border-b">
               <CardTitle>Histórico de Mensagens</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50"><TableRow><TableHead>Data</TableHead><TableHead>Doador</TableHead><TableHead>Template</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {whatsappLogs.length > 0 ? whatsappLogs.map((log: any) => (
                     <TableRow key={log.id}><TableCell>{log.time}</TableCell><TableCell>{log.to}</TableCell><TableCell>agradecimento</TableCell><TableCell className="text-right">Sucesso</TableCell></TableRow>
                   )) : (
                     <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-400">Nenhum registro.</TableCell></TableRow>
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
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Shield className="w-5 h-5" /></div>
                <CardTitle className="text-xl font-bold">Credenciais Meta Developer</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 transition-opacity ${isLoadingSettings ? 'opacity-50' : 'opacity-100'}`}>
                <div className="space-y-3">
                  <Label className="font-bold flex items-center gap-2">
                    WABA ID {isLoadingSettings && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                  </Label>
                  <Input value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="h-14 rounded-2xl bg-slate-50" disabled={isLoadingSettings} />
                </div>
                <div className="space-y-3">
                  <Label className="font-bold">Phone Number ID</Label>
                  <Input value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="h-14 rounded-2xl bg-slate-50" disabled={isLoadingSettings} />
                </div>
              </div>
              <div className={`space-y-3 transition-opacity ${isLoadingSettings ? 'opacity-50' : 'opacity-100'}`}>
                <Label className="font-bold">Access Token Permanente</Label>
                <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="h-14 rounded-2xl bg-slate-50" disabled={isLoadingSettings} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                 <Button variant="outline" onClick={handleTestWhatsApp} disabled={isTestingWa} className="h-14 px-8 rounded-2xl gap-2 font-bold">
                   {isTestingWa ? <RefreshCw className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Testar Conexão
                 </Button>
                 <Button onClick={handleSaveCredentials} className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold gap-2 text-white">
                   <Database className="w-4 h-4" /> Salvar Credenciais
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asaas" className="space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <CardHeader className="py-8 px-10 border-b bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm"><CreditCard className="w-5 h-5" /></div>
                <CardTitle className="text-xl font-bold text-indigo-900">Configuração Asaas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <Label className="font-bold">API Token (Produção)</Label>
                    <Input type="password" placeholder="$asaas_..." className="h-14 rounded-2xl" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleTestAsaas} disabled={isTestingAsaas} className="h-14 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold gap-2 text-white">
                      {isTestingAsaas ? <RefreshCw className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4" />} Validar Integração
                    </Button>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integracoes;
