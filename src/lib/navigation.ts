import {
  LayoutDashboard, BarChart3, Target, Heart, GitMerge, Megaphone, Shuffle, Phone, HeartHandshake,
  CalendarClock, MessageSquare, PiggyBank, PackageCheck, Gift, ArrowRightLeft, Route, ListChecks,
  Users, Building2, Wallet, Landmark, Globe, Settings, Plug, ShieldCheck, TrendingUp, type LucideIcon,
} from "lucide-react";
import { canAccessPage, type AppRole } from "@/lib/permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  /** Cor do grupo: ícone na barra lateral, marcador do painel e item ativo. */
  accent: string;
  railIcon: LucideIcon;
  items: NavItem[];
}

// Menu agrupado por área de trabalho (mesmo padrão do FinFlow: barra de
// ícones por grupo + painel com os itens do grupo selecionado).
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Visão Geral",
    accent: "#0ea5e9",
    railIcon: LayoutDashboard,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/dashboard/coordenacao", label: "Painel da Coordenação", icon: TrendingUp },
    ],
  },
  {
    label: "Inteligência",
    accent: "#6366f1",
    railIcon: BarChart3,
    items: [
      { to: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Metas",
    accent: "#14b8a6",
    railIcon: Target,
    items: [
      { to: "/dashboard/metas", label: "Metas", icon: Target },
    ],
  },
  {
    label: "Doadores",
    accent: "#3b82f6",
    railIcon: Heart,
    items: [
      { to: "/dashboard/doadores", label: "Doadores", icon: Heart },
    ],
  },
  {
    label: "Kanban",
    accent: "#8b5cf6",
    railIcon: GitMerge,
    items: [
      { to: "/dashboard/kanbam", label: "Kanban", icon: GitMerge },
    ],
  },
  {
    label: "Campanhas",
    accent: "#ec4899",
    railIcon: Megaphone,
    items: [
      { to: "/dashboard/campanhas", label: "Campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Carteiras",
    accent: "#06b6d4",
    railIcon: Shuffle,
    items: [
      { to: "/dashboard/distribuicao-carteiras", label: "Distribuição de Carteiras", icon: Shuffle },
    ],
  },
  {
    label: "Captação",
    accent: "#f59e0b",
    railIcon: Phone,
    items: [
      { to: "/dashboard/telemarketing", label: "Telemarketing", icon: Phone },
      { to: "/dashboard/minhas-captacoes", label: "Minhas Captações", icon: HeartHandshake },
      { to: "/dashboard/followups", label: "Follow-ups", icon: CalendarClock },
      { to: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageSquare },
    ],
  },
  {
    label: "Recebimentos",
    accent: "#10b981",
    railIcon: PiggyBank,
    items: [
      { to: "/dashboard/caixa", label: "Caixa", icon: PiggyBank },
      { to: "/dashboard/doacoes-recebidas", label: "Doações Recebidas", icon: PackageCheck },
      { to: "/dashboard/doacoes-fisicas", label: "Doações Físicas", icon: Gift },
      { to: "/dashboard/transferencia-doacoes", label: "Transferência", icon: ArrowRightLeft },
    ],
  },
  {
    label: "Coleta",
    accent: "#8b5cf6",
    railIcon: Route,
    items: [
      { to: "/dashboard/rotas", label: "Rotas de Coleta", icon: Route },
      { to: "/dashboard/atribuicoes", label: "Gestão de Atribuições", icon: ListChecks },
    ],
  },
  {
    label: "Equipe",
    accent: "#ec4899",
    railIcon: Users,
    items: [
      { to: "/dashboard/usuarios", label: "Usuários", icon: Users },
      { to: "/dashboard/setores", label: "Setores", icon: Building2 },
    ],
  },
  {
    label: "Sistema",
    accent: "#ef4444",
    railIcon: Plug,
    items: [
      { to: "/dashboard/asaas", label: "Integração Asaas", icon: Wallet },
      { to: "/dashboard/bb", label: "Banco do Brasil", icon: Landmark },
      { to: "/dashboard/api-aberta", label: "API Aberta", icon: Globe },
      { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
      { to: "/dashboard/iax-guardian", label: "IAX Guardian", icon: ShieldCheck },
    ],
  },
];

/** Seções e itens que o papel pode acessar (grupos vazios somem). */
export function navSectionsForRole(role: AppRole | null): NavSection[] {
  return NAV_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => canAccessPage(role, i.to)) }))
    .filter((s) => s.items.length > 0);
}

const normalize = (p: string) => p.replace(/\/+$/, "").toLowerCase() || "/";

/** Item do menu correspondente à rota (ex.: /dashboard/doadores/editar/1 → Doadores). */
export function itemForPath(sections: NavSection[], pathname: string): NavItem | undefined {
  const path = normalize(pathname);
  let best: NavItem | undefined;
  for (const s of sections) {
    for (const i of s.items) {
      const to = normalize(i.to);
      const match = path === to || (to !== "/dashboard" && path.startsWith(to + "/"));
      if (match && (!best || to.length > normalize(best.to).length)) best = i;
    }
  }
  return best;
}

export function sectionForPath(sections: NavSection[], pathname: string): string | undefined {
  const item = itemForPath(sections, pathname);
  return sections.find((s) => item && s.items.includes(item))?.label;
}
