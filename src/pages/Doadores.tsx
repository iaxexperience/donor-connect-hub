import { Heart, Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockDonors = [
  { id: 1, name: "Maria Silva", email: "maria@email.com", phone: "(11) 99999-0001", type: "Recorrente", total: "R$ 4.500,00", lastDonation: "02/04/2026" },
  { id: 2, name: "João Santos", email: "joao@email.com", phone: "(21) 98888-0002", type: "Esporádico", total: "R$ 1.200,00", lastDonation: "15/03/2026" },
  { id: 3, name: "Ana Oliveira", email: "ana@email.com", phone: "(31) 97777-0003", type: "Único", total: "R$ 300,00", lastDonation: "10/01/2026" },
  { id: 4, name: "Carlos Souza", email: "carlos@email.com", phone: "(41) 96666-0004", type: "Recorrente", total: "R$ 8.900,00", lastDonation: "05/04/2026" },
  { id: 5, name: "Beatriz Lima", email: "beatriz@email.com", phone: "(51) 95555-0005", type: "Esporádico", total: "R$ 750,00", lastDonation: "28/02/2026" },
];

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case "Recorrente": return "default";
    case "Esporádico": return "secondary";
    case "Único": return "outline";
    default: return "outline";
  }
};

const Doadores = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Doadores</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua base de doadores e acompanhe contribuições.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Doador
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar doador..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Total Doado</TableHead>
              <TableHead>Última Doação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockDonors.map((donor) => (
              <TableRow key={donor.id}>
                <TableCell className="font-medium">{donor.name}</TableCell>
                <TableCell>{donor.email}</TableCell>
                <TableCell>{donor.phone}</TableCell>
                <TableCell>
                  <Badge variant={typeBadgeVariant(donor.type) as any}>{donor.type}</Badge>
                </TableCell>
                <TableCell>{donor.total}</TableCell>
                <TableCell>{donor.lastDonation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Doadores;
