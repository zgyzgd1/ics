import { describe, expect, it } from 'vitest'
import { detectFileKind } from '../src/utils/fileUtils'
import { parseDocument } from '../src/core/parsers/parseDocument'

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
