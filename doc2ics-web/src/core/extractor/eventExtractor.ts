import { addMinutes } from 'date-fns'
import * as chrono from 'chrono-node'
import type { CalendarEvent } from '../../types/app'
import { inferEventEnd } from '../../utils/dateUtils'

function buildEventId(index: number, start: Date): string {
  return `${start.getTime()}-${index}`
}

function guessSummary(text: string, index: number): string {
  const before = text.slice(Math.max(0, index - 60), index).trim()
  if (before) return before.slice(0, 100)
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
