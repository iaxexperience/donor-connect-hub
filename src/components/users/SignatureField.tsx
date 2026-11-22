import { useEffect, useRef, useState } from "react";
import { PenLine, Upload, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  uploadSignature, removeSignatureFile, getSignatureUrl, validateSignatureFile,
} from "@/lib/signatureService";

interface Props {
  userId: string;
  signaturePath: string | null | undefined;
  /** Grava o novo caminho (ou null) no perfil. */
  onSaved: (path: string | null) => Promise<void>;
}

/**
 * Campo de assinatura digitalizada do usuário. A imagem é enviada na hora
 * (não depende do botão "Salvar Alterações") e passa a sair nos recibos
 * emitidos por essa pessoa.
 */
export function SignatureField({ userId, signaturePath, onSaved }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(signaturePath || null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPath(signaturePath || null), [signaturePath]);
  useEffect(() => {
    let alive = true;
    getSignatureUrl(path).then((u) => alive && setPreview(u));
    return () => { alive = false; };
  }, [path]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const err = validateSignatureFile(file);
    if (err) {
      toast({ title: "Imagem inválida", description: err, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const newPath = await uploadSignature(userId, file);
      await onSaved(newPath);
      await removeSignatureFile(path); // apaga a anterior só depois de salvar a nova
      setPath(newPath);
      toast({ title: "Assinatura salva", description: "Ela já sai nos próximos recibos emitidos por este usuário." });
    } catch (e: any) {
      toast({ title: "Erro ao enviar assinatura", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await onSaved(null);
      await removeSignatureFile(path);
      setPath(null);
      toast({ title: "Assinatura removida" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><PenLine className="w-4 h-4" />Assinatura (para recibos)</Label>
      <div className="flex items-center gap-3 rounded-2xl border p-3">
        <div className="h-16 w-40 shrink-0 rounded-lg border border-dashed bg-white flex items-center justify-center overflow-hidden">
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : preview ? (
            <img src={preview} alt="Assinatura" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">Sem assinatura</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {path ? "Trocar imagem" : "Enviar imagem"}
          </Button>
          {path && (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={handleRemove}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Remover
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground leading-tight">
            PNG ou JPG até 1 MB. De preferência fundo branco ou transparente.
          </p>
        </div>
      </div>
    </div>
  );
}
