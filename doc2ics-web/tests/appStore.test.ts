import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore } from '../src/store/appStore'

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
  })

  it('has correct initial state', () => {
    const state = useAppStore.getState()

    expect(state.selectedFile).toBeNull()
    expect(state.parseStatus).toBe('idle')
    expect(state.events).toEqual([])
    expect(state.timezone).toBe('Asia/Shanghai')
    expect(state.calendarName).toBe('Doc2ICS 导入日历')
  })

  it('sanitizes API key on AI settings update', () => {
    const { updateAiSettings } = useAppStore.getState()

    updateAiSettings({ apiKey: 'secret-key-123' })

    const state = useAppStore.getState()
    expect(state.recognitionSettings.ai.apiKey).toBe('')
  })

  it('sanitizes remote endpoint on OCR settings update', () => {
    const { updateOcrSettings } = useAppStore.getState()

    updateOcrSettings({ remoteEndpoint: 'https://ocr.example.com' })

    const state = useAppStore.getState()
    expect(state.recognitionSettings.ocr.remoteEndpoint).toBe('')
  })

  it('updates event correctly', () => {
    const { addEvent, updateEvent } = useAppStore.getState()

    addEvent({
      id: 'test-1',
      summary: 'Original',
      start: '2024-03-15T10:00:00.000Z',
    })

    updateEvent('test-1', { summary: 'Updated' })

    const state = useAppStore.getState()
    expect(state.events[0].summary).toBe('Updated')
  })

  it('removes event correctly', () => {
    const { addEvent, removeEvent } = useAppStore.getState()

    addEvent({ id: 'test-1', summary: 'Event 1', start: '2024-03-15T10:00:00.000Z' })
    addEvent({ id: 'test-2', summary: 'Event 2', start: '2024-03-16T10:00:00.000Z' })

    removeEvent('test-1')

    const state = useAppStore.getState()
    expect(state.events).toHaveLength(1)
    expect(state.events[0].id).toBe('test-2')
  })

  it('adds event to beginning of list', () => {
    const { addEvent } = useAppStore.getState()

    addEvent({ id: 'test-1', summary: 'First', start: '2024-03-15T10:00:00.000Z' })
    addEvent({ id: 'test-2', summary: 'Second', start: '2024-03-16T10:00:00.000Z' })

    const state = useAppStore.getState()
    expect(state.events[0].id).toBe('test-2')
    expect(state.events[1].id).toBe('test-1')
  })

  it('resets state correctly', () => {
    const { setFile, addEvent, reset } = useAppStore.getState()

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    setFile(file)
    addEvent({ id: 'test-1', summary: 'Test', start: '2024-03-15T10:00:00.000Z' })

    reset()

    const state = useAppStore.getState()
    expect(state.selectedFile).toBeNull()
    expect(state.events).toEqual([])
    expect(state.parseStatus).toBe('idle')
  })

  it('updates timezone correctly', () => {
    const { setTimezone } = useAppStore.getState()

    setTimezone('UTC')

    expect(useAppStore.getState().timezone).toBe('UTC')
  })

  it('updates calendar name correctly', () => {
    const { setCalendarName } = useAppStore.getState()

    setCalendarName('My Calendar')

    expect(useAppStore.getState().calendarName).toBe('My Calendar')
  })

  it('applies summary prefix to all events', () => {
    const { addEvent, setSummaryPrefix, applySummaryPrefix } = useAppStore.getState()

    addEvent({ id: 'test-1', summary: 'Meeting', start: '2024-03-15T10:00:00.000Z' })
    addEvent({ id: 'test-2', summary: 'Call', start: '2024-03-16T10:00:00.000Z' })

    setSummaryPrefix('Work')
    applySummaryPrefix()

    const state = useAppStore.getState()
    // addEvent adds to beginning, so test-2 is at index 0, test-1 at index 1
    expect(state.events[0].summary).toBe('Work: Call')
    expect(state.events[1].summary).toBe('Work: Meeting')
  })

  it('does not duplicate prefix if already present', () => {
    const { addEvent, setSummaryPrefix, applySummaryPrefix } = useAppStore.getState()

    addEvent({ id: 'test-1', summary: 'Work: Meeting', start: '2024-03-15T10:00:00.000Z' })

    setSummaryPrefix('Work')
    applySummaryPrefix()

    const state = useAppStore.getState()
    expect(state.events[0].summary).toBe('Work: Meeting')
  })
})
