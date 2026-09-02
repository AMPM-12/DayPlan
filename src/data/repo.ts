import type { Activity, DayState, ThemePreference } from '../types'
import { buildDefaultPlan } from './defaultPlan'

const PLAN_KEY = 'dailyplan.plan.v1'
const DAY_PREFIX = 'dailyplan.day.'
const THEME_KEY = 'dailyplan.theme.v1'

/**
 * Thin storage interface so a future cloud-sync backend can implement the
 * same shape without touching call sites.
 */
export interface PlanRepo {
  getPlan(): Activity[]
  savePlan(activities: Activity[]): void
  getDayState(date: string): DayState
  saveDayState(state: DayState): void
  getAllDayStates(): DayState[]
  getTheme(): ThemePreference
  saveTheme(theme: ThemePreference): void
}

function emptyDayState(date: string): DayState {
  return { date, completedIds: [], logs: [] }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

class LocalStoragePlanRepo implements PlanRepo {
  getPlan(): Activity[] {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) {
      const seeded = buildDefaultPlan()
      this.savePlan(seeded)
      return seeded
    }
    return safeParse<Activity[]>(raw, [])
  }

  savePlan(activities: Activity[]): void {
    localStorage.setItem(PLAN_KEY, JSON.stringify(activities))
  }

  getDayState(date: string): DayState {
    const raw = localStorage.getItem(DAY_PREFIX + date)
    return safeParse<DayState>(raw, emptyDayState(date))
  }

  saveDayState(state: DayState): void {
    localStorage.setItem(DAY_PREFIX + state.date, JSON.stringify(state))
  }

  getAllDayStates(): DayState[] {
    const states: DayState[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(DAY_PREFIX)) continue
      const state = safeParse<DayState | null>(localStorage.getItem(key), null)
      if (state) states.push(state)
    }
    return states.sort((a, b) => a.date.localeCompare(b.date))
  }

  getTheme(): ThemePreference {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
  }

  saveTheme(theme: ThemePreference): void {
    localStorage.setItem(THEME_KEY, theme)
  }
}

export const planRepo: PlanRepo = new LocalStoragePlanRepo()
