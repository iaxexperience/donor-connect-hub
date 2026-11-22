// Catálogo dos indicadores de meta. As chaves precisam bater com o
// CASE de public.goal_metric_value() em supabase/migrations/20261122_goals.sql.

export type GoalRole = "operador" | "motoboy" | "coordenador";
export type GoalPeriod = "diaria" | "mensal";
export type GoalUnit = "count" | "currency" | "percent";

export interface GoalMetric {
  key: string;
  label: string;
  role: GoalRole;
  unit: GoalUnit;
  howMeasured: string;
}

export const GOAL_METRICS: GoalMetric[] = [
  { key: "tm_ligacoes", label: "Ligações realizadas", role: "operador", unit: "count",
    howMeasured: "Ligações registradas na tela de Telemarketing." },
  { key: "tm_contatos_sucesso", label: "Contatos efetivos", role: "operador", unit: "count",
    howMeasured: "Ligações com resultado \"atendeu\" ou \"prometeu\"." },
  { key: "tm_doacoes_qtd", label: "Doações captadas", role: "operador", unit: "count",
    howMeasured: "Doações lançadas pelo operador (pagas ou pendentes, exceto canceladas)." },
  { key: "tm_valor_prometido", label: "Valor captado (prometido + pago)", role: "operador", unit: "currency",
    howMeasured: "Soma das doações lançadas pelo operador, exceto canceladas." },
  { key: "tm_valor_recebido", label: "Valor recebido (pago)", role: "operador", unit: "currency",
    howMeasured: "Soma das doações do operador já confirmadas como pagas." },
  { key: "tm_novos_doadores", label: "Novos doadores", role: "operador", unit: "count",
    howMeasured: "Doadores cuja primeira doação paga foi captada pelo operador." },
  { key: "tm_doadores_reativados", label: "Doadores reativados", role: "operador", unit: "count",
    howMeasured: "Doadores que estavam 90+ dias sem doar e voltaram a doar com o operador." },
  { key: "tm_taxa_conversao", label: "Taxa de conversão", role: "operador", unit: "percent",
    howMeasured: "Doações captadas ÷ ligações realizadas no período." },
  { key: "msg_visitas", label: "Visitas realizadas", role: "motoboy", unit: "count",
    howMeasured: "Visitas da rota marcadas como coletadas ou sem sucesso." },
  { key: "msg_coletas", label: "Coletas realizadas", role: "motoboy", unit: "count",
    howMeasured: "Visitas da rota marcadas como coletadas." },
  { key: "msg_valor_coletado", label: "Valor coletado", role: "motoboy", unit: "currency",
    howMeasured: "Soma dos valores em dinheiro das visitas coletadas." },
  { key: "msg_taxa_sucesso", label: "Taxa de sucesso das visitas", role: "motoboy", unit: "percent",
    howMeasured: "Coletas ÷ visitas concluídas no período." },
];

export const metricByKey = (key: string) => GOAL_METRICS.find((m) => m.key === key);

export const ROLE_LABEL: Record<string, string> = {
  operador: "Operador de Telemarketing",
  motoboy: "Mensageiro / Cobrador",
};

export const PERIOD_LABEL: Record<GoalPeriod, string> = {
  diaria: "Diária",
  mensal: "Mensal",
};

export const formatGoalValue = (value: number, unit: GoalUnit) => {
  const n = Number(value || 0);
  if (unit === "currency") return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (unit === "percent") return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
};

export const goalPercent = (achieved: number, target: number) =>
  target > 0 ? Math.round((Number(achieved || 0) / Number(target)) * 100) : 0;

export const progressTone = (pct: number) => {
  if (pct >= 100) return { bar: "bg-emerald-500", text: "text-emerald-700", label: "Meta batida" };
  if (pct >= 70) return { bar: "bg-sky-500", text: "text-sky-700", label: "No caminho" };
  if (pct >= 40) return { bar: "bg-amber-500", text: "text-amber-700", label: "Atenção" };
  return { bar: "bg-red-500", text: "text-red-700", label: "Abaixo" };
};

export interface GoalProgressRow {
  goal_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  metric: string;
  period: GoalPeriod;
  target: number;
  achieved: number;
  period_start: string;
  period_end: string;
  valid_from: string;
  valid_until: string | null;
  notes: string | null;
}

export interface GoalTemplate {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  role: GoalRole;
  period: GoalPeriod;
  metric: string;
  target: number;
  active: boolean;
}
