import React, { useState, useEffect } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  MessageSquare, 
  Send, 
  History, 
  Settings, 
  Zap, 
  FileJson,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UserPlus,
  Trash2,
  FileDown,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { WhatsAppChat } from "@/components/automation/WhatsAppChat";
import { metaService, MetaConfig } from "@/services/metaService";
import { metaHistoricoService } from "@/services/metaHistoricoService";
import { useDonors } from "@/hooks/useDonors";
import { supabase } from "@/integrations/supabase/client";

const WhatsApp = () => {
  const { donors } = useDonors();
  const { toast } = useToast();
  
  // Tabs & Global
  const [activeTab, setActiveTab] = useState("chat");
  const [config, setConfig] = useState<MetaConfig>({
    phone_number_id: "",
    access_token: "",
    waba_id: ""
  });
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  
  // 0. Create Template Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "MARKETING",
    language: "pt_BR",
    headerFormat: "NONE",
    mediaUrl: "",
    body: ""
  });

  // 1. Templates States
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // 2. Enviar Mensagem States
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [messageType, setMessageType] = useState<"text" | "image" | "video">("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendMode, setSendMode] = useState<"single" | "batch">("single");
  const [batchClassification, setBatchClassification] = useState("all");
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});

  // 5. Histórico States
  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Initial load
  useEffect(() => {
    const saved = localStorage.getItem("meta_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      setIsConfigSaved(true);
    }
    loadHistory();
    loadStoredTemplates();
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('api-proxy', {
        body: { action: 'ping' }
      });
      if (error) throw error;
      console.log('[WhatsApp] api-proxy ping OK:', data);
      toast({ title: "Conexão OK ✓", description: "Servidor api-proxy respondeu corretamente. O sistema está operacional." });
    } catch (e: any) {
      console.warn('[WhatsApp] api-proxy ping failed:', e);
      const msg = e.message || '';
      let userMsg = msg;
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('blocked') || e.name === 'TypeError') {
        userMsg = 'A Edge Function "api-proxy" pode não estar deployada ainda. Execute: npx supabase functions deploy api-proxy';
      }
      toast({ title: "Falha no Diagnóstico", description: userMsg, variant: "destructive" });
    }
  };

  const loadStoredTemplates = async () => {
    try {
      const data = await metaService.getStoredTemplates();
      setTemplates(data);
    } catch (e) {
      console.error("Erro ao carregar templates salvos:", e);
    }
  };

  const refreshAll = async () => {
    setIsSyncingTemplates(true);
    try {
      await Promise.all([
        loadHistory(),
        loadStoredTemplates(),
        checkConnection()
      ]);
      toast({ title: "Atualizado!", description: "Dados de histórico e templates foram atualizados." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await metaHistoricoService.getHistory();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const syncTemplates = async () => {
    if (!config.waba_id || !config.access_token) {
      toast({ title: "Erro", description: "WABA ID e Access Token são obrigatórios.", variant: "destructive" });
      return;
    }
    setIsSyncingTemplates(true);
    try {
      const data = await metaService.fetchMetaTemplates(config);
      await metaService.saveMetaTemplates(data);
      setTemplates(data);
      setLastSync(new Date().toLocaleString('pt-BR'));
      toast({ title: "Sincronizado!", description: `${data.length} templates importados e salvos no banco.` });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const handleSaveConfig = () => {
    if (!config.phone_number_id || !config.access_token) {
      toast({ title: "Campos obrigatórios", description: "Phone ID e Token são essenciais.", variant: "destructive" });
      return;
    }
    
    // Sanitize config - remove spaces
    const cleanConfig = {
      phone_number_id: config.phone_number_id.trim(),
      access_token: config.access_token.trim(),
      waba_id: config.waba_id?.trim() || ""
    };
    
    localStorage.setItem("meta_config", JSON.stringify(cleanConfig));
    setConfig(cleanConfig);
    setIsConfigSaved(true);
    toast({ title: "Configuração Salva", description: "Suas credenciais foram armazenadas e limpas (sem espaços)." });
  };
  
  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast({ title: "Campos obrigatórios", description: "Nome e corpo são necessários.", variant: "destructive" });
      return;
    }
    
    if (!config.waba_id || !config.access_token) {
      toast({ title: "Configuração faltando", description: "WABA ID e Access Token são necessários.", variant: "destructive" });
      return;
    }
    
        setIsCreatingTemplate(true);
    try {
      // 0. Detect social media URLs in media fields
      if (newTemplate.headerFormat !== "NONE" && newTemplate.mediaUrl) {
        const isSocialMedia = /instagram\.com|facebook\.com|youtube\.com|youtu\.be/.test(newTemplate.mediaUrl);
        if (isSocialMedia) {
          toast({ 
            title: "URL de mídia inválida", 
            description: "Você não pode usar links de redes sociais (Instagram/YouTube) aqui. Use um Handle ID da Meta ou um link direto de arquivo (MP4/PNG).", 
            variant: "destructive" 
          });
          setIsCreatingTemplate(false);
          return;
        }
      }

      // 1. Validate variables - Meta only allows numbers {{1}}, {{2}}
      if (newTemplate.body.includes("{{") && !/\{\{\d+}}/.test(newTemplate.body)) {
        toast({ 
          title: "Variáveis Inválidas", 
          description: "A Meta só aceita números como {{1}}, {{2}}. Substitua variáveis como {{Nome}}.", 
          variant: "destructive" 
        });
        setIsCreatingTemplate(false);
        return;
      }

      const components: any[] = [
        {
          type: "BODY",
          text: newTemplate.body
        }
      ];
      
      if (newTemplate.headerFormat !== "NONE") {
        components.unshift({
          type: "HEADER",
          format: newTemplate.headerFormat,
          example: {
            header_handle: [newTemplate.mediaUrl] 
          }
        });
      }
      
      const payload = {
        name: newTemplate.name.toLowerCase().replace(/\s+/g, "_"),
        category: newTemplate.category,
        language: newTemplate.language,
        components: components
      };
      
      console.log("[WhatsApp] Creating template with meta_data:", payload);
      const result = await metaService.createTemplate(payload, config);
      
      // Checking for Meta API errors inside the 200 result
      if (result.error) {
        throw new Error(JSON.stringify(result.error));
      }

      toast({ title: "Template Criado!", description: "O template foi enviado para análise da Meta." });
      setIsCreateModalOpen(false);
      
      // Reset form
      setNewTemplate({
        name: "",
        category: "MARKETING",
        language: "pt_BR",
        headerFormat: "NONE",
        mediaUrl: "",
        body: ""
      });

      // No immediate sync to avoid race conditions or timeouts
      // User can sync manually after a moment
      setTimeout(() => {
        loadStoredTemplates(); 
      }, 2000);

    } catch (err: any) {
      console.error("Erro na criação:", err);
      let errorMsg = err.message;
      
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error?.message) errorMsg = parsed.error.message;
        else if (parsed.message) errorMsg = parsed.message;
      } catch (e) {}

      if (errorMsg.includes("Failed to send a request")) {
        errorMsg = "Servidor temporariamente indisponível. Tente novamente em alguns segundos.";
      }

      toast({ 
        title: "Erro ao criar", 
        description: errorMsg, 
        variant: "destructive" 
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const handleSendSingle = async () => {
    if (!selectedRecipient) {
      toast({ title: "Erro", description: "Preencha o destinatário.", variant: "destructive" });
      return;
    }

    if (messageType === 'text' && !messageBody && !selectedTemplate) {
      toast({ title: "Erro", description: "Preencha a mensagem ou selecione um template.", variant: "destructive" });
      return;
    }

    if ((messageType === 'image' || messageType === 'video') && !mediaUrl) {
      toast({ title: "Erro", description: "Insira a URL da mídia.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Find donor by phone if possible to link history
      const cleanTarget = selectedRecipient.replace(/\D/g, "");
      const donor = donors.find(d => d.phone?.replace(/\D/g, "") === cleanTarget);
      const donorId = donor?.id;

      if (messageType === 'text') {
        if (selectedTemplate) {
          // Format components for template
          const bodyParams = Object.keys(templateParams)
            .sort((a, b) => Number(a) - Number(b))
            .map(key => ({ type: 'text', text: templateParams[key] }));

          const components = bodyParams.length > 0 ? [{
            type: 'body',
            parameters: bodyParams
          }] : [];

          await metaService.sendTemplateMessage(selectedRecipient, selectedTemplate.name, selectedTemplate.language, components, config, donorId);
        } else {
          await metaService.sendTextMessage(selectedRecipient, messageBody, config, donorId);
        }
      } else {
        await metaService.sendMediaMessage(selectedRecipient, mediaUrl, messageType, config, donorId);
      }
      
      toast({ title: "Mensagem Enviada!", description: `Para: ${selectedRecipient}` });
      setMessageBody("");
      setMediaUrl("");
      setTemplateParams({});
      loadHistory();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBatch = async () => {
    const targets = donors.filter(d => batchClassification === "all" || d.type === batchClassification);
    if (targets.length === 0) {
      toast({ title: "Sem alvos", description: "Nenhum doador encontrado para esta classificação." });
      return;
    }

    setIsBatchSending(true);
    setBatchProgress(0);
    let success = 0;
    const batchId = `B-${Date.now()}`;

    for (let i = 0; i < targets.length; i++) {
      const donor = targets[i];
      if (!donor.phone) continue;

      try {
        if (selectedTemplate) {
          // Basic auto-mapping for Batch: {{1}} = Donor Name, others = manual inputs
          const bodyParams = [];
          
          // Check if we have variables in template
          const bodyText = selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "";
          const vars = bodyText.match(/\{\{(\d+)\}\}/g) || [];
          
          for (let v = 1; v <= vars.length; v++) {
            if (v === 1 && donor.name) {
               bodyParams.push({ type: 'text', text: donor.name });
            } else {
               bodyParams.push({ type: 'text', text: templateParams[v] || "-" });
            }
          }

          const components = bodyParams.length > 0 ? [{ type: 'body', parameters: bodyParams }] : [];

          await metaService.sendTemplateMessage(
            donor.phone, 
            selectedTemplate.name, 
            selectedTemplate.language, 
            components, 
            config, 
            donor.id, 
            batchId
          );
        } else {
           await metaService.sendTextMessage(donor.phone, messageBody, config, donor.id);
        }
        success++;
      } catch (e) {
        console.error("Batch fail for", donor.name, e);
      }
      setBatchProgress(Math.round(((i + 1) / targets.length) * 100));
    }

    setIsBatchSending(false);
    toast({ title: "Envio em Massa Concluído", description: `${success} mensagens enviadas com sucesso.` });
    loadHistory();
  };

  return (
    <div className="container mx-auto p-2 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            WhatsApp <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40">v22.0 API</Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-1 uppercase tracking-widest font-bold opacity-70">Estrutura Completa de Mensageria</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={refreshAll} disabled={isSyncingTemplates}>
             <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingTemplates ? 'animate-spin' : ''}`} /> 
             {isSyncingTemplates ? "Atualizando..." : "Atualizar"}
           </Button>
           <Button 
             variant="default" 
             size="sm" 
             className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
             onClick={() => setActiveTab("send")}
           >
             <Plus className="mr-2 h-4 w-4" /> Novo Disparo
           </Button>
        </div>
      </div>

      {!isConfigSaved && activeTab !== "config" && (
        <Alert variant="destructive" className="border-2 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuração Pendente</AlertTitle>
          <AlertDescription>
            Configure suas credenciais da Meta API na aba <b>Configuração API</b> para ativar os envios.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex items-center justify-between bg-card p-1 rounded-2xl border shadow-sm sticky top-0 z-10 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent border-none w-full justify-start h-auto flex-wrap md:flex-nowrap gap-1">
            <TabsTrigger value="templates" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 h-auto flex-1 min-w-[120px]"><FileJson className="mr-2 h-4 w-4" /> Templates</TabsTrigger>
            <TabsTrigger value="send" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 h-auto flex-1 min-w-[120px]"><Send className="mr-2 h-4 w-4" /> Enviar</TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 h-auto flex-1 min-w-[120px]"><MessageSquare className="mr-2 h-4 w-4" /> Chat ao Vivo</TabsTrigger>
            <TabsTrigger value="automation" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 h-auto flex-1 min-w-[120px]"><Zap className="mr-2 h-4 w-4" /> Automação</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 h-auto flex-1 min-w-[120px]"><History className="mr-2 h-4 w-4" /> Histórico</TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 h-auto flex-1 min-w-[120px]"><Settings className="mr-2 h-4 w-4" /> API</TabsTrigger>
          </TabsList>
        </div>

        {/* 1. TEMPLATES */}
        <TabsContent value="templates" className="animate-in fade-in-50 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="col-span-1 border-none shadow-xl bg-gradient-to-br from-card to-muted/20 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <FileJson className="w-32 h-32" />
                 </div>
                 <CardHeader>
                    <CardTitle>Sincronização</CardTitle>
                    <CardDescription>Obtenha seus templates aprovados diretamente do Facebook.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Button 
                        className="w-full h-12 text-lg font-bold" 
                        onClick={syncTemplates} 
                        disabled={isSyncingTemplates}
                      >
                        {isSyncingTemplates ? "Sincronizando..." : "Sincronizar Meta"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={checkConnection}
                        className="rounded-xl border-dashed"
                      >
                        Diagnóstico de Rede
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-tighter">
                      Última sincronização: {lastSync || "Nunca"}
                    </p>
                 </CardContent>
              </Card>

              <Card className="col-span-2 shadow-sm">
                 <CardHeader>
                     <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Meus Templates</CardTitle>
                          <CardDescription>Gerencie seus templates sincronizados da Meta.</CardDescription>
                        </div>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => setIsCreateModalOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Novo Template
                        </Button>
                     </div>
                 </CardHeader>
                 <CardContent className="overflow-x-auto no-scrollbar">
                    <div className="min-w-[600px]">
                       <Table>
                       <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Idioma</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {templates.length > 0 ? templates.map((t: any) => (
                             <TableRow key={t.id}>
                                <TableCell className="font-bold">{t.name}</TableCell>
                                <TableCell>
                                   <Badge variant={t.status === 'APPROVED' ? 'default' : 'secondary'} className={t.status === 'APPROVED' ? 'bg-green-500' : ''}>
                                      {t.status}
                                   </Badge>
                                </TableCell>
                                <TableCell className="text-xs uppercase opacity-70">{t.category}</TableCell>
                                <TableCell className="text-xs">{t.language}</TableCell>
                                <TableCell className="text-right">
                                   <Button variant="ghost" size="icon" onClick={() => {
                                      setSelectedTemplate(t);
                                      setActiveTab("send");
                                   }}><Send className="h-4 w-4" /></Button>
                                </TableCell>
                             </TableRow>
                          )) : (
                             <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                                   Clique em sincronizar para carregar seus templates da Meta API.
                                </TableCell>
                             </TableRow>
                          )}
                       </TableBody>
                    </Table>
                     </div>
                  </CardContent>
              </Card>
           </div>
        </TabsContent>

        {/* 2. ENVIAR MENSAGEM */}
        <TabsContent value="send" className="animate-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="shadow-lg border-2 border-primary/5">
                 <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="flex items-center gap-2">Configurar Disparo</CardTitle>
                    <div className="flex gap-2 mt-4">
                       <Button 
                         variant={sendMode === 'single' ? 'default' : 'outline'} 
                         className="flex-1"
                         onClick={() => setSendMode('single')}
                       >
                         Individual
                       </Button>
                       <Button 
                         variant={sendMode === 'batch' ? 'default' : 'outline'} 
                         className="flex-1"
                         onClick={() => setSendMode('batch')}
                       >
                         Massa / Segmentação
                       </Button>
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    {sendMode === 'single' ? (
                       <div className="space-y-4 animate-in fade-in zoom-in-95">
                          <div className="space-y-2">
                             <Label>Destinatário (Telefone)</Label>
                             <div className="relative">
                               <Input 
                                 placeholder="558398853..." 
                                 value={selectedRecipient} 
                                 onChange={(e) => setSelectedRecipient(e.target.value)}
                               />
                               <Button variant="ghost" className="absolute right-0 top-0 h-full px-3 text-primary"><UserPlus className="w-4 h-4" /></Button>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="space-y-4 animate-in fade-in zoom-in-95">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Segmento</Label>
                                <Select value={batchClassification} onValueChange={setBatchClassification}>
                                   <SelectTrigger>
                                      <SelectValue placeholder="Escolher..." />
                                   </SelectTrigger>
                                   <SelectContent>
                                      <SelectItem value="all">Todos os Doadores</SelectItem>
                                      <SelectItem value="recorrente">Recorrentes</SelectItem>
                                      <SelectItem value="esporadico">Esporádicos</SelectItem>
                                      <SelectItem value="unico">Únicos</SelectItem>
                                   </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>Alvos Encontrados</Label>
                                <div className="h-10 flex items-center px-4 bg-muted rounded-md font-bold text-primary">
                                   {donors.filter(d => batchClassification === 'all' || d.type === batchClassification).length} Alvos
                                </div>
                             </div>
                          </div>
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                             <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                             <p className="text-[11px] text-blue-700 leading-relaxed">
                                <b>Importante:</b> Envios em massa devem respeitar os limites da Meta API para evitar bloqueios. Recomendamos o uso de templates aprovados.
                             </p>
                          </div>
                       </div>
                    )}

                    <div className="space-y-4 pt-4 border-t">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label>Tipo de Conteúdo</Label>
                             <Select value={messageType} onValueChange={(val: any) => setMessageType(val)}>
                                <SelectTrigger>
                                   <SelectValue placeholder="Escolher tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="text">Texto / Template</SelectItem>
                                   <SelectItem value="image">Imagem (Link)</SelectItem>
                                   <SelectItem value="video">Vídeo (Link)</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                          
                          {messageType === 'text' && (
                            <div className="space-y-2 animate-in slide-in-from-right-2">
                               <Label>Template (Opcional)</Label>
                               <Select onValueChange={(val) => {
                                  const t = templates.find(temp => temp.name === val);
                                  setSelectedTemplate(t);
                               }}>
                                  <SelectTrigger>
                                     <SelectValue placeholder="Selecione um template..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                     <SelectItem value="none">Nenhum (Texto Livre)</SelectItem>
                                     {templates.map(t => (
                                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                     ))}
                                  </SelectContent>
                               </Select>
                            </div>
                          )}

                          {(messageType === 'image' || messageType === 'video') && (
                            <div className="space-y-2 animate-in slide-in-from-right-2">
                               <Label>Link da {messageType === 'image' ? 'Imagem' : 'Mídia'}</Label>
                               <Input 
                                 placeholder="https://..." 
                                 value={mediaUrl} 
                                 onChange={(e) => setMediaUrl(e.target.value)}
                               />
                            </div>
                          )}
                       </div>

                       {messageType === 'text' && (
                          <div className="space-y-2">
                             {selectedTemplate ? (
                                <div className="space-y-4">
                                  <div className="p-4 bg-muted rounded-md text-sm italic opacity-70 border border-dashed">
                                    {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Template sem corpo de texto"}
                                  </div>
                                  
                                  {/* Dynamic Variable Inputs */}
                                  {(() => {
                                    const bodyText = selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "";
                                    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
                                    const varCount = matches.length > 0 ? Math.max(...matches.map((m: any) => {
                                      const num = m.match(/\d+/);
                                      return num ? parseInt(num[0]) : 0;
                                    })) : 0;
                                    
                                    if (varCount === 0) return null;
                                    
                                    return (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                        {Array.from({ length: varCount }).map((_, i) => (
                                          <div key={i} className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-primary opacity-70">Valor para {"{{"}{i+1}{"}}"}</Label>
                                            <Input 
                                              placeholder={`Ex: ${i === 0 ? 'João' : (i === 1 ? 'R$ 50,00' : 'valor')}`}
                                              className="h-9 text-xs"
                                              value={templateParams[i + 1] || ""}
                                              onChange={(e) => setTemplateParams({...templateParams, [i + 1]: e.target.value})}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                             ) : (
                                <textarea 
                                  className="w-full min-h-[150px] p-4 rounded-xl border-2 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none transition-all text-sm"
                                  placeholder="Digite sua mensagem real aqui..."
                                  value={messageBody}
                                  onChange={(e) => setMessageBody(e.target.value)}
                                />
                             )}
                             <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Suporta emojis e Markdown simples</span>
                                <span>{selectedTemplate ? "Template Ativo" : `${messageBody.length} caracteres`}</span>
                             </div>
                          </div>
                        )}
                    </div>
                 </CardContent>
                 <CardFooter className="bg-muted/10 p-6 flex flex-col gap-4">
                    {isBatchSending && (
                      <div className="w-full space-y-2">
                         <div className="flex justify-between text-xs font-bold uppercase">
                            <span>Processando Lote...</span>
                            <span>{batchProgress}%</span>
                         </div>
                         <Progress value={batchProgress} className="h-2" />
                      </div>
                    )}
                    
                    <Button 
                      className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30"
                      onClick={sendMode === 'single' ? handleSendSingle : handleSendBatch}
                      disabled={isSending || isBatchSending}
                    >
                       {isSending || isBatchSending ? (
                         <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                       ) : (
                         <Send className="mr-2 h-5 w-5" />
                       )}
                       {sendMode === 'single' ? "DESPACHAR MENSAGEM" : "INICIAR DISPARO EM MASSA"}
                    </Button>
                 </CardFooter>
              </Card>

              {/* Preview Mobile */}
              <div className="hidden lg:flex flex-col items-center justify-center p-8 bg-slate-900/5 rounded-3xl border-4 border-dashed border-muted relative">
                 <div className="w-72 h-[550px] bg-slate-800 rounded-[3rem] border-[10px] border-slate-900 shadow-2xl relative overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-10" />
                    <div className="h-14 bg-emerald-700 p-4 pt-6 flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-emerald-500/30" />
                       <div className="flex-1">
                          <div className="w-20 h-2 bg-white/20 rounded" />
                       </div>
                    </div>
                    <div className="p-4 space-y-4">
                       <div className="max-w-[80%] bg-emerald-600 text-white p-3 rounded-2xl rounded-tr-none ml-auto text-[10px] shadow-lg">
                           {messageType === 'image' && mediaUrl && (
                             <img src={mediaUrl} alt="Preview" className="rounded-lg mb-2 max-w-full h-auto" />
                           )}
                           {messageType === 'video' && mediaUrl && (
                             <div className="bg-black/20 rounded-lg p-4 mb-2 flex flex-col items-center justify-center border-2 border-dashed border-white/20">
                                <Zap className="w-8 h-8 opacity-50 mb-1" />
                                <span className="text-[8px] opacity-70">Arquivo de Vídeo</span>
                             </div>
                           )}
                           {selectedTemplate 
                             ? (selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Preview do Template") 
                             : (messageBody || (mediaUrl ? "" : "Visualize sua mensagem aqui..."))}
                       </div>
                    </div>
                 </div>
                 <Badge className="absolute bottom-4 uppercase tracking-widest bg-slate-800">Simulação em Tempo Real</Badge>
              </div>
           </div>
        </TabsContent>

        {/* 3. CHAT AO VIVO */}
        <TabsContent value="chat" className="animate-in zoom-in-95 duration-300">
           <WhatsAppChat onStartNewChat={() => setActiveTab("send")} />
        </TabsContent>

        {/* 4. AUTOMAÇÃO */}
        <TabsContent value="automation" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Agradecimento de Doação", desc: "Envia automaticamente após confirmação do Asaas", icon: Zap, status: "active" },
                { title: "Agenda Diária", desc: "Dispara follow-ups agendados todas as manhãs", icon: History, status: "idle" },
                { title: "Aviso de Vencimento", desc: "Lembrete 2 dias antes para recorrentes", icon: AlertCircle, status: "idle" }
              ].map((auto, i) => (
                <Card key={i} className={`relative overflow-hidden group hover:shadow-lg transition-all ${auto.status === 'active' ? 'border-primary/50 bg-primary/5' : ''}`}>
                   <CardHeader>
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                         <auto.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{auto.title}</CardTitle>
                      <CardDescription className="text-xs">{auto.desc}</CardDescription>
                   </CardHeader>
                   <CardFooter>
                      <Button variant={auto.status === 'active' ? 'default' : 'outline'} className="w-full">
                         {auto.status === 'active' ? "Desativar" : "Ativar Automação"}
                      </Button>
                   </CardFooter>
                </Card>
              ))}
           </div>
        </TabsContent>

        {/* 5. HISTÓRICO */}
        <TabsContent value="history">
           <Card className="shadow-sm border-none bg-card/50 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                   <CardTitle>Log de Mensagens</CardTitle>
                   <CardDescription>Rastreio completo de todas as interações da conta.</CardDescription>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm"><FileDown className="mr-2 h-4 w-4" /> Exportar</Button>
                    <Select value={historyFilter} onValueChange={setHistoryFilter}>
                       <SelectTrigger className="w-40">
                          <SelectValue placeholder="Filtrar..." />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="sent">Enviados</SelectItem>
                          <SelectItem value="received">Recebidos</SelectItem>
                          <SelectItem value="error">Falhas</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </CardHeader>
              <CardContent>
                 <div className="rounded-xl border bg-background/50 overflow-hidden">
                    <Table>
                       <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Destinatário</TableHead>
                            <TableHead>Doador</TableHead>
                            <TableHead>Template / Conteúdo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Erro</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {history.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                               <TableCell className="font-mono text-xs">{item.destinatario}</TableCell>
                               <TableCell className="font-medium">{item.donors?.name || "Avulso"}</TableCell>
                               <TableCell className="max-w-xs">
                                  <div className="flex items-center gap-2">
                                     <span className="text-xs truncate">{item.template || item.mensagem}</span>
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <Badge variant={item.status === 'sent' ? 'secondary' : 'destructive'} className="uppercase text-[9px]">
                                     {item.status}
                                  </Badge>
                               </TableCell>
                               <TableCell className="text-xs opacity-70">
                                  {new Date(item.created_at).toLocaleString('pt-BR')}
                               </TableCell>
                               <TableCell className="text-right text-[10px] text-destructive italic font-medium">
                                  {item.erro_mensagem || "-"}
                               </TableCell>
                            </TableRow>
                          ))}
                          {history.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-muted-foreground opacity-50">
                                   Nenhum log de disparo encontrado.
                                </TableCell>
                             </TableRow>
                          )}
                       </TableBody>
                    </Table>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        {/* 6. CONFIGURAÇÃO API */}
        <TabsContent value="config" className="animate-in fade-in duration-700">
           <div className="max-w-3xl mx-auto space-y-6">
              <Card className="border-2 shadow-2xl overflow-hidden">
                 <div className="h-2 bg-primary w-full" />
                 <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-black">Meta Developer Credentials</CardTitle>
                    <CardDescription>Insira as chaves do seu Business App para ativar a integração v22.0.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6 p-8">
                    <div className="grid gap-6">
                       <div className="space-y-2 group">
                          <Label className="group-focus-within:text-primary transition-colors">WhatsApp Business Account ID (WABA ID)</Label>
                          <Input 
                            placeholder="Ex: 10493820293847" 
                            className="h-12 border-2" 
                            value={config.waba_id}
                            onChange={(e) => setConfig({...config, waba_id: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label>Phone Number ID</Label>
                          <Input 
                            placeholder="Ex: 10928374650594" 
                            className="h-12 border-2" 
                            value={config.phone_number_id}
                            onChange={(e) => setConfig({...config, phone_number_id: e.target.value})}
                          />
                       </div>
                       <div className="space-y-2">
                          <Label>System User Access Token (Permanent)</Label>
                          <Input 
                            type="password"
                            placeholder="EAAGL..." 
                            className="h-12 border-2 font-mono text-xs" 
                            value={config.access_token}
                            onChange={(e) => setConfig({...config, access_token: e.target.value})}
                          />
                          <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded">Dica: Use um token de usuário do sistema para que nunca expire.</p>
                       </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                       <div className="p-4 bg-muted rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                             <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Configuração de Webhook Obrigatória</p>
                             <p className="text-[10px] text-orange-700 leading-normal">
                                Cole esta URL no seu Meta App para receber mensagens ao vivo:<br />
                                <code className="bg-orange-200/50 p-1 rounded font-bold break-all">https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/meta-whatsapp-proxy</code><br />
                                Verify Token: <code className="bg-orange-200/50 p-1 rounded font-bold">pulse2026</code>
                             </p>
                          </div>
                       </div>
                    </div>
                 </CardContent>
                 <CardFooter className="bg-muted/30 p-8 border-t">
                    <Button className="w-full h-14 text-xl font-black bg-slate-900 shadow-xl" onClick={handleSaveConfig}>
                       SALVAR E VALIDAR CREDENCIAIS
                    </Button>
                 </CardFooter>
              </Card>

              <div className="text-center p-8 border-4 border-dashed rounded-3xl opacity-40">
                 <h4 className="font-bold uppercase tracking-[0.3em] text-xs">Suporte Técnico</h4>
                 <p className="text-xs mt-2">v22.0 API Integrada • Donor Connect Hub • 2026</p>
              </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl animate-in zoom-in-95 duration-200">
           <div className="bg-primary/5 p-6 border-b">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                   Criar Novo Template (Meta)
                </DialogTitle>
                <DialogDescription className="font-medium opacity-70">Preencha os dados básicos para submeter à Meta API.</DialogDescription>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Template</Label>
                 <Input 
                   placeholder="ex: boas_vindas_v1" 
                   className="h-12 border-2 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all rounded-xl"
                   value={newTemplate.name}
                   onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                 />
                 <p className="text-[10px] text-muted-foreground italic">Use apenas letras minúsculas, números e sublinhados.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                    <Select value={newTemplate.category} onValueChange={(val) => setNewTemplate({...newTemplate, category: val})}>
                       <SelectTrigger className="h-12 rounded-xl border-2">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">Utilidade / Transacional</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Idioma</Label>
                    <Select value={newTemplate.language} onValueChange={(val) => setNewTemplate({...newTemplate, language: val})}>
                       <SelectTrigger className="h-12 rounded-xl border-2">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                          <SelectItem value="en_US">Inglês (EUA)</SelectItem>
                          <SelectItem value="es_ES">Espanhol</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cabeçalho de Mídia (Opcional)</Label>
                 <Select value={newTemplate.headerFormat} onValueChange={(val) => setNewTemplate({...newTemplate, headerFormat: val})}>
                    <SelectTrigger className="h-12 rounded-xl border-2">
                       <SelectValue placeholder="Sem cabeçalho" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="NONE">Sem cabeçalho (Apenas Texto)</SelectItem>
                       <SelectItem value="IMAGE">Imagem</SelectItem>
                       <SelectItem value="VIDEO">Vídeo</SelectItem>
                    </SelectContent>
                 </Select>
              </div>

              {newTemplate.headerFormat !== "NONE" && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                   <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL de Exemplo ({newTemplate.headerFormat})</Label>
                   <Input 
                     placeholder="https://..." 
                     className="h-12 border-2 rounded-xl"
                     value={newTemplate.mediaUrl}
                     onChange={(e) => setNewTemplate({...newTemplate, mediaUrl: e.target.value})}
                   />
                </div>
              )}

              <div className="space-y-2">
                 <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corpo da Mensagem *</Label>
                 <Textarea 
                   placeholder="Olá {{1}}, obrigado pelo contato!" 
                   className="min-h-[120px] rounded-xl border-2 resize-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                   value={newTemplate.body}
                   onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                 />
                 <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                    <p className="text-[10px] text-orange-700 font-bold uppercase mb-1">Aviso da Meta API</p>
                    <p className="text-[10px] text-orange-600 leading-tight">
                       Use APENAS números para variáveis: <code className="bg-orange-200 px-1 rounded">{"{{1}}"}</code>, <code className="bg-orange-200 px-1 rounded">{"{{2}}"}</code>.<br />
                       Nomes como <code className="bg-red-100 text-red-600 px-1 rounded">{"{{Nome}}"}</code> causarão erro de conexão.
                    </p>
                 </div>
              </div>
           </div>

           <DialogFooter className="bg-muted/30 p-6 border-t flex gap-4">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button 
                className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
                onClick={handleCreateTemplate}
                disabled={isCreatingTemplate}
              >
                 {isCreatingTemplate ? "Criando..." : "Criar Template"}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsApp;
