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
  Search, User, Receipt, Link2, MessageCircle, AlertCircle, RotateCcw,
  Unlock, Lock, Coins, CalendarDays, History, Info,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarReciboPDF } from "@/lib/reciboService";
import { metaService, MetaConfig } from "@/services/metaService";

// Link de validação pública — aponta para a rota do frontend
const receiptUrl = (hash: string) =>
  `${window.location.origin}/validate-receipt/${hash}`;

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
    address_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address?: any;
    phone?: string;
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

  // Cashier status state
  const [cashierData, setCashierData] = useState<any>(null);
  const [cashierLoading, setCashierLoading] = useState(true);
  const [openCashierDialog, setOpenCashierDialog] = useState(false);
  const [closeCashierDialog, setCloseCashierDialog] = useState(false);
  const [saldoInicial, setSaldoInicial] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

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
  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null);

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
    const saved = localStorage.getItem("meta_config");
    if (saved) {
      try { setMetaConfig(JSON.parse(saved)); } catch { /* config inválida */ }
    }
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
          address, zip_code, address_number, neighborhood, city, state, phone
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

  const fetchCashierStatus = async () => {
    setCashierLoading(true);
    const { data, error } = await supabase
      .from("caixas_dia")
      .select("*")
      .eq("data_movimento", filterDate)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar status do caixa:", error.message);
    } else {
      setCashierData(data);
    }
    setCashierLoading(false);
  };

  useEffect(() => {
    fetchTransacoes();
    fetchCashierStatus();
  }, [filterDate, filterMethod]);

  const handleSave = async () => {
    if (cashierData?.status === "fechado") {
      toast({ title: "Caixa Fechado", description: "Não é possível registrar doações em um caixa fechado.", variant: "destructive" });
      return;
    }
    if (!cashierData && filterDate === format(new Date(), "yyyy-MM-dd")) {
      toast({ title: "Caixa não aberto", description: "Abra o caixa antes de registrar doações.", variant: "destructive" });
      setOpenCashierDialog(true);
      return;
    }

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
      // Atualiza o resumo do caixa se for para o dia atual (opcional, já que fetchTransacoes roda)
      // Emitir recibo automaticamente se confirmado
      if (data && data.status === "confirmado") {
        setTimeout(() => emitirRecibo(data as Transacao), 500);
      }
    }
    setSaving(false);
  };

  const handleAbrirCaixa = async () => {
    setSaving(true);
    const { error } = await supabase.from("caixas_dia").insert({
      data_movimento: filterDate,
      saldo_inicial: parseFloat(saldoInicial.replace(",", ".")) || 0,
      status: "aberto",
    });

    if (error) {
      toast({ title: "Erro ao abrir caixa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Caixa Aberto!", description: `Data: ${format(new Date(filterDate + "T12:00:00"), "dd/MM/yyyy")}` });
      setOpenCashierDialog(false);
      fetchCashierStatus();
    }
    setSaving(false);
  };

  const handleFecharCaixa = async () => {
    setSaving(true);
    const totals = {
      dinheiro: confirmadas.filter(t => t.payment_method === "dinheiro").reduce((s, t) => s + t.amount, 0),
      pix: confirmadas.filter(t => t.payment_method === "pix").reduce((s, t) => s + t.amount, 0),
      cartao: confirmadas.filter(t => t.payment_method === "cartao").reduce((s, t) => s + t.amount, 0),
      boleto: confirmadas.filter(t => t.payment_method === "boleto").reduce((s, t) => s + t.amount, 0),
    };

    const { error } = await supabase.from("caixas_dia").update({
      status: "fechado",
      total_dinheiro: totals.dinheiro,
      total_pix: totals.pix,
      total_cartao: totals.cartao,
      total_boleto: totals.boleto,
      total_geral: totalGeral,
      qtd_transacoes: confirmadas.length,
      fechado_por: user?.id,
      fechado_em: new Date().toISOString(),
      observacoes: closingNotes.trim() || null,
    }).eq("data_movimento", filterDate);

    if (error) {
      toast({ title: "Erro ao fechar caixa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Caixa Fechado com Sucesso!", description: "O resumo do dia foi armazenado." });
      setCloseCashierDialog(false);
      fetchCashierStatus();
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

  const handleDesfazerCancelamento = async (t: Transacao) => {
    // Boleto sem compensação volta para pendente; qualquer outro volta para confirmado
    const statusAnterior: Status =
      t.payment_method === "boleto" && !t.compensated_at ? "pendente" : "confirmado";
    const { error } = await supabase
      .from("caixa_transacoes")
      .update({ status: statusAnterior })
      .eq("id", t.id);
    if (!error) {
      toast({ title: "Cancelamento desfeito", description: `Status restaurado para "${statusAnterior}"` });
      fetchTransacoes();
    }
  };

  const emitirRecibo = async (t: Transacao) => {
    setEmittingId(t.id);
    try {
      // Formatar endereço do doador
      let end = "";
      if (t.donors) {
        const d = t.donors;
        // Tenta usar o campo 'address' que agora mapeamos (que pode ser string ou objeto)
        const street = typeof d.address === 'string' ? d.address : d.address?.logradouro;
        if (street) {
          end = `${street}${d.address_number ? `, ${d.address_number}` : ""}${d.neighborhood ? ` - ${d.neighborhood}` : ""}${d.city ? ` - ${d.city}/${d.state}` : ""}`;
        }
      }

      return await gerarReciboPDF({
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
        returnBlob: (t as any).returnBlob,
      });
    } catch (e) {
      console.error("Erro recibo:", e);
      toast({ title: "Erro ao gerar recibo", variant: "destructive" });
    }
    setEmittingId(null);
  };

  const copiarLink = (t: Transacao) => {
    if (!t.validation_hash) { toast({ title: "Recibo não gerado ainda", variant: "destructive" }); return; }
    const url = receiptUrl(t.validation_hash);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  const compartilharWhatsApp = async (t: Transacao) => {
    if (!t.validation_hash) { toast({ title: "Recibo não gerado ainda", variant: "destructive" }); return; }

    const url = receiptUrl(t.validation_hash);
    const mensagem =
      `Olá ${t.donor_name}! 🙏\n\nRecebemos sua doação de *${formatCurrency(t.amount)}* via ${methodLabel(t.payment_method, t.cartao_tipo)}.\n\n✅ Recibo: *${t.receipt_number}*\n🔗 Ver recibo: ${url}\n\nObrigado pela sua generosidade!`;

    const donorPhone = t.donors?.phone?.replace(/\D/g, "");
    const metaOk = metaConfig?.phone_number_id && metaConfig?.access_token;

    if (metaOk && donorPhone) {
      try {
        await metaService.sendTextMessage(donorPhone, mensagem, metaConfig!, t.donor_id ?? undefined);
        toast({ title: "Recibo enviado via WhatsApp!", description: `Para ${t.donor_name} (${donorPhone})` });
      } catch (e: any) {
        toast({ title: "Erro ao enviar via Meta API", description: e.message, variant: "destructive" });
      }
    } else {
      if (metaOk && !donorPhone) {
        toast({ title: "Doador sem telefone cadastrado", description: "Abrindo WhatsApp Web como alternativa." });
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
    }
  };

  // Resumo
  const confirmadas = transacoes.filter(t => t.status === "confirmado");
  const totalRecebido = confirmadas.reduce((s, t) => s + t.amount, 0);
  const saldoInicialNum = cashierData?.saldo_inicial ? parseFloat(cashierData.saldo_inicial) : 0;
  
  // O total geral no caixa físico deve considerar o saldo inicial (troco)
  const totalGeral = totalRecebido + saldoInicialNum;

  const totalPorMetodo = (["dinheiro", "pix", "cartao", "boleto"] as PaymentMethod[]).map(m => {
    let total = confirmadas.filter(t => t.payment_method === m).reduce((s, t) => s + t.amount, 0);
    // Adiciona o saldo inicial apenas no card de dinheiro
    if (m === "dinheiro") total += saldoInicialNum;
    
    return {
      method: m,
      total: total,
      count: confirmadas.filter(t => t.payment_method === m).length,
    };
  });

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

      {/* Filtros e Status do Dia */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <Input 
              type="date" 
              value={filterDate} 
              onChange={e => setFilterDate(e.target.value)} 
              className="pl-9 w-44 rounded-xl border-slate-200 focus:ring-primary/20 transition-all" 
            />
          </div>
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="w-44 rounded-xl border-slate-200"><SelectValue placeholder="Modalidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas modalidades</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {cashierLoading ? (
            <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-xl" />
          ) : !cashierData ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 py-1.5 px-3 rounded-lg">
                <History className="w-3 h-3 mr-1.5" />Não Iniciado
              </Badge>
              {filterDate === format(new Date(), "yyyy-MM-dd") && (
                <Button size="sm" onClick={() => setOpenCashierDialog(true)} className="rounded-xl gap-2 shadow-sm">
                  <Unlock className="w-3.5 h-3.5" /> Abrir Caixa
                </Button>
              )}
            </div>
          ) : cashierData.status === "aberto" ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-50 text-green-600 border-green-100 py-1.5 px-3 rounded-lg hover:bg-green-50">
                <Unlock className="w-3.5 h-3.5 mr-1.5 shadow-sm" /> Caixa Aberto
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setCloseCashierDialog(true)} className="rounded-xl gap-2 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                <Lock className="w-3.5 h-3.5" /> Fechar Caixa
              </Button>
            </div>
          ) : (
            <Badge className="bg-red-50 text-red-600 border-red-100 py-1.5 px-3 rounded-lg hover:bg-red-50">
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Caixa Fechado
            </Badge>
          )}
        </div>
      </div>

      {/* Diálogo de Abertura de Caixa */}
      <Dialog open={openCashierDialog} onOpenChange={setOpenCashierDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-primary" /> Abrir Caixa do Dia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <Info className="w-4 h-4" /> Data do Movimento
              </p>
              <p className="text-lg font-bold text-slate-900">
                {format(new Date(filterDate + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold">Saldo Inicial (Troco em Dinheiro)</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="0,00" 
                  value={saldoInicial} 
                  onChange={e => setSaldoInicial(e.target.value)} 
                  className="pl-9 rounded-xl focus:ring-primary/20"
                />
              </div>
              <p className="text-xs text-slate-400">Informe o valor em espécie disponível para início das operações.</p>
            </div>

            <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/20" onClick={handleAbrirCaixa} disabled={saving}>
              {saving ? "Processando..." : "Confirmar Abertura de Caixa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Fechamento de Caixa */}
      <Dialog open={closeCashierDialog} onOpenChange={setCloseCashierDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-500" /> Fechamento de Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo Financeiro</p>
              <div className="grid grid-cols-2 gap-4">
                {totalPorMetodo.map(m => (
                  <div key={m.method}>
                    <p className="text-xs text-slate-500">{methodLabel(m.method)}</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(m.total)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <p className="text-sm font-bold text-slate-600">Total Geral</p>
                <p className="text-xl font-black text-primary">{formatCurrency(totalGeral)}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold">Observações de Fechamento</Label>
              <Textarea 
                placeholder="Ex: Diferença de valores, notas sobre sangria, etc..." 
                value={closingNotes} 
                onChange={e => setClosingNotes(e.target.value)}
                className="rounded-xl focus:ring-primary/20"
                rows={3}
              />
            </div>

            <Button variant="destructive" className="w-full h-11 rounded-xl shadow-lg shadow-red-200" onClick={handleFecharCaixa} disabled={saving}>
              {saving ? "Fechando..." : "Confirmar Fechamento Definitivo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`md:col-span-4 rounded-2xl transition-all duration-300 ${
          cashierData?.status === "fechado" 
            ? "border-slate-200 bg-slate-50 opacity-90 shadow-none" 
            : "border-primary/20 bg-primary/5 shadow-md shadow-primary/5"
        }`}>
          <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500 font-medium">Saldo em Caixa (Físico + Digital)</p>
                {cashierData?.status === "fechado" && <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-none">Encerrado</Badge>}
              </div>
              <p className={`text-4xl font-black ${cashierData?.status === "fechado" ? "text-slate-600" : "text-primary"}`}>
                {formatCurrency(totalGeral)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> {confirmadas.length} doações confirmadas</span>
                {saldoInicialNum > 0 && (
                  <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-orange-400" /> Saldo Inicial: {formatCurrency(saldoInicialNum)}</span>
                )}
                {cashierData?.status === "fechado" && cashierData.fechado_em && (
                  <span className="flex items-center gap-1"><History className="w-3 h-3" /> Fechado em: {format(new Date(cashierData.fechado_em), "HH:mm")}</span>
                )}
              </div>
            </div>
            {cashierData?.status === "fechado" ? (
              <div className="flex flex-col items-end text-right">
                <Lock className="w-10 h-10 text-slate-300 mb-1" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Caixa Auditado</p>
              </div>
            ) : (
              <TrendingUp className="w-12 h-12 text-primary/30" />
            )}
          </CardContent>
        </Card>
        
        {totalPorMetodo.map(m => (
          <Card key={m.method} className={`rounded-2xl transition-all ${
            cashierData?.status === "fechado" 
              ? "border-slate-100 bg-slate-50/50 shadow-none" 
              : "border-slate-100 hover:shadow-md hover:border-slate-200"
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg border ${
                  cashierData?.status === "fechado" ? "bg-slate-100 text-slate-400 border-slate-200" : methodColor[m.method]
                }`}>
                  {methodIcon[m.method]}
                </span>
                <span className={`text-sm font-bold ${cashierData?.status === "fechado" ? "text-slate-400" : "text-slate-600"}`}>
                  {methodLabel(m.method)}
                </span>
              </div>
              <p className={`text-xl font-black ${cashierData?.status === "fechado" ? "text-slate-500" : "text-slate-800"}`}>
                {formatCurrency(m.total)}
              </p>
              <p className="text-[10px] font-medium text-slate-400">{m.count} transações no período</p>
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
                      {t.status === "cancelado" && <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1"><XCircle className="w-3 h-3" />Cancelado</Badge>}
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
                        {t.status === "cancelado" && (
                          <Button size="sm" variant="outline" className="text-xs rounded-lg h-7 gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => handleDesfazerCancelamento(t)}
                            title="Desfazer cancelamento">
                            <RotateCcw className="w-3 h-3" /> Desfazer
                          </Button>
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
