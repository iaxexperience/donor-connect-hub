import jsPDF from "jspdf";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BASE_URL = window.location.origin;

export interface ReciboData {
  receipt_number: string;
  validation_hash: string;
  donor_name: string;
  donor_cpf?: string;
  donor_address?: string;
  received_by?: string;
  amount: number;
  payment_method: string;
  cartao_tipo?: string;
  notes?: string;
  created_at: string;
  org: {
    system_name?: string;
    logo_url?: string;
    cnpj?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const methodLabel = (method: string, tipo?: string): string => {
  if (method === "cartao") return tipo === "debito" ? "Cartão de Débito" : tipo === "credito" ? "Cartão de Crédito" : "Cartão";
  const map: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", boleto: "Boleto Bancário" };
  return map[method] || method;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export async function gerarReciboPDF(data: ReciboData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  let y = 30;

  const fontTitleColor: [number, number, number] = [15, 25, 75]; // Azul escuro
  const fontLabelColor: [number, number, number] = [30, 45, 90]; // Azul escuro labels
  const fontValueColor: [number, number, number] = [80, 80, 90]; // Cinza valores

  // ── LOGO (Centralizado no topo se existir) ─────────────────────
  if (data.org.logo_url) {
    try {
      const img = await loadImage(data.org.logo_url);
      doc.addImage(img, "PNG", (pageW - 25) / 2, 10, 25, 25);
      y = 42;
    } catch {
      y = 20;
    }
  }

  // ── TÍTULO ─────────────────────────────────────────────────────
  doc.setTextColor(...fontTitleColor);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Recibo de Doação", pageW / 2, y, { align: "center" });

  y += 12;

  // ── DATA NO TOPO (À direita) ───────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(format(new Date(data.created_at), "dd/MM/yyyy", { locale: ptBR }), pageW - margin, y, { align: "right" });

  y += 20;

  // ── TEXTO DE AGRADECIMENTO ─────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  
  const text1 = "Obrigado por sua doação! A quantia que você doou fará a diferença, pois os lucros serão destinados a ajudar a colocar crianças na escola para que tenham uma educação melhor e, assim, torná-las melhores membros da sociedade.";
  const text2 = "Este recibo é um comprovante de que recebemos com gratidão sua generosa contribuição para nossa humilde instituição. Guarde este recibo para fins de dedução fiscal.";

  const lines1 = doc.splitTextToSize(text1, pageW - (margin * 2));
  doc.text(lines1, margin, y);
  y += (lines1.length * 5) + 8;

  const lines2 = doc.splitTextToSize(text2, pageW - (margin * 2));
  doc.text(lines2, margin, y);
  y += (lines2.length * 5) + 20;

  // ── SEÇÕES DE INFORMAÇÃO (Vertical) ───────────────────────────
  const addVerticalSection = (label: string, value: string) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...fontLabelColor);
    doc.text(label, margin, y);

    y += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...fontValueColor);
    doc.text(value || "Não informado", margin, y);

    y += 14;
  };

  addVerticalSection("Nome do Doador", data.donor_name);
  addVerticalSection("Endereço do Doador", data.donor_address || "Não informado");
  addVerticalSection("Valor da Doação", formatCurrency(data.amount).replace("R$", "").trim());
  addVerticalSection("Doação Recebida por", data.received_by || "Sistema");
  addVerticalSection("Data de Recebimento", format(new Date(data.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR }));

  // ── QR CODE & NÚMERO (Canto inferior direito) ─────────────────
  const qrUrl = `${BASE_URL}/validate-receipt/${data.validation_hash}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 150, margin: 1 });
  
  const qrSize = 30;
  const qrX = pageW - margin - qrSize;
  const qrY = footerY - qrSize - 10;

  // ── RODAPÉ ─────────────────────────────────────────────────────
  const footerY = 280;
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(`Nº do Recibo: ${data.receipt_number} | Hash: ${data.validation_hash}`, pageW / 2, footerY, { align: "center" });

  doc.save(`Recibo-${data.donor_name.split(' ')[0]}-${data.receipt_number.split('-').pop()}.pdf`);
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
