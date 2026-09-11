import type { AwakenPracticeTemplate } from '../types'
import { formatMinSec } from '../utils/awaken'

export function AwakenPracticesEditor({
  practices,
  durations,
  onChange,
}: {
  practices: AwakenPracticeTemplate[]
  /** Live per-practice minutes for the currently enabled practices, in the same order as the enabled subset of `practices`. */
  durations: number[]
  onChange: (practices: AwakenPracticeTemplate[]) => void
}) {
  let enabledIndex = -1

  function setTitle(id: string, title: string) {
    onChange(practices.map((p) => (p.id === id ? { ...p, title } : p)))
  }

  function toggleEnabled(id: string) {
    onChange(practices.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
  }

  return (
    <div className="space-y-2">
      {practices.map((p) => {
        if (p.enabled) enabledIndex++
        const duration = p.enabled ? durations[enabledIndex] : undefined
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              p.enabled ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-slate-50/50 opacity-50 dark:bg-slate-800/30'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleEnabled(p.id)}
              aria-label={p.enabled ? 'Disable practice' : 'Enable practice'}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                p.enabled ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              {p.enabled ? '✓' : ''}
            </button>
            <input
              type="text"
              value={p.title}
              onChange={(e) => setTitle(p.id, e.target.value)}
              disabled={!p.enabled}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-700 focus:border-slate-200 focus:bg-white dark:text-slate-200 dark:focus:border-slate-700 dark:focus:bg-slate-800"
            />
            {duration !== undefined && (
              <span className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {formatMinSec(duration)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
