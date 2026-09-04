import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext'
import { useNow } from '../hooks/useNow'
import { resolveActivities } from '../utils/profiles'
import { sortFocusSessions } from '../utils/focusSessions'
import { addDays, formatDateHeading, todayDateString } from '../utils/time'
import { SessionCard } from '../components/SessionCard'

export function FocusSessionsScreen() {
  const {
    profiles,
    defaultProfileId,
    dayMapping,
    today,
    todayActivities,
    getDayState,
    setDocket,
    startSessionTask,
    pauseSessionTimer,
    resumeSessionTimer,
    extendSessionTask,
    completeSessionTask,
    endSessionEarly,
    addLog,
    updateLog,
  } = useAppData()
  const now = useNow()
  const location = useLocation()
  // Set only when arriving via a deep link from Today (see TodayScreen's
  // openActions) — the id of the specific session to scroll to and briefly
  // highlight, so it's obvious which one was tapped.
  const focusActivityId = (location.state as { focusActivityId?: string } | null)
    ?.focusActivityId
  const [highlightId, setHighlightId] = useState(focusActivityId)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const [viewedDate, setViewedDate] = useState(todayDateString())
  // Editing a future date's docket writes straight to storage (that date
  // isn't tracked in React state the way "today" is), so bump this to force
  // a re-read after such an edit.
  const [, forceRefresh] = useState(0)

  const isToday = viewedDate === todayDateString(now)
  const isPast = viewedDate < todayDateString(now)
  const canEditDocket = !isPast
  const dayState = isToday ? today : getDayState(viewedDate)

  const activities = useMemo(
    () =>
      isToday
        ? todayActivities
        : resolveActivities(viewedDate, dayState, profiles, dayMapping, defaultProfileId),
    [isToday, todayActivities, viewedDate, dayState, profiles, dayMapping, defaultProfileId],
  )

  const sessions = useMemo(() => sortFocusSessions(activities), [activities])

  useEffect(() => {
    if (!focusActivityId) return
    const el = cardRefs.current.get(focusActivityId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => setHighlightId(undefined), 2000)
    return () => clearTimeout(timer)
    // Only ever runs once per mount — focusActivityId comes from the
    // navigation that mounted this screen and never changes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Focus Sessions</h1>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewedDate((d) => addDays(d, -1))}
            aria-label="Previous day"
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            ‹
          </button>
          <p className="flex-1 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            {isToday ? 'Today' : formatDateHeading(viewedDate)}
          </p>
          <button
            type="button"
            onClick={() => setViewedDate((d) => addDays(d, 1))}
            aria-label="Next day"
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            ›
          </button>
        </div>
        {!isToday && (
          <button
            type="button"
            onClick={() => setViewedDate(todayDateString())}
            className="mt-1.5 w-full text-center text-xs font-medium text-indigo-600 dark:text-indigo-400"
          >
            Back to today
          </button>
        )}
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {isToday
              ? 'No focus sessions today. Flag a block as a focus session in the Plan tab to see it here.'
              : 'No focus sessions on this date.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((activity, index) => (
            <div
              key={activity.id}
              ref={(el) => {
                if (el) cardRefs.current.set(activity.id, el)
                else cardRefs.current.delete(activity.id)
              }}
              className={`rounded-3xl ring-2 transition-shadow duration-500 ${
                highlightId === activity.id
                  ? 'ring-indigo-400 dark:ring-indigo-500/70'
                  : 'ring-transparent'
              }`}
            >
              <SessionCard
                activity={activity}
                sessionNumber={index + 1}
                docket={dayState.dockets?.[activity.id] ?? []}
                log={dayState.logs.find((l) => l.activityId === activity.id)}
                now={now}
                canEditDocket={canEditDocket}
                canRun={isToday}
                activeTimer={isToday ? today.activeSessionTimer : undefined}
                anotherSessionActive={
                  !!today.activeSessionTimer && today.activeSessionTimer.activityId !== activity.id
                }
                onSetDocket={(tasks) => {
                  setDocket(viewedDate, activity.id, tasks)
                  if (!isToday) forceRefresh((t) => t + 1)
                }}
                onStartTask={(taskId) => startSessionTask(activity.id, taskId)}
                onPause={pauseSessionTimer}
                onResume={resumeSessionTimer}
                onExtend={extendSessionTask}
                onCompleteTask={completeSessionTask}
                onEndEarly={endSessionEarly}
                onSaveLog={(log) => addLog(log, log.completedAsPlanned ? activity.id : undefined)}
                onUpdateLog={(log) => {
                  updateLog(viewedDate, log)
                  if (!isToday) forceRefresh((t) => t + 1)
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
