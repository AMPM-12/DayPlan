import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Activity, AwakenPracticeTemplate } from '../types'
import { DEFAULT_AWAKEN_PRACTICES, AWAKEN_DURATION_PRESETS } from '../data/awakenPractices'
import { previewAwakenDurations, formatMinSec } from '../utils/awaken'
import { AwakenPracticesEditor } from './AwakenPracticesEditor'

export function AwakenSetupForm({
  initial,
  onSave,
  onStartNow,
  onDelete,
  onCancel,
}: {
  initial?: Activity
  onSave: (activity: Activity) => void
  /** Only offered when creating a brand-new AWAKEN (no `initial`) — starts an ad-hoc session immediately instead of adding it to the schedule. */
  onStartNow?: (config: { title: string; durationMin: number; awakenPractices: AwakenPracticeTemplate[] }) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? 'AWAKEN')
  const [startTime, setStartTime] = useState(initial?.startTime ?? '06:00')
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 30)
  const [practices, setPractices] = useState<AwakenPracticeTemplate[]>(
    initial?.awakenPractices ?? DEFAULT_AWAKEN_PRACTICES,
  )
  const [customizing, setCustomizing] = useState(false)

  const enabledCount = practices.filter((p) => p.enabled).length
  const durations = previewAwakenDurations(practices, durationMin)
  const canSave = title.trim().length > 0 && durationMin > 0 && enabledCount > 0

  function handleSave() {
    if (!canSave) return
    onSave({
      id: initial?.id ?? uuid(),
      title: title.trim(),
      startTime,
      durationMin,
      isAwaken: true,
      isFocusSession: false,
      isFlexible: false,
      awakenPractices: practices,
    })
  }

  function handleStartNow() {
    if (!canSave || !onStartNow) return
    onStartNow({ title: title.trim(), durationMin, awakenPractices: practices })
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Start time
        </span>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Total duration
        </span>
        <div className="flex flex-wrap gap-2">
          {AWAKEN_DURATION_PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDurationMin(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                durationMin === d
                  ? 'bg-sage text-white'
                  : 'bg-charcoal/5 text-charcoal'
              }`}
            >
              {d} min
            </button>
          ))}
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-20 rounded-full border border-muted/30 bg-cream px-3 py-1.5 text-center text-xs text-charcoal"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-sage/10 p-4 text-center">
        <p className="text-sm font-medium text-sage">
          {enabledCount} practice{enabledCount === 1 ? '' : 's'}
          {durations.length > 0 && `, ${formatMinSec(durations[0])} each`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setCustomizing((v) => !v)}
        className="text-sm font-medium text-sage"
      >
        {customizing ? 'Hide practices ▴' : 'Customize practices ▾'}
      </button>

      {customizing && (
        <AwakenPracticesEditor practices={practices} durations={durations} onChange={setPractices} />
      )}
      {enabledCount === 0 && (
        <p className="text-sm text-red-600 dark:text-red-400">Enable at least one practice.</p>
      )}

      {onStartNow && (
        <button
          type="button"
          onClick={handleStartNow}
          disabled={!canSave}
          className="w-full rounded-xl bg-sage/10 py-3 font-semibold text-sage disabled:opacity-40"
        >
          ▶ Start Now
        </button>
      )}

      <div className="flex gap-3 pt-1">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-50 px-4 py-3.5 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-charcoal/5 py-3.5 font-medium text-charcoal"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 rounded-xl bg-sage py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {initial ? 'Save' : 'Add to Schedule'}
        </button>
      </div>
    </div>
  )
}
