import { Phone, PhoneCall, PhoneOff, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stats = [
  { label: "Ligações Hoje", value: "47", icon: Phone, color: "text-primary" },
  { label: "Atendidas", value: "32", icon: CheckCircle2, color: "text-green-600" },
  { label: "Não Atendidas", value: "15", icon: PhoneOff, color: "text-destructive" },
  { label: "Tempo Médio", value: "4:32", icon: Clock, color: "text-amber-600" },
];

const callQueue = [
  { id: 1, name: "Pedro Almeida", phone: "(11) 99111-2233", campaign: "Natal Solidário", priority: "Alta", lastContact: "Há 90 dias" },
  { id: 2, name: "Lucia Ferreira", phone: "(21) 98222-3344", campaign: "Educação para Todos", priority: "Média", lastContact: "Há 60 dias" },
  { id: 3, name: "Roberto Costa", phone: "(31) 97333-4455", campaign: "Alimentação Infantil", priority: "Alta", lastContact: "Há 120 dias" },
  { id: 4, name: "Fernanda Dias", phone: "(41) 96444-5566", campaign: "Natal Solidário", priority: "Baixa", lastContact: "Há 30 dias" },
  { id: 5, name: "Marcos Vieira", phone: "(51) 95555-6677", campaign: "Educação para Todos", priority: "Média", lastContact: "Há 75 dias" },
];

const priorityVariant = (p: string) => {
  switch (p) {
    case "Alta": return "destructive";
    case "Média": return "default";
    case "Baixa": return "secondary";
    default: return "outline";
  }
};

const Telemarketing = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Telemarketing</h1>
        <p className="text-muted-foreground text-sm">Gerencie ligações e follow-ups com doadores.</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fila de Ligações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callQueue.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.campaign}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(c.priority) as any}>{c.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.lastContact}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <PhoneCall className="w-4 h-4 mr-1" /> Ligar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Telemarketing;
