import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DoacaoTransferida {
  id: string;
  donor_name: string;
  tipo_doacao: string;
  subtipo?: string;
  quantidade?: string;
  descricao?: string;
  status: string;
  created_at: string;
}

export interface TransferenciaData {
  numero: string;
  data: string;
  origem: string; // ex: "Telemarketing & Relacionamento"
  setor_destino: string;
  coordenador: string;
  coordenador_email?: string;
  coordenador_telefone?: string;
  ramal?: string;
  doacoes: DoacaoTransferida[];
  obs?: string;
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
  casa: "Casa / Imóvel",
  predio_comercial: "Prédio Comercial",
  outro: "Outro",
};

const tipoEmoji: Record<string, string> = {
  cabelo: "✂️",
  fraldas_geriatricas: "🍼",
  alimentos: "🥫",
  remedios: "💊",
  veiculo: "🚗",
  terreno: "📍",
  casa: "🏠",
  predio_comercial: "🏢",
  outro: "📦",
};

function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

export async function gerarPDFTransferencia(data: TransferenciaData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const usable = W - M * 2;
  let y = 15;

  const cor = {
    primaria: [14, 60, 120] as [number, number, number],
    secundaria: [30, 100, 180] as [number, number, number],
    accent: [234, 90, 20] as [number, number, number],
    fundo: [235, 242, 255] as [number, number, number],
    fundoAlerta: [255, 248, 232] as [number, number, number],
    texto: [30, 30, 50] as [number, number, number],
    subTexto: [100, 110, 130] as [number, number, number],
    borda: [180, 200, 230] as [number, number, number],
    verde: [22, 130, 80] as [number, number, number],
    fundoVerde: [220, 248, 235] as [number, number, number],
    branco: [255, 255, 255] as [number, number, number],
  };

  const addPage = () => {
    doc.addPage();
    y = 18;
    // cabeçalho mini em páginas extras
    doc.setFillColor(...cor.primaria);
    doc.rect(0, 0, W, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`TRANSFERÊNCIA Nº ${data.numero} — ${data.setor_destino.toUpperCase()}`, M, 6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...cor.subTexto);
    doc.text(`Gerado em ${data.data}`, W - M, 6.5, { align: "right" });
    y = 16;
  };

  const checkY = (need: number) => {
    if (y + need > 278) addPage();
  };

  // ─── CABEÇALHO TOPO ─────────────────────────────────────────────
  doc.setFillColor(...cor.primaria);
  doc.rect(0, 0, W, 38, "F");

  // Acento decorativo
  doc.setFillColor(...cor.accent);
  doc.rect(0, 0, 5, 38, "F");
  doc.rect(W - 5, 0, 5, 38, "F");

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("TERMO DE TRANSFERÊNCIA DE DOAÇÕES", W / 2, 14, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${data.numero}  ·  Emitido em ${data.data}`, W / 2, 21, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(200, 215, 255);
  const orgName = data.org.system_name || "Organização";
  doc.text(orgName, W / 2, 28, { align: "center" });
  if (data.org.cnpj) doc.text(`CNPJ: ${data.org.cnpj}`, W / 2, 33, { align: "center" });

  y = 46;

  // ─── CAIXAS: ORIGEM → DESTINO ────────────────────────────────────
  const halfW = (usable - 8) / 2;

  // Caixa Origem
  doc.setFillColor(...cor.fundo);
  doc.roundedRect(M, y, halfW, 32, 3, 3, "F");
  doc.setDrawColor(...cor.borda);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, halfW, 32, 3, 3, "S");

  doc.setFillColor(...cor.secundaria);
  doc.roundedRect(M, y, halfW, 7, 3, 3, "F");
  doc.rect(M, y + 4, halfW, 3, "F"); // retângulo cobre canto inferior
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("📤  SETOR DE ORIGEM", M + 4, y + 5);

  doc.setTextColor(...cor.texto);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.origem, M + 4, y + 14);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...cor.subTexto);
  doc.text("Telemarketing & Captação", M + 4, y + 20);
  doc.text(`Data: ${data.data}`, M + 4, y + 27);

  // Seta
  doc.setTextColor(...cor.accent);
  doc.setFontSize(16);
  doc.text("→", M + halfW + 4 - 2, y + 18, { align: "center" });

  // Caixa Destino
  const xD = M + halfW + 8;
  doc.setFillColor(...cor.fundoVerde);
  doc.roundedRect(xD, y, halfW, 32, 3, 3, "F");
  doc.setDrawColor(...cor.verde);
  doc.setLineWidth(0.3);
  doc.roundedRect(xD, y, halfW, 32, 3, 3, "S");

  doc.setFillColor(...cor.verde);
  doc.roundedRect(xD, y, halfW, 7, 3, 3, "F");
  doc.rect(xD, y + 4, halfW, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("🏢  SETOR DESTINATÁRIO", xD + 4, y + 5);

  doc.setTextColor(...cor.texto);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const linhasSetor = splitText(doc, data.setor_destino, halfW - 8);
  doc.text(linhasSetor[0] || data.setor_destino, xD + 4, y + 14);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...cor.subTexto);
  doc.text(`Coord: ${data.coordenador}`, xD + 4, y + 20);
  if (data.coordenador_telefone) doc.text(`Tel: ${data.coordenador_telefone}`, xD + 4, y + 25.5);
  if (data.ramal) doc.text(`Ramal: ${data.ramal}`, xD + 4, y + 31);

  y += 40;

  // ─── RESUMO ─────────────────────────────────────────────────────
  checkY(16);
  doc.setFillColor(...cor.fundoAlerta);
  doc.roundedRect(M, y, usable, 14, 3, 3, "F");
  doc.setDrawColor(230, 180, 30);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, usable, 14, 3, 3, "S");

  doc.setTextColor(...cor.texto);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`📦 Total de itens transferidos: ${data.doacoes.length}`, M + 5, y + 6);

  const tipos = data.doacoes.reduce<Record<string, number>>((acc, d) => {
    const k = tipoLabel[d.tipo_doacao] || d.tipo_doacao;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const resumoStr = Object.entries(tipos).map(([t, c]) => `${c}x ${t}`).join("  |  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...cor.subTexto);
  const linhasResumo = splitText(doc, resumoStr, usable - 10);
  doc.text(linhasResumo[0] || resumoStr, M + 5, y + 11.5);

  y += 22;

  // ─── TABELA DE DOAÇÕES ───────────────────────────────────────────
  checkY(20);

  // Header tabela
  const cols = { data: 22, doador: 55, tipo: 38, qtd: 40, status: 24 };
  const rowH = 8;
  const headerH = 9;

  doc.setFillColor(...cor.primaria);
  doc.roundedRect(M, y, usable, headerH, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  let cx = M + 3;
  doc.text("DATA", cx, y + 6);
  cx += cols.data;
  doc.text("DOADOR", cx, y + 6);
  cx += cols.doador;
  doc.text("TIPO / SUBTIPO", cx, y + 6);
  cx += cols.tipo;
  doc.text("QTDE / DESCRIÇÃO", cx, y + 6);
  cx += cols.qtd;
  doc.text("STATUS", cx, y + 6);

  y += headerH;

  // Linhas da tabela
  data.doacoes.forEach((d, idx) => {
    checkY(rowH + 2);

    const bgColor = idx % 2 === 0 ? cor.branco : ([245, 248, 255] as [number, number, number]);
    doc.setFillColor(...bgColor);
    doc.rect(M, y, usable, rowH, "F");
    doc.setDrawColor(...cor.borda);
    doc.setLineWidth(0.15);
    doc.line(M, y + rowH, M + usable, y + rowH);

    const dateStr = (() => {
      try { return format(new Date(d.created_at), "dd/MM/yy", { locale: ptBR }); }
      catch { return "—"; }
    })();

    const tipoStr = `${tipoEmoji[d.tipo_doacao] || "📦"} ${tipoLabel[d.tipo_doacao] || d.tipo_doacao}`;
    const subStr = d.subtipo ? ` — ${d.subtipo}` : "";
    const qtdStr = d.quantidade || d.descricao || "—";
    const statusStr = d.status === "recebido" ? "✅ Recebido" : d.status === "pendente" ? "⏳ Pendente" : "❌ Cancelado";

    doc.setTextColor(...cor.texto);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    let rx = M + 3;
    doc.text(dateStr, rx, y + 5.5);
    rx += cols.data;

    const donorLines = splitText(doc, d.donor_name, cols.doador - 4);
    doc.setFont("helvetica", "bold");
    doc.text(donorLines[0], rx, y + 5.5);
    doc.setFont("helvetica", "normal");
    rx += cols.doador;

    const tipoLines = splitText(doc, tipoStr + subStr, cols.tipo - 4);
    doc.text(tipoLines[0], rx, y + 5.5);
    rx += cols.tipo;

    const qtdLines = splitText(doc, qtdStr, cols.qtd - 4);
    doc.text(qtdLines[0], rx, y + 5.5);
    rx += cols.qtd;

    // Status badge simulado
    if (d.status === "recebido") {
      doc.setTextColor(...cor.verde);
    } else if (d.status === "pendente") {
      doc.setTextColor(180, 110, 0);
    } else {
      doc.setTextColor(180, 30, 30);
    }
    doc.text(statusStr, rx, y + 5.5);
    doc.setTextColor(...cor.texto);

    y += rowH;
  });

  // Borda total da tabela
  y += 2;

  // ─── OBSERVAÇÕES ─────────────────────────────────────────────────
  if (data.obs) {
    checkY(20);
    y += 4;
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(M, y, usable, 18, 2, 2, "F");
    doc.setDrawColor(...cor.borda);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, usable, 18, 2, 2, "S");

    doc.setTextColor(...cor.subTexto);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("📝 Observações:", M + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...cor.texto);
    const obsLines = splitText(doc, data.obs, usable - 12);
    obsLines.slice(0, 2).forEach((line, i) => doc.text(line, M + 4, y + 12 + i * 5));
    y += 22;
  }

  // ─── ASSINATURAS ─────────────────────────────────────────────────
  checkY(55);
  y += 6;

  doc.setDrawColor(...cor.borda);
  doc.setLineWidth(0.3);
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(M, y, usable, 45, 3, 3, "F");
  doc.roundedRect(M, y, usable, 45, 3, 3, "S");

  doc.setTextColor(...cor.primaria);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("ASSINATURAS E CONFIRMAÇÃO", W / 2, y + 7, { align: "center" });

  // Linha assinatura Origem
  const lineY = y + 25;
  const lineLen = 70;
  const x1 = M + 10;
  const x2 = W - M - 10 - lineLen;

  doc.setDrawColor(60, 80, 120);
  doc.setLineWidth(0.5);
  doc.line(x1, lineY, x1 + lineLen, lineY);
  doc.line(x2, lineY, x2 + lineLen, lineY);

  doc.setTextColor(...cor.subTexto);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Responsável pela Transferência", x1 + lineLen / 2, lineY + 4, { align: "center" });
  doc.text("Telemarketing / Captação de Recursos", x1 + lineLen / 2, lineY + 8, { align: "center" });

  doc.text(`Coord: ${data.coordenador}`, x2 + lineLen / 2, lineY + 4, { align: "center" });
  doc.text(data.setor_destino, x2 + lineLen / 2, lineY + 8, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...cor.texto);
  doc.text("Assinatura — Origem", x1 + lineLen / 2, lineY - 5, { align: "center" });
  doc.text("Recebido — Setor Destino", x2 + lineLen / 2, lineY - 5, { align: "center" });

  y += 52;

  // ─── RODAPÉ ─────────────────────────────────────────────────────
  const footerY = 287;
  doc.setFillColor(...cor.primaria);
  doc.rect(0, footerY - 8, W, 12, "F");
  doc.setTextColor(200, 215, 255);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  const footerLeft = [data.org.system_name, data.org.cnpj ? `CNPJ: ${data.org.cnpj}` : ""].filter(Boolean).join("  |  ");
  doc.text(footerLeft, M, footerY - 1);
  doc.text(`Termo emitido em ${data.data}  —  Nº ${data.numero}`, W - M, footerY - 1, { align: "right" });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6.5);
    doc.setTextColor(180, 190, 210);
    doc.text(`Página ${p} de ${totalPages}`, W / 2, footerY - 1, { align: "center" });
  }

  doc.save(`transferencia_doacoes_${data.numero.replace(/\//g, "-")}.pdf`);
}
