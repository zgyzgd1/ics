import type { AiExtractionSettings, OcrSettings, RecognitionSettings } from '../types/app'

interface EnhancementPanelProps {
  settings: RecognitionSettings
  disabled?: boolean
  onOcrChange: (patch: Partial<OcrSettings>) => void
  onAiChange: (patch: Partial<AiExtractionSettings>) => void
}

export function EnhancementPanel({
  settings,
  disabled = false,
  onOcrChange,
  onAiChange,
}: EnhancementPanelProps) {
  const remoteOcrEnabled = settings.ocr.mode === 'remote'

  return (
    <section className="panel">
      <h3>增强识别</h3>

      <label>
        OCR 模式
        <select
          value={settings.ocr.mode}
          disabled={disabled}
          onChange={(event) => onOcrChange({ mode: event.target.value === 'remote' ? 'remote' : 'local' })}
        >
          <option value="local">浏览器 OCR</option>
          <option value="remote">HTTP OCR 服务</option>
        </select>
      </label>

      <label>
        OCR 语言
        <input
          value={settings.ocr.language}
          disabled={disabled}
          onChange={(event) => onOcrChange({ language: event.target.value })}
          placeholder="chi_sim+eng"
        />
      </label>

      {remoteOcrEnabled && (
        <label>
          OCR 服务地址
          <input
            value={settings.ocr.remoteEndpoint}
            disabled={disabled}
            onChange={(event) => onOcrChange({ remoteEndpoint: event.target.value })}
            placeholder="http://localhost:8000/ocr"
          />
        </label>
      )}

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.ai.enabled}
          disabled={disabled}
          onChange={(event) => onAiChange({ enabled: event.target.checked })}
        />
        AI 增强识别
      </label>

      {settings.ai.enabled && (
        <div className="settings-grid">
          <label>
            AI 接口地址
            <input
              value={settings.ai.baseUrl}
              disabled={disabled}
              onChange={(event) => onAiChange({ baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </label>

          <label>
            模型
            <input
              value={settings.ai.model}
              disabled={disabled}
              onChange={(event) => onAiChange({ model: event.target.value })}
              placeholder="gpt-4o-mini"
            />
          </label>

          <label>
            API Key
            <input
              type="password"
              value={settings.ai.apiKey}
              disabled={disabled}
              onChange={(event) => onAiChange({ apiKey: event.target.value })}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>
        </div>
      )}
    </section>
  )
}
