import { describe, expect, it } from 'vitest'
import { parseDocumentToEvents } from '../src/core/workers/parsePipeline'
import type { ParseProgress } from '../src/types/app'

describe('parseDocumentToEvents', () => {
  it('uses OCR text from scanned PDFs before extracting events', async () => {
    const input = {
      fileName: 'scan.pdf',
      mimeType: 'application/pdf',
      bytes: new Uint8Array([1, 2, 3]),
    }

    const response = await parseDocumentToEvents(input, {
      parseDocument: async () => ({
        text: '',
        fileKind: 'pdf',
        parseEngine: 'pdfjs-dist',
        warnings: ['PDF looks like a scan. OCR is recommended for better results.'],
        requiresOcr: true,
      }),
      extractPdfOcrText: async () => 'Design review on May 20 2026 at 2pm',
    })

    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.outcome.requiresOcr).toBe(false)
    expect(response.outcome.parseEngine).toBe('pdfjs-dist+tesseract.js')
    expect(response.outcome.text).toContain('Design review')
    expect(response.events[0].summary).toContain('Design review')
    expect(response.events[0].description).toContain('May 20 2026 at 2pm')
  })

  it('uses AI events when AI enhancement is enabled and keeps local extraction as fallback', async () => {
    const input = {
      fileName: 'agenda.txt',
      mimeType: 'text/plain',
      bytes: new TextEncoder().encode('项目会在 2026-05-20 14:00 开始'),
    }

    const response = await parseDocumentToEvents(input, {
      parseDocument: async () => ({
        text: '项目会在 2026-05-20 14:00 开始',
        fileKind: 'txt',
        parseEngine: 'text',
        warnings: [],
        requiresOcr: false,
      }),
      recognitionSettings: {
        ocr: {
          mode: 'local',
          language: 'chi_sim+eng',
          remoteEndpoint: '',
        },
        ai: {
          enabled: true,
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'test-key',
          model: 'test-model',
        },
      },
      extractAiEventsFromText: async () => [
        {
          id: 'ai-1',
          summary: 'AI 识别的项目会',
          start: '2026-05-20T06:00:00.000Z',
          end: '2026-05-20T07:00:00.000Z',
          confidence: 0.95,
        },
      ],
    })

    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.events[0].summary).toBe('AI 识别的项目会')
    expect(response.outcome.warnings).toContain('AI 增强识别已合并到结果中。')
  })

  it('redacts student privacy before preview, local extraction, and AI extraction', async () => {
    let aiInput = ''
    const input = {
      fileName: 'timetable.txt',
      mimeType: 'text/plain',
      bytes: new TextEncoder().encode('学生姓名：张三\n学号：202312345678\n课程在 2026-09-07 08:00 开始'),
    }

    const response = await parseDocumentToEvents(input, {
      parseDocument: async () => ({
        text: '学生姓名：张三\n学号：202312345678\n课程在 2026-09-07 08:00 开始',
        fileKind: 'txt',
        parseEngine: 'text',
        warnings: [],
        requiresOcr: false,
      }),
      recognitionSettings: {
        ocr: {
          mode: 'local',
          language: 'chi_sim+eng',
          remoteEndpoint: '',
        },
        ai: {
          enabled: true,
          baseUrl: 'https://api.example.com/v1',
          apiKey: 'test-key',
          model: 'test-model',
        },
      },
      extractAiEventsFromText: async (text) => {
        aiInput = text
        return []
      },
    })

    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.outcome.text).not.toContain('张三')
    expect(response.outcome.text).not.toContain('202312345678')
    expect(response.outcome.text).toContain('学生姓名：[已脱敏姓名]')
    expect(response.outcome.text).toContain('学号：[已脱敏学号]')
    expect(response.outcome.warnings).toContain('已自动脱敏姓名和学号字段。')
    expect(aiInput).not.toContain('张三')
    expect(aiInput).not.toContain('202312345678')
    expect(response.events.some((event) => event.description?.includes('张三'))).toBe(false)
    expect(response.events.some((event) => event.description?.includes('202312345678'))).toBe(false)
  })

  it('reports parsing progress stages', async () => {
    const progress: ParseProgress[] = []

    const response = await parseDocumentToEvents(
      {
        fileName: 'agenda.txt',
        mimeType: 'text/plain',
        bytes: new TextEncoder().encode('姓名：张三\n项目会在 2026-05-20 14:00 开始'),
      },
      {
        parseDocument: async () => ({
          text: '姓名：张三\n项目会在 2026-05-20 14:00 开始',
          fileKind: 'txt',
          parseEngine: 'text',
          warnings: [],
          requiresOcr: false,
        }),
        onProgress: (item) => progress.push(item),
      },
    )

    expect(response.ok).toBe(true)
    expect(progress[0]).toMatchObject({ percent: 12, status: '准备解析文档' })
    expect(progress.some((item) => item.status === '隐私脱敏')).toBe(true)
    expect(progress.some((item) => item.status === '抽取日程')).toBe(true)
    expect(progress.at(-1)).toMatchObject({ percent: 100, status: '解析完成' })
  })
})
