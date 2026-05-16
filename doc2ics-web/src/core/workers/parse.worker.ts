/// <reference lib="webworker" />

import type { ParseWorkerResponse, RecognitionSettings } from '../../types/app'
import { parseDocumentToEvents } from './parsePipeline'

interface ParseWorkerMessage {
  fileName: string
  mimeType: string
  buffer: ArrayBuffer
  recognitionSettings?: RecognitionSettings
}

self.onmessage = async (event: MessageEvent<ParseWorkerMessage>) => {
  const { fileName, mimeType, buffer, recognitionSettings } = event.data

  const response: ParseWorkerResponse = await parseDocumentToEvents(
    {
      fileName,
      mimeType,
      bytes: new Uint8Array(buffer),
    },
    { recognitionSettings },
  )
  postMessage(response)
}

export {}
