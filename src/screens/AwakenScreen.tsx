import { useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext'
import { useNow } from '../hooks/useNow'
import { formatCountdown, formatDuration } from '../utils/time'
import { buildAwakenDocket, findAwakenPracticePrompt, formatMinSec } from '../utils/awaken'
import type { Activity, DocketTaskStatus } from '../types'

const STATUS_ICON: Record<DocketTaskStatus, string> = {
  done: '✓',
  skipped: '⤫',
  planned: '',
}

export function AwakenScreen() {
  const {
    todayActivities,
    today,
    setDocket,
    startSessionTask,
    pauseSessionTimer,
    resumeSessionTimer,
    completeSessionTask,
    endSessionEarly,
  } = useAppData()
  const now = useNow()
  const navigate = useNavigate()
  const location = useLocation()
  const awakenActivityId = (location.state as { awakenActivityId?: string } | null)?.awakenActivityId

  const scheduledActivity =
    todayActivities.find((a) => a.isAwaken && a.id === awakenActivityId) ??
    todayActivities.find((a) => a.isAwaken)

  // An ad-hoc session started via "Start Now" isn't in todayActivities at
  // all — it has no profile Activity or schedule slot — so it's carried
  // instead as a small config snapshot on today's DayState. Its docket and
  // timer still live in the normal dockets/activeSessionTimer, keyed by
  // this id, exactly like a scheduled AWAKEN block.
  const adHocConfig = today.adHocAwaken
  const adHocActivity: Activity | undefined = adHocConfig
    ? {
        id: adHocConfig.id,
        title: adHocConfig.title,
        startTime: '',
        durationMin: adHocConfig.durationMin,
        isAwaken: true,
        awakenPractices: adHocConfig.awakenPractices,
      }
    : undefined

  const activeId = today.activeSessionTimer?.activityId
  const adHocDocket = adHocActivity ? today.dockets?.[adHocActivity.id] : undefined
  // Prefer whichever one currently owns the running timer; otherwise an
  // ad-hoc session that's already been started or completed today (it's a
  // one-off "do it now" action, so its result is more likely what the user
  // wants to see than a not-yet-started scheduled block); otherwise the
  // scheduled block; otherwise a never-started ad-hoc session as a last resort.
  const activity =
    (activeId && adHocActivity?.id === activeId ? adHocActivity : undefined) ??
    (activeId && scheduledActivity?.id === activeId ? scheduledActivity : undefined) ??
    (adHocDocket?.length ? adHocActivity : undefined) ??
    scheduledActivity ??
    adHocActivity

  if (!activity) {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No AWAKEN block found for today.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400"
        >
          Back to Today
        </button>
      </div>
    )
  }

  const docket = today.dockets?.[activity.id] ?? []
  const isActiveHere = today.activeSessionTimer?.activityId === activity.id
  const activeTaskIndex = isActiveHere
    ? docket.findIndex((t) => t.id === today.activeSessionTimer!.taskId)
    : -1
  const activeTask = activeTaskIndex >= 0 ? docket[activeTaskIndex] : undefined
  const isPaused = isActiveHere && today.activeSessionTimer!.pausedRemainingMs !== undefined
  const remainingMs = isActiveHere
    ? isPaused
      ? today.activeSessionTimer!.pausedRemainingMs!
      : Math.max(0, new Date(today.activeSessionTimer!.targetEndAt).getTime() - now.getTime())
    : 0
  const plannedMs = activeTask ? activeTask.plannedMinutes * 60_000 : 0
  const percent = plannedMs > 0 ? Math.min(100, Math.max(0, ((plannedMs - remainingMs) / plannedMs) * 100)) : 0
  const activeElapsedMinutes = activeTask
    ? Math.max(0, Math.round((plannedMs - remainingMs) / 60_000))
    : 0
  const nextTask = activeTaskIndex >= 0 ? docket[activeTaskIndex + 1] : undefined

  const hasStarted = docket.some((t) => t.status !== 'planned') || isActiveHere
  const isComplete = docket.length > 0 && !isActiveHere && docket.every((t) => t.status !== 'planned')
  const anotherSessionActive =
    !!today.activeSessionTimer && today.activeSessionTimer.activityId !== activity.id

  const preview = docket.length > 0 ? docket : buildAwakenDocket(activity)

  function handleStart() {
    const fresh = buildAwakenDocket(activity!)
    if (fresh.length === 0) return
    setDocket(today.date, activity!.id, fresh)
    startSessionTask(activity!.id, fresh[0].id)
  }

  function handleSkip() {
    completeSessionTask('skipped', activeElapsedMinutes)
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">AWAKEN</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-medium text-slate-400 dark:text-slate-500"
        >
          Close
        </button>
      </header>

      {isComplete ? (
        <div className="space-y-5 text-center">
          <div className="rounded-3xl bg-indigo-50 p-8 dark:bg-indigo-500/10">
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">AWAKEN COMPLETE</p>
            <p className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {docket.length} practices · {formatDuration(activity.durationMin)}
            </p>
          </div>
          <ul className="space-y-1.5 text-left">
            {docket.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {STATUS_ICON[task.status]} {task.title}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDuration(task.actualMinutes ?? task.plannedMinutes)}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white"
          >
            Done
          </button>
        </div>
      ) : isActiveHere && activeTask ? (
        <div className="space-y-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Practice {activeTaskIndex + 1} of {docket.length}
          </p>
          <div className="rounded-3xl bg-indigo-50 p-8 text-center dark:bg-indigo-500/10">
            <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
              {activeTask.title}
              {isPaused && ' · Paused'}
            </p>
            {(() => {
              const prompt = findAwakenPracticePrompt(activity, activeTask.title)
              return (
                prompt && (
                  <p className="mt-0.5 truncate text-sm text-indigo-500 dark:text-indigo-400">{prompt}</p>
                )
              )
            })()}
            <p className="mt-2 text-6xl font-bold tabular-nums text-indigo-900 dark:text-indigo-50">
              {formatCountdown(remainingMs)}
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-indigo-900/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-400"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {nextTask ? (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Next: {nextTask.title} · {formatMinSec(nextTask.plannedMinutes)}
            </p>
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">Last practice</p>
          )}

          <button
            type="button"
            onClick={isPaused ? resumeSessionTimer : pauseSessionTimer}
            className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full rounded-xl bg-slate-100 py-3 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Skip to next
          </button>
          <button
            type="button"
            onClick={endSessionEarly}
            className="w-full rounded-xl py-2 text-sm font-medium text-slate-400 dark:text-slate-500"
          >
            End AWAKEN early
          </button>
        </div>
      ) : hasStarted ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">AWAKEN was ended early.</p>
          <ul className="space-y-1.5">
            {docket.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {STATUS_ICON[task.status]} {task.title}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDuration(task.actualMinutes ?? task.plannedMinutes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {preview.length} practices · {formatDuration(activity.durationMin)}
          </p>
          <ul className="space-y-1.5">
            {preview.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-800/60"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">{task.title}</span>
                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
                  {formatMinSec(task.plannedMinutes)}
                </span>
              </li>
            ))}
          </ul>
          {anotherSessionActive && (
            <p className="text-center text-sm text-slate-400 dark:text-slate-500">
              Finish or pause the other running session first.
            </p>
          )}
          <button
            type="button"
            onClick={handleStart}
            disabled={anotherSessionActive || preview.length === 0}
            className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white disabled:opacity-40"
          >
            Start AWAKEN
          </button>
        </div>
      )}
    </div>
  )
}
