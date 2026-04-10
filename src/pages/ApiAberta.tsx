import { useState } from "react";
import { 
  Code, Globe, Zap, Copy, ExternalLink, Key, 
  Terminal, Webhook, FileJson, Info, CheckCircle2, 
  ShieldCheck, ArrowRight, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const API_BASE_URL = "https://api.donorconnect.hub/v1";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/donors",
    description: "Retorna a lista completa de doadores cadastrados.",
    params: [
      { name: "page", type: "integer", desc: "Número da página (default: 1)" },
      { name: "limit", type: "integer", desc: "Itens por página (max: 100)" }
    ],
    example: `curl -X GET "${API_BASE_URL}/donors" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  },
  {
    method: "POST",
    path: "/donations",
    description: "Registra uma nova doação no sistema.",
    body: {
      donor_id: 123,
      amount: 150.00,
      campaign: "Natal Solidário",
      payment_method: "credit_card"
    },
    example: `curl -X POST "${API_BASE_URL}/donations" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "donor_id": 123,
    "amount": 150.00,
    "campaign": "Natal Solidário"
  }'`
  },
  {
    method: "GET",
    path: "/integration/status",
    description: "Verifica o status de conectividade com as APIs da Meta e Asaas.",
    example: `curl -X GET "${API_BASE_URL}/integration/status" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  }
];

const ApiAberta = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("pk_live_51NwX...");
  const [showKey, setShowKey] = useState(false);

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: title,
      description: "Copiado para a área de transferência.",
    });
  };

  return (
    <div className="space-y-8 container mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-widest">Developer Hub</Badge>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">v1.2.0</span>
          </div>
          <h1 className="font-heading font-bold text-4xl text-foreground tracking-tight">API Aberta</h1>
          <p className="text-muted-foreground max-w-2xl mt-1">
            Integre sua infraestrutura existente com o Donor Connect Hub através de nossa API RESTful.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Documentação Completa
          </Button>
          <Button className="bg-primary shadow-glow">
            <Zap className="w-4 h-4 mr-2" />
            Playground
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sessão de Autenticação */}
          <Card className="border-none shadow-soft bg-gradient-to-br from-background to-muted/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Autenticação</CardTitle>
                  <CardDescription>Todas as requisições devem incluir sua chave de API no header.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-muted space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Sua Chave de API (Live)</span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowKey(!showKey)}>
                    {showKey ? "Esconder" : "Mostrar"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type={showKey ? "text" : "password"} 
                    value={apiKey} 
                    readOnly 
                    className="font-mono text-xs bg-background h-10" 
                  />
                  <Button variant="secondary" size="icon" className="shrink-0 h-10 w-10" onClick={() => copyToClipboard(apiKey, "Chave de API")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Dica de Segurança</p>
                  <p className="opacity-80">Nunca compartilhe sua chave de API em ambientes públicos ou front-end sem proxy. Use variáveis de ambiente para gerenciar suas chaves.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                API Reference
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase opacity-70">Sistemas Online</span>
              </div>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {ENDPOINTS.map((ep) => (
                  <Card key={ep.path} className="border-none shadow-soft hover:shadow-md transition-shadow overflow-hidden group">
                    <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-muted/50">
                      <div className="flex items-center gap-3">
                        <Badge className={`font-bold ${ep.method === "GET" ? "bg-blue-500" : "bg-green-500"} text-white border-none`}>{ep.method}</Badge>
                        <code className="text-sm font-bold text-foreground font-mono">{ep.path}</code>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(ep.example, "Exemplo cURL")}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">{ep.description}</p>
                      
                      {ep.params && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Query Parameters</p>
                          <div className="grid grid-cols-1 gap-2">
                            {ep.params.map(p => (
                              <div key={p.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                                <span className="font-mono font-bold text-primary">{p.name} <span className="text-muted-foreground font-normal">({p.type})</span></span>
                                <span className="text-muted-foreground">{p.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">Exemplo de Requisição</p>
                        <div className="relative">
                          <pre className="p-4 rounded-xl bg-slate-950 text-slate-50 text-[11px] font-mono overflow-x-auto leading-relaxed">
                            {ep.example}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Webhooks</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Receba notificações em tempo real sobre eventos de doação.</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Webhook URL</Label>
                  <Input placeholder="https://seu-servidor.com/webhook" className="bg-muted/50 h-9 text-xs" />
                </div>
                <Button className="w-full text-xs h-9" variant="outline">Configurar Webhook</Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Eventos Suportados</p>
                <ul className="text-xs space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    donation.confirmed
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    donation.pending
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    donation.cancelled
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-soft overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg">SLA & Limites</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Rate Limit</span>
                <Badge variant="outline" className="font-mono">10,000 req/h</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Uptime Geral</span>
                <span className="font-bold text-green-600">99.98%</span>
              </div>
              <Separator />
              <div className="p-3 rounded-lg bg-muted text-[11px] leading-relaxed">
                Nossa API segue os padrões do setor para idempotência e tratamento de erros. Em caso de 5xx, implemente backoff exponencial.
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white/20">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="font-bold">Portal do Desenvolvedor</h3>
            </div>
            <p className="text-sm opacity-90 mb-6">Acesse ferramentas avançadas, logs históricos e suporte técnico especializado para desenvolvedores.</p>
            <Button variant="secondary" className="w-full h-10 group bg-white text-primary hover:bg-white/90">
              Ir para o Portal
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiAberta;
