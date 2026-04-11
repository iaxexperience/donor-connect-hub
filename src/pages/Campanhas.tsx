import { useState, useEffect } from "react";
import { Plus, Search, Target, Calendar, DollarSign, FileText, Trash2 } from "lucide-react";
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

const INITIAL_CAMPAIGNS = [];

const statusColor = (status: string) => {
  switch (status) {
    case "Ativa": return "bg-green-100 text-green-700 border-green-200";
    case "Concluída": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Planejada": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

import { useCampaigns } from "@/hooks/useCampaigns";

const Campanhas = () => {
  const { campaigns, isLoading, createCampaign, deleteCampaign } = useCampaigns();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form State
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState("Ativa");

  const handleClearAll = async () => {
    if (confirm("Tem certeza que deseja excluir todas as campanhas?")) {
      for (const campaign of campaigns) {
        deleteCampaign(campaign.id);
      }
      toast({
        title: "Limpeza concluída",
        description: "Todas as campanhas foram removidas.",
      });
    }
  };

  const handleCreateCampaign = async () => {
    if (!newName || !newGoal || !newEndDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome, meta e data de término.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCampaign({
        name: newName,
        goal_amount: parseFloat(newGoal),
        end_date: newEndDate,
        description: newDescription,
        is_active: newStatus === "Ativa",
      });

      setIsDialogOpen(false);
      resetForm();

      toast({
        title: "Campanha Criada!",
        description: `A campanha "${newName}" foi sincronizada com o banco de dados.`,
      });
    } catch (error) {
       toast({
        title: "Erro ao criar",
        description: "Não foi possível salvar a campanha no banco de dados.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCampaign = (id: string) => {
    deleteCampaign(id);
    toast({
      title: "Campanha Excluída",
      description: "A campanha foi removida do banco de dados.",
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
        
        <div className="flex gap-2">
          {campaigns.length > 0 && (
            <Button variant="outline" className="text-destructive hover:bg-destructive/5 border-destructive/20" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Todas
            </Button>
          )}
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
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">Carregando campanhas...</div>
        ) : filteredCampaigns.map((campaign: any) => {
          const pct = campaign.goal_amount > 0 ? Math.round((campaign.current_amount / campaign.goal_amount) * 100) : 0;
          return (
            <Card key={campaign.id} className="hover:shadow-md transition-all border-none shadow-soft group">
              <CardHeader className="pb-3 border-b border-muted/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base group-hover:text-primary transition-colors">{campaign.name}</CardTitle>
                    <CardDescription className="text-[10px] line-clamp-1">{campaign.description}</CardDescription>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-none ${campaign.is_active ? statusColor("Ativa") : statusColor("Concluída")}`}>
                      {campaign.is_active ? "Ativa" : "Encerrada"}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                      <p className="text-sm font-bold">R$ {(campaign.current_amount || 0).toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Meta</p>
                      <p className="text-xs font-semibold text-muted-foreground">R$ {(campaign.goal_amount || 0).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-muted/50 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span>Em execução</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Até {new Date(campaign.end_date).toLocaleDateString("pt-BR")}</span>
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
