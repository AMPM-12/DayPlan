import { useEffect, useMemo } from 'react'
import type { Activity } from '../types'
import type { ScheduleItem } from '../utils/schedule'
import { syncPush } from '../utils/push'

/**
 * Keeps the server's upcoming-transitions list current: re-sends whenever
 * today's resolved schedule (respecting Start This Now) or tomorrow's
 * resolved activities actually change. Only runs while push is enabled.
 */
export function usePushTransitionsSync(
  enabled: boolean,
  todayDate: string,
  todayItems: ScheduleItem[],
  tomorrowDate: string,
  tomorrowActivities: Activity[],
) {
  const signature = useMemo(() => {
    const todaySig = todayItems
      .map((i) => `${i.activity.id}:${i.start}:${i.end}:${i.completed ? 1 : 0}`)
      .join('|')
    const tomorrowSig = tomorrowActivities
      .map((a) => `${a.id}:${a.startTime}:${a.durationMin}`)
      .join('|')
    return `${todayDate}#${todaySig}##${tomorrowDate}#${tomorrowSig}`
  }, [todayDate, todayItems, tomorrowDate, tomorrowActivities])

  useEffect(() => {
    if (!enabled) return
    syncPush(todayDate, todayItems, tomorrowDate, tomorrowActivities)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, signature])
}
