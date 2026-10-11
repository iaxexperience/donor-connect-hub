import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarReciboColetaPDF } from "@/lib/reciboService";
import {
  Truck, MapPin, Phone, Package, Clock, CheckCircle2, XCircle,
  Navigation, Loader2, AlertTriangle, CalendarClock, FileText,
} from "lucide-react";

interface Receipt {
  id: string;
  number: string;
  status: "issued" | "confirmed" | "cancelled" | "disputed";
  organization?: { name?: string; logo_url?: string; cnpj?: string; address?: string; phone?: string; email?: string };
  courier?: { name?: string; document?: string };
  confirmed_at?: string | null;
}

interface RouteItem {
  id: string;
  source_kind: "physical" | "cash" | "pledge";
  position: number;
  snapshot: { donor_name: string; phone?: string; address?: string; description?: string; quantity?: string; amount?: number };
  priority: "baixa" | "normal" | "alta" | "urgente";
  scheduled_time: string | null;
  visit_status: "aguardando" | "em_deslocamento" | "em_atendimento" | "coletado" | "sem_sucesso" | "reagendada" | "cancelada";
  receipts: Receipt[];
}

interface Route {
  id: string;
  collection_date: string;
  shift: "manha" | "tarde" | "noite";
  courier_id: string;
  courier?: { name: string } | null;
  route_items: RouteItem[];
}

const shiftLabel: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

const visitStatusMeta: Record<RouteItem["visit_status"], { label: string; color: string }> = {
  aguardando: { label: "Aguardando", color: "bg-slate-100 text-slate-700 border-slate-200" },
  em_deslocamento: { label: "Em deslocamento", color: "bg-blue-100 text-blue-700 border-blue-200" },
  em_atendimento: { label: "Em atendimento", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  coletado: { label: "Coletado", color: "bg-green-100 text-green-700 border-green-200" },
  sem_sucesso: { label: "Sem sucesso", color: "bg-red-100 text-red-700 border-red-200" },
  reagendada: { label: "Reagendada", color: "bg-amber-100 text-amber-700 border-amber-200" },
  cancelada: { label: "Cancelada", color: "bg-gray-200 text-gray-600 border-gray-300" },
};

const nextActions: Record<RouteItem["visit_status"], { status: RouteItem["visit_status"]; label: string }[]> = {
  aguardando: [{ status: "em_deslocamento", label: "Iniciar deslocamento" }],
  em_deslocamento: [{ status: "em_atendimento", label: "Cheguei / Em atendimento" }],
  em_atendimento: [
    { status: "coletado", label: "Doação coletada" },
    { status: "sem_sucesso", label: "Sem sucesso" },
    { status: "reagendada", label: "Reagendar" },
  ],
  coletado: [],
  sem_sucesso: [],
  reagendada: [{ status: "em_deslocamento", label: "Tentar novamente" }],
  cancelada: [],
};

export default function Rotas() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isMensageiro = role === "motoboy";
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [reasonDialog, setReasonDialog] = useState<{ item: RouteItem; targetStatus: RouteItem["visit_status"] } | null>(null);
  const [reason, setReason] = useState("");

  const fetchRoutes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("routes")
      .select("id,collection_date,shift,courier_id,courier:profiles!courier_id(name),route_items(id,source_kind,position,snapshot,priority,scheduled_time,visit_status,receipts(id,number,status,organization,courier,confirmed_at))")
      .order("collection_date", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar rotas", description: error.message, variant: "destructive" });
    } else {
      setRoutes((data || []) as unknown as Route[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRoutes(); }, []);

  const imprimirReciboColeta = async (item: RouteItem, receipt: Receipt) => {
    const { data: verifyData } = await supabase.functions.invoke("collection-receipts", { body: { action: "routes" } });
    const verificationUrl = (verifyData || [])
      .flatMap((r: any) => r.route_items || [])
      .find((i: any) => i.id === item.id)
      ?.receipts?.find((r: any) => r.id === receipt.id)?.verification_url;

    await gerarReciboColetaPDF({
      receipt_number: receipt.number,
      verification_url: verificationUrl || window.location.origin,
      donor_name: item.snapshot.donor_name,
      donor_address: item.snapshot.address,
      donor_phone: item.snapshot.phone,
      description: item.snapshot.description,
      quantity: item.snapshot.quantity,
      amount: item.snapshot.amount,
      courier_name: receipt.courier?.name || "—",
      courier_document: receipt.courier?.document,
      collected_at: receipt.confirmed_at || new Date().toISOString(),
      org: {
        system_name: receipt.organization?.name,
        logo_url: receipt.organization?.logo_url,
        cnpj: receipt.organization?.cnpj,
        address: receipt.organization?.address,
        phone: receipt.organization?.phone,
        email: receipt.organization?.email,
      },
    });
  };

  const handleReimprimir = async (item: RouteItem) => {
    const receipt = item.receipts?.[0];
    if (!receipt) return;
    setUpdating(item.id);
    try {
      await imprimirReciboColeta(item, receipt);
    } catch (error: any) {
      toast({ title: "Erro ao reimprimir recibo", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const applyStatus = async (item: RouteItem, status: RouteItem["visit_status"], motivo?: string) => {
    setUpdating(item.id);
    try {
      const { error } = await supabase.rpc("update_visit_status", { p_item: item.id, p_status: status, p_reason: motivo || null });
      if (error) throw error;

      // Coletar a doação também confirma o recibo (baixa financeira) e
      // imprime o recibo de coleta assinado pelo doador e pelo mensageiro.
      if (status === "coletado" && item.receipts?.[0]?.id) {
        const receipt = item.receipts[0];
        const { error: recError } = await supabase.rpc("transition_collection_receipt", {
          p_receipt: receipt.id, p_status: "confirmed", p_reason: null,
        });
        if (recError) throw recError;

        try {
          await imprimirReciboColeta(item, receipt);
        } catch (pdfError) {
          console.error("Erro ao gerar recibo de coleta:", pdfError);
          toast({ title: "Doação coletada, mas o recibo não pôde ser impresso", variant: "destructive" });
        }
      }

      toast({ title: "Status atualizado!" });
      fetchRoutes();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const handleAction = (item: RouteItem, status: RouteItem["visit_status"]) => {
    if (status === "sem_sucesso" || status === "reagendada") {
      setReasonDialog({ item, targetStatus: status });
      setReason("");
      return;
    }
    applyStatus(item, status);
  };

  const confirmReasonDialog = () => {
    if (!reasonDialog) return;
    applyStatus(reasonDialog.item, reasonDialog.targetStatus, reason.trim() || undefined);
    setReasonDialog(null);
  };

  const handleCancelReceipt = async (item: RouteItem) => {
    const receipt = item.receipts?.[0];
    if (!receipt) return;
    const motivo = window.prompt("Motivo do cancelamento (mín. 5 caracteres):");
    if (!motivo || motivo.trim().length < 5) {
      toast({ title: "Justificativa obrigatória", description: "Informe um motivo com pelo menos 5 caracteres.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.rpc("transition_collection_receipt", { p_receipt: receipt.id, p_status: "cancelled", p_reason: motivo.trim() });
      if (error) throw error;
      await supabase.rpc("update_visit_status", { p_item: item.id, p_status: "cancelada", p_reason: motivo.trim() });
      toast({ title: "Recibo cancelado" });
      fetchRoutes();
    } catch (error: any) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    }
  };

  const visibleRoutes = isMensageiro ? routes.filter(r => r.courier_id === user?.id) : routes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" /> {isMensageiro ? "Meu Itinerário" : "Rotas de Coleta"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isMensageiro ? "Suas visitas atribuídas, em ordem de atendimento." : "Visão geral dos itinerários despachados para os mensageiros."}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : visibleRoutes.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhuma rota encontrada.</CardContent></Card>
      ) : (
        visibleRoutes.map(route => (
          <Card key={route.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  {format(new Date(route.collection_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} — {shiftLabel[route.shift]}
                  {!isMensageiro && route.courier?.name && <Badge variant="outline">{route.courier.name}</Badge>}
                </CardTitle>
                <Badge variant="secondary">{route.route_items.length} parada(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {route.route_items.sort((a, b) => a.position - b.position).map(item => {
                const meta = visitStatusMeta[item.visit_status];
                const receipt = item.receipts?.[0];
                return (
                  <div key={item.id} className="border rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold">{item.position}. {item.snapshot.donor_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Package className="w-3.5 h-3.5" />
                          {item.snapshot.description}{item.snapshot.quantity ? ` — ${item.snapshot.quantity}` : ""}
                          {item.snapshot.amount ? ` — R$ ${Number(item.snapshot.amount).toFixed(2)}` : ""}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.snapshot.address || "Sem endereço"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {item.snapshot.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{item.snapshot.phone}</span>}
                          {item.scheduled_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{item.scheduled_time}</span>}
                          {item.priority !== "normal" && (
                            <Badge variant="outline" className={item.priority === "urgente" ? "border-red-300 text-red-600" : item.priority === "alta" ? "border-orange-300 text-orange-600" : ""}>
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                        {item.snapshot.address && item.snapshot.address !== "Sem endereço" && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.snapshot.address)}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                          >
                            <Navigation className="w-3 h-3" /> Abrir no mapa
                          </a>
                        )}
                        {receipt && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />{receipt.number}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {nextActions[item.visit_status].map(action => (
                        <Button key={action.status} size="sm" variant={action.status === "coletado" ? "default" : "outline"}
                          disabled={updating === item.id}
                          onClick={() => handleAction(item, action.status)}>
                          {action.status === "coletado" && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          {action.status === "sem_sucesso" && <XCircle className="w-3.5 h-3.5 mr-1" />}
                          {action.label}
                        </Button>
                      ))}
                      {receipt?.status === "confirmed" && (
                        <Button size="sm" variant="outline" disabled={updating === item.id} onClick={() => handleReimprimir(item)}>
                          <FileText className="w-3.5 h-3.5 mr-1" /> Reimprimir recibo
                        </Button>
                      )}
                      {!isMensageiro && receipt?.status === "issued" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancelReceipt(item)}>
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Cancelar recibo
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!reasonDialog} onOpenChange={(open) => !open && setReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialog?.targetStatus === "sem_sucesso" ? "Registrar visita sem sucesso" : "Reagendar visita"}</DialogTitle>
            <DialogDescription>Descreva o que aconteceu (doador ausente, recusou, etc.).</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Observação (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)}>Cancelar</Button>
            <Button onClick={confirmReasonDialog}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
