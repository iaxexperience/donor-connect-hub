import { useState } from "react";
import {
  CalendarClock,
  UserCheck,
  UserMinus,
  Users,
  Phone,
  MessageSquare,
  Mail,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type DonorType = "unico" | "esporadico" | "recorrente";
type FollowUpStatus = "pendente" | "agendado" | "concluido" | "atrasado";
type FollowUpChannel = "telefone" | "whatsapp" | "email";

interface FollowUp {
  id: number;
  donorName: string;
  donorType: DonorType;
  phone: string;
  email: string;
  lastDonation: string;
  lastContact: string;
  dueDate: string;
  status: FollowUpStatus;
  channel: FollowUpChannel;
  campaign: string;
  totalDonations: number;
  notes: string;
}

const classificationRules = [
  {
    type: "Único" as const,
    rule: "1 doação registrada",
    followUpDays: 90,
    color: "text-amber-600",
    bg: "bg-amber-100",
    icon: UserMinus,
  },
  {
    type: "Esporádico" as const,
    rule: "2+ doações em 6 meses",
    followUpDays: 60,
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: Users,
  },
  {
    type: "Recorrente" as const,
    rule: "3+ doações em 3 meses",
    followUpDays: 30,
    color: "text-green-600",
    bg: "bg-green-100",
    icon: UserCheck,
  },
];

const followUps: FollowUp[] = [
  { id: 1, donorName: "Maria Silva", donorType: "recorrente", phone: "(11) 99888-1234", email: "maria@email.com", lastDonation: "2026-03-25", lastContact: "2026-03-28", dueDate: "2026-04-10", status: "pendente", channel: "whatsapp", campaign: "Natal Solidário", totalDonations: 12, notes: "Doadora fiel, prefere WhatsApp" },
  { id: 2, donorName: "João Santos", donorType: "unico", phone: "(21) 98777-5678", email: "joao@email.com", lastDonation: "2026-01-15", lastContact: "2026-01-20", dueDate: "2026-04-15", status: "agendado", channel: "telefone", campaign: "Educação para Todos", totalDonations: 1, notes: "Primeira doação, abordar com cuidado" },
  { id: 3, donorName: "Ana Oliveira", donorType: "esporadico", phone: "(31) 97666-9012", email: "ana@email.com", lastDonation: "2026-02-10", lastContact: "2026-02-15", dueDate: "2026-04-05", status: "atrasado", channel: "email", campaign: "Alimentação Infantil", totalDonations: 3, notes: "Preferência por e-mail" },
  { id: 4, donorName: "Carlos Mendes", donorType: "recorrente", phone: "(41) 96555-3456", email: "carlos@email.com", lastDonation: "2026-03-30", lastContact: "2026-04-01", dueDate: "2026-04-12", status: "pendente", channel: "telefone", campaign: "Natal Solidário", totalDonations: 8, notes: "Disponível após 18h" },
  { id: 5, donorName: "Patrícia Lima", donorType: "unico", phone: "(51) 95444-7890", email: "patricia@email.com", lastDonation: "2025-12-20", lastContact: "2025-12-22", dueDate: "2026-03-20", status: "atrasado", channel: "whatsapp", campaign: "Educação para Todos", totalDonations: 1, notes: "Sem resposta anterior" },
  { id: 6, donorName: "Roberto Alves", donorType: "esporadico", phone: "(61) 94333-2345", email: "roberto@email.com", lastDonation: "2026-03-01", lastContact: "2026-03-05", dueDate: "2026-04-08", status: "concluido", channel: "telefone", campaign: "Alimentação Infantil", totalDonations: 4, notes: "Confirmou interesse em recorrência" },
  { id: 7, donorName: "Fernanda Costa", donorType: "recorrente", phone: "(71) 93222-6789", email: "fernanda@email.com", lastDonation: "2026-04-01", lastContact: "2026-04-03", dueDate: "2026-04-15", status: "agendado", channel: "whatsapp", campaign: "Natal Solidário", totalDonations: 15, notes: "Top doadora, tratamento VIP" },
];

const stats = [
  { label: "Pendentes", value: followUps.filter(f => f.status === "pendente").length, icon: Clock, color: "text-amber-600" },
  { label: "Agendados", value: followUps.filter(f => f.status === "agendado").length, icon: CalendarClock, color: "text-primary" },
  { label: "Atrasados", value: followUps.filter(f => f.status === "atrasado").length, icon: AlertTriangle, color: "text-destructive" },
  { label: "Concluídos", value: followUps.filter(f => f.status === "concluido").length, icon: CheckCircle2, color: "text-green-600" },
];

const donorTypeLabel: Record<DonorType, string> = {
  unico: "Único",
  esporadico: "Esporádico",
  recorrente: "Recorrente",
};

const donorTypeBadge: Record<DonorType, string> = {
  unico: "outline",
  esporadico: "default",
  recorrente: "secondary",
};

const statusLabel: Record<FollowUpStatus, string> = {
  pendente: "Pendente",
  agendado: "Agendado",
  concluido: "Concluído",
  atrasado: "Atrasado",
};

const statusColor: Record<FollowUpStatus, string> = {
  pendente: "bg-amber-100 text-amber-800",
  agendado: "bg-blue-100 text-blue-800",
  concluido: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-800",
};

const channelIcon: Record<FollowUpChannel, typeof Phone> = {
  telefone: Phone,
  whatsapp: MessageSquare,
  email: Mail,
};

const FollowUps = () => {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = followUps.filter((f) => {
    if (filterType !== "all" && f.donorType !== filterType) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  const completionRate = Math.round(
    (followUps.filter(f => f.status === "concluido").length / followUps.length) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Follow-ups</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie o acompanhamento dos doadores com base na classificação automática.
          </p>
        </div>
        <Button className="bg-primary">
          <CalendarClock className="w-4 h-4 mr-2" /> Agendar Follow-up
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Taxa de conclusão */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Taxa de Conclusão de Follow-ups</span>
            <span className="text-sm font-bold text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Follow-ups</TabsTrigger>
          <TabsTrigger value="regras">Regras de Classificação</TabsTrigger>
        </TabsList>

        {/* Tab Lista */}
        <TabsContent value="lista" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Fila de Follow-ups</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Tipo de doador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="unico">Único</SelectItem>
                      <SelectItem value="esporadico">Esporádico</SelectItem>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doador</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => {
                    const ChannelIcon = channelIcon[f.channel];
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{f.donorName}</p>
                            <p className="text-xs text-muted-foreground">{f.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={donorTypeBadge[f.donorType] as any}>
                            {donorTypeLabel[f.donorType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ChannelIcon className="w-4 h-4" />
                            <span className="text-xs capitalize">{f.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{f.campaign}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(f.dueDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor[f.status]}`}>
                            {statusLabel[f.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedFollowUp(f); setDialogOpen(true); }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum follow-up encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Regras */}
        <TabsContent value="regras" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {classificationRules.map((rule) => (
              <Card key={rule.type}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${rule.bg}`}>
                      <rule.icon className={`w-6 h-6 ${rule.color}`} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">Doador {rule.type}</h3>
                      <p className="text-xs text-muted-foreground">{rule.rule}</p>
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Follow-up automático</span>
                      <span className="font-medium text-foreground">{rule.followUpDays} dias</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prioridade</span>
                      <Badge variant={rule.followUpDays <= 30 ? "destructive" : rule.followUpDays <= 60 ? "default" : "secondary"}>
                        {rule.followUpDays <= 30 ? "Alta" : rule.followUpDays <= 60 ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funciona a classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>O sistema classifica automaticamente os doadores com base no histórico de doações e agenda follow-ups de acordo com as regras configuradas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Doador Único:</strong> Realizou apenas 1 doação. Follow-up em 90 dias para incentivar nova contribuição.</li>
                <li><strong className="text-foreground">Doador Esporádico:</strong> 2 ou mais doações nos últimos 6 meses. Follow-up em 60 dias para manter engajamento.</li>
                <li><strong className="text-foreground">Doador Recorrente:</strong> 3 ou mais doações nos últimos 3 meses. Follow-up em 30 dias para fidelização e upgrade.</li>
              </ul>
              <p>Os follow-ups podem ser realizados via <strong className="text-foreground">telefone</strong>, <strong className="text-foreground">WhatsApp</strong> ou <strong className="text-foreground">e-mail</strong>, de acordo com a preferência do doador.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedFollowUp && (
            <>
              <DialogHeader>
                <DialogTitle>Follow-up — {selectedFollowUp.donorName}</DialogTitle>
                <DialogDescription>
                  Doador {donorTypeLabel[selectedFollowUp.donorType]} · {selectedFollowUp.totalDonations} doações realizadas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedFollowUp.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{selectedFollowUp.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Última doação</Label>
                    <p className="font-medium">{new Date(selectedFollowUp.lastDonation).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Último contato</Label>
                    <p className="font-medium">{new Date(selectedFollowUp.lastContact).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Campanha</Label>
                    <p className="font-medium">{selectedFollowUp.campaign}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Canal preferido</Label>
                    <p className="font-medium capitalize">{selectedFollowUp.channel}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1">{selectedFollowUp.notes}</p>
                </div>
                <div>
                  <Label>Registrar contato</Label>
                  <Textarea placeholder="Descreva o resultado do contato..." className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Novo status</Label>
                    <Select defaultValue={selectedFollowUp.status}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Próximo contato</Label>
                    <Input type="date" className="mt-1" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => setDialogOpen(false)}>Salvar Registro</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FollowUps;
