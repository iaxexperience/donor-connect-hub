import { useState, useEffect } from "react";
import { Heart, Search, Plus, Filter, MessageSquare } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDonors } from "@/hooks/useDonors";
import { typeLabel } from "@/lib/donationService";

// INITIAL_DONORS moved to hook
const typeBadgeStyle = (type: string) => {
  switch (type) {
    case "recorrente": return "bg-green-100 text-green-700 border-green-200";
    case "esporadico": return "bg-orange-100 text-orange-700 border-orange-200";
    case "unico": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700";
  }
};

const Doadores = () => {
  const { donors, addDonation } = useDonors();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState<string>("");
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [campaign, setCampaign] = useState("Natal Solidário");
  const { toast } = useToast();

  const handleRegisterDonation = () => {
    if (!selectedDonorId || !donationAmount) {
      toast({ title: "Erro", description: "Selecione um doador e informe o valor.", variant: "destructive" });
      return;
    }

    addDonation(parseInt(selectedDonorId), parseFloat(donationAmount), campaign);

    toast({
      title: "Doação Registrada!",
      description: `O registro foi atualizado e um follow-up foi agendado.`,
    });

    setIsDialogOpen(false);
    setDonationAmount("");
  };

  const filteredDonors = donors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         d.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || d.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Doadores</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua base de doadores e acompanhe contribuições.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <Heart className="w-4 h-4 mr-2" />
                Registrar Doação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Doação</DialogTitle>
                <DialogDescription>
                  O sistema atualizará automaticamente a classificação e agendará o follow-up.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Doador</Label>
                  <Select onValueChange={setSelectedDonorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um doador" />
                    </SelectTrigger>
                    <SelectContent>
                      {donors.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={donationAmount} 
                      onChange={(e) => setDonationAmount(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Campanha</Label>
                    <Select defaultValue={campaign} onValueChange={setCampaign}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Natal Solidário">Natal Solidário</SelectItem>
                        <SelectItem value="Educação para Todos">Educação para Todos</SelectItem>
                        <SelectItem value="Reconstrução Sul">Reconstrução Sul</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegisterDonation}>Confirmar Doação</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Doador
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar doador..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Classificações</SelectItem>
            <SelectItem value="recorrente">Recorrente</SelectItem>
            <SelectItem value="esporadico">Esporádico</SelectItem>
            <SelectItem value="unico">Único</SelectItem>
          </SelectContent>
        </Select>
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
            {filteredDonors.map((donor) => (
              <TableRow key={donor.id}>
                <TableCell className="font-medium">{donor.name}</TableCell>
                <TableCell>{donor.email}</TableCell>
                <TableCell>{donor.phone}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={typeBadgeStyle(donor.type)}>
                    {typeLabel(donor.type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(donor.totalDonated)}
                </TableCell>
                <TableCell>{new Date(donor.lastDonationDate).toLocaleDateString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Doadores;
