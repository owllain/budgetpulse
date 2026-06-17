import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { OptimizationResult } from '@/lib/financial/debt-optimizer'

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 40
const LINE_HEIGHT = 18
const FONT_SIZE_NORMAL = 10
const FONT_SIZE_TITLE = 14
const FONT_SIZE_HEADER = 24
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2

function formatCRC(valor: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

function splitTextLines(text: string, maxWidth: number, font: any, size: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word
    const lineWidth = font.widthOfTextAtSize(testLine, size)
    if (lineWidth > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = testLine
    }
  }

  if (current) lines.push(current)
  return lines
}

async function createPdfPage(pdfDoc: PDFDocument) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  return { page, helvetica, helveticaBold }
}

function addTextLines(page: any, font: any, size: number, x: number, y: number, lines: string[], color: number[] = [0, 0, 0]): number {
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color })
    y -= LINE_HEIGHT
  }
  return y
}

function addSectionTitle(page: any, font: any, title: string, y: number): number {
  page.drawText(title, { x: MARGIN, y, size: FONT_SIZE_TITLE, font, color: rgb(0, 0, 0) })
  return y - LINE_HEIGHT
}

function addMetadata(page: any, font: any, userName: string, userEmail: string, y: number): number {
  const metadata = [
    `Generado para: ${userName}`,
    `Email: ${userEmail}`,
    `Fecha: ${new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}`,
  ]
  y = addTextLines(page, font, FONT_SIZE_NORMAL, MARGIN, y, metadata)
  return y - LINE_HEIGHT / 2
}

export async function generateDebtStrategyPDF(
  resultado: OptimizationResult,
  userName: string,
  userEmail: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  let { page, helvetica, helveticaBold } = await createPdfPage(pdfDoc)
  let y = PAGE_HEIGHT - MARGIN

  page.drawText('💰 BudgetPulse', { x: MARGIN, y, size: FONT_SIZE_HEADER, font: helveticaBold, color: rgb(0, 0, 0) })
  y -= LINE_HEIGHT * 2
  page.drawText('Reporte de Optimización de Deuda', { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
  y -= LINE_HEIGHT * 2

  y = addMetadata(page, helvetica, userName, userEmail, y)
  y = addSectionTitle(page, helveticaBold, '📊 Resumen Ejecutivo', y)

  y = addTextLines(page, helvetica, FONT_SIZE_NORMAL, MARGIN, y, splitTextLines(`Recomendación: ${resultado.analisisComparativo.recomendacion.toUpperCase()}`, MAX_WIDTH, helvetica, FONT_SIZE_NORMAL))
  y = addTextLines(page, helvetica, FONT_SIZE_NORMAL, MARGIN, y, splitTextLines(`Ahorro potencial: ${formatCRC(Math.abs(resultado.analisisComparativo.ahorroInteresesAvalanche))}`, MAX_WIDTH, helvetica, FONT_SIZE_NORMAL))
  y = addTextLines(page, helvetica, FONT_SIZE_NORMAL, MARGIN, y, splitTextLines(resultado.analisisComparativo.razonamiento, MAX_WIDTH, helvetica, FONT_SIZE_NORMAL))
  y -= LINE_HEIGHT

  y = addSectionTitle(page, helveticaBold, '🎯 Comparativa de Estrategias', y)
  y -= LINE_HEIGHT / 2

  const tableRows = [
    ['Intereses Totales', formatCRC(resultado.avalanche.totalizadoGlobal.interesTotalPagado), formatCRC(resultado.snowball.totalizadoGlobal.interesTotalPagado)],
    ['Meses a Liquidación', `${resultado.avalanche.totalizadoGlobal.mesesALiquidacion} meses`, `${resultado.snowball.totalizadoGlobal.mesesALiquidacion} meses`],
    ['Pago Total', formatCRC(resultado.avalanche.totalizadoGlobal.pagoTotalRequerido), formatCRC(resultado.snowball.totalizadoGlobal.pagoTotalRequerido)],
  ]

  for (const row of tableRows) {
    if (y < MARGIN + LINE_HEIGHT * 2) {
      const next = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      page = next
      y = PAGE_HEIGHT - MARGIN
    }
    page.drawText(row[0], { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helveticaBold, color: rgb(0, 0, 0) })
    page.drawText(row[1], { x: MARGIN + 220, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
    page.drawText(row[2], { x: MARGIN + 380, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT
  }

  y -= LINE_HEIGHT
  y = addSectionTitle(page, helveticaBold, '🏔️ Estrategia Avalanche - Detalles', y)

  for (const deuda of resultado.avalanche.deudas) {
    if (y < MARGIN + LINE_HEIGHT * 4) {
      const next = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      page = next
      y = PAGE_HEIGHT - MARGIN
    }
    page.drawText(`${deuda.name}`, { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helveticaBold, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT
    page.drawText(`Liquidada: Mes ${deuda.mesesALiquidacion}`, { x: MARGIN + 15, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT
    page.drawText(`Intereses: ${formatCRC(deuda.totalInteresAPagar)}`, { x: MARGIN + 15, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT * 1.2
  }

  y -= LINE_HEIGHT
  y = addSectionTitle(page, helveticaBold, '❄️ Estrategia Snowball - Detalles', y)

  for (const deuda of resultado.snowball.deudas) {
    if (y < MARGIN + LINE_HEIGHT * 4) {
      const next = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      page = next
      y = PAGE_HEIGHT - MARGIN
    }
    page.drawText(`${deuda.name}`, { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helveticaBold, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT
    page.drawText(`Liquidada: Mes ${deuda.mesesALiquidacion}`, { x: MARGIN + 15, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT
    page.drawText(`Intereses: ${formatCRC(deuda.totalInteresAPagar)}`, { x: MARGIN + 15, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
    y -= LINE_HEIGHT * 1.2
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

export async function generateAuditReportPDF(
  logs: any[],
  userName: string,
  userEmail: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  let { page, helvetica, helveticaBold } = await createPdfPage(pdfDoc)
  let y = PAGE_HEIGHT - MARGIN

  page.drawText('🔐 BudgetPulse', { x: MARGIN, y, size: FONT_SIZE_HEADER, font: helveticaBold, color: rgb(0, 0, 0) })
  y -= LINE_HEIGHT * 2
  page.drawText('Reporte de Auditoría Inmutable', { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0, 0, 0) })
  y -= LINE_HEIGHT * 2

  y = addMetadata(page, helvetica, userName, userEmail, y)
  y = addSectionTitle(page, helveticaBold, '📋 Historial de Cambios', y)
  y -= LINE_HEIGHT / 2

  for (const log of logs.slice(0, 50)) {
    if (y < MARGIN + LINE_HEIGHT * 5) {
      const next = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      page = next
      y = PAGE_HEIGHT - MARGIN
    }
    const actionColor = {
      CREATE: rgb(0, 0.78, 0.38),
      UPDATE: rgb(0.42, 0.42, 0.42),
      DELETE: rgb(0.93, 0.27, 0.27),
      EXPORT: rgb(0.12, 0.53, 0.96),
    }[log.action] || rgb(0.42, 0.42, 0.42)

    page.drawText(`${log.entityId ? `${log.entityId} - ` : ''}[${log.action}] ${log.entity}`, { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helveticaBold, color: actionColor })
    y -= LINE_HEIGHT

    page.drawText(`Fecha: ${new Date(log.createdAt).toLocaleString('es-CR')}`, { x: MARGIN + 15, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0.42, 0.42, 0.42) })
    y -= LINE_HEIGHT

    if (log.changes) {
      const changesText = Array.isArray(log.changes) ? log.changes.join(', ') : log.changes
      const lines = splitTextLines(`Campos: ${changesText}`, MAX_WIDTH - 15, helvetica, FONT_SIZE_NORMAL)
      y = addTextLines(page, helvetica, FONT_SIZE_NORMAL, MARGIN + 15, y, lines, [0.42, 0.42, 0.42])
    }

    y -= LINE_HEIGHT / 2
  }

  if (logs.length > 50) {
    y -= LINE_HEIGHT / 2
    page.drawText(`... y ${logs.length - 50} eventos más`, { x: MARGIN, y, size: FONT_SIZE_NORMAL, font: helvetica, color: rgb(0.42, 0.42, 0.42) })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
