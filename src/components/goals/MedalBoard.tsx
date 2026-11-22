import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, Flame, Loader2, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MONTHLY_KEY_METRICS, ROLE_LABEL, formatGoalValue, metricByKey, type GoalRole, type GoalUnit } from "@/lib/goals";

const db = supabase as any;

// ── Medalhas: bronze 33,33% · prata 66,66% · ouro 100% da meta ──────────────
export const MEDALS = [
  { key: "bronze", label: "Bronze", pct: 33.33, emoji: "🥉", ring: "border-orange-300 bg-orange-50", text: "text-orange-700" },
  { key: "prata", label: "Prata", pct: 66.66, emoji: "🥈", ring: "border-slate-300 bg-slate-50", text: "text-slate-700" },
  { key: "ouro", label: "Ouro", pct: 100, emoji: "🥇", ring: "border-amber-300 bg-amber-50", text: "text-amber-700" },
] as const;
type Medal = (typeof MEDALS)[number];

const medalFor = (pct: number): Medal | null => [...MEDALS].reverse().find((m) => pct >= m.pct) ?? null;
const pctOf = (achieved: number, target: number) => (target > 0 ? (Number(achieved) / Number(target)) * 100 : 0);
const fmtPct = (p: number) => `${p.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

interface Week { n: number; inicio: string; fim: string; meta: number; realizado: number; atual: boolean; futura: boolean }
interface Row {
  user_id: string; user_name: string; user_role: string; metric: string;
  monthly_target: number; daily_target: number; month_achieved: number; today_achieved: number; weeks: Week[];
}
interface Person {
  id: string; name: string; role: string; main: Row; others: Row[];
  unit: GoalUnit; pctMonth: number; pctWeek: number; pctDay: number; streak: number; week: Week | undefined;
}

type Period = "dia" | "semana" | "mes";
const PERIOD_LABEL: Record<Period, string> = { dia: "Hoje", semana: "Semana", mes: "Mês" };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function MedalIcons({ pct, size = "text-xl" }: { pct: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {MEDALS.map((m) => (
        <span key={m.key} title={`${m.label} (${fmtPct(m.pct)})`} className={`${size} leading-none ${pct >= m.pct ? "" : "opacity-25 grayscale"}`}>
          {m.emoji}
        </span>
      ))}
    </span>
  );
}

function MedalBar({ pct }: { pct: number }) {
  return (
    <div className="relative pt-5">
      {MEDALS.map((m) => (
        <span key={m.key} className={`absolute top-0 -translate-x-1/2 text-sm ${pct >= m.pct ? "" : "opacity-30 grayscale"}`}
          style={{ left: `${Math.min(m.pct, 100) * 0.97}%` }} title={`${m.label}: ${fmtPct(m.pct)}`}>{m.emoji}</span>
      ))}
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
        {MEDALS.slice(0, 2).map((m) => (
          <span key={m.key} className="absolute top-0 h-full w-px bg-background/80" style={{ left: `${m.pct}%` }} />
        ))}
      </div>
    </div>
  );
}

function pickMain(rows: Row[], role: string): Row {
  const pref = MONTHLY_KEY_METRICS[role as GoalRole] ?? [];
  for (const k of pref) {
    const r = rows.find((x) => x.metric === k);
    if (r) return r;
  }
  return rows.find((r) => metricByKey(r.metric)?.unit === "currency") ?? rows[0];
}

function buildPeople(rows: Row[]): Person[] {
  const byUser = new Map<string, Row[]>();
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push({ ...r, weeks: r.weeks || [] });
  }
  return [...byUser.values()].map((list) => {
    const main = pickMain(list, list[0].user_role);
    const week = main.weeks.find((w) => w.atual);
    // Semanas seguidas com medalha (da semana atual, se já tiver, para trás).
    let streak = 0;
    const past = main.weeks.filter((w) => !w.futura);
    for (let i = past.length - 1; i >= 0; i--) {
      const has = !!medalFor(pctOf(past[i].realizado, past[i].meta));
      if (!has && past[i].atual) continue; // semana em andamento ainda não conta contra
      if (!has) break;
      streak++;
    }
    return {
      id: main.user_id, name: main.user_name, role: main.user_role, main,
      others: list.filter((r) => r !== main),
      unit: metricByKey(main.metric)?.unit ?? "count",
      pctMonth: pctOf(main.month_achieved, main.monthly_target),
      pctWeek: week ? pctOf(week.realizado, week.meta) : 0,
      pctDay: pctOf(main.today_achieved, main.daily_target),
      streak, week,
    };
  });
}

function NextConquest({ achieved, target, unit }: { achieved: number; target: number; unit: GoalUnit }) {
  const pct = pctOf(achieved, target);
  const next = MEDALS.find((m) => pct < m.pct);
  if (!next) {
    return <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:bg-amber-950/30">🥇 Meta do mês batida! Ouro conquistado.</p>;
  }
  const falta = Math.max((target * next.pct) / 100 - achieved, 0);
  return (
    <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200">
      <Target className="mr-1 inline h-4 w-4" /> Próxima conquista: {next.emoji} {next.label} — faltam {formatGoalValue(falta, unit)}
    </p>
  );
}

function PersonCard({ p, rank, highlight }: { p: Person; rank: number; highlight: boolean }) {
  const m = metricByKey(p.main.metric);
  const dayMedal = medalFor(p.pctDay);
  return (
    <div className={`overflow-hidden rounded-3xl border bg-card shadow-sm ${highlight ? "ring-2 ring-sky-400" : ""}`}>
      <div className="h-1.5 bg-gradient-to-r from-sky-500 to-indigo-500" />
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-100 font-black text-sky-700">{initials(p.name)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight">{p.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[p.role] ?? p.role}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <MedalIcons pct={p.pctMonth} />
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${rank === 1 ? "bg-amber-300 text-amber-950" : "bg-indigo-100 text-indigo-700"}`}>
                {rank === 1 ? "👑 " : ""}{rank}º lugar
              </span>
              {p.streak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                  <Flame className="h-3 w-3" /> {p.streak} semana{p.streak > 1 ? "s" : ""} seguida{p.streak > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border px-3 py-1.5 text-center">
            <p className="text-sm font-black">{fmtPct(p.pctMonth)}</p>
            <p className="text-[10px] text-muted-foreground">da meta</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-muted-foreground">{m?.label ?? p.main.metric} no mês</span>
            <span className="font-bold">{formatGoalValue(p.main.month_achieved, p.unit)} <span className="font-normal text-muted-foreground">de {formatGoalValue(p.main.monthly_target, p.unit)}</span></span>
          </div>
          <MedalBar pct={p.pctMonth} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {MEDALS.map((md) => (
              <span key={md.key} className={p.pctMonth >= md.pct ? `font-semibold ${md.text}` : ""}>
                {md.emoji} {md.label} {formatGoalValue((p.main.monthly_target * md.pct) / 100, p.unit)}
              </span>
            ))}
          </div>
        </div>

        <NextConquest achieved={Number(p.main.month_achieved)} target={Number(p.main.monthly_target)} unit={p.unit} />

        {/* Hoje + semanas do mês */}
        <div className="grid grid-cols-5 gap-1.5">
          <div className={`rounded-xl border p-2 text-center ${dayMedal ? dayMedal.ring : ""}`}>
            <p className="text-[11px] font-bold">HOJE</p>
            <p className="text-lg leading-none">{dayMedal?.emoji ?? "·"}</p>
            <p className="mt-1 text-[11px] font-bold">{formatGoalValue(p.main.today_achieved, p.unit)}</p>
            <p className="text-[10px] text-muted-foreground">de {formatGoalValue(p.main.daily_target, p.unit)}</p>
          </div>
          {p.main.weeks.map((w) => {
            const wp = pctOf(w.realizado, w.meta);
            const md = w.futura ? null : medalFor(wp);
            return (
              <div key={w.n} className={`rounded-xl border p-2 text-center ${md ? md.ring : w.atual ? "border-sky-300" : ""} ${w.futura ? "opacity-50" : ""}`}>
                <p className="text-[11px] font-bold">SEM.0{w.n}</p>
                <p className="text-[9px] text-muted-foreground">{ddmm(w.inicio)}–{ddmm(w.fim)}</p>
                <p className="text-lg leading-none">{md?.emoji ?? "·"}</p>
                <p className="mt-1 truncate text-[11px] font-bold">{formatGoalValue(w.realizado, p.unit)}</p>
                <p className="text-[10px] text-muted-foreground">{fmtPct(wp)}</p>
              </div>
            );
          })}
        </div>

        {p.others.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            {p.others.map((o) => {
              const om = metricByKey(o.metric);
              const op = pctOf(o.month_achieved, o.monthly_target);
              return (
                <div key={o.metric} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{om?.label ?? o.metric}</span>
                  <span className="flex shrink-0 items-center gap-1.5 font-semibold">
                    {formatGoalValue(o.month_achieved, om?.unit ?? "count")} / {formatGoalValue(o.monthly_target, om?.unit ?? "count")}
                    <MedalIcons pct={op} size="text-xs" />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quadro de metas com medalhas.
 *  - mode "team": coordenador/admin, todos (filtrável por função).
 *  - mode "self": operador/mensageiro — o próprio cartão + a corrida da função.
 */
export function MedalBoard({ mode, roleFilter = "all" }: { mode: "team" | "self"; roleFilter?: string }) {
  const [day, setDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [period, setPeriod] = useState<Period>("mes");
  const [me, setMe] = useState<string | null>(null);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["goals-board", day],
    queryFn: async () => {
      if (mode === "self") {
        const { data: u } = await supabase.auth.getUser();
        setMe(u.user?.id ?? null);
      }
      const { data, error } = await db.rpc("goals_board", { p_date: day });
      if (error) throw error;
      return (data || []) as Row[];
    },
    refetchInterval: 120_000,
  });

  const people = useMemo(() => {
    const all = buildPeople(rows).filter((p) => roleFilter === "all" || p.role === roleFilter);
    const score = (p: Person) => (period === "dia" ? p.pctDay : period === "semana" ? p.pctWeek : p.pctMonth);
    return all.sort((a, b) => score(b) - score(a));
  }, [rows, roleFilter, period]);

  const score = (p: Person) => (period === "dia" ? p.pctDay : period === "semana" ? p.pctWeek : p.pctMonth);
  const rankOf = (id: string) => people.findIndex((p) => p.id === id) + 1;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Não foi possível montar o quadro de medalhas: {(error as any).message}
        <p className="mt-1">Se a mensagem citar <code>goals_board</code>, rode no Supabase o SQL <code>supabase/migrations/20261122_goals_board.sql</code>.</p>
      </div>
    );
  }

  const cards = mode === "self" ? people.filter((p) => p.id === me) : people;
  const curWeek = people[0]?.week;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((k) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${period === k ? "bg-background shadow" : "text-muted-foreground"}`}>
              {PERIOD_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
            className="rounded-lg border bg-background px-2 py-1 text-foreground" />
        </div>
      </div>

      {people.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center text-sm text-muted-foreground">
          {mode === "self" ? "Você ainda não tem metas definidas. Fale com seu coordenador." : "Nenhuma meta ativa neste mês. Defina em Meta mensal ou Atribuir metas."}
        </div>
      ) : (
        <>
          {/* Corrida */}
          <div className="rounded-3xl border bg-gradient-to-br from-indigo-50 to-sky-50 p-5 dark:from-indigo-950/30 dark:to-sky-950/30">
            <p className="mb-3 font-bold text-indigo-900 dark:text-indigo-200">🏁 Corrida {period === "dia" ? "do dia" : period === "semana" ? "da semana" : "do mês"}</p>
            <div className="grid gap-3 md:grid-cols-3">
              {people.slice(0, 3).map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 rounded-2xl border bg-card p-3 ${i === 0 ? "border-amber-300 shadow-md" : ""}`}>
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${i === 0 ? "bg-amber-300" : i === 1 ? "bg-slate-200" : "bg-orange-200"}`}>
                    {i === 0 ? "👑" : `${i + 1}º`}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtPct(score(p))} da meta · <MedalIcons pct={score(p)} size="text-xs" /></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semana atual */}
          {curWeek && (
            <div className="rounded-3xl border bg-card p-5">
              <p className="mb-3 flex items-center gap-2 font-bold">
                <Clock className="h-4 w-4" /> Desempenho da semana atual (SEM.0{curWeek.n}, {ddmm(curWeek.inicio)}–{ddmm(curWeek.fim)})
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(mode === "self" ? cards : people).map((p) => (
                  <div key={p.id} className="rounded-2xl border p-3">
                    <p className="truncate font-semibold">{p.name}</p>
                    <div className="mt-2 grid grid-cols-3 text-center text-xs">
                      <div><p className="text-muted-foreground">Semana</p><p className="font-bold text-emerald-700">{formatGoalValue(p.week?.realizado ?? 0, p.unit)}</p></div>
                      <div><p className="text-muted-foreground">Meta</p><p className="font-bold">{formatGoalValue(p.week?.meta ?? 0, p.unit)}</p></div>
                      <div><p className="text-muted-foreground">Medalha</p><p className="text-base leading-tight">{medalFor(p.pctWeek)?.emoji ?? "—"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cartões */}
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {cards.map((p) => (
              <PersonCard key={p.id} p={p} rank={rankOf(p.id)} highlight={mode === "self"} />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Medalhas: 🥉 Bronze a partir de 33,33% da meta · 🥈 Prata a partir de 66,66% · 🥇 Ouro ao bater 100%.
            Valem para o dia, cada semana (01–07, 08–14, 15–21, 22–fim do mês) e o mês.
            {" "}{format(new Date(day + "T12:00:00"), "MMMM 'de' yyyy", { locale: ptBR })}.
          </p>
        </>
      )}
    </div>
  );
}
