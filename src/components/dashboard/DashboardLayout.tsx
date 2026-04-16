import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AsaasAutomationWorker } from "../automation/AsaasAutomationWorker";
import { FollowUpAutomationWorker } from "@/components/automation/FollowUpAutomationWorker";

import { UserMenu } from "./UserMenu";
import { ForcePasswordChangeModal } from "../auth/ForcePasswordChangeModal";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <AsaasAutomationWorker />
      <FollowUpAutomationWorker />
      <ForcePasswordChangeModal />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between border-b bg-card px-8 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="ml-0" />
              <div className="h-4 w-px bg-border mx-2" />
              <span className="text-sm text-muted-foreground font-medium tracking-tight">
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
          <main className="flex-1 overflow-auto bg-background p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
