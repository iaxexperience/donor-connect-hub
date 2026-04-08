import { Bell, Globe, Lock, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Configuracoes = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie as preferências e configurações do sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Informações da Organização</CardTitle>
          </div>
          <CardDescription>Dados básicos exibidos no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da Organização</Label>
              <Input defaultValue="ONG Exemplo" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input defaultValue="12.345.678/0001-99" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail de Contato</Label>
            <Input defaultValue="contato@ongexemplo.org.br" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Notificações</CardTitle>
          </div>
          <CardDescription>Configure alertas e avisos do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notificações por e-mail</p>
              <p className="text-xs text-muted-foreground">Receba alertas sobre novas doações e campanhas.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertas de follow-up</p>
              <p className="text-xs text-muted-foreground">Lembrete quando um doador precisa de acompanhamento.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Resumo semanal</p>
              <p className="text-xs text-muted-foreground">Relatório semanal com métricas de desempenho.</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Segurança</CardTitle>
          </div>
          <CardDescription>Configurações de segurança da conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Autenticação em dois fatores</p>
              <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança.</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sessão automática</p>
              <p className="text-xs text-muted-foreground">Desconectar após 30 minutos de inatividade.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default Configuracoes;
