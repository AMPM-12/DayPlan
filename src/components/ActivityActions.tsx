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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {formatClock(item.start)} – {formatClock(item.end)}
        </p>
        {activity.notes && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activity.notes}</p>
        )}
      </div>

      {activity.isFlexible && activity.flexOptions && activity.flexOptions.length > 0 && (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Pick something for this block
          </p>
          <ul className="space-y-1.5">
            {activity.flexOptions.map((opt) => (
              <li key={opt.id} className="text-sm text-slate-600 dark:text-slate-400">
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
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3.5 text-left font-medium text-emerald-900 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm text-white">
            {completed ? '↺' : '✓'}
          </span>
          {completed ? 'Mark as not complete' : 'Mark complete'}
        </button>

        <button
          type="button"
          onClick={onStartNow}
          className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3.5 text-left font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100"
        >
          <span>▶</span>
          Start this now
        </button>

        <button
          type="button"
          onClick={onLog}
          className="flex w-full items-center gap-3 rounded-2xl bg-indigo-600 px-4 py-3.5 text-left font-medium text-white"
        >
          <span>📝</span>
          Log this block
        </button>
      </div>
    </div>
  )
}
