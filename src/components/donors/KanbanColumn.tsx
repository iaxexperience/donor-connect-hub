import { Donor, DonorType } from "@/lib/donationService";
import { KanbanCard } from "./KanbanCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  title: string;
  type: DonorType;
  donors: Donor[];
  onMove?: (donorId: number, nextType: DonorType) => void;
}

export const KanbanColumn = ({ title, type, donors, onMove }: KanbanColumnProps) => {
  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[350px] bg-muted/30 rounded-xl border border-muted/40 overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-background/50 backdrop-blur-sm border-b border-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-foreground">{title}</h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
            {donors.length}
          </Badge>
        </div>
        <div className={`w-2 h-2 rounded-full ${
          type === 'lead' ? 'bg-purple-500' :
          type === 'recorrente' ? 'bg-green-500' :
          type === 'esporadico' ? 'bg-orange-500' :
          type === 'unico' ? 'bg-blue-500' :
          'bg-gray-500'
        } shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3 pb-4">
          {donors.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-muted/30 rounded-lg p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Coluna Vazia</p>
            </div>
          ) : (
            donors.map((donor) => (
              <KanbanCard key={donor.id} donor={donor} onMove={onMove} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
