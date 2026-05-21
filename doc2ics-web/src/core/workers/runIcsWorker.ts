import type { CalendarEvent, IcsBuildOptions } from '../../types/app'

interface IcsSuccess {
  ok: true
  ics: string
}

interface IcsFailure {
  ok: false
  error: string
}

type IcsResponse = IcsSuccess | IcsFailure

export async function runIcsWorker(events: CalendarEvent[], options: IcsBuildOptions): Promise<IcsResponse> {
  try {
    const { buildIcs } = await import('../generator/icsGenerator')
    const ics = buildIcs(events, options)
    return { ok: true, ics }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '日历文件生成失败' }
  }
}
