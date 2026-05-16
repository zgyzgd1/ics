import { addHours } from 'date-fns'
import { MappingPanel } from '../components/MappingPanel'
import { EventTable } from '../components/EventTable'
import { useAppStore } from '../store/appStore'

export default function Mapping() {
  const events = useAppStore((state) => state.events)
  const summaryPrefix = useAppStore((state) => state.summaryPrefix)
  const timezone = useAppStore((state) => state.timezone)
  const setSummaryPrefix = useAppStore((state) => state.setSummaryPrefix)
  const setTimezone = useAppStore((state) => state.setTimezone)
  const applySummaryPrefix = useAppStore((state) => state.applySummaryPrefix)
  const updateEvent = useAppStore((state) => state.updateEvent)
  const removeEvent = useAppStore((state) => state.removeEvent)
  const addEvent = useAppStore((state) => state.addEvent)

  function handleAddEvent() {
    const start = new Date()
    const end = addHours(start, 1)

    addEvent({
      id: `${Date.now()}-manual`,
      summary: '手动添加的日程',
      start: start.toISOString(),
      end: end.toISOString(),
      description: '在映射页面手动添加。',
    })
  }

  return (
    <section className="page-grid">
      <MappingPanel
        summaryPrefix={summaryPrefix}
        timezone={timezone}
        onSummaryPrefixChange={setSummaryPrefix}
        onApplySummaryPrefix={applySummaryPrefix}
        onTimezoneChange={setTimezone}
      />

      <section className="panel">
        <div className="inline-group">
          <h3>事件编辑</h3>
          <button type="button" onClick={handleAddEvent}>
            添加事件
          </button>
        </div>

        <EventTable events={events} onUpdate={updateEvent} onRemove={removeEvent} />
      </section>
    </section>
  )
}
