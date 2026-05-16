import { detectFileKind } from '../../utils/fileUtils'
import type { ParseOutcome } from '../../types/app'
import { extractTextFromExcel } from './excelParser'
import { extractTextFromOffice } from './officeParser'

export interface ParseDocumentInput {
  fileName: string
  mimeType: string
  bytes: Uint8Array
}

export async function parseDocument(input: ParseDocumentInput): Promise<ParseOutcome> {
  const fileKind = detectFileKind(input.fileName, input.mimeType)
  const warnings: string[] = []

  if (fileKind === 'pdf') {
    const { detectPdfType, extractTextFromPdf } = await import('./pdfParser')
    const pdfKind = await detectPdfType(input.bytes)
    const text = await extractTextFromPdf(input.bytes)
    const requiresOcr = pdfKind === 'scanned' || text.length < 80

    if (requiresOcr) {
      warnings.push('PDF 看起来像扫描件，建议使用文字识别以获得更好的结果。')
    }

    return {
      text,
      fileKind,
      parseEngine: 'pdfjs-dist',
      warnings,
      requiresOcr,
    }
  }

  if (fileKind === 'xlsx' || fileKind === 'csv') {
    const text = await extractTextFromExcel(input.bytes)
    return {
      text,
      fileKind,
      parseEngine: 'xlsx',
      warnings,
      requiresOcr: false,
    }
  }

  if (fileKind === 'txt') {
    const text = new TextDecoder().decode(input.bytes)
    return {
      text,
      fileKind,
      parseEngine: 'text',
      warnings,
      requiresOcr: false,
    }
  }

  const text = await extractTextFromOffice(input.bytes)

  return {
    text,
    fileKind,
    parseEngine: 'officeparser',
    warnings,
    requiresOcr: false,
  }
}
