import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Search, Plus, Filter, MessageSquare, Upload, FileDown, CheckCircle2, GitMerge, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { useDonors } from "@/hooks/useDonors";
import { useCampaigns } from "@/hooks/useCampaigns";
import { typeLabel, typeBadgeStyle } from "@/lib/donationService";

// INITIAL_DONORS moved to hook
const Doadores = () => {
  const navigate = useNavigate();
  const { donors, addDonation, isLoading: donorsLoading } = useDonors();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState<string>("");
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const { toast } = useToast();

  const handleRegisterDonation = () => {
    if (!selectedDonorId || !donationAmount) {
      toast({ title: "Erro", description: "Selecione um doador e informe o valor.", variant: "destructive" });
      return;
    }

    addDonation(parseInt(selectedDonorId), parseFloat(donationAmount), selectedCampaignId || undefined, paymentMethod);

    toast({
      title: "Doação Registrada!",
      description: `O registro está sendo processado e o dashboard será atualizado.`,
    });

    setIsDialogOpen(false);
    setDonationAmount("");
    setSelectedCampaignId("");
  };

  const filteredDonors = donors.filter(d => {
    const donorName = d.name || "";
    const donorEmail = d.email || "";
    const matchesSearch = donorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         donorEmail.toLowerCase().includes(searchTerm.toLowerCase());
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
                    <Select onValueChange={setSelectedCampaignId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma campanha" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                        <SelectItem value="Manual">Manual (Outros)</SelectItem>
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
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Doadores</DialogTitle>
                <DialogDescription>
                  Selecione um arquivo CSV ou Excel para importar sua base de doadores.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="border-2 border-dashed border-muted rounded-2xl p-10 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Arraste seu arquivo aqui</p>
                    <p className="text-xs text-muted-foreground mt-1">Formatos suportados: .csv, .xlsx</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <FileDown className="w-3 h-3" />
                    Exemplo de Modelo
                  </p>
                  <Button variant="ghost" className="w-full h-10 border border-muted text-xs justify-between">
                    <span>modelo_importacao_doadores.csv</span>
                    <Badge variant="secondary">Baixar</Badge>
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => {
                  toast({
                    title: "Importação Iniciada",
                    description: "Seus doadores estão sendo processados em segundo plano.",
                  });
                }}>Iniciar Importação</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            className="border-primary/50 text-primary hover:bg-primary/5" 
            onClick={() => navigate("/dashboard/kanbam")}
          >
            <GitMerge className="w-4 h-4 mr-2" />
            Ver no Kanbam
          </Button>
          <Button className="bg-primary shadow-glow" onClick={() => navigate("/dashboard/doadores/novo")}>
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
            <SelectItem value="lead">Leads</SelectItem>
            <SelectItem value="recorrente">Recorrente</SelectItem>
            <SelectItem value="esporadico">Esporádico</SelectItem>
            <SelectItem value="unico">Único</SelectItem>
            <SelectItem value="desativado">Desativado</SelectItem>
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
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donorsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-xs">Carregando doadores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredDonors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum doador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredDonors.map((donor) => (
                <TableRow key={donor.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{donor.name}</TableCell>
                  <TableCell>{donor.email}</TableCell>
                  <TableCell>{donor.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeBadgeStyle(donor.type)}>
                      {typeLabel[donor.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(donor.total_donated)}
                  </TableCell>
                  <TableCell>{donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString("pt-BR") : "Nunca"}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => navigate(`/dashboard/doadores/editar/${donor.id}`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Doadores;
