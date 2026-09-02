import { v4 as uuid } from 'uuid'
import type { Activity, DayMapping, DayState, PlanProfile, ThemePreference, Weekday } from '../types'
import { buildDefaultPlan } from './defaultPlan'

const PLAN_KEY = 'dailyplan.plan.v1'
const DAY_PREFIX = 'dailyplan.day.'
const THEME_KEY = 'dailyplan.theme.v1'
const PROFILES_KEY = 'dailyplan.profiles.v1'
const DAY_MAPPING_KEY = 'dailyplan.dayMapping.v1'
const DEFAULT_PROFILE_ID_KEY = 'dailyplan.defaultProfileId.v1'

const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function buildDayMapping(profileId: string): DayMapping {
  return WEEKDAY_ORDER.reduce((acc, day) => {
    acc[day] = profileId
    return acc
  }, {} as DayMapping)
}

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
  getProfiles(): PlanProfile[]
  saveProfiles(profiles: PlanProfile[]): void
  getDefaultProfileId(): string
  getDayMapping(): DayMapping
  saveDayMapping(mapping: DayMapping): void
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

  getProfiles(): PlanProfile[] {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (raw) return safeParse<PlanProfile[]>(raw, [])

    // First run after the profiles update: migrate the single legacy plan
    // into a "Default" profile so no one loses their existing schedule.
    const defaultId = uuid()
    const profiles: PlanProfile[] = [{ id: defaultId, name: 'Default', activities: this.getPlan() }]
    this.saveProfiles(profiles)
    localStorage.setItem(DEFAULT_PROFILE_ID_KEY, defaultId)
    if (!localStorage.getItem(DAY_MAPPING_KEY)) {
      this.saveDayMapping(buildDayMapping(defaultId))
    }
    return profiles
  }

  saveProfiles(profiles: PlanProfile[]): void {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  }

  getDefaultProfileId(): string {
    const raw = localStorage.getItem(DEFAULT_PROFILE_ID_KEY)
    if (raw) return raw
    // Migration (in getProfiles) seeds this key; make sure it has run.
    const profiles = this.getProfiles()
    return localStorage.getItem(DEFAULT_PROFILE_ID_KEY) ?? profiles[0]?.id ?? uuid()
  }

  getDayMapping(): DayMapping {
    const raw = localStorage.getItem(DAY_MAPPING_KEY)
    return safeParse<DayMapping>(raw, buildDayMapping(this.getDefaultProfileId()))
  }

  saveDayMapping(mapping: DayMapping): void {
    localStorage.setItem(DAY_MAPPING_KEY, JSON.stringify(mapping))
  }
}

export const planRepo: PlanRepo = new LocalStoragePlanRepo()
