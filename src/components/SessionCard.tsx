import { useState } from 'react'
import type {
  Activity,
  ActivityLog,
  DocketTask,
  DocketTaskStatus,
  PlanTask,
  SessionTimerState,
} from '../types'
import { formatClock, formatCountdown, formatDuration, parseTimeToMinutes } from '../utils/time'
import { resolveDocketTaskTitle } from '../utils/focusSessions'
import { DocketEditor } from './DocketEditor'
import { Sheet } from './Sheet'
import { LogForm } from './LogForm'

const STATUS_ICON: Record<DocketTaskStatus, string> = {
  done: '✓',
  skipped: '⤫',
  planned: '',
}

export function SessionCard({
  activity,
  sessionNumber,
  docket,
  planTasks,
  log,
  now,
  canEditDocket,
  canRun,
  activeTimer,
  anotherSessionActive,
  onSetDocket,
  onStartTask,
  onPause,
  onResume,
  onExtend,
  onSwitchTask,
  onCompleteTask,
  onEndEarly,
  onSaveLog,
  onUpdateLog,
}: {
  activity: Activity
  /** This day's 1-based position among its focus sessions, e.g. 1, 2, 3… however many exist. */
  sessionNumber: number
  docket: DocketTask[]
  /** The household's standalone Task List — read-only, resolves linked entries' live titles and powers "Add from Tasks" inside DocketEditor. */
  planTasks: PlanTask[]
  log: ActivityLog | undefined
  now: Date
  /** Today or any future date: add/edit/reorder/delete the docket ahead of time. */
  canEditDocket: boolean
  /** Today only: start/pause/resume/complete tasks and log the session. */
  canRun: boolean
  activeTimer: SessionTimerState | undefined
  anotherSessionActive: boolean
  onSetDocket: (tasks: DocketTask[]) => void
  onStartTask: (taskId: string) => void
  onPause: () => void
  onResume: () => void
  onExtend: (minutes: number) => void
  /** Switches the live timer to a different upcoming (planned) task. */
  onSwitchTask: (taskId: string) => void
  onCompleteTask: (status: DocketTaskStatus, actualMinutes: number) => void
  onEndEarly: () => void
  onSaveLog: (
    log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>,
    updatedDocket?: DocketTask[],
  ) => void
  /** Overwrites an already-saved log in place — used instead of onSaveLog when `log` is set. */
  onUpdateLog: (log: ActivityLog, updatedDocket?: DocketTask[]) => void
}) {
  const [loggingOpen, setLoggingOpen] = useState(false)
  const [editUpcomingOpen, setEditUpcomingOpen] = useState(false)
  // Set while confirming a "Mark done" — pre-filled with the computed
  // elapsed minutes, editable before it's actually recorded.
  const [completingMinutes, setCompletingMinutes] = useState<number | null>(null)

  const isActiveHere = canRun && activeTimer?.activityId === activity.id
  const activeTaskIndex = isActiveHere ? docket.findIndex((t) => t.id === activeTimer!.taskId) : -1
  const activeTask = activeTaskIndex >= 0 ? docket[activeTaskIndex] : undefined
  const isPaused = isActiveHere && activeTimer!.pausedRemainingMs !== undefined
  const remainingMs = isActiveHere
    ? isPaused
      ? activeTimer!.pausedRemainingMs!
      : Math.max(0, new Date(activeTimer!.targetEndAt).getTime() - now.getTime())
    : 0
  const isElapsed = isActiveHere && !isPaused && remainingMs <= 0
  const activeElapsedMinutes = activeTask
    ? Math.max(0, Math.round((activeTask.plannedMinutes * 60_000 - remainingMs) / 60_000))
    : 0

  function beginComplete() {
    setCompletingMinutes(activeElapsedMinutes)
  }
  function confirmComplete() {
    if (completingMinutes === null) return
    onCompleteTask('done', completingMinutes)
    setCompletingMinutes(null)
  }
  function handleSkip() {
    onCompleteTask('skipped', activeElapsedMinutes)
  }

  // Every still-planned task other than the one currently being timed is
  // safe to edit/reorder/delete — done/skipped tasks and the active task
  // itself are fixed history. Status-based rather than positional, since
  // switching (not strictly sequential) can leave a still-planned task
  // sitting either before or after the active task's array position.
  const upcomingTasks = docket.filter((t) => t.status === 'planned' && t.id !== activeTask?.id)

  function handleEditUpcoming(newUpcoming: DocketTask[]) {
    const fixed = docket.filter((t) => t.status !== 'planned' || t.id === activeTask?.id)
    const activePos = fixed.findIndex((t) => t.id === activeTask?.id)
    if (activePos === -1) {
      onSetDocket([...newUpcoming, ...fixed])
      return
    }
    onSetDocket([...fixed.slice(0, activePos + 1), ...newUpcoming, ...fixed.slice(activePos + 1)])
  }

  const hasStarted = docket.some((t) => t.status !== 'planned') || isActiveHere
  const nextPlanned = docket.find((t) => t.status === 'planned')
  const totalPlanned = docket.reduce((sum, t) => sum + t.plannedMinutes, 0)

  const timeLabel = `${formatClock(parseTimeToMinutes(activity.startTime))} · ${formatDuration(activity.durationMin)}`

  return (
    <div className="rounded-3xl bg-cream p-5 shadow-sm ring-1 ring-charcoal/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Session {sessionNumber}
      </p>
      <p className="font-semibold text-charcoal">{activity.title}</p>
      <p className="mb-4 font-mono text-sm text-muted">{timeLabel}</p>

      {log ? (
        <button
          type="button"
          onClick={() => setLoggingOpen(true)}
          className="w-full rounded-2xl bg-charcoal/5 p-4 text-left"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal">Logged</span>
            <span className="text-xs text-sage">Edit</span>
          </div>
          <div className="flex gap-4 text-sm text-charcoal">
            <span>Productivity: {log.productivityScore ?? '—'}/10</span>
            <span>Discipline: {log.disciplineScore ?? '—'}/10</span>
          </div>
          {docket.length > 0 && (
            <ul className="mt-2 space-y-1">
              {docket.map((task) => (
                <li key={task.id} className="text-xs text-muted">
                  {STATUS_ICON[task.status]} {resolveDocketTaskTitle(task, planTasks)}
                </li>
              ))}
            </ul>
          )}
        </button>
      ) : isElapsed ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-charcoal/5 p-5 text-center">
            <p className="text-sm font-medium text-muted">Time's up</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">
              {activeTask && resolveDocketTaskTitle(activeTask, planTasks)}
            </p>
          </div>
          <div className="space-y-2.5">
            {completingMinutes !== null ? (
              <CompleteConfirm
                minutes={completingMinutes}
                onChange={setCompletingMinutes}
                onCancel={() => setCompletingMinutes(null)}
                onConfirm={confirmComplete}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={beginComplete}
                  className="w-full rounded-xl bg-sage py-3.5 font-semibold text-white"
                >
                  Mark done &amp; next
                </button>
                <AddTimeButtons onAdd={onExtend} />
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full rounded-xl py-2 text-sm font-medium text-muted"
                >
                  Skip
                </button>
              </>
            )}
          </div>
          <DocketList docket={docket} planTasks={planTasks} />
          <button
            type="button"
            onClick={() => setEditUpcomingOpen(true)}
            className="w-full rounded-xl py-2 text-sm font-medium text-sage"
          >
            Edit upcoming tasks
          </button>
        </div>
      ) : isActiveHere ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-charcoal/5 p-6 text-center">
            <p className="mb-1 text-sm font-medium text-muted">
              {activeTask && resolveDocketTaskTitle(activeTask, planTasks)}
              {isPaused && ' · Paused'}
            </p>
            <p className="font-mono text-5xl font-bold tabular-nums text-charcoal">
              {formatCountdown(remainingMs)}
            </p>
          </div>
          {!isPaused && <AddTimeButtons onAdd={onExtend} />}
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className="w-full rounded-xl bg-sage py-3.5 font-semibold text-white"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          {!isPaused &&
            (completingMinutes !== null ? (
              <CompleteConfirm
                minutes={completingMinutes}
                onChange={setCompletingMinutes}
                onCancel={() => setCompletingMinutes(null)}
                onConfirm={confirmComplete}
              />
            ) : (
              <button
                type="button"
                onClick={beginComplete}
                className="w-full rounded-xl bg-charcoal/5 py-3.5 font-medium text-charcoal"
              >
                Mark done
              </button>
            ))}
          <button
            type="button"
            onClick={onEndEarly}
            className="w-full rounded-xl py-2 text-sm font-medium text-muted"
          >
            End session early
          </button>
          <DocketList
            docket={docket}
            planTasks={planTasks}
            activeTaskId={activeTask?.id}
            onSelectTask={onSwitchTask}
          />
          <button
            type="button"
            onClick={() => setEditUpcomingOpen(true)}
            className="w-full rounded-xl py-2 text-sm font-medium text-sage"
          >
            Edit upcoming tasks
          </button>
        </div>
      ) : hasStarted ? (
        <div className="space-y-4">
          <DocketList docket={docket} planTasks={planTasks} />
          {canRun && (
            <>
              <DocketEditor
                tasks={[]}
                planTasks={planTasks}
                onChange={(added) => onSetDocket([...docket, ...added])}
                allowEdit={false}
              />
              {nextPlanned ? (
                <button
                  type="button"
                  onClick={() => onStartTask(nextPlanned.id)}
                  disabled={anotherSessionActive}
                  className="w-full rounded-xl bg-sage py-3.5 font-semibold text-white disabled:opacity-40"
                >
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoggingOpen(true)}
                  className="w-full rounded-xl bg-sage py-3.5 font-semibold text-white"
                >
                  Log this session
                </button>
              )}
              {nextPlanned && (
                <button
                  type="button"
                  onClick={() => setLoggingOpen(true)}
                  className="w-full rounded-xl bg-charcoal/5 py-3 font-medium text-charcoal"
                >
                  Log this session
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {canEditDocket ? (
            <DocketEditor tasks={docket} planTasks={planTasks} onChange={onSetDocket} allowEdit />
          ) : docket.length > 0 ? (
            <DocketList docket={docket} planTasks={planTasks} />
          ) : (
            <p className="text-sm text-muted">
              No docket was built for this session.
            </p>
          )}
          {docket.length > 0 && (
            <p className="font-mono text-xs text-muted">
              {formatDuration(totalPlanned)} of {formatDuration(activity.durationMin)} planned
            </p>
          )}
          {canRun && (
            <>
              <button
                type="button"
                onClick={() => docket[0] && onStartTask(docket[0].id)}
                disabled={docket.length === 0 || anotherSessionActive}
                className="w-full rounded-xl bg-sage py-3.5 font-semibold text-white disabled:opacity-40"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => setLoggingOpen(true)}
                className="w-full rounded-xl py-2 text-sm font-medium text-sage"
              >
                Log this session
              </button>
            </>
          )}
        </div>
      )}

      <Sheet
        open={loggingOpen}
        onClose={() => setLoggingOpen(false)}
        title={log ? 'Edit log' : 'Log this session'}
      >
        <LogForm
          activity={activity}
          docket={docket}
          planTasks={planTasks}
          initial={log}
          onCancel={() => setLoggingOpen(false)}
          onSave={(logPayload, updatedDocket) => {
            if (log) {
              onUpdateLog({ ...log, ...logPayload }, updatedDocket)
            } else {
              onSaveLog(logPayload, updatedDocket)
            }
            setLoggingOpen(false)
          }}
        />
      </Sheet>

      <Sheet open={editUpcomingOpen} onClose={() => setEditUpcomingOpen(false)} title="Upcoming tasks">
        <p className="mb-4 text-sm text-muted">
          {activeTask && resolveDocketTaskTitle(activeTask, planTasks)} is the current task and isn't
          editable here — everything after it is.
        </p>
        <DocketEditor tasks={upcomingTasks} planTasks={planTasks} onChange={handleEditUpcoming} allowEdit />
      </Sheet>
    </div>
  )
}

const ADD_TIME_OPTIONS = [2, 5, 10, 15]

function AddTimeButtons({ onAdd }: { onAdd: (minutes: number) => void }) {
  return (
    <div className="flex justify-center gap-2">
      {ADD_TIME_OPTIONS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onAdd(m)}
          className="rounded-full bg-charcoal/5 px-3 py-1.5 text-xs font-medium text-muted"
        >
          +{m}m
        </button>
      ))}
    </div>
  )
}

function DocketList({
  docket,
  planTasks,
  activeTaskId,
  onSelectTask,
}: {
  docket: DocketTask[]
  /** Read-only — resolves a linked entry's live title. */
  planTasks: PlanTask[]
  /** The task currently being timed, if any — shown but never selectable. */
  activeTaskId?: string
  /** When provided, other planned (not yet done/skipped) tasks become tappable to switch the live timer to them. */
  onSelectTask?: (taskId: string) => void
}) {
  if (docket.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {docket.map((task) => {
        const isActive = task.id === activeTaskId
        const isSwitchable = !!onSelectTask && task.status === 'planned' && !isActive
        const content = (
          <>
            <span className="min-w-0 truncate text-charcoal">
              {STATUS_ICON[task.status]} {resolveDocketTaskTitle(task, planTasks)}
              {task.taskId && (
                <span className="ml-1 rounded-full bg-sage/10 px-1.5 py-0.5 text-[10px] font-medium text-sage">
                  ✅ Task
                </span>
              )}
              {isActive && <span className="ml-1 text-sage">• timing</span>}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted">
              {typeof task.actualMinutes === 'number'
                ? formatDuration(task.actualMinutes)
                : formatDuration(task.plannedMinutes)}
            </span>
          </>
        )
        return isSwitchable ? (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelectTask(task.id)}
              className="flex w-full items-center justify-between gap-2 rounded-xl bg-charcoal/5 px-3 py-2 text-left text-sm hover:bg-charcoal/10"
            >
              {content}
            </button>
          </li>
        ) : (
          <li
            key={task.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-charcoal/5 px-3 py-2 text-sm"
          >
            {content}
          </li>
        )
      })}
    </ul>
  )
}

function CompleteConfirm({
  minutes,
  onChange,
  onCancel,
  onConfirm,
}: {
  minutes: number
  onChange: (minutes: number) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-charcoal/5 p-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-charcoal">
          Actual minutes spent
        </span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-xl border border-muted/30 bg-cream px-4 py-3 text-base text-charcoal"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-charcoal/5 py-2.5 font-medium text-charcoal"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-sage py-2.5 font-semibold text-white"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
