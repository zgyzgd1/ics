import { describe, expect, it } from 'vitest'
import { extractEventsFromText, createFallbackEvent } from '../src/core/extractor/eventExtractor'

describe('extractEventsFromText', () => {
  it('extracts date from English text', () => {
    const text = 'Meeting on March 15, 2024 at 2pm'
    const events = extractEventsFromText(text)

    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0]).toMatchObject({
      summary: expect.any(String),
      start: expect.stringContaining('2024-03-15'),
    })
  })

  it('extracts multiple events from text', () => {
    const text = 'First meeting on March 15, 2024. Second meeting on March 20, 2024.'
    const events = extractEventsFromText(text)

    expect(events.length).toBeGreaterThanOrEqual(2)
  })

  it('sets confidence based on tags', () => {
    const text = 'Team meeting on March 15, 2024 at 2pm'
    const events = extractEventsFromText(text)

    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0].confidence).toBeDefined()
    expect(events[0].confidence).toBeGreaterThanOrEqual(0)
    expect(events[0].confidence).toBeLessThanOrEqual(1)
  })

  it('includes source text in description', () => {
    const text = 'Meeting on March 15, 2024'
    const events = extractEventsFromText(text)

    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0].description).toContain('来源文本')
  })

  it('returns empty array when no date found', () => {
    const text = 'This is a text without any dates'
    const events = extractEventsFromText(text)

    expect(events).toHaveLength(0)
  })
})

describe('createFallbackEvent', () => {
  it('creates fallback event with default summary', () => {
    const event = createFallbackEvent()

    expect(event).toMatchObject({
      summary: '导入的日程',
      description: '未识别到自然语言日期，请手动编辑此事件。',
    })
    expect(event.id).toContain('fallback')
  })

  it('creates fallback event with current time', () => {
    const before = new Date()
    const event = createFallbackEvent()
    const after = new Date()

    const start = new Date(event.start)
    expect(start.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(start.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('creates fallback event with 60 minute duration', () => {
    const event = createFallbackEvent()
    const start = new Date(event.start)
    const end = new Date(event.end!)

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    expect(durationMinutes).toBe(60)
  })
})
