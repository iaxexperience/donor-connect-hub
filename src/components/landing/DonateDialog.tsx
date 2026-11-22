import { useEffect, useState } from "react";
import { Heart, Loader2, Copy, Check, ExternalLink, QrCode, CreditCard, ShieldCheck, ArrowLeft, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme/DynamicThemeProvider";

const PRESETS = [20, 50, 100, 200];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const maskDocument = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

type Result = { payment_id: string; invoice_url: string; amount: number; pix: { image: string; payload: string; expiration: string } | null };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Doação pela landing page, para a organização cadastrada no sistema
 * (Configurações → Aparência). A cobrança é criada no servidor (Edge
 * Function "public-donation"); a chave do Asaas nunca vem ao navegador.
 */
export function DonateDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { settings: { system_name: orgName, logo_url: orgLogo } } = useTheme();
  const [org, setOrg] = useState<{ cnpj?: string | null }>({});

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number>(50);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [method, setMethod] = useState<"PIX" | "UNDEFINED">("PIX");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // campo-isca para robôs (fica escondido)
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  const finalAmount = custom ? Number(custom.replace(",", ".")) : amount;

  useEffect(() => {
    if (!open) return;
    supabase.from("white_label_settings").select("cnpj").eq("id", 1).maybeSingle().then(({ data }) => setOrg(data || {}));
  }, [open]);

  // Reinicia ao fechar.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep(1); setResult(null); setPaid(false); setCopied(false); setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  // Pix: consulta o status a cada 5 s enquanto a tela estiver aberta.
  useEffect(() => {
    if (!open || step !== 3 || !result?.pix || paid) return;
    const iv = setInterval(async () => {
      const { data } = await supabase.functions.invoke("public-donation", { body: { action: "status", payment_id: result.payment_id } });
      if (data?.status === "pago") setPaid(true);
    }, 5000);
    return () => clearInterval(iv);
  }, [open, step, result, paid]);

  const submit = async () => {
    if (!consent) {
      toast({ title: "Autorize o uso dos dados para continuar", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-donation", {
        body: { action: "create", name, email, phone, document, amount: finalAmount, method, consent, website },
      });
      if (error) {
        // A mensagem amigável vem no corpo da resposta da função.
        const msg = await (error as any).context?.json?.().then((b: any) => b?.error).catch(() => null);
        throw new Error(msg || error.message);
      }
      if (data?.error) throw new Error(data.error);
      setResult(data as Result);
      setStep(3);
      if (method === "UNDEFINED" && data?.invoice_url) window.open(data.invoice_url, "_blank", "noopener");
    } catch (e: any) {
      toast({ title: "Não foi possível gerar a doação", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyPix = async () => {
    if (!result?.pix) return;
    await navigator.clipboard.writeText(result.pix.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const amountOk = Number.isFinite(finalAmount) && finalAmount >= 5 && finalAmount <= 50000;
  const dataOk = name.trim().length >= 3 && /\S+@\S+\.\S+/.test(email) && phone.replace(/\D/g, "").length >= 10 &&
    [11, 14].includes(document.replace(/\D/g, "").length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" fill="currentColor" /> Fazer uma doação
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 flex items-center gap-3 rounded-xl border bg-sky-50/60 p-3 text-left">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white">
                {orgLogo ? <img src={orgLogo} alt="" className="h-full w-full object-contain p-0.5" /> : <Heart className="h-4 w-4 text-sky-700" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Você está doando para</p>
                <p className="truncate font-black text-slate-900">{orgName}</p>
                {org.cnpj && <p className="text-xs text-slate-500">CNPJ {org.cnpj}</p>}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-700">Quanto você quer doar?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setAmount(v); setCustom(""); }}
                  className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                    !custom && amount === v ? "border-sky-600 bg-sky-600 text-white shadow" : "border-slate-200 hover:border-sky-300"
                  }`}
                >
                  {brl(v)}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Outro valor (R$)</label>
              <Input inputMode="decimal" placeholder="Ex.: 35,00" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d,.]/g, ""))} />
            </div>
            <Button className="h-11 w-full rounded-full font-black" disabled={!amountOk} onClick={() => setStep(2)}>
              Continuar — {amountOk ? brl(finalAmount) : "R$ 5,00 no mínimo"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-3.5 w-3.5" /> {brl(finalAmount)} · alterar valor
            </button>
            <Input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="CPF ou CNPJ" value={document} onChange={(e) => setDocument(maskDocument(e.target.value))} inputMode="numeric" />
              <Input placeholder="WhatsApp com DDD" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel" />
            </div>
            <Input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" />
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden />

            <p className="pt-1 text-sm font-bold text-slate-700">Como prefere pagar?</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["PIX", QrCode, "Pix", "QR code na tela"],
                ["UNDEFINED", CreditCard, "Cartão ou boleto", "Página segura do Asaas"],
              ] as const).map(([value, Icon, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition ${
                    method === value ? "border-sky-600 bg-sky-50 ring-2 ring-sky-200" : "border-slate-200 hover:border-sky-300"
                  }`}
                >
                  <Icon className="h-5 w-5 text-sky-700" />
                  <span className="text-sm font-black">{label}</span>
                  <span className="text-[11px] text-slate-500">{hint}</span>
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-600" />
              <span>
                Autorizo {orgName} a usar meus dados para processar esta doação, emitir o recibo e entrar em contato
                sobre doações, conforme a LGPD.
              </span>
            </label>

            <Button className="h-11 w-full rounded-full font-black" disabled={!dataOk || !consent || loading} onClick={submit}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" />}
              Doar {brl(finalAmount)}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" /> Pagamento processado pelo Asaas. Não guardamos dados de cartão.
            </p>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-4 text-center">
            {paid ? (
              <div className="space-y-3 py-6">
                <PartyPopper className="mx-auto h-12 w-12 text-emerald-500" />
                <p className="text-xl font-black">Doação confirmada. Muito obrigado!</p>
                <p className="text-sm text-slate-600">Recebemos {brl(result.amount)}. Você receberá a confirmação nos seus contatos.</p>
                <Button className="rounded-full" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            ) : result.pix ? (
              <>
                <p className="text-sm text-slate-600">
                  Abra o app do seu banco, escolha <b>Pix → Ler QR code</b> ou use o <b>copia e cola</b>.
                </p>
                <img src={`data:image/png;base64,${result.pix.image}`} alt="QR code Pix" className="mx-auto h-56 w-56 rounded-xl border p-2" />
                <p className="text-lg font-black">{brl(result.amount)}</p>
                <Button variant="outline" className="w-full rounded-full" onClick={copyPix}>
                  {copied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Código copiado!" : "Copiar código Pix (copia e cola)"}
                </Button>
                <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando a confirmação do pagamento…
                </p>
              </>
            ) : (
              <div className="space-y-3 py-4">
                <p className="text-sm text-slate-600">
                  Abrimos a página de pagamento segura do Asaas em uma nova aba. Se ela não abriu, use o botão abaixo.
                </p>
                <Button asChild className="w-full rounded-full font-black">
                  <a href={result.invoice_url} target="_blank" rel="noopener noreferrer">
                    Ir para o pagamento <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
