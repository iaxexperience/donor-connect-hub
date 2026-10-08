import { canAccessPage } from "@/lib/permissions";
import { useTheme } from "@/components/theme/DynamicThemeProvider";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Phone,
  CalendarClock,
  BarChart3,
  Settings,
  LogOut,
  Heart,
  MessageSquare,
  Globe,
  GitMerge,
  Wallet,
  Landmark,
  Sparkles,
  PiggyBank,
  Gift,
  Building2,
  ArrowRightLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Doadores", url: "/dashboard/doadores", icon: Heart },
  { title: "Kanban", url: "/dashboard/kanbam", icon: GitMerge },
  { title: "Campanhas", url: "/dashboard/campanhas", icon: Megaphone },
  { title: "Telemarketing", url: "/dashboard/telemarketing", icon: Phone },
  { title: "Follow-ups", url: "/dashboard/followups", icon: CalendarClock },
  { title: "Usuários", url: "/dashboard/usuarios", icon: Users },
  { title: "Setores", url: "/dashboard/setores", icon: Building2 },
  { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3 },
  { title: "Caixa", url: "/dashboard/caixa", icon: PiggyBank },
  { title: "Doações Físicas", url: "/dashboard/doacoes-fisicas", icon: Gift },
  { title: "Rotas de Coleta", url: "/dashboard/rotas", icon: ArrowRightLeft },
  { title: "Transferência", url: "/dashboard/transferencia-doacoes", icon: ArrowRightLeft },
];

const configItems = [
  { title: "WhatsApp", url: "/dashboard/whatsapp", icon: MessageSquare },
  { title: "Integração Asaas", url: "/dashboard/asaas", icon: Wallet },
  { title: "Banco do Brasil", url: "/dashboard/bb", icon: Landmark },
  { title: "API Aberta", url: "/dashboard/api-aberta", icon: Globe },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const currentPath = location.pathname;
  
  const { settings: { system_name: systemName, logo_url: logoUrl } } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Filtragem baseada em Role
  const filteredMainItems = mainItems.filter(item => canAccessPage(role, item.url));
  const filteredConfigItems = configItems.filter(item => canAccessPage(role, item.url));

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo Branding - Concept 3 */}
        <div className="flex items-center gap-3 px-6 py-8 border-b border-sidebar-border bg-sidebar-background/50 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-lg shadow-black/5 flex items-center justify-center shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
            ) : (
              <div className="w-full h-full bg-orange-500 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" fill="currentColor" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none overflow-hidden">
              <span className="font-heading font-black text-xl tracking-tighter text-white truncate max-w-[150px]">
                {systemName}
              </span>
              <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-blue-100/60 mt-1">
                Fundação Assistencial
              </span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredConfigItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


