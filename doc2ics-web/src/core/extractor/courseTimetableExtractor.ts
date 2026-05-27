import { addDays, format } from 'date-fns'
import type { CalendarEvent } from '../../types/app'

type WeekdayToken = NonNullable<NonNullable<CalendarEvent['recurrence']>['byDay']>[number]

const COURSE_ROW_PATTERN =
  /([A-Z]{1,4}\d{5,})-([\s\S]*?)\[([^\]]+)\]\s*([\d,\-，、\s周()（）单双]+?)\s*[,，]\s*星期\s*([1-7一二三四五六日天])\s*[,，]\s*第\s*(\d{1,2})\s*小节\s*[-~～至到—–]\s*第\s*(\d{1,2})\s*小节\s*([\s\S]*?)(?=[\s,，]*[A-Z]{1,4}\d{5,}-|$)/g

const GENERIC_COURSE_PATTERN =
  /([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9（()）\s]{2,30}?)\s+第\s*(\d{1,2})\s*小节[-~～至到—–]\s*第\s*(\d{1,2})\s*小节[,，]\s*星期\s*([1-7一二三四五六日天])[,，]\s*(\d{1,2})-(\d{1,2})\s*周/g

const SECTION_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:55', end: '09:40' },
  3: { start: '10:10', end: '10:55' },
  4: { start: '11:05', end: '11:50' },
  5: { start: '14:30', end: '15:15' },
  6: { start: '15:25', end: '16:10' },
  7: { start: '16:20', end: '17:05' },
  8: { start: '17:15', end: '18:00' },
  9: { start: '18:30', end: '19:15' },
  10: { start: '19:25', end: '20:10' },
  11: { start: '20:20', end: '21:05' },
  12: { start: '21:15', end: '22:00' },
}

const WEEKDAY_TOKENS: Record<number, WeekdayToken> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
}

function normalizeTimetableText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
    .replace(/第\s*(\d{1,2})\s*小节/g, '第$1小节')
    .replace(/(\d{1,2})\s*周/g, '$1周')
    .replace(/\s*([,，()（）])\s*/g, '$1')
    .replace(/\s*\[/g, '[')
    .replace(/\]\s*/g, ']')
    .trim()
}

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
    .trim()
}

function cleanCourseName(value: string): string {
  return cleanText(value).replace(/[，,;；:：]+$/g, '').trim()
}

function cleanLocation(value: string): string {
  const withoutNextSlot = cleanText(value)
    .replace(/\s*第\d{1,2}小节\s*[-~～至到—–]\s*第\d{1,2}小节[\s\S]*$/g, '')
    .replace(/[，,;；]+$/g, '')
    .trim()

  return withoutNextSlot === '无' ? '' : withoutNextSlot
}

function semesterStartFromText(text: string): string {
  const match = /(\d{4})年\s*(春季|秋季|夏季|冬季)?学期/.exec(text)
  const year = Number(match?.[1] ?? new Date().getFullYear())
  const term = match?.[2] ?? '春季'
  const month = term === '秋季' ? 9 : term === '夏季' ? 7 : 2
  const day = term === '秋季' ? 1 : term === '夏季' ? 1 : 23
  const base = new Date(year, month - 1, day)
  return format(nextMondayOnOrAfter(base), 'yyyy-MM-dd')
}

function nextMondayOnOrAfter(date: Date): Date {
  const day = date.getDay()
  const offset = (8 - day) % 7
  return addDays(date, offset)
}

function dayNumber(value: string): number | null {
  const normalized = value.trim()
  if (/^[1-7]$/.test(normalized)) return Number(normalized)
  return { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 }[normalized] ?? null
}

function expandWeeks(raw: string): number[] {
  const weeks = new Set<number>()
  const normalized = raw
    .replace(/[，、]/g, ',')
    .replace(/[（）]/g, (char) => (char === '（' ? '(' : ')'))
    .replace(/[—–~～至到]/g, '-')
    .replace(/\s+/g, '')

  for (const token of normalized.split(',').filter(Boolean)) {
    const parity = token.includes('单') ? 'odd' : token.includes('双') ? 'even' : 'all'
    const numeric = token.replace(/周/g, '').replace(/\([^)]*\)/g, '')
    const range = /^(\d{1,2})-(\d{1,2})$/.exec(numeric)
    const single = /^(\d{1,2})$/.exec(numeric)
    const values = range
      ? rangeValues(Number(range[1]), Number(range[2]))
      : single
        ? [Number(single[1])]
        : []

    for (const week of values) {
      if (week > 0 && week <= 60 && (parity === 'all' || (parity === 'odd' ? week % 2 === 1 : week % 2 === 0))) {
        weeks.add(week)
      }
    }
  }

  return [...weeks].sort((a, b) => a - b)
}

function rangeValues(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return []
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function localDateForWeek(semesterStartDate: string, week: number, day: number): string {
  const [y, m, d] = semesterStartDate.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  return format(addDays(start, (week - 1) * 7 + (day - 1)), 'yyyy-MM-dd')
}

function toIsoWithShanghaiOffset(date: string, time: string): string {
  return new Date(`${date}T${time}:00+08:00`).toISOString()
}

function eventId(code: string, day: number, startSection: number, endSection: number, weeks: number[]): string {
  return `vs1-${code}-${day}-${startSection}-${endSection}-${weeks.join('-')}`
}

function extractFromGenericPattern(normalized: string, semesterStartDate: string, events: CalendarEvent[]): void {
  for (const match of normalized.matchAll(GENERIC_COURSE_PATTERN)) {
    const [, rawName, rawStartSection, rawEndSection, rawDay, rawStartWeek, rawEndWeek] = match
    const day = dayNumber(rawDay)
    const startSection = Number(rawStartSection)
    const endSection = Number(rawEndSection)
    const startTime = SECTION_TIMES[startSection]?.start
    const endTime = SECTION_TIMES[endSection]?.end
    const weeks = expandWeeks(`${rawStartWeek}-${rawEndWeek}周`)
    const name = cleanCourseName(rawName)

    if (!day || !WEEKDAY_TOKENS[day] || !startTime || !endTime || weeks.length === 0 || !name) {
      continue
    }

    const id = `gen-${name}-${day}-${startSection}-${endSection}-${weeks.join('-')}`
    if (events.some((e) => e.id === id)) continue

    const firstDate = localDateForWeek(semesterStartDate, weeks[0], day)
    events.push({
      id,
      eventType: 'course',
      summary: name,
      start: toIsoWithShanghaiOffset(firstDate, startTime),
      end: toIsoWithShanghaiOffset(firstDate, endTime),
      recurrence: { frequency: 'weekly', byDay: [WEEKDAY_TOKENS[day]], count: weeks.length },
      course: { weeks: weeks.join(','), semesterStartDate, weekRule: 'CUSTOM' },
      confidence: 0.7,
    })
  }
}

export function extractCourseEventsFromText(text: string): CalendarEvent[] {
  const normalized = normalizeTimetableText(text)
  const semesterStartDate = semesterStartFromText(normalized)
  const events: CalendarEvent[] = []

  for (const match of normalized.matchAll(COURSE_ROW_PATTERN)) {
    const [, code, rawName, , rawWeeks, rawDay, rawStartSection, rawEndSection, rawLocation] = match
    const day = dayNumber(rawDay)
    const startSection = Number(rawStartSection)
    const endSection = Number(rawEndSection)
    const weeks = expandWeeks(rawWeeks)
    const startTime = SECTION_TIMES[startSection]?.start
    const endTime = SECTION_TIMES[endSection]?.end
    const name = cleanCourseName(rawName)

    if (!day || !WEEKDAY_TOKENS[day] || !startTime || !endTime || weeks.length === 0 || !name) {
      continue
    }

    const firstDate = localDateForWeek(semesterStartDate, weeks[0], day)
    const classroom = cleanLocation(rawLocation)
    const weeksText = weeks.join(',')

    events.push({
      id: eventId(code, day, startSection, endSection, weeks),
      eventType: 'course',
      summary: name,
      start: toIsoWithShanghaiOffset(firstDate, startTime),
      end: toIsoWithShanghaiOffset(firstDate, endTime),
      location: classroom || undefined,
      recurrence: {
        frequency: 'weekly',
        byDay: [WEEKDAY_TOKENS[day]],
        count: weeks.length,
      },
      course: {
        classroom: classroom || undefined,
        weeks: weeksText,
        semesterStartDate,
        weekRule: 'CUSTOM',
      },
      confidence: 0.88,
    })
  }

  extractFromGenericPattern(normalized, semesterStartDate, events)

  return events
}
