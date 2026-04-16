import { useState, useEffect } from "react";
import { 
  Bell, Globe, Lock, Palette, Save, 
  Target, Settings2, Share2, Shield,
  Upload, Trash2, Sparkles, Building2,
  Phone, Mail, MapPin, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Configuracoes = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("identidade");
  const [isLoading, setIsLoading] = useState(true);
  
  // States for White Label
  const [systemName, setSystemName] = useState("Pulse Doações");
  const [primaryColor, setPrimaryColor] = useState("#0066CC");
  const [secondaryColor, setSecondaryColor] = useState("#2a9d8f");
  const [logoUrl, setLogoUrl] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("18:00");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Tenta carregar do LocalStorage primeiro (Modo Offline/Local)
        const localData = localStorage.getItem('white_label_settings');
        if (localData) {
          const parsed = JSON.parse(localData);
          setSystemName(parsed.system_name || "Pulse Doações");
          setPrimaryColor(parsed.primary_color || "#0066CC");
          setSecondaryColor(parsed.secondary_color || "#2a9d8f");
          setLogoUrl(parsed.logo_url || "");
          setCnpj(parsed.cnpj || "");
          setPhone(parsed.phone || "");
          setEmail(parsed.email || "");
          setAddress(parsed.address || "");
          setOpeningTime(parsed.opening_time || "08:00");
          setClosingTime(parsed.closing_time || "18:00");
          setIsLoading(false);
        }

        // Tenta carregar do Supabase (Apenas leitura no momento)
        const { data, error } = await supabase
          .from('white_label_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        
        if (data) {
          setSystemName(data.system_name || "Pulse Doações");
          setPrimaryColor(data.primary_color || "#0066CC");
          setSecondaryColor(data.secondary_color || "#2a9d8f");
          setLogoUrl(data.logo_url || "");
          setCnpj(data.cnpj || "");
          setPhone(data.phone || "");
          setEmail(data.email || "");
          setAddress(data.address || "");
          setOpeningTime(data.opening_time || "08:00");
          setClosingTime(data.closing_time || "18:00");
          
          // Sincroniza LocalStorage com o banco se houver dados
          localStorage.setItem('white_label_settings', JSON.stringify(data));
        }
      } catch (err) {
        console.error("Erro ao carregar configurações White Label:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveWhiteLabel = async () => {
    const settings = {
      id: 1,
      system_name: systemName,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      logo_url: logoUrl,
      cnpj: cnpj,
      phone: phone,
      email: email,
      address: address,
      opening_time: openingTime,
      closing_time: closingTime,
      updated_at: new Date().toISOString()
    };

    // Salva SEMPRE no LocalStorage (Garante funcionamento imediato)
    localStorage.setItem('white_label_settings', JSON.stringify(settings));

    try {
      // Tenta salvar no Supabase (Pode falhar por restrição de escrita)
      const { error } = await supabase
        .from('white_label_settings')
        .upsert(settings);

      if (error) {
        console.warn("Restrição de escrita no banco detectada. Usando LocalStorage.");
        toast({ 
          title: "Salvo no Navegador", 
          description: "Os dados foram salvos localmente pois o banco está em modo de leitura.", 
          variant: "default" 
        });
      } else {
        toast({ title: "Configurações Salvas!", description: "Dados sincronizados com o banco de dados." });
      }
    } catch (err: any) {
      toast({ 
        title: "Salvo (Modo Local)", 
        description: "Salvo no seu navegador. O banco de dados recusou a gravação.", 
        variant: "default" 
      });
    }
  };

  return (
    <div className="space-y-6 container mx-auto pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-black text-3xl text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 text-sm font-medium">Gerencie as preferências e a identidade visual da sua plataforma.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/80 p-1 mb-8 w-fit gap-1 rounded-xl">
          <TabsTrigger value="objetivo" className="px-5 py-2 rounded-lg gap-2 text-sm font-semibold">
            <Target className="w-4 h-4" /> Objetivo
          </TabsTrigger>
          <TabsTrigger value="sistema" className="px-5 py-2 rounded-lg gap-2 text-sm font-semibold">
            <Settings2 className="w-4 h-4" /> Sistema
          </TabsTrigger>
          <TabsTrigger value="comunicacao" className="px-5 py-2 rounded-lg gap-2 text-sm font-semibold">
            <Share2 className="w-4 h-4" /> Comunicação
          </TabsTrigger>
          <TabsTrigger value="identidade" className="px-5 py-2 rounded-lg gap-2 text-sm font-semibold">
            <Palette className="w-4 h-4" /> Identidade
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="px-5 py-2 rounded-lg gap-2 text-sm font-semibold">
            <Shield className="w-4 h-4" /> Segurança
          </TabsTrigger>
        </TabsList>

        {/* --- ABA IDENTIDADE (WHITE LABEL) --- */}
        <TabsContent value="identidade" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <Card className="lg:col-span-2 border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
              <CardHeader className="py-8 px-10 border-b border-slate-50">
                <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">Identidade Visual</CardTitle>
                <CardDescription>Configure como a sua marca aparece no sistema.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Nome do Sistema</Label>
                    <Input 
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      placeholder="Ex: Sistema de Campanha Eleitoral"
                      className="h-12 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Cor Primária</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg border border-slate-200 shrink-0" 
                          style={{ backgroundColor: primaryColor }}
                        />
                        <Input 
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 rounded-lg bg-slate-50/50 border-slate-200 font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Cor Secundária</Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg border border-slate-200 shrink-0" 
                          style={{ backgroundColor: secondaryColor }}
                        />
                        <Input 
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="h-10 rounded-lg bg-slate-50/50 border-slate-200 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-full md:w-fit p-4 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200 min-h-[120px] min-w-[120px]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
                    ) : (
                      <div className="text-center">
                        <Palette className="w-8 h-8 text-slate-300 mx-auto" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 flex-1">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-bold h-10">
                        <Upload className="w-4 h-4 mr-2" /> Upload Logo
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold h-10">
                         Remover
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight">PNG, JPG ou SVG. Máx. 5MB. Recomendado fundo transparente.</p>
                  </div>
                  
                  <div className="w-full md:w-64 p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Geração de Identidade (IA Premium)</span>
                    </div>
                    <Button className="w-full bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm rounded-2xl text-xs font-bold gap-2">
                       Gerar Marca com IA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
               <CardHeader className="py-8 px-10 border-b border-slate-50 bg-slate-50/20">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">Dados da Instituição</CardTitle>
                      <CardDescription className="text-[11px]">Informações cadastrais e endereço.</CardDescription>
                    </div>
                 </div>
               </CardHeader>
               <CardContent className="p-10 space-y-6">
                 <div className="space-y-4">
                   <div className="space-y-1">
                     <Label className="text-[11px] font-bold text-slate-500 uppercase">CNPJ</Label>
                     <Input 
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="h-12 rounded-xl bg-slate-50/30 border-slate-100" 
                      />
                   </div>
                   <div className="space-y-1">
                     <Label className="text-[11px] font-bold text-slate-500 uppercase">Telefone Principal</Label>
                     <Input 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="83 988533312"
                        className="h-12 rounded-xl bg-slate-50/30 border-slate-100" 
                      />
                   </div>
                   <div className="space-y-1">
                     <Label className="text-[11px] font-bold text-slate-500 uppercase">E-mail Oficial</Label>
                     <Input 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="h-12 rounded-xl bg-slate-50/30 border-slate-100" 
                      />
                   </div>
                   <div className="space-y-1">
                     <Label className="text-[11px] font-bold text-slate-500 uppercase">Endereço Completo</Label>
                     <Input 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Av Presidente Epitácio Pessoa"
                        className="h-12 rounded-xl bg-slate-50/30 border-slate-100" 
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase">Abre às</Label>
                        <div className="relative">
                          <Input 
                            type="time"
                            value={openingTime}
                            onChange={(e) => setOpeningTime(e.target.value)}
                            className="h-12 rounded-xl bg-slate-50/30 border-slate-100 pr-10" 
                          />
                          <Clock className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase">Fecha às</Label>
                        <div className="relative">
                          <Input 
                            type="time"
                            value={closingTime}
                            onChange={(e) => setClosingTime(e.target.value)}
                            className="h-12 rounded-xl bg-slate-50/30 border-slate-100 pr-10" 
                          />
                          <Clock className="absolute right-4 top-4 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                   </div>
                 </div>
               </CardContent>
            </Card>

          </div>

          <div className="flex justify-end">
             <Button 
                onClick={handleSaveWhiteLabel}
                className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-3 shadow-xl transition-all hover:scale-105"
              >
               <Save className="w-5 h-5" /> Salvar Alterações
             </Button>
          </div>
        </TabsContent>

        {/* --- DEMAIS ABAS (PLACEHOLDERS) --- */}
        <TabsContent value="objetivo">
          <Card className="rounded-[32px] border-slate-100"><CardContent className="p-10 text-center text-slate-400">Configurações de objetivo em breve.</CardContent></Card>
        </TabsContent>
        <TabsContent value="sistema">
          <Card className="rounded-[32px] border-slate-100"><CardContent className="p-10 text-center text-slate-400">Configurações globais do sistema em breve.</CardContent></Card>
        </TabsContent>
        <TabsContent value="comunicacao">
           <Card className="rounded-[32px] border-slate-100"><CardContent className="p-10 text-center text-slate-400">Ajustes de notificação e alertas por e-mail.</CardContent></Card>
        </TabsContent>
        <TabsContent value="seguranca">
           <Card className="rounded-[32px] border-slate-100"><CardContent className="p-10 text-center text-slate-400">Gerenciamento de 2FA e sessões de usuário.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
