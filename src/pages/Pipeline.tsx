import { useState } from "react";
import { Search, Filter, GitMerge, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useDonors } from "@/hooks/useDonors";
import { DonorKanban } from "@/components/donors/DonorKanban";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Users, Target, Activity, Heart, GitMerge as GitMergeIcon, ShieldAlert } from "lucide-react";


const Pipeline = () => {
  const navigate = useNavigate();
  const { donors, updateType, isLoading } = useDonors();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredDonors = donors.filter(d => {
    const donorName = d.name || "";
    const donorEmail = d.email || "";
    const matchesSearch = donorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         donorEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || d.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <GitMerge className="w-5 h-5" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Kanban de Doadores</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie o pipeline de conversão de leads em doadores ativos através do quadro Kanban.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-primary/50 text-primary hover:bg-primary/5" 
          onClick={() => navigate("/dashboard/doadores")}
        >
          <List className="w-4 h-4 mr-2" />
          Ver Lista
        </Button>
      </div>
      
      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
        <KpiCard 
          title="Total de Cadastros" 
          value={donors.length} 
          icon={Users} 
          color="blue" 
          delay={0.1}
        />
        <KpiCard 
          title="Leads" 
          value={donors.filter(d => d.type === 'lead').length} 
          icon={Target} 
          color="orange" 
          delay={0.2}
        />
        <KpiCard 
          title="Recorrentes" 
          value={donors.filter(d => d.type === 'recorrente').length} 
          icon={Activity} 
          color="green" 
          delay={0.3}
        />
        <KpiCard 
          title="Únicos" 
          value={donors.filter(d => d.type === 'unico').length} 
          icon={Heart} 
          color="red" 
          delay={0.4}
        />
        <KpiCard 
          title="Esporádicos" 
          value={donors.filter(d => d.type === 'esporadico').length} 
          icon={GitMergeIcon} 
          color="purple" 
          delay={0.5}
        />
      </div>

      <div className="flex items-center gap-3 shrink-0">

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar no pipeline..." 
            className="pl-9 h-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] h-10">
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

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DonorKanban donors={filteredDonors} onMove={updateType} />
        )}
      </div>
    </div>
  );
};

export default Pipeline;
