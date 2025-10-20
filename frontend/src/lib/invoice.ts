import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  Company,
  Client,
  Service,
  ServiceOption,
  EngagementStatus,
  SupportType,
  EngagementOptionOverride,
} from '../store/useAppData';
import { formatCurrency, formatDuration } from './format';

export interface GenerateInvoicePayload {
  documentNumber: string;
  issueDate: Date;
  serviceDate: Date;
  company: Company;
  client: Client;
  service: Service;
  options: ServiceOption[];
  optionOverrides?: Record<string, EngagementOptionOverride>;
  additionalCharge: number;
  vatRate: number;
  vatEnabled: boolean;
  status: EngagementStatus;
  supportType: SupportType;
  supportDetail: string;
  paymentMethod?: string | null;
}

const addMultilineText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  if (!text) {
    return y;
  }
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  lines.forEach((line: string) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
};

const ensureSpace = (
  doc: jsPDF,
  cursorY: number,
  requiredHeight: number,
  margin: number,
  pageHeight: number
) => {
  const needsBreak = cursorY + requiredHeight > pageHeight - margin;
  if (!needsBreak) {
    return { cursorY, pageBreak: false } as const;
  }
  doc.addPage();
  return { cursorY: margin, pageBreak: true } as const;
};

const TEXT_COLOR = { r: 20, g: 31, b: 53 };
const ACCENT_COLOR = { r: 0, g: 73, b: 172 };
const LIGHT_BORDER_COLOR = { r: 224, g: 224, b: 224 };

const detectImageFormat = (source: string): 'PNG' | 'JPEG' | 'WEBP' => {
  if (source.startsWith('data:image/')) {
    const mime = source.slice('data:image/'.length, source.indexOf(';')).toLowerCase();
    if (mime.includes('png')) {
      return 'PNG';
    }
    if (mime.includes('webp')) {
      return 'WEBP';
    }
    return 'JPEG';
  }
  const extension = source.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (!extension) {
    return 'PNG';
  }
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'JPEG';
  }
  if (extension === 'webp') {
    return 'WEBP';
  }
  return 'PNG';
};

const formatStatusLabel = (status: EngagementStatus) => {
  switch (status) {
    case 'réalisé':
      return 'Payé';
    case 'planifié':
    case 'envoyé':
      return 'En attente';
    case 'brouillon':
      return 'Brouillon';
    case 'annulé':
      return 'Annulé';
    default:
      return status;
  }
};

const formatSupportDetails = (supportType: SupportType, supportDetail: string) => {
  const detail = supportDetail?.trim();
  if (!detail) {
    return supportType;
  }
  return `${supportType} – ${detail}`;
};

interface InvoiceLine {
  label: string;
  detail?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

const safeVatRate = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value < 0 ? 0 : value;
};

const formatVatRateLabel = (value: number) => {
  const safe = safeVatRate(value);
  if (Number.isInteger(safe)) {
    return safe.toString();
  }
  return safe.toFixed(2).replace(/\.00$/, '');
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const generateInvoicePdf = ({
  documentNumber,
  issueDate,
  serviceDate,
  company,
  client,
  service,
  options,
  additionalCharge,
  vatRate,
  vatEnabled,
  status,
  supportType,
  supportDetail,
  paymentMethod,
}: GenerateInvoicePayload) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;

  const headingFontSize = 20;
  const sectionTitleSize = 11;
  const bodyFontSize = 10;
  const lineHeight = bodyFontSize * 1.5;

  doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);

  const formattedIssueDate = format(issueDate, 'dd/MM/yyyy', { locale: fr });
  const formattedServiceDate = format(serviceDate, 'dd/MM/yyyy', { locale: fr });
  const statusLabel = formatStatusLabel(status);
  const paymentLabel = paymentMethod?.trim() ?? '';

  const invoiceLines: InvoiceLine[] = options.map((option) => {
    const override = optionOverrides?.[option.id];
    const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
    const durationValue =
      override?.durationMin !== undefined && override.durationMin >= 0
        ? override.durationMin
        : option.defaultDurationMin;
    const unitPrice =
      override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
        ? override.unitPriceHT
        : option.unitPriceHT;
    return {
      label: option.label,
      detail: durationValue ? `Durée : ${formatDuration(durationValue)}` : null,
      quantity,
      unitPrice,
      total: roundCurrency(unitPrice * quantity),
    } satisfies InvoiceLine;
  });

  if (additionalCharge > 0) {
    invoiceLines.push({
      label: 'Frais complémentaires',
      quantity: 1,
      unitPrice: additionalCharge,
      total: additionalCharge,
    });
  }

  const subtotal = roundCurrency(invoiceLines.reduce((sum, line) => sum + line.total, 0));
  const vatRateSafe = safeVatRate(vatRate);
  const vatAmount = vatEnabled ? roundCurrency(subtotal * (vatRateSafe / 100)) : 0;
  const grandTotal = vatEnabled ? roundCurrency(subtotal + vatAmount) : subtotal;

  let cursorY = margin;
  let logoOffset = 0;
  if (company.logoUrl) {
    const logoWidth = Math.min(140, contentWidth / 3);
    const logoHeight = 56;
    try {
      doc.addImage(
        company.logoUrl,
        detectImageFormat(company.logoUrl),
        margin,
        cursorY,
        logoWidth,
        logoHeight,
        undefined,
        'FAST'
      );
      logoOffset = logoHeight + 12;
    } catch (error) {
      logoOffset = 0;
    }
  }

  cursorY += logoOffset;

  const columnGap = 32;
  const columnWidth = (contentWidth - columnGap) / 2;
  const blockPaddingX = 16;
  const blockPaddingY = 18;

  const companyLines = [
    company.name,
    company.address,
    `${company.postalCode} ${company.city}`.trim(),
    company.country,
    `SIRET : ${company.siret}`,
    company.phone ? `Téléphone : ${company.phone}` : undefined,
    company.email ? `Email : ${company.email}` : undefined,
    company.website ? `Site : ${company.website}` : undefined,
  ].filter((value): value is string => Boolean(value && value.trim().length));

  const clientLines = [
    client.name,
    client.address,
    client.city,
    client.phone ? `Téléphone : ${client.phone}` : undefined,
    client.email ? `Email : ${client.email}` : undefined,
  ].filter((value): value is string => Boolean(value && value.trim().length));

  const companyBlockHeight = Math.max(
    blockPaddingY * 2 + lineHeight * (companyLines.length + 1),
    80
  );
  const clientBlockHeight = Math.max(blockPaddingY * 2 + lineHeight * (clientLines.length + 1), 80);
  const infoBlockHeight = Math.max(companyBlockHeight, clientBlockHeight);

  const blockSpace = ensureSpace(doc, cursorY, infoBlockHeight, margin, pageHeight);
  cursorY = blockSpace.cursorY;

  const companyX = margin;
  const clientX = margin + columnWidth + columnGap;

  doc.setDrawColor(LIGHT_BORDER_COLOR.r, LIGHT_BORDER_COLOR.g, LIGHT_BORDER_COLOR.b);
  doc.setLineWidth(0.6);
  doc.rect(companyX, cursorY, columnWidth, infoBlockHeight);
  doc.rect(clientX, cursorY, columnWidth, infoBlockHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(sectionTitleSize);
  doc.setTextColor(ACCENT_COLOR.r, ACCENT_COLOR.g, ACCENT_COLOR.b);
  doc.text('ENTREPRISE', companyX + blockPaddingX, cursorY + blockPaddingY);
  doc.text('CLIENT', clientX + columnWidth - blockPaddingX, cursorY + blockPaddingY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);

  let companyTextY = cursorY + blockPaddingY + lineHeight;
  companyLines.forEach((line) => {
    companyTextY = addMultilineText(
      doc,
      line,
      companyX + blockPaddingX,
      companyTextY,
      columnWidth - blockPaddingX * 2,
      lineHeight
    );
  });

  let clientTextY = cursorY + blockPaddingY + lineHeight;
  clientLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, columnWidth - blockPaddingX * 2) as string[];
    wrapped.forEach((wrappedLine: string) => {
      doc.text(wrappedLine, clientX + columnWidth - blockPaddingX, clientTextY, { align: 'right' });
      clientTextY += lineHeight;
    });
  });

  cursorY += infoBlockHeight + 32;

  doc.setDrawColor(LIGHT_BORDER_COLOR.r, LIGHT_BORDER_COLOR.g, LIGHT_BORDER_COLOR.b);
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY - 12, pageWidth - margin, cursorY - 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(headingFontSize);
  doc.setTextColor(ACCENT_COLOR.r, ACCENT_COLOR.g, ACCENT_COLOR.b);
  doc.text(`FACTURE N° ${documentNumber}`, pageWidth - margin, cursorY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);

  const invoiceMeta = [`Date d'émission : ${formattedIssueDate}`, `Statut : ${statusLabel}`];
  if (paymentLabel) {
    invoiceMeta.push(`Moyen de paiement : ${paymentLabel}`);
  }

  let metaY = cursorY + lineHeight;
  invoiceMeta.forEach((line) => {
    doc.text(line, pageWidth - margin, metaY, { align: 'right' });
    metaY += lineHeight;
  });

  cursorY = metaY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(sectionTitleSize);
  doc.setTextColor(ACCENT_COLOR.r, ACCENT_COLOR.g, ACCENT_COLOR.b);
  doc.text('Service concerné', margin, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
  cursorY += lineHeight;

  const serviceLines = [
    service.name,
    `Support : ${formatSupportDetails(supportType, supportDetail)}`,
    `Date de réalisation : ${formattedServiceDate}`,
  ];
  serviceLines.forEach((line) => {
    cursorY = addMultilineText(doc, line, margin, cursorY, contentWidth, lineHeight);
  });

  cursorY += 16;

  const tableHeaderHeight = lineHeight + 12;
  const cellPaddingX = 10;
  const cellPaddingY = 8;
  const columnWidths = [contentWidth - 200, 60, 70, 70];
  const columnPositions = columnWidths.reduce<number[]>((positions, width, index) => {
    if (index === 0) {
      positions.push(margin);
    } else {
      positions.push(positions[index - 1] + columnWidths[index - 1]);
    }
    return positions;
  }, []);

  const drawTableHeader = () => {
    doc.setFillColor(ACCENT_COLOR.r, ACCENT_COLOR.g, ACCENT_COLOR.b);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bodyFontSize);
    doc.rect(margin, cursorY, contentWidth, tableHeaderHeight, 'F');
    columnWidths.slice(0, -1).forEach((_, index) => {
      const boundaryX = columnPositions[index + 1];
      doc.line(boundaryX, cursorY, boundaryX, cursorY + tableHeaderHeight);
    });
    const headerBaseline = cursorY + tableHeaderHeight - cellPaddingY;
    doc.text('Désignation', columnPositions[0] + cellPaddingX, headerBaseline);
    doc.text('Quantité', columnPositions[1] + columnWidths[1] / 2, headerBaseline, { align: 'center' });
    doc.text('PU HT', columnPositions[2] + columnWidths[2] - cellPaddingX, headerBaseline, { align: 'right' });
    doc.text('Total HT', columnPositions[3] + columnWidths[3] - cellPaddingX, headerBaseline, {
      align: 'right',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
    cursorY += tableHeaderHeight;
  };

  const headerSpace = ensureSpace(doc, cursorY, tableHeaderHeight, margin, pageHeight);
  cursorY = headerSpace.cursorY;
  if (headerSpace.pageBreak) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
  }
  drawTableHeader();

  invoiceLines.forEach((line) => {
    const descriptionContent = line.detail ? `${line.label}\n${line.detail}` : line.label;
    const descriptionLines = doc.splitTextToSize(
      descriptionContent,
      columnWidths[0] - cellPaddingX * 2
    ) as string[];
    const rowHeight = Math.max(descriptionLines.length, 1) * lineHeight + cellPaddingY * 2;

    const rowSpace = ensureSpace(doc, cursorY, rowHeight, margin, pageHeight);
    if (rowSpace.pageBreak) {
      cursorY = rowSpace.cursorY;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
      drawTableHeader();
    } else {
      cursorY = rowSpace.cursorY;
    }

    doc.setDrawColor(LIGHT_BORDER_COLOR.r, LIGHT_BORDER_COLOR.g, LIGHT_BORDER_COLOR.b);
    doc.setLineWidth(0.6);
    doc.rect(margin, cursorY, contentWidth, rowHeight);
    columnWidths.slice(0, -1).forEach((_, columnIndex) => {
      const boundaryX = columnPositions[columnIndex + 1];
      doc.line(boundaryX, cursorY, boundaryX, cursorY + rowHeight);
    });

    descriptionLines.forEach((textLine: string, lineIndex: number) => {
      const textY = cursorY + cellPaddingY + lineHeight * (lineIndex + 1) - 4;
      doc.text(textLine, columnPositions[0] + cellPaddingX, textY);
      if (lineIndex === 0) {
        const quantityLabel = line.quantity ? line.quantity.toString() : '—';
        doc.text(quantityLabel, columnPositions[1] + columnWidths[1] / 2, textY, { align: 'center' });
        doc.text(formatCurrency(line.unitPrice), columnPositions[2] + columnWidths[2] - cellPaddingX, textY, {
          align: 'right',
        });
        doc.text(formatCurrency(line.total), columnPositions[3] + columnWidths[3] - cellPaddingX, textY, {
          align: 'right',
        });
      }
    });

    cursorY += rowHeight;
  });

  cursorY += 20;

  const totalsRows = [
    { label: 'Sous-total HT', value: formatCurrency(subtotal) },
    ...(vatEnabled
      ? [{ label: `TVA (${formatVatRateLabel(vatRateSafe)} %)`, value: formatCurrency(vatAmount) }]
      : []),
    { label: vatEnabled ? 'Total TTC' : 'Total HT', value: formatCurrency(grandTotal) },
  ];

  const totalsWidth = 220;
  const totalsRowHeight = lineHeight + 10;
  const totalsHeight = totalsRows.length * totalsRowHeight + lineHeight + 12;
  const totalsSpace = ensureSpace(doc, cursorY, totalsHeight, margin, pageHeight);
  cursorY = totalsSpace.cursorY;
  if (totalsSpace.pageBreak) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
  }

  const totalsX = pageWidth - margin - totalsWidth;
  doc.setDrawColor(LIGHT_BORDER_COLOR.r, LIGHT_BORDER_COLOR.g, LIGHT_BORDER_COLOR.b);
  doc.setLineWidth(0.6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(sectionTitleSize);
  doc.setTextColor(ACCENT_COLOR.r, ACCENT_COLOR.g, ACCENT_COLOR.b);
  doc.text('RÉCAPITULATIF', totalsX, cursorY + lineHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);
  doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);

  let totalsRowY = cursorY + lineHeight + 6;
  totalsRows.forEach((row) => {
    doc.rect(totalsX, totalsRowY, totalsWidth, totalsRowHeight);
    const textBaseline = totalsRowY + totalsRowHeight / 2 + bodyFontSize / 2 - 2;
    doc.text(row.label, totalsX + 12, textBaseline);
    doc.text(row.value, totalsX + totalsWidth - 12, textBaseline, { align: 'right' });
    totalsRowY += totalsRowHeight;
  });

  return doc;
};
