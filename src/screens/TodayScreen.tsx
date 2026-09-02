import { useEffect, useState } from 'react'
import { useAppData } from '../data/AppDataContext'
import { useNow } from '../hooks/useNow'
import { computeSchedule, findCurrent, findUpNext, type ScheduleItem } from '../utils/schedule'
import { formatDateHeading, nowMinutes, todayDateString, weekdayOf } from '../utils/time'
import { NowCard } from '../components/NowCard'
import { UpNextList } from '../components/UpNextList'
import { Timeline } from '../components/Timeline'
import { Sheet } from '../components/Sheet'
import { ActivityActions } from '../components/ActivityActions'
import { LogForm } from '../components/LogForm'
import { ThemeToggle } from '../components/ThemeToggle'

export function TodayScreen() {
  const {
    profiles,
    defaultProfileId,
    dayMapping,
    today,
    todayActivities,
    setTodayProfileOverride,
    toggleComplete,
    startNow,
    resetOverride,
    addLog,
    theme,
    setTheme,
    refreshIfNewDay,
  } = useAppData()
  const now = useNow()
  const [actionsFor, setActionsFor] = useState<ScheduleItem | null>(null)
  const [loggingFor, setLoggingFor] = useState<ScheduleItem | null>(null)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)

  useEffect(() => {
    refreshIfNewDay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const mins = nowMinutes(now)
  const items = computeSchedule(todayActivities, today.completedIds, today.override, mins)
  const current = findCurrent(items)
  const upNext = findUpNext(items, 3)

  const usualProfileId = dayMapping[weekdayOf(today.date)] ?? defaultProfileId
  const effectiveProfileId = today.profileOverride ?? usualProfileId
  const effectiveProfile = profiles.find((p) => p.id === effectiveProfileId)
  const isOverridden = !!today.profileOverride && today.profileOverride !== usualProfileId

  function openActions(item: ScheduleItem) {
    setActionsFor(item)
  }

  function closeActions() {
    setActionsFor(null)
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Today</h1>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {formatDateHeading(todayDateString(now))}
            </p>
            {profiles.length > 1 && (
              <button
                type="button"
                onClick={() => setProfilePickerOpen(true)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isOverridden
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800'
                }`}
              >
                {effectiveProfile?.name ?? 'Default'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {today.override && (
            <button
              type="button"
              onClick={resetOverride}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              Reset to plan
            </button>
          )}
          <ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </header>

      <div className="space-y-6">
        <NowCard item={current} nowMins={mins} onTap={openActions} />
        <UpNextList items={upNext} nowMins={mins} onTap={openActions} />
        {todayActivities.length === 0 ? (
          <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No activities yet — add your plan in the Plan tab.
            </p>
          </div>
        ) : (
          <Timeline items={items} onTap={openActions} />
        )}
      </div>

      <Sheet open={!!actionsFor} onClose={closeActions} title={actionsFor?.activity.title ?? ''}>
        {actionsFor && (
          <ActivityActions
            item={actionsFor}
            onStartNow={() => {
              startNow(actionsFor.activity.id)
              closeActions()
            }}
            onToggleComplete={() => {
              toggleComplete(actionsFor.activity)
              closeActions()
            }}
            onLog={() => {
              setLoggingFor(actionsFor)
              setActionsFor(null)
            }}
          />
        )}
      </Sheet>

      <Sheet open={!!loggingFor} onClose={() => setLoggingFor(null)} title="Log this block">
        {loggingFor && (
          <LogForm
            activity={loggingFor.activity}
            onCancel={() => setLoggingFor(null)}
            onSave={(log) => {
              addLog(log, log.completedAsPlanned ? loggingFor.activity.id : undefined)
              setLoggingFor(null)
            }}
          />
        )}
      </Sheet>

      <Sheet open={profilePickerOpen} onClose={() => setProfilePickerOpen(false)} title="Today's plan">
        <div className="space-y-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setTodayProfileOverride(p.id === usualProfileId ? undefined : p.id)
                setProfilePickerOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-medium ${
                p.id === effectiveProfileId
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
              }`}
            >
              <span>
                {p.name}
                {p.id === usualProfileId && (
                  <span className="ml-2 text-xs font-normal text-slate-400">usual</span>
                )}
              </span>
              {p.id === effectiveProfileId && <span>✓</span>}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
