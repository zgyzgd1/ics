import { describe, expect, it } from 'vitest'
import { shouldParseOnMainThread } from '../src/core/workers/runParseWorker'

describe('shouldParseOnMainThread', () => {
  it('keeps PDF parsing on the main browser thread for PDF.js compatibility', () => {
    expect(shouldParseOnMainThread('timeTableForStu12.pdf', '')).toBe(true)
    expect(shouldParseOnMainThread('agenda.txt', 'text/plain')).toBe(false)
  })
})
