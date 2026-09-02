import type { ScheduleItem } from '../utils/schedule'
import { formatClock, formatDuration } from '../utils/time'
import { CategoryDot } from './CategoryTag'

export function UpNextList({
  items,
  nowMins,
  onTap,
}: {
  items: ScheduleItem[]
  nowMins: number
  onTap: (item: ScheduleItem) => void
}) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Up next
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.activity.id}
            type="button"
            onClick={() => onTap(item)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/60 dark:ring-white/10"
          >
            <CategoryDot category={item.activity.category} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                {item.activity.title}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {formatClock(item.start)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
              in {formatDuration(item.start - nowMins)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
