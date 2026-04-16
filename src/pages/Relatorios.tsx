import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  BarChart3, Download, TrendingUp, Users, RefreshCw,
  Calendar, DollarSign, UserCheck, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Relatorios = () => {
  const [period, setPeriod] = useState("6");
  const [isLoading, setIsLoading] = useState(true);

  // ── Data states ───────────────────────────────────────────────────────────
  const [kpis, setKpis] = useState({
    totalArrecadado: 0,
    totalDoadoresAtivos: 0,
    mediaDoacao: 0,
    crescimentoMes: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [donorTypeData, setDonorTypeData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [retentionData, setRetentionData] = useState<any[]>([]);

  // ── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const months = parseInt(period);
      const since = startOfMonth(subMonths(new Date(), months - 1));
      const sinceStr = since.toISOString();

      // 1. Donations in period
      const { data: donations } = await supabase
        .from("donations")
        .select("amount, status, donation_date, billing_type, donor_id, campaign_id")
        .gte("donation_date", sinceStr)
        .order("donation_date", { ascending: true });

      const confirmed = (donations || []).filter(d =>
        ["pago", "confirmed", "RECEIVED", "CONFIRMED"].includes((d.status || "").toUpperCase())
      );

      // 2. All donors
      const { data: donors } = await supabase
        .from("donors")
        .select("id, name, type, total_donated, donation_count, last_donation_date");

      // 3. Campaigns
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name, goal, raised");

      // ── KPIs ──────────────────────────────────────────────────────────────
      const total = confirmed.reduce((s, d) => s + Number(d.amount || 0), 0);
      const activeDonors = new Set(confirmed.map(d => d.donor_id)).size;
      const avg = confirmed.length > 0 ? total / confirmed.length : 0;

      // Crescimento: compara último mês vs penúltimo
      const thisMonthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const thisMonth = confirmed
        .filter(d => d.donation_date >= thisMonthStart)
        .reduce((s, d) => s + Number(d.amount || 0), 0);
      const lastMonth = confirmed
        .filter(d => d.donation_date >= lastMonthStart && d.donation_date < thisMonthStart)
        .reduce((s, d) => s + Number(d.amount || 0), 0);
      const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

      setKpis({ totalArrecadado: total, totalDoadoresAtivos: activeDonors, mediaDoacao: avg, crescimentoMes: growth });

      // ── Gráfico mensal ────────────────────────────────────────────────────
      const monthRange = eachMonthOfInterval({ start: since, end: new Date() });
      const monthly = monthRange.map(month => {
        const label = format(month, "MMM/yy", { locale: ptBR });
        const start = startOfMonth(month).toISOString();
        const end = endOfMonth(month).toISOString();
        const monthDonations = confirmed.filter(d => d.donation_date >= start && d.donation_date <= end);
        return {
          mes: label,
          arrecadado: monthDonations.reduce((s, d) => s + Number(d.amount || 0), 0),
          doacoes: monthDonations.length,
          doadores: new Set(monthDonations.map(d => d.donor_id)).size,
        };
      });
      setMonthlyData(monthly);

      // ── Gráfico por tipo de doador ─────────────────────────────────────────
      const typeCounts: Record<string, { count: number; total: number }> = {};
      (donors || []).forEach(d => {
        const t = d.type || "lead";
        if (!typeCounts[t]) typeCounts[t] = { count: 0, total: 0 };
        typeCounts[t].count++;
        typeCounts[t].total += Number(d.total_donated || 0);
      });
      const typeLabels: Record<string, string> = {
        recorrente: "Recorrente", esporadico: "Esporádico",
        unico: "Único", lead: "Lead", desativado: "Desativado",
      };
      setDonorTypeData(
        Object.entries(typeCounts).map(([type, v]) => ({
          name: typeLabels[type] || type,
          doadores: v.count,
          arrecadado: v.total,
        }))
      );

      // ── Gráfico por campanha ───────────────────────────────────────────────
      if (campaigns && campaigns.length > 0) {
        const campMap: Record<string, number> = {};
        confirmed.forEach(d => {
          const cid = d.campaign_id || "sem_campanha";
          campMap[cid] = (campMap[cid] || 0) + Number(d.amount || 0);
        });
        setCampaignData(
          campaigns
            .map(c => ({
              name: c.name?.length > 18 ? c.name.substring(0, 18) + "…" : c.name,
              meta: Number(c.goal || 0),
              arrecadado: Number(c.raised || campMap[c.id] || 0),
            }))
            .filter(c => c.arrecadado > 0 || c.meta > 0)
            .slice(0, 8)
        );
      } else {
        setCampaignData([]);
      }

      // ── Top doadores ───────────────────────────────────────────────────────
      setTopDonors(
        (donors || [])
          .filter(d => d.total_donated > 0)
          .sort((a, b) => Number(b.total_donated) - Number(a.total_donated))
          .slice(0, 10)
          .map(d => ({
            name: d.name,
            type: typeLabels[d.type] || d.type,
            total: Number(d.total_donated),
            count: d.donation_count,
          }))
      );

      // ── Retenção por tipo ─────────────────────────────────────────────────
      const retention = ["recorrente", "esporadico", "unico"].map(type => {
        const group = (donors || []).filter(d => d.type === type);
        const active = group.filter(d => {
          if (!d.last_donation_date) return false;
          const days = (Date.now() - new Date(d.last_donation_date).getTime()) / 86400000;
          return days <= (type === "recorrente" ? 60 : type === "esporadico" ? 90 : 120);
        });
        return {
          tipo: typeLabels[type],
          total: group.length,
          ativos: active.length,
          taxa: group.length > 0 ? Math.round((active.length / group.length) * 100) : 0,
        };
      });
      setRetentionData(retention);

    } catch (e) {
      console.error("[Relatorios] Erro ao carregar dados:", e);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = async (type: string) => {
    try {
      let rows: any[] = [];
      let filename = "";

      if (type === "doacoes") {
        const { data } = await supabase
          .from("donations")
          .select("donation_date, amount, status, billing_type, donors(name), campaigns(name)")
          .order("donation_date", { ascending: false });
        rows = (data || []).map(d => ({
          Data: d.donation_date,
          Doador: (d.donors as any)?.name || "",
          Valor: d.amount,
          Status: d.status,
          Tipo: d.billing_type,
          Campanha: (d.campaigns as any)?.name || "",
        }));
        filename = "doacoes";
      } else if (type === "doadores") {
        const { data } = await supabase
          .from("donors")
          .select("name, email, phone, type, total_donated, donation_count, last_donation_date");
        rows = (data || []).map(d => ({
          Nome: d.name,
          Email: d.email,
          Telefone: d.phone,
          Tipo: d.type,
          "Total Doado": d.total_donated,
          "Nº Doações": d.donation_count,
          "Última Doação": d.last_donation_date,
        }));
        filename = "doadores";
      } else if (type === "campanhas") {
        const { data } = await supabase.from("campaigns").select("*");
        rows = (data || []).map(c => ({
          Nome: c.name,
          Meta: c.goal,
          Arrecadado: c.raised,
          Status: c.status,
        }));
        filename = "campanhas";
      }

      if (rows.length === 0) { alert("Nenhum dado para exportar."); return; }

      const headers = Object.keys(rows[0]).join(";");
      const lines = rows.map(r => Object.values(r).join(";"));
      const csv = [headers, ...lines].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[Relatorios] Erro ao exportar:", e);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  const KpiCard = ({ title, value, icon: Icon, sub, color }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading
              ? <Skeleton className="h-8 w-32 mt-1" />
              : <p className="text-2xl font-bold text-foreground mt-1">{value}</p>}
            {sub && <p className={`text-xs mt-1 ${color || "text-muted-foreground"}`}>{sub}</p>}
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl text-foreground">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Análise completa de doações, doadores e campanhas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
              <SelectItem value="24">Últimos 2 anos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Arrecadado"
          value={fmt(kpis.totalArrecadado)}
          icon={DollarSign}
        />
        <KpiCard
          title="Doadores Ativos"
          value={kpis.totalDoadoresAtivos}
          icon={Users}
        />
        <KpiCard
          title="Ticket Médio"
          value={fmt(kpis.mediaDoacao)}
          icon={Target}
        />
        <KpiCard
          title="Crescimento (mês)"
          value={`${kpis.crescimentoMes >= 0 ? "+" : ""}${kpis.crescimentoMes.toFixed(1)}%`}
          icon={TrendingUp}
          color={kpis.crescimentoMes >= 0 ? "text-green-600" : "text-red-500"}
          sub={kpis.crescimentoMes >= 0 ? "vs mês anterior" : "vs mês anterior"}
        />
      </div>

      {/* Exportações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar Dados (CSV)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => exportCSV("doacoes")}>
            <Download className="w-4 h-4 mr-2" /> Doações
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("doadores")}>
            <Download className="w-4 h-4 mr-2" /> Doadores
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV("campanhas")}>
            <Download className="w-4 h-4 mr-2" /> Campanhas
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="arrecadacao" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="arrecadacao"><TrendingUp className="w-4 h-4 mr-1" />Arrecadação</TabsTrigger>
          <TabsTrigger value="doadores"><Users className="w-4 h-4 mr-1" />Doadores</TabsTrigger>
          <TabsTrigger value="campanhas"><Target className="w-4 h-4 mr-1" />Campanhas</TabsTrigger>
          <TabsTrigger value="retencao"><UserCheck className="w-4 h-4 mr-1" />Retenção</TabsTrigger>
        </TabsList>

        {/* ── Arrecadação ── */}
        <TabsContent value="arrecadacao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arrecadação Mensal</CardTitle>
              <CardDescription>Valor total confirmado por mês no período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => fmt(v)} labelClassName="font-bold" />
                    <Bar dataKey="arrecadado" name="Arrecadado" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Número de Doações por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="doacoes" name="Doações" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="doadores" name="Doadores únicos" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Doadores ── */}
        <TabsContent value="doadores" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-64 w-full" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={donorTypeData}
                        dataKey="doadores"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {donorTypeData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${v} doadores`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Arrecadado por Tipo de Doador</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-64 w-full" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={donorTypeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Bar dataKey="arrecadado" name="Arrecadado" fill="#6366f1" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top doadores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Doadores</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <div className="space-y-2">
                  {topDonors.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-8">Nenhuma doação registrada.</p>
                  )}
                  {topDonors.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.count} doação(ões)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{d.type}</Badge>
                        <span className="font-bold text-sm text-primary">{fmt(d.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Campanhas ── */}
        <TabsContent value="campanhas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meta vs Arrecadado por Campanha</CardTitle>
              <CardDescription>Comparativo entre a meta estabelecida e o valor arrecadado em cada campanha.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : campaignData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-16">Nenhuma campanha encontrada.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaignData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="meta" name="Meta" fill="#e2e8f0" radius={[4,4,0,0]} />
                    <Bar dataKey="arrecadado" name="Arrecadado" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {campaignData.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaignData.map((c, i) => {
                const pct = c.meta > 0 ? Math.min((c.arrecadado / c.meta) * 100, 100) : 0;
                return (
                  <Card key={i}>
                    <CardContent className="pt-4 space-y-3">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{fmt(c.arrecadado)}</span>
                        <span>Meta: {fmt(c.meta)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-right font-bold text-primary">{pct.toFixed(0)}%</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Retenção ── */}
        <TabsContent value="retencao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxa de Retenção por Tipo de Doador</CardTitle>
              <CardDescription>
                Considera "ativo" quem doou nos últimos: 60 dias (recorrente), 90 dias (esporádico), 120 dias (único).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={retentionData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4,4,0,0]} />
                    <Bar dataKey="ativos" name="Ativos" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            {retentionData.map((r, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">{r.tipo}</p>
                  <p className="text-4xl font-black text-foreground">{r.taxa}%</p>
                  <p className="text-xs text-muted-foreground">{r.ativos} de {r.total} doadores ativos</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${r.taxa}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
