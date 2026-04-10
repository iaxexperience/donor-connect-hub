import { useState, useEffect } from "react";
import { Plus, Search, Target, Calendar, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const INITIAL_CAMPAIGNS = [
  { id: 1, name: "Natal Solidário 2026", goal: 50000, raised: 32500, donors: 124, status: "Ativa", endDate: "2026-12-25", description: "Campanha anual de arrecadação de brinquedos e alimentos." },
  { id: 2, name: "Educação para Todos", goal: 30000, raised: 28700, donors: 89, status: "Ativa", endDate: "2026-06-30", description: "Fundo para bolsas de estudo e material escolar." },
  { id: 3, name: "Saúde Comunitária", goal: 20000, raised: 20000, donors: 67, status: "Concluída", endDate: "2026-03-01", description: "Mutirão de exames e atendimento básico." },
  { id: 4, name: "Alimentação Infantil", goal: 15000, raised: 4200, donors: 31, status: "Ativa", endDate: "2026-08-15", description: "Combate à desnutrição em creches parceiras." },
  { id: 5, name: "Moradia Digna", goal: 80000, raised: 0, donors: 0, status: "Planejada", endDate: "2027-01-01", description: "Reforma de casas em comunidades vulneráveis." },
];

const statusColor = (status: string) => {
  switch (status) {
    case "Ativa": return "bg-green-100 text-green-700 border-green-200";
    case "Concluída": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Planejada": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const Campanhas = () => {
  const [campaigns, setCampaigns] = useState(() => {
    const saved = localStorage.getItem("fappulse_campaigns");
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form State
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState("Ativa");

  useEffect(() => {
    localStorage.setItem("fappulse_campaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  const handleCreateCampaign = () => {
    if (!newName || !newGoal || !newEndDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome, meta e data de término.",
        variant: "destructive",
      });
      return;
    }

    const newCampaign = {
      id: Date.now(),
      name: newName,
      goal: parseFloat(newGoal),
      raised: 0,
      donors: 0,
      status: newStatus,
      endDate: newEndDate,
      description: newDescription,
    };

    setCampaigns([newCampaign, ...campaigns]);
    setIsDialogOpen(false);
    resetForm();

    toast({
      title: "Campanha Criada!",
      description: `A campanha "${newName}" foi cadastrada com sucesso.`,
    });
  };

  const resetForm = () => {
    setNewName("");
    setNewGoal("");
    setNewEndDate("");
    setNewDescription("");
    setNewStatus("Ativa");
  };

  const filteredCampaigns = campaigns.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Campanhas</h1>
          <p className="text-muted-foreground text-sm">Crie e acompanhe suas campanhas de arrecadação.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-glow transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Campanha</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para iniciar uma nova jornada de arrecadação.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Natal Solidário 2026" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Meta (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      id="goal" 
                      type="number" 
                      className="pl-8" 
                      placeholder="0.00"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      id="endDate" 
                      type="date" 
                      className="pl-8"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Inicial</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Planejada">Planejada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  placeholder="Breve resumo do objetivo da campanha..." 
                  className="resize-none h-20"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateCampaign}>Cadastrar Campanha</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar campanha..." 
          className="pl-9" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCampaigns.map((campaign: any) => {
          const pct = campaign.goal > 0 ? Math.round((campaign.raised / campaign.goal) * 100) : 0;
          return (
            <Card key={campaign.id} className="hover:shadow-md transition-all border-none shadow-soft group">
              <CardHeader className="pb-3 border-b border-muted/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{campaign.name}</CardTitle>
                    <CardDescription className="text-[10px] line-clamp-1">{campaign.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-none ${statusColor(campaign.status)}`}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-medium">Progresso da Arrecadação</span>
                    <span className="font-bold text-primary">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between items-end mt-1">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Arrecadado</p>
                      <p className="text-sm font-bold">R$ {campaign.raised.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Meta</p>
                      <p className="text-xs font-semibold text-muted-foreground">R$ {campaign.goal.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-muted/50 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span>{campaign.donors} doadores</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Até {new Date(campaign.endDate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Campanhas;
