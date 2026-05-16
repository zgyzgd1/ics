import { describe, expect, it } from 'vitest'
import { buildIcs } from '../src/core/generator/icsGenerator'

describe('buildIcs', () => {
  it('builds a calendar string with custom name and event summary', () => {
    const ics = buildIcs(
      [
        {
          id: '1',
          summary: 'Team sync',
          start: '2026-05-20T06:00:00.000Z',
          end: '2026-05-20T07:00:00.000Z',
          location: 'Room A',
        },
      ],
      {
        calendarName: 'Engineering Calendar',
        timezone: 'Asia/Shanghai',
      },
    )

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('SUMMARY:Team sync')
    expect(ics).toContain('X-WR-CALNAME:Engineering Calendar')
    expect(ics).toContain('X-WR-TIMEZONE:Asia/Shanghai')
  })

  it('writes calendar metadata outside VEVENT blocks', () => {
    const ics = buildIcs(
      [
        {
          id: '1',
          summary: 'Team sync',
          start: '2026-05-20T06:00:00.000Z',
          end: '2026-05-20T07:00:00.000Z',
        },
      ],
      {
        calendarName: 'Engineering Calendar',
        timezone: 'Asia/Shanghai',
      },
    )

    const firstEventIndex = ics.indexOf('BEGIN:VEVENT')
    const calendarHeader = ics.slice(0, firstEventIndex)

    expect(calendarHeader).toContain('X-WR-CALNAME:Engineering Calendar')
    expect(calendarHeader).toContain('X-WR-TIMEZONE:Asia/Shanghai')
    expect(ics.slice(firstEventIndex)).not.toContain('X-WR-CALNAME:Engineering Calendar')
  })

  it('exports course timetable events with weekly recurrence and reminder alarms', () => {
    const ics = buildIcs(
      [
        {
          id: 'course-1',
          eventType: 'course',
          summary: '高等数学',
          start: '2026-09-07T00:00:00.000Z',
          end: '2026-09-07T01:40:00.000Z',
          location: '教学楼 A101',
          description: '第一节课',
          recurrence: {
            frequency: 'weekly',
            count: 16,
            byDay: ['MO'],
          },
          reminders: [15],
          course: {
            teacher: '张老师',
            classroom: '教学楼 A101',
            weeks: '1-16 周',
          },
        },
      ],
      {
        calendarName: '课程表',
        timezone: 'Asia/Shanghai',
      },
    )

    expect(ics).toContain('SUMMARY:高等数学')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;COUNT=16;BYDAY=MO')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics).toContain('CATEGORIES:课程表')
    expect(ics).toContain('X-DOC2ICS-EVENT-TYPE:course')
    expect(ics).toContain('任课教师：张老师')
  })

  it('exports email and calendar sourced events with attendees and source metadata', () => {
    const ics = buildIcs(
      [
        {
          id: 'mail-1',
          eventType: 'email',
          summary: '论文组会',
          start: '2026-05-20T06:00:00.000Z',
          end: '2026-05-20T07:00:00.000Z',
          description: '来自邮件的会议邀请',
          organizer: '导师 <teacher@example.com>',
          attendees: ['学生 <student@example.com>'],
          sourceEmail: 'teacher@example.com',
          reminders: [30, 5],
        },
      ],
      {
        calendarName: '邮箱日程',
        timezone: 'Asia/Shanghai',
      },
    )

    expect(ics).toContain('ORGANIZER')
    expect(ics).toContain('mailto:teacher@example.com')
    expect(ics).toContain('ATTENDEE')
    expect(ics.toLowerCase()).toContain('mailto:student@example.com')
    expect(ics).toContain('TRIGGER:-PT30M')
    expect(ics).toContain('TRIGGER:-PT5M')
    expect(ics).toContain('CATEGORIES:邮箱日程')
    expect(ics).toContain('X-DOC2ICS-SOURCE-EMAIL:teacher@example.com')
  })
})
