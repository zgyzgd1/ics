import { TIMEZONE_OPTIONS } from '../utils/timezoneOptions'

interface ExportPanelProps {
  calendarName: string
  timezone: string
  exportFilename: string
  icsContent: string
  isGenerating: boolean
  onCalendarNameChange: (value: string) => void
  onTimezoneChange: (value: string) => void
  onExportFilenameChange: (value: string) => void
  onGenerate: () => void
  onCopy: () => void
  onDownload: () => void
  onShare: () => void
}

export function ExportPanel({
  calendarName,
  timezone,
  exportFilename,
  icsContent,
  isGenerating,
  onCalendarNameChange,
  onTimezoneChange,
  onExportFilenameChange,
  onGenerate,
  onCopy,
  onDownload,
  onShare,
}: ExportPanelProps) {
  return (
    <section className="panel">
      <h3>导出</h3>

      <label>
        日历名称
        <input value={calendarName} onChange={(e) => onCalendarNameChange(e.target.value)} />
      </label>

      <label>
        时区
        <select value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
          {TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      <label>
        日历文件名
        <input value={exportFilename} onChange={(e) => onExportFilenameChange(e.target.value)} />
      </label>

      <div className="inline-group">
        <button type="button" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? '正在生成...' : '生成日历文件'}
        </button>
        <button type="button" onClick={onCopy} disabled={!icsContent}>
          复制
        </button>
        <button type="button" onClick={onDownload} disabled={!icsContent}>
          下载
        </button>
        <button type="button" onClick={onShare} disabled={!icsContent}>
          分享
        </button>
      </div>

      <textarea
        className="ics-preview"
        value={icsContent}
        readOnly
        placeholder="生成后的日历内容会显示在这里"
      />
    </section>
  )
}
