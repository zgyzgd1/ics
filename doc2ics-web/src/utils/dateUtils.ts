import { addMinutes, format } from 'date-fns'

export function toInputDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function parseDateTime(value: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`无效的日期时间：${value}`)
  }
  return parsed
}

export function inferEventEnd(start: Date, explicitEnd?: Date, fallbackMinutes = 60): Date {
  if (explicitEnd && explicitEnd.getTime() > start.getTime()) {
    return explicitEnd
  }

  return addMinutes(start, fallbackMinutes)
}
