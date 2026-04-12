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
  sendWhatsAppDirectMessage 
} from "@/lib/whatsappService";
import { getWhatsAppSettings, saveWhatsAppSettings } from "@/lib/whatsappSettingsService";
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
  const { toast } = useToast();
  const { donors } = useDonors();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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

  // Chat States
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

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
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('donor_id', selectedDonor.id)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setChatMessages(data);
      }
    };

    fetchHistory();

    // 2. Assinar Realtime
    const channel = supabase
      .channel(`chat_${selectedDonor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `donor_id=eq.${selectedDonor.id}`
        },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDonor]);

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
      // Sincronizar tbm o localStorage p/ compatibilidade com funções antigas
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
      // Disparo Real via API utilizando as credenciais atuais da tela/banco
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
    setIsTestingWa(true);
    try {
      const result = await validateMetaCredentials(wabaId, phoneId, accessToken);
      if (result.success) {
        setWaConnected(true);
        toast({ title: "Conexão Validada!", description: "Sua conta Meta está pronta para uso." });
      } else {
        setWaConnected(false);
        toast({ title: "Credenciais Inválidas", description: result.error, variant: "destructive" });
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
        <p className="text-slate-500 text-sm font-medium">Conexão em Tempo Real • API Cloud v20.0</p>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8 w-fit gap-1 rounded-xl">
          <TabsTrigger value="chat" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2 text-slate-600">
            <MessageCircle className="w-4 h-4" /> Chat Ao Vivo
          </TabsTrigger>
          <TabsTrigger value="templates" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Templates</TabsTrigger>
          <TabsTrigger value="config" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Configuração API</TabsTrigger>
        </TabsList>

        {/* --- ABA DE CHAT --- */}
        <TabsContent value="chat" className="h-[750px] border border-slate-100 rounded-[32px] overflow-hidden shadow-2xl bg-white flex">
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
              <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                 <Button 
                   variant="outline" 
                   onClick={handleTestWhatsApp} 
                   disabled={isTestingWa} 
                   className="h-16 px-10 rounded-2xl gap-3 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
                 >
                   {isTestingWa ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />} 
                   Testar Agora
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
        
      </Tabs>

      {/* --- SEÇÃO DE CONFIGURAÇÃO (FIXA NO FINAL) --- */}
      <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white mt-12">
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
          <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
             <Button 
               variant="outline" 
               onClick={handleTestWhatsApp} 
               disabled={isTestingWa} 
               className="h-16 px-10 rounded-2xl gap-3 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
             >
               {isTestingWa ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />} 
               Testar Agora
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
    </div>
  );
};

export default Integracoes;
