import { describe, expect, it, vi } from 'vitest'
import { parseDocument } from '../src/core/parsers/parseDocument'
import { buildPdfDocumentOptions } from '../src/core/parsers/pdfParser'
import { detectFileKind } from '../src/utils/fileUtils'

describe('file kind detection', () => {
  it('detects pdf by extension', () => {
    expect(detectFileKind('agenda.PDF', '')).toBe('pdf')
  })

  it('detects docx by mime type', () => {
    expect(
      detectFileKind(
        'unknown.bin',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx')
  })
})

describe('parseDocument csv path', () => {
  it('parses csv into text lines', async () => {
    const csv = 'title,start\nDesign review,2026-05-20 14:00'
    const bytes = new TextEncoder().encode(csv)

    const output = await parseDocument({
      fileName: 'sample.csv',
      mimeType: 'text/csv',
      bytes,
    })

    expect(output.fileKind).toBe('csv')
    expect(output.text).toContain('Design review')
  })
})

describe('pdf parser options', () => {
  it('disables nested PDF workers when running without window', () => {
    const originalWindow = globalThis.window
    vi.stubGlobal('window', undefined)

    const options = buildPdfDocumentOptions(new Uint8Array([1, 2, 3]))

    expect(options.disableWorker).toBe(true)
    expect(options.data).toEqual(new Uint8Array([1, 2, 3]))
    vi.stubGlobal('window', originalWindow)
  })
})
