import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Activity, CategoryId, FlexOption } from '../types'
import { CATEGORIES } from '../data/categories'

const DURATION_PRESETS = [5, 10, 15, 30, 45, 60, 90, 120]

export function ActivityForm({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial?: Activity
  onSave: (activity: Activity) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00')
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 30)
  const [category, setCategory] = useState<CategoryId | undefined>(initial?.category)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [isFlexible, setIsFlexible] = useState(initial?.isFlexible ?? false)
  const [flexOptions, setFlexOptions] = useState<FlexOption[]>(initial?.flexOptions ?? [])
  const [newOption, setNewOption] = useState('')
  const [isFocusSession, setIsFocusSession] = useState(initial?.isFocusSession ?? false)

  const canSave = title.trim().length > 0 && durationMin > 0

  function handleSave() {
    if (!canSave) return
    onSave({
      id: initial?.id ?? uuid(),
      title: title.trim(),
      startTime,
      durationMin,
      category,
      notes: notes || undefined,
      isFlexible,
      flexOptions: isFlexible ? flexOptions : undefined,
      isFocusSession,
    })
  }

  function addOption() {
    if (!newOption.trim()) return
    setFlexOptions((opts) => [...opts, { id: uuid(), label: newOption.trim() }])
    setNewOption('')
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
          placeholder="e.g. Study Book of Mormon"
          autoFocus={!initial}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
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
        <label className="block flex-1">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Duration (min)
          </span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((d) => (
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
            {d < 60 ? `${d}m` : `${d / 60}h`}
          </button>
        ))}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Category <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              !category
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            None
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: category === c.id ? c.color : `${c.color}1a`,
                color: category === c.id ? 'white' : c.color,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <button
        type="button"
        onClick={() => setIsFlexible((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
          isFlexible
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            isFlexible ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          {isFlexible ? '✓' : ''}
        </span>
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Flexible block</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Offer a few options instead of one fixed task
          </p>
        </div>
      </button>

      {isFlexible && (
        <div className="space-y-2">
          {flexOptions.map((opt) => (
            <div
              key={opt.id}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
            >
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                {opt.label}
              </span>
              <button
                type="button"
                onClick={() => setFlexOptions((opts) => opts.filter((o) => o.id !== opt.id))}
                className="text-slate-400"
                aria-label="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addOption()
                }
              }}
              placeholder="Add an option"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={addOption}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsFocusSession((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
          isFocusSession
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            isFocusSession ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          {isFocusSession ? '✓' : ''}
        </span>
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Focus session</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Adds a task docket and Productivity/Discipline scores in Focus Sessions
          </p>
        </div>
      </button>

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
          Save
        </button>
      </div>
    </div>
  )
}
