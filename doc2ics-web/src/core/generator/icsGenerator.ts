import ical, {
  ICalAlarmType,
  ICalEventRepeatingFreq,
  ICalWeekday,
  type ICalRepeatingOptions,
} from 'ical-generator'
import type { CalendarEvent, IcsBuildOptions } from '../../types/app'
import { inferEventEnd } from '../../utils/dateUtils'

type EventRecurrence = NonNullable<CalendarEvent['recurrence']>
type EventWeekday = NonNullable<EventRecurrence['byDay']>[number]

function sanitizeText(value: string | undefined): string {
  return (value ?? '').replace(/\r?\n/g, ' ').trim()
}

function textOrUndefined(value: string | undefined): string | undefined {
  const text = sanitizeText(value)
  return text || undefined
}

function eventCategory(event: CalendarEvent): string | null {
  if (event.eventType === 'course') return '课程表'
  if (event.eventType === 'email') return '邮箱日程'
  if (event.eventType === 'calendar') return '日历日程'
  return null
}

function vs1TimetableMetadata(event: CalendarEvent): Record<string, string> {
  if (event.eventType !== 'course' || !event.course?.semesterStartDate || !event.course.weeks) {
    return {}
  }

  return {
    'X-TIMETABLE-ENTRY-ID': sanitizeText(event.id),
    'X-TIMETABLE-RECURRENCE': 'WEEKLY',
    'X-TIMETABLE-SEMESTER-START': sanitizeText(event.course.semesterStartDate),
    'X-TIMETABLE-WEEK-RULE': event.course.weekRule ?? 'CUSTOM',
    'X-TIMETABLE-CUSTOM-WEEKS': sanitizeText(event.course.weeks),
    'X-TIMETABLE-SKIP-WEEKS': '',
  }
}

function repeatingFrequency(frequency: EventRecurrence['frequency']): ICalEventRepeatingFreq {
  if (frequency === 'daily') return ICalEventRepeatingFreq.DAILY
  if (frequency === 'monthly') return ICalEventRepeatingFreq.MONTHLY
  return ICalEventRepeatingFreq.WEEKLY
}

function weekday(day: EventWeekday): ICalWeekday {
  if (day === 'MO') return ICalWeekday.MO
  if (day === 'TU') return ICalWeekday.TU
  if (day === 'WE') return ICalWeekday.WE
  if (day === 'TH') return ICalWeekday.TH
  if (day === 'FR') return ICalWeekday.FR
  if (day === 'SA') return ICalWeekday.SA
  return ICalWeekday.SU
}

function repeatingOptions(event: CalendarEvent): ICalRepeatingOptions | null {
  if (!event.recurrence) return null

  const repeating: ICalRepeatingOptions = {
    freq: repeatingFrequency(event.recurrence.frequency),
  }

  if (event.recurrence.interval && event.recurrence.interval > 1) {
    repeating.interval = event.recurrence.interval
  }
  if (event.recurrence.count && event.recurrence.count > 0) {
    repeating.count = event.recurrence.count
  }
  if (event.recurrence.until) {
    repeating.until = new Date(event.recurrence.until)
  }
  if (event.recurrence.byDay?.length) {
    repeating.byDay = event.recurrence.byDay.map(weekday)
  }

  return repeating
}

function eventDescription(event: CalendarEvent): string {
  const chunks = [sanitizeText(event.description)]

  if (event.course?.teacher) chunks.push(`任课教师：${sanitizeText(event.course.teacher)}`)
  if (event.course?.classroom) chunks.push(`教室：${sanitizeText(event.course.classroom)}`)
  if (event.course?.weeks) chunks.push(`上课周次：${sanitizeText(event.course.weeks)}`)
  if (event.sourceEmail) chunks.push(`来源邮箱：${sanitizeText(event.sourceEmail)}`)
  if (event.sourceText) chunks.push(`来源文本：${sanitizeText(event.sourceText)}`)

  return chunks.filter(Boolean).join('\n')
}

function createCalendar(options: IcsBuildOptions) {
  return ical({
    name: sanitizeText(options.calendarName) || 'Doc2ICS 导入日历',
    prodId: {
      company: 'doc2ics',
      product: 'Doc2ICS',
      language: 'ZH',
    },
    timezone: options.timezone,
  })
}

function addSingleEvent(calendar: ReturnType<typeof createCalendar>, event: CalendarEvent, options: IcsBuildOptions): void {
  const start = new Date(event.start)
  const end = inferEventEnd(start, event.end ? new Date(event.end) : undefined)
  const category = eventCategory(event)

  const icalEvent = calendar.createEvent({
    id: event.id,
    summary: sanitizeText(event.summary) || '导入的日程',
    description: textOrUndefined(eventDescription(event)),
    location: textOrUndefined(event.course?.classroom || event.location),
    start,
    end,
    timezone: options.timezone,
  })

  const repeating = repeatingOptions(event)
  if (repeating) {
    icalEvent.repeating(repeating)
  }

  if (event.reminders?.length) {
    icalEvent.alarms(
      event.reminders
        .filter((minutes) => Number.isFinite(minutes) && minutes > 0)
        .map((minutes) => ({
          type: ICalAlarmType.display,
          trigger: Math.round(minutes * 60),
          description: sanitizeText(event.summary) || '日程提醒',
        })),
    )
  }

  if (event.organizer) {
    icalEvent.organizer(event.organizer)
  }

  if (event.attendees?.length) {
    icalEvent.attendees(event.attendees.filter(Boolean))
  }

  if (category) {
    icalEvent.categories([{ name: category }])
  }

  icalEvent.x({
    'X-DOC2ICS-EVENT-TYPE': event.eventType ?? 'general',
    ...(event.sourceEmail ? { 'X-DOC2ICS-SOURCE-EMAIL': sanitizeText(event.sourceEmail) } : {}),
    ...vs1TimetableMetadata(event),
  })
}

export function buildIcs(events: CalendarEvent[], options: IcsBuildOptions): string {
  const calendar = createCalendar(options)

  for (const event of events) {
    addSingleEvent(calendar, event, options)
  }

  return calendar.toString()
}
