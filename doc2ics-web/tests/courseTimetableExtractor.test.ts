import { describe, expect, it } from 'vitest'
import { extractCourseEventsFromText } from '../src/core/extractor/courseTimetableExtractor'

describe('extractCourseEventsFromText', () => {
  it('extracts HEBAU-style timetable course rows from PDF text', () => {
    const text = [
      '我的课程表 2026年春季学期',
      'B04211004-机械设计基础 A[02] 13-14周,星期1,第1小节-第2小节东1教-209(D)',
      'B04211004-机械设计基础 A[02] 1-7周,9-11周(单),13-15周,星期3,第1小节-第2小节东1教-208(D)',
    ].join(' ')

    const events = extractCourseEventsFromText(text)

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({
      eventType: 'course',
      summary: '机械设计基础 A',
      location: '东1教-209(D)',
      course: {
        classroom: '东1教-209(D)',
        weeks: '13,14',
        semesterStartDate: '2026-02-23',
        weekRule: 'CUSTOM',
      },
      recurrence: {
        frequency: 'weekly',
        byDay: ['MO'],
        count: 2,
      },
    })
    expect(events[0].start).toBe('2026-05-18T00:00:00.000Z')
    expect(events[0].end).toBe('2026-05-18T01:40:00.000Z')
    expect(events[1].course?.weeks).toBe('1,2,3,4,5,6,7,9,11,13,14,15')
  })
})
