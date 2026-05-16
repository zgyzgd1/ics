/// <reference lib="webworker" />

import type { ParseProgress, ParseWorkerResponse, RecognitionSettings } from '../../types/app'
import { parseDocumentToEvents } from './parsePipeline'

interface ParseWorkerMessage {
  fileName: string
  mimeType: string
  buffer: ArrayBuffer
  recognitionSettings?: RecognitionSettings
}

type ParseWorkerOutbound =
  | { type: 'progress'; progress: ParseProgress }
  | { type: 'result'; response: ParseWorkerResponse }

self.onmessage = async (event: MessageEvent<ParseWorkerMessage>) => {
  const { fileName, mimeType, buffer, recognitionSettings } = event.data

  const response: ParseWorkerResponse = await parseDocumentToEvents(
    {
      fileName,
      mimeType,
      bytes: new Uint8Array(buffer),
    },
    {
      recognitionSettings,
      onProgress: (progress) => {
        postMessage({ type: 'progress', progress } satisfies ParseWorkerOutbound)
      },
    },
  )
  postMessage({ type: 'result', response } satisfies ParseWorkerOutbound)
}

export {}
