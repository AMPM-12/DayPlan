import { useRef } from 'react'
import type { ScheduleItem } from '../utils/schedule'
import { formatClock, formatDuration } from '../utils/time'
import { CategoryDot } from './CategoryTag'

function TimelineRow({
  item,
  onTap,
  markerRef,
}: {
  item: ScheduleItem
  onTap: (item: ScheduleItem) => void
  markerRef?: (el: HTMLDivElement | null) => void
}) {
  const isPast = item.status === 'past'
  const isCurrent = item.status === 'current'

  return (
    <div ref={markerRef} className="flex gap-3">
      <div className="w-16 shrink-0 pt-3 text-right text-xs font-medium text-slate-400 dark:text-slate-500">
        {formatClock(item.start)}
      </div>
      <div className="relative flex flex-col items-center">
        <div
          className={`mt-3.5 h-2.5 w-2.5 rounded-full ${
            isCurrent ? 'ring-4 ring-indigo-200 dark:ring-indigo-500/30' : ''
          }`}
          style={{
            backgroundColor: isCurrent ? '#4f46e5' : isPast ? '#cbd5e1' : '#94a3b8',
          }}
        />
        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <button
        type="button"
        onClick={() => onTap(item)}
        className={`mb-3 flex-1 rounded-2xl px-4 py-3 text-left transition-colors ${
          isCurrent
            ? 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30'
            : 'bg-white ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5'
        } ${isPast ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center gap-2">
          <CategoryDot category={item.activity.category} />
          <p
            className={`truncate font-medium text-slate-800 dark:text-slate-100 ${
              item.completed ? 'line-through decoration-slate-400' : ''
            }`}
          >
            {item.activity.title}
          </p>
          {item.completed && <span className="text-emerald-500">✓</span>}
        </div>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {formatDuration(item.activity.durationMin)} · ends {formatClock(item.end)}
        </p>
      </button>
    </div>
  )
}

export function Timeline({
  items,
  onTap,
}: {
  items: ScheduleItem[]
  onTap: (item: ScheduleItem) => void
}) {
  const currentRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  function jumpToNow() {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const hasCurrent = items.some((i) => i.status === 'current')

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Today
        </h3>
        {hasCurrent && (
          <button
            type="button"
            onClick={jumpToNow}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
          >
            Jump to now
          </button>
        )}
      </div>
      <div ref={containerRef}>
        {items.map((item) => (
          <TimelineRow
            key={item.activity.id}
            item={item}
            onTap={onTap}
            markerRef={item.status === 'current' ? (el) => (currentRef.current = el) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
