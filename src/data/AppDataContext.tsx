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
  PlanProfile,
  ThemePreference,
  Weekday,
} from '../types'
import { addDays, nowMinutes, todayDateString } from '../utils/time'
import { resolveActivities } from '../utils/profiles'
import { computeSchedule } from '../utils/schedule'
import { useActivityNotifications } from '../hooks/useActivityNotifications'

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

  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void

  getAllDayStates: () => DayState[]
  refreshIfNewDay: () => void

  exportData: () => AppDataExport
  importData: (data: AppDataExport) => void

  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void
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

  const setTheme = useCallback((t: ThemePreference) => {
    planRepo.saveTheme(t)
    setThemeState(t)
  }, [])

  const getAllDayStates = useCallback(() => planRepo.getAllDayStates(), [])

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
      theme,
      setTheme,
      getAllDayStates,
      refreshIfNewDay,
      exportData,
      importData,
      notificationsEnabled,
      setNotificationsEnabled,
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
      theme,
      setTheme,
      getAllDayStates,
      refreshIfNewDay,
      exportData,
      importData,
      notificationsEnabled,
      setNotificationsEnabled,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
