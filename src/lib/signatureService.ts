import { supabase } from "@/integrations/supabase/client";

// Assinaturas ficam no bucket privado "signatures", em "<userId>/assinatura-<timestamp>.<ext>".
// O caminho é salvo em profiles.signature_path.
const BUCKET = "signatures";
const MAX_BYTES = 1024 * 1024; // 1 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export function validateSignatureFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return "Use uma imagem PNG, JPG ou WEBP.";
  if (file.size > MAX_BYTES) return "A imagem deve ter no máximo 1 MB.";
  return null;
}

/** Envia a imagem e devolve o caminho salvo no bucket. */
export async function uploadSignature(userId: string, file: File): Promise<string> {
  const err = validateSignatureFile(file);
  if (err) throw new Error(err);
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
  const path = `${userId}/assinatura-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeSignatureFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Link temporário (para pré-visualização na tela). */
export async function getSignatureUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Assinatura de um usuário pronta para o jsPDF (data URL PNG), ou null se a
 * pessoa não cadastrou assinatura. Nunca lança erro: sem assinatura, o recibo
 * sai com a linha em branco como antes.
 */
export async function getUserSignatureDataUrl(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await supabase.from("profiles").select("signature_path").eq("id", userId).maybeSingle();
    const url = await getSignatureUrl((data as any)?.signature_path);
    if (!url) return null;
    return await imageToPngDataUrl(url);
  } catch {
    return null;
  }
}

function imageToPngDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Desenha a assinatura no PDF centralizada sobre a linha de assinatura,
 * mantendo a proporção da imagem.
 *   centerX / lineY: centro horizontal e altura da linha (mm)
 *   maxW / maxH: caixa máxima da imagem (mm)
 */
export function drawSignatureOnPdf(
  doc: any, dataUrl: string | null | undefined, centerX: number, lineY: number, maxW: number, maxH: number
) {
  if (!dataUrl) return;
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width / props.height;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    doc.addImage(dataUrl, "PNG", centerX - w / 2, lineY - h - 0.5, w, h);
  } catch {
    /* imagem inválida: segue sem assinatura */
  }
}
