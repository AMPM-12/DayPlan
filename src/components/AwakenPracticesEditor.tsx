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

  function setPrompt(id: string, prompt: string) {
    onChange(practices.map((p) => (p.id === id ? { ...p, prompt } : p)))
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
              p.enabled ? 'bg-charcoal/5' : 'bg-charcoal/5 opacity-50'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleEnabled(p.id)}
              aria-label={p.enabled ? 'Disable practice' : 'Enable practice'}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                p.enabled ? 'bg-sage text-white' : 'bg-charcoal/10'
              }`}
            >
              {p.enabled ? '✓' : ''}
            </button>
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={p.title}
                onChange={(e) => setTitle(p.id, e.target.value)}
                disabled={!p.enabled}
                className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-charcoal focus:border-muted/30 focus:bg-cream"
              />
              <input
                type="text"
                value={p.prompt ?? ''}
                onChange={(e) => setPrompt(p.id, e.target.value)}
                disabled={!p.enabled}
                placeholder="Reminder (optional)"
                className="w-full truncate rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-xs text-muted focus:border-muted/30 focus:bg-cream focus:text-charcoal"
              />
            </div>
            {duration !== undefined && (
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatMinSec(duration)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
