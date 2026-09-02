import { useState } from 'react'
import type { Activity, ActivityLog, DocketTask, DocketTaskStatus, SessionTimerState } from '../types'
import { formatClock, formatDuration, parseTimeToMinutes } from '../utils/time'
import { DocketEditor } from './DocketEditor'
import { Sheet } from './Sheet'
import { LogForm } from './LogForm'

const STATUS_ICON: Record<DocketTaskStatus, string> = {
  done: '✓',
  skipped: '⤫',
  planned: '',
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function SessionCard({
  activity,
  sessionNumber,
  docket,
  log,
  now,
  interactive,
  activeTimer,
  anotherSessionActive,
  onSetDocket,
  onStartTask,
  onPause,
  onResume,
  onExtend,
  onCompleteTask,
  onEndEarly,
  onSaveLog,
}: {
  activity: Activity
  /** This day's 1-based position among its focus sessions, e.g. 1, 2, 3… however many exist. */
  sessionNumber: number
  docket: DocketTask[]
  log: ActivityLog | undefined
  now: Date
  interactive: boolean
  activeTimer: SessionTimerState | undefined
  anotherSessionActive: boolean
  onSetDocket: (tasks: DocketTask[]) => void
  onStartTask: (taskId: string) => void
  onPause: () => void
  onResume: () => void
  onExtend: (minutes: number) => void
  onCompleteTask: (status: DocketTaskStatus) => void
  onEndEarly: () => void
  onSaveLog: (log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>) => void
}) {
  const [loggingOpen, setLoggingOpen] = useState(false)

  const isActiveHere = interactive && activeTimer?.activityId === activity.id
  const activeTask = isActiveHere ? docket.find((t) => t.id === activeTimer!.taskId) : undefined
  const isPaused = isActiveHere && activeTimer!.pausedRemainingMs !== undefined
  const remainingMs = isActiveHere
    ? isPaused
      ? activeTimer!.pausedRemainingMs!
      : Math.max(0, new Date(activeTimer!.targetEndAt).getTime() - now.getTime())
    : 0
  const isElapsed = isActiveHere && !isPaused && remainingMs <= 0

  const hasStarted = docket.some((t) => t.status !== 'planned') || isActiveHere
  const nextPlanned = docket.find((t) => t.status === 'planned')
  const totalPlanned = docket.reduce((sum, t) => sum + t.plannedMinutes, 0)

  const timeLabel = `${formatClock(parseTimeToMinutes(activity.startTime))} · ${formatDuration(activity.durationMin)}`

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/40 dark:ring-white/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Session {sessionNumber}
      </p>
      <p className="font-semibold text-slate-900 dark:text-slate-100">{activity.title}</p>
      <p className="mb-4 text-sm text-slate-400 dark:text-slate-500">{timeLabel}</p>

      {log ? (
        <button
          type="button"
          onClick={() => setLoggingOpen(true)}
          className="w-full rounded-2xl bg-slate-50 p-4 text-left dark:bg-slate-800/60"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Logged</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">Edit</span>
          </div>
          <div className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span>Productivity: {log.productivityScore ?? '—'}/10</span>
            <span>Discipline: {log.disciplineScore ?? '—'}/10</span>
          </div>
          {docket.length > 0 && (
            <ul className="mt-2 space-y-1">
              {docket.map((task) => (
                <li key={task.id} className="text-xs text-slate-400 dark:text-slate-500">
                  {STATUS_ICON[task.status]} {task.title}
                </li>
              ))}
            </ul>
          )}
        </button>
      ) : isElapsed ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-5 text-center dark:bg-slate-800/60">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Time's up</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {activeTask?.title}
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onCompleteTask('done')}
              className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white"
            >
              Mark done &amp; next
            </button>
            <button
              type="button"
              onClick={() => onExtend(5)}
              className="w-full rounded-xl bg-slate-100 py-3.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Add 5 more minutes
            </button>
            <button
              type="button"
              onClick={() => onCompleteTask('skipped')}
              className="w-full rounded-xl py-2 text-sm font-medium text-slate-400 dark:text-slate-500"
            >
              Skip
            </button>
          </div>
        </div>
      ) : isActiveHere ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-6 text-center dark:bg-slate-800/60">
            <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {activeTask?.title}
              {isPaused && ' · Paused'}
            </p>
            <p className="text-5xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {formatCountdown(remainingMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={onEndEarly}
            className="w-full rounded-xl py-2 text-sm font-medium text-slate-400 dark:text-slate-500"
          >
            End session early
          </button>
          <DocketList docket={docket} />
        </div>
      ) : hasStarted ? (
        <div className="space-y-4">
          <DocketList docket={docket} />
          {interactive && (
            <>
              <DocketEditor tasks={[]} onChange={(added) => onSetDocket([...docket, ...added])} allowEdit={false} />
              {nextPlanned ? (
                <button
                  type="button"
                  onClick={() => onStartTask(nextPlanned.id)}
                  disabled={anotherSessionActive}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white disabled:opacity-40"
                >
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoggingOpen(true)}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white"
                >
                  Log this session
                </button>
              )}
              {nextPlanned && (
                <button
                  type="button"
                  onClick={() => setLoggingOpen(true)}
                  className="w-full rounded-xl bg-slate-100 py-3 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Log this session
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {interactive ? (
            <DocketEditor tasks={docket} onChange={onSetDocket} allowEdit />
          ) : docket.length > 0 ? (
            <DocketList docket={docket} />
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No docket was built for this session.
            </p>
          )}
          {docket.length > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatDuration(totalPlanned)} of {formatDuration(activity.durationMin)} planned
            </p>
          )}
          {interactive && (
            <button
              type="button"
              onClick={() => docket[0] && onStartTask(docket[0].id)}
              disabled={docket.length === 0 || anotherSessionActive}
              className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white disabled:opacity-40"
            >
              Start
            </button>
          )}
        </div>
      )}

      <Sheet open={loggingOpen} onClose={() => setLoggingOpen(false)} title="Log this session">
        <LogForm
          activity={activity}
          docket={docket}
          onCancel={() => setLoggingOpen(false)}
          onSave={(logPayload) => {
            onSaveLog(logPayload)
            setLoggingOpen(false)
          }}
        />
      </Sheet>
    </div>
  )
}

function DocketList({ docket }: { docket: DocketTask[] }) {
  if (docket.length === 0) return null
  return (
    <ul className="space-y-1.5">
      {docket.map((task) => (
        <li
          key={task.id}
          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
        >
          <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
            {STATUS_ICON[task.status]} {task.title}
          </span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
            {typeof task.actualMinutes === 'number'
              ? formatDuration(task.actualMinutes)
              : formatDuration(task.plannedMinutes)}
          </span>
        </li>
      ))}
    </ul>
  )
}
