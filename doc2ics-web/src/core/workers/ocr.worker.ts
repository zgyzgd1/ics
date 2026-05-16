/// <reference lib="webworker" />

import { ocrFromBlob } from '../ocr/tesseractOCR'

interface OcrMessage {
  blob: Blob
  language?: string
}

interface OcrSuccess {
  ok: true
  text: string
}

interface OcrFailure {
  ok: false
  error: string
}

type OcrResponse = OcrSuccess | OcrFailure

self.onmessage = async (event: MessageEvent<OcrMessage>) => {
  try {
    const text = await ocrFromBlob(event.data.blob, event.data.language)
    const response: OcrResponse = { ok: true, text }
    postMessage(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : '文字识别失败'
    const response: OcrResponse = { ok: false, error: message }
    postMessage(response)
  }
}

export {}
