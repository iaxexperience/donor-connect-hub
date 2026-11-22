import { useEffect, useState } from "react";
import { ShieldCheck, Eye, EyeOff, Loader2, PlugZap, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Tabela nova, ainda fora dos tipos gerados do Supabase.
const db = supabase as any;
const DEFAULT_URL = "https://iaxguardian.com.br/api/public/ingest-event";

const EVENTS = [
  ["login_failed", "Tentativa de login com senha errada"],
  ["role_changed", "Troca de papel de um usuário"],
  ["user_deactivated", "Usuário desativado"],
  ["user_activated", "Usuário reativado"],
];

export default function IaxGuardian() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [ingestUrl, setIngestUrl] = useState(DEFAULT_URL);
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("pulse-doacoes");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    db.from("guardian_settings").select("*").eq("id", 1).maybeSingle().then(({ data, error }: any) => {
      if (error) {
        toast({ title: "Não foi possível carregar a configuração", description: error.message, variant: "destructive" });
      } else if (data) {
        setIngestUrl(data.ingest_url || DEFAULT_URL);
        setApiKey(data.api_key || "");
        setCompanyId(data.source_company_id || "pulse-doacoes");
        setEnabled(!!data.enabled);
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validUrl = /^https:\/\/[^\s]+$/i.test(ingestUrl.trim());

  const save = async () => {
    if (!validUrl) {
      toast({ title: "URL inválida", description: "Use um endereço https://", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await db.from("guardian_settings").upsert({
      id: 1,
      ingest_url: ingestUrl.trim(),
      api_key: apiKey.trim() || null,
      source_company_id: companyId.trim() || "pulse-doacoes",
      enabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });
    setSaving(false);
    if (error) return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    toast({ title: "Configuração salva", description: enabled ? "O envio de eventos está ativo." : "Envio desligado (modo silencioso)." });
  };

  const test = async () => {
    if (!validUrl || !apiKey.trim()) {
      toast({ title: "Preencha a URL e a chave para testar", variant: "destructive" });
      return;
    }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("guardian-event", {
      body: { action: "test", ingest_url: ingestUrl.trim(), api_key: apiKey.trim() },
    });
    setTesting(false);
    if (error) return toast({ title: "Falha no teste", description: error.message, variant: "destructive" });
    if (data?.sent) {
      toast({ title: "Conexão OK", description: `O IAX Guardian recebeu o evento de teste (HTTP ${data.status}).` });
    } else {
      toast({
        title: "O Guardian não aceitou o teste",
        description: data?.error || `HTTP ${data?.status ?? "?"} ${data?.response ?? ""}`.trim(),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6" /> IAX Guardian
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitoramento de segurança (blue team) à parte do Pulse Doações. O Pulse só envia eventos para lá
          (login falho, troca de papel, usuário desativado ou reativado) — o Guardian nunca acessa o banco do
          Pulse de volta.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>URL de ingestão</Label>
              <Input value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} className="font-mono text-sm" placeholder={DEFAULT_URL} />
            </div>

            <div className="space-y-1.5">
              <Label>Chave de API (x-api-key)</Label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                  className="font-mono text-sm"
                  placeholder="Cole aqui a chave fornecida pelo IAX Guardian"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A chave fica guardada no servidor e só administradores a veem. Os eventos são enviados pelo
                servidor, nunca direto do navegador.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Identificador da organização (source_company_id)</Label>
              <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="pulse-doacoes" />
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <p className="font-semibold">Envio de eventos ativo</p>
                <p className="text-sm text-muted-foreground">
                  Desligado, nenhum evento sai do Pulse (nada quebra, só fica em modo silencioso).
                </p>
              </div>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-primary" />
            </label>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={test} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
                Testar conexão
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <p className="font-semibold">Eventos enviados</p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {EVENTS.map(([code, label]) => (
            <li key={code} className="flex items-center gap-3">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{code}</code> {label}
            </li>
          ))}
        </ul>
        <p className="mt-4 font-semibold">Decisão antes do login</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Com o envio ativo, cada tentativa de entrar pergunta ao Guardian (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/public/decision</code>)
          se o IP e o e-mail podem acessar. Se ele bloquear, o login é recusado. Se o Guardian estiver fora do ar ou demorar, o
          acesso é liberado normalmente.
        </p>
      </div>
    </div>
  );
}
