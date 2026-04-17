import { useState, useEffect } from "react";
import { Phone, PhoneCall, PhoneOff, Clock, CheckCircle2, Loader2, MessageCircle, PhoneMissed, ThumbsUp, ThumbsDown, CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTelemarketing } from "@/hooks/useTelemarketing";
import { typeLabel, typeBadgeStyle } from "@/lib/donationService";
import { useFollowUps } from "@/hooks/useFollowUps";
import { metaService, MetaConfig } from "@/services/metaService";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import type { Donor } from "@/lib/donationService";

type CallResult = "atendeu" | "nao_atendeu" | "prometeu" | "sem_interesse";

interface CallLog {
  donorId: number;
  attempts: number;
}

const callResultOptions: { value: CallResult; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "atendeu",       label: "Atendeu",           icon: <PhoneCall className="w-4 h-4" />,   color: "bg-green-100 text-green-700 border-green-300" },
  { value: "nao_atendeu",   label: "Não atendeu",       icon: <PhoneMissed className="w-4 h-4" />, color: "bg-red-100 text-red-700 border-red-300" },
  { value: "prometeu",      label: "Prometeu doação",   icon: <ThumbsUp className="w-4 h-4" />,    color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "sem_interesse", label: "Sem interesse",     icon: <ThumbsDown className="w-4 h-4" />,  color: "bg-slate-100 text-slate-700 border-slate-300" },
];

const priorityVariant = (p: string) => {
  switch (p) {
    case "Alta": return "destructive";
    case "Média": return "default";
    case "Baixa": return "secondary";
    default: return "outline";
  }
};

const Telemarketing = () => {
  const { queue, stats: dynamicStats, isLoading } = useTelemarketing();
  const { createFollowUp } = useFollowUps();
  const { toast } = useToast();

  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null);
  const [callLogs, setCallLogs] = useState<Record<number, number>>({});

  // Dialog state
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [callResult, setCallResult] = useState<CallResult | "">("");
  const [callNote, setCallNote] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [sendingWpp, setSendingWpp] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("meta_config");
    if (saved) {
      try { setMetaConfig(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const logs = localStorage.getItem("telemarketing_logs");
    if (logs) {
      try { setCallLogs(JSON.parse(logs)); } catch { /* ignore */ }
    }
  }, []);

  const openCallDialog = (donor: Donor) => {
    setSelectedDonor(donor);
    setCallResult("");
    setCallNote("");
    setScheduleFollowUp(true);
    setFollowUpDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setDialogOpen(true);
  };

  const handleSaveCall = async () => {
    if (!selectedDonor || !callResult) {
      toast({ title: "Selecione o resultado da ligação", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Incrementa contador de tentativas
      const newLogs = { ...callLogs, [selectedDonor.id]: (callLogs[selectedDonor.id] || 0) + 1 };
      setCallLogs(newLogs);
      localStorage.setItem("telemarketing_logs", JSON.stringify(newLogs));

      // Cria follow-up se solicitado
      if (scheduleFollowUp) {
        const resultLabel = callResultOptions.find(o => o.value === callResult)?.label || callResult;
        await createFollowUp({
          donor_id: selectedDonor.id,
          due_date: followUpDate,
          status: "agendado",
          note: `Telemarketing — ${resultLabel}${callNote ? `: ${callNote}` : ""}`,
        });
      }

      const resultLabel = callResultOptions.find(o => o.value === callResult)?.label;
      toast({ title: "Ligação registrada!", description: `${selectedDonor.name} — ${resultLabel}` });
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleWhatsApp = async (donor: Donor) => {
    if (!donor.phone) {
      toast({ title: "Doador sem telefone cadastrado", variant: "destructive" });
      return;
    }

    const mensagem = `Olá ${donor.name}! 😊\n\nEntramos em contato para agradecer pelo seu apoio e convidá-lo(a) a continuar fazendo a diferença.\n\nSe tiver alguma dúvida ou quiser saber mais sobre nossas campanhas, estamos à disposição!\n\nConte conosco. 🙏`;

    const metaOk = metaConfig?.phone_number_id && metaConfig?.access_token;
    const cleanPhone = donor.phone.replace(/\D/g, "");

    if (metaOk && cleanPhone) {
      setSendingWpp(donor.id);
      try {
        await metaService.sendTextMessage(cleanPhone, mensagem, metaConfig!, donor.id);
        toast({ title: "Mensagem enviada!", description: `WhatsApp para ${donor.name}` });
      } catch (e: any) {
        toast({ title: "Erro ao enviar via Meta API", description: e.message, variant: "destructive" });
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensagem)}`, "_blank");
      }
      setSendingWpp(null);
    } else {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensagem)}`, "_blank");
    }
  };

  const stats = [
    { label: "Fila de Ligações",  value: dynamicStats.totalQueue,    icon: Phone,        color: "text-primary" },
    { label: "Leads Novos",       value: dynamicStats.leadsCount,    icon: CheckCircle2, color: "text-green-600" },
    { label: "Inativos (30d+)",   value: dynamicStats.inactiveCount, icon: PhoneOff,     color: "text-destructive" },
    { label: "Ligações Hoje",     value: Object.values(callLogs).reduce((a, b) => a + b, 0), icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Telemarketing</h1>
        <p className="text-muted-foreground text-sm">Gerencie ligações e follow-ups com doadores.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fila de Ligações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doador</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Total Doado</TableHead>
                <TableHead>Última Doação</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando fila...
                  </TableCell>
                </TableRow>
              ) : queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhuma ligação pendente no momento.
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((donor) => {
                  const attempts = callLogs[donor.id] || 0;
                  return (
                    <TableRow key={donor.id}>
                      <TableCell className="font-medium">{donor.name}</TableCell>
                      <TableCell className="text-muted-foreground">{donor.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadgeStyle(donor.type)}>
                          {typeLabel[donor.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(donor.total_donated)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {donor.last_donation_date
                          ? new Date(donor.last_donation_date).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {attempts > 0 ? (
                          <Badge variant={attempts >= 3 ? "destructive" : "secondary"}>
                            {attempts}x
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2"
                            disabled={sendingWpp === donor.id}
                            onClick={() => handleWhatsApp(donor)}
                            title="Enviar WhatsApp"
                          >
                            {sendingWpp === donor.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <MessageCircle className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:bg-primary hover:text-white transition-colors"
                            onClick={() => openCallDialog(donor)}
                          >
                            <PhoneCall className="w-4 h-4 mr-1" /> Ligar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de registro de ligação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" />
              Registrar Ligação — {selectedDonor?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resultado */}
            <div className="space-y-2">
              <Label>Resultado da ligação</Label>
              <div className="grid grid-cols-2 gap-2">
                {callResultOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCallResult(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      callResult === opt.value
                        ? opt.color + " ring-2 ring-offset-1 ring-current"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-1">
              <Label>Observação (opcional)</Label>
              <Textarea
                placeholder="Detalhes da conversa, próximos passos..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Agendar follow-up */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  <Label className="cursor-pointer">Agendar follow-up</Label>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleFollowUp(!scheduleFollowUp)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${scheduleFollowUp ? "bg-primary" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${scheduleFollowUp ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {scheduleFollowUp && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data do próximo contato</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCall} disabled={saving || !callResult}>
              {saving ? "Salvando..." : "Salvar Ligação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Telemarketing;
