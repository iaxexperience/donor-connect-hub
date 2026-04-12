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

      {/* --- SEÇÃO DE CONFIGURAÇÃO (MOVIDA PARA O TOPO) --- */}
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

    </div>
  );
};

export default Integracoes;
