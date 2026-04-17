import { useState, useEffect, useRef } from "react";
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
  Search, User, Receipt, Link2, MessageCircle, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarReciboPDF } from "@/lib/reciboService";

type PaymentMethod = "dinheiro" | "pix" | "cartao" | "boleto";
type CartaoTipo = "debito" | "credito";
type Status = "confirmado" | "pendente" | "cancelado";

interface Transacao {
  id: string;
  donor_id?: number;
  donor_name: string;
  amount: number;
  payment_method: PaymentMethod;
  cartao_tipo?: CartaoTipo;
  status: Status;
  notes?: string;
  receipt_number?: string;
  validation_hash?: string;
  created_at: string;
  compensated_at?: string;
  profiles?: { name: string };
  donors?: {
    logradouro?: string;
    address_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address?: any;
  };
}

interface DonorSuggestion {
  id: number;
  name: string;
  email: string;
  document_id?: string;
}

const methodLabel = (method: PaymentMethod, tipo?: CartaoTipo): string => {
  if (method === "cartao") return tipo === "debito" ? "Cartão de Débito" : tipo === "credito" ? "Cartão de Crédito" : "Cartão";
  return { dinheiro: "Dinheiro", pix: "Pix", boleto: "Boleto" }[method] || method;
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
  const [orgSettings, setOrgSettings] = useState<any>(null);

  // Form state
  const [donorName, setDonorName] = useState("");
  const [donorId, setDonorId] = useState<number | null>(null);
  const [donorCpf, setDonorCpf] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cartaoTipo, setCartaoTipo] = useState<CartaoTipo>("debito");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [emittingId, setEmittingId] = useState<string | null>(null);

  // Donor search
  const [suggestions, setSuggestions] = useState<DonorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    supabase.from("white_label_settings").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => { if (data) setOrgSettings(data); });
  }, []);

  const searchDonors = async (term: string) => {
    setDonorId(null); setDonorCpf("");
    if (term.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    const { data } = await supabase
      .from("donors").select("id, name, email, document_id")
      .ilike("name", `%${term}%`).limit(8);
    setSuggestions(data || []);
    setShowSuggestions(true);
    setSearching(false);
  };

  const selectDonor = (donor: DonorSuggestion) => {
    setDonorName(donor.name);
    setDonorId(donor.id);
    setDonorCpf(donor.document_id || "");
    setSuggestions([]); setShowSuggestions(false);
  };

  const resetForm = () => {
    setDonorName(""); setDonorId(null); setDonorCpf(""); setAmount("");
    setNotes(""); setPaymentMethod("pix"); setCartaoTipo("debito");
    setSuggestions([]); setShowSuggestions(false);
  };

  const fetchTransacoes = async () => {
    setLoading(true);

    // Converte a data selecionada para UTC respeitando o fuso horário local
    const start = new Date(`${filterDate}T00:00:00`).toISOString();
    const end   = new Date(`${filterDate}T23:59:59`).toISOString();

    let query = supabase
      .from("caixa_transacoes").select(`
        *,
        profiles ( name ),
        donors ( 
          logradouro, address_number, neighborhood, city, state, zip_code, address
        )
      `)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (filterMethod !== "todos") query = query.eq("payment_method", filterMethod);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar transações:", error.message);
      toast({ title: "Erro ao carregar transações", description: error.message, variant: "destructive" });
    } else {
      setTransacoes((data || []) as Transacao[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTransacoes(); }, [filterDate, filterMethod]);

  const handleSave = async () => {
    if (!donorName.trim()) { toast({ title: "Informe o nome do doador", variant: "destructive" }); return; }
    if (!amount || parseFloat(amount) <= 0) { toast({ title: "Informe um valor válido", variant: "destructive" }); return; }

    setSaving(true);
    const { data, error } = await supabase.from("caixa_transacoes").insert({
      donor_id: donorId,
      donor_name: donorName.trim() || "Anônimo",
      amount: parseFloat(amount.replace(",", ".")),
      payment_method: paymentMethod,
      cartao_tipo: paymentMethod === "cartao" ? cartaoTipo : null,
      status: paymentMethod === "boleto" ? "pendente" : "confirmado",
      notes: notes.trim() || null,
      created_by: user?.id,
    }).select().single();

    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Doação registrada!", description: `R$ ${amount} via ${methodLabel(paymentMethod, paymentMethod === "cartao" ? cartaoTipo : undefined)}` });
      resetForm();
      setOpenDialog(false);
      fetchTransacoes();
      // Emitir recibo automaticamente se confirmado
      if (data && data.status === "confirmado") {
        setTimeout(() => emitirRecibo(data as Transacao), 500);
      }
    }
    setSaving(false);
  };

  const handleConfirmarBoleto = async (id: string) => {
    const { data, error } = await supabase
      .from("caixa_transacoes")
      .update({ status: "confirmado", compensated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (!error) {
      toast({ title: "Boleto compensado!" });
      fetchTransacoes();
      if (data) setTimeout(() => emitirRecibo(data as Transacao), 500);
    }
  };

  const handleCancelar = async (id: string) => {
    const { error } = await supabase.from("caixa_transacoes").update({ status: "cancelado" }).eq("id", id);
    if (!error) { toast({ title: "Transação cancelada" }); fetchTransacoes(); }
  };

  const emitirRecibo = async (t: Transacao) => {
    setEmittingId(t.id);
    try {
      // Formatar endereço do doador
      let end = "";
      if (t.donors) {
        const d = t.donors;
        if (d.logradouro) {
          end = `${d.logradouro}${d.address_number ? `, ${d.address_number}` : ""}${d.neighborhood ? ` - ${d.neighborhood}` : ""}${d.city ? ` - ${d.city}/${d.state}` : ""}`;
        } else if (d.address && typeof d.address === 'object' && d.address.logradouro) {
          const a = d.address;
          end = `${a.logradouro}${a.numero ? `, ${a.numero}` : ""}${a.bairro ? ` - ${a.bairro}` : ""}${a.cidade ? ` - ${a.cidade}/${a.uf}` : ""}`;
        }
      }

      await gerarReciboPDF({
        receipt_number: t.receipt_number || t.id.slice(0, 8).toUpperCase(),
        validation_hash: t.validation_hash || t.id,
        donor_name: t.donor_name,
        donor_address: end || undefined,
        received_by: t.profiles?.name,
        amount: t.amount,
        payment_method: t.payment_method,
        cartao_tipo: t.cartao_tipo,
        notes: t.notes,
        created_at: t.created_at,
        org: {
          system_name: orgSettings?.system_name,
          logo_url: orgSettings?.logo_url,
          cnpj: orgSettings?.cnpj,
          address: orgSettings?.address,
          phone: orgSettings?.phone,
          email: orgSettings?.email,
        },
      });
    } catch (e) {
      console.error("Erro recibo:", e);
      toast({ title: "Erro ao gerar recibo", variant: "destructive" });
    }
    setEmittingId(null);
  };

  const copiarLink = (t: Transacao) => {
    if (!t.validation_hash) { toast({ title: "Recibo não gerado ainda", variant: "destructive" }); return; }
    const url = `${window.location.origin}/validate-receipt/${t.validation_hash}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  const compartilharWhatsApp = (t: Transacao) => {
    if (!t.validation_hash) { toast({ title: "Recibo não gerado ainda", variant: "destructive" }); return; }
    const url = `${window.location.origin}/validate-receipt/${t.validation_hash}`;
    const msg = encodeURIComponent(
      `Olá ${t.donor_name}! Segue o recibo da sua doação de ${formatCurrency(t.amount)}.\n✅ Recibo: ${t.receipt_number}\n🔗 Validar: ${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  // Resumo
  const confirmadas = transacoes.filter(t => t.status === "confirmado");
  const totalGeral = confirmadas.reduce((s, t) => s + t.amount, 0);
  const totalPorMetodo = (["dinheiro", "pix", "cartao", "boleto"] as PaymentMethod[]).map(m => ({
    method: m,
    total: confirmadas.filter(t => t.payment_method === m).reduce((s, t) => s + t.amount, 0),
    count: confirmadas.filter(t => t.payment_method === m).length,
  }));

  const handleImprimir = () => {
    const linhas = transacoes.map(t =>
      `${format(new Date(t.created_at), "HH:mm")} | ${t.donor_name.padEnd(20)} | ${formatCurrency(t.amount).padStart(12)} | ${methodLabel(t.payment_method, t.cartao_tipo)} | ${t.status}`
    ).join("\n");
    const relatorio = `========================================\n   RELATÓRIO DE DOAÇÕES — ${format(new Date(filterDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}\n========================================\n\nRESUMO GERAL\n------------\nTotal: ${formatCurrency(totalGeral)}\nQuantidade: ${confirmadas.length}\n\nPOR MODALIDADE\n----------------------------\n${totalPorMetodo.map(m => `${methodLabel(m.method).padEnd(17)}: ${formatCurrency(m.total)}  (${m.count})`).join("\n")}\n\nDETALHAMENTO\n------------\n${linhas}\n\n========================================\n   Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}\n========================================`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(`<pre style="font-family:monospace;padding:20px">${relatorio}</pre>`); win.print(); }
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
          <Button variant="ghost" className="gap-2 rounded-xl" onClick={fetchTransacoes} disabled={loading}>
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Atualizar
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleImprimir}>
            <Printer className="w-4 h-4" /> Relatório
          </Button>
          <Dialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Nova Doação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Registrar Nova Doação</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">

                {/* Busca de doador */}
                <div className="space-y-1 relative" ref={searchRef}>
                  <Label>Nome do Doador</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Pesquisar doador ou digitar manualmente..."
                      value={donorName}
                      onChange={e => { setDonorName(e.target.value); searchDonors(e.target.value); }}
                      className="pl-9 pr-9"
                    />
                    {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">buscando...</span>}
                    {donorId && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {suggestions.map(d => (
                        <button key={d.id} type="button"
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                          onClick={() => selectDonor(d)}>
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{d.name}</p>
                            <p className="text-xs text-slate-400">{d.email}</p>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                        Não encontrou? Será registrado manualmente.
                      </div>
                    </div>
                  )}
                  {showSuggestions && suggestions.length === 0 && donorName.length >= 2 && !searching && (
                    <p className="text-xs text-slate-400 mt-1">Nenhum doador encontrado — registrando manualmente.</p>
                  )}
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
                </div>

                {paymentMethod === "cartao" && (
                  <div className="space-y-1">
                    <Label>Tipo do Cartão</Label>
                    <Select value={cartaoTipo} onValueChange={v => setCartaoTipo(v as CartaoTipo)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debito">💳 Débito</SelectItem>
                        <SelectItem value="credito">💳 Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentMethod === "boleto" && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700">Boletos ficam pendentes até confirmação de compensação bancária. O recibo só será emitido após compensação.</p>
                  </div>
                )}

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
                <span className="text-sm font-bold text-slate-600">{methodLabel(m.method)}</span>
              </div>
              <p className="text-xl font-black text-slate-800">{formatCurrency(m.total)}</p>
              <p className="text-xs text-slate-400">{m.count} transações</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
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
                  <TableHead>Nº Recibo</TableHead>
                  <TableHead>Doador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transacoes.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {format(new Date(t.created_at), "HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600">
                      {t.receipt_number || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{t.donor_name}</TableCell>
                    <TableCell className="font-bold text-slate-800">{formatCurrency(t.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold ${methodColor[t.payment_method]}`}>
                        {methodIcon[t.payment_method]} {methodLabel(t.payment_method, t.cartao_tipo)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t.status === "confirmado" && <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmado</Badge>}
                      {t.status === "pendente" && <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>}
                      {t.status === "cancelado" && <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {t.status === "pendente" && (
                          <Button size="sm" variant="outline" className="text-xs rounded-lg h-7" onClick={() => handleConfirmarBoleto(t.id)}>
                            Compensar
                          </Button>
                        )}
                        {t.status === "confirmado" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs rounded-lg h-7 gap-1" disabled={emittingId === t.id} onClick={() => emitirRecibo(t)}>
                              <Receipt className="w-3 h-3" />{emittingId === t.id ? "..." : "Recibo"}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs rounded-lg h-7 px-2" onClick={() => copiarLink(t)} title="Copiar link de validação">
                              <Link2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs rounded-lg h-7 px-2 text-green-600" onClick={() => compartilharWhatsApp(t)} title="Enviar via WhatsApp">
                              <MessageCircle className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-600 rounded-lg h-7 px-2" onClick={() => handleCancelar(t.id)}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
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
