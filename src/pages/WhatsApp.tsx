import React, { useState, useEffect } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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

  // 1. Templates States
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);

  // 2. Enviar Mensagem States
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendMode, setSendMode] = useState<"single" | "batch">("single");
  const [batchClassification, setBatchClassification] = useState("all");
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

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
  }, []);

  const loadStoredTemplates = async () => {
    try {
      const data = await metaService.getStoredTemplates();
      setTemplates(data);
    } catch (e) {
      console.error("Erro ao carregar templates salvos:", e);
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
    localStorage.setItem("meta_config", JSON.stringify(config));
    setIsConfigSaved(true);
    toast({ title: "Configuração Salva", description: "Suas credenciais foram armazenadas localmente com segurança." });
  };

  const handleSendSingle = async () => {
    if (!selectedRecipient || !messageBody) {
      toast({ title: "Erro", description: "Preencha o destinatário e a mensagem.", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await metaService.sendTextMessage(selectedRecipient, messageBody, config);
      toast({ title: "Mensagem Enviada!", description: `Para: ${selectedRecipient}` });
      setMessageBody("");
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
           await metaService.sendTemplateMessage(
             donor.phone, 
             selectedTemplate.name, 
             selectedTemplate.language, 
             [], 
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
           <Button variant="outline" size="sm" onClick={loadHistory}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button>
           <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Novo Disparo</Button>
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
        <div className="flex items-center justify-between bg-card p-1 rounded-2xl border shadow-sm sticky top-0 z-10">
          <TabsList className="bg-transparent border-none">
            <TabsTrigger value="templates" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FileJson className="mr-2 h-4 w-4" /> Templates</TabsTrigger>
            <TabsTrigger value="send" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Send className="mr-2 h-4 w-4" /> Enviar</TabsTrigger>
            <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><MessageSquare className="mr-2 h-4 w-4" /> Chat ao Vivo</TabsTrigger>
            <TabsTrigger value="automation" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Zap className="mr-2 h-4 w-4" /> Automação</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><History className="mr-2 h-4 w-4" /> Histórico</TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Settings className="mr-2 h-4 w-4" /> API</TabsTrigger>
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
                    <Button 
                      className="w-full h-12 text-lg font-bold" 
                      onClick={syncTemplates} 
                      disabled={isSyncingTemplates}
                    >
                      {isSyncingTemplates ? "Sincronizando..." : "Sincronizar Meta"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center uppercase tracking-tighter">Última sincronização: Hoje às 14:00</p>
                 </CardContent>
              </Card>

              <Card className="col-span-2 shadow-sm">
                 <CardHeader>
                    <div className="flex justify-between items-center">
                       <div>
                         <CardTitle>Meus Templates</CardTitle>
                         <CardDescription>Templates locais e sincronizados para uso imediato.</CardDescription>
                       </div>
                       <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Criar Novo</Button>
                    </div>
                 </CardHeader>
                 <CardContent>
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
                          <div className="grid grid-cols-2 gap-4">
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
                       <div className="space-y-2">
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

                       <div className="space-y-2">
                          <Label>Mensagem / Corpo</Label>
                          {selectedTemplate ? (
                             <div className="p-4 bg-muted rounded-md text-sm italic opacity-70 border border-dashed">
                                {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Template sem corpo de texto"}
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
                             <span>{messageBody.length} caracteres</span>
                          </div>
                       </div>
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
                          {selectedTemplate 
                            ? (selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || "Preview do Template") 
                            : (messageBody || "Visualize sua mensagem aqui...")}
                       </div>
                    </div>
                 </div>
                 <Badge className="absolute bottom-4 uppercase tracking-widest bg-slate-800">Simulação em Tempo Real</Badge>
              </div>
           </div>
        </TabsContent>

        {/* 3. CHAT AO VIVO */}
        <TabsContent value="chat" className="animate-in zoom-in-95 duration-300">
           <WhatsAppChat />
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
    </div>
  );
};

export default WhatsApp;
