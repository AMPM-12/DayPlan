import type { Activity } from '../types'
import { dateStringPlusMinutes } from './time'

export interface PushTransition {
  id: string
  activityTitle: string
  type: 'start' | 'end'
  atUtc: string
}

interface TimedItem {
  activity: Activity
  start: number // minutes since local midnight on `dateStr`
  end: number
}

/**
 * Builds the "upcoming transitions" list sent to save-subscription: exact
 * block start/end times only, never Focus Sessions' in-session task timer.
 * Only forward-looking entries are included.
 */
export function buildTransitionsForDate(dateStr: string, items: TimedItem[]): PushTransition[] {
  const now = Date.now()
  const result: PushTransition[] = []

  for (const item of items) {
    const startDate = dateStringPlusMinutes(dateStr, item.start)
    const endDate = dateStringPlusMinutes(dateStr, item.end)

    if (startDate.getTime() >= now) {
      result.push({
        id: `${item.activity.id}-start-${startDate.toISOString()}`,
        activityTitle: item.activity.title,
        type: 'start',
        atUtc: startDate.toISOString(),
      })
    }
    if (endDate.getTime() >= now) {
      result.push({
        id: `${item.activity.id}-end-${endDate.toISOString()}`,
        activityTitle: item.activity.title,
        type: 'end',
        atUtc: endDate.toISOString(),
      })
    }
  }

  return result
}
