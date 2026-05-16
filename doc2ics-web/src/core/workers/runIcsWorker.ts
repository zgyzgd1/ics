import type { CalendarEvent, IcsBuildOptions } from '../../types/app'

const IcsWorker = new URL('./ics.worker.ts', import.meta.url)

interface IcsSuccess {
  ok: true
  ics: string
}

interface IcsFailure {
  ok: false
  error: string
}

type IcsResponse = IcsSuccess | IcsFailure

export function runIcsWorker(events: CalendarEvent[], options: IcsBuildOptions): Promise<IcsResponse> {
  return new Promise((resolve) => {
    const worker = new Worker(IcsWorker, { type: 'module' })

    worker.onmessage = (message: MessageEvent<IcsResponse>) => {
      resolve(message.data)
      worker.terminate()
    }

    worker.onerror = (err) => {
      resolve({ ok: false, error: err.message || '后台日历生成线程崩溃' })
      worker.terminate()
    }

    worker.postMessage({ events, options })
  })
}
