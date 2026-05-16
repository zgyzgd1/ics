import { create } from 'zustand'
import { defaultRecognitionSettings } from '../core/recognition/settings'
import { buildDefaultIcsFilename } from '../utils/fileUtils'
import type {
  AiExtractionSettings,
  CalendarEvent,
  OcrSettings,
  ParseOutcome,
  RecognitionSettings,
} from '../types/app'

type ParseStatus = 'idle' | 'parsing' | 'parsed' | 'error'

interface AppState {
  selectedFile: File | null
  parseStatus: ParseStatus
  parseOutcome: ParseOutcome | null
  events: CalendarEvent[]
  errorMessage: string | null
  timezone: string
  calendarName: string
  exportFilename: string
  icsContent: string
  summaryPrefix: string
  recognitionSettings: RecognitionSettings
  setFile: (file: File) => void
  startParsing: () => void
  finishParsing: (outcome: ParseOutcome, events: CalendarEvent[]) => void
  failParsing: (message: string) => void
  updateEvent: (eventId: string, patch: Partial<CalendarEvent>) => void
  removeEvent: (eventId: string) => void
  addEvent: (event: CalendarEvent) => void
  setTimezone: (timezone: string) => void
  setCalendarName: (name: string) => void
  setExportFilename: (name: string) => void
  setIcsContent: (content: string) => void
  setSummaryPrefix: (prefix: string) => void
  updateOcrSettings: (patch: Partial<OcrSettings>) => void
  updateAiSettings: (patch: Partial<AiExtractionSettings>) => void
  applySummaryPrefix: () => void
  reset: () => void
}

const defaultTimezone = 'Asia/Shanghai'

function cloneRecognitionSettings(): RecognitionSettings {
  return {
    ocr: { ...defaultRecognitionSettings.ocr },
    ai: { ...defaultRecognitionSettings.ai },
  }
}

function toPatchedSummary(summary: string, prefix: string): string {
  const cleaned = prefix.trim()
  if (!cleaned) return summary
  if (summary.startsWith(`${cleaned}: `)) return summary
  return `${cleaned}: ${summary}`
}

export const useAppStore = create<AppState>((set) => ({
  selectedFile: null,
  parseStatus: 'idle',
  parseOutcome: null,
  events: [],
  errorMessage: null,
  timezone: defaultTimezone,
  calendarName: 'Doc2ICS 导入日历',
  exportFilename: buildDefaultIcsFilename('日程'),
  icsContent: '',
  summaryPrefix: '',
  recognitionSettings: cloneRecognitionSettings(),

  setFile: (file) =>
    set(() => ({
      selectedFile: file,
      parseStatus: 'idle',
      parseOutcome: null,
      events: [],
      errorMessage: null,
      exportFilename: buildDefaultIcsFilename(file.name),
      icsContent: '',
    })),

  startParsing: () =>
    set(() => ({
      parseStatus: 'parsing',
      parseOutcome: null,
      errorMessage: null,
      events: [],
      icsContent: '',
    })),

  finishParsing: (outcome, events) =>
    set(() => ({
      parseStatus: 'parsed',
      parseOutcome: outcome,
      events,
      errorMessage: null,
      icsContent: '',
    })),

  failParsing: (message) =>
    set(() => ({
      parseStatus: 'error',
      parseOutcome: null,
      errorMessage: message,
      events: [],
      icsContent: '',
    })),

  updateEvent: (eventId, patch) =>
    set((state) => ({
      events: state.events.map((event) => (event.id === eventId ? { ...event, ...patch } : event)),
      icsContent: '',
    })),

  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
      icsContent: '',
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events],
      icsContent: '',
    })),

  setTimezone: (timezone) =>
    set(() => ({
      timezone,
      icsContent: '',
    })),

  setCalendarName: (calendarName) =>
    set(() => ({
      calendarName,
      icsContent: '',
    })),

  setExportFilename: (exportFilename) =>
    set(() => ({
      exportFilename,
    })),

  setIcsContent: (icsContent) =>
    set(() => ({
      icsContent,
    })),

  setSummaryPrefix: (summaryPrefix) =>
    set(() => ({
      summaryPrefix,
    })),

  updateOcrSettings: (patch) =>
    set((state) => ({
      recognitionSettings: {
        ...state.recognitionSettings,
        ocr: {
          ...state.recognitionSettings.ocr,
          ...patch,
        },
      },
    })),

  updateAiSettings: (patch) =>
    set((state) => ({
      recognitionSettings: {
        ...state.recognitionSettings,
        ai: {
          ...state.recognitionSettings.ai,
          ...patch,
        },
      },
    })),

  applySummaryPrefix: () =>
    set((state) => ({
      events: state.events.map((event) => ({
        ...event,
        summary: toPatchedSummary(event.summary, state.summaryPrefix),
      })),
      icsContent: '',
    })),

  reset: () =>
    set(() => ({
      selectedFile: null,
      parseStatus: 'idle',
      parseOutcome: null,
      events: [],
      errorMessage: null,
      timezone: defaultTimezone,
      calendarName: 'Doc2ICS 导入日历',
      exportFilename: buildDefaultIcsFilename('日程'),
      icsContent: '',
      summaryPrefix: '',
      recognitionSettings: cloneRecognitionSettings(),
    })),
}))
