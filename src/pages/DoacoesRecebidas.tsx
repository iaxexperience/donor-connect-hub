import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PackageCheck, Loader2, FileText } from "lucide-react";

interface Receipt {
  id: string;
  number: string;
  status: "issued" | "confirmed" | "cancelled" | "disputed";
  confirmed_at: string | null;
}

interface RouteItem {
  id: string;
  source_kind: "physical" | "cash" | "pledge";
  snapshot: { donor_name: string; description?: string; quantity?: string; amount?: number; neighborhood?: string; city?: string };
  visit_status: string;
  receipts: Receipt[];
}

interface Route {
  id: string;
  collection_date: string;
  courier_id: string;
  route_items: RouteItem[];
}

const kindLabel: Record<RouteItem["source_kind"], { label: string; color: string }> = {
  physical: { label: "Doação Física", color: "bg-green-100 text-green-700 border-green-200" },
  cash: { label: "Dinheiro", color: "bg-amber-100 text-amber-700 border-amber-200" },
  pledge: { label: "Combinado (Telemarketing)", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

interface Received {
  item: RouteItem;
  receipt: Receipt;
}

export default function DoacoesRecebidas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [received, setReceived] = useState<Received[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [donorSearch, setDonorSearch] = useState("");
  const [bairroFilter, setBairroFilter] = useState("");
  const [cidadeFilter, setCidadeFilter] = useState("");

  const fetchReceived = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("routes")
      .select("id,collection_date,courier_id,route_items(id,source_kind,snapshot,visit_status,receipts(id,number,status,confirmed_at))")
      .eq("courier_id", user.id)
      .order("collection_date", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar doações recebidas", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const routes = (data || []) as unknown as Route[];
    const list: Received[] = [];
    for (const route of routes) {
      for (const item of route.route_items) {
        const receipt = item.receipts?.[0];
        if (item.visit_status === "coletado" && receipt?.status === "confirmed") {
          list.push({ item, receipt });
        }
      }
    }
    list.sort((a, b) => new Date(b.receipt.confirmed_at || 0).getTime() - new Date(a.receipt.confirmed_at || 0).getTime());
    setReceived(list);
    setLoading(false);
  };

  useEffect(() => { fetchReceived(); }, [user?.id]);

  // Filtra pela data real em que a doação foi confirmada/recebida — e não pela
  // data original da rota, já que o doador pode ter reagendado a visita para
  // outro dia e a coleta efetivamente aconteceu depois do previsto.
  const filtered = received.filter(r => {
    if (!r.receipt.confirmed_at) {
      if (dateFrom || dateTo) return false;
    } else {
      const day = r.receipt.confirmed_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    if (donorSearch && !r.item.snapshot.donor_name?.toLowerCase().includes(donorSearch.toLowerCase())) return false;
    if (bairroFilter && !r.item.snapshot.neighborhood?.toLowerCase().includes(bairroFilter.toLowerCase())) return false;
    if (cidadeFilter && !r.item.snapshot.city?.toLowerCase().includes(cidadeFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageCheck className="w-6 h-6 text-primary" /> Doações Recebidas
        </h1>
        <p className="text-muted-foreground text-sm">
          Doações que você já coletou e confirmou. O filtro usa a data real do recebimento,
          já que o doador pode ter reagendado a visita para um dia diferente do planejado.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-4">
          <div>
            <Label className="mb-1.5 block">Recebido de</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="mb-1.5 block">até</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="mb-1.5 block">Doador</Label>
            <Input placeholder="Buscar por nome..." value={donorSearch} onChange={e => setDonorSearch(e.target.value)} className="w-[200px]" />
          </div>
          <div>
            <Label className="mb-1.5 block">Bairro</Label>
            <Input placeholder="Bairro..." value={bairroFilter} onChange={e => setBairroFilter(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="mb-1.5 block">Cidade</Label>
            <Input placeholder="Cidade..." value={cidadeFilter} onChange={e => setCidadeFilter(e.target.value)} className="w-[160px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doador</TableHead>
                <TableHead>Bairro / Cidade</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Recibo</TableHead>
                <TableHead>Recebido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma doação recebida no período.</TableCell></TableRow>
              ) : filtered.map(({ item, receipt }) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.snapshot.donor_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[item.snapshot.neighborhood, item.snapshot.city].filter(Boolean).join(" — ") || "—"}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={kindLabel[item.source_kind].color}>{kindLabel[item.source_kind].label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.snapshot.description}
                    {item.snapshot.quantity ? ` — ${item.snapshot.quantity}` : ""}
                    {item.snapshot.amount ? ` — R$ ${Number(item.snapshot.amount).toFixed(2)}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />{receipt.number}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {receipt.confirmed_at ? format(new Date(receipt.confirmed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
