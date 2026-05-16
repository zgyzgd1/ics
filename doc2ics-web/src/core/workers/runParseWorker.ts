import type { ParseWorkerResponse, RecognitionSettings } from '../../types/app'

const ParseWorker = new URL('./parse.worker.ts', import.meta.url)

export function runParseWorker(file: File, recognitionSettings?: RecognitionSettings): Promise<ParseWorkerResponse> {
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
