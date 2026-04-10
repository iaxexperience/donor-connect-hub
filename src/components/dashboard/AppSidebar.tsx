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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  { title: "Campanhas", url: "/dashboard/campanhas", icon: Megaphone },
  { title: "Telemarketing", url: "/dashboard/telemarketing", icon: Phone },
  { title: "Follow-ups", url: "/dashboard/followups", icon: CalendarClock },
  { title: "Usuários", url: "/dashboard/usuarios", icon: Users },
  { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3 },
];

const configItems = [
  { title: "Integrações", url: "/dashboard/integracoes", icon: MessageSquare },
  { title: "API Aberta", url: "/dashboard/api-aberta", icon: Globe },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo Branding - Concept 3 */}
        <div className="flex items-center gap-2 px-6 py-8 border-b border-sidebar-border bg-sidebar-background/50 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center shrink-0 animate-pulse-glow">
            <Heart className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-heading font-black text-2xl tracking-tighter text-white">
                Pulse
                <span className="font-light text-blue-200 ml-1">Doações</span>
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-blue-100/60 mt-1">
                Fundação Assistencial
              </span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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
              {configItems.map((item) => (
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
            <SidebarMenuButton asChild>
              <NavLink to="/login" className="text-destructive hover:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                {!collapsed && <span>Sair</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
