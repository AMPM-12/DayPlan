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
  resetOverride: () => void
  addLog: (log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>, alsoMarkComplete?: string) => void
  updateLog: (date: string, log: ActivityLog) => void

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
  completeSessionTask: (status: DocketTaskStatus) => void
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

  const persistToday = useCallback((state: DayState) => {
    planRepo.saveDayState(state)
    setToday(state)
  }, [])

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
      persistToday({ ...today, profileOverride: profileId, override: undefined })
    },
    [today, persistToday],
  )

  const toggleComplete = useCallback(
    (activity: Activity) => {
      const activityId = activity.id
      const has = today.completedIds.includes(activityId)

      if (has) {
        const completedIds = today.completedIds.filter((id) => id !== activityId)
        const logs = today.logs.filter((l) => !(l.activityId === activityId && l.autoGenerated))
        persistToday({ ...today, completedIds, logs })
        return
      }

      const completedIds = [...today.completedIds, activityId]
      const autoLog: ActivityLog = {
        id: uuid(),
        activityId,
        activityTitle: activity.title,
        date: today.date,
        completedAsPlanned: true,
        intendedMinutesSpent: activity.durationMin,
        actualMinutesSpent: activity.durationMin,
        rating: 10,
        createdAt: new Date().toISOString(),
        autoGenerated: true,
      }
      const logs = [...today.logs.filter((l) => l.activityId !== activityId), autoLog]
      const override = today.override?.activityId === activityId ? undefined : today.override
      persistToday({ ...today, completedIds, logs, override })
    },
    [today, persistToday],
  )

  const startNow = useCallback(
    (activityId: string) => {
      persistToday({
        ...today,
        override: { activityId, actualStartMinutes: nowMinutes() },
      })
    },
    [today, persistToday],
  )

  const resetOverride = useCallback(() => {
    const { override: _override, ...rest } = today
    persistToday(rest)
  }, [today, persistToday])

  const addLog = useCallback(
    (log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>, alsoMarkComplete?: string) => {
      const entry: ActivityLog = {
        ...log,
        id: uuid(),
        date: today.date,
        createdAt: new Date().toISOString(),
      }
      const completedIds =
        alsoMarkComplete && !today.completedIds.includes(alsoMarkComplete)
          ? [...today.completedIds, alsoMarkComplete]
          : today.completedIds
      const logs = [...today.logs.filter((l) => l.activityId !== log.activityId), entry]
      persistToday({ ...today, logs, completedIds })
    },
    [today, persistToday],
  )

  // Updates an already-saved log in place (by id) on its own date — unlike
  // addLog this never creates a new entry or reassigns which date/block it
  // belongs to, and works for any date, not just today.
  const updateLog = useCallback(
    (date: string, log: ActivityLog) => {
      if (date === today.date) {
        const logs = today.logs.map((l) => (l.id === log.id ? log : l))
        persistToday({ ...today, logs })
        return
      }
      const state = planRepo.getDayState(date)
      const logs = state.logs.map((l) => (l.id === log.id ? log : l))
      planRepo.saveDayState({ ...state, logs })
    },
    [today, persistToday],
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
        persistToday({ ...today, dockets: { ...today.dockets, [activityId]: tasks } })
        return
      }
      // A future date's docket can be built ahead of time; it isn't tracked
      // in React state (only "today" is), so just persist it directly —
      // the caller (Focus Sessions, viewing that date) re-reads it itself.
      const state = planRepo.getDayState(date)
      planRepo.saveDayState({ ...state, dockets: { ...state.dockets, [activityId]: tasks } })
    },
    [today, persistToday],
  )

  const startSessionTask = useCallback(
    (activityId: string, taskId: string) => {
      const task = today.dockets?.[activityId]?.find((t) => t.id === taskId)
      if (!task) return
      const now = new Date()
      const targetEndAt = new Date(now.getTime() + task.plannedMinutes * 60_000).toISOString()
      persistToday({
        ...today,
        activeSessionTimer: { activityId, taskId, startedAt: now.toISOString(), targetEndAt },
      })
    },
    [today, persistToday],
  )

  const pauseSessionTimer = useCallback(() => {
    const timer = today.activeSessionTimer
    if (!timer || timer.pausedRemainingMs !== undefined) return
    const remainingMs = Math.max(0, new Date(timer.targetEndAt).getTime() - Date.now())
    persistToday({ ...today, activeSessionTimer: { ...timer, pausedRemainingMs: remainingMs } })
  }, [today, persistToday])

  const resumeSessionTimer = useCallback(() => {
    const timer = today.activeSessionTimer
    if (!timer || timer.pausedRemainingMs === undefined) return
    const targetEndAt = new Date(Date.now() + timer.pausedRemainingMs).toISOString()
    const { pausedRemainingMs: _paused, ...rest } = timer
    persistToday({ ...today, activeSessionTimer: { ...rest, targetEndAt } })
  }, [today, persistToday])

  // Adds minutes relative to whatever's currently left — at the moment a
  // task elapses that's ~0, so it lands on "N minutes from now" same as
  // before; while still running it correctly extends the existing target
  // instead of resetting it. Never used with a negative amount.
  const extendSessionTask = useCallback(
    (minutes: number) => {
      const timer = today.activeSessionTimer
      if (!timer || timer.pausedRemainingMs !== undefined) return
      const now = Date.now()
      const currentRemainingMs = new Date(timer.targetEndAt).getTime() - now
      const newRemainingMs = Math.max(0, currentRemainingMs + minutes * 60_000)
      const targetEndAt = new Date(now + newRemainingMs).toISOString()
      persistToday({ ...today, activeSessionTimer: { ...timer, targetEndAt } })
    },
    [today, persistToday],
  )

  const completeSessionTask = useCallback(
    (status: DocketTaskStatus) => {
      const timer = today.activeSessionTimer
      if (!timer) return
      const tasks = today.dockets?.[timer.activityId] ?? []
      const actualMinutes = Math.max(
        0,
        Math.round((Date.now() - new Date(timer.startedAt).getTime()) / 60_000),
      )
      const updatedTasks = tasks.map((t) =>
        t.id === timer.taskId ? { ...t, status, actualMinutes } : t,
      )
      const currentIndex = tasks.findIndex((t) => t.id === timer.taskId)
      const next = updatedTasks.slice(currentIndex + 1).find((t) => t.status === 'planned')
      const dockets = { ...today.dockets, [timer.activityId]: updatedTasks }

      if (next) {
        const now = new Date()
        const targetEndAt = new Date(now.getTime() + next.plannedMinutes * 60_000).toISOString()
        persistToday({
          ...today,
          dockets,
          activeSessionTimer: {
            activityId: timer.activityId,
            taskId: next.id,
            startedAt: now.toISOString(),
            targetEndAt,
          },
        })
      } else {
        const { activeSessionTimer: _timer, ...rest } = today
        persistToday({ ...rest, dockets })
      }
    },
    [today, persistToday],
  )

  const endSessionEarly = useCallback(() => {
    const { activeSessionTimer: _timer, ...rest } = today
    persistToday(rest)
  }, [today, persistToday])

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
