import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Wallet, Plus, FileText, TrendingUp, Banknote, CreditCard,
  QrCode, FileBarChart, Clock, CheckCircle2, XCircle, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PaymentMethod = "dinheiro" | "pix" | "cartao" | "boleto";
type Status = "confirmado" | "pendente" | "cancelado";

interface Transacao {
  id: string;
  donor_name: string;
  amount: number;
  payment_method: PaymentMethod;
  status: Status;
  notes?: string;
  created_at: string;
  compensated_at?: string;
}

const methodLabel: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
};

const methodIcon: Record<PaymentMethod, React.ReactNode> = {
  dinheiro: <Banknote className="w-4 h-4" />,
  pix: <QrCode className="w-4 h-4" />,
  cartao: <CreditCard className="w-4 h-4" />,
  boleto: <FileText className="w-4 h-4" />,
};

const methodColor: Record<PaymentMethod, string> = {
  dinheiro: "bg-green-100 text-green-700 border-green-200",
  pix: "bg-blue-100 text-blue-700 border-blue-200",
  cartao: "bg-purple-100 text-purple-700 border-purple-200",
  boleto: "bg-orange-100 text-orange-700 border-orange-200",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Caixa() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>("todos");
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Form state
  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTransacoes = async () => {
    setLoading(true);
    let query = supabase
      .from("caixa_transacoes")
      .select("*")
      .gte("created_at", `${filterDate}T00:00:00`)
      .lte("created_at", `${filterDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (filterMethod !== "todos") {
      query = query.eq("payment_method", filterMethod);
    }

    const { data, error } = await query;
    if (!error && data) setTransacoes(data as Transacao[]);
    setLoading(false);
  };

  useEffect(() => { fetchTransacoes(); }, [filterDate, filterMethod]);

  const handleSave = async () => {
    if (!donorName.trim()) { toast({ title: "Informe o nome do doador", variant: "destructive" }); return; }
    if (!amount || parseFloat(amount) <= 0) { toast({ title: "Informe um valor válido", variant: "destructive" }); return; }

    setSaving(true);
    const { error } = await supabase.from("caixa_transacoes").insert({
      donor_name: donorName.trim() || "Anônimo",
      amount: parseFloat(amount.replace(",", ".")),
      payment_method: paymentMethod,
      status: paymentMethod === "boleto" ? "pendente" : "confirmado",
      notes: notes.trim() || null,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Doação registrada!", description: `R$ ${amount} via ${methodLabel[paymentMethod]}` });
      setDonorName(""); setAmount(""); setNotes(""); setPaymentMethod("pix");
      setOpenDialog(false);
      fetchTransacoes();
    }
    setSaving(false);
  };

  const handleConfirmarBoleto = async (id: string) => {
    const { error } = await supabase
      .from("caixa_transacoes")
      .update({ status: "confirmado", compensated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) { toast({ title: "Boleto compensado!" }); fetchTransacoes(); }
  };

  const handleCancelar = async (id: string) => {
    const { error } = await supabase
      .from("caixa_transacoes")
      .update({ status: "cancelado" })
      .eq("id", id);
    if (!error) { toast({ title: "Transação cancelada" }); fetchTransacoes(); }
  };

  // Cálculos do resumo
  const confirmadas = transacoes.filter(t => t.status === "confirmado");
  const totalGeral = confirmadas.reduce((s, t) => s + t.amount, 0);
  const totalPorMetodo = (["dinheiro", "pix", "cartao", "boleto"] as PaymentMethod[]).map(m => ({
    method: m,
    total: confirmadas.filter(t => t.payment_method === m).reduce((s, t) => s + t.amount, 0),
    count: confirmadas.filter(t => t.payment_method === m).length,
  }));

  const handleImprimir = () => {
    const linhas = transacoes.map(t =>
      `${format(new Date(t.created_at), "HH:mm")} | ${t.donor_name.padEnd(20)} | ${formatCurrency(t.amount).padStart(12)} | ${methodLabel[t.payment_method]} | ${t.status}`
    ).join("\n");

    const relatorio = `
========================================
   RELATÓRIO DE DOAÇÕES — ${format(new Date(filterDate), "dd/MM/yyyy", { locale: ptBR })}
========================================

RESUMO GERAL
------------
Total de doações recebidas : ${formatCurrency(totalGeral)}
Quantidade de transações   : ${confirmadas.length}

POR MODALIDADE DE PAGAMENTO
----------------------------
${totalPorMetodo.map(m => `${methodLabel[m.method].padEnd(17)}: ${formatCurrency(m.total).padStart(12)}  (${m.count} doações)`).join("\n")}

DETALHAMENTO
------------
${linhas}

========================================
   Relatório gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
========================================`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<pre style="font-family:monospace;padding:20px">${relatorio}</pre>`);
      win.print();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-3xl text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-8 h-8 text-primary" /> Caixa de Doações
          </h1>
          <p className="text-slate-500 text-sm mt-1">Controle de recebimentos e movimentação diária.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleImprimir}>
            <Printer className="w-4 h-4" /> Relatório
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Nova Doação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Nova Doação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Nome do Doador</Label>
                  <Input placeholder='Nome completo ou "Anônimo"' value={donorName} onChange={e => setDonorName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Valor (R$)</Label>
                  <Input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Modalidade de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                      <SelectItem value="pix">📱 Pix</SelectItem>
                      <SelectItem value="cartao">💳 Cartão</SelectItem>
                      <SelectItem value="boleto">🧾 Boleto Bancário</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentMethod === "boleto" && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Boletos ficam pendentes até confirmação de compensação.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Observações (opcional)</Label>
                  <Textarea placeholder="Anotações sobre esta doação..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? "Registrando..." : "Confirmar Doação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44 rounded-xl" />
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Modalidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas modalidades</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="cartao">Cartão</SelectItem>
            <SelectItem value="boleto">Boleto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="md:col-span-4 rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total do Dia</p>
              <p className="text-3xl font-black text-primary">{formatCurrency(totalGeral)}</p>
              <p className="text-xs text-slate-400 mt-1">{confirmadas.length} doações confirmadas</p>
            </div>
            <TrendingUp className="w-12 h-12 text-primary/30" />
          </CardContent>
        </Card>
        {totalPorMetodo.map(m => (
          <Card key={m.method} className="rounded-2xl border-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg border ${methodColor[m.method]}`}>{methodIcon[m.method]}</span>
                <span className="text-sm font-bold text-slate-600">{methodLabel[m.method]}</span>
              </div>
              <p className="text-xl font-black text-slate-800">{formatCurrency(m.total)}</p>
              <p className="text-xs text-slate-400">{m.count} transações</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela de transações */}
      <Card className="rounded-2xl border-slate-100">
        <CardHeader className="border-b border-slate-50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-primary" />
            Movimentação — {format(new Date(filterDate + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardTitle>
          <CardDescription>{transacoes.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Carregando...</div>
          ) : transacoes.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhuma transação encontrada para este dia.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Hora</TableHead>
                  <TableHead>Doador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {format(new Date(t.created_at), "HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">{t.donor_name}</TableCell>
                    <TableCell className="font-bold text-slate-800">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold ${methodColor[t.payment_method]}`}>
                        {methodIcon[t.payment_method]} {methodLabel[t.payment_method]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t.status === "confirmado" && <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmado</Badge>}
                      {t.status === "pendente" && <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>}
                      {t.status === "cancelado" && <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{t.notes || "—"}</TableCell>
                    <TableCell>
                      {t.status === "pendente" && (
                        <Button size="sm" variant="outline" className="text-xs rounded-lg h-7" onClick={() => handleConfirmarBoleto(t.id)}>
                          Compensar
                        </Button>
                      )}
                      {t.status === "confirmado" && (
                        <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-600 rounded-lg h-7" onClick={() => handleCancelar(t.id)}>
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
