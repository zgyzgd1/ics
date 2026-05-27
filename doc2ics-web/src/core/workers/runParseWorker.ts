import type { ParseProgress, ParseWorkerResponse, RecognitionSettings } from '../../types/app'
import { getApiKey, getRemoteOcrEndpoint } from '../../utils/secureStore'
import { detectFileKind } from '../../utils/fileUtils'

const ParseWorker = new URL('./parse.worker.ts', import.meta.url)
type ProgressHandler = (progress: ParseProgress) => void
type ParseWorkerOutbound =
  | { type: 'progress'; progress: ParseProgress }
  | { type: 'result'; response: ParseWorkerResponse }

function emitProgress(onProgress: ProgressHandler | undefined, progress: ParseProgress): void {
  onProgress?.({
    ...progress,
    percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
  })
}

/**
 * 将 secureStore 中的敏感配置注入到 settings 对象。
 * 这是最后一道防线，确保 API Key 仅在调用前存在内存中。
 * 注入后立即使用，不持久化到任何 state 或 storage。
 */
function injectSecureSettings(settings?: RecognitionSettings): RecognitionSettings | undefined {
  if (!settings) return settings
  const apiKey = getApiKey()
  const remoteEndpoint = getRemoteOcrEndpoint()
  if (apiKey) {
    settings = { ...settings, ai: { ...settings.ai, apiKey } }
  }
  if (remoteEndpoint) {
    settings = { ...settings, ocr: { ...settings.ocr, remoteEndpoint } }
  }
  return settings
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProgressMessage(value: unknown): value is Extract<ParseWorkerOutbound, { type: 'progress' }> {
  return isObject(value) && value.type === 'progress' && isObject(value.progress)
}

function isResultMessage(value: unknown): value is Extract<ParseWorkerOutbound, { type: 'result' }> {
  return isObject(value) && value.type === 'result' && isObject(value.response)
}

export function shouldParseOnMainThread(fileName: string, mimeType: string): boolean {
  return detectFileKind(fileName, mimeType) === 'pdf'
}

async function runParseOnMainThread(
  file: File,
  recognitionSettings?: RecognitionSettings,
  onProgress?: ProgressHandler,
): Promise<ParseWorkerResponse> {
  try {
    const { parseDocumentToEvents } = await import('./parsePipeline')
    emitProgress(onProgress, { percent: 6, status: '读取文件' })
    const buffer = await file.arrayBuffer()

    return parseDocumentToEvents(
      {
        fileName: file.name,
        mimeType: file.type,
        bytes: new Uint8Array(buffer),
      },
      { recognitionSettings: injectSecureSettings(recognitionSettings), onProgress },
    )
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '文件解析失败',
    }
  }
}

export function runParseWorker(
  file: File,
  recognitionSettings?: RecognitionSettings,
  onProgress?: ProgressHandler,
): Promise<ParseWorkerResponse> {
  if (shouldParseOnMainThread(file.name, file.type)) {
    return runParseOnMainThread(file, recognitionSettings, onProgress)
  }

  return new Promise((resolve) => {
    const worker = new Worker(ParseWorker, { type: 'module' })

    worker.onmessage = (message: MessageEvent<ParseWorkerOutbound | ParseWorkerResponse>) => {
      const data = message.data
      if (isProgressMessage(data)) {
        emitProgress(onProgress, data.progress)
        return
      }

      resolve(isResultMessage(data) ? data.response : (data as ParseWorkerResponse))
      worker.terminate()
    }

    worker.onerror = (err) => {
      resolve({ ok: false, error: err.message || '后台解析线程崩溃' })
      worker.terminate()
    }

    emitProgress(onProgress, { percent: 6, status: '读取文件' })

    file
      .arrayBuffer()
      .then((buffer) => {
        emitProgress(onProgress, { percent: 10, status: '准备后台解析' })
        worker.postMessage({
          fileName: file.name,
          mimeType: file.type,
          buffer,
          recognitionSettings: injectSecureSettings(recognitionSettings),
        })
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '读取文件失败'
        resolve({ ok: false, error: message })
        worker.terminate()
      })
  })
}
