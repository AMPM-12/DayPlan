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
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Start time
        </span>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
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
            className="w-20 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-indigo-50 p-4 text-center dark:bg-indigo-500/10">
        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          {enabledCount} practice{enabledCount === 1 ? '' : 's'}
          {durations.length > 0 && `, ${formatMinSec(durations[0])} each`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setCustomizing((v) => !v)}
        className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
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
          className="w-full rounded-xl bg-indigo-50 py-3 font-semibold text-indigo-700 disabled:opacity-40 dark:bg-indigo-500/10 dark:text-indigo-300"
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
          className="flex-1 rounded-xl bg-slate-100 py-3.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white disabled:opacity-40"
        >
          {initial ? 'Save' : 'Add to Schedule'}
        </button>
      </div>
    </div>
  )
}
