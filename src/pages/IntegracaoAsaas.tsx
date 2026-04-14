import { useState, useEffect } from "react";
import {
  Wallet, RefreshCw, CreditCard, Banknote, ShieldCheck,
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Search, Zap, Key, Eye, EyeOff, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { asaasService } from "@/lib/asaasService";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WEBHOOK_URL = "https://zljlhlfbtnzbmeaglkll.supabase.co/functions/v1/asaas-webhook";

export default function IntegracaoAsaas() {
  const { toast } = useToast();

  // Dashboard data
  const [stats, setStats] = useState({
    totalToday: 0, totalConfirmed: 0, activeDonorsCount: 0,
    byType: { PIX: 0, BOLETO: 0, CREDIT_CARD: 0 }
  });
  const [donations, setDonations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Config form state
  const [apiKey, setApiKey] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [showKey, setShowKey] = useState(false);
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
        .from('asaas_settings')
        .select('api_key, sandbox')
        .eq('id', 1)
        .maybeSingle();
      if (data) {
        setApiKey(data.api_key || "");
        setSandbox(data.sandbox ?? true);
      }
    } catch (_) { /* table may not exist yet */ }
    finally { setConfigLoaded(true); }
  };

  const saveConfig = async () => {
    if (!apiKey.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe a API Key do Asaas.", variant: "destructive" });
      return;
    }
    setIsSavingConfig(true);
    try {
      const { error } = await supabase
        .from('asaas_settings')
        .upsert([{ id: 1, api_key: apiKey.trim(), sandbox, webhook_url: WEBHOOK_URL, updated_at: new Date().toISOString() }],
          { onConflict: 'id' });
      if (error) throw error;
      toast({ title: "✅ Credenciais salvas!", description: "API Key do Asaas armazenada com segurança." });
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
      const [newStats, newDonations, newLogs] = await Promise.all([
        asaasService.getDashboardData(),
        asaasService.getDonations(),
        asaasService.getLogs(20)
      ]);
      setStats(newStats);
      setDonations(newDonations);
      setLogs(newLogs);
    } catch (e: any) {
      toast({ title: "Erro ao carregar dados", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-emerald-100 text-emerald-700 border-none">Confirmado</Badge>;
      case 'pending':   return <Badge className="bg-amber-100 text-amber-700 border-none">Pendente</Badge>;
      case 'overdue':   return <Badge className="bg-red-100 text-red-700 border-none">Vencido</Badge>;
      default:          return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            Integração Asaas
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Gestão automatizada de pagamentos, cobranças PIX, Boletos e Cartões.</p>
        </div>
        <Button onClick={loadData} disabled={isLoading} className="gap-2 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm font-bold">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 bg-blue-600 rounded-[32px] overflow-hidden shadow-2xl shadow-blue-200">
        <div className="p-10 flex flex-col justify-center">
          <p className="text-blue-200 font-bold mb-2 uppercase tracking-wider text-sm">Arrecadação Total do Dia</p>
          <div className="text-5xl font-black text-white">{formatCurrency(stats.totalToday)}</div>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 flex-1 min-w-[120px]">
              <div className="text-blue-200 text-xs font-bold mb-1">PIX Recebidos</div>
              <div className="text-2xl font-bold text-white">{stats.byType.PIX}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 flex-1 min-w-[120px]">
              <div className="text-blue-200 text-xs font-bold mb-1">Doadores Ativos</div>
              <div className="text-2xl font-bold text-white">{stats.activeDonorsCount}</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-10 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
          <p className="text-slate-400 font-bold mb-2 uppercase tracking-wider text-sm">Histórico Confirmado</p>
          <div className="text-4xl font-black text-emerald-400">{formatCurrency(stats.totalConfirmed)}</div>
          <p className="text-slate-500 mt-4 text-sm max-w-sm">Doações recebidas via Asaas já validadas por Webhooks.</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="donations" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl flex w-full max-w-md mx-auto">
          <TabsTrigger value="donations" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all h-10">Cobranças</TabsTrigger>
          <TabsTrigger value="webhooks"  className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all h-10">Webhooks</TabsTrigger>
          <TabsTrigger value="config"    className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold transition-all h-10">API & Config</TabsTrigger>
        </TabsList>

        {/* ── Cobranças ── */}
        <TabsContent value="donations" className="outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold text-slate-800">Últimas Cobranças Geradas</CardTitle>
                <div className="flex bg-white border border-slate-200 rounded-xl px-3 py-1.5 items-center gap-2 shadow-sm">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input className="border-none text-sm outline-none font-medium text-slate-700 bg-transparent w-32" placeholder="Buscar doador..." />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-500 py-4 px-6">Doador</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4">Valor</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4">Método</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4">Status</TableHead>
                    <TableHead className="font-bold text-slate-500 py-4 text-right px-6">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Nenhuma cobrança Asaas encontrada.</TableCell></TableRow>
                  ) : donations.map((d) => (
                    <TableRow key={d.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                      <TableCell className="py-4 px-6 font-bold text-slate-700">{d.donors?.name}</TableCell>
                      <TableCell className="font-black text-slate-800">{formatCurrency(d.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-md">
                          {d.billing_type === 'PIX' ? <Zap className="w-3 h-3 text-emerald-500" /> : d.billing_type === 'BOLETO' ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3 text-blue-500" />}
                          {d.billing_type}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(d.status)}</TableCell>
                      <TableCell className="text-right px-6 text-sm text-slate-500">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Webhooks ── */}
        <TabsContent value="webhooks" className="outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Eventos Recebidos</h3>
                  <p className="text-sm text-slate-500">Os últimos 20 webhooks do Asaas.</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold">Webhook Online</Badge>
              </div>
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl">Nenhum evento registrado.</div>
                ) : logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-colors">
                    <div className={`p-2 rounded-xl mt-1 shrink-0 ${log.event.includes('CONFIRMED') || log.event.includes('RECEIVED') ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {log.event.includes('CONFIRMED') || log.event.includes('RECEIVED') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-bold text-slate-800 uppercase text-sm">{log.event.replace('PAYMENT_', '')}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-slate-600 bg-white p-2 rounded-lg border border-slate-100 font-mono truncate">
                        ID: {log.payload?.payment?.id || 'N/A'} — {formatCurrency(log.payload?.payment?.value || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API & Config ── */}
        <TabsContent value="config" className="outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Key className="w-6 h-6 text-blue-600" /> Credenciais da API Asaas
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Salvas com segurança no banco de dados — acessíveis só por usuários autenticados.</p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Form */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">API Key do Asaas <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        id="asaas-api-key"
                        type={showKey ? "text" : "password"}
                        placeholder="$aact_YTU5YTE0M..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pr-12 font-mono rounded-xl border-slate-200 focus:border-blue-400 h-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Encontre em: Asaas → Minha Conta → Configurações → Integrações → Chave API.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Modo Sandbox (Testes)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Desative ao ir para Produção.</p>
                    </div>
                    <Switch id="asaas-sandbox" checked={sandbox} onCheckedChange={setSandbox} />
                  </div>

                  <div className="p-4 rounded-2xl border text-sm font-medium" style={{ background: sandbox ? '#fefce8' : 'transparent', borderColor: sandbox ? '#fde68a' : '#e2e8f0', color: sandbox ? '#92400e' : 'inherit' }}>
                    🌐 Ambiente: <strong>{sandbox ? 'Sandbox — sandbox.asaas.com/api/v3' : 'Produção — api.asaas.com/v3'}</strong>
                  </div>

                  <Button
                    id="asaas-save-btn"
                    onClick={saveConfig}
                    disabled={isSavingConfig || !configLoaded}
                    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-lg shadow-blue-100"
                  >
                    {isSavingConfig ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isSavingConfig ? "Salvando..." : "Salvar Credenciais"}
                  </Button>
                </div>

                {/* Webhook info */}
                <div className="space-y-5">
                  <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowUpRight className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800">URL do Webhook Asaas</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Configure no painel do Asaas: <em>Minha Conta → Integrações → Webhooks → Cobrança</em>.</p>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <code className="text-xs text-blue-700 font-mono break-all flex-1">{WEBHOOK_URL}</code>
                      <Button size="sm" variant="outline" className="shrink-0 rounded-lg"
                        onClick={() => { navigator.clipboard.writeText(WEBHOOK_URL); toast({ title: "URL copiada!" }); }}>
                        Copiar
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <ShieldCheck className="w-7 h-7 text-emerald-600 mb-2" />
                    <p className="text-sm text-slate-700 font-bold mb-1">Por que salvar no banco?</p>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      As credenciais ficam na tabela <code className="bg-slate-100 px-1 rounded">asaas_settings</code> protegida por RLS — apenas usuários autenticados no sistema podem ler. As Edge Functions leem daqui ao processar webhooks e criar cobranças.
                    </p>
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
