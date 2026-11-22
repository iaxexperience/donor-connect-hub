import { Suspense, useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
// Os "workers" AsaasAutomationWorker e FollowUpAutomationWorker saíram daqui: estavam
// desativados (o follow-up roda no servidor via pg_cron), mas o do Asaas ainda baixava
// todos os doadores a cada tela aberta, deixando o painel inteiro lento.

import { UserMenu } from "./UserMenu";
import { ForcePasswordChangeModal } from "../auth/ForcePasswordChangeModal";

export function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Reaplica o tema escolhido no menu (claro/escuro).
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", localStorage.getItem("pulse_theme") === "dark");
    } catch { /* sem armazenamento */ }
  }, []);

  return (
    <div className="h-dvh w-full flex bg-background overflow-hidden">
      <ForcePasswordChangeModal />
      <AppSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-16 shrink-0 flex items-center justify-between border-b bg-card px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm text-muted-foreground font-medium tracking-tight truncate">
              Plataforma de Gestão de Doações
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary animate-pulse rounded-full" />
            </Button>
            <div className="h-8 w-px bg-border mx-2" />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background p-4 lg:p-6">
          {/* Carregando a próxima tela: o menu e o topo continuam na tela. */}
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
