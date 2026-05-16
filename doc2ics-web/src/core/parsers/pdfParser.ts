import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type { ParseProgress } from '../../types/app'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type ParsedPdfKind = 'digital' | 'scanned'
type ProgressHandler = (progress: ParseProgress) => void

interface PdfParseOptions {
  onProgress?: ProgressHandler
}

export function buildPdfDocumentOptions(bytes: Uint8Array) {
  return {
    data: new Uint8Array(bytes),
    disableWorker: typeof window === 'undefined',
  }
}

function readPageTextItems(items: unknown[]): string {
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return ''
      const maybe = item as { str?: unknown }
      return typeof maybe.str === 'string' ? maybe.str : ''
    })
    .join(' ')
    .trim()
}

export async function detectPdfType(bytes: Uint8Array): Promise<ParsedPdfKind> {
  const doc = await getDocument(buildPdfDocumentOptions(bytes)).promise
  const firstPage = await doc.getPage(1)
  const content = await firstPage.getTextContent()
  const line = readPageTextItems(content.items)

  if (line.length > 100 || content.items.length > 10) {
    return 'digital'
  }

  return 'scanned'
}

export async function extractTextFromPdf(bytes: Uint8Array, options: PdfParseOptions = {}): Promise<string> {
  const doc = await getDocument(buildPdfDocumentOptions(bytes)).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(readPageTextItems(content.items))
    options.onProgress?.({
      percent: Math.min(58, Math.round(22 + (pageNumber / doc.numPages) * 36)),
      status: '解析 PDF 文本',
      detail: `第 ${pageNumber}/${doc.numPages} 页`,
    })
  }

  return pages.join('\n').trim()
}

interface RenderCanvas {
  canvas: HTMLCanvasElement | OffscreenCanvas
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  toBlob: () => Promise<Blob>
}

function createRenderCanvas(width: number, height: number): RenderCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('无法创建 PDF 文字识别画布上下文')
    }

    return {
      canvas,
      context,
      toBlob: () => canvas.convertToBlob({ type: 'image/png' }),
    }
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('无法创建 PDF 文字识别画布上下文')
    }

    return {
      canvas,
      context,
      toBlob: () =>
        new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('无法渲染 PDF 页面用于文字识别'))
            }
          }, 'image/png')
        }),
    }
  }

  throw new Error('PDF 文字识别需要浏览器支持画布')
}

export async function renderPdfPagesToImageBlobs(bytes: Uint8Array, scale = 2): Promise<Blob[]> {
  const doc = await getDocument(buildPdfDocumentOptions(bytes)).promise
  const blobs: Blob[] = []

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const renderCanvas = createRenderCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))

    await page.render({
      canvas: null,
      canvasContext: renderCanvas.context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise

    blobs.push(await renderCanvas.toBlob())
  }

  return blobs
}
