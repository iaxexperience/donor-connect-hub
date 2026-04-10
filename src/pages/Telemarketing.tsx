import { Phone, PhoneCall, PhoneOff, Clock, CheckCircle2, Loader2 } from "lucide-react";
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
import { useTelemarketing } from "@/hooks/useTelemarketing";
import { typeLabel, typeBadgeStyle } from "@/lib/donationService";

const priorityVariant = (p: string) => {
  switch (p) {
    case "Alta": return "destructive";
    case "Média": return "default";
    case "Baixa": return "secondary";
    default: return "outline";
  }
};

const Telemarketing = () => {
  const { queue, stats: dynamicStats, isLoading } = useTelemarketing();

  const stats = [
    { label: "Fila de Ligações", value: dynamicStats.totalQueue, icon: Phone, color: "text-primary" },
    { label: "Leads Novos", value: dynamicStats.leadsCount, icon: CheckCircle2, color: "text-green-600" },
    { label: "Inativos (30d+)", value: dynamicStats.inactiveCount, icon: PhoneOff, color: "text-destructive" },
    { label: "Tempo Médio", value: dynamicStats.averageTime, icon: Clock, color: "text-amber-600" },
  ];

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
                <TableHead>Doador</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Total Doado</TableHead>
                <TableHead>Última Doação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando fila...
                  </TableCell>
                </TableRow>
              ) : queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma ligação pendente no momento.
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((donor) => (
                  <TableRow key={donor.id}>
                    <TableCell className="font-medium">{donor.name}</TableCell>
                    <TableCell>{donor.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeBadgeStyle(donor.type)}>
                        {typeLabel[donor.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(donor.total_donated)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {donor.last_donation_date 
                        ? new Date(donor.last_donation_date).toLocaleDateString("pt-BR") 
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="hover:bg-primary hover:text-white transition-colors">
                        <PhoneCall className="w-4 h-4 mr-1" /> Ligar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Telemarketing;

export default Telemarketing;
