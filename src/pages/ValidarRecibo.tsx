import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Heart, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VerifyResult {
  status: "issued" | "confirmed" | "cancelled" | "disputed" | "invalid";
  number?: string;
  issued_at?: string;
  organization?: string;
  contact?: string;
  donor?: string;
  description?: string;
  quantity?: string;
  amount?: number;
}

const statusLabel: Record<string, string> = {
  confirmed: "✅ Confirmado",
  issued: "⏳ Aguardando confirmação",
  cancelled: "❌ Cancelado",
  disputed: "⚠️ Em contestação",
};

export default function ValidarRecibo() {
  const [params] = useSearchParams();
  const hash = params.get("hash");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!hash) { setLoading(false); return; }
      const { data } = await supabase.functions.invoke("collection-receipts", {
        body: { action: "verify", hash },
      });
      setResult(data || { status: "invalid" });
      setLoading(false);
    };
    run();
  }, [hash]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const valid = result && result.status !== "invalid";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white text-center">
          <Heart className="w-10 h-10 mx-auto mb-3" fill="currentColor" />
          <h1 className="font-bold text-xl">{result?.organization || "Pulse Doações"}</h1>
          {result?.contact && <p className="text-xs text-white/70 mt-1">{result.contact}</p>}
        </div>

        <div className="p-8">
          {valid ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <p className="font-bold text-green-700 text-lg">Recibo de Coleta Válido</p>
                  <p className="text-xs text-slate-400">Este recibo é autêntico e foi emitido por {result?.organization || "Pulse Doações"}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-5">
                <Row label="Nº do Recibo" value={result?.number || "—"} bold />
                <Row label="Doador" value={result?.donor || "—"} />
                {result?.description && <Row label="Descrição" value={result.description} />}
                {result?.quantity && <Row label="Quantidade" value={result.quantity} />}
                {typeof result?.amount === "number" && result.amount > 0 && (
                  <Row label="Valor" value={formatCurrency(result.amount)} bold />
                )}
                {result?.issued_at && (
                  <Row label="Data" value={format(new Date(result.issued_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
                )}
                <Row label="Status" value={statusLabel[result?.status || ""] || result?.status || "—"} />
              </div>
            </>
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
          <p>Validação antifraude de recibo de coleta</p>
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
