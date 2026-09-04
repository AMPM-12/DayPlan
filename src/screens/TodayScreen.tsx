import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/AppDataContext'
import { useNow } from '../hooks/useNow'
import type { Activity, ActivityLog } from '../types'
import { computeSchedule, findCurrent, findUpNext, type ScheduleItem } from '../utils/schedule'
import { focusSessionNumbers } from '../utils/focusSessions'
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
    toggleTodayFocusSession,
    resetOverride,
    addLog,
    updateLog,
    theme,
    setTheme,
    refreshIfNewDay,
  } = useAppData()
  const now = useNow()
  const navigate = useNavigate()
  const [actionsFor, setActionsFor] = useState<ScheduleItem | null>(null)
  const [loggingFor, setLoggingFor] = useState<ScheduleItem | null>(null)
  const [optionsFor, setOptionsFor] = useState<ScheduleItem | null>(null)
  const [editingSessionLog, setEditingSessionLog] = useState<{
    activity: Activity
    log: ActivityLog
  } | null>(null)
  const [profilePickerOpen, setProfilePickerOpen] = useState(false)

  useEffect(() => {
    refreshIfNewDay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const mins = nowMinutes(now)
  const items = computeSchedule(todayActivities, today.completedIds, today.override, mins)
  const current = findCurrent(items)
  const upNext = findUpNext(items, 3)
  // Same chronological "Session N" numbering Focus Sessions computes for
  // today's date — shared via utils/focusSessions so the numbers always match.
  const sessionNumbers = useMemo(() => focusSessionNumbers(todayActivities), [todayActivities])

  const usualProfileId = dayMapping[weekdayOf(today.date)] ?? defaultProfileId
  const effectiveProfileId = today.profileOverride ?? usualProfileId
  const effectiveProfile = profiles.find((p) => p.id === effectiveProfileId)
  const isOverridden = !!today.profileOverride && today.profileOverride !== usualProfileId

  function openActions(item: ScheduleItem) {
    // Focus-session blocks already have their own dedicated workflow
    // (docket, timer, log) — jump straight into it instead of the regular
    // block's actions sheet.
    if (item.activity.isFocusSession) {
      const log = today.logs.find((l) => l.activityId === item.activity.id)
      if (log) {
        // Already logged: Focus Sessions itself would require an extra tap
        // on the "Logged" summary to reach the editable form — skip straight
        // to it, reusing the same LogForm + updateLog the Report tab edit uses.
        setEditingSessionLog({ activity: item.activity, log })
      } else {
        // Not yet logged (docket editor, in-progress, or actively running):
        // Focus Sessions itself always shows today by default and renders
        // each session's current state with no extra tap needed, so landing
        // there reproduces exactly what tapping it in Focus Sessions would.
        // Pass which session was tapped so it scrolls into view and briefly
        // highlights, rather than just landing on the top of the tab.
        navigate('/focus', { state: { focusActivityId: item.activity.id } })
      }
      return
    }
    setActionsFor(item)
  }

  function closeActions() {
    setActionsFor(null)
  }

  function openOptions(item: ScheduleItem) {
    setOptionsFor(item)
  }

  function closeOptions() {
    setOptionsFor(null)
  }

  const optionsForIsRunning =
    !!optionsFor && today.activeSessionTimer?.activityId === optionsFor.activity.id

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
        <NowCard
          item={current}
          nowMins={mins}
          sessionNumbers={sessionNumbers}
          onTap={openActions}
          onOptions={openOptions}
        />
        <UpNextList
          items={upNext}
          nowMins={mins}
          sessionNumbers={sessionNumbers}
          onTap={openActions}
          onOptions={openOptions}
        />
        {todayActivities.length === 0 ? (
          <div className="rounded-3xl bg-slate-100 p-6 text-center dark:bg-slate-800/60">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No activities yet — add your plan in the Plan tab.
            </p>
          </div>
        ) : (
          <Timeline
            items={items}
            sessionNumbers={sessionNumbers}
            onTap={openActions}
            onOptions={openOptions}
          />
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
            docket={today.dockets?.[loggingFor.activity.id]}
            onCancel={() => setLoggingFor(null)}
            onSave={(log) => {
              addLog(log, log.completedAsPlanned ? loggingFor.activity.id : undefined)
              setLoggingFor(null)
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={!!editingSessionLog}
        onClose={() => setEditingSessionLog(null)}
        title="Edit log"
      >
        {editingSessionLog && (
          <LogForm
            activity={editingSessionLog.activity}
            docket={today.dockets?.[editingSessionLog.activity.id]}
            initial={editingSessionLog.log}
            onCancel={() => setEditingSessionLog(null)}
            onSave={(payload) => {
              updateLog(today.date, { ...editingSessionLog.log, ...payload })
              setEditingSessionLog(null)
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={!!optionsFor}
        onClose={closeOptions}
        title={optionsFor?.activity.title ?? ''}
      >
        {optionsFor &&
          (optionsForIsRunning ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This session is currently running — pause or finish it before changing its type.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                toggleTodayFocusSession(optionsFor.activity.id)
                closeOptions()
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                optionsFor.activity.isFocusSession
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                  optionsFor.activity.isFocusSession
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                🎯
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Focus session</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {optionsFor.activity.isFocusSession
                    ? 'Tap to make this a regular block for today'
                    : 'Tap to add a task docket for today'}
                </p>
              </div>
            </button>
          ))}
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
