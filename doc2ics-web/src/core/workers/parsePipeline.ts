import type {
  AiExtractionSettings,
  CalendarEvent,
  OcrSettings,
  ParseOutcome,
  ParseWorkerResponse,
  RecognitionSettings,
} from '../../types/app'
import { extractAiEventsFromText as defaultExtractAiEventsFromText } from '../ai/aiEventExtractor'
import { createFallbackEvent, extractEventsFromText } from '../extractor/eventExtractor'
import { remoteOcrPdfBytes } from '../ocr/remoteOCR'
import { ocrPdfBytes } from '../ocr/tesseractOCR'
import { parseDocument as defaultParseDocument, type ParseDocumentInput } from '../parsers/parseDocument'
import { aiSettingsAreComplete, withDefaultRecognitionSettings } from '../recognition/settings'

type ParseDocumentFn = (input: ParseDocumentInput) => Promise<ParseOutcome>
type ExtractPdfOcrTextFn = (bytes: Uint8Array, language?: string) => Promise<string>
type ExtractRemotePdfOcrTextFn = (bytes: Uint8Array, settings: OcrSettings) => Promise<string>
type ExtractAiEventsFromTextFn = (text: string, settings: AiExtractionSettings) => Promise<CalendarEvent[]>

interface ParsePipelineOptions {
  parseDocument?: ParseDocumentFn
  extractPdfOcrText?: ExtractPdfOcrTextFn
  extractRemotePdfOcrText?: ExtractRemotePdfOcrTextFn
  extractAiEventsFromText?: ExtractAiEventsFromTextFn
  recognitionSettings?: RecognitionSettings
}

function buildEvents(text: string): CalendarEvent[] {
  const extracted = extractEventsFromText(text)
  return extracted.length > 0 ? extracted : [createFallbackEvent()]
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

async function applyPdfOcrIfNeeded(
  input: ParseDocumentInput,
  outcome: ParseOutcome,
  recognitionSettings: RecognitionSettings,
  extractPdfOcrText: ExtractPdfOcrTextFn,
  extractRemotePdfOcrText: ExtractRemotePdfOcrTextFn,
): Promise<ParseOutcome> {
  if (outcome.fileKind !== 'pdf' || !outcome.requiresOcr) {
    return outcome
  }

  try {
    const useRemoteOcr = recognitionSettings.ocr.mode === 'remote' && recognitionSettings.ocr.remoteEndpoint.trim()
    const ocrText = (
      useRemoteOcr
        ? await extractRemotePdfOcrText(input.bytes, recognitionSettings.ocr)
        : await extractPdfOcrText(input.bytes, recognitionSettings.ocr.language)
    ).trim()

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

  try {
    const outcome = await parseDocument(input)
    const outcomeWithOcr = await applyPdfOcrIfNeeded(
      input,
      outcome,
      recognitionSettings,
      extractPdfOcrText,
      extractRemotePdfOcrText,
    )
    const localEvents = buildEvents(outcomeWithOcr.text)
    const enhanced = await applyAiIfEnabled(
      outcomeWithOcr,
      localEvents,
      recognitionSettings,
      extractAiEventsFromText,
    )

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
