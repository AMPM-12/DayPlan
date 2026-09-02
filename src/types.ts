export type CategoryId =
  | 'spiritual'
  | 'work'
  | 'health'
  | 'family'
  | 'home'
  | 'personal'
  | 'free'

export interface Category {
  id: CategoryId
  label: string
  color: string
}

export interface FlexOption {
  id: string
  label: string
}

export interface Activity {
  id: string
  title: string
  /** 24h "HH:MM" */
  startTime: string
  durationMin: number
  category?: CategoryId
  notes?: string
  isFlexible?: boolean
  flexOptions?: FlexOption[]
}

export interface ActivityLog {
  id: string
  activityId: string
  activityTitle: string
  date: string // YYYY-MM-DD
  completedAsPlanned: boolean
  intendedMinutesSpent?: number
  actualActivityTitle?: string
  actualMinutesSpent?: number
  rating?: number // 0-10
  notes?: string
  createdAt: string // ISO
}

export interface StartOverride {
  activityId: string
  actualStartMinutes: number
}

export interface DayState {
  date: string // YYYY-MM-DD
  completedIds: string[]
  override?: StartOverride
  logs: ActivityLog[]
}

export type ThemePreference = 'system' | 'light' | 'dark'
