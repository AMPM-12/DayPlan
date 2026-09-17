import type { ScheduleItem } from '../utils/schedule'
import { formatClock } from '../utils/time'

export function ActivityActions({
  item,
  onStartNow,
  onToggleComplete,
  onLog,
}: {
  item: ScheduleItem
  onStartNow: () => void
  onToggleComplete: () => void
  onLog: () => void
}) {
  const { activity, completed } = item

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-sm text-muted">
          {formatClock(item.start)} – {formatClock(item.end)}
        </p>
        {activity.notes && (
          <p className="mt-1 text-sm text-muted">{activity.notes}</p>
        )}
      </div>

      {activity.isFlexible && activity.flexOptions && activity.flexOptions.length > 0 && (
        <div className="rounded-2xl bg-charcoal/5 p-4">
          <p className="mb-2 text-sm font-medium text-charcoal">
            Pick something for this block
          </p>
          <ul className="space-y-1.5">
            {activity.flexOptions.map((opt) => (
              <li key={opt.id} className="text-sm text-charcoal">
                • {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onToggleComplete}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-sage bg-sage/10 px-4 py-3.5 text-left font-medium text-sage transition-colors hover:bg-sage/20"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage text-sm text-white">
            {completed ? '↺' : '✓'}
          </span>
          {completed ? 'Mark as not complete' : 'Mark complete'}
        </button>

        <button
          type="button"
          onClick={onStartNow}
          className="flex w-full items-center gap-3 rounded-2xl bg-charcoal/5 px-4 py-3.5 text-left font-medium text-charcoal"
        >
          <span>▶</span>
          Start this now
        </button>

        <button
          type="button"
          onClick={onLog}
          className="flex w-full items-center gap-3 rounded-2xl bg-sage px-4 py-3.5 text-left font-medium text-white"
        >
          <span>📝</span>
          Log this block
        </button>
      </div>
    </div>
  )
}
