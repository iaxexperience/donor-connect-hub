import { useState, useEffect, useMemo } from "react";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  MessageCircle, 
  PhoneMissed, 
  ThumbsUp, 
  ThumbsDown, 
  CalendarClock, 
  X,
  Target,
  HeartHandshake,
  Search,
  Filter
} from "lucide-react";
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
import { useCampaigns } from "@/hooks/useCampaigns";
import { typeLabel, typeBadgeStyle } from "@/lib/donationService";
import { useFollowUps } from "@/hooks/useFollowUps";
import { metaService, MetaConfig, getMetaConfig } from "@/services/metaService";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

const Telemarketing = () => {
  const queryClient = useQueryClient();
  const { queue, stats: dynamicStats, isLoading } = useTelemarketing();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { createFollowUp } = useFollowUps();
  const { toast } = useToast();

  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null);
  const [callLogs, setCallLogs] = useState<Record<number, number>>({});

  // Filtros da fila
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [callResult, setCallResult] = useState<CallResult | "">("");
  const [callNote, setCallNote] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));

  // Novos campos: Campanha vinculada e Doação realizada
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("none");
  const [hasDonation, setHasDonation] = useState(false);
  const [donationAmount, setDonationAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const [donationStatus, setDonationStatus] = useState<"pago" | "pendente">("pago");
  const [donationBank, setDonationBank] = useState<string>("asaas"); // banco que recebeu

  const [saving, setSaving] = useState(false);
  const [sendingWpp, setSendingWpp] = useState<number | null>(null);

  useEffect(() => {
    getMetaConfig().then(config => { if (config) setMetaConfig(config); });
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
    
    // Reseta campos de campanha e doação
    setSelectedCampaignId("none");
    setHasDonation(false);
    setDonationAmount("");
    setPaymentMethod("Pix");
    setDonationStatus("pago");
    setDonationBank("asaas");
    
    setDialogOpen(true);
  };

  const handleSelectCallResult = (res: CallResult) => {
    setCallResult(res);
    // Se marcou que prometeu doação, sugere automaticamente o registro de doação com status pendente
    if (res === "prometeu") {
      setHasDonation(true);
      setDonationStatus("pendente");
    }
  };

  const handleSaveCall = async () => {
    if (!selectedDonor || !callResult) {
      toast({ title: "Selecione o resultado da ligação", variant: "destructive" });
      return;
    }

    if (hasDonation) {
      const parsed = parseFloat(donationAmount);
      if (isNaN(parsed) || parsed <= 0) {
        toast({ 
          title: "Valor da doação inválido", 
          description: "Informe um valor maior que zero para registrar a doação.", 
          variant: "destructive" 
        });
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Incrementa contador local de tentativas
      const newLogs = { ...callLogs, [selectedDonor.id]: (callLogs[selectedDonor.id] || 0) + 1 };
      setCallLogs(newLogs);
      localStorage.setItem("telemarketing_logs", JSON.stringify(newLogs));

      const resultLabel = callResultOptions.find(o => o.value === callResult)?.label || callResult;
      const chosenCampaign = campaigns.find(c => c.id === selectedCampaignId);
      const campaignName = chosenCampaign ? chosenCampaign.name : null;

      // 2. Registra doação na tabela 'donations' (relacionada com donors e campaigns)
      let donationCreated = false;
      let parsedAmount = 0;

      if (hasDonation && donationAmount) {
        parsedAmount = parseFloat(donationAmount);
        const { error: donError } = await supabase
          .from("donations")
          .insert([{
            donor_id: selectedDonor.id,
            amount: parsedAmount,
            campaign_id: selectedCampaignId && selectedCampaignId !== "none" ? selectedCampaignId : null,
            payment_method: paymentMethod || "Pix",
            status: donationStatus,
            donation_date: new Date().toISOString(),
            notes: donationBank ? `[Banco: ${donationBank === 'asaas' ? 'Asaas' : donationBank === 'banco_brasil' ? 'Banco do Brasil' : donationBank}]` : undefined,
          }]);

        if (donError) {
          console.error("Erro ao registrar doação:", donError);
          throw new Error(`Falha ao registrar doação: ${donError.message}`);
        }

        // Se pago e vinculado a uma campanha, atualiza current_amount da campanha
        if (donationStatus === "pago" && selectedCampaignId && selectedCampaignId !== "none") {
          const { data: camp } = await supabase
            .from("campaigns")
            .select("current_amount")
            .eq("id", selectedCampaignId)
            .single();

          if (camp) {
            await supabase
              .from("campaigns")
              .update({ current_amount: (camp.current_amount || 0) + parsedAmount })
              .eq("id", selectedCampaignId);
          }
        }
        donationCreated = true;
      }

      // 3. Registra na tabela 'telemarketing_calls' (se schema permitir)
      try {
        const mappedStatus = (callResult === "atendeu" || callResult === "prometeu")
          ? "sucesso"
          : (callResult === "nao_atendeu" ? "sem_resposta" : "recusado");

        await supabase.from("telemarketing_calls").insert([{
          donor_id: selectedDonor.id,
          status: mappedStatus,
          notes: `Telemarketing [${resultLabel}]${donationCreated ? ` | Doação: R$ ${parsedAmount.toFixed(2)} (${donationStatus})` : ""}${campaignName ? ` | Campanha: ${campaignName}` : ""}${callNote ? ` — ${callNote}` : ""}`,
          follow_up_date: scheduleFollowUp ? followUpDate : undefined
        }]);
      } catch (callErr) {
        // Log silencioso caso a tabela exija outras permissões RLS
        console.warn("Log de telemarketing_calls ignorado:", callErr);
      }

      // 4. Cria follow-up se solicitado
      if (scheduleFollowUp) {
        const detailsParts = [
          `Telemarketing — ${resultLabel}`,
          campaignName ? `Campanha: ${campaignName}` : null,
          donationCreated ? `Doação ${donationStatus === 'pago' ? 'confirmada' : 'prometida'}: R$ ${parsedAmount.toFixed(2)} (${paymentMethod})` : null,
          callNote ? `Obs: ${callNote}` : null
        ].filter(Boolean);

        await createFollowUp({
          donor_id: selectedDonor.id,
          due_date: followUpDate,
          status: "agendado",
          note: detailsParts.join(" | "),
        });
      }

      // 5. Invalida caches para atualizar números e classificação dos doadores imediatamente
      queryClient.invalidateQueries({ queryKey: ["donors"] });
      queryClient.invalidateQueries({ queryKey: ["telemarketing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });

      toast({ 
        title: "Ligação registrada!", 
        description: `${selectedDonor.name} — ${resultLabel}${donationCreated ? ` | Doação de R$ ${parsedAmount.toFixed(2)} registrada` : ""}` 
      });
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

  const filteredQueue = useMemo(() => {
    if (!searchTerm) return queue;
    const term = searchTerm.toLowerCase();
    return queue.filter((d) => 
      d.name.toLowerCase().includes(term) ||
      (d.phone && d.phone.includes(term))
    );
  }, [queue, searchTerm]);

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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Fila de Ligações</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar doador por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
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
              ) : filteredQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {searchTerm ? "Nenhum doador encontrado com este filtro." : "Nenhuma ligação pendente no momento."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQueue.map((donor) => {
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
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" />
              Registrar Ligação — {selectedDonor?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resultado da ligação */}
            <div className="space-y-2">
              <Label>Resultado da ligação</Label>
              <div className="grid grid-cols-2 gap-2">
                {callResultOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectCallResult(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      callResult === opt.value
                        ? opt.color + " ring-2 ring-offset-1 ring-current font-semibold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vincular Campanha */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Target className="w-4 h-4 text-primary" />
                Vincular a uma Campanha
              </Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione uma campanha (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma / Doação Geral</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.is_active ? "" : "(Encerrada)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Selecione a campanha institucional ou temática relacionada ao contato.
              </p>
            </div>

            {/* Seção de Doação Realizada / Prometida */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg transition-colors ${hasDonation ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="cursor-pointer font-medium text-slate-800 text-sm">
                      Registrar Doação
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      O doador realizou ou confirmou promessa de doação?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasDonation(!hasDonation)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    hasDonation ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      hasDonation ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {hasDonation && (
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 font-medium">Valor da Doação (R$)*</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(e.target.value)}
                          className="pl-9 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 font-medium">Status da Doação</Label>
                      <Select 
                        value={donationStatus} 
                        onValueChange={(val: "pago" | "pendente") => setDonationStatus(val)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pago">Confirmada / Paga</SelectItem>
                          <SelectItem value="pendente">Prometida / Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Sugestões de valores rápidos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground mr-1">Sugestões:</span>
                    {[20, 50, 100, 200].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDonationAmount(val.toString())}
                        className={`text-xs px-2.5 py-0.5 rounded-md border transition-all ${
                          donationAmount === val.toString()
                            ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 font-medium">Forma de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione a forma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                        <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                        <SelectItem value="Manual">Manual / Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Banco que recebeu a doação */}
                  <div className="space-y-1.5 p-3 rounded-xl border border-blue-100 bg-blue-50/60">
                    <Label className="text-xs text-blue-900 font-semibold flex items-center gap-1.5">
                      🏦 Banco que recebeu a doação
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDonationBank("asaas")}
                        className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          donationBank === "asaas"
                            ? "bg-orange-100 text-orange-800 border-orange-400 ring-2 ring-orange-300"
                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-200 hover:bg-orange-50"
                        }`}
                      >
                        <span className="text-lg">🟠</span>
                        <span>Asaas</span>
                        <span className="text-[10px] font-normal text-slate-400">Gateway digital</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonationBank("banco_brasil")}
                        className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          donationBank === "banco_brasil"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-400 ring-2 ring-yellow-300"
                            : "bg-white text-slate-600 border-slate-200 hover:border-yellow-200 hover:bg-yellow-50"
                        }`}
                      >
                        <span className="text-lg">🟡</span>
                        <span>Banco do Brasil</span>
                        <span className="text-[10px] font-normal text-slate-400">Agência bancária</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observação */}
            <div className="space-y-1">
              <Label>Observação (opcional)</Label>
              <Textarea
                placeholder="Detalhes da conversa, próximos passos..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                rows={2}
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
