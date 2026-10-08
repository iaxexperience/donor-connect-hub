import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { setorService, Setor } from "@/services/setorService";
import { gerarPDFTransferencia, DoacaoTransferida, TransferenciaData } from "@/lib/transferenciaService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRightLeft, Building2, CheckCircle2, Clock, FileText,
  Search, Filter, PackageCheck, Send, XCircle, Inbox, AlertCircle,
} from "lucide-react";

interface DoacaoFisica {
  id: string;
  donor_name: string;
  tipo_doacao: string;
  subtipo?: string;
  quantidade?: string;
  descricao?: string;
  status: string;
  observacoes?: string;
  created_at: string;
  setor_id?: string;
  setor_destino?: string;
  transferido?: boolean;
  transferido_para?: string;
  transferido_em?: string;
}

interface OrgSettings {
  system_name?: string;
  logo_url?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
}

const tipoLabel: Record<string, string> = {
  cabelo: "Cabelo",
  fraldas_geriatricas: "Fraldas",
  alimentos: "Alimentos",
  remedios: "Remédios",
  veiculo: "Veículo",
  terreno: "Terreno",
  casa: "Casa",
  predio_comercial: "Prédio Comercial",
  outro: "Outro",
};

const tipoColor: Record<string, string> = {
  cabelo: "bg-pink-100 text-pink-700 border-pink-200",
  fraldas_geriatricas: "bg-blue-100 text-blue-700 border-blue-200",
  alimentos: "bg-green-100 text-green-700 border-green-200",
  remedios: "bg-red-100 text-red-700 border-red-200",
  veiculo: "bg-slate-100 text-slate-700 border-slate-200",
  terreno: "bg-amber-100 text-amber-700 border-amber-200",
  casa: "bg-orange-100 text-orange-700 border-orange-200",
  predio_comercial: "bg-purple-100 text-purple-700 border-purple-200",
  outro: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function TransferenciaDoacoes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [doacoes, setDoacoes] = useState<DoacaoFisica[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("recebido");
  const [filterTransferido, setFilterTransferido] = useState("nao_transferido");

  // Seleção
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog transferência
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setorDestinoId, setSetorDestinoId] = useState("none");
  const [obsTransferencia, setObsTransferencia] = useState("");
  const [transferindo, setTransferindo] = useState(false);
  const transferRequest = useRef(crypto.randomUUID());
  const transferLock = useRef(false);
  const [lastTransfer, setLastTransfer] = useState<TransferenciaData | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Carregar dados
  useEffect(() => {
    loadData();
    supabase
      .from("white_label_settings")
      .select("system_name,logo_url,cnpj,address,phone,email")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => { if (data) setOrgSettings(data); });
    setorService.getSetores().then(setSetores);
  }, [filterStatus, filterTipo, filterTransferido, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    let q = supabase.from("doacoes_fisicas").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "todos") q = q.eq("status", filterStatus);
    if (filterTipo !== "todos") q = q.eq("tipo_doacao", filterTipo);
    if (searchTerm) q = q.ilike("donor_name", `%${searchTerm}%`);
    const { data, error } = await q;
    if (!error && data) {
      let list = data as DoacaoFisica[];
      // Filtra transferidos/não usando observacoes como fallback
      if (filterTransferido === "nao_transferido") {
        list = list.filter(d => !d.transferido && !d.observacoes?.includes("[Transferido para:"));
      } else if (filterTransferido === "transferido") {
        list = list.filter(d => d.transferido || d.observacoes?.includes("[Transferido para:"));
      }
      setDoacoes(list);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === doacoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(doacoes.map(d => d.id)));
    }
  };

  const selectedDoacoes = doacoes.filter(d => selectedIds.has(d.id));
  const setorEscolhido = setores.find(s => s.id === setorDestinoId);

  const handleOpenTransfer = () => {
    if (selectedIds.size === 0) {
      toast({ title: "Selecione ao menos uma doação", variant: "destructive" });
      return;
    }
    transferRequest.current = crypto.randomUUID();
    setDialogOpen(true);
    setSetorDestinoId("none");
    setObsTransferencia("");
  };

  const handleTransferir = async () => {
    if (!setorEscolhido || transferLock.current || !selectedDoacoes.length) return;
    transferLock.current = true;
    setTransferindo(true);
    // Open synchronously in the click event to avoid popup blockers after the RPC.
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) { printWindow.opener = null; printWindow.document.title = 'Preparando termo de entrega'; printWindow.document.body.textContent = 'Confirmando transferência. Aguarde…'; }
    let confirmed = false;
    try {
      const {data,error} = await supabase.rpc('confirm_collection_transfer', {
        p_id:transferRequest.current, p_ids:selectedDoacoes.map(d=>d.id),
        p_sector:setorEscolhido.id, p_notes:obsTransferencia.trim(),
      });
      if(error) throw error;
      confirmed = true;
      setLastTransfer(data as TransferenciaData);
      setSelectedIds(new Set()); setDialogOpen(false); void loadData();
      await gerarPDFTransferencia(data as TransferenciaData, {print:true,printWindow});
      toast({title:'Transferência confirmada',description:printWindow?'O termo foi aberto para impressão.':'O navegador bloqueou a janela. O PDF foi baixado; abra-o para imprimir.'});
    } catch(error) {
      printWindow?.close();
      toast({title:confirmed?'Transferência salva; impressão não concluída':'Não foi possível confirmar a transferência',description:confirmed?'Use Reimprimir último termo. Não repita a transferência.':(error as Error).message,variant:'destructive'});
    } finally { transferLock.current=false;setTransferindo(false); }
  };
  const handleGerarPDF = async () => {
    if (!setorEscolhido) {
      toast({ title: "Selecione o setor antes de gerar o PDF", variant: "destructive" });
      return;
    }
    setPdfLoading(true);
    try {
      const numero = `TRF-${format(new Date(), "yyyyMMdd-HHmm")}`;
      await gerarPDFTransferencia({
        numero,
        data: format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        origem: "Telemarketing & Relacionamento",
        setor_destino: setorEscolhido.nome,
        coordenador: setorEscolhido.coordenador_nome,
        coordenador_email: setorEscolhido.coordenador_email,
        coordenador_telefone: setorEscolhido.coordenador_telefone,
        ramal: setorEscolhido.ramal,
        doacoes: selectedDoacoes as DoacaoTransferida[],
        obs: obsTransferencia || undefined,
        org: orgSettings,
      });
      toast({ title: "PDF gerado com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    }
    setPdfLoading(false);
  };

  // Stats rápidos
  const stats = useMemo(() => {
    const total = doacoes.length;
    const transferidos = doacoes.filter(d => d.transferido || d.observacoes?.includes("[Transferido para:")).length;
    const pendentes = doacoes.filter(d => d.status === "pendente").length;
    return { total, transferidos, pendentes, disponiveis: total - transferidos };
  }, [doacoes]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            Transferência de Doações
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Transfira doações físicas do Telemarketing para o setor responsável e emita o termo em PDF.
          </p>
        </div>
        <Button
          onClick={handleOpenTransfer}
          disabled={selectedIds.size === 0}
          className="gap-2 shadow-sm"
          size="sm"
        >
          <Send className="w-4 h-4" />
          Transferir Selecionadas ({selectedIds.size})
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Doações Listadas", value: stats.total, icon: Inbox, color: "text-blue-600 bg-blue-50" },
          { label: "Disponíveis", value: stats.disponiveis, icon: PackageCheck, color: "text-green-600 bg-green-50" },
          { label: "Já Transferidas", value: stats.transferidos, icon: CheckCircle2, color: "text-slate-600 bg-slate-100" },
          { label: "Pendentes Recebimento", value: stats.pendentes, icon: Clock, color: "text-orange-600 bg-orange-50" },
        ].map(s => (
          <Card key={s.label} className="rounded-2xl border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar doador..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-52 rounded-xl"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-44 rounded-xl">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="alimentos">🥫 Alimentos</SelectItem>
            <SelectItem value="remedios">💊 Remédios</SelectItem>
            <SelectItem value="cabelo">✂️ Cabelo</SelectItem>
            <SelectItem value="fraldas_geriatricas">🍼 Fraldas</SelectItem>
            <SelectItem value="veiculo">🚗 Veículo</SelectItem>
            <SelectItem value="outro">📦 Outro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="recebido">✅ Recebido</SelectItem>
            <SelectItem value="pendente">⏳ Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTransferido} onValueChange={setFilterTransferido}>
          <SelectTrigger className="w-52 rounded-xl">
            <SelectValue placeholder="Transferência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="nao_transferido">🟢 Não transferidas</SelectItem>
            <SelectItem value="transferido">✅ Já transferidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card className="rounded-2xl border-slate-100">
        <CardHeader className="border-b border-slate-50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              Doações para Transferir
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedIds.size > 0
                ? `${selectedIds.size} selecionada(s) de ${doacoes.length}`
                : `${doacoes.length} registros`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Carregando...</div>
          ) : doacoes.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Nenhuma doação encontrada.</p>
              <p className="text-slate-300 text-sm mt-1">Ajuste os filtros ou registre novas doações em Doações Físicas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === doacoes.length && doacoes.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer accent-primary"
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Doador</TableHead>
                  <TableHead>Tipo / Subtipo</TableHead>
                  <TableHead>Qtd / Descrição</TableHead>
                  <TableHead>Destino Atual</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doacoes.map(d => {
                  const isSelected = selectedIds.has(d.id);
                  const jaTransferido = d.transferido || d.observacoes?.includes("[Transferido para:");
                  const destinoAtual = d.setor_destino || (d.observacoes?.match(/\[Transferido para:\s*([^\]]+)\]/)?.[1]) || (d.observacoes?.match(/\[Destinação:\s*([^\]]+)\]/)?.[1]);

                  return (
                    <TableRow
                      key={d.id}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-slate-50/50"}`}
                      onClick={() => toggleSelect(d.id)}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(d.id)}
                          className="w-4 h-4 rounded cursor-pointer accent-primary"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono whitespace-nowrap">
                        {format(new Date(d.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-800">{d.donor_name}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium ${tipoColor[d.tipo_doacao] || "bg-gray-100 text-gray-700"}`}>
                          {tipoLabel[d.tipo_doacao] || d.tipo_doacao}
                          {d.subtipo && <span className="font-normal opacity-70"> — {d.subtipo}</span>}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[150px]">
                        {d.quantidade || d.descricao || <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell>
                        {destinoAtual ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-0.5 w-fit">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]" title={destinoAtual}>{destinoAtual}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sem setor</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.status === "recebido" && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Recebido
                          </Badge>
                        )}
                        {d.status === "pendente" && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 gap-1 text-[11px]">
                            <Clock className="w-3 h-3" /> Pendente
                          </Badge>
                        )}
                        {d.status === "cancelado" && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1 text-[11px]">
                            <XCircle className="w-3 h-3" /> Cancelado
                          </Badge>
                        )}
                        {jaTransferido && (
                          <Badge className="ml-1 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100 gap-1 text-[11px]">
                            <ArrowRightLeft className="w-3 h-3" /> Transferido
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {lastTransfer && <Button variant="outline" onClick={()=>{const w=window.open('about:blank','_blank');if(w)w.opener=null;void gerarPDFTransferencia(lastTransfer,{print:true,printWindow:w});}}>Reimprimir último termo</Button>}
      {/* Dialog de Transferência */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Transferir {selectedDoacoes.length} Doação(ões)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resumo selecionadas */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-primary" />
                Itens selecionados para transferência:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedDoacoes.map(d => (
                  <span key={d.id} className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg border font-medium ${tipoColor[d.tipo_doacao] || "bg-gray-100 text-gray-700"}`}>
                    {tipoLabel[d.tipo_doacao]} — {d.donor_name.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>

            {/* Setor destino */}
            <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/80 border border-blue-100">
              <Label className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Setor de Destino *
              </Label>
              <Select value={setorDestinoId} onValueChange={setSetorDestinoId}>
                <SelectTrigger className="bg-white border-blue-200">
                  <SelectValue placeholder="Selecione o setor responsável..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione um setor...</SelectItem>
                  {setores.filter(s => s.status === "ativo").map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-xs text-muted-foreground ml-2">— {s.coordenador_nome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {setorEscolhido && (
                <div className="mt-2 p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                  <p className="text-xs font-bold text-slate-800">{setorEscolhido.nome}</p>
                  <p className="text-[11px] text-slate-600">
                    👤 Coordenador: <span className="font-medium">{setorEscolhido.coordenador_nome}</span>
                  </p>
                  {setorEscolhido.coordenador_email && (
                    <p className="text-[11px] text-slate-500">✉️ {setorEscolhido.coordenador_email}</p>
                  )}
                  {setorEscolhido.coordenador_telefone && (
                    <p className="text-[11px] text-slate-500">📞 {setorEscolhido.coordenador_telefone}{setorEscolhido.ramal ? ` | Ramal: ${setorEscolhido.ramal}` : ""}</p>
                  )}
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-700 font-medium">Observações da transferência (opcional)</Label>
              <Textarea
                placeholder="Ex: Transferência urgente, doações prontas para entrega, instruções especiais..."
                value={obsTransferencia}
                onChange={e => setObsTransferencia(e.target.value)}
                rows={2}
                className="bg-white text-sm"
              />
            </div>

            {/* Aviso PDF */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-800">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
              <span>Um <strong>Termo de Transferência em PDF</strong> será gerado com assinatura do coordenador responsável para formalizar a entrega.</span>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={transferindo}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={handleGerarPDF}
              disabled={pdfLoading || setorDestinoId === "none"}
            >
              <FileText className="w-4 h-4" />
              {pdfLoading ? "Gerando PDF..." : "Prévia PDF"}
            </Button>
            <Button
              onClick={handleTransferir}
              disabled={transferindo || setorDestinoId === "none"}
              className="gap-1.5"
            >
              <Send className="w-4 h-4" />
              {transferindo ? "Transferindo..." : "Confirmar & Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

