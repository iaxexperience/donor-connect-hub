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

// ─────────────────────────────────────────────────────────────
// RECIBO DE DOAÇÃO FÍSICA
// ─────────────────────────────────────────────────────────────

export interface ReciboFisicoData {
  donor_name: string;
  tipo_doacao: string;
  subtipo?: string;
  descricao?: string;
  quantidade?: string;
  observacoes?: string;
  status: string;
  created_at: string;
  recebido_em?: string;
  org: {
    system_name?: string;
    logo_url?: string;
    cnpj?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const tipoLabel: Record<string, string> = {
  cabelo: "Doação de Cabelo",
  fraldas_geriatricas: "Fraldas Geriátricas",
  alimentos: "Alimentos",
  remedios: "Remédios",
  veiculo: "Veículo",
  terreno: "Terreno",
  casa: "Casa",
  predio_comercial: "Prédio Comercial",
  outro: "Outro",
};

export async function gerarReciboFisicoPDF(data: ReciboFisicoData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const primaryColor: [number, number, number] = [0, 102, 204];
  const darkColor: [number, number, number] = [15, 25, 75];
  const grayColor: [number, number, number] = [100, 100, 110];

  // ── CABEÇALHO ──────────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageW, 38, "F");

  let logoEndX = margin;
  if (data.org.logo_url) {
    try {
      const img = await loadImage(data.org.logo_url);
      doc.addImage(img, "PNG", margin, 7, 22, 22);
      logoEndX = margin + 28;
    } catch { /* sem logo */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(data.org.system_name || "FAP Pulse", logoEndX, 18);

  if (data.org.cnpj) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`CNPJ: ${data.org.cnpj}`, logoEndX, 25);
  }
  if (data.org.address) {
    doc.setFontSize(7);
    doc.text(data.org.address, logoEndX, 31);
  }

  // Nº do documento (canto direito do cabeçalho)
  const recNum = `RDF-${format(new Date(data.created_at), "yyyyMMdd-HHmmss")}`;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Nº ${recNum}`, pageW - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(data.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), pageW - margin, 20, { align: "right" });

  let y = 52;

  // ── TÍTULO ─────────────────────────────────────────────────
  doc.setTextColor(...darkColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE DOAÇÃO FÍSICA", pageW / 2, y, { align: "center" });

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 4, pageW - margin, y + 4);
  y += 16;

  // ── MENSAGEM DE AGRADECIMENTO ───────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  const msg = `${data.org.system_name || "Nossa instituição"} agradece imensamente a sua generosa contribuição. Esta doação será destinada a apoiar nossas ações sociais e transformar vidas. Guarde este recibo como comprovante.`;
  const msgLines = doc.splitTextToSize(msg, pageW - margin * 2);
  doc.text(msgLines, margin, y);
  y += msgLines.length * 5 + 14;

  // ── DADOS DO DOADOR ─────────────────────────────────────────
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(margin, y - 4, pageW - margin * 2, 18, 3, 3, "F");
  doc.setDrawColor(220, 226, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y - 4, pageW - margin * 2, 18, 3, 3, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DOADOR", margin + 4, y + 2);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.donor_name, margin + 4, y + 10);
  y += 26;

  // ── DETALHES DA DOAÇÃO ──────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text("DETALHES DA DOAÇÃO", margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 210, 230);
  doc.line(margin, y + 3, pageW - margin, y + 3);
  y += 12;

  const addRow = (label: string, value: string) => {
    if (!value || value === "Não informado") return;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(label.toUpperCase(), margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 60);
    doc.setFontSize(11);
    const valueLines = doc.splitTextToSize(value, pageW - margin * 2 - 60);
    doc.text(valueLines, margin + 65, y - 2);
    doc.setDrawColor(235, 238, 245);
    doc.setLineWidth(0.2);
    doc.line(margin, y + (valueLines.length * 4) + 2, pageW - margin, y + (valueLines.length * 4) + 2);
    y += valueLines.length * 4 + 10;
  };

  const tipoCompleto = data.subtipo
    ? `${tipoLabel[data.tipo_doacao] || data.tipo_doacao} — ${data.subtipo.charAt(0).toUpperCase() + data.subtipo.slice(1)}`
    : tipoLabel[data.tipo_doacao] || data.tipo_doacao;

  addRow("Tipo de Doação:", tipoCompleto);
  if (data.quantidade) addRow("Quantidade / Volume:", data.quantidade);
  if (data.descricao)  addRow("Descrição:", data.descricao);
  if (data.observacoes) addRow("Observações:", data.observacoes);
  addRow("Data do Registro:", format(new Date(data.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
  if (data.recebido_em) addRow("Data de Recebimento:", format(new Date(data.recebido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));

  // Status
  const statusLabel = data.status === "recebido" ? "✓ Recebido" : data.status === "pendente" ? "⏳ Pendente de recebimento" : "✗ Cancelado";
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(data.status === "recebido" ? 22 : data.status === "pendente" ? 180 : 200,
                   data.status === "recebido" ? 163 : data.status === "pendente" ? 120 : 50,
                   data.status === "recebido" ? 74  : data.status === "pendente" ? 0   : 50);
  doc.text(`Status: ${statusLabel}`, margin, y);
  y += 16;

  // ── ASSINATURA ─────────────────────────────────────────────
  y = Math.max(y, 220);
  doc.setDrawColor(100, 120, 160);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.text("Assinatura do Doador", margin + 35, y + 5, { align: "center" });
  doc.text("Responsável pelo Recebimento", pageW - margin - 35, y + 5, { align: "center" });

  // ── RODAPÉ ─────────────────────────────────────────────────
  const footerY = 282;
  doc.setFillColor(245, 247, 252);
  doc.rect(0, footerY - 4, pageW, 20, "F");

  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);

  const contacts = [data.org.phone, data.org.email].filter(Boolean).join("   |   ");
  if (contacts) doc.text(contacts, pageW / 2, footerY + 2, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(160, 160, 170);
  doc.text(
    `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • ${data.org.system_name || "FAP Pulse"}`,
    pageW / 2, footerY + 8, { align: "center" }
  );

  const nomeArquivo = `recibo-fisico-${data.donor_name.split(" ")[0].toLowerCase()}-${format(new Date(data.created_at), "ddMMyyyy")}.pdf`;
  doc.save(nomeArquivo);
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
