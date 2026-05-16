import { Link } from 'react-router-dom'
import { PreviewPanel } from '../components/PreviewPanel'
import { useAppStore } from '../store/appStore'

export default function Preview() {
  const outcome = useAppStore((state) => state.parseOutcome)
  const events = useAppStore((state) => state.events)

  return (
    <section className="page-grid">
      <PreviewPanel outcome={outcome} />

      <section className="panel">
        <h3>识别到的日程</h3>
        <p className="muted">已识别 {events.length} 个可能的日程事件。</p>

        <ul className="event-preview-list">
          {events.slice(0, 8).map((event) => (
            <li key={event.id}>
              <strong>{event.summary}</strong>
              <span>{new Date(event.start).toLocaleString()}</span>
            </li>
          ))}
        </ul>

        <Link to="/mapping" className="button-link">
          编辑映射和事件
        </Link>
      </section>
    </section>
  )
}
