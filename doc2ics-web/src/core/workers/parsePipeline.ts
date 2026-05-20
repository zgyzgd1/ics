import type {
  AiExtractionSettings,
  CalendarEvent,
  OcrSettings,
  ParseOutcome,
  ParseProgress,
  ParseWorkerResponse,
  RecognitionSettings,
} from '../../types/app'
import { extractAiEventsFromText as defaultExtractAiEventsFromText } from '../ai/aiEventExtractor'
import { createFallbackEvent, extractEventsFromText } from '../extractor/eventExtractor'
import { remoteOcrPdfBytes } from '../ocr/remoteOCR'
import { ocrPdfBytes } from '../ocr/tesseractOCR'
import { parseDocument as defaultParseDocument, type ParseDocumentInput } from '../parsers/parseDocument'
import { redactSensitiveStudentInfo } from '../privacy/privacyRedactor'
import { aiSettingsAreComplete, withDefaultRecognitionSettings } from '../recognition/settings'
import { extractCourseEventsFromText } from '../extractor/courseTimetableExtractor'

type ProgressHandler = (progress: ParseProgress) => void
type ParseDocumentFn = (input: ParseDocumentInput, options?: { onProgress?: ProgressHandler }) => Promise<ParseOutcome>
type ExtractPdfOcrTextFn = (bytes: Uint8Array, language?: string) => Promise<string>
type ExtractRemotePdfOcrTextFn = (bytes: Uint8Array, settings: OcrSettings) => Promise<string>
type ExtractAiEventsFromTextFn = (text: string, settings: AiExtractionSettings) => Promise<CalendarEvent[]>

interface ParsePipelineOptions {
  parseDocument?: ParseDocumentFn
  extractPdfOcrText?: ExtractPdfOcrTextFn
  extractRemotePdfOcrText?: ExtractRemotePdfOcrTextFn
  extractAiEventsFromText?: ExtractAiEventsFromTextFn
  recognitionSettings?: RecognitionSettings
  onProgress?: ProgressHandler
}

function emitProgress(onProgress: ProgressHandler | undefined, progress: ParseProgress): void {
  onProgress?.({
    ...progress,
    percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
  })
}

function buildEvents(text: string): CalendarEvent[] {
  const courseEvents = extractCourseEventsFromText(text)
  const generalEvents = extractEventsFromText(text)

  const allEvents = [...courseEvents, ...generalEvents]
  return allEvents.length > 0 ? allEvents : [createFallbackEvent()]
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function eventKey(event: CalendarEvent): string {
  const summary = event.summary.trim().toLowerCase()
  const start = new Date(event.start)
  const startKey = Number.isNaN(start.getTime()) ? event.start : String(Math.floor(start.getTime() / 60000))
  return `${summary}|${startKey}`
}

function mergeEvents(localEvents: CalendarEvent[], aiEvents: CalendarEvent[]): CalendarEvent[] {
  const merged = new Map<string, CalendarEvent>()

  for (const event of [...aiEvents, ...localEvents]) {
    const key = eventKey(event)
    if (!merged.has(key)) {
      merged.set(key, event)
      continue
    }

    const existing = merged.get(key)!
    merged.set(key, {
      ...event,
      ...existing,
      description: existing.description || event.description,
      location: existing.location || event.location,
      sourceText: existing.sourceText || event.sourceText,
      confidence: Math.max(existing.confidence ?? 0, event.confidence ?? 0),
    })
  }

  return [...merged.values()]
}

function applyPrivacyRedaction(outcome: ParseOutcome): ParseOutcome {
  const text = redactSensitiveStudentInfo(outcome.text)
  if (text === outcome.text) return outcome

  return {
    ...outcome,
    text,
    warnings: [...outcome.warnings, '已自动脱敏姓名和学号字段。'],
  }
}

async function applyPdfOcrIfNeeded(
  input: ParseDocumentInput,
  outcome: ParseOutcome,
  recognitionSettings: RecognitionSettings,
  extractPdfOcrText: ExtractPdfOcrTextFn,
  extractRemotePdfOcrText: ExtractRemotePdfOcrTextFn,
  onProgress?: ProgressHandler,
): Promise<ParseOutcome> {
  if (outcome.fileKind !== 'pdf' || !outcome.requiresOcr) {
    return outcome
  }

  try {
    const useRemoteOcr = recognitionSettings.ocr.mode === 'remote' && recognitionSettings.ocr.remoteEndpoint.trim()
    const ocrLabel = useRemoteOcr ? '远程 OCR 识别' : '浏览器 OCR 识别'
    // OCR adapters process page images internally today, so this is a stage-level signal.
    // It keeps the UI honest while still showing where long scanned PDFs are spending time.
    emitProgress(onProgress, { percent: 66, status: ocrLabel })
    const ocrText = (
      useRemoteOcr
        ? await extractRemotePdfOcrText(input.bytes, recognitionSettings.ocr)
        : await extractPdfOcrText(input.bytes, recognitionSettings.ocr.language)
    ).trim()
    emitProgress(onProgress, { percent: 70, status: `${ocrLabel}完成` })

    if (!ocrText) {
      return {
        ...outcome,
        warnings: [...outcome.warnings, '文字识别已完成，但未识别到文本。'],
      }
    }

    const text = [outcome.text, ocrText].filter(Boolean).join('\n\n')
    return {
      ...outcome,
      text,
      parseEngine: `${outcome.parseEngine}+${useRemoteOcr ? 'remote-ocr' : 'tesseract.js'}`,
      warnings: [...outcome.warnings, '已使用文字识别文本进行事件提取。'],
      requiresOcr: false,
    }
  } catch (error) {
    return {
      ...outcome,
      warnings: [...outcome.warnings, `文字识别失败：${errorMessage(error, '未知错误')}`],
    }
  }
}

async function applyAiIfEnabled(
  outcome: ParseOutcome,
  localEvents: CalendarEvent[],
  recognitionSettings: RecognitionSettings,
  extractAiEventsFromText: ExtractAiEventsFromTextFn,
): Promise<{ outcome: ParseOutcome; events: CalendarEvent[] }> {
  if (!recognitionSettings.ai.enabled) {
    return { outcome, events: localEvents }
  }

  if (!aiSettingsAreComplete(recognitionSettings)) {
    return {
      outcome: {
        ...outcome,
        warnings: [...outcome.warnings, 'AI 增强识别未运行：请填写接口地址、模型和 API Key。'],
      },
      events: localEvents,
    }
  }

  try {
    const aiEvents = await extractAiEventsFromText(outcome.text, recognitionSettings.ai)
    if (aiEvents.length === 0) {
      return {
        outcome: {
          ...outcome,
          warnings: [...outcome.warnings, 'AI 增强识别未返回可用事件。'],
        },
        events: localEvents,
      }
    }

    return {
      outcome: {
        ...outcome,
        parseEngine: `${outcome.parseEngine}+ai`,
        warnings: [...outcome.warnings, 'AI 增强识别已合并到结果中。'],
      },
      events: mergeEvents(localEvents, aiEvents),
    }
  } catch (error) {
    return {
      outcome: {
        ...outcome,
        warnings: [...outcome.warnings, `AI 增强识别失败：${errorMessage(error, '未知错误')}`],
      },
      events: localEvents,
    }
  }
}

export async function parseDocumentToEvents(
  input: ParseDocumentInput,
  options: ParsePipelineOptions = {},
): Promise<ParseWorkerResponse> {
  const parseDocument = options.parseDocument ?? defaultParseDocument
  const extractPdfOcrText = options.extractPdfOcrText ?? ocrPdfBytes
  const extractRemotePdfOcrText = options.extractRemotePdfOcrText ?? remoteOcrPdfBytes
  const extractAiEventsFromText = options.extractAiEventsFromText ?? defaultExtractAiEventsFromText
  const recognitionSettings = withDefaultRecognitionSettings(options.recognitionSettings)
  const onProgress = options.onProgress

  try {
    emitProgress(onProgress, { percent: 12, status: '准备解析文档' })
    const outcome = await parseDocument(input, { onProgress })
    emitProgress(onProgress, { percent: 62, status: '检查 OCR 需求' })
    const outcomeWithOcr = await applyPdfOcrIfNeeded(
      input,
      outcome,
      recognitionSettings,
      extractPdfOcrText,
      extractRemotePdfOcrText,
      onProgress,
    )
    emitProgress(onProgress, { percent: 72, status: '隐私脱敏' })
    const redactedOutcome = applyPrivacyRedaction(outcomeWithOcr)
    emitProgress(onProgress, { percent: 82, status: '抽取日程' })
    const localEvents = buildEvents(redactedOutcome.text)
    emitProgress(onProgress, { percent: recognitionSettings.ai.enabled ? 88 : 94, status: '合并识别结果' })
    const enhanced = await applyAiIfEnabled(
      redactedOutcome,
      localEvents,
      recognitionSettings,
      extractAiEventsFromText,
    )
    emitProgress(onProgress, { percent: 100, status: '解析完成' })

    return {
      ok: true,
      outcome: enhanced.outcome,
      events: enhanced.events,
    }
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, '文件解析失败'),
    }
  }
}
