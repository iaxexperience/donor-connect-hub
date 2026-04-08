import { Plus, Search, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockCampaigns = [
  { id: 1, name: "Natal Solidário 2026", goal: 50000, raised: 32500, donors: 124, status: "Ativa", endDate: "25/12/2026" },
  { id: 2, name: "Educação para Todos", goal: 30000, raised: 28700, donors: 89, status: "Ativa", endDate: "30/06/2026" },
  { id: 3, name: "Saúde Comunitária", goal: 20000, raised: 20000, donors: 67, status: "Concluída", endDate: "01/03/2026" },
  { id: 4, name: "Alimentação Infantil", goal: 15000, raised: 4200, donors: 31, status: "Ativa", endDate: "15/08/2026" },
  { id: 5, name: "Moradia Digna", goal: 80000, raised: 0, donors: 0, status: "Planejada", endDate: "01/01/2027" },
];

const statusColor = (status: string) => {
  switch (status) {
    case "Ativa": return "default";
    case "Concluída": return "secondary";
    case "Planejada": return "outline";
    default: return "outline";
  }
};

const Campanhas = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Campanhas</h1>
          <p className="text-muted-foreground text-sm">Crie e acompanhe suas campanhas de arrecadação.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar campanha..." className="pl-9" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockCampaigns.map((campaign) => {
          const pct = Math.round((campaign.raised / campaign.goal) * 100);
          return (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  <Badge variant={statusColor(campaign.status) as any}>{campaign.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Arrecadado</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>R$ {campaign.raised.toLocaleString("pt-BR")}</span>
                    <span>Meta: R$ {campaign.goal.toLocaleString("pt-BR")}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{campaign.donors} doadores</span>
                  <span className="text-muted-foreground">Até {campaign.endDate}</span>
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
