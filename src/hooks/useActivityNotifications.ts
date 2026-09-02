import { useEffect, useRef } from 'react'
import type { ScheduleItem } from '../utils/schedule'
import { formatDuration } from '../utils/time'
import { showActivityNotification } from '../utils/notifications'

const ENDING_SOON_MIN = 5

function minutesToDate(base: Date, minutesSinceMidnight: number): Date {
  const midnight = new Date(base)
  midnight.setHours(0, 0, 0, 0)
  return new Date(midnight.getTime() + minutesSinceMidnight * 60_000)
}

/**
 * Schedules local "ending soon" / "starting now" notifications for today's
 * remaining activities. Purely additive to whatever already renders
 * `items` — reads start/end/completed off the existing computeSchedule()
 * output and never mutates it.
 */
export function useActivityNotifications(items: ScheduleItem[], enabled: boolean) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const signature = items
    .map((i) => `${i.activity.id}:${i.start}:${i.end}:${i.completed ? 1 : 0}`)
    .join('|')

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (!enabled) return

    const now = new Date()

    for (const item of items) {
      if (item.completed) continue

      const endingSoonDelay = minutesToDate(now, item.end - ENDING_SOON_MIN).getTime() - now.getTime()
      if (endingSoonDelay > 0) {
        timers.current.push(
          setTimeout(() => {
            showActivityNotification(
              `${item.activity.title} is ending soon`,
              `${ENDING_SOON_MIN} minutes left`,
              `ending:${item.activity.id}:${item.end}`,
            )
          }, endingSoonDelay),
        )
      }

      const startDelay = minutesToDate(now, item.start).getTime() - now.getTime()
      if (startDelay > 0) {
        timers.current.push(
          setTimeout(() => {
            showActivityNotification(
              `${item.activity.title} is starting`,
              `Now — ${formatDuration(item.activity.durationMin)}`,
              `start:${item.activity.id}:${item.start}`,
            )
          }, startDelay),
        )
      }
    }

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled])
}
