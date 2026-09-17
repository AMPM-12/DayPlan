import { useState } from 'react'
import type { Activity, ActivityLog, DocketTask, PlanTask } from '../types'
import { RatingBar } from './RatingBar'
import { formatDuration } from '../utils/time'
import { resolveDocketTaskTitle } from '../utils/focusSessions'

const STATUS_LABEL: Record<DocketTask['status'], string> = {
  done: '✓',
  skipped: '⤫',
  planned: '—',
}

export function LogForm({
  activity,
  docket,
  planTasks,
  initial,
  onSave,
  onCancel,
}: {
  activity: Activity
  docket?: DocketTask[]
  /** Read-only — resolves a linked docket entry's live title. Only meaningful when docket is provided. */
  planTasks?: PlanTask[]
  /** An existing log to pre-fill from, when reopening one for editing. */
  initial?: ActivityLog
  /**
   * `updatedDocket` is passed whenever `docket` was provided — its task
   * list and order are always identical to `docket`, only `actualMinutes`
   * values may have changed. Only meaningful for focus-session logs.
   */
  onSave: (
    log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>,
    updatedDocket?: DocketTask[],
  ) => void
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
  // Only tasks that already have a recorded actualMinutes are editable here
  // — a never-run task's planned time isn't "a recorded value" to correct.
  const [taskMinutes, setTaskMinutes] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (docket ?? [])
        .filter((t) => typeof t.actualMinutes === 'number')
        .map((t) => [t.id, t.actualMinutes as number]),
    ),
  )

  function handleSave() {
    const updatedDocket = docket?.map((t) =>
      t.id in taskMinutes ? { ...t, actualMinutes: taskMinutes[t.id] } : t,
    )
    onSave(
      {
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
      },
      updatedDocket,
    )
  }

  return (
    <div className="space-y-5">
      {isFocusSession && docket && docket.length > 0 && (
        <div className="rounded-2xl bg-charcoal/5 p-4">
          <p className="mb-2 text-sm font-medium text-charcoal">Docket</p>
          <ul className="space-y-1.5">
            {docket.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 text-sm text-charcoal"
              >
                <span className="min-w-0 truncate">
                  {STATUS_LABEL[task.status]} {resolveDocketTaskTitle(task, planTasks ?? [])}
                </span>
                {task.id in taskMinutes ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={taskMinutes[task.id]}
                      onChange={(e) =>
                        setTaskMinutes((prev) => ({ ...prev, [task.id]: Number(e.target.value) }))
                      }
                      aria-label={`Actual minutes for ${resolveDocketTaskTitle(task, planTasks ?? [])}`}
                      className="w-14 rounded-lg border border-muted/30 bg-cream px-1.5 py-1 text-center text-charcoal"
                    />
                    min
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {formatDuration(task.plannedMinutes)} planned
                  </span>
                )}
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
            ? 'border-sage bg-sage/10'
            : 'border-muted/30'
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
            completedAsPlanned ? 'bg-sage text-white' : 'bg-charcoal/10'
          }`}
        >
          {completedAsPlanned ? '✓' : ''}
        </span>
        <div>
          <p className="font-medium text-charcoal">
            Completed as planned
          </p>
          <p className="text-sm text-muted">
            Tap off if you spent time differently
          </p>
        </div>
      </button>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Minutes spent on the intended activity
        </span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={intendedMinutesSpent}
          onChange={(e) => setIntendedMinutesSpent(Number(e.target.value))}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>

      {!completedAsPlanned && (
        <>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              What did you actually spend time on?
            </span>
            <input
              type="text"
              value={actualActivityTitle}
              onChange={(e) => setActualActivityTitle(e.target.value)}
              placeholder="e.g. Answering emails"
              className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              Minutes spent on that instead
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={actualMinutesSpent}
              onChange={(e) => setActualMinutesSpent(Number(e.target.value))}
              className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
            />
          </label>
        </>
      )}

      {isFocusSession ? (
        <>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              Productivity
            </span>
            <RatingBar min={1} max={10} value={productivityScore} onChange={setProductivityScore} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              Discipline
            </span>
            <RatingBar min={1} max={10} value={disciplineScore} onChange={setDisciplineScore} />
          </div>
        </>
      ) : (
        <div>
          <span className="mb-1.5 block text-sm font-medium text-charcoal">
            Honest rating — how do you feel about this block?
          </span>
          <RatingBar value={rating} onChange={setRating} />
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Notes <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>

      <div className="flex gap-3 pt-1">
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
          className="flex-1 rounded-xl bg-sage py-3.5 font-semibold text-white"
        >
          {initial ? 'Save changes' : 'Save log'}
        </button>
      </div>
    </div>
  )
}
