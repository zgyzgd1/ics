import type { ParseWorkerResponse, RecognitionSettings } from '../../types/app'
import { detectFileKind } from '../../utils/fileUtils'

const ParseWorker = new URL('./parse.worker.ts', import.meta.url)

export function shouldParseOnMainThread(fileName: string, mimeType: string): boolean {
  return detectFileKind(fileName, mimeType) === 'pdf'
}

async function runParseOnMainThread(
  file: File,
  recognitionSettings?: RecognitionSettings,
): Promise<ParseWorkerResponse> {
  try {
    const { parseDocumentToEvents } = await import('./parsePipeline')
    const buffer = await file.arrayBuffer()

    return parseDocumentToEvents(
      {
        fileName: file.name,
        mimeType: file.type,
        bytes: new Uint8Array(buffer),
      },
      { recognitionSettings },
    )
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '文件解析失败',
    }
  }
}

export function runParseWorker(file: File, recognitionSettings?: RecognitionSettings): Promise<ParseWorkerResponse> {
  if (shouldParseOnMainThread(file.name, file.type)) {
    return runParseOnMainThread(file, recognitionSettings)
  }

  return new Promise((resolve) => {
    const worker = new Worker(ParseWorker, { type: 'module' })

    worker.onmessage = (message: MessageEvent<ParseWorkerResponse>) => {
      resolve(message.data)
      worker.terminate()
    }

    worker.onerror = (err) => {
      resolve({ ok: false, error: err.message || '后台解析线程崩溃' })
      worker.terminate()
    }

    file
      .arrayBuffer()
      .then((buffer) => {
        worker.postMessage({
          fileName: file.name,
          mimeType: file.type,
          buffer,
          recognitionSettings,
        })
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '读取文件失败'
        resolve({ ok: false, error: message })
        worker.terminate()
      })
  })
}
