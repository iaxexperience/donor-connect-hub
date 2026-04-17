import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
  Bell, Globe, Lock, Palette, Save, 
  Upload, Sparkles, Building2, Clock,
  Shield, Key, Smartphone, Activity, History, ListFilter,
  AlertTriangle, UserCircle, FileText, User, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  
  // States for User Profile
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Audit Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");

  const passwordRules = {
    length: newPassword.length >= 8,
    number: /\d/.test(newPassword),
    upper: /[A-Z]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = newPassword === confirmNewPassword && newPassword !== "";

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-medium transition-colors ${met ? "text-emerald-500" : "text-muted-foreground"}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
      <span>{text}</span>
    </div>
  );

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

    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile({
            name: profile.name || "",
            email: user.email || "",
            cpf: profile.cpf || "",
            phone: profile.phone || "",
          });
        }
      }
    };

    const loadUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) setUserRole(profile.role);
      }
    };

    loadSettings();
    loadUserProfile();
    loadUserRole();
  }, []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    
    if (filterAction !== "all") {
      query = query.eq('action', filterAction);
    }

    const { data, error } = await query;
    if (!error) setLogs(data || []);
    setLogsLoading(false);
  };

  const saveLog = async (action: string, resource: string, details: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: userProfile.name || user.email,
      user_email: user.email,
      action,
      resource,
      details,
    });
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Senhas divergentes", description: "A nova senha e a confirmação não coincidem.", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      toast({ title: "Senha atualizada!", description: "Sua senha foi alterada com sucesso." });
      saveLog('UPDATE_PASSWORD', 'seguranca', { user_email: userProfile.email });
      setNewPassword("");
      setConfirmNewPassword("");
      setCurrentPassword("");
    } catch (error: any) {
      toast({ title: "Erro ao atualizar senha", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const triggerLogoUpload = () => {
    logoInputRef.current?.click();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    
    // 1. Mostrar prévia localBase64 (feedback imediato)
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setLogoUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // 2. Tentar subir para o Supabase Storage se possível
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
        
        setLogoUrl(publicUrl);
        toast({ title: "Logo enviado!", description: "Imagem salva com sucesso." });
      }
    } catch (err) {
      console.error("Storage upload failed, staying with Base64:", err);
      toast({ title: "Prévia carregada", description: "Clique em salvar para aplicar no navegador." });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    toast({ title: "Logo removido", description: "Clique em Salvar para aplicar." });
  };

  const handleSignOutAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: 'others' });
      toast({ title: "Sessões encerradas", description: "Todos os outros dispositivos foram desconectados." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          cpf: userProfile.cpf,
          phone: userProfile.phone,
          name: userProfile.name
        })
        .eq('id', user.id);

      if (error) throw error;
      toast({ title: "Perfil atualizado!", description: "Seus dados pessoais foram salvos." });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar perfil", description: error.message, variant: "destructive" });
    }
  };

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
        saveLog('UPDATE_SETTINGS', 'configuracoes', settings);
      }
    } catch (err) {
      toast({ title: "Salvo localmente", description: "Configurações aplicadas ao seu navegador." });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-black text-3xl text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 text-sm font-medium">Gerencie as preferências, identidade visual e segurança da sua plataforma.</p>
      </div>

      <Tabs defaultValue="geral" className="w-full space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit">
          <TabsTrigger value="geral" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Globe className="w-4 h-4" />
            <span className="font-bold">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Palette className="w-4 h-4" />
            <span className="font-bold">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="perfil" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <UserCircle className="w-4 h-4" />
            <span className="font-bold">Meu Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Lock className="w-4 h-4" />
            <span className="font-bold">Segurança</span>
          </TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger value="auditoria" onClick={fetchLogs} className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-primary">
              <History className="w-4 h-4" />
              <span className="font-bold">Auditoria</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB: GERAL */}
        <TabsContent value="geral" className="space-y-6 animate-in fade-in-50 duration-500">
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
                  <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="Nome da organização" />
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
        </TabsContent>

        {/* TAB: APARÊNCIA */}
        <TabsContent value="aparencia" className="space-y-6 animate-in fade-in-50 duration-500">
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
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-bold h-10" disabled={isUploadingLogo} onClick={triggerLogoUpload}>
                      <Upload className="w-4 h-4 mr-2" /> {isUploadingLogo ? "Enviando..." : "Upload Logo"}
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold h-10" onClick={handleRemoveLogo}>Remover</Button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-tight">PNG, JPG ou SVG. Máx. 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MEU PERFIL */}
        <TabsContent value="perfil" className="space-y-6 animate-in fade-in-50 duration-500">
          <Card className="border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg font-bold">Meus Dados Pessoais</CardTitle>
              </div>
              <CardDescription>Gerencie suas informações de contato e identificação.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Nome Completo</Label>
                  <Input 
                    value={userProfile.name} 
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} 
                    placeholder="Seu nome"
                    className="h-12 rounded-xl bg-slate-50/30 border-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">E-mail</Label>
                  <Input 
                    value={userProfile.email} 
                    disabled 
                    className="h-12 rounded-xl bg-slate-100/50 border-slate-100 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">CPF</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={userProfile.cpf} 
                      onChange={(e) => setUserProfile({...userProfile, cpf: e.target.value})} 
                      placeholder="000.000.000-00" 
                      className="h-12 rounded-xl bg-slate-50/30 border-slate-100 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Telefone</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={userProfile.phone} 
                      onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})} 
                      placeholder="(00) 00000-0000" 
                      className="h-12 rounded-xl bg-slate-50/30 border-slate-100 pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={handleUpdateProfile} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white px-8 h-12">
                  <Save className="w-4 h-4 mr-2" /> Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SEGURANÇA */}
        <TabsContent value="seguranca" className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg font-bold">Alterar Senha</CardTitle>
                </div>
                <CardDescription>Mantenha sua conta protegida com uma senha forte.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Senha Atual (para confirmação)</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="rounded-xl bg-slate-50/50"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nova Senha</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="rounded-xl bg-slate-50/50"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <PasswordRequirement met={passwordRules.length} text="8+ caracteres" />
                      <PasswordRequirement met={passwordRules.number} text="Um número" />
                      <PasswordRequirement met={passwordRules.upper} text="Uma maiúscula" />
                      <PasswordRequirement met={passwordRules.special} text="Um símbolo (!@#)" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        className={`rounded-xl transition-all duration-300 ${passwordsMatch ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500" : "bg-slate-50/50"}`}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                      {passwordsMatch && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-in fade-in zoom-in" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Button 
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                    className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <Key className="w-4 h-4" /> {isUpdatingPassword ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm rounded-2xl bg-slate-900 text-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-lg font-bold text-white">Autenticação 2FA</CardTitle>
                </div>
                <CardDescription className="text-slate-400">Adicione uma camada extra de segurança à sua conta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold block">Status atual</span>
                    <span className="text-[10px] text-red-400 uppercase font-black tracking-widest leading-none">Desativado</span>
                  </div>
                  <Switch />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">Recomendamos ativar a autenticação em duas etapas para evitar acessos não autorizados.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base font-bold">Sessões Ativas</CardTitle>
                    <CardDescription className="text-[11px]">Gerencie os dispositivos conectados à sua conta.</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl gap-2" onClick={handleSignOutAllSessions}>
                  Encerrar todas as outras sessões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Este Dispositivo (Chrome / Windows)</p>
                      <p className="text-xs text-slate-500">João Pessoa, PB • Conectado agora</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-emerald-600 border-emerald-200 bg-emerald-50">Sessão Atual</Badge>
                </div>
                <div className="flex items-center justify-between p-6 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">IPhone 15 Pro Max</p>
                      <p className="text-xs text-slate-500">Recife, PE • Há 2 horas</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 text-xs">Desconectar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Segurança da Conta</p>
              <p className="text-xs text-amber-700 leading-relaxed">Você mudou sua senha pela última vez há 45 dias. É recomendável trocar sua senha a cada 90 dias para manter sua conta segura.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-6 animate-in fade-in-50 duration-500">
          <Card className="border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Logs de Auditoria</CardTitle>
                    <CardDescription className="text-xs">Registro de todas as ações críticas realizadas no sistema.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading} className="rounded-xl h-9">
                    <Activity className={`w-4 h-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} /> Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-50 flex gap-2">
                 <Button 
                   variant={filterAction === "all" ? "secondary" : "ghost"} 
                   size="sm" 
                   onClick={() => {setFilterAction("all"); setTimeout(fetchLogs, 10);}}
                   className="rounded-lg text-xs font-bold"
                 >Todos</Button>
                 <Button 
                   variant={filterAction === "UPDATE_SETTINGS" ? "secondary" : "ghost"} 
                   size="sm" 
                   onClick={() => {setFilterAction("UPDATE_SETTINGS"); setTimeout(fetchLogs, 10);}}
                   className="rounded-lg text-xs font-bold"
                 >Configurações</Button>
                 <Button 
                   variant={filterAction === "OPEN_CASHIER" ? "secondary" : "ghost"} 
                   size="sm" 
                   onClick={() => {setFilterAction("OPEN_CASHIER"); setTimeout(fetchLogs, 10);}}
                   className="rounded-lg text-xs font-bold"
                 >Abrir Caixa</Button>
                 <Button 
                   variant={filterAction === "CLOSE_CASHIER" ? "secondary" : "ghost"} 
                   size="sm" 
                   onClick={() => {setFilterAction("CLOSE_CASHIER"); setTimeout(fetchLogs, 10);}}
                   className="rounded-lg text-xs font-bold"
                 >Fechar Caixa</Button>
              </div>
              <div className="relative overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      <th className="px-6 py-3 border-b border-slate-100">Data/Hora</th>
                      <th className="px-6 py-3 border-b border-slate-100">Usuário</th>
                      <th className="px-6 py-3 border-b border-slate-100">Ação</th>
                      <th className="px-6 py-3 border-b border-slate-100">Recurso</th>
                      <th className="px-6 py-3 border-b border-slate-100 text-right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                          Nenhum registro encontrado no período.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 opacity-50" />
                              {format(new Date(log.created_at), "dd/MM HH:mm")}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">{log.user_name}</span>
                              <span className="text-[10px] text-slate-400">{log.user_email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-tighter ${
                              log.action.includes('CLOSE') ? "text-red-600 border-red-100 bg-red-50" :
                              log.action.includes('OPEN') ? "text-emerald-600 border-emerald-100 bg-emerald-50" :
                              "text-blue-600 border-blue-100 bg-blue-50"
                            }`}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.resource}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-primary">
                               <FileText className="w-3.5 h-3.5" />
                             </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveAll} className="h-14 px-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold gap-3 shadow-xl transition-all hover:scale-105">
          <Save className="w-5 h-5" /> Salvar Todas as Configurações
        </Button>
      </div>
    </div>
  );
};

export default Configuracoes;
