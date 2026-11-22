import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openProof } from "@/lib/proofService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DonationRow = {
  id: string | number;
  amount: number;
  donation_date: string | null;
  payment_method: string | null;
  status: string | null;
  notes: string | null;
  proof_path?: string | null;
  campaigns: { name: string } | null;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// donation_date pode vir como "YYYY-MM-DD" (sem hora). new Date() trataria como UTC
// e mostraria o dia anterior no fuso do Brasil, então formatamos a parte da data direto.
const formatDate = (value: string | null) => {
  if (!value) return "Sem data";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && value.length <= 10) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(value).toLocaleDateString("pt-BR");
};

const statusStyle = (status: string | null) => {
  switch (status) {
    case "pago":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "pendente":
      return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    case "cancelado":
      return "bg-red-500/10 text-red-700 border-red-500/30";
    default:
      return "";
  }
};

interface Props {
  donorId: number;
  donorName: string;
}

const DonorDonationHistory = ({ donorId, donorName }: Props) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const alertError = (e: any) =>
    toast({ title: "Não foi possível abrir o comprovante", description: e?.message, variant: "destructive" });

  const { data: donations = [], isLoading, error } = useQuery({
    queryKey: ["donor-donations", donorId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*, campaigns(name)")
        .eq("donor_id", donorId)
        .order("donation_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DonationRow[];
    },
  });

  const paid = donations.filter((d) => d.status === "pago");
  const paidTotal = paid.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Histórico de doações"
        >
          <History className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de doações</DialogTitle>
          <DialogDescription>
            {donorName}
            {!isLoading && !error && (
              <>
                {" · "}
                {donations.length} {donations.length === 1 ? "doação" : "doações"}
                {" · "}
                {currency.format(paidTotal)} pagos
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando doações...
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">
              Erro ao carregar doações: {(error as Error).message}
            </p>
          ) : donations.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma doação registrada para este doador.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(d.donation_date)}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {currency.format(Number(d.amount || 0))}
                    </TableCell>
                    <TableCell>{d.payment_method || "—"}</TableCell>
                    <TableCell>{d.campaigns?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyle(d.status)}>
                        {d.status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.proof_path ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openProof(d.proof_path!).catch((e) => alertError(e))}
                        >
                          <Paperclip className="w-3.5 h-3.5 mr-1" /> Ver
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonorDonationHistory;
