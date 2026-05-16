import { detectFileKind } from '../../utils/fileUtils'
import type { ParseOutcome, ParseProgress } from '../../types/app'
import { extractTextFromExcel } from './excelParser'
import { extractTextFromOffice } from './officeParser'

export interface ParseDocumentInput {
  fileName: string
  mimeType: string
  bytes: Uint8Array
}

export interface ParseDocumentOptions {
  onProgress?: (progress: ParseProgress) => void
}

export async function parseDocument(
  input: ParseDocumentInput,
  options: ParseDocumentOptions = {},
): Promise<ParseOutcome> {
  const fileKind = detectFileKind(input.fileName, input.mimeType)
  const warnings: string[] = []
  options.onProgress?.({
    percent: 14,
    status: '识别文件类型',
    detail: fileKind.toUpperCase(),
  })

  if (fileKind === 'pdf') {
    const { detectPdfType, extractTextFromPdf } = await import('./pdfParser')
    options.onProgress?.({ percent: 18, status: '检查 PDF 类型' })
    const pdfKind = await detectPdfType(input.bytes)
    const text = await extractTextFromPdf(input.bytes, { onProgress: options.onProgress })
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
    options.onProgress?.({ percent: 35, status: '读取表格内容' })
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
    options.onProgress?.({ percent: 35, status: '读取文本内容' })
    const text = new TextDecoder().decode(input.bytes)
    return {
      text,
      fileKind,
      parseEngine: 'text',
      warnings,
      requiresOcr: false,
    }
  }

  options.onProgress?.({ percent: 35, status: '读取 Office 文档' })
  const text = await extractTextFromOffice(input.bytes)

  return {
    text,
    fileKind,
    parseEngine: 'officeparser',
    warnings,
    requiresOcr: false,
  }
}
