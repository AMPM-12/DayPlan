import { v4 as uuid } from 'uuid'
import type {
  Activity,
  AppDataExport,
  DayMapping,
  DayState,
  PlanProfile,
  ThemePreference,
  Weekday,
} from '../types'
import { buildDefaultPlan } from './defaultPlan'

const PLAN_KEY = 'dailyplan.plan.v1'
const DAY_PREFIX = 'dailyplan.day.'
const THEME_KEY = 'dailyplan.theme.v1'
const PROFILES_KEY = 'dailyplan.profiles.v1'
const DAY_MAPPING_KEY = 'dailyplan.dayMapping.v1'
const DEFAULT_PROFILE_ID_KEY = 'dailyplan.defaultProfileId.v1'
const NOTIFICATIONS_ENABLED_KEY = 'dailyplan.notificationsEnabled.v1'
const FOCUS_SESSION_MIGRATION_KEY = 'dailyplan.focusSessionMigration.v1'
const LEGACY_FOCUS_SESSION_TITLE = 'Work — SOLID'

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
  saveDefaultProfileId(id: string): void
  getDayMapping(): DayMapping
  saveDayMapping(mapping: DayMapping): void
  clearAllDayStates(): void
  exportData(): AppDataExport
  importData(data: AppDataExport): void
  getNotificationsEnabled(): boolean
  saveNotificationsEnabled(enabled: boolean): void
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
    let profiles: PlanProfile[]
    const raw = localStorage.getItem(PROFILES_KEY)
    if (raw) {
      profiles = safeParse<PlanProfile[]>(raw, [])
    } else {
      // First run after the profiles update: migrate the single legacy plan
      // into a "Default" profile so no one loses their existing schedule.
      const defaultId = uuid()
      profiles = [{ id: defaultId, name: 'Default', activities: this.getPlan() }]
      this.saveProfiles(profiles)
      localStorage.setItem(DEFAULT_PROFILE_ID_KEY, defaultId)
      if (!localStorage.getItem(DAY_MAPPING_KEY)) {
        this.saveDayMapping(buildDayMapping(defaultId))
      }
    }

    // One-time backfill after the focus-sessions update: flag the existing
    // "Work — SOLID" blocks so no one has to re-toggle them by hand.
    if (!localStorage.getItem(FOCUS_SESSION_MIGRATION_KEY)) {
      let changed = false
      profiles = profiles.map((p) => ({
        ...p,
        activities: p.activities.map((a) => {
          if (a.title === LEGACY_FOCUS_SESSION_TITLE && a.isFocusSession === undefined) {
            changed = true
            return { ...a, isFocusSession: true }
          }
          return a
        }),
      }))
      if (changed) this.saveProfiles(profiles)
      localStorage.setItem(FOCUS_SESSION_MIGRATION_KEY, 'done')
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

  saveDefaultProfileId(id: string): void {
    localStorage.setItem(DEFAULT_PROFILE_ID_KEY, id)
  }

  getDayMapping(): DayMapping {
    const raw = localStorage.getItem(DAY_MAPPING_KEY)
    return safeParse<DayMapping>(raw, buildDayMapping(this.getDefaultProfileId()))
  }

  saveDayMapping(mapping: DayMapping): void {
    localStorage.setItem(DAY_MAPPING_KEY, JSON.stringify(mapping))
  }

  clearAllDayStates(): void {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(DAY_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
  }

  exportData(): AppDataExport {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles: this.getProfiles(),
      defaultProfileId: this.getDefaultProfileId(),
      dayMapping: this.getDayMapping(),
      dayStates: this.getAllDayStates(),
    }
  }

  importData(data: AppDataExport): void {
    this.saveProfiles(data.profiles)
    this.saveDefaultProfileId(data.defaultProfileId)
    this.saveDayMapping(data.dayMapping)
    this.clearAllDayStates()
    data.dayStates.forEach((state) => this.saveDayState(state))
  }

  getNotificationsEnabled(): boolean {
    return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true'
  }

  saveNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled))
  }
}

export const planRepo: PlanRepo = new LocalStoragePlanRepo()
