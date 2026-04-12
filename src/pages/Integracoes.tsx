import { useState, useEffect } from "react";
import {
  Shield, CheckCircle2, RefreshCw, Save, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { validateMetaCredentials } from "@/lib/whatsappService";
import { getWhatsAppSettings, saveWhatsAppSettings } from "@/lib/whatsappSettingsService";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const Integracoes = () => {
  const { toast } = useToast();
  
  const [waConnected, setWaConnected] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  
  const [wabaId, setWabaId] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

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

  const handleSaveCredentials = async () => {
    try {
      await saveWhatsAppSettings({
        waba_id: wabaId,
        phone_number_id: phoneId,
        access_token: accessToken,
        webhook_url: webhookUrl
      });
      // Synchronize localStorage for legacy compatibility
      localStorage.setItem("meta_waba_id", wabaId);
      localStorage.setItem("meta_phone_id", phoneId);
      localStorage.setItem("meta_access_token", accessToken);
      
      toast({ title: "Configurações Salvas", description: "As chaves foram atualizadas com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao Salvar", description: e.message, variant: "destructive" });
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
        <div className="flex items-center gap-2">
           <p className="text-slate-500 text-sm font-medium">Conexão em Tempo Real • API Cloud v20.0</p>
           {waConnected && (
             <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] ml-2 animate-pulse">
               CONECTADO
             </Badge>
           )}
        </div>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8 w-fit gap-1 rounded-xl">
          <TabsTrigger value="chat" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold gap-2 text-slate-600">
            <MessageCircle className="w-4 h-4" /> Chat Ao Vivo
          </TabsTrigger>
          <TabsTrigger value="templates" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Templates</TabsTrigger>
          <TabsTrigger value="config" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-sm font-semibold text-slate-600">Configuração API</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
            Módulo de Chat em manutenção ou indisponível.
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
            Módulo de Templates em manutenção ou indisponível.
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="py-10 px-12 border-b border-slate-50 bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                  <Shield className="w-6 h-6" />
                </div>
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
      </Tabs>
    </div>
  );
};

export default Integracoes;
