import type { Weekday } from '../types'

/** All "minutes" values below are minutes since local midnight. */

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTimeString(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function nowMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function todayDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "9:00am", "1:30pm", "12:00pm" */
export function formatClock(mins: number): string {
  const wrapped = ((mins % 1440) + 1440) % 1440
  let h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const period = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')}${period}`
}

/** "1h 12m", "45m", "2h" */
export function formatDuration(mins: number): string {
  const total = Math.max(0, Math.round(mins))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatDateHeading(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

const WEEKDAYS_BY_JS_DAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function weekdayOf(dateStr: string): Weekday {
  const d = new Date(`${dateStr}T00:00:00`)
  return WEEKDAYS_BY_JS_DAY[d.getDay()]
}

export function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return todayDateString(d)
}

/** A real Date for `dateStr`'s local midnight plus `minutesSinceMidnight`. */
export function dateStringPlusMinutes(dateStr: string, minutesSinceMidnight: number): Date {
  const midnight = new Date(`${dateStr}T00:00:00`)
  return new Date(midnight.getTime() + minutesSinceMidnight * 60_000)
}
