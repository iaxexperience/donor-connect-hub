import { useState, useEffect } from "react";
import {
  Landmark, RefreshCw, Layers, CreditCard, Clock, Link as LinkIcon, 
  ArrowRightLeft, AlertCircle, FileText, CheckCircle2, Search, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { bbService } from "@/lib/bbService";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";

export default function IntegracaoBB() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ 
    totalToday: 0, totalAll: 0, matched: 0, unmatched: 0, total: 0 
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
        description: `Buscadas ${result.fetch.total} transações. Conciliadas: ${result.reconcile.matched}.` 
      });
      loadData();
    } catch (e: any) {
      toast({ title: "Erro na sincronização", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
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
          <Button onClick={loadData} disabled={isLoading || isSyncing} variant="outline" className="h-12 px-6 rounded-2xl font-bold bg-white text-slate-700 shadow-sm border-slate-200 hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button onClick={handleManualSync} disabled={isSyncing} className="h-12 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-xl shadow-amber-200 transition-all hover:scale-105">
            <Play className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} /> Sincronizar Agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-none shadow-xl shadow-slate-100/50 bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <CardContent className="p-8 pb-10 mt-2 relative z-10">
            <div className="flex items-center gap-2 text-amber-100 mb-2 font-bold uppercase tracking-wider text-sm"><ArrowRightLeft className="w-4 h-4" /> Entradas Hoje</div>
            <div className="text-4xl font-black">{formatCurrency(stats.totalToday)}</div>
            <Badge className="mt-4 bg-white/20 hover:bg-white/30 border-none text-white font-bold">{stats.total} transações mapeadas</Badge>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 pb-10 mt-2">
            <div className="flex items-center gap-2 text-slate-400 mb-2 font-bold uppercase tracking-wider text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Transações Conciliadas</div>
            <div className="text-4xl font-black text-slate-800">{stats.matched}</div>
            <div className="mt-4 text-sm font-medium text-slate-500">
              Vinculadas automaticamente às doações.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-8 pb-10 mt-2">
            <div className="flex items-center gap-2 text-slate-400 mb-2 font-bold uppercase tracking-wider text-sm"><AlertCircle className="w-4 h-4 text-rose-500" /> Entradas Pendentes</div>
            <div className="text-4xl font-black text-slate-800">{stats.unmatched}</div>
            <div className="mt-4 text-sm font-medium text-slate-500">
              Sem doação correspondente no sistema.
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="extrato" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl flex w-full max-w-sm mx-auto relative overflow-hidden">
          <TabsTrigger value="extrato" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold transition-all h-10">Extrato</TabsTrigger>
          <TabsTrigger value="logs" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold transition-all h-10">Logs de Sincronização</TabsTrigger>
        </TabsList>

        <TabsContent value="extrato" className="space-y-4 outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
            <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500" /> Extrato Analisado</CardTitle>
                <div className="flex bg-white border border-slate-200 rounded-xl px-3 py-1.5 items-center gap-2 shadow-sm">
                   <Search className="w-4 h-4 text-slate-400" />
                   <input className="border-none text-sm outline-none font-medium text-slate-700 bg-transparent w-32 focus:w-40 transition-all" placeholder="Buscar..." />
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
                    <TableHead className="font-bold text-slate-500 py-4">Status da Conciliação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 font-medium text-slate-400">Clique em "Sincronizar Agora" para buscar o extrato mais recente.</TableCell></TableRow>
                  ) : (
                    transactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                        <TableCell className="py-4 px-6 text-sm text-slate-600 font-medium">{new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</TableCell>
                        <TableCell className="font-bold text-slate-700 text-xs tracking-wide uppercase">{t.description}</TableCell>
                        <TableCell className="font-black text-slate-800">{formatCurrency(t.amount)}</TableCell>
                        <TableCell>
                          {t.matched ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold gap-1"><LinkIcon className="w-3 h-3" /> Conciliado</Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-700 border-none font-bold">Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 outline-none">
          <Card className="border-none shadow-xl shadow-slate-100/50 rounded-[32px] overflow-hidden bg-white">
             <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2"><Layers className="w-5 h-5 text-amber-500" /> Eventos do Sistema</CardTitle>
                <CardDescription>Auditoria das execuções periódicas.</CardDescription>
             </CardHeader>
            <CardContent className="p-8 space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-10 font-medium text-slate-400 bg-slate-50 rounded-2xl">Nenhum evento registrado.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-amber-100 hover:bg-amber-50/50 transition-colors">
                    <div className={`p-2 rounded-xl mt-1 shrink-0 ${log.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {log.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-1">
                         <div className="font-bold text-slate-800 text-sm tracking-wide">{log.event.replace(/_/g, ' ').toUpperCase()}</div>
                         <div className="text-xs text-slate-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}</div>
                       </div>
                       <pre className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-100 mt-2 font-mono overflow-auto max-h-32">
                         {JSON.stringify(log.payload, null, 2)}
                       </pre>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
