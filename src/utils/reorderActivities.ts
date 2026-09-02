import type { Activity } from '../types'
import { minutesToTimeString, parseTimeToMinutes } from './time'

/**
 * Re-stacks activities back-to-back in list order, preserving each one's own
 * duration. The first activity keeps its own start time as the anchor; every
 * activity after it starts exactly when the one before it ends.
 */
export function restackContiguously(activities: Activity[]): Activity[] {
  let cursor: number | null = null
  return activities.map((activity) => {
    if (cursor === null) {
      cursor = parseTimeToMinutes(activity.startTime) + activity.durationMin
      return activity
    }
    const startTime = minutesToTimeString(cursor)
    cursor += activity.durationMin
    return { ...activity, startTime }
  })
}
