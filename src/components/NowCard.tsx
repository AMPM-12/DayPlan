import type { ScheduleItem } from '../utils/schedule'
import { formatClock, formatDuration } from '../utils/time'
import { IconTarget } from './icons/NavIcons'
import { IconSun } from './icons/CategoryIcons'

export function NowCard({
  item,
  nowMins,
  sessionNumbers,
  onTap,
  onOptions,
}: {
  item: ScheduleItem | undefined
  nowMins: number
  sessionNumbers: Map<string, number>
  onTap: (item: ScheduleItem) => void
  onOptions: (item: ScheduleItem) => void
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

  const total = item.end - item.start
  const elapsed = Math.min(Math.max(nowMins - item.start, 0), total)
  const percent = total > 0 ? (elapsed / total) * 100 : 0
  const remaining = Math.max(item.end - nowMins, 0)

  return (
    <div
      onClick={() => onTap(item)}
      className="w-full cursor-pointer rounded-3xl bg-cream p-6 text-left shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sage" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Now
        </span>
        {item.isShifted && (
          <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
            Shifted
          </span>
        )}
        <button
          type="button"
          aria-label="Block options"
          onClick={(e) => {
            e.stopPropagation()
            onOptions(item)
          }}
          className="ml-auto shrink-0 rounded-lg p-1.5 text-slate-400/70 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400"
        >
          ⋯
        </button>
      </div>

      {item.activity.isAwaken && (
        <p className="mb-0.5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <IconSun width={14} height={14} className="shrink-0" />
          AWAKEN
        </p>
      )}
      {item.activity.isFocusSession && (
        <p className="mb-0.5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <IconTarget width={14} height={14} className="shrink-0" />
          Session {sessionNumbers.get(item.activity.id) ?? '—'}
        </p>
      )}
      <h2 className="font-sans text-base font-medium leading-snug text-charcoal">
        {item.activity.title}
      </h2>

      <p className="mt-1 font-mono text-heading text-charcoal">
        {formatClock(item.start)} – {formatClock(item.end)}
      </p>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sage-light/20">
        <div
          className="h-full rounded-full bg-sage transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2.5 text-caption text-muted">
        {remaining > 0 ? `${formatDuration(remaining)} remaining` : 'Wrapping up'}
      </p>
    </div>
  )
}
