import { getCategory } from '../data/categories'
import type { ScheduleItem } from '../utils/schedule'
import { formatClock, formatDuration } from '../utils/time'

export function NowCard({
  item,
  nowMins,
  onTap,
}: {
  item: ScheduleItem | undefined
  nowMins: number
  onTap: (item: ScheduleItem) => void
}) {
  if (!item) {
    return (
      <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Nothing scheduled right now
        </p>
      </div>
    )
  }

  const cat = getCategory(item.activity.category)
  const total = item.end - item.start
  const elapsed = Math.min(Math.max(nowMins - item.start, 0), total)
  const percent = total > 0 ? (elapsed / total) * 100 : 0
  const remaining = Math.max(item.end - nowMins, 0)
  const accent = cat?.color ?? '#4f46e5'

  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      className="w-full rounded-3xl p-6 text-left shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10"
      style={{ backgroundColor: `${accent}14` }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Now
        </span>
        {item.isShifted && (
          <span className="ml-auto rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
            Shifted
          </span>
        )}
      </div>

      <h2 className="text-2xl font-semibold leading-snug text-slate-900 dark:text-slate-50">
        {item.activity.title}
      </h2>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {formatClock(item.start)} – {formatClock(item.end)}
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: accent }}
        />
      </div>

      <p className="mt-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        {remaining > 0 ? `${formatDuration(remaining)} remaining` : 'Wrapping up'}
      </p>
    </button>
  )
}
