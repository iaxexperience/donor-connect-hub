import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, X, ClipboardPaste } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PROOF_ACCEPT, validateProofFile } from "@/lib/proofService";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Liga a captura de Ctrl+V (print colado) enquanto o campo está na tela. */
  enablePaste?: boolean;
}

/**
 * Campo do comprovante de depósito/Pix: clique para escolher, arraste o
 * arquivo ou cole um print com Ctrl+V. Aceita imagem ou PDF (até 10 MB).
 * O envio de fato acontece ao salvar o formulário.
 */
export function ProofUpload({ file, onChange, enablePaste = true }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (f: File | null | undefined) => {
    if (!f) return;
    const err = validateProofFile(f);
    if (err) {
      toast({ title: "Comprovante inválido", description: err, variant: "destructive" });
      return;
    }
    onChange(f);
  };

  // Ctrl+V: pega a imagem (print) ou arquivo da área de transferência.
  useEffect(() => {
    if (!enablePaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.kind === "file");
      const pasted = item?.getAsFile();
      if (!pasted) return; // texto colado em outro campo segue normal
      e.preventDefault();
      const named = pasted.name && pasted.name !== "image.png"
        ? pasted
        : new File([pasted], `print-${Date.now()}.png`, { type: pasted.type || "image/png" });
      accept(named);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enablePaste]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-white grid place-items-center">
          {preview ? (
            <img src={preview} alt="Prévia do comprovante" className="h-full w-full object-cover" />
          ) : (
            <FileText className="h-6 w-6 text-red-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">{file.name}</p>
          <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(0)} KB · será enviado ao salvar</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-red-600"
          title="Remover comprovante"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files?.[0]); }}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors ${
        dragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={PROOF_ACCEPT}
        className="hidden"
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
      />
      <ImagePlus className="h-5 w-5 text-emerald-600" />
      <p className="text-xs font-semibold text-slate-700">Clique, arraste ou cole o comprovante</p>
      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        <ClipboardPaste className="h-3 w-3" /> Tirou print? Aperte <kbd className="rounded border bg-slate-50 px-1">Ctrl</kbd>+<kbd className="rounded border bg-slate-50 px-1">V</kbd> · Imagem ou PDF até 10 MB
      </p>
    </div>
  );
}
