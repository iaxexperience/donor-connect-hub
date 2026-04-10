import { useState } from "react";
import { Donor, DonorType, typeLabel } from "@/lib/donationService";
import { KanbanColumn } from "./KanbanColumn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

interface DonorKanbanProps {
  donors: Donor[];
  onMove?: (donorId: number, nextType: DonorType) => void;
}

const columns: { title: string; type: DonorType }[] = [
  { title: "Leads", type: "lead" },
  { title: "Recorrente", type: "recorrente" },
  { title: "Único", type: "unico" },
  { title: "Esporádico", type: "esporadico" },
  { title: "Desativados", type: "desativado" },
];

export const DonorKanban = ({ donors, onMove }: DonorKanbanProps) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>("lead");

  const getDonorsByType = (type: DonorType) => donors.filter((d) => d.type === type);

  if (isMobile) {
    return (
      <Tabs defaultValue="lead" className="w-full" onValueChange={setActiveTab}>
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 rounded-xl scrollbar-hide">
            {columns.map((col) => (
              <TabsTrigger 
                key={col.type} 
                value={col.type} 
                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2"
              >
                {col.title}
                <span className="ml-1.5 opacity-50">({getDonorsByType(col.type).length})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          {columns.map((col) => (
            <TabsContent key={col.type} value={col.type} className="mt-0 focus-visible:outline-none">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <KanbanColumn 
                  title={col.title} 
                  type={col.type} 
                  donors={getDonorsByType(col.type)} 
                  onMove={onMove}
                />
              </motion.div>
            </TabsContent>
          ))}
        </AnimatePresence>
      </Tabs>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
      {columns.map((col) => (
        <KanbanColumn 
          key={col.type}
          title={col.title} 
          type={col.type} 
          donors={getDonorsByType(col.type)} 
          onMove={onMove}
        />
      ))}
    </div>
  );
};
