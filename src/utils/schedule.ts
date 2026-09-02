import type { Activity, StartOverride } from '../types'
import { parseTimeToMinutes } from './time'

export type ItemStatus = 'past' | 'current' | 'future'

export interface ScheduleItem {
  activity: Activity
  start: number // minutes since midnight
  end: number
  status: ItemStatus
  completed: boolean
  isShifted: boolean
}

/**
 * Builds today's ordered schedule. When a "start this now" override is
 * active, the overridden activity and everything after it (in plan order)
 * shift forward/back to flow from the override's actual start time —
 * activities before it keep their original planned times untouched.
 */
export function computeSchedule(
  activities: Activity[],
  completedIds: string[],
  override: StartOverride | undefined,
  nowMins: number,
): ScheduleItem[] {
  const sorted = [...activities].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
  )

  const overrideIndex = override ? sorted.findIndex((a) => a.id === override.activityId) : -1

  let cursor = overrideIndex >= 0 ? override!.actualStartMinutes : 0

  return sorted.map((activity, i) => {
    const planned = parseTimeToMinutes(activity.startTime)
    let start: number
    let isShifted = false

    if (overrideIndex >= 0 && i >= overrideIndex) {
      start = cursor
      cursor = start + activity.durationMin
      isShifted = start !== planned
    } else {
      start = planned
    }

    const end = start + activity.durationMin
    const completed = completedIds.includes(activity.id)
    let status: ItemStatus = 'future'
    if (nowMins >= end) status = 'past'
    else if (nowMins >= start) status = 'current'

    return { activity, start, end, status, completed, isShifted }
  })
}

export function findCurrent(items: ScheduleItem[]): ScheduleItem | undefined {
  return items.find((i) => i.status === 'current')
}

export function findUpNext(items: ScheduleItem[], count = 3): ScheduleItem[] {
  return items.filter((i) => i.status === 'future').slice(0, count)
}
