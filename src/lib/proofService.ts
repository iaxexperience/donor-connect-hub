import { supabase } from "@/integrations/supabase/client";

// Comprovantes de depósito/Pix ficam no bucket PRIVADO "comprovantes",
// em "<id do usuário>/comprovante-<timestamp>.<ext>". O caminho vai em donations.proof_path.
const BUCKET = "comprovantes";
export const PROOF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const PROOF_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,application/pdf";
const ALLOWED = PROOF_ACCEPT.split(",");

export function validateProofFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return "Envie uma imagem (PNG, JPG, WEBP) ou um PDF.";
  if (file.size > PROOF_MAX_BYTES) return "O arquivo deve ter no máximo 10 MB.";
  return null;
}

const extFor = (type: string) =>
  type === "application/pdf" ? "pdf"
  : type === "image/jpeg" ? "jpg"
  : type === "image/webp" ? "webp"
  : type === "image/heic" ? "heic"
  : "png";

export async function uploadProof(userId: string, file: File): Promise<string> {
  const err = validateProofFile(file);
  if (err) throw new Error(err);
  const path = `${userId}/comprovante-${Date.now()}.${extFor(file.type)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeProof(path: string | null | undefined) {
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}

/** Abre o comprovante numa nova aba (link temporário de 5 minutos). */
export async function openProof(path: string) {
  // Abre a aba já no clique (evita bloqueio de pop-up) e depois aponta para o link.
  const win = window.open("", "_blank");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    win?.close();
    throw error || new Error("Não foi possível abrir o comprovante.");
  }
  if (win) win.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}
