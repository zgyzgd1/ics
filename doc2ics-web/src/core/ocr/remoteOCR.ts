import type { OcrSettings } from '../../types/app'
import { renderPdfPagesToImageBlobs } from '../parsers/pdfParser'
import { normalizeOcrText } from './tesseractOCR'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function readTextValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readTextArray(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.map(readRemoteOcrText).filter(Boolean).join('\n\n')
}

export function readRemoteOcrText(payload: unknown): string {
  const record = asRecord(payload)
  if (!record) return ''

  const direct = readTextValue(record.text)
  if (direct) return direct

  const nestedData = readRemoteOcrText(record.data)
  if (nestedData) return nestedData

  const nestedResult = readRemoteOcrText(record.result)
  if (nestedResult) return nestedResult

  const pages = readTextArray(record.pages)
  if (pages) return pages

  return readTextArray(record.results)
}

export async function remoteOcrBlob(blob: Blob, settings: OcrSettings, pageNumber: number): Promise<string> {
  const endpoint = settings.remoteEndpoint.trim()
  if (!endpoint) {
    throw new Error('请先填写远程 OCR 服务地址')
  }

  const formData = new FormData()
  formData.append('image', blob, `page-${pageNumber}.png`)
  formData.append('language', settings.language)
  formData.append('page', String(pageNumber))

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`远程 OCR 服务请求失败：${response.status}`)
  }

  return readRemoteOcrText(await response.json())
}

export async function remoteOcrPdfBytes(bytes: Uint8Array, settings: OcrSettings): Promise<string> {
  const pageImages = await renderPdfPagesToImageBlobs(bytes)
  const pageTexts: string[] = []

  for (let pageIndex = 0; pageIndex < pageImages.length; pageIndex += 1) {
    const text = await remoteOcrBlob(pageImages[pageIndex], settings, pageIndex + 1)
    if (text) {
      pageTexts.push(text)
    }
  }

  return normalizeOcrText(pageTexts.join('\n\n'))
}
