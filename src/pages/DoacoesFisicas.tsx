import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Gift, Plus, Search, User, CheckCircle2, Clock, XCircle,
  Scissors, Package, Pill, Car, Home, Building2, MapPin, HelpCircle, Baby, FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarReciboFisicoPDF } from "@/lib/reciboService";

type TipoDoacao =
  | "cabelo" | "fraldas_geriatricas" | "alimentos" | "remedios"
  | "veiculo" | "terreno" | "casa" | "predio_comercial" | "outro";

type Status = "pendente" | "recebido" | "cancelado";

interface DoacaoFisica {
  id: string;
  donor_id?: number;
  donor_name: string;
  tipo_doacao: TipoDoacao;
  subtipo?: string;
  descricao?: string;
  quantidade?: string;
  status: Status;
  observacoes?: string;
  created_at: string;
  recebido_em?: string;
}

interface DonorSuggestion {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

const tipoConfig: Record<TipoDoacao, { label: string; icon: React.ReactNode; color: string; hasSubtipo?: boolean; subtypes?: { value: string; label: string }[]; hasQuantidade?: boolean }> = {
  cabelo: {
    label: "Doação de Cabelo",
    icon: <Scissors className="w-4 h-4" />,
    color: "bg-pink-100 text-pink-700 border-pink-200",
    hasQuantidade: false,
  },
  fraldas_geriatricas: {
    label: "Fraldas Geriátricas",
    icon: <Baby className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    hasQuantidade: true,
  },
  alimentos: {
    label: "Alimentos",
    icon: <Package className="w-4 h-4" />,
    color: "bg-green-100 text-green-700 border-green-200",
    hasQuantidade: true,
  },
  remedios: {
    label: "Remédios",
    icon: <Pill className="w-4 h-4" />,
    color: "bg-red-100 text-red-700 border-red-200",
    hasQuantidade: true,
  },
  veiculo: {
    label: "Veículo",
    icon: <Car className="w-4 h-4" />,
    color: "bg-slate-100 text-slate-700 border-slate-200",
    hasSubtipo: true,
    subtypes: [
      { value: "carro", label: "Carro" },
      { value: "moto", label: "Moto" },
    ],
  },
  terreno: {
    label: "Terreno",
    icon: <MapPin className="w-4 h-4" />,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  casa: {
    label: "Casa",
    icon: <Home className="w-4 h-4" />,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  predio_comercial: {
    label: "Prédio Comercial",
    icon: <Building2 className="w-4 h-4" />,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  outro: {
    label: "Outro",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    hasQuantidade: true,
  },
};

const imoveis: TipoDoacao[] = ["terreno", "casa", "predio_comercial"];

interface OrgSettings {
  system_name?: string;
  logo_url?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export default function DoacoesFisicas() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [doacoes, setDoacoes] = useState<DoacaoFisica[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({});
  const [emittingReceipt, setEmittingReceipt] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Form
  const [donorName, setDonorName] = useState("");
  const [donorId, setDonorId] = useState<number | null>(null);
  const [tipoDoacao, setTipoDoacao] = useState<TipoDoacao>("alimentos");
  const [subtipo, setSubtipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

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

  const searchDonors = async (term: string) => {
    setDonorId(null);
    if (term.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    const { data } = await supabase
      .from("donors").select("id, name, email, phone")
      .ilike("name", `%${term}%`).limit(8);
    setSuggestions(data || []);
    setShowSuggestions(true);
    setSearching(false);
  };

  const selectDonor = (d: DonorSuggestion) => {
    setDonorName(d.name); setDonorId(d.id);
    setSuggestions([]); setShowSuggestions(false);
  };

  const resetForm = () => {
    setDonorName(""); setDonorId(null); setTipoDoacao("alimentos");
    setSubtipo(""); setDescricao(""); setQuantidade(""); setObservacoes("");
    setSuggestions([]); setShowSuggestions(false);
  };

  const fetchDoacoes = async () => {
    setLoading(true);
    let query = supabase.from("doacoes_fisicas").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "todos") query = query.eq("status", filterStatus);
    if (filterTipo !== "todos") query = query.eq("tipo_doacao", filterTipo);
    if (searchTerm) query = query.ilike("donor_name", `%${searchTerm}%`);
    const { data, error } = await query;
    if (!error && data) setDoacoes(data as DoacaoFisica[]);
    setLoading(false);
  };

  useEffect(() => { fetchDoacoes(); }, [filterStatus, filterTipo, searchTerm]);

  useEffect(() => {
    supabase.from("white_label_settings").select("system_name,logo_url,cnpj,address,phone,email")
      .eq("id", 1).maybeSingle().then(({ data }) => { if (data) setOrgSettings(data); });
  }, []);

  const handleEmitirReciboFisico = async (d: DoacaoFisica) => {
    setEmittingReceipt(d.id);
    try {
      await gerarReciboFisicoPDF({
        donor_name: d.donor_name,
        tipo_doacao: d.tipo_doacao,
        subtipo: d.subtipo,
        descricao: d.descricao,
        quantidade: d.quantidade,
        observacoes: d.observacoes,
        status: d.status,
        created_at: d.created_at,
        recebido_em: d.recebido_em,
        org: orgSettings,
      });
    } catch {
      toast({ title: "Erro ao gerar recibo", variant: "destructive" });
    } finally {
      setEmittingReceipt(null);
    }
  };

  const handleSave = async () => {
    if (!donorName.trim()) { toast({ title: "Informe o nome do doador", variant: "destructive" }); return; }
    if (!tipoDoacao) { toast({ title: "Selecione o tipo de doação", variant: "destructive" }); return; }
    const cfg = tipoConfig[tipoDoacao];
    if (cfg.hasSubtipo && !subtipo) { toast({ title: "Selecione o subtipo", variant: "destructive" }); return; }

    setSaving(true);
    const { error } = await supabase.from("doacoes_fisicas").insert({
      donor_id: donorId,
      donor_name: donorName.trim(),
      tipo_doacao: tipoDoacao,
      subtipo: subtipo || null,
      descricao: descricao.trim() || null,
      quantidade: quantidade.trim() || null,
      observacoes: observacoes.trim() || null,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Doação registrada!", description: `${tipoConfig[tipoDoacao].label} de ${donorName}` });
      resetForm(); setOpenDialog(false); fetchDoacoes();
    }
    setSaving(false);
  };

  const handleReceberDoacao = async (id: string) => {
    const { error } = await supabase.from("doacoes_fisicas")
      .update({ status: "recebido", recebido_em: new Date().toISOString() }).eq("id", id);
    if (!error) { toast({ title: "Doação marcada como recebida!" }); fetchDoacoes(); }
  };

  const handleCancelar = async (id: string) => {
    const { error } = await supabase.from("doacoes_fisicas").update({ status: "cancelado" }).eq("id", id);
    if (!error) { toast({ title: "Doação cancelada" }); fetchDoacoes(); }
  };

  // Totais por tipo
  const totais = (Object.keys(tipoConfig) as TipoDoacao[]).map(t => ({
    tipo: t,
    count: doacoes.filter(d => d.tipo_doacao === t).length,
    recebidas: doacoes.filter(d => d.tipo_doacao === t && d.status === "recebido").length,
  })).filter(t => t.count > 0);

  const cfg = tipoConfig[tipoDoacao];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-black text-3xl text-slate-900 tracking-tight flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary" /> Doações Físicas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registro e controle de doações materiais recebidas.</p>
        </div>

        <Dialog open={openDialog} onOpenChange={(v) => { setOpenDialog(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> Nova Doação Física</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Doação Física</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">

              {/* Identificação do Doador */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Identificação do Doador</p>
                <div className="relative" ref={searchRef}>
                  <Label className="mb-1 block">Nome do Doador</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Pesquisar doador cadastrado ou digitar..."
                      value={donorName}
                      onChange={e => { setDonorName(e.target.value); searchDonors(e.target.value); }}
                      className="pl-9 pr-9 bg-white"
                    />
                    {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">buscando...</span>}
                    {donorId && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden mt-1">
                      {suggestions.map(d => (
                        <button key={d.id} type="button"
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                          onClick={() => selectDonor(d)}>
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{d.name}</p>
                            <p className="text-xs text-slate-400">{d.email}{d.phone ? ` • ${d.phone}` : ""}</p>
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
              </div>

              {/* Tipo de Doação */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo de Doação</p>

                <div className="space-y-1">
                  <Label>Modalidade</Label>
                  <Select value={tipoDoacao} onValueChange={v => { setTipoDoacao(v as TipoDoacao); setSubtipo(""); }}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cabelo">✂️ Doação de Cabelo</SelectItem>
                      <SelectItem value="fraldas_geriatricas">🍼 Fraldas Geriátricas</SelectItem>
                      <SelectItem value="alimentos">🥫 Alimentos</SelectItem>
                      <SelectItem value="remedios">💊 Remédios</SelectItem>
                      <SelectItem value="veiculo">🚗 Veículo</SelectItem>
                      <SelectItem value="terreno">📍 Terreno</SelectItem>
                      <SelectItem value="casa">🏠 Casa</SelectItem>
                      <SelectItem value="predio_comercial">🏢 Prédio Comercial</SelectItem>
                      <SelectItem value="outro">📦 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subtipo veículo */}
                {cfg.hasSubtipo && cfg.subtypes && (
                  <div className="space-y-1">
                    <Label>Tipo de Veículo</Label>
                    <Select value={subtipo} onValueChange={setSubtipo}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {cfg.subtypes.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quantidade para itens */}
                {cfg.hasQuantidade && (
                  <div className="space-y-1">
                    <Label>Quantidade / Peso / Volume</Label>
                    <Input placeholder="Ex: 10 kg, 5 caixas, 20 unidades" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="bg-white" />
                  </div>
                )}

                {/* Descrição para imóveis e veículos */}
                {(cfg.hasSubtipo || imoveis.includes(tipoDoacao) || tipoDoacao === "outro" || tipoDoacao === "cabelo") && (
                  <div className="space-y-1">
                    <Label>Descrição {imoveis.includes(tipoDoacao) ? "(endereço, metragem...)" : tipoDoacao === "veiculo" ? "(modelo, ano, placa...)" : tipoDoacao === "cabelo" ? "(comprimento, cor...)" : ""}</Label>
                    <Textarea placeholder="Detalhes sobre a doação..." value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} className="bg-white" />
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Observações (opcional)</Label>
                  <Textarea placeholder="Informações adicionais..." value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className="bg-white" />
                </div>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Registrando..." : "Registrar Doação Física"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar doador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-52 rounded-xl" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="cabelo">✂️ Cabelo</SelectItem>
            <SelectItem value="fraldas_geriatricas">🍼 Fraldas</SelectItem>
            <SelectItem value="alimentos">🥫 Alimentos</SelectItem>
            <SelectItem value="remedios">💊 Remédios</SelectItem>
            <SelectItem value="veiculo">🚗 Veículo</SelectItem>
            <SelectItem value="terreno">📍 Terreno</SelectItem>
            <SelectItem value="casa">🏠 Casa</SelectItem>
            <SelectItem value="predio_comercial">🏢 Prédio Comercial</SelectItem>
            <SelectItem value="outro">📦 Outro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards por tipo */}
      {totais.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {totais.map(t => {
            const c = tipoConfig[t.tipo];
            return (
              <Card key={t.tipo} className="rounded-2xl border-slate-100 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setFilterTipo(t.tipo)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-1.5 rounded-lg border ${c.color}`}>{c.icon}</span>
                    <span className="text-xs font-bold text-slate-600">{c.label}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{t.count}</p>
                  <p className="text-xs text-slate-400">{t.recebidas} recebidas</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabela */}
      <Card className="rounded-2xl border-slate-100">
        <CardHeader className="border-b border-slate-50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" /> Registros de Doações Físicas
          </CardTitle>
          <CardDescription>{doacoes.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Carregando...</div>
          ) : doacoes.length === 0 ? (
            <div className="p-8 text-center">
              <Gift className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Nenhuma doação física registrada.</p>
              <p className="text-slate-300 text-sm mt-1">Clique em "Nova Doação Física" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Doador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição / Qtd.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doacoes.map(d => {
                  const c = tipoConfig[d.tipo_doacao];
                  const tipoLabel = d.subtipo
                    ? `${c.label} — ${d.subtipo.charAt(0).toUpperCase() + d.subtipo.slice(1)}`
                    : c.label;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs text-slate-500 font-mono whitespace-nowrap">
                        {format(new Date(d.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{d.donor_name}</p>
                            {d.donor_id && <p className="text-xs text-slate-400">Doador cadastrado</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold ${c.color}`}>
                          {c.icon} {tipoLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[200px]">
                        <div>
                          {d.quantidade && <p className="text-xs font-medium">{d.quantidade}</p>}
                          {d.descricao && <p className="text-xs text-slate-400 truncate">{d.descricao}</p>}
                          {!d.quantidade && !d.descricao && <span className="text-slate-300">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {d.status === "recebido" && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Recebido
                          </Badge>
                        )}
                        {d.status === "pendente" && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 gap-1">
                            <Clock className="w-3 h-3" /> Pendente
                          </Badge>
                        )}
                        {d.status === "cancelado" && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1">
                            <XCircle className="w-3 h-3" /> Cancelado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {d.status === "pendente" && (
                            <Button size="sm" variant="outline" className="text-xs rounded-lg h-7 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleReceberDoacao(d.id)}>
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Receber
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-xs rounded-lg h-7 text-blue-600 border-blue-200 hover:bg-blue-50 px-2"
                            onClick={() => handleEmitirReciboFisico(d)}
                            disabled={emittingReceipt === d.id}
                            title="Emitir Recibo PDF">
                            <FileText className="w-3 h-3" />
                          </Button>
                          {d.status !== "cancelado" && d.status !== "recebido" && (
                            <Button size="sm" variant="ghost" className="text-xs rounded-lg h-7 text-red-500 hover:text-red-600 px-2"
                              onClick={() => handleCancelar(d.id)}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
