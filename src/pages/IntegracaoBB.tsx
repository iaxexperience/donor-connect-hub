import { useState, useEffect } from "react";
import {
  Landmark, RefreshCw, Layers, CreditCard, Clock, Link as LinkIcon,
  ArrowRightLeft, AlertCircle, FileText, CheckCircle2, Search, Play, ShieldCheck, Key, Eye, EyeOff, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { bbService } from "@/lib/bbService";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IntegracaoBB() {
  const { toast } = useToast();

  // Dashboard data
  const [stats, setStats] = useState({ totalToday: 0, totalAll: 0, matched: 0, unmatched: 0, total: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Config form state
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [appKey, setAppKey] = useState("");
  const [agencia, setAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showAppKey, setShowAppKey] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  // ── Config ──────────────────────────────────────────────────────────────────
  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('bb_settings')
        .select('client_id, client_secret, app_key, agencia, conta, sandbox')
        .eq('id', 1)
        .maybeSingle();
      if (data) {
        setClientId(data.client_id || "");
        setClientSecret(data.client_secret || "");
        setAppKey(data.app_key || "");
        setAgencia(data.agencia || "");
        setConta(data.conta || "");
        setSandbox(data.sandbox ?? true);
      }
    } catch (_) { /* table may not exist yet */ }
    finally { setConfigLoaded(true); }
  };

  const saveConfig = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !appKey.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha Client ID, Client Secret e App Key.", variant: "destructive" });
      return;
    }
    setIsSavingConfig(true);
    try {
      const { error } = await supabase
        .from('bb_settings')
        .upsert([{
          id: 1,
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          app_key: appKey.trim(),
          agencia: agencia.trim(),
          conta: conta.trim(),
          sandbox,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      if (error) throw error;
      toast({ title: "✅ Credenciais salvas!", description: "Configurações do Banco do Brasil armazenadas com segurança." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [newStats, newTx, newLogs] = await Promise.all([
        bbService.getStats(),
        bbService.getTransactions({ limit: 50 }),
        bbService.getLogs(20)
      ]);
      setStats(newStats);
      setTransactions(newTx);
      setLogs(newLogs);
    } catch (e: any) {
      toast({ title: "Erro ao carregar dados", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await bbService.fullSync();
      toast({
        title: "Sincronização concluída",
        description: `${result.fetch.total} transações buscadas. Conciliadas: ${result.reconcile.matched}.`
      });
      loadData();
    } catch (e: any) {
      toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-200">
              <Landmark className="w-8 h-8 text-white" />
            </div>
            Banco do Brasil
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Conciliação automática de extratos via API Oficial BB.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadData} disabled={isLoading || isSyncing} variant="outline" className="h-12 px-6 rounded-2xl font-bold bg-white text-slate-700 shadow-sm border-slate-200">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button onClick={handleManualSync} disabled={isSyncing} className="h-12 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-xl shadow-amber-200 hover:scale-105 transition-all">
            <Play className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} /> Sincronizar Agora
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-none shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-8 pb-10 mt-2 relative z-10">
            <div className="flex items-center gap-2 text-amber-100 mb-2 font-bold uppercase tracking-wider text-sm"><ArrowRightLeft className="w-4 h-4" /> Entradas Hoje</div>
            <div className="text-4xl font-black">{formatCurrency(stats.totalToday)}</div>
            <Badge className="mt-4 bg-white/20 border-none text-white font-bold">{stats.total} transações mapeadas</Badge>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 pb-10 mt-2">
            <div className="flex items-center gap-2 text-slate-400 mb-2 font-bold uppercase tracking-wider text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Conciliadas</div>
            <div className="text-4xl font-black text-slate-800">{stats.matched}</div>
            <div className="mt-4 text-sm text-slate-500">Vinculadas às doações.</div>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 pb-10 mt-2">
            <div className="flex items-center gap-2 text-slate-400 mb-2 font-bold uppercase tracking-wider text-sm"><AlertCircle className="w-4 h-4 text-rose-500" /> Pendentes</div>
            <div className="text-4xl font-black text-slate-800">{stats.unmatched}</div>
            <div className="mt-4 text-sm text-slate-500">Sem doação correspondente.</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="extrato" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl flex w-full max-w-2xl mx-auto">
          <TabsTrigger value="extrato" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold transition-all h-10">Extrato</TabsTrigger>
          <TabsTrigger value="logs"    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold transition-all h-10">Logs de Sincronização</TabsTrigger>
          <TabsTrigger value="config"  className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold transition-all h-10">API & Config</TabsTrigger>
        </TabsList>

        {/* ── Extrato ── */}
        <TabsContent value="extrato" className="outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500" /> Extrato Analisado</CardTitle>
                <div className="flex bg-white border border-slate-200 rounded-xl px-3 py-1.5 items-center gap-2 shadow-sm">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input className="border-none text-sm outline-none font-medium text-slate-700 bg-transparent w-32" placeholder="Buscar..." />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-500 py-4 px-6">Data</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4">Descrição</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4">Valor</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4">Conciliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Clique em "Sincronizar Agora" para buscar o extrato.</TableCell></TableRow>
                  ) : transactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                      <TableCell className="py-4 px-6 text-sm text-slate-600">{new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell className="font-bold text-slate-700 text-xs uppercase">{t.description}</TableCell>
                      <TableCell className="font-black text-slate-800">{formatCurrency(t.amount)}</TableCell>
                      <TableCell>
                        {t.matched
                          ? <Badge className="bg-emerald-100 text-emerald-700 border-none gap-1"><LinkIcon className="w-3 h-3" />Conciliado</Badge>
                          : <Badge className="bg-rose-100 text-rose-700 border-none">Pendente</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Logs ── */}
        <TabsContent value="logs" className="outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2"><Layers className="w-5 h-5 text-amber-500" /> Eventos do Sistema</CardTitle>
              <CardDescription>Auditoria das execuções periódicas.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl">Nenhum evento registrado.</div>
              ) : logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-amber-100 hover:bg-amber-50/50 transition-colors">
                  <div className={`p-2 rounded-xl mt-1 shrink-0 ${log.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {log.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-bold text-slate-800 text-sm uppercase">{log.event.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}</div>
                    </div>
                    <pre className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-100 mt-2 font-mono overflow-auto max-h-32">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API & Config ── */}
        <TabsContent value="config" className="outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Key className="w-6 h-6 text-amber-500" /> Credenciais da API — Banco do Brasil
              </CardTitle>
              <CardDescription>Salvas com segurança na tabela <code>bb_settings</code> — apenas usuários autenticados podem ler.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Form */}
                <div className="space-y-5">
                  {/* Client ID */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Client ID <span className="text-red-500">*</span></Label>
                    <Input
                      id="bb-client-id"
                      placeholder="Seu BB_CLIENT_ID"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="rounded-xl border-slate-200 h-12"
                    />
                  </div>

                  {/* Client Secret */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Client Secret <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="bb-client-secret"
                        type={showSecret ? "text" : "password"}
                        placeholder="Seu BB_CLIENT_SECRET"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        className="pr-12 rounded-xl border-slate-200 h-12 font-mono"
                      />
                      <button type="button" onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* App Key */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">App Key (gw-dev-app-key) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="bb-app-key"
                        type={showAppKey ? "text" : "password"}
                        placeholder="Sua BB_APP_KEY"
                        value={appKey}
                        onChange={(e) => setAppKey(e.target.value)}
                        className="pr-12 rounded-xl border-slate-200 h-12 font-mono"
                      />
                      <button type="button" onClick={() => setShowAppKey(!showAppKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        {showAppKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Obtida no Portal do Desenvolvedor BB ao criar a aplicação.</p>
                  </div>

                  {/* Agência / Conta */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Agência</Label>
                      <Input id="bb-agencia" placeholder="Ex: 1234" value={agencia} onChange={(e) => setAgencia(e.target.value)} className="rounded-xl border-slate-200 h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700">Conta</Label>
                      <Input id="bb-conta" placeholder="Ex: 12345-6" value={conta} onChange={(e) => setConta(e.target.value)} className="rounded-xl border-slate-200 h-11" />
                    </div>
                  </div>

                  {/* Sandbox toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Modo Sandbox (Testes)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Desative para usar o ambiente de Produção do BB.</p>
                    </div>
                    <Switch id="bb-sandbox" checked={sandbox} onCheckedChange={setSandbox} />
                  </div>

                  <div className="p-4 rounded-2xl border text-sm font-medium" style={{ background: sandbox ? '#fefce8' : 'transparent', borderColor: sandbox ? '#fde68a' : '#e2e8f0', color: sandbox ? '#92400e' : 'inherit' }}>
                    🌐 Ambiente: <strong>{sandbox ? 'Sandbox — api.sandbox.bb.com.br' : 'Produção — api.bb.com.br'}</strong>
                  </div>

                  <Button
                    id="bb-save-btn"
                    onClick={saveConfig}
                    disabled={isSavingConfig || !configLoaded}
                    className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-lg shadow-amber-100"
                  >
                    {isSavingConfig ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isSavingConfig ? "Salvando..." : "Salvar Credenciais"}
                  </Button>
                </div>

                {/* Info panel */}
                <div className="space-y-5">
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
                    <ShieldCheck className="w-8 h-8 text-amber-600 mb-3 opacity-80" />
                    <h3 className="font-bold text-amber-900 mb-2">Autenticação OAuth2 BB</h3>
                    <p className="text-sm text-amber-800 leading-relaxed mb-4">
                      O Banco do Brasil usa OAuth2 <em>Client Credentials</em>. O sistema obtém um token de acesso automaticamente usando o <strong>Client ID</strong> e <strong>Client Secret</strong>, e o envia no header <code>Authorization: Bearer</code>.
                    </p>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      A <strong>App Key</strong> vai no header <code>gw-dev-app-key</code> obrigatório em todas as chamadas à API BB.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <p className="font-bold text-slate-800 text-sm">Onde obter as credenciais?</p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">1.</span>
                        Acesse <strong>developers.bb.com.br</strong> e faça login com sua conta BB.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">2.</span>
                        Crie uma aplicação e adicione a API de <strong>Extrato de Conta</strong>.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">3.</span>
                        Copie o <strong>Client ID</strong>, <strong>Client Secret</strong> e <strong>Chave de Desenvolvedor (gw-dev-app-key)</strong>.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
