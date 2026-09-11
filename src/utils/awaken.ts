import { v4 as uuid } from 'uuid'
import type { Activity, AwakenPracticeTemplate, DocketTask } from '../types'
import { DEFAULT_AWAKEN_PRACTICES } from '../data/awakenPractices'

export function awakenPracticeTemplates(activity: Activity): AwakenPracticeTemplate[] {
  return activity.awakenPractices ?? DEFAULT_AWAKEN_PRACTICES
}

function enabledPractices(activity: Activity): AwakenPracticeTemplate[] {
  return awakenPracticeTemplates(activity).filter((p) => p.enabled)
}

/**
 * Splits a total number of seconds evenly across `count` parts, handing the
 * leftover seconds to the first parts one at a time — so the parts always
 * sum exactly back to the total instead of losing time to rounding.
 */
function splitSecondsEvenly(totalSeconds: number, count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor(totalSeconds / count)
  let leftover = totalSeconds - base * count
  return Array.from({ length: count }, () => {
    const seconds = base + (leftover > 0 ? 1 : 0)
    if (leftover > 0) leftover--
    return seconds
  })
}

/** Live preview of each enabled practice's planned duration, in minutes, for a given total. */
export function previewAwakenDurations(practices: AwakenPracticeTemplate[], totalMinutes: number): number[] {
  const enabledCount = practices.filter((p) => p.enabled).length
  const totalSeconds = Math.round(totalMinutes * 60)
  return splitSecondsEvenly(totalSeconds, enabledCount).map((s) => s / 60)
}

/**
 * Builds a fresh docket for an AWAKEN block: one task per enabled practice,
 * durations split exactly evenly (in seconds) across the block's total
 * duration. Disabled practices are skipped entirely — they never appear.
 */
export function buildAwakenDocket(activity: Activity): DocketTask[] {
  const practices = enabledPractices(activity)
  const totalSeconds = Math.round(activity.durationMin * 60)
  const seconds = splitSecondsEvenly(totalSeconds, practices.length)
  return practices.map((p, i) => ({
    id: uuid(),
    title: p.title,
    plannedMinutes: seconds[i] / 60,
    status: 'planned' as const,
  }))
}

/** "5:00", "7:30" — minutes:seconds, for a planned-duration preview (not a live countdown). */
export function formatMinSec(minutes: number): string {
  const totalSec = Math.round(minutes * 60)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
