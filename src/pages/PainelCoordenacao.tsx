import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, Loader2, Megaphone, Phone, RefreshCw, Target,
  TrendingUp, Truck, Trophy, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metricByKey, formatGoalValue, goalPercent, progressTone, ROLE_LABEL } from "@/lib/goals";

const db = supabase as any;

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const num = (n: number) => Number(n || 0).toLocaleString("pt-BR");
const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

const FORMA_LABEL: Record<string, string> = {
  pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", boleto: "Boleto", undefined: "Asaas (link)",
  credit_card: "Cartão", asaas: "Asaas", "importação": "Importação",
};

function Variation({ now, before, label }: { now: number; before: number; label: string }) {
  const p = pctChange(now, before);
  if (p === null) return <p className="text-xs text-muted-foreground">Sem dados {label}</p>;
  const up = p >= 0;
  return (
    <p className={`flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? "+" : ""}{p.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% {label}
    </p>
  );
}

function Bar({ value, target }: { value: number; target: number }) {
  const pct = goalPercent(value, target);
  const tone = progressTone(pct);
  return (
    <div className="space-y-1">
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p className={`text-xs font-semibold ${tone.text}`}>{pct}% · {tone.label}</p>
    </div>
  );
}

export default function PainelCoordenacao() {
  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["coordinator-dashboard", day],
    queryFn: async () => {
      const { data, error } = await db.rpc("coordinator_dashboard", { p_date: day });
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60_000, // atualiza sozinho a cada minuto
  });

  const serie = useMemo(() => {
    if (!data?.serie) return [];
    let a = 0, b = 0;
    const todayN = Number(day.slice(8, 10));
    return data.serie.map((s: any) => {
      a += Number(s.atual); b += Number(s.anterior);
      return { dia: s.dia, atual: s.dia <= todayN ? a : null, anterior: b };
    });
  }, [data, day]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }
  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-8 text-center text-sm text-red-700">
          Não foi possível carregar o painel: {(error as any).message}
          <p className="mt-2 text-muted-foreground">
            Se aparecer "function coordinator_dashboard does not exist", rode o SQL
            <code className="mx-1 rounded bg-muted px-1">20261122_coordinator_dashboard.sql</code>no Supabase.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hoje = data.hoje, metas = data.metas, mes = data.mes_atual, ant = data.mes_anterior;
  // Meta do dia: a soma das metas diárias de valor; sem elas, a meta do mês dividida pelos dias.
  const metaDia = Number(metas.dia_valor_meta) || (Number(metas.mes_valor_meta) / Number(metas.dias_no_mes || 30));
  const metaDiaOrigem = Number(metas.dia_valor_meta) ? "soma das metas diárias da equipe" : "meta do mês ÷ dias do mês";
  const metaMes = Number(metas.mes_valor_meta);
  const diaN = Number(day.slice(8, 10));
  const projecao = diaN > 0 ? (Number(mes.recebido) / diaN) * Number(metas.dias_no_mes) : 0;
  const ritmoNecessario = metaMes > 0 ? Math.max(metaMes - Number(mes.recebido), 0) / Math.max(Number(metas.dias_no_mes) - diaN, 1) : 0;
  const conversaoHoje = hoje.ligacoes > 0 ? Math.round((hoje.contatos_sucesso / hoje.ligacoes) * 100) : 0;
  const pessoasMetas = (metas.pessoas as any[]).filter((p) => p.periodo === "diaria");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><TrendingUp className="h-6 w-6 text-primary" /> Painel da Coordenação</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(day + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · atualiza a cada minuto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-[170px]" />
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Indicadores principais ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><Target className="h-4 w-4" />Meta do dia</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-black">{brl(Number(hoje.recebido))}</p>
            <p className="text-xs text-muted-foreground">alcançado de {metaDia ? brl(metaDia) : "— (sem meta)"}</p>
            {metaDia > 0 && <Bar value={Number(hoje.recebido)} target={metaDia} />}
            <p className="text-[11px] text-muted-foreground">Meta: {metaDiaOrigem}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Mês até hoje</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-black">{brl(Number(mes.recebido))}</p>
            <Variation now={Number(mes.recebido)} before={Number(ant.ate_mesmo_dia)} label="vs. mesmo período do mês anterior" />
            <p className="text-xs text-muted-foreground">Mês anterior no mesmo dia: {brl(Number(ant.ate_mesmo_dia))} · fechado: {brl(Number(ant.total))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><Wallet className="h-4 w-4" />Meta do mês</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {metaMes > 0 ? (
              <>
                <p className="text-2xl font-black">{brl(metaMes)}</p>
                <Bar value={Number(mes.recebido)} target={metaMes} />
                <p className="text-xs text-muted-foreground">
                  Projeção: <strong>{brl(projecao)}</strong> · precisa de {brl(ritmoNecessario)}/dia
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem meta mensal. Defina em Metas → Meta mensal.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><Phone className="h-4 w-4" />Hoje na operação</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xl font-black">{num(hoje.ligacoes)}</p><p className="text-xs text-muted-foreground">ligações</p></div>
            <div><p className="text-xl font-black">{conversaoHoje}%</p><p className="text-xs text-muted-foreground">contatos efetivos</p></div>
            <div><p className="text-xl font-black">{brlShort(Number(hoje.captado))}</p><p className="text-xs text-muted-foreground">captado (prometido)</p></div>
            <div><p className="text-xl font-black">{num(hoje.coletas)}/{num(hoje.visitas_previstas)}</p><p className="text-xs text-muted-foreground">coletas</p></div>
          </CardContent>
        </Card>
      </div>

      {/* ── Comparativo acumulado ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recebido acumulado: mês atual × mês anterior</CardTitle>
          <CardDescription>
            Hoje {brl(Number(hoje.recebido))} · mesmo dia do mês anterior {brl(Number(hoje.mesmo_dia_mes_anterior))} ·
            {" "}{num(mes.novos_doadores)} novo(s) doador(es) no mês · {brl(Number(mes.pendente))} pendente de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={brlShort} tickLine={false} axisLine={false} fontSize={12} width={70} />
              <Tooltip formatter={(v: any) => brl(Number(v))} labelFormatter={(l) => `Dia ${l}`} />
              <Legend />
              {metaMes > 0 && (
                <Area type="monotone" dataKey={() => null} name={`Meta: ${brl(metaMes)}`} stroke="#f59e0b" fill="none" />
              )}
              <Area type="monotone" dataKey="anterior" name="Mês anterior" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} strokeDasharray="5 4" />
              <Area type="monotone" dataKey="atual" name="Mês atual" stroke="#0b5ccf" fill="#0b5ccf" fillOpacity={0.25} strokeWidth={2} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Campanhas ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" />Campanhas ativas</CardTitle>
            <CardDescription>Total arrecadado (doações pagas) e quanto falta para a meta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.campanhas as any[]).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma campanha ativa.</p>}
            {(data.campanhas as any[]).map((c) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <p className="whitespace-nowrap text-sm font-bold">{brl(Number(c.arrecadado))}</p>
                </div>
                {Number(c.meta) > 0 ? <Bar value={Number(c.arrecadado)} target={Number(c.meta)} /> : null}
                <p className="text-xs text-muted-foreground">
                  {Number(c.meta) > 0 ? `Meta ${brl(Number(c.meta))} · faltam ${brl(Math.max(Number(c.meta) - Number(c.arrecadado), 0))} · ` : "Sem meta · "}
                  {num(c.doacoes)} doações · {brl(Number(c.mes))} neste mês
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Ranking ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4" />Ranking do telemarketing (mês)</CardTitle>
            <CardDescription>Recebido das doações captadas por cada operador</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead><TableHead>Operador</TableHead><TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Doações</TableHead><TableHead className="text-right">Ligações</TableHead>
                  <TableHead className="text-right">Hoje</TableHead><TableHead className="text-right">Carteira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.ranking as any[]).map((r, i) => (
                  <TableRow key={r.nome}>
                    <TableCell className="font-bold">{i + 1}º</TableCell>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right">{brl(Number(r.recebido))}</TableCell>
                    <TableCell className="text-right">{num(r.doacoes)}</TableCell>
                    <TableCell className="text-right">{num(r.ligacoes)}</TableCell>
                    <TableCell className="text-right">{num(r.ligacoes_hoje)}</TableCell>
                    <TableCell className="text-right">{num(r.carteira)}</TableCell>
                  </TableRow>
                ))}
                {(data.ranking as any[]).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhum operador ativo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Metas do dia por pessoa ── */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" />Metas do dia por pessoa</CardTitle>
            <CardDescription>Quem já bateu e quem precisa de apoio</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {pessoasMetas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma meta diária ativa. Defina em Metas → Atribuir metas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Pessoa</TableHead><TableHead>Indicador</TableHead><TableHead className="text-right">Alcançado</TableHead><TableHead className="w-40">Progresso</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {pessoasMetas.map((p, i) => {
                    const m = metricByKey(p.indicador);
                    return (
                      <TableRow key={i}>
                        <TableCell><p className="font-medium">{p.nome}</p><p className="text-[11px] text-muted-foreground">{ROLE_LABEL[p.funcao] ?? p.funcao}</p></TableCell>
                        <TableCell className="text-sm">{m?.label ?? p.indicador}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm">
                          {formatGoalValue(Number(p.alcancado), m?.unit ?? "count")} / {formatGoalValue(Number(p.meta), m?.unit ?? "count")}
                        </TableCell>
                        <TableCell><Bar value={Number(p.alcancado)} target={Number(p.meta)} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* ── Mensageiros ── */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" />Mensageiros hoje</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(data.mensageiros as any[]).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma rota hoje.</p>}
              {(data.mensageiros as any[]).map((m) => (
                <div key={m.nome} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.coletas}/{m.previstas} coletas · {m.sem_sucesso} sem sucesso</p>
                  </div>
                  <p className="font-bold">{brl(Number(m.valor))}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Formas de pagamento ── */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-4 w-4" />Como entrou no mês</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data.formas as any[]).length === 0 && <p className="text-sm text-muted-foreground">Nada recebido ainda.</p>}
              {(data.formas as any[]).map((f) => {
                const share = Number(mes.recebido) > 0 ? (Number(f.valor) / Number(mes.recebido)) * 100 : 0;
                return (
                  <div key={f.forma} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{FORMA_LABEL[f.forma] ?? f.forma}</span>
                      <span className="font-semibold">{brl(Number(f.valor))} <span className="text-xs font-normal text-muted-foreground">({num(f.qtd)})</span></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
