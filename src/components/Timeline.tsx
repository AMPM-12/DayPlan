import { useRef } from 'react'
import type { ScheduleItem } from '../utils/schedule'
import { formatClock, formatDuration } from '../utils/time'
import { CategoryDot } from './CategoryTag'
import { IconTarget } from './icons/NavIcons'
import { IconSun } from './icons/CategoryIcons'

function TimelineRow({
  item,
  sessionNumbers,
  onTap,
  onOptions,
  markerRef,
}: {
  item: ScheduleItem
  sessionNumbers: Map<string, number>
  onTap: (item: ScheduleItem) => void
  onOptions: (item: ScheduleItem) => void
  markerRef?: (el: HTMLDivElement | null) => void
}) {
  const isPast = item.status === 'past'
  const isCurrent = item.status === 'current'

  return (
    <div ref={markerRef} className="flex gap-3">
      <div className="w-16 shrink-0 pt-3 text-right font-mono text-caption text-muted">
        {formatClock(item.start)}
      </div>
      <div className="relative flex flex-col items-center">
        <div
          className={`mt-3.5 h-2.5 w-2.5 rounded-full ${isCurrent ? 'ring-4 ring-sage/30' : ''}`}
          style={{
            backgroundColor: isCurrent
              ? 'var(--color-sage)'
              : isPast
                ? 'color-mix(in oklab, var(--color-muted) 50%, transparent)'
                : 'var(--color-muted)',
          }}
        />
        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <div
        onClick={() => onTap(item)}
        className={`mb-3 flex flex-1 items-start gap-2 rounded-2xl px-4 py-3 text-left transition-colors ${
          isCurrent ? 'bg-sage/10 ring-1 ring-sage/30' : 'bg-cream ring-1 ring-charcoal/5'
        } ${isPast ? 'opacity-50' : ''} cursor-pointer`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CategoryDot category={item.activity.category} />
            <p
              className={`font-sans font-medium text-charcoal ${
                item.completed ? 'line-through decoration-muted' : ''
              }`}
            >
              {item.activity.isAwaken && (
                <span className="mr-1 inline-flex items-center gap-1 text-caption text-muted">
                  <IconSun width={12} height={12} className="shrink-0" />
                  AWAKEN
                </span>
              )}
              {item.activity.isFocusSession && (
                <span className="mr-1 inline-flex items-center gap-1 text-caption text-muted">
                  <IconTarget width={12} height={12} className="shrink-0" />
                  Session {sessionNumbers.get(item.activity.id) ?? '—'}
                </span>
              )}
              {item.activity.title}
            </p>
            {item.completed && <span className="text-emerald-500">✓</span>}
          </div>
          <p className="mt-0.5 font-mono text-caption text-muted">
            {formatDuration(item.activity.durationMin)} · ends {formatClock(item.end)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Block options"
          onClick={(e) => {
            e.stopPropagation()
            onOptions(item)
          }}
          className="shrink-0 rounded-lg p-1.5 text-slate-300 dark:text-slate-600"
        >
          ⋯
        </button>
      </div>
    </div>
  )
}

export function Timeline({
  items,
  sessionNumbers,
  onTap,
  onOptions,
}: {
  items: ScheduleItem[]
  sessionNumbers: Map<string, number>
  onTap: (item: ScheduleItem) => void
  onOptions: (item: ScheduleItem) => void
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
        <h3 className="font-semibold uppercase tracking-wide text-caption text-muted">
          Today
        </h3>
        {hasCurrent && (
          <button
            type="button"
            onClick={jumpToNow}
            className="text-xs font-semibold text-sage"
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
            sessionNumbers={sessionNumbers}
            onTap={onTap}
            onOptions={onOptions}
            markerRef={item.status === 'current' ? (el) => (currentRef.current = el) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
