import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Doadores from "./pages/Doadores";
import Campanhas from "./pages/Campanhas";
import Telemarketing from "./pages/Telemarketing";
import Usuarios from "./pages/Usuarios";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Integracoes from "./pages/Integracoes";
import IntegracaoAsaas from "./pages/IntegracaoAsaas";
import IntegracaoBB from "./pages/IntegracaoBB";
import FollowUps from "./pages/FollowUps";
import ApiAberta from "./pages/ApiAberta";
import ApiDocumentation from "./pages/ApiDocumentation";
import Pipeline from "./pages/Pipeline";
import DonorForm from "./pages/DonorForm";
import WhatsApp from "./pages/WhatsApp";
import AgenteIA from "./pages/AgenteIA";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Simple Error Boundary to catch crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 text-red-900 min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Oops! Algo deu errado.</h1>
          <pre className="p-4 bg-white border border-red-200 rounded text-xs overflow-auto">
            {this.state.error?.toString()}
          </pre>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
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
              
              {/* Rota Protegida do Dashboard */}
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
                  <Route path="whatsapp" element={<WhatsApp />} />
                  <Route path="asaas" element={<IntegracaoAsaas />} />
                  <Route path="bb" element={<IntegracaoBB />} />
                  <Route path="api-aberta" element={<ApiAberta />} />
                  <Route path="api-documentacao" element={<ApiDocumentation />} />
                  <Route path="agente-ia" element={<AgenteIA />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
