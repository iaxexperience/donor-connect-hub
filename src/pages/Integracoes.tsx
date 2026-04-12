import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Users,
  FileText, Shield, CalendarClock, UserCheck, UserMinus, Clock,
  AlertTriangle, Phone, Settings2, Key, Globe, Database, CreditCard,
  RefreshCw, History, Info, ChevronRight, Code, Copy, Zap, ListChecks, Plus,
  Search, Upload, Smartphone, Mail, MessageCircle, Save, User as UserIcon
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
  validateMetaCredentials, 
  fetchMetaTemplates, 
  createMetaTemplate, 
  sendWhatsAppDirectMessage 
} from "@/lib/whatsappService";
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
  const { donors } = useDonors();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [waConnected, setWaConnected] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isTestingAsaas, setIsTestingAsaas] = useState(false);
  
  const [wabaId, setWabaId] = useState("1222137823202647");
  const [phoneId, setPhoneId] = useState("903758466162084");
  const [accessToken, setAccessToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("https://...");

  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("meta_templates");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TEMPLATES;
    } catch (e) {
      return INITIAL_TEMPLATES;
    }
  });

  // Chat States
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedDonor]);

  // Background Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getWhatsAppSettings();
        if (settings) {
          if (settings.waba_id) setWabaId(settings.waba_id);
          if (settings.phone_number_id) setPhoneId(settings.phone_number_id);
          if (settings.access_token) setAccessToken(settings.access_token);
          if (settings.webhook_url) setWebhookUrl(settings.webhook_url);
        }
      } catch (err) {
        console.error("Erro background load:", err);
      }
    };
    loadSettings();
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

  const handleSaveCredentials = async () => {
    try {
      await saveWhatsAppSettings({
        waba_id: wabaId,
        phone_number_id: phoneId,
        access_token: accessToken,
        webhook_url: webhookUrl
      });
      localStorage.setItem("meta_waba_id", wabaId);
      localStorage.setItem("meta_phone_id", phoneId);
      localStorage.setItem("meta_access_token", accessToken);
      toast({ title: "Salvo", description: "Configurações sincronizadas no banco de dados." });
    } catch (e: any) {
      toast({ title: "Erro ao Salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDonor || !chatInput.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    const donorId = selectedDonor.id;
    const messageText = chatInput;
    
    try {
      await sendWhatsAppDirectMessage(selectedDonor.phone, messageText);
      
      const newMessage = {
        id: Date.now(),
        text: messageText,
        sender: "me",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => ({
        ...prev,
        [donorId]: [...(prev[donorId] || []), newMessage]
      }));

      setChatInput("");
      toast({ title: "Mensagem enviada" });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWa(true);
    try {
      const result = await validateMetaCredentials(wabaId, phoneId, accessToken);
      if (result.success) {
        setWaConnected(true);
        toast({ title: "Conexão OK", description: "Autenticação Meta validada com sucesso." });
      } else {
        setWaConnected(false);
        toast({ title: "Erro na Conexão", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro Crítico", description: e.message, variant: "destructive" });
    } finally {
      setIsTestingWa(false);
    }
  };

  return (
    <div className="space-y-6 container mx-auto pb-10 px-4 md:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-black text-4xl text-slate-900 tracking-tight">WhatsApp Oficial da Meta</h1>
        <p className="text-slate-500 text-sm font-medium">Integração oficial Meta Business API • Cloud API</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8 w-fit gap-1 rounded-xl">
          <TabsTrigger value="templates" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Templates</TabsTrigger>
          <TabsTrigger value="enviar" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Enviar Mensagem</TabsTrigger>
          <TabsTrigger value="chat" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2 text-slate-600">
            <MessageCircle className="w-4 h-4" /> Chat Ao Vivo
          </TabsTrigger>
          <TabsTrigger value="automacao" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Automação</TabsTrigger>
          <TabsTrigger value="historico" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Histórico</TabsTrigger>
          <TabsTrigger value="config" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Configuração API</TabsTrigger>
          <TabsTrigger value="asaas" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2 text-slate-600">
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

        <TabsContent value="chat" className="h-[700px] border border-slate-100 rounded-[32px] overflow-hidden shadow-sm bg-white flex">
          {/* Conversas Sidebar */}
          <div className="w-80 border-r border-slate-100 flex flex-col bg-white">
            <div className="p-6 font-bold border-b text-slate-800 flex items-center justify-between">
              Caixa de Entrada
              <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100">{donors?.length || 0}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {donors?.map((donor: any) => (
                  <button
                    key={donor.id}
                    onClick={() => setSelectedDonor(donor)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                      selectedDonor?.id === donor.id 
                        ? "bg-blue-50 text-blue-900 shadow-sm" 
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="font-bold text-sm truncate w-full">{donor.name}</span>
                      <span className="text-xs truncate w-full opacity-60">{donor.phone}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Área de Chat */}
          <div className="flex-1 flex flex-col bg-slate-50/30">
            {selectedDonor ? (
              <>
                <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{selectedDonor.name}</div>
                      <div className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> WhatsApp Ativo
                      </div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages[selectedDonor.id]?.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                          msg.sender === "me" 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                          <div className={`text-[10px] mt-1 text-right opacity-60 ${msg.sender === "me" ? "text-white" : "text-slate-400"}`}>
                            {msg.time}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-6 bg-white border-t border-slate-100 flex gap-3 items-center">
                  <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !chatInput.trim()}
                    className="h-14 w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100"
                  >
                    {isSendingMessage ? <RefreshCw className="animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="font-bold text-slate-600 text-xl mb-2">Seu Atendimento está pronto</h3>
                <p className="max-w-xs text-sm">Selecione um doador na lista ao lado para iniciar uma conversa oficial via WhatsApp.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="py-8 px-10 border-b border-slate-50 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Shield className="w-5 h-5" /></div>
                <CardTitle className="text-xl font-bold text-slate-800">Credenciais Meta Developer</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">WhatsApp Business Account ID (WABA_ID)</Label>
                  <Input 
                    value={wabaId} 
                    onChange={(e) => setWabaId(e.target.value)} 
                    className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all text-slate-700" 
                    placeholder="ID da conta"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">Phone Number ID</Label>
                  <Input 
                    value={phoneId} 
                    onChange={(e) => setPhoneId(e.target.value)} 
                    className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all text-slate-700" 
                    placeholder="ID do telefone"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-bold text-slate-700">Access Token Permanente (System User Token)</Label>
                <Input 
                  type="password" 
                  value={accessToken} 
                  onChange={(e) => setAccessToken(e.target.value)} 
                  className="h-14 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all text-slate-700 font-mono" 
                  placeholder="Seu token de acesso"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                 <Button 
                   variant="outline" 
                   onClick={handleTestWhatsApp} 
                   disabled={isTestingWa} 
                   className="h-14 px-8 rounded-2xl gap-2 font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
                 >
                   {isTestingWa ? <RefreshCw className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} 
                   Testar Conexão
                 </Button>
                 <Button 
                   onClick={handleSaveCredentials} 
                   className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold gap-2 text-white shadow-lg shadow-blue-200"
                 >
                   <Save className="w-4 h-4" /> Salvar Credenciais
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ... manter as outras TabsContent (enviar, automacao, historico, asaas) se necessario ... */}
        
      </Tabs>
    </div>
  );
};

export default Integracoes;
