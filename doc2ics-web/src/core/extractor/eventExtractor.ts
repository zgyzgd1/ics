import { addMinutes } from 'date-fns'
import * as chrono from 'chrono-node'
import type { CalendarEvent } from '../../types/app'
import { inferEventEnd } from '../../utils/dateUtils'

function buildEventId(index: number, start: Date): string {
  return `${start.getTime()}-${index}`
}

function guessSummary(text: string, index: number): string {
  const lines = text.split(/\r?\n/)
  let consumed = 0

  for (const line of lines) {
    consumed += line.length + 1
    if (consumed >= index) {
      const cleaned = line.replace(/\s+/g, ' ').trim()
      if (cleaned.length > 0) {
        return cleaned.slice(0, 100)
      }
      break
    }
  }

  return '导入的日程'
}

export function extractEventsFromText(text: string): CalendarEvent[] {
  const results = chrono.parse(text, new Date(), { forwardDate: true })

  return results.map((result, idx) => {
    const startDate = result.start.date()
    const rawEnd = result.end?.date()
    const endDate = inferEventEnd(startDate, rawEnd, 60)
    const tagCount = typeof result.tags === 'function' ? result.tags().size : 0

    return {
      id: buildEventId(idx, startDate),
      summary: guessSummary(text, result.index),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      sourceText: result.text,
      confidence: tagCount > 0 ? 0.9 : 0.7,
      description: `来源文本：${result.text}`,
    }
  })
}

export function createFallbackEvent(): CalendarEvent {
  const start = new Date()
  const end = addMinutes(start, 60)

  return {
    id: `${Date.now()}-fallback`,
    summary: '导入的日程',
    start: start.toISOString(),
    end: end.toISOString(),
    description: '未识别到自然语言日期，请手动编辑此事件。',
  }
}
