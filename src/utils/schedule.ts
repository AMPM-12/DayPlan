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
 * Builds today's ordered schedule. Every activity keeps its own planned
 * start/end time — nothing shifts. When a "start this now" override is
 * active, only the overridden activity's start/end move to reflect its
 * actual start, and it is forced to show as the current activity
 * regardless of what the clock would otherwise pick.
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

  return sorted.map((activity) => {
    const planned = parseTimeToMinutes(activity.startTime)
    const isOverridden = override?.activityId === activity.id
    const start = isOverridden ? override!.actualStartMinutes : planned
    const end = start + activity.durationMin
    const completed = completedIds.includes(activity.id)

    let status: ItemStatus
    if (isOverridden) {
      status = 'current'
    } else if (override) {
      // A different activity is overriding NOW, so the clock-based pick is suppressed here.
      status = nowMins >= end ? 'past' : 'future'
    } else if (nowMins >= end) {
      status = 'past'
    } else if (nowMins >= start) {
      status = 'current'
    } else {
      status = 'future'
    }

    return { activity, start, end, status, completed, isShifted: isOverridden && start !== planned }
  })
}

export function findCurrent(items: ScheduleItem[]): ScheduleItem | undefined {
  return items.find((i) => i.status === 'current')
}

export function findUpNext(items: ScheduleItem[], count = 3): ScheduleItem[] {
  return items.filter((i) => i.status === 'future').slice(0, count)
}
