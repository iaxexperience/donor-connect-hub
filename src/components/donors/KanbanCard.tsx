import { Donor, typeLabel, DonorType } from "@/lib/donationService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  DollarSign, 
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanCardProps {
  donor: Donor;
  onMove?: (donorId: number, nextType: DonorType) => void;
}

const typeBadgeStyle = (type: string) => {
  switch (type) {
    case "lead": return "bg-purple-100 text-purple-700 border-purple-200";
    case "recorrente": return "bg-green-100 text-green-700 border-green-200";
    case "esporadico": return "bg-orange-100 text-orange-700 border-orange-200";
    case "unico": return "bg-blue-100 text-blue-700 border-blue-200";
    case "desativado": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-gray-100 text-gray-700";
  }
};

export const KanbanCard = ({ donor, onMove }: KanbanCardProps) => {
  const getNextTypes = (currentType: DonorType): DonorType[] => {
    if (currentType === "lead") return ["unico", "esporadico", "recorrente"];
    if (currentType !== "desativado") return ["desativado"];
    return [];
  };

  const nextTypes = getNextTypes(donor.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="overflow-hidden border-muted/60 hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-none group-hover:text-primary transition-colors">
                  {donor.name}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-1">ID: #{donor.id}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs">Ver Detalhes</DropdownMenuItem>
                <DropdownMenuItem className="text-xs">Registrar Doação</DropdownMenuItem>
                {nextTypes.map((type) => (
                  <DropdownMenuItem 
                    key={type} 
                    className="text-xs"
                    onClick={() => onMove?.(donor.id, type)}
                  >
                    Mover para {typeLabel[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span className="truncate">{donor.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{donor.phone}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-muted/20">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Doado</span>
              <div className="flex items-center text-sm font-bold text-foreground">
                <DollarSign className="w-3 h-3 text-green-500" />
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(donor.total_donated)}
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] h-5 px-2 font-medium ${typeBadgeStyle(donor.type)}`}>
              {typeLabel[donor.type]}
            </Badge>
          </div>

          {nextTypes.length > 0 && (
            <div className="flex gap-1 pt-2">
              {nextTypes.filter(t => t !== 'desativado').slice(0, 2).map((type) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-primary hover:bg-primary/5 px-2 flex-1 gap-1"
                  onClick={() => onMove?.(donor.id, type)}
                >
                  <ArrowRight className="w-2 h-2" />
                  {typeLabel[type].split(' ')[0]}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
