import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Doadores = lazy(() => import("./pages/Doadores"));
const Campanhas = lazy(() => import("./pages/Campanhas"));
const Telemarketing = lazy(() => import("./pages/Telemarketing"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Integracoes = lazy(() => import("./pages/Integracoes"));
const IntegracaoAsaas = lazy(() => import("./pages/IntegracaoAsaas"));
const IntegracaoBB = lazy(() => import("./pages/IntegracaoBB"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const ApiAberta = lazy(() => import("./pages/ApiAberta"));
const ApiDocumentation = lazy(() => import("./pages/ApiDocumentation"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const DonorForm = lazy(() => import("./pages/DonorForm"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Caixa = lazy(() => import("./pages/Caixa"));
const DoacoesFisicas = lazy(() => import("./pages/DoacoesFisicas"));
const Setores = lazy(() => import("./pages/Setores"));
const TransferenciaDoacoes = lazy(() => import("./pages/TransferenciaDoacoes"));
const Rotas = lazy(() => import("./pages/Rotas"));
const GestaoAtribuicoes = lazy(() => import("./pages/GestaoAtribuicoes"));
const MinhasCaptacoes = lazy(() => import("./pages/MinhasCaptacoes"));
const DoacoesRecebidas = lazy(() => import("./pages/DoacoesRecebidas"));
const DistribuicaoCarteiras = lazy(() => import("./pages/DistribuicaoCarteiras"));
const Metas = lazy(() => import("./pages/Metas"));
const PainelCoordenacao = lazy(() => import("./pages/PainelCoordenacao"));
const IaxGuardian = lazy(() => import("./pages/IaxGuardian"));
const ValidateReceipt = lazy(() => import("./pages/ValidateReceipt"));
const ValidarRecibo = lazy(() => import("./pages/ValidarRecibo"));
const Documentacao = lazy(() => import("./pages/Documentacao"));
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
  componentDidCatch(error: any) {
    // Depois de uma atualização do site, quem estava com a página aberta pode pedir um
    // pedaço de código que não existe mais. Recarrega uma vez para pegar a versão nova.
    const msg = String(error?.message || error);
    if (/dynamically imported module|Importing a module script failed|Loading chunk/i.test(msg)) {
      try {
        if (!sessionStorage.getItem("pulse_chunk_reload")) {
          sessionStorage.setItem("pulse_chunk_reload", "1");
          window.location.reload();
        }
      } catch { /* sem armazenamento */ }
    }
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


// Cada tela é baixada só quando aberta (antes o site inteiro vinha num arquivo de 2,7 MB).
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

// Dados já carregados são reaproveitados ao voltar para uma tela (sem piscar
// "carregando" nem buscar tudo de novo a cada clique).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { DynamicThemeProvider } from "./components/theme/DynamicThemeProvider";

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DynamicThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/redefinir-senha" element={<ResetPassword />} />
                <Route path="/documentacao" element={<Documentacao />} />
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
                    <Route path="setores" element={<Setores />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route path="configuracoes" element={<Configuracoes />} />
                    <Route path="integracoes" element={<Integracoes />} />
                    <Route path="whatsapp" element={<WhatsApp />} />
                    <Route path="asaas" element={<IntegracaoAsaas />} />
                    <Route path="bb" element={<IntegracaoBB />} />
                    <Route path="api-aberta" element={<ApiAberta />} />
                    <Route path="api-documentacao" element={<ApiDocumentation />} />
                    <Route path="caixa" element={<Caixa />} />
                    <Route path="doacoes-fisicas" element={<DoacoesFisicas />} />
                    <Route path="transferencia-doacoes" element={<TransferenciaDoacoes />} />
                    <Route path="rotas" element={<Rotas />} />
                    <Route path="atribuicoes" element={<GestaoAtribuicoes />} />
                    <Route path="minhas-captacoes" element={<MinhasCaptacoes />} />
                    <Route path="doacoes-recebidas" element={<DoacoesRecebidas />} />
                    <Route path="distribuicao-carteiras" element={<DistribuicaoCarteiras />} />
                    <Route path="metas" element={<Metas />} />
                    <Route path="coordenacao" element={<PainelCoordenacao />} />
                    <Route path="iax-guardian" element={<IaxGuardian />} />
                  </Route>
                </Route>

                <Route path="/validate-receipt/:hash" element={<ValidateReceipt />} />
                <Route path="/validar-recibo" element={<ValidarRecibo />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </DynamicThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
