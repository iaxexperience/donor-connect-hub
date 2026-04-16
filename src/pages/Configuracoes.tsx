import { useState, useEffect } from "react";
import { 
  Bell, Globe, Lock, Palette, Save, 
  Upload, Sparkles, Building2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Configuracoes = () => {
  const { toast } = useToast();
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
        }

        const { data } = await supabase
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
          localStorage.setItem('white_label_settings', JSON.stringify(data));
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveAll = async () => {
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

    localStorage.setItem('white_label_settings', JSON.stringify(settings));

    try {
      const { error } = await supabase
        .from('white_label_settings')
        .upsert(settings);

      if (error) {
        toast({ 
          title: "Salvo no Navegador", 
          description: "Os dados foram salvos localmente (modo leitura do banco).", 
        });
      } else {
        toast({ title: "Configurações Salvas!", description: "Tudo pronto!" });
      }
    } catch (err) {
      toast({ title: "Salvo localmente", description: "Configurações aplicadas ao seu navegador." });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-black text-3xl text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 text-sm font-medium">Gerencie as preferências e a identidade visual da sua plataforma.</p>
      </div>

      {/* 1. Informações da Organização (Original) */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Informações da Organização</CardTitle>
          </div>
          <CardDescription>Dados básicos exibidos no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da Organização</Label>
              <Input defaultValue="Pulse Doações" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail de Contato</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@ongexemplo.org.br" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Identidade Visual (Novo) */}
      <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="py-8 px-10 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">Identidade Visual</CardTitle>
          </div>
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
                  <div className="w-10 h-10 rounded-lg border border-slate-200 shrink-0" style={{ backgroundColor: primaryColor }} />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 rounded-lg bg-slate-50/50 border-slate-200 font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">Cor Secundária</Label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-slate-200 shrink-0" style={{ backgroundColor: secondaryColor }} />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 rounded-lg bg-slate-50/50 border-slate-200 font-mono text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-fit p-4 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200 min-h-[120px] min-w-[120px]">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" /> : <div className="text-center"><Palette className="w-8 h-8 text-slate-300 mx-auto" /><span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">Logo</span></div>}
            </div>
            <div className="space-y-4 flex-1">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-bold h-10"><Upload className="w-4 h-4 mr-2" /> Upload Logo</Button>
                <Button variant="ghost" size="sm" className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold h-10">Remover</Button>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">PNG, JPG ou SVG. Máx. 5MB.</p>
            </div>
            <div className="w-full md:w-64 p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-700"><Sparkles className="w-4 h-4" /><span className="text-[11px] font-black uppercase tracking-widest">IA Premium</span></div>
              <Button className="w-full bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm rounded-2xl text-xs font-bold gap-2">Gerar com IA</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Dados da Instituição (Novo) */}
      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="py-6 px-10 border-b border-slate-50 bg-slate-50/20">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-bold text-slate-800">Dados da Instituição</CardTitle>
          </div>
          <CardDescription className="text-xs">Informações cadastrais e endereço.</CardDescription>
        </CardHeader>
        <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1"><Label className="text-[11px] font-bold text-slate-500 uppercase">CNPJ</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="h-12 rounded-xl bg-slate-50/30 border-slate-100" /></div>
          <div className="space-y-1"><Label className="text-[11px] font-bold text-slate-500 uppercase">Telefone Principal</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="83 988533312" className="h-12 rounded-xl bg-slate-50/30 border-slate-100" /></div>
          <div className="space-y-1"><Label className="text-[11px] font-bold text-slate-500 uppercase">E-mail Oficial</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com.br" className="h-12 rounded-xl bg-slate-50/30 border-slate-100" /></div>
          <div className="space-y-1"><Label className="text-[11px] font-bold text-slate-500 uppercase">Endereço Completo</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av Presidente Epitácio Pessoa" className="h-12 rounded-xl bg-slate-50/30 border-slate-100" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-[11px] font-bold text-slate-500 uppercase">Abre às</Label><Input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} className="h-12 rounded-xl bg-slate-50/30 border-slate-100" /></div>
            <div className="space-y-1"><Label className="text-[11px] font-bold text-slate-500 uppercase">Fecha às</Label><Input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} className="h-12 rounded-xl bg-slate-50/30 border-slate-100" /></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveAll} className="h-14 px-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-3 shadow-xl transition-all hover:scale-105">
          <Save className="w-5 h-5" /> Salvar Todas as Configurações
        </Button>
      </div>
    </div>
  );
};

export default Configuracoes;
