import { 
  Book, Code, Shield, Zap, Info, ArrowLeft, 
  ChevronRight, Database, MessageSquare, 
  Lock, AlertTriangle, Terminal, Search,
  FileText, Globe, Layers, Cpu, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

const ApiDocumentation = () => {
  const navigate = useNavigate();

  const sections = [
    { id: "intro", title: "Introdução", icon: Book },
    { id: "auth", title: "Autenticação", icon: Lock },
    { id: "donors", title: "Entidade: Doadores", icon: Database },
    { id: "donations", title: "Entidade: Doações", icon: Zap },
    { id: "webhooks", title: "Webhooks & Eventos", icon: Globe },
    { id: "errors", title: "Tratamento de Erros", icon: AlertTriangle },
    { id: "best-practices", title: "Boas Práticas", icon: Shield },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 container mx-auto pb-20 animate-in fade-in duration-500">
      {/* Sidebar de Navegação */}
      <div className="lg:w-64 shrink-0">
        <div className="sticky top-24 space-y-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 mb-4 text-muted-foreground hover:text-primary"
            onClick={() => navigate("/dashboard/api-aberta")}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para API
          </Button>
          
          <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-widest px-2">Manual Técnico</h3>
          <nav className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-left"
              >
                <s.icon className="w-4 h-4 text-primary" />
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-bold text-primary uppercase mb-2">Suporte</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Precisa de ajuda com a integração? Nossa equipe técnica está disponível via canal VIP.</p>
            <Button variant="link" className="p-0 h-auto text-xs mt-2 text-primary">Abrir Ticket →</Button>
          </div>
        </div>
      </div>

      {/* Conteúdo da Documentação */}
      <div className="flex-1 space-y-16">
        <section id="intro" className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Book className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Introdução</h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Bem-vindo à documentação oficial do Donor Connect Hub. Nossa API foi construída sobre princípios REST, utilizando endpoints previsíveis e orientados a recursos. Utilizamos códigos HTTP padrão e JSON para todas as respostas e payloads.
          </p>
          <div className="bg-muted/30 p-6 rounded-2xl border border-muted space-y-4">
            <h4 className="font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Arquitetura Base</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Formato: JSON (UTF-8)</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Protocolo: HTTPS (TLS 1.3)</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Suporte a CORS: Habilitado</li>
              <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" /> Limite de Rate: 10k req/hora</li>
            </ul>
          </div>
        </section>

        <Separator />

        <section id="auth" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Autenticação</h2>
          </div>
          <p className="text-muted-foreground">
            A API utiliza autenticação via Token de Portador (Bearer Token). Sua chave de API deve ser passada no cabeçalho `Authorization` de todas as requisições autenticadas.
          </p>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <Card className="relative border-none bg-slate-950 text-slate-50 overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Exemplo de Cabeçalho</span>
                  </div>
                  <Badge variant="outline" className="border-white/20 text-white/50 text-[10px]">HTTP / 1.1</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 font-mono text-xs leading-relaxed">
                <p><span className="text-purple-400">GET</span> /v1/donors</p>
                <p><span className="text-blue-400">Host</span>: api.donorconnect.hub</p>
                <p><span className="text-blue-400">Authorization</span>: Bearer <span className="text-green-400">YOUR_API_KEY</span></p>
                <p><span className="text-blue-400">Accept</span>: application/json</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        <section id="donors" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Entidade: Doadores</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Representa a base central de indivíduos ou empresas que contribuem para sua organização. O ID do doador é fundamental para vincular doações e campanhas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Campos Requeridos</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between items-center"><span className="font-mono text-primary font-bold">name</span> <Badge variant="secondary" className="text-[8px]">string</Badge></div>
                <div className="flex justify-between items-center"><span className="font-mono text-primary font-bold">email</span> <Badge variant="secondary" className="text-[8px]">string</Badge></div>
                <div className="flex justify-between items-center"><span className="font-mono text-primary font-bold">phone</span> <Badge variant="secondary" className="text-[8px]">string</Badge></div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Peculiaridades do Recurso</CardTitle>
              </CardHeader>
              <CardContent className="text-xs leading-relaxed text-muted-foreground">
                Diferente de sistemas legados, o Donor Connect Hub normaliza telefones automaticamente para o formato internacional E.164. Caso forneça um e-mail já existente, a API retornará um erro 409 (Conflict).
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="donations" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Entidade: Doações</h2>
          </div>
          <p className="text-muted-foreground">
            O endpoint de doações suporta processamento em tempo real. Ao registrar uma doação, o sistema automaticamente recalcula a classificação do doador e gatilha os trabalhadores de follow-up configurados.
          </p>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Importante: Idempotência</p>
              Recomendamos o envio de um header `Idempotency-Key` em requisições POST para evitar registros duplicados em caso de retentativas de rede.
            </div>
          </div>
        </section>

        <Separator />

        <section id="errors" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Tratamento de Erros</h2>
          </div>
          <p className="text-muted-foreground">Nossa API utiliza códigos de resposta HTTP padrão para indicar o sucesso ou falha de uma requisição.</p>
          
          <div className="overflow-hidden rounded-xl border border-muted">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-bold w-32">Código</th>
                  <th className="px-4 py-3 text-left font-bold">Significado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-green-600">200 / 201</td>
                  <td className="px-4 py-3 text-muted-foreground">Sucesso. Recurso carregado ou criado.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600">400</td>
                  <td className="px-4 py-3 text-muted-foreground">Bad Request. Payload malformado ou campos inválidos.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-amber-600">401 / 403</td>
                  <td className="px-4 py-3 text-muted-foreground">Não autorizado. Verifique sua Chave de API.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono font-bold text-red-600">429</td>
                  <td className="px-4 py-3 text-muted-foreground">Too Many Requests. Limite de taxa excedido.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        <section id="best-practices" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Boas Práticas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> Webhooks: Revezamento</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Configure um endpoint que responda com 200 OK imediatamente e processe a lógica de forma assíncrona para evitar timeouts por parte da nossa API.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Versionsamento</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Sempre especifique a versão da API na URL (`/v1/`). Mudanças não-retrocompatíveis serão descontinuadas com aviso prévio de 6 meses.</p>
            </div>
          </div>
        </section>

        <Card className="bg-primary/5 border-none p-10 text-center space-y-4 rounded-3xl">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Tudo pronto para começar?</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Sua jornada de integração automatizada começa aqui. Explore os exemplos de código para acelerar seu desenvolvimento.</p>
          <div className="flex justify-center gap-4 pt-4">
            <Button className="bg-primary shadow-glow" onClick={() => navigate("/dashboard/api-aberta")}>Voltar ao Console</Button>
            <Button variant="outline">Consultar FAQ</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ApiDocumentation;
