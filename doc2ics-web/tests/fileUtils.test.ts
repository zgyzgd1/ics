import { afterEach, describe, expect, it, vi } from 'vitest'
import { saveIcsToDisk, shareIcsFile } from '../src/utils/fileUtils'

const originalCanShare = navigator.canShare
const originalShare = navigator.share
const originalCreateObjectUrl = URL.createObjectURL
const originalRevokeObjectUrl = URL.revokeObjectURL
const originalShowSaveFilePicker = window.showSaveFilePicker

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()

  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: originalCanShare,
  })
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: originalShare,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: originalCreateObjectUrl,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: originalRevokeObjectUrl,
  })
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    value: originalShowSaveFilePicker,
  })
})

describe('saveIcsToDisk', () => {
  it('downloads non-empty ICS content instead of opening the save picker', async () => {
    vi.useFakeTimers()
    const content = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'
    const showSaveFilePicker = vi.fn()
    const createObjectURL = vi.fn(() => 'blob:ics-download')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: showSaveFilePicker,
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })

    await saveIcsToDisk(content, 'events.ics')

    expect(showSaveFilePicker).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)

    const blob = createObjectURL.mock.calls[0][0] as Blob
    await expect(blob.text()).resolves.toBe(content)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:ics-download')
  })
})

describe('shareIcsFile', () => {
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
