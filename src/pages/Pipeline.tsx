import { useState } from "react";
import { Search, Filter, GitMerge } from "lucide-react";
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

const Pipeline = () => {
  const { donors, updateType, isLoading } = useDonors();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filteredDonors = donors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         d.email.toLowerCase().includes(searchTerm.toLowerCase());
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
            <h1 className="font-heading font-bold text-2xl text-foreground">Pipeline de Doadores</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie o fluxo de conversão de leads em doadores ativos.
          </p>
        </div>
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
