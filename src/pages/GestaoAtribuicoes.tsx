import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ListChecks, Search, UserCheck, MapPin, Phone, Package, Loader2,
} from "lucide-react";

interface Candidate {
  source_kind: "physical" | "cash" | "pledge";
  source_id: string;
  snapshot: {
    donor_name: string;
    document?: string;
    phone?: string;
    address?: string;
    description?: string;
    quantity?: string;
    amount?: number;
  };
}

interface Mensageiro {
  id: string;
  name: string;
  cpf: string | null;
}

const kindLabel: Record<Candidate["source_kind"], { label: string; color: string }> = {
  physical: { label: "Doação Física", color: "bg-green-100 text-green-700 border-green-200" },
  cash: { label: "Dinheiro", color: "bg-amber-100 text-amber-700 border-amber-200" },
  pledge: { label: "Combinado (Telemarketing)", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

const key = (c: Pick<Candidate, "source_kind" | "source_id">) => `${c.source_kind}:${c.source_id}`;

export default function GestaoAtribuicoes() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [mensageiros, setMensageiros] = useState<Mensageiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mensageiroId, setMensageiroId] = useState("");
  const [dataColeta, setDataColeta] = useState("");
  const [turno, setTurno] = useState("");
  const [prioridade, setPrioridade] = useState("normal");
  const [horario, setHorario] = useState("");
  const [despachando, setDespachando] = useState(false);
  const dispatchRequest = useRef(crypto.randomUUID());
  const dispatchLock = useRef(false);

  const fetchCandidates = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("collection_candidates");
    if (error) {
      toast({ title: "Erro ao carregar doadores pendentes", description: error.message, variant: "destructive" });
    } else {
      setCandidates((data || []) as Candidate[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidates();
    supabase.from("profiles").select("id,name,cpf").eq("role", "motoboy").eq("status", "Ativo")
      .then(({ data }) => setMensageiros((data || []) as Mensageiro[]));
  }, []);

  const toggleSelect = (c: Candidate) => {
    setSelected(prev => {
      const next = new Set(prev);
      const k = key(c);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const filtered = candidates.filter(c =>
    c.snapshot.donor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(key)));
  };

  const selectedCandidates = candidates.filter(c => selected.has(key(c)));

  const handleOpenDialog = () => {
    if (selected.size === 0) {
      toast({ title: "Selecione ao menos um doador", variant: "destructive" });
      return;
    }
    dispatchRequest.current = crypto.randomUUID();
    setMensageiroId(""); setDataColeta(""); setTurno(""); setPrioridade("normal"); setHorario("");
    setDialogOpen(true);
  };

  const handleDespachar = async () => {
    if (dispatchLock.current) return;
    if (!mensageiroId || !dataColeta || !turno) {
      toast({ title: "Preencha mensageiro, data e turno", variant: "destructive" });
      return;
    }
    dispatchLock.current = true;
    setDespachando(true);
    try {
      const items = selectedCandidates.map(c => ({
        source_kind: c.source_kind,
        source_id: c.source_id,
        priority: prioridade,
        scheduled_time: horario.trim() || null,
      }));
      const { error } = await supabase.rpc("dispatch_collection", {
        p_request: dispatchRequest.current,
        p_courier: mensageiroId,
        p_date: dataColeta,
        p_shift: turno,
        p_items: items,
      });
      if (error) throw error;
      toast({ title: "Itinerário criado!", description: `${items.length} doação(ões) atribuída(s) ao mensageiro.` });
      setDialogOpen(false);
      setSelected(new Set());
      fetchCandidates();
    } catch (error: any) {
      toast({ title: "Erro ao despachar", description: error.message, variant: "destructive" });
    } finally {
      dispatchLock.current = false;
      setDespachando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-primary" /> Gestão de Atribuições
          </h1>
          <p className="text-muted-foreground text-sm">Selecione os doadores pendentes e atribua a um mensageiro responsável.</p>
        </div>
        <Button onClick={handleOpenDialog} disabled={selected.size === 0}>
          <UserCheck className="w-4 h-4 mr-2" /> Atribuir Selecionados ({selected.size})
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pendentes de atribuição</p>
            <p className="text-3xl font-bold">{candidates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Selecionados</p>
            <p className="text-3xl font-bold text-primary">{selected.size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mensageiros ativos</p>
            <p className="text-3xl font-bold">{mensageiros.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por doador..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-primary"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Doador</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum doador pendente de coleta no momento.</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={key(c)} className="cursor-pointer hover:bg-muted/40" onClick={() => toggleSelect(c)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-primary"
                      checked={selected.has(key(c))} onChange={() => toggleSelect(c)} />
                  </TableCell>
                  <TableCell className="font-medium">{c.snapshot.donor_name}</TableCell>
                  <TableCell><Badge variant="outline" className={kindLabel[c.source_kind].color}>{kindLabel[c.source_kind].label}</Badge></TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 text-muted-foreground" />
                      {c.snapshot.description}{c.snapshot.quantity ? ` — ${c.snapshot.quantity}` : ""}{c.snapshot.amount ? ` — R$ ${Number(c.snapshot.amount).toFixed(2)}` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />{c.snapshot.address || "Sem endereço"}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.snapshot.phone || "-"}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atribuir {selected.size} doação(ões) a um mensageiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Mensageiro responsável</Label>
              <Select value={mensageiroId} onValueChange={setMensageiroId}>
                <SelectTrigger><SelectValue placeholder="Selecione o mensageiro..." /></SelectTrigger>
                <SelectContent>
                  {mensageiros.map(m => (
                    <SelectItem key={m.id} value={m.id} disabled={!m.cpf}>
                      {m.name}{!m.cpf ? " (sem CPF cadastrado)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data da coleta</Label>
                <Input type="date" value={dataColeta} onChange={e => setDataColeta(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Turno</Label>
                <Select value={turno} onValueChange={setTurno}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário previsto (opcional)</Label>
                <Input placeholder="Ex: 14:00–16:00" value={horario} onChange={e => setHorario(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDespachar} disabled={despachando}>
              {despachando ? "Despachando..." : "Confirmar Atribuição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
