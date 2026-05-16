import type { ParseOutcome } from '../types/app'

interface PreviewPanelProps {
  outcome: ParseOutcome | null
}

export function PreviewPanel({ outcome }: PreviewPanelProps) {
  if (!outcome) {
    return (
      <section className="panel">
        <h3>预览</h3>
        <p>暂无解析内容。</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h3>预览</h3>
      <p className="muted">
        解析器：<strong>{outcome.parseEngine}</strong> | 类型：<strong>{outcome.fileKind}</strong>
      </p>
      {outcome.warnings.length > 0 && (
        <ul className="warnings">
          {outcome.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <pre className="preview-text">{outcome.text.slice(0, 6000) || '未提取到文本。'}</pre>
    </section>
  )
}
