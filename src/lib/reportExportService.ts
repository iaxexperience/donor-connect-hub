import { loadBranding, logoForPDF } from "@/lib/branding";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReportColumn {
  header: string;
  dataKey: string;
  align?: "left" | "center" | "right";
  width?: number;
  format?: (value: any, row?: any) => string | number;
}

export interface ReportKPI {
  label: string;
  value: string;
}

export interface ExportReportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  systemName?: string;
  orientation?: "portrait" | "landscape";
  columns: ReportColumn[];
  rows: any[];
  kpis?: ReportKPI[];
}

const fmtCurrency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Gera e baixa uma planilha Excel (.xlsx) nativa e bem estruturada
 */
export function exportReportToExcel(options: ExportReportOptions) {
  const { filename, title, subtitle, columns, rows, kpis } = options;

  // Prepara os dados das linhas com base nos formatters
  const formattedRows = rows.map((row) => {
    const item: Record<string, any> = {};
    columns.forEach((col) => {
      const rawVal = row[col.dataKey];
      item[col.header] = col.format ? col.format(rawVal, row) : rawVal ?? "";
    });
    return item;
  });

  const wb = XLSX.utils.book_new();

  // Cabeçalho de informações adicionais (se houver KPIs)
  const headerData: any[] = [
    [title],
    subtitle ? [subtitle] : [],
    [`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`],
    [],
  ].filter(Boolean);

  if (kpis && kpis.length > 0) {
    headerData.push(["RESUMO:"]);
    headerData.push(kpis.map((k) => `${k.label}: ${k.value}`));
    headerData.push([]);
  }

  // Cria a planilha mesclando informações ou gerando direto dos objetos
  const ws = XLSX.utils.json_to_sheet(formattedRows);

  // Calcula larguras automáticas de coluna
  const colWidths = columns.map((col) => {
    let maxLen = col.header.length;
    formattedRows.forEach((r) => {
      const valStr = String(r[col.header] || "");
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });

  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Relatório");

  const fullFilename = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
}

/**
 * Gera e baixa um relatório profissional em PDF com tabelas e cabeçalhos
 */
export async function exportReportToPDF(options: ExportReportOptions) {
  const branding = await loadBranding();
  const logo = await logoForPDF(branding.logo_url);
  options = {...options, systemName: branding.system_name};
  const {
    filename,
    title,
    subtitle,
    systemName = "Pulse Doações — Hospital FAP",
    columns,
    rows,
    kpis,
    orientation = columns.length > 6 ? "landscape" : "portrait",
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;
  if (logo) { doc.addImage(logo,"PNG",14,10,40,16); currentY=34; }

  // 1. Cabeçalho Superior Institucional
  doc.setFillColor(15, 75, 145); // Azul primário elegante
  doc.rect(margin, currentY - 2, 4, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 30, 55);
  doc.text(title, margin + 8, currentY + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 110, 130);
  doc.text(
    `${systemName} • Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    margin + 8,
    currentY + 10
  );

  currentY += 16;

  // 2. Subtítulo e Filtros aplicados
  if (subtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(70, 80, 95);
    const splitSubtitle = doc.splitTextToSize(subtitle, pageWidth - margin * 2);
    doc.text(splitSubtitle, margin, currentY);
    currentY += splitSubtitle.length * 4.5 + 2;
  }

  // 3. Caixas de KPIs / Resumo
  if (kpis && kpis.length > 0) {
    const kpiCount = kpis.length;
    const boxGap = 4;
    const totalGap = boxGap * (kpiCount - 1);
    const boxWidth = (pageWidth - margin * 2 - totalGap) / kpiCount;
    const boxHeight = 14;

    kpis.forEach((kpi, idx) => {
      const boxX = margin + idx * (boxWidth + boxGap);
      doc.setFillColor(245, 248, 252);
      doc.setDrawColor(215, 225, 240);
      doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 115, 135);
      doc.text(kpi.label.toUpperCase(), boxX + 4, currentY + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 65, 130);
      doc.text(kpi.value, boxX + 4, currentY + 10.5);
    });

    currentY += boxHeight + 6;
  }

  // 4. Montagem das colunas e linhas para autoTable
  const tableHeaders = columns.map((c) => c.header);
  const tableRows = rows.map((r) =>
    columns.map((c) => {
      const rawVal = r[c.dataKey];
      return c.format ? c.format(rawVal, r) : rawVal ?? "—";
    })
  );

  const columnStyles: Record<number, any> = {};
  columns.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || "left",
      cellWidth: col.width ? col.width : "auto",
    };
  });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 15 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 50, 70],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [20, 60, 115],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253],
    },
    columnStyles,
    didDrawPage: (data) => {
      // Rodapé com numeração de página
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 150, 165);
      doc.text(
        `Página ${pageNumber} de ${totalPages} • ${systemName}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    },
  });

  const fullFilename = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
  doc.save(fullFilename);
}

