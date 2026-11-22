import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, Loader2, Pencil, Trash2, Plus, CalendarDays, Users, ListChecks, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  GOAL_METRICS, metricByKey, ROLE_LABEL, PERIOD_LABEL, formatGoalValue, goalPercent, progressTone,
  GoalProgressRow, GoalTemplate, GoalPeriod, GoalRole, MONTHLY_KEY_METRICS, ROLE_SHORT,
} from "@/lib/goals";

// As tabelas/funções de metas ainda não estão nos tipos gerados do Supabase.
const db = supabase as any;

const today = () => format(new Date(), "yyyy-MM-dd");

// ─────────────────────────────────────────────────────────────
// Barra de progresso de uma meta
// ─────────────────────────────────────────────────────────────
function GoalProgress({ row, compact = false }: { row: GoalProgressRow; compact?: boolean }) {
  const m = metricByKey(row.metric);
  const unit = m?.unit ?? "count";
  const pct = goalPercent(row.achieved, row.target);
  const tone = progressTone(pct);
  const remaining = Math.max(Number(row.target) - Number(row.achieved), 0);

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>{m?.label ?? row.metric}</p>
          {!compact && <p className="text-xs text-muted-foreground">{m?.howMeasured}</p>}
        </div>
        <span className={`text-xs font-bold whitespace-nowrap ${tone.text}`}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>
          {formatGoalValue(row.achieved, unit)} de {formatGoalValue(row.target, unit)}
        </span>
        <span>{pct >= 100 ? tone.label : `Faltam ${formatGoalValue(remaining, unit)}`}</span>
      </div>
      {!compact && row.notes && <p className="text-xs italic text-muted-foreground">“{row.notes}”</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dados
// ─────────────────────────────────────────────────────────────
function useGoalsProgress(date: string) {
  return useQuery({
    queryKey: ["goals-progress", date],
    queryFn: async () => {
      const { data, error } = await db.rpc("goals_progress", { p_date: date });
      if (error) throw error;
      return (data || []) as GoalProgressRow[];
    },
  });
}

function useTemplates() {
  return useQuery({
    queryKey: ["goal-templates"],
    queryFn: async () => {
      const { data, error } = await db.from("goal_templates").select("*").order("role").order("period").order("name");
      if (error) throw error;
      return (data || []) as GoalTemplate[];
    },
  });
}

function useTeam() {
  return useQuery({
    queryKey: ["goal-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, status")
        .in("role", ["operador", "coordenador", "motoboy"])
        .eq("status", "Ativo")
        .order("name");
      if (error) throw error;
      return (data || []) as { id: string; name: string; role: GoalRole }[];
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Visão do operador / mensageiro
// ─────────────────────────────────────────────────────────────
function MyGoals() {
  const [date, setDate] = useState(today());
  const { data = [], isLoading, error } = useGoalsProgress(date);
  const daily = data.filter((g) => g.period === "diaria");
  const monthly = data.filter((g) => g.period === "mensal");
  const ref = new Date(`${date}T00:00:00`);

  const Section = ({ title, rows, subtitle }: { title: string; subtitle: string; rows: GoalProgressRow[] }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma meta definida para este período.</p>
        ) : (
          rows.map((r) => <GoalProgress key={r.goal_id} row={r} />)
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Dia de referência</Label>
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} className="w-[170px]" />
        </div>
      </div>
      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">Erro ao carregar metas: {(error as Error).message}</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-muted-foreground text-sm">
          Você ainda não tem metas definidas. Fale com seu coordenador.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Metas do dia" subtitle={format(ref, "EEEE, dd 'de' MMMM", { locale: ptBR })} rows={daily} />
          <Section title="Metas do mês" subtitle={format(ref, "MMMM 'de' yyyy", { locale: ptBR })} rows={monthly} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Painel da equipe (coordenador / admin)
// ─────────────────────────────────────────────────────────────
function TeamPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [roleFilter, setRoleFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const { data = [], isLoading, error } = useGoalsProgress(date);
  const [editing, setEditing] = useState<GoalProgressRow | null>(null);
  const [editTarget, setEditTarget] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editUntil, setEditUntil] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = data.filter(
    (g) => (roleFilter === "all" || g.user_role === roleFilter) && (periodFilter === "all" || g.period === periodFilter)
  );

  const byUser = useMemo(() => {
    const map = new Map<string, { name: string; role: string; rows: GoalProgressRow[] }>();
    filtered.forEach((g) => {
      if (!map.has(g.user_id)) map.set(g.user_id, { name: g.user_name, role: g.user_role, rows: [] });
      map.get(g.user_id)!.rows.push(g);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const openEdit = (g: GoalProgressRow) => {
    setEditing(g);
    setEditTarget(String(g.target));
    setEditNotes(g.notes || "");
    setEditUntil(g.valid_until || "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const t = Number(editTarget.replace(",", "."));
    if (!Number.isFinite(t) || t <= 0) {
      toast({ title: "Informe uma meta maior que zero", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await db.from("goals")
      .update({ target: t, notes: editNotes || null, valid_until: editUntil || null, updated_at: new Date().toISOString() })
      .eq("id", editing.goal_id);
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    toast({ title: "Meta atualizada" });
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["goals-progress"] });
  };

  const removeGoal = async (g: GoalProgressRow) => {
    const { error } = await db.from("goals").update({ active: false, updated_at: new Date().toISOString() }).eq("id", g.goal_id);
    if (error) return toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    toast({ title: "Meta removida", description: `${metricByKey(g.metric)?.label} de ${g.user_name}` });
    qc.invalidateQueries({ queryKey: ["goals-progress"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Dia de referência</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value || today())} className="w-[170px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Função</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              <SelectItem value="operador">{ROLE_LABEL.operador}</SelectItem>
              <SelectItem value="coordenador">{ROLE_LABEL.coordenador}</SelectItem>
              <SelectItem value="motoboy">{ROLE_LABEL.motoboy}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Diárias e mensais</SelectItem>
              <SelectItem value="diaria">Diárias</SelectItem>
              <SelectItem value="mensal">Mensais</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">Erro ao carregar metas: {(error as Error).message}</p>
      ) : byUser.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-muted-foreground text-sm">
          Nenhuma meta ativa. Use a aba “Atribuir metas” para começar.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byUser.map(([uid, u]) => {
            const avg = Math.round(u.rows.reduce((s, r) => s + Math.min(goalPercent(r.achieved, r.target), 100), 0) / u.rows.length);
            const tone = progressTone(avg);
            return (
              <Card key={uid}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{u.name}</CardTitle>
                      <CardDescription className="text-xs">{ROLE_LABEL[u.role] ?? u.role}</CardDescription>
                    </div>
                    <Badge variant="outline" className={tone.text}>{avg}% geral</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {u.rows.map((r) => (
                    <div key={r.goal_id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="secondary" className="text-[10px]">{PERIOD_LABEL[r.period]}</Badge>
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Editar meta" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" title="Remover meta" onClick={() => removeGoal(r)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <GoalProgress row={r} compact />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
            <DialogDescription>
              {editing && `${metricByKey(editing.metric)?.label} · ${PERIOD_LABEL[editing.period]} · ${editing.user_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Meta</Label>
              <Input type="number" min="0" step="0.01" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Válida até (opcional)</Label>
              <Input type="date" value={editUntil} onChange={(e) => setEditUntil(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Observação para a pessoa (opcional)</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Ex.: foco em doadores inativos" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Atribuir metas (coordenador / admin)
// ─────────────────────────────────────────────────────────────
type Draft = { metric: string; period: GoalPeriod; target: string; template_id: string | null; role: GoalRole };

function AssignGoals({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: team = [], isLoading: teamLoading } = useTeam();
  const { data: templates = [] } = useTemplates();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [validFrom, setValidFrom] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState<{ metric: string; period: GoalPeriod; target: string }>({
    metric: GOAL_METRICS[0].key, period: "diaria", target: "",
  });

  const selectedRoles = new Set(team.filter((t) => selectedUsers.includes(t.id)).map((t) => t.role));
  const toggleUser = (id: string) =>
    setSelectedUsers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const selectAllRole = (role: GoalRole) => {
    const ids = team.filter((t) => t.role === role).map((t) => t.id);
    setSelectedUsers((s) => Array.from(new Set([...s, ...ids])));
  };

  const addTemplate = (t: GoalTemplate) => {
    if (drafts.some((d) => d.metric === t.metric && d.period === t.period)) return;
    setDrafts((d) => [...d, { metric: t.metric, period: t.period, target: String(t.target), template_id: t.id, role: t.role }]);
  };
  const addAllTemplates = (role: GoalRole) =>
    templates.filter((t) => t.active && t.role === role).forEach(addTemplate);

  const addCustom = () => {
    const m = metricByKey(custom.metric);
    if (!m || !(Number(custom.target) > 0)) {
      toast({ title: "Informe o indicador e um valor de meta maior que zero", variant: "destructive" });
      return;
    }
    setDrafts((d) => [
      ...d.filter((x) => !(x.metric === custom.metric && x.period === custom.period)),
      { metric: custom.metric, period: custom.period, target: custom.target, template_id: null, role: m.role },
    ]);
    setCustom((c) => ({ ...c, target: "" }));
  };

  const save = async () => {
    const people = team.filter((t) => selectedUsers.includes(t.id));
    if (people.length === 0 || drafts.length === 0) {
      toast({ title: "Escolha ao menos uma pessoa e uma meta", variant: "destructive" });
      return;
    }
    // Cada meta só vai para quem tem a função compatível com o indicador.
    const rows = people.flatMap((p) =>
      drafts
        .filter((d) => d.role === p.role && Number(d.target) > 0)
        .map((d) => ({
          user_id: p.id, metric: d.metric, period: d.period, target: Number(d.target),
          template_id: d.template_id, valid_from: validFrom, valid_until: validUntil || null,
          notes: notes || null, created_by: user?.id, active: true,
        }))
    );
    if (rows.length === 0) {
      toast({ title: "Nenhuma meta compatível", description: "As metas escolhidas não correspondem à função das pessoas selecionadas.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Substitui a meta ativa do mesmo indicador/período (evita duplicar).
      for (const r of rows) {
        const { error } = await db.from("goals")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("user_id", r.user_id).eq("metric", r.metric).eq("period", r.period).eq("active", true);
        if (error) throw error;
      }
      const { error } = await db.from("goals").insert(rows);
      if (error) throw error;
      toast({ title: "Metas atribuídas", description: `${rows.length} meta(s) para ${new Set(rows.map((r) => r.user_id)).size} pessoa(s).` });
      setDrafts([]);
      setSelectedUsers([]);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["goals-progress"] });
      onDone();
    } catch (e: any) {
      toast({ title: "Erro ao salvar metas", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Quem recebe</CardTitle>
          <CardDescription>Selecione uma ou mais pessoas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => selectAllRole("operador")}>Todos do telemarketing</Button>
            <Button size="sm" variant="outline" onClick={() => selectAllRole("coordenador")}>Todos os coordenadores</Button>
            <Button size="sm" variant="outline" onClick={() => selectAllRole("motoboy")}>Todos os mensageiros</Button>
          </div>
          <div className="max-h-[420px] overflow-y-auto border rounded-md divide-y">
            {teamLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : team.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum operador, coordenador ou mensageiro ativo.</p>
            ) : (
              team.map((t) => (
                <label key={t.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={selectedUsers.includes(t.id)} onChange={() => toggleUser(t.id)} />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[t.role]}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Quais metas</CardTitle>
            <CardDescription>Use os modelos prontos e ajuste os valores, ou crie uma meta personalizada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["operador", "coordenador", "motoboy"] as GoalRole[]).map((role) => {
              const list = templates.filter((t) => t.active && t.role === role);
              if (list.length === 0) return null;
              const dim = selectedRoles.size > 0 && !selectedRoles.has(role);
              return (
                <div key={role} className={dim ? "opacity-40" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modelos · {ROLE_LABEL[role]}</p>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addAllTemplates(role)}>Adicionar todos</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.map((t) => {
                      const added = drafts.some((d) => d.metric === t.metric && d.period === t.period);
                      return (
                        <Button key={t.id} size="sm" variant={added ? "secondary" : "outline"} className="h-auto py-1.5 text-xs" onClick={() => addTemplate(t)} disabled={added}>
                          <Plus className="w-3 h-3 mr-1" />
                          {t.name} · {formatGoalValue(t.target, metricByKey(t.metric)?.unit ?? "count")}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-4 grid gap-3 sm:grid-cols-[1fr_140px_140px_auto] items-end">
              <div className="space-y-1">
                <Label className="text-xs">Meta personalizada · indicador</Label>
                <Select value={custom.metric} onValueChange={(v) => setCustom((c) => ({ ...c, metric: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_METRICS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label} ({ROLE_SHORT[m.role]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período</Label>
                <Select value={custom.period} onValueChange={(v: GoalPeriod) => setCustom((c) => ({ ...c, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diária</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor da meta</Label>
                <Input type="number" min="0" step="0.01" value={custom.target} onChange={(e) => setCustom((c) => ({ ...c, target: e.target.value }))} />
              </div>
              <Button variant="outline" onClick={addCustom}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Revisar e salvar</CardTitle>
            <CardDescription>
              Cada meta vai só para quem tem a função correspondente. Se a pessoa já tiver uma meta ativa do mesmo indicador e período, ela é substituída.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma meta adicionada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="w-[150px]">Meta</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d, i) => (
                    <TableRow key={`${d.metric}-${d.period}`}>
                      <TableCell className="text-sm">{metricByKey(d.metric)?.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ROLE_SHORT[d.role]}</TableCell>
                      <TableCell><Badge variant="secondary">{PERIOD_LABEL[d.period]}</Badge></TableCell>
                      <TableCell>
                        <Input type="number" min="0" step="0.01" className="h-8" value={d.target}
                          onChange={(e) => setDrafts((all) => all.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDrafts((all) => all.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Válida a partir de</Label>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value || today())} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Válida até (opcional)</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observação (opcional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aparece para a pessoa" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar metas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modelos (coordenador / admin)
// ─────────────────────────────────────────────────────────────
function Templates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useTemplates();
  const empty = { id: "", name: "", description: "", metric: GOAL_METRICS[0].key, period: "diaria" as GoalPeriod, target: "" };
  const [form, setForm] = useState<typeof empty | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form) return;
    const m = metricByKey(form.metric);
    if (!form.name.trim() || !m || !(Number(form.target) > 0)) {
      toast({ title: "Preencha nome, indicador e um valor maior que zero", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(), description: form.description || null, metric: form.metric,
      period: form.period, target: Number(form.target), role: m.role,
    };
    const { error } = form.id
      ? await db.from("goal_templates").update(payload).eq("id", form.id)
      : await db.from("goal_templates").insert({ ...payload, created_by: user?.id });
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar modelo", description: error.message, variant: "destructive" });
    toast({ title: form.id ? "Modelo atualizado" : "Modelo criado" });
    setForm(null);
    qc.invalidateQueries({ queryKey: ["goal-templates"] });
  };

  const toggleActive = async (t: GoalTemplate) => {
    const { error } = await db.from("goal_templates").update({ active: !t.active }).eq("id", t.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["goal-templates"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-3xl">
          Modelos são sugestões de meta que aparecem prontas na hora de atribuir. Os valores iniciais são um ponto de partida:
          ajuste conforme o histórico real da equipe. Alterar um modelo não muda metas já atribuídas.
        </p>
        <Button onClick={() => setForm(empty)}><Plus className="w-4 h-4 mr-1" />Novo modelo</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Indicador</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : data.map((t) => {
                const m = metricByKey(t.metric);
                return (
                  <TableRow key={t.id} className={t.active ? "" : "opacity-50"}>
                    <TableCell>
                      <p className="text-sm font-medium">{t.name}</p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{ROLE_LABEL[t.role]}</TableCell>
                    <TableCell><Badge variant="secondary">{PERIOD_LABEL[t.period]}</Badge></TableCell>
                    <TableCell className="text-xs">{m?.label ?? t.metric}</TableCell>
                    <TableCell className="text-right font-medium">{formatGoalValue(t.target, m?.unit ?? "count")}</TableCell>
                    <TableCell className="text-center">
                      <input type="checkbox" className="h-4 w-4 accent-primary" checked={t.active} onChange={() => toggleActive(t)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setForm({ id: t.id, name: t.name, description: t.description || "", metric: t.metric, period: t.period, target: String(t.target) })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar modelo" : "Novo modelo de meta"}</DialogTitle>
            <DialogDescription>A função (telemarketing ou mensageiro) é definida pelo indicador escolhido.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Ligações do dia (equipe nova)" />
              </div>
              <div className="space-y-1">
                <Label>Indicador</Label>
                <Select value={form.metric} onValueChange={(v) => setForm({ ...form, metric: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_METRICS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>{m.label} ({ROLE_SHORT[m.role]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{metricByKey(form.metric)?.howMeasured}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Período</Label>
                  <Select value={form.period} onValueChange={(v: GoalPeriod) => setForm({ ...form, period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor da meta</Label>
                  <Input type="number" min="0" step="0.01" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Descrição (opcional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────
export default function Metas() {
  const { role } = useAuth();
  const isManager = role === "admin" || role === "coordenador";
  const [tab, setTab] = useState("painel");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> Metas
        </h1>
        <p className="text-muted-foreground text-sm">
          {isManager
            ? "Acompanhe e personalize as metas diárias e mensais do telemarketing, da coordenação e dos mensageiros."
            : "Suas metas do dia e do mês, atualizadas com o que você já registrou no sistema."}
        </p>
      </div>

      {isManager ? (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="painel"><Users className="w-4 h-4 mr-1" />Painel da equipe</TabsTrigger>
            <TabsTrigger value="mensal"><Target className="w-4 h-4 mr-1" />Meta mensal</TabsTrigger>
            <TabsTrigger value="atribuir"><CalendarDays className="w-4 h-4 mr-1" />Atribuir metas</TabsTrigger>
            <TabsTrigger value="modelos"><ListChecks className="w-4 h-4 mr-1" />Modelos</TabsTrigger>
          </TabsList>
          <TabsContent value="painel"><TeamPanel /></TabsContent>
          <TabsContent value="mensal"><MonthlyGoals /></TabsContent>
          <TabsContent value="atribuir"><AssignGoals onDone={() => setTab("painel")} /></TabsContent>
          <TabsContent value="modelos"><Templates /></TabsContent>
        </Tabs>
      ) : (
        <MyGoals />
      )}

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        O realizado é calculado automaticamente: ligações e doações lançadas no Telemarketing, e visitas marcadas nas Rotas de Coleta.
      </p>
    </div>
  );
}
