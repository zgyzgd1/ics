/// <reference lib="webworker" />

import { buildIcs } from '../generator/icsGenerator'
import type { CalendarEvent, IcsBuildOptions } from '../../types/app'

interface IcsMessage {
  events: CalendarEvent[]
  options: IcsBuildOptions
}

interface IcsSuccess {
  ok: true
  ics: string
}

interface IcsFailure {
  ok: false
  error: string
}

type IcsResponse = IcsSuccess | IcsFailure

self.onmessage = (event: MessageEvent<IcsMessage>) => {
  try {
    const ics = buildIcs(event.data.events, event.data.options)
    const response: IcsResponse = { ok: true, ics }
    postMessage(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : '日历文件生成失败'
    const response: IcsResponse = { ok: false, error: message }
    postMessage(response)
  }
}

export {}
