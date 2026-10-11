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

type Kind = "physical" | "cash" | "pledge" | "caixa" | "donation";

interface Received {
  key: string;
  donorName: string;
  neighborhood?: string;
  city?: string;
  courierName?: string;
  kind: Kind;
  description?: string;
  amount?: number;
  receiptNumber?: string;
  receivedAt: string | null;
}

const kindLabel: Record<Kind, { label: string; color: string }> = {
  physical: { label: "Doação Física", color: "bg-green-100 text-green-700 border-green-200" },
  cash: { label: "Dinheiro (coleta)", color: "bg-amber-100 text-amber-700 border-amber-200" },
  pledge: { label: "Combinado (Telemarketing)", color: "bg-blue-100 text-blue-700 border-blue-200" },
  caixa: { label: "Caixa", color: "bg-purple-100 text-purple-700 border-purple-200" },
  donation: { label: "Online / Telemarketing", color: "bg-sky-100 text-sky-700 border-sky-200" },
};

export default function DoacoesRecebidas() {
  const { user, role } = useAuth();
  const isMensageiro = role === "motoboy";
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
    try {
      // 1) Coletas feitas por mensageiro via Rotas de Coleta.
      let routesQuery = supabase
        .from("routes")
        .select("id,collection_date,courier_id,courier:profiles!courier_id(name),route_items(id,source_kind,source_id,snapshot,visit_status,receipts(id,number,status,confirmed_at))")
        .order("collection_date", { ascending: false });
      if (isMensageiro) routesQuery = routesQuery.eq("courier_id", user.id);
      const { data: routesData, error: routesError } = await routesQuery;
      if (routesError) throw routesError;

      const list: Received[] = [];
      const pledgeIdsViaRoute = new Set<string>();
      const cashIdsViaRoute = new Set<string>();

      for (const route of (routesData || []) as any[]) {
        for (const item of route.route_items || []) {
          if (item.source_kind === "pledge") pledgeIdsViaRoute.add(item.source_id);
          if (item.source_kind === "cash") cashIdsViaRoute.add(item.source_id);
          const receipt = item.receipts?.[0];
          if (item.visit_status === "coletado" && receipt?.status === "confirmed") {
            list.push({
              key: `route-${item.id}`,
              donorName: item.snapshot.donor_name,
              neighborhood: item.snapshot.neighborhood,
              city: item.snapshot.city,
              courierName: route.courier?.name,
              kind: item.source_kind,
              description: item.snapshot.description,
              amount: item.snapshot.amount,
              receiptNumber: receipt.number,
              receivedAt: receipt.confirmed_at,
            });
          }
        }
      }

      // 2) Recebidos direto no Caixa (dinheiro/pix/cartão/boleto presencial),
      // excluindo os que já vieram de uma coleta de rota (para não listar 2x).
      let caixaQuery = supabase
        .from("caixa_transacoes")
        .select("id,donor_name,amount,payment_method,created_at,compensated_at,created_by,donors(neighborhood,city)")
        .eq("status", "confirmado");
      if (isMensageiro) caixaQuery = caixaQuery.eq("created_by", user.id);
      const { data: caixaData, error: caixaError } = await caixaQuery;
      if (caixaError) throw caixaError;

      for (const t of (caixaData || []) as any[]) {
        if (cashIdsViaRoute.has(t.id)) continue;
        list.push({
          key: `caixa-${t.id}`,
          donorName: t.donor_name || "Anônimo",
          neighborhood: t.donors?.neighborhood,
          city: t.donors?.city,
          kind: "caixa",
          description: t.payment_method,
          amount: Number(t.amount || 0),
          receivedAt: t.compensated_at || t.created_at,
        });
      }

      // 3) Doações pagas direto em `donations` (Asaas, link manual etc.) —
      // visão geral só pra quem não é mensageiro (ele já vê as suas via rota/caixa).
      if (!isMensageiro) {
        const { data: donationsData, error: donationsError } = await supabase
          .from("donations")
          .select("id,amount,payment_method,confirmed_at,donation_date,donors(name,neighborhood,city)")
          .eq("status", "pago");
        if (donationsError) throw donationsError;

        for (const d of (donationsData || []) as any[]) {
          if (pledgeIdsViaRoute.has(d.id)) continue;
          list.push({
            key: `donation-${d.id}`,
            donorName: d.donors?.name || "Doador",
            neighborhood: d.donors?.neighborhood,
            city: d.donors?.city,
            kind: "donation",
            description: d.payment_method,
            amount: Number(d.amount || 0),
            receivedAt: d.confirmed_at || d.donation_date,
          });
        }
      }

      list.sort((a, b) => new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime());
      setReceived(list);
    } catch (error: any) {
      toast({ title: "Erro ao carregar doações recebidas", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReceived(); }, [user?.id, isMensageiro]);

  // Filtra pela data real em que a doação foi confirmada/recebida — e não pela
  // data original da rota, já que o doador pode ter reagendado a visita para
  // outro dia e a coleta efetivamente aconteceu depois do previsto.
  const filtered = received.filter(r => {
    if (!r.receivedAt) {
      if (dateFrom || dateTo) return false;
    } else {
      const day = r.receivedAt.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    if (donorSearch && !r.donorName?.toLowerCase().includes(donorSearch.toLowerCase())) return false;
    if (bairroFilter && !r.neighborhood?.toLowerCase().includes(bairroFilter.toLowerCase())) return false;
    if (cidadeFilter && !r.city?.toLowerCase().includes(cidadeFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageCheck className="w-6 h-6 text-primary" /> Doações Recebidas
        </h1>
        <p className="text-muted-foreground text-sm">
          {isMensageiro
            ? "Doações que você já coletou e confirmou (rotas e caixa pessoal)."
            : "Todas as doações já confirmadas/pagas — coletas de rota, caixa e doações diretas (online/telemarketing)."}
          {" "}O filtro usa a data real do recebimento, já que o doador pode ter reagendado a visita para um dia diferente do planejado.
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
                {!isMensageiro && <TableHead>Mensageiro</TableHead>}
                <TableHead>Origem</TableHead>
                <TableHead>Descrição / Valor</TableHead>
                <TableHead>Recibo</TableHead>
                <TableHead>Recebido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={isMensageiro ? 6 : 7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={isMensageiro ? 6 : 7} className="text-center py-10 text-muted-foreground">Nenhuma doação recebida no período.</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.donorName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.neighborhood, r.city].filter(Boolean).join(" — ") || "—"}
                  </TableCell>
                  {!isMensageiro && <TableCell className="text-sm text-muted-foreground">{r.courierName || "—"}</TableCell>}
                  <TableCell><Badge variant="outline" className={kindLabel[r.kind].color}>{kindLabel[r.kind].label}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.description}
                    {r.amount ? ` — R$ ${Number(r.amount).toFixed(2)}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground flex items-center gap-1">
                    {r.receiptNumber ? (<><FileText className="w-3.5 h-3.5" />{r.receiptNumber}</>) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.receivedAt ? format(new Date(r.receivedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
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
