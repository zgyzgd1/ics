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

const REMOTE_OCR_TIMEOUT_MS = 30_000

export async function remoteOcrBlob(blob: Blob, settings: OcrSettings, pageNumber: number): Promise<string> {
  const endpoint = settings.remoteEndpoint.trim()
  if (!endpoint) {
    throw new Error('请先填写远程 OCR 服务地址')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REMOTE_OCR_TIMEOUT_MS)

  try {
    const formData = new FormData()
    formData.append('image', blob, `page-${pageNumber}.png`)
    formData.append('language', settings.language)
    formData.append('page', String(pageNumber))

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`远程 OCR 服务请求失败：${response.status}`)
    }

    return readRemoteOcrText(await response.json())
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('远程 OCR 服务请求超时（30 秒）', { cause: error })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function remoteOcrPdfBytes(bytes: Uint8Array, settings: OcrSettings): Promise<string> {
  const pageTexts: string[] = []

  let pageNumber = 1
  for await (const pageImage of renderPdfPagesToImageBlobs(bytes)) {
    const text = await remoteOcrBlob(pageImage, settings, pageNumber)
    if (text) {
      pageTexts.push(text)
    }
    pageNumber += 1
  }

  return normalizeOcrText(pageTexts.join('\n\n'))
}
