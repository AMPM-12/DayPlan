import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { v4 as uuid } from 'uuid'
import { planRepo } from './repo'
import type {
  Activity,
  ActivityLog,
  AppDataExport,
  DayMapping,
  DayState,
  DocketTask,
  DocketTaskStatus,
  PlanProfile,
  ThemePreference,
  Weekday,
} from '../types'
import { addDays, nowMinutes, todayDateString } from '../utils/time'
import { resolveActivities } from '../utils/profiles'
import { computeSchedule } from '../utils/schedule'
import { useActivityNotifications } from '../hooks/useActivityNotifications'
import { useSessionTimerNotification } from '../hooks/useSessionTimerNotification'
import { usePushTransitionsSync } from '../hooks/usePushTransitionsSync'

// A task's remaining time honors any banked elapsedMs from a prior period
// that ended via switching away (rather than completing) — so (re)starting
// it, whether via Start, Resume, auto-advance, or switching back to it,
// always continues from where it left off instead of resetting to the
// full planned duration.
function remainingMsForTask(task: DocketTask): number {
  return Math.max(0, task.plannedMinutes * 60_000 - (task.elapsedMs ?? 0))
}

interface AppDataValue {
  profiles: PlanProfile[]
  defaultProfileId: string
  addProfile: (name: string) => PlanProfile
  renameProfile: (id: string, name: string) => void
  duplicateProfile: (id: string) => void
  deleteProfile: (id: string) => void
  addActivity: (profileId: string, activity: Activity) => void
  updateActivity: (profileId: string, activity: Activity) => void
  deleteActivity: (profileId: string, activityId: string) => void
  reorderActivities: (profileId: string, activities: Activity[]) => void

  dayMapping: DayMapping
  setDayMapping: (day: Weekday, profileId: string) => void

  today: DayState
  todayActivities: Activity[]
  setTodayProfileOverride: (profileId: string | undefined) => void
  toggleComplete: (activity: Activity) => void
  startNow: (activityId: string) => void
  toggleTodayFocusSession: (activityId: string) => void
  resetOverride: () => void
  addLog: (
    log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>,
    alsoMarkComplete?: string,
    docketUpdate?: { activityId: string; tasks: DocketTask[] },
  ) => void
  updateLog: (
    date: string,
    log: ActivityLog,
    docketUpdate?: { activityId: string; tasks: DocketTask[] },
  ) => void

  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void

  getAllDayStates: () => DayState[]
  getDayState: (date: string) => DayState
  refreshIfNewDay: () => void

  exportData: () => AppDataExport
  importData: (data: AppDataExport) => void

  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void

  setDocket: (date: string, activityId: string, tasks: DocketTask[]) => void
  startSessionTask: (activityId: string, taskId: string) => void
  pauseSessionTimer: () => void
  resumeSessionTimer: () => void
  extendSessionTask: (minutes: number) => void
  switchSessionTask: (taskId: string) => void
  completeSessionTask: (status: DocketTaskStatus, actualMinutes: number) => void
  endSessionEarly: () => void
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfilesState] = useState<PlanProfile[]>(() => planRepo.getProfiles())
  const [defaultProfileId, setDefaultProfileId] = useState<string>(() => planRepo.getDefaultProfileId())
  const [dayMapping, setDayMappingState] = useState<DayMapping>(() => planRepo.getDayMapping())
  const [today, setToday] = useState<DayState>(() => planRepo.getDayState(todayDateString()))
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(() =>
    planRepo.getNotificationsEnabled(),
  )
  const [theme, setThemeState] = useState<ThemePreference>(() => planRepo.getTheme())

  const persistProfiles = useCallback((next: PlanProfile[]) => {
    planRepo.saveProfiles(next)
    setProfilesState(next)
  }, [])

  const addProfile = useCallback(
    (name: string) => {
      const profile: PlanProfile = { id: uuid(), name, activities: [] }
      persistProfiles([...profiles, profile])
      return profile
    },
    [profiles, persistProfiles],
  )

  const renameProfile = useCallback(
    (id: string, name: string) => {
      persistProfiles(profiles.map((p) => (p.id === id ? { ...p, name } : p)))
    },
    [profiles, persistProfiles],
  )

  const duplicateProfile = useCallback(
    (id: string) => {
      const source = profiles.find((p) => p.id === id)
      if (!source) return
      const copy: PlanProfile = {
        id: uuid(),
        name: `${source.name} copy`,
        activities: source.activities.map((a) => ({ ...a, id: uuid() })),
      }
      persistProfiles([...profiles, copy])
    },
    [profiles, persistProfiles],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      // The default profile is the ultimate fallback and can't be removed;
      // there must always be at least one profile.
      if (id === defaultProfileId || profiles.length <= 1) return
      persistProfiles(profiles.filter((p) => p.id !== id))
    },
    [profiles, persistProfiles, defaultProfileId],
  )

  const addActivity = useCallback(
    (profileId: string, activity: Activity) => {
      persistProfiles(
        profiles.map((p) =>
          p.id === profileId ? { ...p, activities: [...p.activities, activity] } : p,
        ),
      )
    },
    [profiles, persistProfiles],
  )

  const updateActivity = useCallback(
    (profileId: string, activity: Activity) => {
      persistProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, activities: p.activities.map((a) => (a.id === activity.id ? activity : a)) }
            : p,
        ),
      )
    },
    [profiles, persistProfiles],
  )

  const deleteActivity = useCallback(
    (profileId: string, activityId: string) => {
      persistProfiles(
        profiles.map((p) =>
          p.id === profileId
            ? { ...p, activities: p.activities.filter((a) => a.id !== activityId) }
            : p,
        ),
      )
    },
    [profiles, persistProfiles],
  )

  const reorderActivities = useCallback(
    (profileId: string, activities: Activity[]) => {
      persistProfiles(profiles.map((p) => (p.id === profileId ? { ...p, activities } : p)))
    },
    [profiles, persistProfiles],
  )

  const setDayMapping = useCallback(
    (day: Weekday, profileId: string) => {
      const next = { ...dayMapping, [day]: profileId }
      planRepo.saveDayMapping(next)
      setDayMappingState(next)
    },
    [dayMapping],
  )

  // Read-modify-write against the freshest persisted value for today's
  // date, never a closure-captured `today` — so two calls chained
  // synchronously in the same handler (no re-render in between to refresh
  // any closure) can never silently drop one of them: the second call's
  // `planRepo.getDayState` re-read picks up exactly what the first call
  // just wrote. Only `today.date` is a dependency (a stable primitive for
  // the whole session, unlike `today` itself, which changes on every write).
  // A function that wants to bail out without writing should return
  // `latest` unchanged (the same reference) — persistToday then skips the
  // write entirely, matching an early `return` before the old direct-state
  // form used to.
  const persistToday = useCallback(
    (updater: (latest: DayState) => DayState) => {
      const latest = planRepo.getDayState(today.date)
      const next = updater(latest)
      if (next === latest) return
      planRepo.saveDayState(next)
      setToday(next)
    },
    [today.date],
  )

  const todayActivities = useMemo(
    () => resolveActivities(today.date, today, profiles, dayMapping, defaultProfileId),
    [today, profiles, dayMapping, defaultProfileId],
  )

  const setNotificationsEnabled = useCallback((enabled: boolean) => {
    planRepo.saveNotificationsEnabled(enabled)
    setNotificationsEnabledState(enabled)
  }, [])

  // Kept at the provider level (not inside a screen) so scheduled notification
  // timers survive navigating between tabs. The `0` for nowMins is fine — only
  // start/end/completed are used here, and those don't depend on the clock.
  const notificationItems = useMemo(
    () => computeSchedule(todayActivities, today.completedIds, today.override, 0),
    [todayActivities, today.completedIds, today.override],
  )
  useActivityNotifications(notificationItems, notificationsEnabled)

  // Tomorrow's date has no per-date override/snapshot until it actually
  // becomes "today", so live resolution (no DayState) is always correct here.
  const tomorrowDate = useMemo(() => addDays(today.date, 1), [today.date])
  const tomorrowActivities = useMemo(
    () => resolveActivities(tomorrowDate, undefined, profiles, dayMapping, defaultProfileId),
    [tomorrowDate, profiles, dayMapping, defaultProfileId],
  )
  usePushTransitionsSync(
    notificationsEnabled,
    today.date,
    notificationItems,
    tomorrowDate,
    tomorrowActivities,
  )

  const setTodayProfileOverride = useCallback(
    (profileId: string | undefined) => {
      persistToday((latest) => ({ ...latest, profileOverride: profileId, override: undefined }))
    },
    [persistToday],
  )

  const toggleComplete = useCallback(
    (activity: Activity) => {
      const activityId = activity.id
      persistToday((latest) => {
        const has = latest.completedIds.includes(activityId)

        if (has) {
          const completedIds = latest.completedIds.filter((id) => id !== activityId)
          const logs = latest.logs.filter((l) => !(l.activityId === activityId && l.autoGenerated))
          return { ...latest, completedIds, logs }
        }

        const completedIds = [...latest.completedIds, activityId]
        const autoLog: ActivityLog = {
          id: uuid(),
          activityId,
          activityTitle: activity.title,
          date: latest.date,
          completedAsPlanned: true,
          intendedMinutesSpent: activity.durationMin,
          actualMinutesSpent: activity.durationMin,
          rating: 10,
          createdAt: new Date().toISOString(),
          autoGenerated: true,
        }
        const logs = [...latest.logs.filter((l) => l.activityId !== activityId), autoLog]
        const override = latest.override?.activityId === activityId ? undefined : latest.override
        return { ...latest, completedIds, logs, override }
      })
    },
    [persistToday],
  )

  const startNow = useCallback(
    (activityId: string) => {
      persistToday((latest) => ({
        ...latest,
        override: { activityId, actualStartMinutes: nowMinutes() },
      }))
    },
    [persistToday],
  )

  const resetOverride = useCallback(() => {
    persistToday((latest) => {
      const { override: _override, ...rest } = latest
      return rest
    })
  }, [persistToday])

  // Flips isFocusSession for today's occurrence only, on top of whatever the
  // activity's own template says — never touches the profile/template itself.
  // No-ops while that block's session is actively running, since changing
  // its type out from under a live timer would leave the timer orphaned.
  const toggleTodayFocusSession = useCallback(
    (activityId: string) => {
      persistToday((latest) => {
        if (latest.activeSessionTimer?.activityId === activityId) return latest
        const template =
          profiles.flatMap((p) => p.activities).find((a) => a.id === activityId)?.isFocusSession ??
          false
        const current = latest.focusSessionOverrides?.[activityId] ?? template
        return {
          ...latest,
          focusSessionOverrides: { ...latest.focusSessionOverrides, [activityId]: !current },
        }
      })
    },
    [persistToday, profiles],
  )

  const addLog = useCallback(
    (
      log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>,
      alsoMarkComplete?: string,
      docketUpdate?: { activityId: string; tasks: DocketTask[] },
    ) => {
      persistToday((latest) => {
        const entry: ActivityLog = {
          ...log,
          id: uuid(),
          date: latest.date,
          createdAt: new Date().toISOString(),
        }
        const completedIds =
          alsoMarkComplete && !latest.completedIds.includes(alsoMarkComplete)
            ? [...latest.completedIds, alsoMarkComplete]
            : latest.completedIds
        const logs = [...latest.logs.filter((l) => l.activityId !== log.activityId), entry]
        // docketUpdate lets a caller fold a docket change into this same
        // write in one call. Since persistToday now always re-reads the
        // latest stored value first, two separate calls (addLog then
        // setDocket) would also compose correctly — this param is no
        // longer load-bearing for correctness, just a convenience for
        // callers that already have both changes in hand at once.
        const dockets = docketUpdate
          ? { ...latest.dockets, [docketUpdate.activityId]: docketUpdate.tasks }
          : latest.dockets
        return { ...latest, logs, completedIds, dockets }
      })
    },
    [persistToday],
  )

  // Updates an already-saved log in place (by id) on its own date — unlike
  // addLog this never creates a new entry or reassigns which date/block it
  // belongs to, and works for any date, not just today. The optional
  // docketUpdate folds a docket change into the same write as a
  // convenience (see addLog's comment) — the non-today branch already
  // re-reads planRepo.getDayState fresh regardless, so it was never
  // vulnerable to the stale-closure race in the first place.
  const updateLog = useCallback(
    (
      date: string,
      log: ActivityLog,
      docketUpdate?: { activityId: string; tasks: DocketTask[] },
    ) => {
      if (date === today.date) {
        persistToday((latest) => {
          const logs = latest.logs.map((l) => (l.id === log.id ? log : l))
          const dockets = docketUpdate
            ? { ...latest.dockets, [docketUpdate.activityId]: docketUpdate.tasks }
            : latest.dockets
          return { ...latest, logs, dockets }
        })
        return
      }
      const state = planRepo.getDayState(date)
      const logs = state.logs.map((l) => (l.id === log.id ? log : l))
      const dockets = docketUpdate
        ? { ...state.dockets, [docketUpdate.activityId]: docketUpdate.tasks }
        : state.dockets
      planRepo.saveDayState({ ...state, logs, dockets })
    },
    [today.date, persistToday],
  )

  const setTheme = useCallback((t: ThemePreference) => {
    planRepo.saveTheme(t)
    setThemeState(t)
  }, [])

  const getAllDayStates = useCallback(() => planRepo.getAllDayStates(), [])
  const getDayState = useCallback((date: string) => planRepo.getDayState(date), [])

  const setDocket = useCallback(
    (date: string, activityId: string, tasks: DocketTask[]) => {
      if (date === today.date) {
        persistToday((latest) => ({
          ...latest,
          dockets: { ...latest.dockets, [activityId]: tasks },
        }))
        return
      }
      // A future date's docket can be built ahead of time; it isn't tracked
      // in React state (only "today" is), so just persist it directly —
      // the caller (Focus Sessions, viewing that date) re-reads it itself.
      const state = planRepo.getDayState(date)
      planRepo.saveDayState({ ...state, dockets: { ...state.dockets, [activityId]: tasks } })
    },
    [today.date, persistToday],
  )

  const startSessionTask = useCallback(
    (activityId: string, taskId: string) => {
      persistToday((latest) => {
        const task = latest.dockets?.[activityId]?.find((t) => t.id === taskId)
        if (!task) return latest
        const now = new Date()
        const targetEndAt = new Date(now.getTime() + remainingMsForTask(task)).toISOString()
        return {
          ...latest,
          activeSessionTimer: { activityId, taskId, startedAt: now.toISOString(), targetEndAt },
        }
      })
    },
    [persistToday],
  )

  const pauseSessionTimer = useCallback(() => {
    persistToday((latest) => {
      const timer = latest.activeSessionTimer
      if (!timer || timer.pausedRemainingMs !== undefined) return latest
      const remainingMs = Math.max(0, new Date(timer.targetEndAt).getTime() - Date.now())
      return { ...latest, activeSessionTimer: { ...timer, pausedRemainingMs: remainingMs } }
    })
  }, [persistToday])

  const resumeSessionTimer = useCallback(() => {
    persistToday((latest) => {
      const timer = latest.activeSessionTimer
      if (!timer || timer.pausedRemainingMs === undefined) return latest
      const targetEndAt = new Date(Date.now() + timer.pausedRemainingMs).toISOString()
      const { pausedRemainingMs: _paused, ...rest } = timer
      return { ...latest, activeSessionTimer: { ...rest, targetEndAt } }
    })
  }, [persistToday])

  // Adds minutes relative to whatever's currently left — at the moment a
  // task elapses that's ~0, so it lands on "N minutes from now" same as
  // before; while still running it correctly extends the existing target
  // instead of resetting it. Never used with a negative amount.
  const extendSessionTask = useCallback(
    (minutes: number) => {
      persistToday((latest) => {
        const timer = latest.activeSessionTimer
        if (!timer || timer.pausedRemainingMs !== undefined) return latest
        const now = Date.now()
        const currentRemainingMs = new Date(timer.targetEndAt).getTime() - now
        const newRemainingMs = Math.max(0, currentRemainingMs + minutes * 60_000)
        const targetEndAt = new Date(now + newRemainingMs).toISOString()
        return { ...latest, activeSessionTimer: { ...timer, targetEndAt } }
      })
    },
    [persistToday],
  )

  // Not strictly sequential: switches the active timer to a different
  // planned task, banking the outgoing task's elapsed time (via
  // remainingMsForTask's inverse) so selecting it again later resumes
  // rather than restarts. Mirrors pause/resume's wall-clock-target
  // approach — never a countdown that's decremented in place.
  const switchSessionTask = useCallback(
    (newTaskId: string) => {
      persistToday((latest) => {
        const timer = latest.activeSessionTimer
        if (!timer || timer.taskId === newTaskId) return latest
        const tasks = latest.dockets?.[timer.activityId] ?? []
        const currentTask = tasks.find((t) => t.id === timer.taskId)
        const targetTask = tasks.find((t) => t.id === newTaskId)
        if (!currentTask || !targetTask || targetTask.status !== 'planned') return latest

        const now = Date.now()
        const currentRemainingMs =
          timer.pausedRemainingMs !== undefined
            ? timer.pausedRemainingMs
            : Math.max(0, new Date(timer.targetEndAt).getTime() - now)
        const currentElapsedMs = Math.max(
          0,
          currentTask.plannedMinutes * 60_000 - currentRemainingMs,
        )

        const updatedTasks = tasks.map((t) =>
          t.id === currentTask.id ? { ...t, elapsedMs: currentElapsedMs } : t,
        )
        const targetEndAt = new Date(now + remainingMsForTask(targetTask)).toISOString()

        return {
          ...latest,
          dockets: { ...latest.dockets, [timer.activityId]: updatedTasks },
          activeSessionTimer: {
            activityId: timer.activityId,
            taskId: newTaskId,
            startedAt: new Date(now).toISOString(),
            targetEndAt,
          },
        }
      })
    },
    [persistToday],
  )

  const completeSessionTask = useCallback(
    (status: DocketTaskStatus, actualMinutes: number) => {
      persistToday((latest) => {
        const timer = latest.activeSessionTimer
        if (!timer) return latest
        const tasks = latest.dockets?.[timer.activityId] ?? []
        const updatedTasks = tasks.map((t) =>
          t.id === timer.taskId ? { ...t, status, actualMinutes, elapsedMs: undefined } : t,
        )
        const currentIndex = tasks.findIndex((t) => t.id === timer.taskId)
        const next = updatedTasks.slice(currentIndex + 1).find((t) => t.status === 'planned')
        const dockets = { ...latest.dockets, [timer.activityId]: updatedTasks }

        if (next) {
          const now = new Date()
          const targetEndAt = new Date(now.getTime() + remainingMsForTask(next)).toISOString()
          return {
            ...latest,
            dockets,
            activeSessionTimer: {
              activityId: timer.activityId,
              taskId: next.id,
              startedAt: now.toISOString(),
              targetEndAt,
            },
          }
        }
        const { activeSessionTimer: _timer, ...rest } = latest
        return { ...rest, dockets }
      })
    },
    [persistToday],
  )

  const endSessionEarly = useCallback(() => {
    persistToday((latest) => {
      const { activeSessionTimer: _timer, ...rest } = latest
      return rest
    })
  }, [persistToday])

  const activeSessionTaskTitle = useMemo(() => {
    const timer = today.activeSessionTimer
    if (!timer) return undefined
    return today.dockets?.[timer.activityId]?.find((t) => t.id === timer.taskId)?.title
  }, [today])

  useSessionTimerNotification(today.activeSessionTimer, activeSessionTaskTitle, notificationsEnabled)

  const exportData = useCallback(() => planRepo.exportData(), [])

  const importData = useCallback((data: AppDataExport) => {
    planRepo.importData(data)
    setProfilesState(planRepo.getProfiles())
    setDefaultProfileId(planRepo.getDefaultProfileId())
    setDayMappingState(planRepo.getDayMapping())
    setToday(planRepo.getDayState(todayDateString()))
  }, [])

  // A date is "locked in" the first time it's no longer today, using whatever
  // activities were in effect for it — so later profile/mapping edits can't
  // retroactively change a day that already happened.
  const lockInIfPast = useCallback(
    (date: string, state: DayState) => {
      if (date >= todayDateString() || state.activitiesSnapshot) return
      const hasActivity =
        state.completedIds.length > 0 || state.logs.length > 0 || !!state.override || !!state.profileOverride
      if (!hasActivity) return
      const activities = resolveActivities(date, state, profiles, dayMapping, defaultProfileId)
      planRepo.saveDayState({ ...state, activitiesSnapshot: activities })
    },
    [profiles, dayMapping, defaultProfileId],
  )

  // Covers the common case of the app being closed overnight and reopened
  // the next day, so yesterday still gets locked in even though it was never
  // seen going stale inside a live session.
  useEffect(() => {
    const yesterday = addDays(todayDateString(), -1)
    lockInIfPast(yesterday, planRepo.getDayState(yesterday))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshIfNewDay = useCallback(() => {
    const d = todayDateString()
    if (d === today.date) return
    lockInIfPast(today.date, today)
    setToday(planRepo.getDayState(d))
  }, [today, lockInIfPast])

  const value = useMemo<AppDataValue>(
    () => ({
      profiles,
      defaultProfileId,
      addProfile,
      renameProfile,
      duplicateProfile,
      deleteProfile,
      addActivity,
      updateActivity,
      deleteActivity,
      reorderActivities,
      dayMapping,
      setDayMapping,
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
      getAllDayStates,
      getDayState,
      refreshIfNewDay,
      exportData,
      importData,
      notificationsEnabled,
      setNotificationsEnabled,
      setDocket,
      startSessionTask,
      pauseSessionTimer,
      resumeSessionTimer,
      extendSessionTask,
      switchSessionTask,
      completeSessionTask,
      endSessionEarly,
    }),
    [
      profiles,
      defaultProfileId,
      addProfile,
      renameProfile,
      duplicateProfile,
      deleteProfile,
      addActivity,
      updateActivity,
      deleteActivity,
      reorderActivities,
      dayMapping,
      setDayMapping,
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
      getAllDayStates,
      getDayState,
      refreshIfNewDay,
      exportData,
      importData,
      notificationsEnabled,
      setNotificationsEnabled,
      setDocket,
      startSessionTask,
      pauseSessionTimer,
      resumeSessionTimer,
      extendSessionTask,
      switchSessionTask,
      completeSessionTask,
      endSessionEarly,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
