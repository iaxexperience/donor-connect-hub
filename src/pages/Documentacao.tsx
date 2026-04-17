import { useState } from "react";
import {
  Book, Code, Shield, Zap, Lock, AlertTriangle, Terminal,
  Globe, ChevronRight, Database, Users, Heart, Megaphone,
  LayoutDashboard, GitMerge, Phone, MessageSquare, Wallet,
  FileText, Settings, ArrowLeft, CheckCircle2, Layers, Cpu,
  Building2, Webhook, Key, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://api.donorconnect.hub/v1";

const NAV = [
  { id: "visao-geral", label: "Visão Geral", icon: Book },
  { id: "modulos", label: "Módulos do Sistema", icon: Layers },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "doadores", label: "Doadores", icon: Users },
  { id: "doacoes", label: "Doações", icon: Heart },
  { id: "campanhas", label: "Campanhas", icon: Megaphone },
  { id: "kanban", label: "Kanban", icon: GitMerge },
  { id: "followups", label: "Follow-ups", icon: Phone },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "caixa", label: "Caixa", icon: Wallet },
  { id: "integracoes", label: "Integrações", icon: Building2 },
  { id: "api", label: "API Reference", icon: Code },
  { id: "autenticacao", label: "Autenticação", icon: Lock },
  { id: "endpoints-doadores", label: "Endpoints: Doadores", icon: Database },
  { id: "endpoints-doacoes", label: "Endpoints: Doações", icon: Zap },
  { id: "endpoints-campanhas", label: "Endpoints: Campanhas", icon: Globe },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "erros", label: "Erros & Limites", icon: AlertTriangle },
];

const CodeBlock = ({ code }: { code: string }) => (
  <pre className="p-4 rounded-xl bg-slate-950 text-slate-50 text-[11px] font-mono overflow-x-auto leading-relaxed border border-white/5 mt-2">
    {code}
  </pre>
);

const SectionTitle = ({ id, icon: Icon, title, sub }: { id: string; icon: any; title: string; sub?: string }) => (
  <div id={id} className="flex items-center gap-3 scroll-mt-24">
    <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const FieldRow = ({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) => (
  <div className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border border-muted/20 text-xs gap-4">
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-mono font-bold text-primary">{name}</span>
      <Badge variant="outline" className="text-[9px] px-1">{type}</Badge>
      {required && <Badge className="text-[9px] px-1 bg-red-100 text-red-700 border-none">obrigatório</Badge>}
    </div>
    <span className="text-muted-foreground text-right">{desc}</span>
  </div>
);

const methodColor: Record<string, string> = {
  GET: "bg-blue-500", POST: "bg-green-500", PUT: "bg-amber-500", DELETE: "bg-red-500"
};

const EndpointRow = ({ method, path, desc }: { method: string; path: string; desc: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg border border-muted/30 bg-muted/10 text-sm">
    <Badge className={`${methodColor[method]} text-white border-none font-bold text-[10px] w-14 justify-center shrink-0`}>{method}</Badge>
    <code className="font-mono text-xs font-bold text-foreground">{path}</code>
    <span className="text-muted-foreground text-xs ml-auto">{desc}</span>
  </div>
);

const Documentacao = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("visao-geral");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-muted bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" /> Início
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">Documentação</span>
              <Badge variant="secondary" className="text-[10px]">v1.2</Badge>
            </div>
          </div>
          <Button className="bg-primary shadow-glow h-9 text-sm" onClick={() => navigate("/login")}>
            Acessar Sistema
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 flex gap-8 py-8">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-2 mb-3">Navegação</p>
            {NAV.map(n => (
              <button
                key={n.id}
                onClick={() => scrollTo(n.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-left ${activeSection === n.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-muted-foreground"}`}
              >
                <n.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 space-y-16 max-w-3xl pb-32">

          {/* VISÃO GERAL */}
          <section className="space-y-6">
            <SectionTitle id="visao-geral" icon={Book} title="Visão Geral" sub="Pulse Doações — Plataforma de Gestão de Doações" />
            <p className="text-muted-foreground leading-relaxed">
              O <strong>Pulse Doações</strong> é um CRM completo para organizações sem fins lucrativos e fundações assistenciais.
              Centraliza a gestão de doadores, doações, campanhas, caixa, comunicação via WhatsApp e integrações bancárias em um único painel.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Doadores", value: "Gestão completa" },
                { label: "Campanhas", value: "Metas & progresso" },
                { label: "Integrações", value: "ASAAS + BB" },
                { label: "API", value: "RESTful v1" },
              ].map(i => (
                <Card key={i.label} className="border-none shadow-soft text-center p-4">
                  <p className="text-xs text-muted-foreground">{i.label}</p>
                  <p className="font-bold text-sm mt-1">{i.value}</p>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* MÓDULOS */}
          <section className="space-y-4">
            <SectionTitle id="modulos" icon={Layers} title="Módulos do Sistema" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: LayoutDashboard, name: "Dashboard", desc: "Visão executiva com KPIs, saldos em tempo real e gráficos" },
                { icon: Users, name: "Doadores", desc: "Cadastro, importação CSV, histórico e classificação" },
                { icon: Heart, name: "Doações", desc: "Registro manual, via API, ASAAS e Banco do Brasil" },
                { icon: Megaphone, name: "Campanhas", desc: "Criação, metas e acompanhamento de arrecadação" },
                { icon: GitMerge, name: "Kanban", desc: "Pipeline visual de conversão de leads" },
                { icon: Phone, name: "Follow-ups", desc: "Agendamento automático de contatos com doadores" },
                { icon: MessageSquare, name: "WhatsApp", desc: "Chat em tempo real e envio de templates Meta" },
                { icon: Wallet, name: "Caixa", desc: "Controle de caixa físico com emissão de recibos" },
                { icon: FileText, name: "Doações Físicas", desc: "Registro de doações não-financeiras (alimentos, roupas etc.)" },
                { icon: Building2, name: "Integrações", desc: "ASAAS, Banco do Brasil e API Aberta" },
                { icon: Settings, name: "Configurações", desc: "White label, usuários e gerenciamento de acesso" },
              ].map(m => (
                <div key={m.name} className="flex items-start gap-3 p-3 rounded-xl border border-muted/30 bg-muted/10">
                  <m.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* DASHBOARD */}
          <section className="space-y-4">
            <SectionTitle id="dashboard" icon={LayoutDashboard} title="Dashboard" />
            <p className="text-muted-foreground text-sm leading-relaxed">Página inicial após login. Exibe uma visão consolidada da operação:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Recebimentos do dia (soma de doações confirmadas)",
                "Contadores: Recorrentes, Únicos, Esporádicos, Follow-ups pendentes",
                "Saldo ASAAS em tempo real via API (atualiza a cada 30s)",
                "Entradas do Banco do Brasil — hoje e total acumulado",
                "Gráfico de recebimentos mensais (últimos 6 meses)",
                "Mix por campanha (participação percentual)",
                "Evolução de doações (linha do tempo)",
                "Pulso da Arrecadação — Health Score calculado por volume, recorrência e constância",
                "Top doadores e últimas doações registradas",
              ].map(i => (
                <li key={i} className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />{i}</li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* DOADORES */}
          <section className="space-y-4">
            <SectionTitle id="doadores" icon={Users} title="Doadores" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Central de gestão de todos os doadores da organização. Cada doador possui um perfil completo com histórico de doações, classificação automática e dados de endereço.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Tipos de classificação</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Lead", color: "bg-gray-100 text-gray-700" },
                  { label: "Único", color: "bg-blue-100 text-blue-700" },
                  { label: "Esporádico", color: "bg-amber-100 text-amber-700" },
                  { label: "Recorrente", color: "bg-green-100 text-green-700" },
                  { label: "Desativado", color: "bg-red-100 text-red-700" },
                ].map(t => <span key={t.label} className={`text-xs font-bold px-3 py-1 rounded-full ${t.color}`}>{t.label}</span>)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Funcionalidades</p>
              <div className="space-y-1.5">
                {[
                  "Cadastro manual com campos completos (nome, e-mail, telefone, CPF/CNPJ, endereço)",
                  "Importação em massa via CSV — suporta UTF-8 e Windows-1252 (Excel)",
                  "Busca e filtro por nome, e-mail e tipo",
                  "Registro de doação diretamente pelo perfil do doador",
                  "Histórico completo de doações com total acumulado",
                  "Visualização no Kanban de captação",
                ].map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Formato do CSV de importação</p>
              <CodeBlock code={`nome;email;telefone;cpf;tipo;nascimento;cep;endereco;numero;complemento;bairro;cidade;estado
João Silva;joao@email.com;83999999999;123.456.789-00;recorrente;1985-06-20;58000-000;Rua das Flores;100;;Centro;João Pessoa;PB`} />
            </div>
          </section>

          <Separator />

          {/* DOAÇÕES */}
          <section className="space-y-4">
            <SectionTitle id="doacoes" icon={Heart} title="Doações" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada doação é vinculada a um doador e opcionalmente a uma campanha. O sistema atualiza automaticamente as estatísticas do doador após cada registro.
            </p>
            <div className="space-y-1.5">
              {[
                { label: "Campos principais", value: "donor_id, amount, donation_date, campaign_id, payment_method, status" },
                { label: "Status possíveis", value: "pago, pendente, cancelado" },
                { label: "Métodos de pagamento", value: "PIX, Boleto, Cartão de Crédito, Débito, Manual" },
                { label: "Número do recibo", value: "Gerado automaticamente no formato DOA-YYYY-NNNNNN" },
              ].map(r => (
                <div key={r.label} className="flex items-start justify-between p-3 rounded-lg bg-muted/20 text-xs gap-4">
                  <span className="font-bold text-foreground shrink-0">{r.label}</span>
                  <span className="text-muted-foreground text-right font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* CAMPANHAS */}
          <section className="space-y-4">
            <SectionTitle id="campanhas" icon={Megaphone} title="Campanhas" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Campanhas permitem organizar e acompanhar metas de arrecadação por iniciativa. Doações podem ser vinculadas a uma campanha específica, e o progresso é calculado em tempo real.
            </p>
            <div className="space-y-1.5">
              <FieldRow name="name" type="string" required desc="Nome da campanha" />
              <FieldRow name="description" type="string" desc="Descrição da iniciativa" />
              <FieldRow name="goal_amount" type="number" required desc="Meta de arrecadação em R$" />
              <FieldRow name="start_date" type="date" required desc="Data de início (YYYY-MM-DD)" />
              <FieldRow name="end_date" type="date" required desc="Data de encerramento (YYYY-MM-DD)" />
              <FieldRow name="is_active" type="boolean" desc="Se a campanha está aceitando doações" />
            </div>
          </section>

          <Separator />

          {/* KANBAN */}
          <section className="space-y-4">
            <SectionTitle id="kanban" icon={GitMerge} title="Kanban" sub="Pipeline de captação" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Visualização em quadro Kanban do funil de conversão de leads em doadores ativos. Permite mover doadores entre colunas de status com drag-and-drop para acompanhar a evolução de cada contato.
            </p>
          </section>

          <Separator />

          {/* FOLLOW-UPS */}
          <section className="space-y-4">
            <SectionTitle id="followups" icon={Phone} title="Follow-ups" sub="Automação de contatos" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Agendamento e controle de follow-ups com doadores. O sistema executa automaticamente uma rotina via cron job para identificar doadores que precisam de contato.
            </p>
            <div className="space-y-1.5">
              {["pendente — aguardando ação", "agendado — data definida", "enviado — contato realizado"].map(s => (
                <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/20">
                  <div className="w-2 h-2 rounded-full bg-primary" />{s}
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* WHATSAPP */}
          <section className="space-y-4">
            <SectionTitle id="whatsapp" icon={MessageSquare} title="WhatsApp" sub="Integração Meta Business API" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Comunicação direta com doadores via WhatsApp Business. Suporta chat em tempo real, histórico de conversas e envio de templates aprovados pela Meta.
            </p>
            <div className="space-y-1.5">
              {["Envio de templates aprovados (agradecimento, follow-up, automação)", "Chat em tempo real com histórico por doador", "Proxy seguro via Edge Function para a Meta API"].map(f => (
                <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{f}
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* CAIXA */}
          <section className="space-y-4">
            <SectionTitle id="caixa" icon={Wallet} title="Caixa" sub="Controle de caixa físico" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Módulo de controle financeiro físico com registro de entradas e saídas, abertura e fechamento de caixa diário, e emissão de recibos com QR Code para validação pública.
            </p>
            <div className="p-3 rounded-xl bg-muted/20 text-xs text-muted-foreground space-y-1">
              <p><strong>Métodos aceitos:</strong> Dinheiro, PIX, Cartão de Crédito, Cartão de Débito, Boleto</p>
              <p><strong>Recibo:</strong> Número sequencial DOA-YYYY-NNNNNN com validação pública em <code className="font-mono">/validate-receipt/:hash</code></p>
            </div>
          </section>

          <Separator />

          {/* INTEGRAÇÕES */}
          <section className="space-y-6">
            <SectionTitle id="integracoes" icon={Building2} title="Integrações" />

            <div className="space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> ASAAS</h3>
              <p className="text-sm text-muted-foreground">Integração com a plataforma de cobranças ASAAS para criação de clientes, emissão de boletos e cobranças PIX, e recebimento de confirmações via webhook.</p>
              <div className="space-y-1.5">
                {["Criação automática de clientes no ASAAS ao cadastrar doador", "Geração de cobranças (PIX, boleto, cartão)", "Webhook para confirmação automática de pagamentos", "Sincronização de saldo em tempo real no Dashboard"].map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Banco do Brasil</h3>
              <p className="text-sm text-muted-foreground">Integração bancária via OAuth2 + mTLS para leitura do extrato e conciliação automática de transações com doações pendentes.</p>
              <div className="space-y-1.5">
                {["Autenticação segura OAuth2 com suporte a mTLS (produção)", "Sincronização automática do extrato bancário", "Conciliação de transações com doações pelo valor (tolerância R$ 0,01)", "Visualização de entradas do dia no Dashboard"].map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{f}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <Separator />

          {/* API REFERENCE */}
          <section className="space-y-4">
            <SectionTitle id="api" icon={Code} title="API Reference" sub={`Base URL: ${API_BASE}`} />
            <div className="p-4 rounded-xl bg-muted/30 border border-muted font-mono text-xs">
              <span className="text-muted-foreground">Base URL: </span>
              <span className="text-primary font-bold">{API_BASE}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[["Formato", "JSON (UTF-8)"], ["Protocolo", "HTTPS (TLS 1.3)"], ["Rate Limit", "10.000 req/hora"], ["Timeout", "30 segundos"]].map(([k, v]) => (
                <div key={k} className="flex justify-between p-3 rounded-lg bg-muted/20 border border-muted/20">
                  <span className="text-muted-foreground">{k}</span><span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AUTENTICAÇÃO */}
          <section className="space-y-4">
            <SectionTitle id="autenticacao" icon={Lock} title="Autenticação" />
            <p className="text-sm text-muted-foreground">Todas as requisições devem incluir o header <code className="font-mono bg-muted px-1 rounded">Authorization: Bearer YOUR_API_KEY</code>.</p>
            <CodeBlock code={`GET /v1/donors HTTP/1.1
Host: api.donorconnect.hub
Authorization: Bearer YOUR_API_KEY
Accept: application/json`} />
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-blue-800">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p>Nunca exponha sua chave de API no front-end. Use sempre um servidor intermediário ou variáveis de ambiente seguras.</p>
            </div>
          </section>

          {/* ENDPOINTS DOADORES */}
          <section className="space-y-4">
            <SectionTitle id="endpoints-doadores" icon={Database} title="Endpoints: Doadores" />
            <div className="space-y-2">
              <EndpointRow method="GET" path="/donors" desc="Lista doadores com paginação e filtros" />
              <EndpointRow method="GET" path="/donors/:id" desc="Detalhes de um doador específico" />
              <EndpointRow method="POST" path="/donors" desc="Cadastra novo doador" />
              <EndpointRow method="PUT" path="/donors/:id" desc="Atualiza dados do doador" />
              <EndpointRow method="DELETE" path="/donors/:id" desc="Remove o doador" />
            </div>
            <CodeBlock code={`# Criar doador
curl -X POST "${API_BASE}/donors" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "83999999999",
    "document_id": "123.456.789-00",
    "type": "lead"
  }'`} />
          </section>

          {/* ENDPOINTS DOAÇÕES */}
          <section className="space-y-4">
            <SectionTitle id="endpoints-doacoes" icon={Zap} title="Endpoints: Doações" />
            <div className="space-y-2">
              <EndpointRow method="GET" path="/donations" desc="Lista doações com filtros por doador, campanha e status" />
              <EndpointRow method="GET" path="/donations/:id" desc="Detalhes de uma doação específica" />
              <EndpointRow method="POST" path="/donations" desc="Registra nova doação" />
            </div>
            <CodeBlock code={`# Registrar doação
curl -X POST "${API_BASE}/donations" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "donor_id": 1,
    "amount": 150.00,
    "donation_date": "2026-04-17",
    "payment_method": "PIX",
    "status": "pago",
    "campaign_id": "uuid-da-campanha"
  }'`} />
          </section>

          {/* ENDPOINTS CAMPANHAS */}
          <section className="space-y-4">
            <SectionTitle id="endpoints-campanhas" icon={Globe} title="Endpoints: Campanhas" />
            <div className="space-y-2">
              <EndpointRow method="GET" path="/campaigns" desc="Lista campanhas (filtro por is_active)" />
              <EndpointRow method="GET" path="/campaigns/:id" desc="Detalhes e doações vinculadas" />
              <EndpointRow method="POST" path="/campaigns" desc="Cria nova campanha" />
              <EndpointRow method="PUT" path="/campaigns/:id" desc="Atualiza campanha" />
              <EndpointRow method="DELETE" path="/campaigns/:id" desc="Desativa ou remove campanha" />
            </div>
            <CodeBlock code={`# Criar campanha
curl -X POST "${API_BASE}/campaigns" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Natal Solidário 2026",
    "goal_amount": 50000.00,
    "start_date": "2026-12-01",
    "end_date": "2026-12-25",
    "is_active": true
  }'`} />
          </section>

          {/* WEBHOOKS */}
          <section className="space-y-4">
            <SectionTitle id="webhooks" icon={Webhook} title="Webhooks & Eventos" />
            <p className="text-sm text-muted-foreground">Configure uma URL para receber notificações em tempo real sobre eventos do sistema.</p>
            <div className="space-y-2">
              {[
                { event: "donation.confirmed", color: "bg-green-500", desc: "Doação confirmada/paga" },
                { event: "donation.pending", color: "bg-amber-500", desc: "Doação aguardando pagamento" },
                { event: "donation.cancelled", color: "bg-red-500", desc: "Doação cancelada" },
                { event: "donor.created", color: "bg-blue-500", desc: "Novo doador cadastrado" },
                { event: "campaign.goal_reached", color: "bg-purple-500", desc: "Campanha atingiu a meta" },
              ].map(e => (
                <div key={e.event} className="flex items-center gap-3 p-3 rounded-lg border border-muted/30 bg-muted/10 text-xs">
                  <div className={`w-2 h-2 rounded-full ${e.color} shrink-0`} />
                  <code className="font-mono font-bold text-foreground">{e.event}</code>
                  <span className="text-muted-foreground ml-auto">{e.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ERROS */}
          <section className="space-y-4">
            <SectionTitle id="erros" icon={AlertTriangle} title="Erros & Limites" />
            <div className="overflow-hidden rounded-xl border border-muted">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold w-28">Código</th>
                    <th className="px-4 py-3 text-left font-bold">Significado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted text-xs">
                  {[
                    ["200 / 201", "text-green-600", "Sucesso. Recurso carregado ou criado."],
                    ["400", "text-blue-600", "Bad Request. Payload malformado ou campos inválidos."],
                    ["401 / 403", "text-amber-600", "Não autorizado. Verifique sua chave de API."],
                    ["404", "text-orange-600", "Recurso não encontrado."],
                    ["409", "text-purple-600", "Conflito. E-mail ou CPF/CNPJ já cadastrado."],
                    ["429", "text-red-600", "Too Many Requests. Limite de 10.000 req/hora excedido."],
                    ["5xx", "text-red-800", "Erro interno. Implemente backoff exponencial nas retentativas."],
                  ].map(([code, color, msg]) => (
                    <tr key={code}>
                      <td className={`px-4 py-3 font-mono font-bold ${color}`}>{code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Card className="bg-primary/5 border-none p-8 text-center space-y-4 rounded-3xl">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Pronto para começar?</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Acesse o sistema e comece a gerenciar suas doações agora mesmo.</p>
            <div className="flex justify-center gap-3 pt-2">
              <Button className="bg-primary shadow-glow" onClick={() => navigate("/login")}>Acessar Sistema</Button>
              <Button variant="outline" onClick={() => navigate("/dashboard/api-aberta")}>Console da API</Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Documentacao;
