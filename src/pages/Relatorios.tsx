import { BarChart3, Download, FileText, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  { title: "Doações por Período", description: "Relatório detalhado de doações recebidas com filtros por data, campanha e tipo de doador.", icon: TrendingUp },
  { title: "Desempenho de Campanhas", description: "Análise comparativa de campanhas com métricas de arrecadação, conversão e engajamento.", icon: BarChart3 },
  { title: "Relatório de Doadores", description: "Visão geral da base de doadores com classificação, histórico e taxa de retenção.", icon: Users },
  { title: "Telemarketing", description: "Métricas de ligações realizadas, taxa de atendimento e conversões por operador.", icon: FileText },
];

const Relatorios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Gere e exporte relatórios sobre doações, campanhas e operações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
              <div className="p-2 rounded-lg bg-muted">
                <report.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{report.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Relatorios;
