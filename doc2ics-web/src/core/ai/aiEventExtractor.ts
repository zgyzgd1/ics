import type { AiExtractionSettings, CalendarEvent } from '../../types/app'

interface OpenAiChatMessage {
  role: 'system' | 'user'
  content: string
}

interface OpenAiChatChoice {
  message?: {
    content?: string
  }
}

interface OpenAiChatResponse {
  choices?: OpenAiChatChoice[]
}

interface ScoredSegment {
  index: number
  score: number
  text: string
}

const DEFAULT_AI_CONTEXT_LIMIT = 12000
const LONG_SEGMENT_LENGTH = 360
const AI_REQUEST_TIMEOUT_MS = 60_000
const DATE_TIME_PATTERN =
  /(\d{4}[-/.年]\d{1,2}|\d{1,2}[-/.月]\d{1,2}|\d{1,2}:\d{2}|星期[一二三四五六日天]|周[一二三四五六日天]|上午|下午|早上|晚上|明天|后天|today|tomorrow)/i
const COURSE_PATTERN = /(课程|课表|上课|下课|第[一二三四五六七八九十\d]+[节周]|任课|教师|教室| classroom|course)/i
const CALENDAR_PATTERN = /(会议|日程|邀请|提醒|参会|组织者|发件人|收件人|邮箱|邮件|calendar|meeting|organizer|attendee|reminder)/i
const LOCATION_PATTERN = /(地点|地址|会议室|教学楼|校区|楼|室|room|location)/i
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.min(1, Math.max(0, value))
}

function asEventType(value: unknown): CalendarEvent['eventType'] | undefined {
  const text = asString(value).toLowerCase()
  if (text === 'course' || text === 'email' || text === 'calendar' || text === 'general') {
    return text
  }
  if (text.includes('课程')) return 'course'
  if (text.includes('邮箱') || text.includes('邮件')) return 'email'
  if (text.includes('日历')) return 'calendar'
  return undefined
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.map(asString).filter(Boolean)
  return items.length > 0 ? items : undefined
}

function asReminderArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const reminders = value
    .map((item) => (typeof item === 'number' ? item : Number(asString(item))))
    .filter((item) => Number.isFinite(item) && item > 0)
  return reminders.length > 0 ? reminders : undefined
}

function asRecurrence(value: unknown): CalendarEvent['recurrence'] | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  const frequency = asString(record.frequency ?? record.freq).toLowerCase()
  if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly') {
    return undefined
  }

  const byDay = asStringArray(record.byDay ?? record.by_day)?.filter((day): day is 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU' =>
    ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].includes(day),
  )
  const interval = typeof record.interval === 'number' ? record.interval : Number(asString(record.interval))
  const count = typeof record.count === 'number' ? record.count : Number(asString(record.count))

  return {
    frequency,
    ...(Number.isFinite(interval) && interval > 0 ? { interval } : {}),
    ...(Number.isFinite(count) && count > 0 ? { count } : {}),
    ...(asString(record.until) ? { until: asString(record.until) } : {}),
    ...(byDay?.length ? { byDay } : {}),
  }
}

function asCourse(value: unknown): CalendarEvent['course'] | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  const course = {
    ...(asString(record.name) ? { name: asString(record.name) } : {}),
    ...(asString(record.teacher ?? record.instructor) ? { teacher: asString(record.teacher ?? record.instructor) } : {}),
    ...(asString(record.classroom ?? record.room) ? { classroom: asString(record.classroom ?? record.room) } : {}),
    ...(asString(record.weeks) ? { weeks: asString(record.weeks) } : {}),
  }

  return Object.values(course).some(Boolean) ? course : undefined
}

function toIsoDate(value: unknown): string | null {
  const text = asString(value)
  if (!text) return null
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function extractEventsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  const record = asRecord(payload)
  if (!record) return []

  if (Array.isArray(record.events)) return record.events
  if (Array.isArray(record.data)) return record.data
  if (Array.isArray(record.results)) return record.results

  return []
}

export function buildOpenAiChatUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  return `${trimmed}/chat/completions`
}

function splitLongSegment(segment: string): string[] {
  if (segment.length <= LONG_SEGMENT_LENGTH) return [segment]

  const chunks: string[] = []
  let buffer = ''
  const parts = segment.split(/(?<=[。；;,.，、\s])/)

  for (const part of parts) {
    if (!part.trim()) continue
    if (buffer.length + part.length > LONG_SEGMENT_LENGTH && buffer) {
      chunks.push(buffer.trim())
      buffer = ''
    }
    buffer += part
  }

  if (buffer.trim()) chunks.push(buffer.trim())
  return chunks.length > 0 ? chunks : [segment.slice(0, LONG_SEGMENT_LENGTH)]
}

function contextSegments(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap((line) => splitLongSegment(line.replace(/\s+/g, ' ').trim()))
    .filter(Boolean)
}

function scoreSegment(text: string): number {
  let score = 0
  if (DATE_TIME_PATTERN.test(text)) score += 6
  if (COURSE_PATTERN.test(text)) score += 5
  if (CALENDAR_PATTERN.test(text)) score += 4
  if (LOCATION_PATTERN.test(text)) score += 3
  if (EMAIL_PATTERN.test(text)) score += 3
  return score
}

function compactSegments(segments: ScoredSegment[], maxChars: number): ScoredSegment[] {
  const selected = new Map<number, ScoredSegment>()
  const candidates = segments
    .filter((segment) => segment.score > 0 || segment.index < 2 || segment.index >= segments.length - 2)
    .sort((a, b) => b.score - a.score || a.index - b.index)

  let length = 0
  for (const segment of candidates) {
    const nextLength = length + segment.text.length + (selected.size > 0 ? 1 : 0)
    if (nextLength > maxChars) continue
    selected.set(segment.index, segment)
    length = nextLength
  }

  if (selected.size === 0 && segments[0]) {
    selected.set(segments[0].index, {
      ...segments[0],
      text: segments[0].text.slice(0, maxChars),
    })
  }

  return [...selected.values()].sort((a, b) => a.index - b.index)
}

export function compactAiContext(text: string, maxChars = DEFAULT_AI_CONTEXT_LIMIT): string {
  const limit = Math.max(1, maxChars)
  const seen = new Set<string>()
  const segments = contextSegments(text).flatMap((segment, index) => {
    const key = segment.toLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [{ index, score: scoreSegment(segment), text: segment }]
  })

  if (segments.length === 0) return ''

  const compacted = compactSegments(segments, limit)
    .map((segment) => segment.text)
    .join('\n')

  return compacted.slice(0, limit)
}

export function parseAiEventsPayload(payload: unknown): CalendarEvent[] {
  return extractEventsArray(payload).flatMap((item, index) => {
    const record = asRecord(item)
    if (!record) return []

    const summary = asString(record.summary ?? record.title ?? record.name)
    const start = toIsoDate(record.start ?? record.startTime ?? record.start_time)
    if (!summary || !start) return []

    const rawEnd = toIsoDate(record.end ?? record.endTime ?? record.end_time)
    const startMs = new Date(start).getTime()

    return [
      {
        id: `ai-${startMs}-${index}`,
        summary,
        start,
        end: rawEnd ?? undefined,
        eventType: asEventType(record.eventType ?? record.type ?? record.category),
        recurrence: asRecurrence(record.recurrence ?? record.repeat),
        reminders: asReminderArray(record.reminders ?? record.alarms),
        organizer: asString(record.organizer) || undefined,
        attendees: asStringArray(record.attendees),
        sourceEmail: asString(record.sourceEmail ?? record.source_email) || undefined,
        course: asCourse(record.course),
        location: asString(record.location) || undefined,
        description: asString(record.description ?? record.notes) || undefined,
        sourceText: asString(record.sourceText ?? record.source_text) || undefined,
        confidence: asConfidence(record.confidence) ?? 0.85,
      },
    ]
  })
}

function buildMessages(text: string): OpenAiChatMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是日程信息抽取器。只返回 JSON，不要返回 Markdown。字段为 events 数组。每个事件可包含 summary、start、end、eventType、recurrence、reminders、organizer、attendees、sourceEmail、course、location、description、sourceText、confidence。eventType 可为 general、course、email、calendar。课程表要尽量输出 weekly recurrence、course.teacher、course.classroom、course.weeks。邮件或日历邀请要尽量输出 organizer、attendees、sourceEmail 和提醒。start 和 end 必须是 ISO 8601 字符串。',
    },
    {
      role: 'user',
      content: `从下面文本中提取所有明确或高度可能的日程事件。缺少结束时间时可以省略 end。文本：\n\n${text}`,
    },
  ]
}

export async function extractAiEventsFromText(
  text: string,
  settings: AiExtractionSettings,
): Promise<CalendarEvent[]> {
  const baseUrl = settings.baseUrl.trim()
  const model = settings.model.trim()
  const apiKey = settings.apiKey.trim()

  if (!settings.enabled || !baseUrl || !model || !apiKey || !text.trim()) {
    return []
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildOpenAiChatUrl(baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(compactAiContext(text)),
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`AI 接口请求失败：${response.status}`)
    }

    const data = (await response.json()) as OpenAiChatResponse
    const content = data.choices?.[0]?.message?.content ?? ''
    if (!content.trim()) return []

    try {
      const parsed = JSON.parse(content)
      return parseAiEventsPayload(parsed)
    } catch (error) {
      throw new Error(`AI 返回的 JSON 格式无效`, { cause: error })
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}
