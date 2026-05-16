import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareIcsFile } from '../src/utils/fileUtils'

const originalCanShare = navigator.canShare
const originalShare = navigator.share

describe('shareIcsFile', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: originalCanShare,
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: originalShare,
    })
  })

  it('returns false when the browser cannot share files', async () => {
    const share = vi.fn()

    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => false),
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    })

    await expect(shareIcsFile('BEGIN:VCALENDAR', 'events.ics')).resolves.toBe(false)
    expect(share).not.toHaveBeenCalled()
  })
})
