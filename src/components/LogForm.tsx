import { useState } from 'react'
import type { Activity, ActivityLog, DocketTask } from '../types'
import { RatingBar } from './RatingBar'
import { formatDuration } from '../utils/time'

const STATUS_LABEL: Record<DocketTask['status'], string> = {
  done: '✓',
  skipped: '⤫',
  planned: '—',
}

export function LogForm({
  activity,
  docket,
  initial,
  onSave,
  onCancel,
}: {
  activity: Activity
  docket?: DocketTask[]
  /** An existing log to pre-fill from, when reopening one for editing. */
  initial?: ActivityLog
  onSave: (log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>) => void
  onCancel: () => void
}) {
  const isFocusSession = !!activity.isFocusSession
  const [completedAsPlanned, setCompletedAsPlanned] = useState(initial?.completedAsPlanned ?? true)
  const [intendedMinutesSpent, setIntendedMinutesSpent] = useState(
    initial?.intendedMinutesSpent ?? activity.durationMin,
  )
  const [actualActivityTitle, setActualActivityTitle] = useState(initial?.actualActivityTitle ?? '')
  const [actualMinutesSpent, setActualMinutesSpent] = useState(
    initial?.actualMinutesSpent ?? activity.durationMin,
  )
  const [rating, setRating] = useState<number | undefined>(initial?.rating)
  const [productivityScore, setProductivityScore] = useState<number | undefined>(
    initial?.productivityScore,
  )
  const [disciplineScore, setDisciplineScore] = useState<number | undefined>(initial?.disciplineScore)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSave() {
    onSave({
      activityId: activity.id,
      activityTitle: activity.title,
      completedAsPlanned,
      intendedMinutesSpent,
      actualActivityTitle: completedAsPlanned ? undefined : actualActivityTitle || undefined,
      actualMinutesSpent,
      rating: isFocusSession ? undefined : rating,
      productivityScore: isFocusSession ? productivityScore : undefined,
      disciplineScore: isFocusSession ? disciplineScore : undefined,
      notes: notes || undefined,
    })
  }

  return (
    <div className="space-y-5">
      {isFocusSession && docket && docket.length > 0 && (
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Docket</p>
          <ul className="space-y-1.5">
            {docket.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <span className="min-w-0 truncate">
                  {STATUS_LABEL[task.status]} {task.title}
                </span>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {typeof task.actualMinutes === 'number'
                    ? formatDuration(task.actualMinutes)
                    : formatDuration(task.plannedMinutes) + ' planned'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setCompletedAsPlanned((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
          completedAsPlanned
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            completedAsPlanned ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          {completedAsPlanned ? '✓' : ''}
        </span>
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            Completed as planned
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tap off if you spent time differently
          </p>
        </div>
      </button>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Minutes spent on the intended activity
        </span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={intendedMinutesSpent}
          onChange={(e) => setIntendedMinutesSpent(Number(e.target.value))}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      {!completedAsPlanned && (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              What did you actually spend time on?
            </span>
            <input
              type="text"
              value={actualActivityTitle}
              onChange={(e) => setActualActivityTitle(e.target.value)}
              placeholder="e.g. Answering emails"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Minutes spent on that instead
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={actualMinutesSpent}
              onChange={(e) => setActualMinutesSpent(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </>
      )}

      {isFocusSession ? (
        <>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Productivity
            </span>
            <RatingBar min={1} max={10} value={productivityScore} onChange={setProductivityScore} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Discipline
            </span>
            <RatingBar min={1} max={10} value={disciplineScore} onChange={setDisciplineScore} />
          </div>
        </>
      ) : (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Honest rating — how do you feel about this block?
          </span>
          <RatingBar value={rating} onChange={setRating} />
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <div className="flex gap-3 pt-1">
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
          className="flex-1 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white"
        >
          {initial ? 'Save changes' : 'Save log'}
        </button>
      </div>
    </div>
  )
}
