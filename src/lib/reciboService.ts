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
  let y = 20;

  const primaryColor: [number, number, number] = [0, 102, 204];

  // ── CABEÇALHO ──────────────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageW, 40, "F");

  // Logo (se existir)
  if (data.org.logo_url) {
    try {
      const img = await loadImage(data.org.logo_url);
      doc.addImage(img, "PNG", margin, 8, 24, 24);
    } catch {
      // sem logo
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.org.system_name || "FAP Pulse", data.org.logo_url ? 50 : margin, 20);

  if (data.org.cnpj) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${data.org.cnpj}`, data.org.logo_url ? 50 : margin, 28);
  }
  if (data.org.address) {
    doc.setFontSize(8);
    doc.text(data.org.address, data.org.logo_url ? 50 : margin, 35);
  }

  y = 55;

  // ── TÍTULO ─────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE DOAÇÃO", margin, y);

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 3, pageW - margin, y + 3);

  y += 14;

  // ── NÚMERO DO RECIBO ───────────────────────────────────────────
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y - 5, pageW - margin * 2, 14, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(`Nº ${data.receipt_number}`, margin + 4, y + 5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    format(new Date(data.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    pageW - margin - 4,
    y + 5,
    { align: "right" }
  );

  y += 22;

  // ── DADOS DA DOAÇÃO ────────────────────────────────────────────
  const addRow = (label: string, value: string, highlight = false) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(label, margin, y);

    doc.setFontSize(highlight ? 12 : 10);
    doc.setFont("helvetica", highlight ? "bold" : "normal");
    doc.setTextColor(highlight ? 30 : 50, highlight ? 30 : 50, highlight ? 30 : 50);
    doc.text(value, margin + 55, y);

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 12;
  };

  addRow("Doador:", data.donor_name);
  if (data.donor_cpf) addRow("CPF/CNPJ:", data.donor_cpf);
  addRow("Valor:", formatCurrency(data.amount), true);
  addRow("Modalidade:", methodLabel(data.payment_method, data.cartao_tipo));
  addRow("Data:", format(new Date(data.created_at), "dd/MM/yyyy", { locale: ptBR }));
  addRow("Status:", "✓ Confirmado");
  if (data.notes) addRow("Observações:", data.notes);

  // ── QR CODE ────────────────────────────────────────────────────
  const qrUrl = `${BASE_URL}/validate-receipt/${data.validation_hash}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 200, margin: 1 });

  const qrX = pageW - margin - 45;
  const qrY = y - (7 * 12) - 10;

  doc.addImage(qrDataUrl, "PNG", qrX, qrY, 40, 40);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Escaneie para validar", qrX + 20, qrY + 43, { align: "center" });
  doc.text("este recibo", qrX + 20, qrY + 47, { align: "center" });

  // ── RODAPÉ ─────────────────────────────────────────────────────
  const footerY = 270;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  const contacts = [data.org.phone, data.org.email].filter(Boolean).join("  |  ");
  if (contacts) doc.text(contacts, pageW / 2, footerY + 6, { align: "center" });
  doc.text(
    `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageW / 2,
    footerY + 12,
    { align: "center" }
  );
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(`Hash de validação: ${data.validation_hash}`, pageW / 2, footerY + 18, { align: "center" });

  doc.save(`recibo-${data.receipt_number}.pdf`);
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
