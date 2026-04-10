import { Plus, Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockUsers = [
  { id: 1, name: "Admin Sistema", email: "admin@pulsedoacoes.com", role: "Administrador", status: "Ativo", lastAccess: "08/04/2026" },
  { id: 2, name: "Carla Mendes", email: "carla@pulsedoacoes.com", role: "Gestor de Campanha", status: "Ativo", lastAccess: "07/04/2026" },
  { id: 3, name: "Rafael Torres", email: "rafael@pulsedoacoes.com", role: "Operador de Telemarketing", status: "Ativo", lastAccess: "08/04/2026" },
  { id: 4, name: "Juliana Reis", email: "juliana@pulsedoacoes.com", role: "Visualizador", status: "Ativo", lastAccess: "05/04/2026" },
  { id: 5, name: "Bruno Martins", email: "bruno@pulsedoacoes.com", role: "Operador de Telemarketing", status: "Inativo", lastAccess: "12/03/2026" },
];

const roleColor = (role: string) => {
  switch (role) {
    case "Administrador": return "destructive";
    case "Gestor de Campanha": return "default";
    case "Operador de Telemarketing": return "secondary";
    case "Visualizador": return "outline";
    default: return "outline";
  }
};

const Usuarios = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie os usuários e permissões do sistema.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar usuário..." className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Acesso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-muted">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleColor(user.role) as any}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "Ativo" ? "default" : "outline"}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.lastAccess}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Usuarios;
