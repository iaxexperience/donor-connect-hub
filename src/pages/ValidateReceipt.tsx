import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Heart, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceiptData {
  receipt_number: string;
  donor_name: string;
  amount: number;
  payment_method: string;
  cartao_tipo?: string;
  status: string;
  created_at: string;
}

const methodLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto Bancário",
};

export default function ValidateReceipt() {
  const { hash } = useParams<{ hash: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: rec }, { data: org }] = await Promise.all([
        supabase
          .from("caixa_transacoes")
          .select("receipt_number, donor_name, amount, payment_method, cartao_tipo, status, created_at")
          .eq("validation_hash", hash)
          .maybeSingle(),
        supabase.from("white_label_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      setReceipt(rec);
      setOrgSettings(org);
      setLoading(false);
    };
    if (hash) fetch();
  }, [hash]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const getPaymentLabel = (method: string, tipo?: string) => {
    if (method === "cartao" && tipo) return tipo === "debito" ? "Cartão de Débito" : "Cartão de Crédito";
    return methodLabel[method] || method;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white text-center">
          {orgSettings?.logo_url ? (
            <img src={orgSettings.logo_url} alt="Logo" className="h-12 object-contain mx-auto mb-3" />
          ) : (
            <Heart className="w-10 h-10 mx-auto mb-3" fill="currentColor" />
          )}
          <h1 className="font-bold text-xl">{orgSettings?.system_name || "FAP Pulse"}</h1>
          {orgSettings?.cnpj && <p className="text-xs text-white/70 mt-1">CNPJ: {orgSettings.cnpj}</p>}
        </div>

        {/* Status */}
        <div className="p-8">
          {receipt && receipt.status === "confirmado" ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <p className="font-bold text-green-700 text-lg">Recibo Válido</p>
                  <p className="text-xs text-slate-400">Este recibo é autêntico e foi emitido por {orgSettings?.system_name || "FAP Pulse"}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-5">
                <Row label="Nº do Recibo" value={receipt.receipt_number} bold />
                <Row label="Doador" value={receipt.donor_name} />
                <Row label="Valor" value={formatCurrency(receipt.amount)} bold />
                <Row label="Modalidade" value={getPaymentLabel(receipt.payment_method, receipt.cartao_tipo)} />
                <Row label="Data" value={format(new Date(receipt.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
                <Row label="Status" value="✅ Confirmado" />
              </div>
            </>
          ) : receipt && receipt.status === "pendente" ? (
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-orange-700 text-lg">Recibo Pendente</p>
                <p className="text-xs text-slate-400">Este recibo ainda aguarda confirmação de pagamento.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <p className="font-bold text-red-700 text-lg">Recibo Inválido</p>
                <p className="text-xs text-slate-400">Este recibo não foi encontrado ou é inválido.</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 pb-6 text-center text-xs text-slate-400">
          {orgSettings?.address && <p>{orgSettings.address}</p>}
          <p className="mt-1">Validação antifraude • {orgSettings?.system_name || "FAP Pulse"}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-slate-800" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}
