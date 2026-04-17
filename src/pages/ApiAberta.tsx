import { useState } from "react";
import {
  Code, Globe, Zap, Copy, ExternalLink, Key,
  Terminal, Webhook, FileJson, Info, CheckCircle2,
  ShieldCheck, ArrowRight, BookOpen, Users, Heart, Megaphone
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
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://api.donorconnect.hub/v1";

const DONORS_ENDPOINTS = [
  {
    method: "GET",
    path: "/donors",
    description: "Retorna a lista completa de doadores cadastrados com paginação.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" },
      { name: "Accept", value: "application/json" }
    ],
    params: [
      { name: "page", type: "integer", desc: "Número da página (default: 1)" },
      { name: "limit", type: "integer", desc: "Itens por página (max: 100)" },
      { name: "type", type: "string", desc: "Filtrar por tipo: lead | unico | esporadico | recorrente" },
      { name: "search", type: "string", desc: "Buscar por nome ou e-mail" }
    ],
    example: `curl -X GET "${API_BASE_URL}/donors?page=1&limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: {
      data: [
        { id: 1, name: "João Silva", email: "joao@exemplo.com", phone: "11999999999", type: "recorrente", total_donated: 1500.00, donation_count: 10 }
      ],
      total: 120,
      page: 1,
      limit: 20
    }
  },
  {
    method: "GET",
    path: "/donors/:id",
    description: "Retorna os dados completos de um doador específico pelo ID.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    example: `curl -X GET "${API_BASE_URL}/donors/1" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: {
      id: 1,
      name: "João Silva",
      email: "joao@exemplo.com",
      phone: "11999999999",
      document_id: "123.456.789-00",
      type: "recorrente",
      total_donated: 1500.00,
      donation_count: 10,
      last_donation_date: "2026-04-10",
      address: "Rua Exemplo, 123",
      city: "São Paulo",
      state: "SP"
    }
  },
  {
    method: "POST",
    path: "/donors",
    description: "Cadastra um novo doador na plataforma.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" },
      { name: "Content-Type", value: "application/json" }
    ],
    body: {
      name: "João Silva",
      email: "joao@exemplo.com",
      phone: "11999999999",
      document_id: "123.456.789-00",
      type: "lead",
      birth_date: "1990-05-15",
      zip_code: "01310-100",
      address: "Av. Paulista",
      address_number: "1000",
      city: "São Paulo",
      state: "SP"
    },
    example: `curl -X POST "${API_BASE_URL}/donors" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "phone": "11999999999",
    "document_id": "123.456.789-00",
    "type": "lead"
  }'`
  },
  {
    method: "PUT",
    path: "/donors/:id",
    description: "Atualiza os dados de um doador existente. Envie apenas os campos que deseja alterar.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" },
      { name: "Content-Type", value: "application/json" }
    ],
    body: {
      type: "recorrente",
      phone: "11988888888",
      city: "Campinas"
    },
    example: `curl -X PUT "${API_BASE_URL}/donors/1" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{ "type": "recorrente", "phone": "11988888888" }'`
  },
  {
    method: "DELETE",
    path: "/donors/:id",
    description: "Remove um doador da plataforma. Esta ação é irreversível.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    example: `curl -X DELETE "${API_BASE_URL}/donors/1" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  }
];

const DONATIONS_ENDPOINTS = [
  {
    method: "GET",
    path: "/donations",
    description: "Lista todas as doações com filtros opcionais por doador, campanha e status.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    params: [
      { name: "donor_id", type: "integer", desc: "Filtrar por doador" },
      { name: "campaign_id", type: "string", desc: "Filtrar por campanha (UUID)" },
      { name: "status", type: "string", desc: "pago | pendente | cancelado" },
      { name: "from", type: "date", desc: "Data inicial (YYYY-MM-DD)" },
      { name: "to", type: "date", desc: "Data final (YYYY-MM-DD)" },
      { name: "page", type: "integer", desc: "Número da página (default: 1)" },
      { name: "limit", type: "integer", desc: "Itens por página (max: 100)" }
    ],
    example: `curl -X GET "${API_BASE_URL}/donations?donor_id=1&status=pago" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: {
      data: [
        { id: "uuid", donor_id: 1, amount: 150.00, donation_date: "2026-04-10", status: "pago", payment_method: "PIX", campaign_id: "uuid" }
      ],
      total: 45,
      page: 1,
      limit: 20
    }
  },
  {
    method: "GET",
    path: "/donations/:id",
    description: "Retorna os detalhes de uma doação específica pelo ID (UUID).",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    example: `curl -X GET "${API_BASE_URL}/donations/uuid-da-doacao" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: {
      id: "3f7a9c1e-...",
      donor_id: 1,
      donor: { name: "João Silva", email: "joao@exemplo.com" },
      amount: 150.00,
      donation_date: "2026-04-10",
      status: "pago",
      payment_method: "PIX",
      billing_type: "PIX",
      campaign_id: "uuid-da-campanha",
      confirmed_at: "2026-04-10T14:32:00Z"
    }
  },
  {
    method: "POST",
    path: "/donations",
    description: "Registra uma nova doação vinculada a um doador. O campo campaign_id é opcional.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" },
      { name: "Content-Type", value: "application/json" }
    ],
    body: {
      donor_id: 1,
      amount: 150.00,
      donation_date: "2026-04-17",
      campaign_id: "uuid-da-campanha",
      payment_method: "PIX",
      status: "pago"
    },
    example: `curl -X POST "${API_BASE_URL}/donations" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "donor_id": 1,
    "amount": 150.00,
    "donation_date": "2026-04-17",
    "payment_method": "PIX",
    "status": "pago"
  }'`
  }
];

const CAMPAIGNS_ENDPOINTS = [
  {
    method: "GET",
    path: "/campaigns",
    description: "Lista todas as campanhas cadastradas, com progresso de arrecadação em tempo real.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    params: [
      { name: "is_active", type: "boolean", desc: "Filtrar apenas campanhas ativas (true/false)" },
      { name: "page", type: "integer", desc: "Número da página (default: 1)" },
      { name: "limit", type: "integer", desc: "Itens por página (max: 100)" }
    ],
    example: `curl -X GET "${API_BASE_URL}/campaigns?is_active=true" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: {
      data: [
        {
          id: "uuid",
          name: "Natal Solidário 2026",
          description: "Arrecadação de presentes e alimentos",
          goal_amount: 50000.00,
          current_amount: 22400.00,
          start_date: "2026-12-01",
          end_date: "2026-12-25",
          is_active: true,
          progress_percent: 44.8
        }
      ],
      total: 12
    }
  },
  {
    method: "GET",
    path: "/campaigns/:id",
    description: "Retorna os detalhes de uma campanha específica incluindo lista de doações vinculadas.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    example: `curl -X GET "${API_BASE_URL}/campaigns/uuid-da-campanha" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: {
      id: "uuid",
      name: "Natal Solidário 2026",
      description: "Arrecadação de presentes e alimentos",
      goal_amount: 50000.00,
      current_amount: 22400.00,
      start_date: "2026-12-01",
      end_date: "2026-12-25",
      is_active: true,
      donations_count: 148,
      top_donors: [{ donor_id: 1, name: "João Silva", total: 500.00 }]
    }
  },
  {
    method: "POST",
    path: "/campaigns",
    description: "Cria uma nova campanha de arrecadação.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" },
      { name: "Content-Type", value: "application/json" }
    ],
    body: {
      name: "Natal Solidário 2026",
      description: "Arrecadação de presentes e alimentos para famílias carentes",
      goal_amount: 50000.00,
      start_date: "2026-12-01",
      end_date: "2026-12-25",
      is_active: true
    },
    example: `curl -X POST "${API_BASE_URL}/campaigns" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "name": "Natal Solidário 2026",
    "goal_amount": 50000.00,
    "start_date": "2026-12-01",
    "end_date": "2026-12-25",
    "is_active": true
  }'`
  },
  {
    method: "PUT",
    path: "/campaigns/:id",
    description: "Atualiza os dados de uma campanha existente. Envie apenas os campos que deseja alterar.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" },
      { name: "Content-Type", value: "application/json" }
    ],
    body: {
      goal_amount: 75000.00,
      end_date: "2026-12-31",
      is_active: true
    },
    example: `curl -X PUT "${API_BASE_URL}/campaigns/uuid-da-campanha" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{ "goal_amount": 75000.00, "end_date": "2026-12-31" }'`
  },
  {
    method: "DELETE",
    path: "/campaigns/:id",
    description: "Desativa ou remove uma campanha. Campanhas com doações vinculadas são apenas desativadas.",
    headers: [
      { name: "Authorization", value: "Bearer YOUR_API_KEY" }
    ],
    example: `curl -X DELETE "${API_BASE_URL}/campaigns/uuid-da-campanha" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  }
];

const methodColor: Record<string, string> = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-amber-500",
  DELETE: "bg-red-500"
};

const EndpointCard = ({ ep, copyToClipboard }: { ep: any; copyToClipboard: (t: string, l: string) => void }) => (
  <Card className="border-none shadow-soft hover:shadow-md transition-shadow overflow-hidden group">
    <div className="bg-muted/30 px-6 py-4 flex items-center justify-between border-b border-muted/50">
      <div className="flex items-center gap-3">
        <Badge className={`font-bold ${methodColor[ep.method] ?? "bg-gray-500"} text-white border-none`}>{ep.method}</Badge>
        <code className="text-sm font-bold text-foreground font-mono">{ep.path}</code>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(ep.example, "Exemplo cURL")}>
        <Copy className="w-3.5 h-3.5" />
      </Button>
    </div>
    <CardContent className="pt-6 space-y-6">
      <p className="text-sm text-muted-foreground">{ep.description}</p>
      <div className="space-y-4">
        {ep.headers && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" /> Headers
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {ep.headers.map((h: any) => (
                <div key={h.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-muted/20 text-xs">
                  <span className="font-mono font-bold text-foreground">{h.name}</span>
                  <span className="font-mono text-muted-foreground">{h.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {ep.params && ep.params.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Info className="w-3 h-3" /> Query Parameters
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {ep.params.map((p: any) => (
                <div key={p.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-muted/20 text-xs">
                  <span className="font-mono font-bold text-primary">{p.name} <span className="text-muted-foreground font-normal">({p.type})</span></span>
                  <span className="text-muted-foreground">{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {ep.body && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <FileJson className="w-3 h-3" /> Corpo da Requisição (JSON)
            </p>
            <pre className="p-4 rounded-xl bg-muted/50 border border-muted/50 text-foreground text-[11px] font-mono overflow-x-auto">
              {JSON.stringify(ep.body, null, 2)}
            </pre>
          </div>
        )}
        {ep.response && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Exemplo de Resposta (200 OK)
            </p>
            <pre className="p-4 rounded-xl bg-green-950/10 border border-green-200/30 text-green-900 dark:text-green-300 text-[11px] font-mono overflow-x-auto">
              {JSON.stringify(ep.response, null, 2)}
            </pre>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
            <Terminal className="w-3 h-3" /> Exemplo cURL
          </p>
          <div className="relative group/code">
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-50 text-[11px] font-mono overflow-x-auto leading-relaxed border border-white/5">
              {ep.example}
            </pre>
            <Button
              variant="ghost" size="icon"
              className="absolute top-2 right-2 h-7 w-7 bg-white/10 hover:bg-white/20 text-white opacity-0 group-hover/code:opacity-100 transition-opacity"
              onClick={() => copyToClipboard(ep.example, "Exemplo cURL")}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ApiAberta = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [apiKey] = useState("pk_live_51NwX...");
  const [showKey, setShowKey] = useState(false);

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({ title, description: "Copiado para a área de transferência." });
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
          <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/api-documentacao")}>
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
          {/* Autenticação */}
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
                  <Input type={showKey ? "text" : "password"} value={apiKey} readOnly className="font-mono text-xs bg-background h-10" />
                  <Button variant="secondary" size="icon" className="shrink-0 h-10 w-10" onClick={() => copyToClipboard(apiKey, "Chave de API")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Dica de Segurança</p>
                  <p className="opacity-80">Nunca compartilhe sua chave de API em ambientes públicos. Use variáveis de ambiente para gerenciar suas chaves.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints por categoria */}
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

            <Tabs defaultValue="doadores">
              <TabsList className="w-full">
                <TabsTrigger value="doadores" className="flex-1 gap-2">
                  <Users className="w-4 h-4" /> Doadores
                </TabsTrigger>
                <TabsTrigger value="doacoes" className="flex-1 gap-2">
                  <Heart className="w-4 h-4" /> Doações
                </TabsTrigger>
                <TabsTrigger value="campanhas" className="flex-1 gap-2">
                  <Megaphone className="w-4 h-4" /> Campanhas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="doadores">
                <ScrollArea className="h-[700px] pr-4 mt-4">
                  <div className="space-y-6">
                    {DONORS_ENDPOINTS.map((ep) => (
                      <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} copyToClipboard={copyToClipboard} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="doacoes">
                <ScrollArea className="h-[700px] pr-4 mt-4">
                  <div className="space-y-6">
                    {DONATIONS_ENDPOINTS.map((ep) => (
                      <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} copyToClipboard={copyToClipboard} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="campanhas">
                <ScrollArea className="h-[700px] pr-4 mt-4">
                  <div className="space-y-6">
                    {CAMPAIGNS_ENDPOINTS.map((ep) => (
                      <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} copyToClipboard={copyToClipboard} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
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
                  {[
                    { color: "bg-green-500", label: "donation.confirmed" },
                    { color: "bg-amber-500", label: "donation.pending" },
                    { color: "bg-red-500", label: "donation.cancelled" },
                    { color: "bg-blue-500", label: "donor.created" },
                    { color: "bg-purple-500", label: "campaign.goal_reached" },
                  ].map(e => (
                    <li key={e.label} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${e.color}`} />
                      {e.label}
                    </li>
                  ))}
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
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Timeout</span>
                <Badge variant="outline" className="font-mono">30s</Badge>
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
