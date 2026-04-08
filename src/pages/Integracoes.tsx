import { useState } from "react";
import { MessageSquare, CheckCircle2, AlertCircle, ExternalLink, Send, Users, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const templateExamples = [
  {
    name: "boas_vindas_doador",
    category: "MARKETING",
    status: "Aprovado",
    body: "Olá {{1}}! 🎉 Obrigado por sua doação de {{2}} para a campanha {{3}}. Sua generosidade faz a diferença!",
  },
  {
    name: "follow_up_doacao",
    category: "MARKETING",
    status: "Aprovado",
    body: "Olá {{1}}, sentimos sua falta! Há {{2}} dias sua última contribuição impactou vidas. Que tal continuar fazendo a diferença?",
  },
  {
    name: "lembrete_campanha",
    category: "UTILITY",
    status: "Pendente",
    body: "Olá {{1}}, a campanha {{2}} está a {{3}} do encerramento. Faltam apenas {{4}} para atingir a meta!",
  },
];

const Integracoes = () => {
  const [connected, setConnected] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [testNumber, setTestNumber] = useState("");
  const [optInEnabled, setOptInEnabled] = useState(true);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!phoneNumberId || !businessAccountId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Phone Number ID e o Business Account ID.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "⚠️ Backend necessário",
      description: "Para conectar à API do WhatsApp, habilite o Lovable Cloud para armazenar o token de acesso com segurança.",
    });
  };

  const handleTestMessage = () => {
    if (!testNumber) {
      toast({
        title: "Número obrigatório",
        description: "Informe um número de WhatsApp para enviar a mensagem de teste.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "⚠️ Backend necessário",
      description: "Para enviar mensagens via WhatsApp, habilite o Lovable Cloud e configure o token de acesso da Meta.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Integrações</h1>
          <p className="text-muted-foreground text-sm">Conecte o DoacFlow ao WhatsApp Business via API oficial da Meta.</p>
        </div>
        <Badge variant={connected ? "default" : "outline"} className="gap-1.5">
          {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {connected ? "Conectado" : "Desconectado"}
        </Badge>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="envio">Envio de Teste</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* --- Configuração --- */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <CardTitle className="text-base">WhatsApp Business API</CardTitle>
              </div>
              <CardDescription>
                Conecte sua conta do WhatsApp Business para enviar mensagens automáticas e follow-ups aos doadores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-medium mb-1">Pré-requisitos:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Conta no <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Meta Business Suite <ExternalLink className="w-3 h-3" /></a></li>
                  <li>App criado no <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Produto "WhatsApp" adicionado ao app</li>
                  <li>Token de acesso permanente gerado</li>
                </ul>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Encontrado em WhatsApp → API Setup no painel da Meta.</p>
                </div>
                <div className="space-y-2">
                  <Label>Business Account ID</Label>
                  <Input
                    placeholder="Ex: 987654321098765"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">ID da conta comercial do WhatsApp Business.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Webhook Verify Token</Label>
                <Input
                  readOnly
                  value="doacflow_webhook_verify_2026"
                  className="font-mono text-sm bg-muted"
                />
                <p className="text-xs text-muted-foreground">Use este token ao configurar o webhook no painel da Meta.</p>
              </div>

              <Button onClick={handleConnect} className="w-full sm:w-auto">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Templates --- */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Templates de Mensagem</CardTitle>
              </div>
              <CardDescription>
                Templates pré-aprovados pela Meta para comunicação proativa com doadores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateExamples.map((tpl) => (
                <div key={tpl.name} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{tpl.name}</span>
                      <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                    </div>
                    <Badge variant={tpl.status === "Aprovado" ? "default" : "secondary"}>
                      {tpl.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted rounded p-3 font-mono">
                    {tpl.body}
                  </p>
                </div>
              ))}

              <div className="text-xs text-muted-foreground">
                Os templates devem ser criados e aprovados no{" "}
                <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                  Gerenciador de Templates da Meta <ExternalLink className="w-3 h-3" />
                </a>.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Envio de Teste --- */}
        <TabsContent value="envio" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Envio de Teste</CardTitle>
              </div>
              <CardDescription>Envie uma mensagem de teste para verificar a configuração.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input
                  placeholder="5511999990000"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Formato internacional sem + (ex: 5511999990000).</p>
              </div>

              <div className="space-y-2">
                <Label>Mensagem (template hello_world)</Label>
                <Textarea
                  readOnly
                  value="Olá! Esta é uma mensagem de teste do DoacFlow via WhatsApp Business API. 🎉"
                  className="bg-muted resize-none"
                  rows={3}
                />
              </div>

              <Button onClick={handleTestMessage} variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Enviar Mensagem de Teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Compliance --- */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Compliance & Opt-in</CardTitle>
              </div>
              <CardDescription>
                Configurações de conformidade com as políticas da Meta e LGPD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Opt-in obrigatório</p>
                  <p className="text-xs text-muted-foreground">
                    Exigir consentimento explícito do doador antes de enviar mensagens via WhatsApp.
                  </p>
                </div>
                <Switch checked={optInEnabled} onCheckedChange={setOptInEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Registrar opt-in no CRM</p>
                  <p className="text-xs text-muted-foreground">
                    Salvar data e hora do consentimento no perfil do doador.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Janela de 24 horas</p>
                  <p className="text-xs text-muted-foreground">
                    Respeitar a janela de conversa de 24h — fora dela, apenas templates aprovados.
                  </p>
                </div>
                <Switch defaultChecked disabled />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-medium mb-1">📋 Política da Meta</p>
                <p className="text-xs">
                  Mensagens proativas (fora da janela de 24h) só podem ser enviadas usando templates
                  pré-aprovados. O doador deve ter dado opt-in explícito para receber comunicações.{" "}
                  <a href="https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/" target="_blank" rel="noopener noreferrer" className="underline">
                    Saiba mais
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Integracoes;
