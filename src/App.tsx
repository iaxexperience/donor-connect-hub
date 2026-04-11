import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Doadores from "./pages/Doadores.tsx";
import Campanhas from "./pages/Campanhas.tsx";
import Telemarketing from "./pages/Telemarketing.tsx";
import Usuarios from "./pages/Usuarios.tsx";
import Relatorios from "./pages/Relatorios.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
import Integracoes from "./pages/Integracoes.tsx";
import FollowUps from "./pages/FollowUps.tsx";
import ApiAberta from "./pages/ApiAberta.tsx";
import { DonorForm } from "./pages/DonorForm.tsx";
import { DashboardLayout } from "./components/dashboard/DashboardLayout.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="doadores" element={<Doadores />} />
                <Route path="doadores/novo" element={<DonorForm />} />
                <Route path="doadores/editar/:id" element={<DonorForm />} />
                <Route path="kanbam" element={<Pipeline />} />
                <Route path="campanhas" element={<Campanhas />} />
                <Route path="telemarketing" element={<Telemarketing />} />
                <Route path="followups" element={<FollowUps />} />
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="configuracoes" element={<Configuracoes />} />
                <Route path="integracoes" element={<Integracoes />} />
                <Route path="api-aberta" element={<ApiAberta />} />
                <Route path="api-documentacao" element={<ApiDocumentation />} />
              </Route>
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
