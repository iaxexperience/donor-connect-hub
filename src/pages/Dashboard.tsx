import { motion } from "framer-motion";
import {
  Heart,
  TrendingUp,
  Megaphone,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stats = [
  {
    title: "Total Arrecadado",
    value: "R$ 128.450",
    change: "+12,5%",
    trend: "up" as const,
    icon: DollarSign,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Doadores Ativos",
    value: "1.247",
    change: "+8,3%",
    trend: "up" as const,
    icon: Heart,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Campanhas Ativas",
    value: "5",
    change: "+2",
    trend: "up" as const,
    icon: Megaphone,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Ligações Hoje",
    value: "342",
    change: "-3,1%",
    trend: "down" as const,
    icon: Phone,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

const campaigns = [
  {
    name: "Campanha Solidária 2026",
    status: "Ativa",
    meta: "R$ 50.000",
    arrecadado: "R$ 38.200",
    progress: 76,
  },
  {
    name: "Natal Solidário",
    status: "Ativa",
    meta: "R$ 30.000",
    arrecadado: "R$ 22.100",
    progress: 74,
  },
  {
    name: "Educação para Todos",
    status: "Ativa",
    meta: "R$ 80.000",
    arrecadado: "R$ 41.600",
    progress: 52,
  },
  {
    name: "Saúde em Primeiro Lugar",
    status: "Pausada",
    meta: "R$ 25.000",
    arrecadado: "R$ 12.300",
    progress: 49,
  },
  {
    name: "Reconstrução Sul",
    status: "Ativa",
    meta: "R$ 100.000",
    arrecadado: "R$ 14.250",
    progress: 14,
  },
];

const recentDonors = [
  { name: "Maria Silva", value: "R$ 500", date: "Hoje, 14:32", campaign: "Campanha Solidária 2026" },
  { name: "João Santos", value: "R$ 200", date: "Hoje, 13:10", campaign: "Educação para Todos" },
  { name: "Ana Oliveira", value: "R$ 1.000", date: "Hoje, 11:45", campaign: "Reconstrução Sul" },
  { name: "Carlos Souza", value: "R$ 150", date: "Ontem, 18:20", campaign: "Natal Solidário" },
  { name: "Beatriz Lima", value: "R$ 300", date: "Ontem, 16:05", campaign: "Saúde em Primeiro Lugar" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-heading font-bold text-foreground">Painel de Controle</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral da plataforma de arrecadação
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-soft hover:shadow-elevated transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === "up" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Campaigns + Recent Donors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Campanhas</CardTitle>
              <CardDescription>Progresso das campanhas ativas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.map((c) => (
                <div key={c.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <Badge
                        variant={c.status === "Ativa" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.arrecadado} / {c.meta}
                    </span>
                  </div>
                  <Progress value={c.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Donors */}
        <motion.div variants={item}>
          <Card className="shadow-soft h-full">
            <CardHeader>
              <CardTitle className="text-lg">Doações Recentes</CardTitle>
              <CardDescription>Últimas contribuições</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDonors.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.campaign}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{d.value}</p>
                      <p className="text-[10px] text-muted-foreground">{d.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
