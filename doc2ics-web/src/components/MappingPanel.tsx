import { useEffect, useState } from 'react'
import { listMappingTemplates, saveMappingTemplate, type MappingTemplate } from '../utils/db'
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from '../utils/timezoneOptions'

interface MappingPanelProps {
  summaryPrefix: string
  timezone: string
  onSummaryPrefixChange: (value: string) => void
  onApplySummaryPrefix: () => void
  onTimezoneChange: (value: string) => void
}

export function MappingPanel({
  summaryPrefix,
  timezone,
  onSummaryPrefixChange,
  onApplySummaryPrefix,
  onTimezoneChange,
}: MappingPanelProps) {
  const [templates, setTemplates] = useState<MappingTemplate[]>([])
  const [templateName, setTemplateName] = useState('默认')
  const [status, setStatus] = useState('')

  useEffect(() => {
    listMappingTemplates().then(setTemplates)
  }, [])

  async function handleSaveTemplate() {
    const name = templateName.trim() || '默认'
    const template: MappingTemplate = {
      id: name.toLowerCase(),
      name,
      summaryPrefix,
      timezone,
    }

    try {
      await saveMappingTemplate(template)
      setTemplates(await listMappingTemplates())
      setStatus(`已保存预设：${name}`)
    } catch {
      setStatus('保存失败：浏览器存储不可用')
    }
  }

  function handleLoadTemplate(template: MappingTemplate) {
    onSummaryPrefixChange(template.summaryPrefix ?? '')
    onTimezoneChange(template.timezone ?? DEFAULT_TIMEZONE)
    setStatus(`已加载预设：${template.name}`)
  }

  return (
    <section className="panel">
      <h3>映射</h3>
      <p className="muted">使用前缀统一事件名称，并将常用配置保存在本地数据库。</p>

      <label>
        事件标题前缀
        <input
          type="text"
          value={summaryPrefix}
          onChange={(event) => onSummaryPrefixChange(event.target.value)}
          placeholder="项目名称"
        />
      </label>

      <button type="button" onClick={onApplySummaryPrefix}>
        应用到所有事件
      </button>

      <label>
        时区
        <select value={timezone} onChange={(event) => onTimezoneChange(event.target.value)}>
          {TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      <div className="inline-group">
        <input
          type="text"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          placeholder="预设名称"
        />
        <button type="button" onClick={handleSaveTemplate}>
          保存预设
        </button>
      </div>

      {templates.length > 0 && (
        <div>
          <p className="muted">已保存预设</p>
          <div className="tag-grid">
            {templates.map((template) => (
              <button key={template.id} type="button" onClick={() => handleLoadTemplate(template)}>
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {status && <p className="muted">{status}</p>}
    </section>
  )
}
