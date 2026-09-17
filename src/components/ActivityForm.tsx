import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Activity, CategoryId, FlexOption } from '../types'
import { CATEGORIES, CATEGORY_ICONS } from '../data/categories'

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
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Title
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Study Book of Mormon"
          autoFocus={!initial}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
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
        <label className="block flex-1">
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            Duration (min)
          </span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
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
                ? 'bg-sage text-white'
                : 'bg-charcoal/5 text-charcoal'
            }`}
          >
            {d < 60 ? `${d}m` : `${d / 60}h`}
          </button>
        ))}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Category <span className="font-normal text-muted">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              !category
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-charcoal/5 text-charcoal'
            }`}
          >
            None
          </button>
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  category === c.id
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-charcoal/5 text-charcoal'
                }`}
              >
                <Icon width={14} height={14} aria-hidden />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Notes <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>

      <button
        type="button"
        onClick={() => setIsFlexible((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
          isFlexible
            ? 'border-sage bg-sage/10'
            : 'border-muted/30'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            isFlexible ? 'bg-sage text-white' : 'bg-charcoal/10'
          }`}
        >
          {isFlexible ? '✓' : ''}
        </span>
        <div>
          <p className="font-medium text-charcoal">Flexible block</p>
          <p className="text-sm text-muted">
            Offer a few options instead of one fixed task
          </p>
        </div>
      </button>

      {isFlexible && (
        <div className="space-y-2">
          {flexOptions.map((opt) => (
            <div
              key={opt.id}
              className="flex items-center gap-2 rounded-xl bg-charcoal/5 px-3 py-2"
            >
              <span className="flex-1 text-sm text-charcoal">
                {opt.label}
              </span>
              <button
                type="button"
                onClick={() => setFlexOptions((opts) => opts.filter((o) => o.id !== opt.id))}
                className="text-muted"
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
              className="flex-1 rounded-xl border border-muted/30 bg-cream px-4 py-2.5 text-base text-charcoal"
            />
            <button
              type="button"
              onClick={addOption}
              className="rounded-xl bg-charcoal/5 px-4 py-2.5 text-sm font-medium text-charcoal"
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
            ? 'border-sage bg-sage/10'
            : 'border-muted/30'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            isFocusSession ? 'bg-sage text-white' : 'bg-charcoal/10'
          }`}
        >
          {isFocusSession ? '✓' : ''}
        </span>
        <div>
          <p className="font-medium text-charcoal">Focus session</p>
          <p className="text-sm text-muted">
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
          Save
        </button>
      </div>
    </div>
  )
}
