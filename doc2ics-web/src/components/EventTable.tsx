import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import type { CalendarEvent } from '../types/app'
import { parseDateTime, toInputDateTime } from '../utils/dateUtils'

interface EventTableProps {
  events: CalendarEvent[]
  onUpdate: (eventId: string, patch: Partial<CalendarEvent>) => void
  onRemove: (eventId: string) => void
}

function formatNumberList(values?: number[]): string {
  return values?.join(', ') ?? ''
}

function parseNumberList(value: string): number[] {
  return value
    .split(/[,，\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function formatStringList(values?: string[]): string {
  return values?.join(', ') ?? ''
}

function parseStringList(value: string): string[] {
  return value
    .split(/[,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

interface EventCardProps {
  event: CalendarEvent
  onUpdate: (eventId: string, patch: Partial<CalendarEvent>) => void
  onRemove: (eventId: string) => void
}

const EventCard = memo(function EventCard({ event, onUpdate, onRemove }: EventCardProps) {
  const start = toInputDateTime(new Date(event.start))
  const end = toInputDateTime(new Date(event.end ?? event.start))

  return (
    <article className="event-card">
      <label>
        标题
        <input
          value={event.summary}
          onChange={(e) => onUpdate(event.id, { summary: e.target.value })}
        />
      </label>

      <label>
        地点
        <input
          value={event.location ?? ''}
          onChange={(e) => onUpdate(event.id, { location: e.target.value })}
        />
      </label>

      <label>
        日程类型
        <select
          value={event.eventType ?? 'general'}
          onChange={(e) =>
            onUpdate(event.id, {
              eventType: e.target.value as CalendarEvent['eventType'],
            })
          }
        >
          <option value="general">普通日程</option>
          <option value="course">课程表</option>
          <option value="calendar">日历日程</option>
          <option value="email">邮箱日程</option>
        </select>
      </label>

      <label>
        开始时间
        <input
          type="datetime-local"
          value={start}
          onChange={(e) =>
            onUpdate(event.id, {
              start: parseDateTime(e.target.value).toISOString(),
            })
          }
        />
      </label>

      <label>
        结束时间
        <input
          type="datetime-local"
          value={end}
          onChange={(e) =>
            onUpdate(event.id, {
              end: parseDateTime(e.target.value).toISOString(),
            })
          }
        />
      </label>

      <label>
        描述
        <textarea
          value={event.description ?? ''}
          onChange={(e) => onUpdate(event.id, { description: e.target.value })}
        />
      </label>

      <label>
        提醒时间（分钟，可填多个）
        <input
          value={formatNumberList(event.reminders)}
          placeholder="15, 5"
          onChange={(e) => onUpdate(event.id, { reminders: parseNumberList(e.target.value) })}
        />
      </label>

      {event.eventType === 'course' && (
        <>
          <label>
            周重复次数
            <input
              type="number"
              min="1"
              value={event.recurrence?.count ?? ''}
              placeholder="16"
              onChange={(e) =>
                onUpdate(event.id, {
                  recurrence: {
                    ...event.recurrence,
                    frequency: 'weekly',
                    count: Number(e.target.value) || undefined,
                  },
                })
              }
            />
          </label>

          <label>
            任课教师
            <input
              value={event.course?.teacher ?? ''}
              onChange={(e) =>
                onUpdate(event.id, {
                  course: {
                    ...event.course,
                    teacher: e.target.value,
                  },
                })
              }
            />
          </label>

          <label>
            上课周次
            <input
              value={event.course?.weeks ?? ''}
              placeholder="1-16 周"
              onChange={(e) =>
                onUpdate(event.id, {
                  course: {
                    ...event.course,
                    weeks: e.target.value,
                  },
                })
              }
            />
          </label>
        </>
      )}

      {(event.eventType === 'email' || event.eventType === 'calendar') && (
        <>
          <label>
            组织者
            <input
              value={event.organizer ?? ''}
              placeholder="姓名 <name@example.com>"
              onChange={(e) => onUpdate(event.id, { organizer: e.target.value })}
            />
          </label>

          <label>
            参会人
            <input
              value={formatStringList(event.attendees)}
              placeholder="姓名 <name@example.com>, 另一位 <other@example.com>"
              onChange={(e) => onUpdate(event.id, { attendees: parseStringList(e.target.value) })}
            />
          </label>

          <label>
            来源邮箱
            <input
              value={event.sourceEmail ?? ''}
              placeholder="sender@example.com"
              onChange={(e) => onUpdate(event.id, { sourceEmail: e.target.value })}
            />
          </label>
        </>
      )}

      <button type="button" className="danger" onClick={() => onRemove(event.id)} aria-label={`删除事件 ${event.summary}`}>
        <Trash2 size={14} /> 删除
      </button>
    </article>
  )
})

export function EventTable({ events, onUpdate, onRemove }: EventTableProps) {
  return (
    <section className="panel">
      <h3>事件（{events.length}）</h3>
      <div className="event-table">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
    </section>
  )
}
