import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import { planRepo } from './repo'
import type { Activity, ActivityLog, DayState, ThemePreference } from '../types'
import { nowMinutes, todayDateString } from '../utils/time'

interface AppDataValue {
  plan: Activity[]
  setPlan: (activities: Activity[]) => void
  addActivity: (activity: Activity) => void
  updateActivity: (activity: Activity) => void
  deleteActivity: (id: string) => void

  today: DayState
  toggleComplete: (activity: Activity) => void
  startNow: (activityId: string) => void
  resetOverride: () => void
  addLog: (log: Omit<ActivityLog, 'id' | 'createdAt' | 'date'>, alsoMarkComplete?: string) => void

  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void

  getDayState: (date: string) => DayState
  getAllDayStates: () => DayState[]
  refreshIfNewDay: () => void
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<Activity[]>(() => planRepo.getPlan())
  const [today, setToday] = useState<DayState>(() => planRepo.getDayState(todayDateString()))
  const [theme, setThemeState] = useState<ThemePreference>(() => planRepo.getTheme())

  const setPlan = useCallback((activities: Activity[]) => {
    planRepo.savePlan(activities)
    setPlanState(activities)
  }, [])

  const addActivity = useCallback(
    (activity: Activity) => {
      const next = [...plan, activity]
      planRepo.savePlan(next)
      setPlanState(next)
    },
    [plan],
  )

  const updateActivity = useCallback(
    (activity: Activity) => {
      const next = plan.map((a) => (a.id === activity.id ? activity : a))
      planRepo.savePlan(next)
      setPlanState(next)
    },
    [plan],
  )

  const deleteActivity = useCallback(
    (id: string) => {
      const next = plan.filter((a) => a.id !== id)
      planRepo.savePlan(next)
      setPlanState(next)
    },
    [plan],
  )

  const persistToday = useCallback((state: DayState) => {
    planRepo.saveDayState(state)
    setToday(state)
  }, [])

  const toggleComplete = useCallback(
    (activity: Activity) => {
      const activityId = activity.id
      const has = today.completedIds.includes(activityId)

      if (has) {
        const completedIds = today.completedIds.filter((id) => id !== activityId)
        persistToday({ ...today, completedIds })
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

  const getDayState = useCallback((date: string) => planRepo.getDayState(date), [])
  const getAllDayStates = useCallback(() => planRepo.getAllDayStates(), [])

  const refreshIfNewDay = useCallback(() => {
    const d = todayDateString()
    if (d !== today.date) setToday(planRepo.getDayState(d))
  }, [today.date])

  const value = useMemo<AppDataValue>(
    () => ({
      plan,
      setPlan,
      addActivity,
      updateActivity,
      deleteActivity,
      today,
      toggleComplete,
      startNow,
      resetOverride,
      addLog,
      theme,
      setTheme,
      getDayState,
      getAllDayStates,
      refreshIfNewDay,
    }),
    [
      plan,
      setPlan,
      addActivity,
      updateActivity,
      deleteActivity,
      today,
      toggleComplete,
      startNow,
      resetOverride,
      addLog,
      theme,
      setTheme,
      getDayState,
      getAllDayStates,
      refreshIfNewDay,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
