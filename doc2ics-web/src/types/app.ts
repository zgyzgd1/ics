export type SupportedFileKind = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'unknown'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: string
  end?: string
  eventType?: 'general' | 'course' | 'email' | 'calendar'
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval?: number
    count?: number
    until?: string
    byDay?: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'>
  }
  reminders?: number[]
  organizer?: string
  attendees?: string[]
  sourceEmail?: string
  course?: {
    name?: string
    teacher?: string
    classroom?: string
    weeks?: string
  }
  sourceText?: string
  confidence?: number
}

export type OcrMode = 'local' | 'remote'

export interface OcrSettings {
  mode: OcrMode
  language: string
  remoteEndpoint: string
}

export interface AiExtractionSettings {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
}

export interface RecognitionSettings {
  ocr: OcrSettings
  ai: AiExtractionSettings
}

export interface ParseOutcome {
  text: string
  fileKind: SupportedFileKind
  parseEngine: string
  warnings: string[]
  requiresOcr: boolean
}

export interface ParseProgress {
  percent: number
  status: string
  detail?: string
}

export interface ParseWorkerSuccess {
  ok: true
  outcome: ParseOutcome
  events: CalendarEvent[]
}

export interface ParseWorkerFailure {
  ok: false
  error: string
}

export type ParseWorkerResponse = ParseWorkerSuccess | ParseWorkerFailure

export interface IcsBuildOptions {
  calendarName: string
  timezone: string
}
