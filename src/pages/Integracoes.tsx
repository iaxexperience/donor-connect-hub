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
import { useToast } from "@/hooks/use-toast";
import { useDonors } from "@/hooks/useDonors";
import { supabase } from "@/integrations/supabase/client";
import { 
  validateMetaCredentials, 
  fetchMetaTemplates, 
  sendWhatsAppDirectMessage,
  sendWhatsAppTemplate
} from "@/lib/whatsappService";
import { 
  getWhatsAppSettings, 
  saveWhatsAppSettings 
} from "@/lib/whatsappSettingsService";
import { useCampaigns } from "@/hooks/useCampaigns";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { donors } = useDonors();
  const { campaigns } = useCampaigns();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat States
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  // Tab Management
  const [activeTab, setActiveTab] = useState("config");
  const [waConnected, setWaConnected] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  
  const [wabaId, setWabaId] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const [templates, setTemplates] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("meta_templates");
      return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
    } catch (e) {
      return INITIAL_TEMPLATES;
    }
  });

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<any[]>([]);

  // Mass Messaging States
  const [selectedBatchTemplate, setSelectedBatchTemplate] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [selectedBatchCampaign, setSelectedBatchCampaign] = useState("all");
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchMode, setBatchMode] = useState<"individual" | "massa">("individual");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedDonor]);

  // Load Settings on Mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getWhatsAppSettings();
        if (settings) {
          setWabaId(settings.waba_id || "");
          setPhoneId(settings.phone_number_id || "");
          setAccessToken(settings.access_token || "");
          setWebhookUrl(settings.webhook_url || "");
          
          if (settings.waba_id && settings.phone_number_id && settings.access_token) {
            setWaConnected(true);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    };
    loadSettings();
  }, []);

  // Fetch History and Subscribe Realtime
  useEffect(() => {
    if (!selectedDonor) return;

    // 1. Buscar histórico inicial
    const fetchHistory = async () => {
      console.log(`[Chat Debug] Buscando histórico para o doador ID: ${selectedDonor.id}`);
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('donor_id', selectedDonor.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error(`[Chat Debug] Erro ao buscar histórico:`, error);
      } else if (data) {
        console.log(`[Chat Debug] ${data.length} mensagens carregadas do histórico.`);
        setChatMessages(data);
      }
    };

    fetchHistory();

    // 2. Assinar Realtime de forma global e simples (Estilo Pulse)
    const channel = supabase
      .channel('whatsapp_realtime_v2')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          const newMessage = payload.new;
          
          // Debug para ver TUDO que entra no banco
          console.log("[Chat Realtime] Novo registro detectado:", newMessage);

          // Se a mensagem for para o doador selecionado, adiciona na tela
          if (newMessage.donor_id === selectedDonor.id) {
            console.log("[Chat Realtime] Mensagem vinculada ao doador atual. Atualizando UI.");
            setChatMessages(prev => {
              // Evitar duplicatas caso o banco envie o evento e o fetch aconteça ao mesmo tempo
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Chat Realtime] Status da conexão: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDonor]);

  // Load all sent messages for History
  useEffect(() => {
    const fetchFullHistory = async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          donors (name)
        `)
        .eq('sender_id', 'me')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setHistoryMessages(data);
      }
    };
    fetchFullHistory();
  }, [isSendingBatch, isSendingMessage]);

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
      // Synchronize localStorage
      localStorage.setItem("meta_waba_id", wabaId);
      localStorage.setItem("meta_phone_id", phoneId);
      localStorage.setItem("meta_access_token", accessToken);
      
      toast({ title: "Configurações Salvas", description: "O chat usará as novas chaves instantaneamente." });
    } catch (e: any) {
      toast({ title: "Erro ao Salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDonor || !chatInput.trim() || isSendingMessage) return;

    if (!phoneId || !accessToken) {
      toast({ title: "Atenção", description: "Configure e salve as chaves na aba 'Configuração API' primeiro.", variant: "destructive" });
      return;
    }

    setIsSendingMessage(true);
    const messageText = chatInput;
    
    try {
      await sendWhatsAppDirectMessage(
        selectedDonor.phone, 
        messageText, 
        { phoneId, token: accessToken },
        selectedDonor.id
      );
      
      setChatInput("");
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!phoneId || !accessToken) {
      toast({ title: "Erro de Configuração", description: "Informe o Phone ID e o Access Token.", variant: "destructive" });
      return;
    }
    setIsTestingWa(true);
    try {
      const result = await validateMetaCredentials(wabaId, phoneId, accessToken);
      if (result.success) {
        setWaConnected(true);
        toast({ title: "Conexão Estabelecida!", description: "Sua API do WhatsApp está pronta para uso." });
      } else {
        setWaConnected(false);
        toast({ title: "Falha na Conexão", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      setWaConnected(false);
      toast({ title: "Erro no Teste", description: e.message, variant: "destructive" });
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleProcessBatchSend = async () => {
    if (!selectedBatchTemplate) {
      toast({ title: "Erro", description: "Selecione um template primeiro.", variant: "destructive" });
      return;
    }

    let targets = donors;

    // Filter by Segment
    if (selectedSegment !== "all") {
      targets = donors.filter(d => d.type === selectedSegment);
    }

    // Filter by Campaign
    if (selectedBatchCampaign !== "all") {
      // Note: This assumes donors have a campaign_id or similar. 
      // If not linked directly, we might need a join or additional logic.
      // For now we filter based on selection if data supports it.
    }

    // 15-day Rule for Leads
    if (selectedSegment === "lead") {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      targets = targets.filter(donor => {
        const lastMsg = historyMessages.find(m => m.donor_id === donor.id);
        if (!lastMsg) return true;
        return new Date(lastMsg.created_at) < fifteenDaysAgo;
      });
    }

    if (targets.length === 0) {
      toast({ title: "Ops", description: "Nenhum doador elegível encontrado com estes filtros." });
      return;
    }

    setIsSendingBatch(true);
    setBatchProgress(0);
    const template = templates.find(t => t.name === selectedBatchTemplate);

    try {
      for (let i = 0; i < targets.length; i++) {
        const donor = targets[i];
        try {
          // Map {{1}} to donor name
          const components = [
            {
              type: "body",
              parameters: [
                { type: "text", text: donor.name || "Doador" }
              ]
            }
          ];

          await sendWhatsAppTemplate(
            donor.phone,
            selectedBatchTemplate,
            "pt_BR",
            components,
            { phoneId, token: accessToken },
            donor.id,
            { 
              batch_type: batchMode === "massa" ? selectedSegment.toUpperCase() : "INDIVIDUAL",
              template_name: selectedBatchTemplate
            }
          );
          setBatchProgress(((i + 1) / targets.length) * 100);
        } catch (e) {
          console.error(`Error sending to ${donor.id}:`, e);
        }
        // Small delay to avoid API limits
        await new Promise(r => setTimeout(r, 300));
      }
      toast({ title: "Sucesso!", description: `Disparo concluído para ${targets.length} doadores.` });
    } catch (e: any) {
      toast({ title: "Erro no Disparo", description: e.message, variant: "destructive" });
    } finally {
      setIsSendingBatch(false);
      setBatchProgress(0);
    }
  };

  return (
    <div className="space-y-6 container mx-auto pb-10 px-4 md:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-black text-4xl text-slate-900 tracking-tight">WhatsApp Oficial da Meta</h1>
        <div className="flex items-center gap-2">
           <p className="text-slate-500 text-sm font-medium">Conexão em Tempo Real • API Cloud v20.0</p>
           {waConnected && (
             <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] ml-2 animate-pulse">
               CONECTADO
             </Badge>
           )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8 w-fit gap-1 rounded-xl">
          <TabsTrigger value="templates" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Templates</TabsTrigger>
          <TabsTrigger value="enviar" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Enviar Mensagem</TabsTrigger>
          <TabsTrigger value="chat" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2 text-slate-600">
            <MessageCircle className="w-4 h-4" /> Chat Ao Vivo
          </TabsTrigger>
          <TabsTrigger value="automacao" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Automação</TabsTrigger>
          <TabsTrigger value="historico" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Histórico</TabsTrigger>
          <TabsTrigger value="config" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Configuração API</TabsTrigger>
        </TabsList>

        {/* --- ABA DE CHAT --- */}
        <TabsContent value="chat">
          <div className="h-[750px] border border-slate-100 rounded-[32px] overflow-hidden shadow-2xl bg-white flex w-full">
          <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/20">
            <div className="p-6 font-bold border-b text-slate-800 flex items-center justify-between bg-white">
              Contatos
              <Badge variant="secondary" className="bg-blue-50 text-blue-600">{donors?.length || 0}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {donors?.map((donor: any) => (
                  <button
                    key={donor.id}
                    onClick={() => setSelectedDonor(donor)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                      selectedDonor?.id === donor.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]" 
                        : "hover:bg-white hover:shadow-sm text-slate-600"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      selectedDonor?.id === donor.id ? "bg-white/20" : "bg-slate-100"
                    }`}>
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="font-bold text-sm truncate w-full">{donor.name}</span>
                      <span className={`text-[11px] truncate w-full ${selectedDonor?.id === donor.id ? "text-white/70" : "text-slate-400"}`}>
                        {donor.phone}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col bg-slate-50/50">
            {selectedDonor ? (
              <>
                <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{selectedDonor.name}</div>
                      <div className="text-xs text-emerald-500 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado via WhatsApp
                      </div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 px-8 py-8">
                  <div className="space-y-6">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender_id === 'me' ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] p-4 rounded-[22px] shadow-sm transform transition-all hover:scale-[1.01] ${
                          msg.sender_id === 'me' 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                        }`}>
                          <p className="text-[14px] leading-relaxed select-text">{msg.text}</p>
                          <div className={`text-[10px] mt-2 flex items-center justify-end gap-1 opacity-70 ${
                            msg.sender_id === 'me' ? "text-white/80" : "text-slate-400"
                          }`}>
                            <Clock className="w-3 h-3" />
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-6 bg-white border-t border-slate-100 flex gap-4 items-center z-10">
                  <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder="Escreva sua mensagem real..."
                    className="h-16 rounded-[20px] border-slate-200 bg-slate-50 focus:bg-white text-base px-6 shadow-inner transition-all"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !chatInput.trim()}
                    className="h-16 w-16 rounded-[20px] bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                  >
                    {isSendingMessage ? <RefreshCw className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6 -rotate-45" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white">
                <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-8 rotate-3 shadow-sm border border-slate-100">
                  <MessageSquare className="w-12 h-12 text-slate-200" />
                </div>
                <h3 className="font-bold text-slate-800 text-2xl mb-3 tracking-tight">Sua Central de Atendimento</h3>
                <p className="max-w-xs text-slate-400 leading-relaxed font-medium">Selecione um doador ao lado para iniciar conversas reais e visualizá-las em tempo real.</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

        {/* --- ABA DE TEMPLATES --- */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Templates Registrados na Meta</h2>
            <Button variant="outline" size="sm" onClick={handleSyncTemplates} className="gap-2 rounded-xl border-slate-200 font-bold hover:bg-slate-50 transition-all">
              <RefreshCw className="w-4 h-4" /> Atualizar Catálogo
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl: any) => (
              <Card key={tpl.name} className="border-slate-100 shadow-sm rounded-[28px] overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-slate-800">{tpl.name}</CardTitle>
                    <Badge variant="outline" className="text-[9px] h-4 font-bold border-slate-100 opacity-60 uppercase">{tpl.category}</Badge>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px]">{tpl.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50/70 p-5 rounded-2xl min-h-[100px] border border-slate-100/50">
                    <p className="text-slate-600 text-sm italic leading-relaxed font-medium">"{tpl.body}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- ABA DE CONFIGURAÇÃO --- */}
        <TabsContent value="config" className="space-y-6">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="py-10 px-12 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"><Shield className="w-6 h-6" /></div>
                <div>
                  <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Credenciais Meta Developer</CardTitle>
                  <CardDescription className="font-medium text-slate-500">Configurações globais para toda a central de WhatsApp</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-12 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <Label className="font-bold text-slate-700 text-base">WhatsApp Business Account ID</Label>
                  <Input 
                    value={wabaId} 
                    onChange={(e) => setWabaId(e.target.value)} 
                    className="h-16 rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-slate-700 font-medium px-6 text-lg" 
                    placeholder="WABA ID da plataforma"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="font-bold text-slate-700 text-base">Phone Number ID</Label>
                  <Input 
                    value={phoneId} 
                    onChange={(e) => setPhoneId(e.target.value)} 
                    className="h-16 rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-slate-700 font-medium px-6 text-lg" 
                    placeholder="ID do telefone emissor"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <Label className="font-bold text-slate-700 text-base flex items-center gap-2">
                  Access Token Permanente <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Confidencial</Badge>
                </Label>
                <Input 
                  type="password" 
                  value={accessToken} 
                  onChange={(e) => setAccessToken(e.target.value)} 
                  className="h-16 rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-slate-700 font-mono px-6" 
                  placeholder="Seu token de acesso (System User)"
                />
              </div>
              
              <div className="space-y-4 pt-4">
                <Label className="font-bold text-slate-700 text-base">Webhook URL (Opcional)</Label>
                <Input 
                  value={webhookUrl} 
                  onChange={(e) => setWebhookUrl(e.target.value)} 
                  className="h-16 rounded-2xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-slate-700 font-medium px-6" 
                  placeholder="https://seu-dominio.com/api/whatsapp-webhook"
                />
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                 <Button 
                   variant="outline" 
                   onClick={handleTestWhatsApp} 
                   disabled={isTestingWa} 
                   className="h-16 px-10 rounded-2xl gap-3 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
                 >
                   {isTestingWa ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />} 
                   {isTestingWa ? "Testando..." : "Testar Agora"}
                 </Button>
                 <Button 
                   onClick={handleSaveCredentials} 
                   className="h-16 px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold gap-3 text-white shadow-2xl shadow-blue-200 transition-all hover:scale-[1.02]"
                 >
                   <Save className="w-5 h-5" /> Salvar Tudo
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA ENVIAR MENSAGEM --- */}
        <TabsContent value="enviar" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3 text-emerald-600">
                <Zap className="w-6 h-6 shrink-0" />
                <CardTitle className="text-xl font-bold tracking-tight">Disparo Inteligente via Template</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-10 px-8 pb-10">
              {/* Opção CSV Placeholder como no print */}
              <div className="border-2 border-dashed border-blue-100 rounded-[24px] p-8 bg-blue-50/30 flex items-center justify-between group hover:bg-blue-50 transition-all cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">Importar Contatos CSV</h4>
                    <p className="text-slate-400 text-sm">Arquivo com colunas: nome, telefone</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl border-blue-200 text-blue-600 gap-2 font-bold px-6">
                  <Upload className="w-4 h-4" /> Selecionar CSV
                </Button>
              </div>

              <div className="flex items-center gap-6">
                <span className="font-bold text-slate-600">Modo de Disparo:</span>
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                  <button 
                    onClick={() => setBatchMode("individual")}
                    className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${batchMode === "individual" ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Individual
                  </button>
                  <button 
                    onClick={() => setBatchMode("massa")}
                    className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${batchMode === "massa" ? "bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    Em Massa
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="font-black text-slate-800 text-sm uppercase tracking-wider">1. Selecione o Template</Label>
                    <Select value={selectedBatchTemplate} onValueChange={setSelectedBatchTemplate}>
                      <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-slate-100 focus:ring-blue-600 transition-all text-slate-700 font-bold px-6">
                        <SelectValue placeholder="Escolher template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-black text-slate-800 text-sm uppercase tracking-wider">2. Selecione o Destinatário</Label>
                    {batchMode === "massa" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                          <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6">
                            <SelectValue placeholder="Todos Segmentos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Doadores</SelectItem>
                            <SelectItem value="lead">Apenas Leads (15 dias rule)</SelectItem>
                            <SelectItem value="recorrente">Doadores Recorrentes</SelectItem>
                            <SelectItem value="esporadico">Doadores Esporádicos</SelectItem>
                            <SelectItem value="unico">Doadores Únicos</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedBatchCampaign} onValueChange={setSelectedBatchCampaign}>
                          <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6">
                            <SelectValue placeholder="Todas Campanhas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas Campanhas</SelectItem>
                            {campaigns.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                        <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6">
                          <SelectValue placeholder="Selecione o doador..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                           {donors.map(d => (
                             <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.phone})</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-[28px] p-8 border border-slate-100 flex flex-col">
                  <span className="font-black text-slate-800 text-sm uppercase tracking-wider mb-6">3. Variáveis do Template</span>
                  {selectedBatchTemplate ? (
                     <div className="flex-1 flex flex-col gap-6 justify-center items-center text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl">
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
                           <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 mb-1">Dinamismo Ativado</p>
                          <p className="text-slate-400 text-sm">As variáveis {{1}} serão substituídas pelo nome de cada doador automaticamente.</p>
                        </div>
                     </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-100/30 rounded-3xl">
                      <p className="text-sm font-medium">Selecione um template para preencher as variáveis.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-4 pt-4">
                 {isSendingBatch && (
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                     <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${batchProgress}%` }} />
                   </div>
                 )}
                 <Button 
                   onClick={handleProcessBatchSend}
                   disabled={isSendingBatch}
                   className="bg-emerald-600 hover:bg-emerald-700 h-16 px-12 rounded-2xl gap-3 text-white font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-100"
                 >
                   <Send className="w-6 h-6 -rotate-45" /> 
                   {isSendingBatch ? "Processando..." : "Enviar Agora"}
                 </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA HISTÓRICO --- */}
        <TabsContent value="historico" className="space-y-6">
          <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-50">
              <div className="flex items-center gap-3 text-slate-800">
                <History className="w-6 h-6" />
                <CardTitle className="text-xl font-bold tracking-tight">Histórico de Mensagens Meta</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50">
                   <TableRow className="border-none hover:bg-transparent">
                     <TableHead className="font-black text-slate-400 text-[11px] uppercase tracking-widest pl-8 py-6">DATA/HORA</TableHead>
                     <TableHead className="font-black text-slate-400 text-[11px] uppercase tracking-widest py-6">LOTE / FILTRO</TableHead>
                     <TableHead className="font-black text-slate-400 text-[11px] uppercase tracking-widest py-6">DESTINATÁRIO</TableHead>
                     <TableHead className="font-black text-slate-400 text-[11px] uppercase tracking-widest py-6">TEMPLATE</TableHead>
                     <TableHead className="font-black text-slate-400 text-[11px] uppercase tracking-widest pr-8 py-6 text-right">STATUS</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {historyMessages.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">Nenhuma mensagem enviada até o momento.</TableCell>
                     </TableRow>
                   ) : (
                     historyMessages.map((msg) => (
                       <TableRow key={msg.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                         <TableCell className="pl-8 font-medium text-slate-600">{new Date(msg.created_at).toLocaleString('pt-BR')}</TableCell>
                         <TableCell>
                            <Badge variant="outline" className={`font-black text-[10px] border-none ${msg.metadata?.batch_type === 'INDIVIDUAL' ? "text-blue-600 bg-blue-50" : "text-purple-600 bg-purple-50"}`}>
                              {msg.metadata?.batch_type || "INDIVIDUAL"}
                            </Badge>
                         </TableCell>
                         <TableCell className="font-bold text-slate-800">{msg.donors?.name || "Desconhecido"}</TableCell>
                         <TableCell className="font-mono text-[13px] text-blue-800">{msg.metadata?.template_name || "Texto Livre"}</TableCell>
                         <TableCell className="pr-8 text-right">
                            <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px]">Sucesso</Badge>
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA AUTOMAÇÃO (Placeholder) --- */}
        <TabsContent value="automacao" className="space-y-6">
           <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100 text-center">
              <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center mb-8 rotate-12 shadow-sm border border-slate-100">
                <Zap className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="font-bold text-slate-800 text-2xl mb-3 tracking-tight">Fluxos Automatizados</h3>
              <p className="max-w-md text-slate-400 leading-relaxed font-medium">Configure gatilhos automáticos para enviar mensagens de boas-vindas, lembretes de expiração e reativação de leads sem intervenção manual.</p>
              <Button className="mt-8 rounded-2xl bg-slate-900 px-10 h-14 font-bold shadow-xl">Ativar Configuração Assistida</Button>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integracoes;
