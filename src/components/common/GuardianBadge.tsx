import { ShieldCheck } from "lucide-react";

// Selo "Protegido por IAX Guardian", igual ao do FindFlow. É só um link para o site do
// Guardian; o monitoramento em si é feito pelos eventos enviados (função guardian-event).
export default function GuardianBadge({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const styles =
    tone === "dark"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  const dot = tone === "dark" ? "bg-emerald-400 text-[#0b1630]" : "bg-emerald-600 text-white";
  return (
    <a
      href="https://iaxguardian.com.br"
      target="_blank"
      rel="noopener noreferrer"
      title="Acessos monitorados e protegidos pelo IAX Guardian"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${styles} ${className}`}
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${dot}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
      </span>
      Protegido por <span className="font-bold">IAX Guardian</span>
    </a>
  );
}
