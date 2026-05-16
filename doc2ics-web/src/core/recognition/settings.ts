import type { RecognitionSettings } from '../../types/app'

export const defaultRecognitionSettings: RecognitionSettings = {
  ocr: {
    mode: 'local',
    language: 'chi_sim+eng',
    remoteEndpoint: '',
  },
  ai: {
    enabled: false,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: '',
  },
}

export function withDefaultRecognitionSettings(settings?: RecognitionSettings): RecognitionSettings {
  return {
    ocr: {
      ...defaultRecognitionSettings.ocr,
      ...settings?.ocr,
    },
    ai: {
      ...defaultRecognitionSettings.ai,
      ...settings?.ai,
    },
  }
}

export function aiSettingsAreComplete(settings: RecognitionSettings): boolean {
  return Boolean(settings.ai.enabled && settings.ai.baseUrl.trim() && settings.ai.apiKey.trim() && settings.ai.model.trim())
}
