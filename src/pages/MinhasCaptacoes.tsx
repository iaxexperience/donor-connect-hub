import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HeartHandshake, Search, CalendarClock, Loader2 } from "lucide-react";

interface Donation {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  donation_date: string;
  due_date: string | null;
  donors: { name: string; phone?: string } | null;
  campaigns: { name: string } | null;
}

const statusMeta: Record<string, { label: string; color: string }> = {
  pago: { label: "Pago", color: "bg-green-100 text-green-700 border-green-200" },
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function MinhasCaptacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const [rescheduling, setRescheduling] = useState<Donation | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDonations = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("donations")
      .select("id,amount,payment_method,status,donation_date,due_date,donors(name,phone),campaigns(name)")
      .eq("captured_by", user.id)
      .order("donation_date", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar doações", description: error.message, variant: "destructive" });
    } else {
      setDonations((data || []) as unknown as Donation[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDonations(); }, [user?.id]);

  const openReschedule = (d: Donation) => {
    setRescheduling(d);
    setNewDueDate(d.due_date || "");
  };

  const confirmReschedule = async () => {
    if (!rescheduling || !newDueDate) {
      toast({ title: "Informe a nova data", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("donations")
        .update({ due_date: newDueDate })
        .eq("id", rescheduling.id);
      if (error) throw error;
      toast({ title: "Data reagendada!", description: "A nova data prevista foi salva." });
      setRescheduling(null);
      fetchDonations();
    } catch (error: any) {
      toast({ title: "Erro ao reagendar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = donations.filter(d => {
    if (search && !d.donors?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "todos" && d.status !== statusFilter) return false;
    if (dueFrom && (!d.due_date || d.due_date < dueFrom)) return false;
    if (dueTo && (!d.due_date || d.due_date > dueTo)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-primary" /> Minhas Captações
        </h1>
        <p className="text-muted-foreground text-sm">
          Doações registradas por você no Telemarketing. Use o filtro de data prevista para
          encontrar doações cujo pagamento o doador reagendou para outro dia.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Label className="mb-1.5 block">Buscar doador</Label>
            <Search className="absolute left-3 top-[42px] w-4 h-4 text-muted-foreground" />
            <Input placeholder="Nome do doador..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Data prevista — de</Label>
            <Input type="date" value={dueFrom} onChange={e => setDueFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="mb-1.5 block">até</Label>
            <Input type="date" value={dueTo} onChange={e => setDueTo(e.target.value)} className="w-[160px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doador</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data da doação</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhuma doação encontrada.</TableCell></TableRow>
              ) : filtered.map(d => {
                const meta = statusMeta[d.status] || { label: d.status, color: "" };
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.donors?.name || "—"}</TableCell>
                    <TableCell>R$ {Number(d.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.payment_method}</TableCell>
                    <TableCell><Badge variant="outline" className={meta.color}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.donation_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.due_date ? format(new Date(d.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.campaigns?.name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReschedule(d)}>
                        <CalendarClock className="w-3.5 h-3.5 mr-1" /> Reagendar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rescheduling} onOpenChange={(open) => !open && setRescheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar data prevista</DialogTitle>
            <DialogDescription>
              {rescheduling?.donors?.name} — informe a nova data combinada com o doador para o pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nova data prevista</Label>
            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(null)}>Cancelar</Button>
            <Button onClick={confirmReschedule} disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
