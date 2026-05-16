import { describe, expect, it } from 'vitest'
import { readRemoteOcrText } from '../src/core/ocr/remoteOCR'

describe('readRemoteOcrText', () => {
  it('accepts common remote OCR response shapes', () => {
    expect(readRemoteOcrText({ text: '第一行' })).toBe('第一行')
    expect(readRemoteOcrText({ data: { text: '第二行' } })).toBe('第二行')
    expect(readRemoteOcrText({ pages: [{ text: '第一页' }, { text: '第二页' }] })).toBe(
      '第一页\n\n第二页',
    )
    expect(readRemoteOcrText({ results: [{ text: '结果一' }, { text: '结果二' }] })).toBe(
      '结果一\n\n结果二',
    )
  })

  it('returns an empty string for unsupported payloads', () => {
    expect(readRemoteOcrText({ value: 'missing' })).toBe('')
    expect(readRemoteOcrText(null)).toBe('')
  })
})
