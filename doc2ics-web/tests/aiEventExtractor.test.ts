import { describe, expect, it } from 'vitest'
import { buildOpenAiChatUrl, compactAiContext, parseAiEventsPayload } from '../src/core/ai/aiEventExtractor'

describe('parseAiEventsPayload', () => {
  it('normalizes valid model events and skips invalid rows', () => {
    const events = parseAiEventsPayload({
      events: [
        {
          summary: '评审会议',
          start: '2026-05-20T14:00:00+08:00',
          end: '2026-05-20T15:00:00+08:00',
          location: '会议室 A',
          description: '产品评审',
          confidence: 0.92,
          sourceText: '5 月 20 日 14:00 产品评审',
        },
        {
          summary: '',
          start: 'not-a-date',
        },
      ],
    })

    expect(events).toHaveLength(1)
    const startMs = new Date('2026-05-20T14:00:00+08:00').getTime()
    expect(events[0]).toMatchObject({
      id: `ai-${startMs}-0`,
      summary: '评审会议',
      location: '会议室 A',
      description: '产品评审',
      sourceText: '5 月 20 日 14:00 产品评审',
      confidence: 0.92,
    })
    expect(events[0].start).toBe(new Date('2026-05-20T14:00:00+08:00').toISOString())
    expect(events[0].end).toBe(new Date('2026-05-20T15:00:00+08:00').toISOString())
  })

  it('keeps timetable and email metadata returned by the model', () => {
    const events = parseAiEventsPayload({
      events: [
        {
          title: '大学英语',
          startTime: '2026-09-08T10:00:00+08:00',
          endTime: '2026-09-08T11:40:00+08:00',
          eventType: 'course',
          recurrence: {
            frequency: 'weekly',
            count: 12,
            byDay: ['TU'],
          },
          reminders: [15, 5],
          course: {
            teacher: '李老师',
            classroom: 'B201',
            weeks: '1-12 周',
          },
          organizer: '教务处 <office@example.edu>',
          attendees: ['学生 <student@example.edu>'],
          sourceEmail: 'office@example.edu',
        },
      ],
    })

    expect(events[0].eventType).toBe('course')
    expect(events[0].recurrence).toEqual({ frequency: 'weekly', count: 12, byDay: ['TU'] })
    expect(events[0].reminders).toEqual([15, 5])
    expect(events[0].course).toEqual({
      teacher: '李老师',
      classroom: 'B201',
      weeks: '1-12 周',
    })
    expect(events[0].organizer).toBe('教务处 <office@example.edu>')
    expect(events[0].attendees).toEqual(['学生 <student@example.edu>'])
    expect(events[0].sourceEmail).toBe('office@example.edu')
  })
})

describe('buildOpenAiChatUrl', () => {
  it('builds chat completions URLs for OpenAI-compatible base URLs', () => {
    expect(buildOpenAiChatUrl('https://api.openai.com/v1')).toBe(
      'https://api.openai.com/v1/chat/completions',
    )
    expect(buildOpenAiChatUrl('http://localhost:11434/v1/')).toBe(
      'http://localhost:11434/v1/chat/completions',
    )
  })
})

describe('compactAiContext', () => {
  it('keeps schedule clues while removing repeated low-value context', () => {
    const noisyText = [
      '学校通知',
      ...Array.from({ length: 20 }, () => '免责声明：本邮件内容仅供参考，请勿外传。'),
      '课程名称：高等数学',
      '上课时间：2026 年 9 月 7 日 周一 08:00-09:40',
      '上课地点：教学楼 A101',
      '任课教师：张老师',
      '会议邀请：论文组会 2026-05-20 14:00 会议室 B',
      '发件人：teacher@example.com',
      ...Array.from({ length: 20 }, () => '页脚：请关注公众号获取更多资讯。'),
    ].join('\n')

    const compacted = compactAiContext(noisyText, 180)

    expect(compacted.length).toBeLessThanOrEqual(180)
    expect(compacted).toContain('高等数学')
    expect(compacted).toContain('2026 年 9 月 7 日')
    expect(compacted).toContain('教学楼 A101')
    expect(compacted).toContain('teacher@example.com')
    expect(compacted.match(/免责声明/g)?.length ?? 0).toBeLessThanOrEqual(1)
    expect(compacted.match(/页脚/g)?.length ?? 0).toBeLessThanOrEqual(1)
  })
})
