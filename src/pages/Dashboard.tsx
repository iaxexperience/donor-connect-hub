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
  Wallet,
  Activity,
  Calendar,
  AlertCircle,
  TrendingDown,
  Target,
  BarChart3,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Mock Data ---

const COLORS = ["#007bff", "#28a745", "#f39c12", "#dc3545", "#17a2b8", "#6f42c1", "#e83e8c"];

const monthlyData = [
  { name: "Jan", total: 45000 },
  { name: "Fev", total: 52000 },
  { name: "Mar", total: 48000 },
  { name: "Abr", total: 61000 },
  { name: "Mai", total: 55000 },
  { name: "Jun", total: 67000 },
];

const campaignData = [
  { name: "Solidária 2026", value: 45, color: "#0066CC" },
  { name: "Natal 2025", value: 25, color: "#FF9933" },
  { name: "Educação", value: 20, color: "#33CC66" },
  { name: "Outras", value: 10, color: "#999999" },
];

const evolutionData = [
  { day: "01/06", value: 1200 },
  { day: "05/06", value: 3400 },
  { day: "10/06", value: 2100 },
  { day: "15/06", value: 4500 },
  { day: "20/06", value: 3800 },
  { day: "25/06", value: 5200 },
  { day: "30/06", value: 6100 },
];

const topDonors = [
  { name: "Indústrias Matarazzo", total: "R$ 45.000", type: "Corporativo" },
  { name: "Ricardo Almeida", total: "R$ 12.400", type: "Recorrente" },
  { name: "Fundação Bradesco", total: "R$ 8.900", type: "Parceiro" },
  { name: "Marina Silva", total: "R$ 5.200", type: "Único" },
];

const recentDonations = [
  { name: "Carlos Magno", amount: "R$ 250", time: "14:32", status: "Confirmado" },
  { name: "Beatriz Ferraz", amount: "R$ 1.200", time: "13:10", status: "Confirmado" },
  { name: "Anônimo", amount: "R$ 50", time: "11:45", status: "Pendente" },
  { name: "Sérgio Ramos", amount: "R$ 300", time: "10:20", status: "Confirmado" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-1 space-y-6 pb-10">
      
      {/* HEADER SECTION */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
            Pulse <span className="text-primary">Doações</span>
            <Activity className="h-6 w-6 text-primary animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm">Gestão executiva e inteligência de arrecadação</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select defaultValue="30d">
            <SelectTrigger className="w-[140px] bg-background">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-[160px] bg-background">
              <Megaphone className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Campanhas</SelectItem>
              <SelectItem value="solidaria">Solidária 2026</SelectItem>
              <SelectItem value="natal">Natal</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* MAIN KPIs */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Recebidos Hoje" value="R$ 14.250" change="+12.5%" trend="up" icon={DollarSign} color="orange" />
        <StatCard title="Recorrentes" value="842" change="+4.2%" trend="up" icon={Users} color="teal" />
        <StatCard title="Doadores Únicos" value="1.560" change="-2.1%" trend="down" icon={Activity} color="green" />
        <StatCard title="Esporádicos" value="432" change="+8.7%" trend="up" icon={Heart} color="red" />
        <StatCard title="Follow-ups Pendentes" value="28" badge="Alta" color="blue" icon={Phone} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FINANCE & PULSE SCORE */}
        <div className="space-y-6">
          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white shadow-glow border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Wallet className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-80">Saldo ASAAS (Real-time)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">R$ 145.890,22</div>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-90">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Sincronizado via API agora
                </div>
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs opacity-70">
                    <span>Prospecção Diária</span>
                    <span>R$ 22.400,00</span>
                  </div>
                  <Progress value={65} className="h-1 bg-white/20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* PULSE della ARRECADAÇÃO (HEALTH SCORE) */}
          <motion.div variants={item}>
            <Card className="shadow-soft border-t-4 border-t-primary">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Pulso da Arrecadação</CardTitle>
                  <CardDescription>Health Score Global</CardDescription>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                  <span className="text-xl font-bold text-primary">87</span>
                  <svg className="absolute inset-0 h-full w-full rotate-[-90deg]">
                    <circle 
                      cx="32" cy="32" r="28" 
                      fill="transparent" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      className="text-primary" 
                      strokeDasharray="175"
                      strokeDashoffset="22" 
                    />
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Consistência</p>
                    <p className="text-lg font-bold text-foreground">Excelente</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Crescimento</p>
                    <p className="text-lg font-bold text-foreground">+18%</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-lg flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                  Lógica baseada em volume, recorrência e constância de doações semanais.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* CHARTS SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={item}>
            <Card className="shadow-soft h-[320px]">
              <CardHeader className="pb-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recebimentos Mensais</CardTitle>
                  <CardDescription>Arrecadação total (R$)</CardDescription>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-[250px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#f5f5f5' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={32}>
                      {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={item}>
              <Card className="shadow-soft h-[300px]">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-semibold">Mix por Campanha</CardTitle>
                </CardHeader>
                <CardContent className="h-[220px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={campaignData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {campaignData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-2 mt-[-20px]">
                    {campaignData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="shadow-soft h-[300px]">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-semibold">Evolução de Doações</CardTitle>
                </CardHeader>
                <CardContent className="h-[220px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* INTELLIGENCE & LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* INTELLIGENCE MODULE */}
        <motion.div variants={item} className="lg:col-span-1 space-y-4">
          <Card className="shadow-soft overflow-hidden">
            <div className="bg-orange-500 h-1.5 w-full" />
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                Inteligência Estratégica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Conversão</span>
                  <span className="text-primary font-bold">18.4%</span>
                </div>
                <Progress value={18.4} className="h-1" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Ticket Médio</span>
                  <span className="text-primary font-bold">R$ 142,50</span>
                </div>
              </div>
              <div className="pt-4 border-t border-muted">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Previsão Mensal (IA)</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xl font-bold">R$ 178.400</span>
                </div>
                <p className="text-[10px] text-muted-foreground">+12% vs mês anterior</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <AlertItem type="error" text="Queda de 5% em recorrentes na Colônia" />
            <AlertItem type="warning" text="8 follow-ups vitoriosos pendentes" />
            <AlertItem type="info" text="Campanha Natal atingiu 80% da meta" />
          </div>
        </motion.div>

        {/* LISTS */}
        <motion.div variants={item} className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Maiores Doadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topDonors.map((d, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-muted pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.type}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground">{d.total}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Doações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDonations.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground">{d.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{d.amount}</p>
                      <Badge variant={d.status === "Confirmado" ? "secondary" : "outline"} className="text-[10px] px-1 h-4">
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-xs h-8 text-primary">Ver tudo</Button>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </motion.div>
  );
}

// --- Sub-Components ---

function StatCard({ title, value, change, trend, icon: Icon, color, badge }: any) {
  const colorVariants: any = {
    orange: "bg-[#f39c12] hover:bg-[#e67e22]",
    teal: "bg-[#17a2b8] hover:bg-[#138496]",
    green: "bg-[#28a745] hover:bg-[#218838]",
    red: "bg-[#dc3545] hover:bg-[#c82333]",
    blue: "bg-[#007bff] hover:bg-[#0069d9]",
    purple: "bg-[#6f42c1] hover:bg-[#5a32a3]",
    pink: "bg-[#e83e8c] hover:bg-[#d81b60]",
  };

  return (
    <Card className={`relative overflow-hidden border-none shadow-lg transition-all duration-300 ${colorVariants[color] || colorVariants.blue} text-white group`}>
      <CardContent className="p-0">
        <div className="p-5 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-bold font-heading mb-1">{value}</p>
              <p className="text-sm font-medium opacity-90 leading-tight pr-8">{title}</p>
            </div>
            {change && (
              <div className="bg-white/20 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5">
                {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change}
              </div>
            )}
            {badge && (
              <Badge className="bg-white text-destructive hover:bg-white/90 text-[10px] px-1.5 py-0 font-bold">
                {badge}
              </Badge>
            )}
          </div>
          
          {/* Background Icon */}
          <div className="absolute top-4 right-4 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-500">
            <Icon className="h-16 w-16" />
          </div>
        </div>

        {/* Footer info bar */}
        <div className="bg-black/10 py-1.5 px-5 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-black/20 transition-colors">
          <span className="text-[10px] font-medium uppercase tracking-wider">mais informações</span>
          <ArrowUpRight className="h-3 w-3 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({ type, text }: { type: "error" | "warning" | "info"; text: string }) {
  const icons = {
    error: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
    warning: <AlertCircle className="h-3.5 w-3.5 text-orange-500" />,
    info: <Activity className="h-3.5 w-3.5 text-blue-500" />,
  };
  const bg = {
    error: "bg-red-50",
    warning: "bg-orange-50",
    info: "bg-blue-50",
  };
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${bg[type]} text-xs border border-transparent`}>
      {icons[type]}
      <span className="text-foreground/80 font-medium truncate">{text}</span>
    </div>
  );
}
