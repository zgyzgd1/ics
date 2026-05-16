import Tesseract from 'tesseract.js'
import { renderPdfPagesToImageBlobs } from '../parsers/pdfParser'

export function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function ocrFromBlob(blob: Blob, language = 'chi_sim+eng'): Promise<string> {
  const result = await Tesseract.recognize(blob, language)
  return normalizeOcrText(result.data.text)
}

export async function ocrPdfBytes(bytes: Uint8Array, language = 'chi_sim+eng'): Promise<string> {
  const pageImages = await renderPdfPagesToImageBlobs(bytes)
  const pageTexts: string[] = []

  for (const pageImage of pageImages) {
    const text = await ocrFromBlob(pageImage, language)
    if (text) {
      pageTexts.push(text)
    }
  }

  return normalizeOcrText(pageTexts.join('\n\n'))
}
