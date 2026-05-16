import { describe, expect, it } from 'vitest'
import { normalizeOcrText } from '../src/core/ocr/tesseractOCR'

describe('normalizeOcrText', () => {
  it('collapses noisy whitespace while preserving paragraph breaks', () => {
    const raw = 'Hello   world\r\n\r\n\r\nNext\tline'
    const normalized = normalizeOcrText(raw)

    expect(normalized).toBe('Hello world\n\nNext line')
  })
})
