import { useEffect } from 'react'
import type { SessionTimerState } from '../types'
import { showActivityNotification } from '../utils/notifications'

/**
 * Schedules a single local notification for when the active session task's
 * timer elapses. Mirrors useActivityNotifications' wall-clock-target
 * approach and reuses the same delivery utility — no separate mechanism.
 */
export function useSessionTimerNotification(
  timer: SessionTimerState | undefined,
  taskTitle: string | undefined,
  enabled: boolean,
) {
  const running = !!timer && timer.pausedRemainingMs === undefined
  const targetEndAt = running ? timer.targetEndAt : undefined

  useEffect(() => {
    if (!enabled || !targetEndAt) return
    const delay = new Date(targetEndAt).getTime() - Date.now()
    if (delay <= 0) return

    const id = setTimeout(() => {
      showActivityNotification(
        `${taskTitle ?? 'Task'} time is up`,
        'Mark it done, add 5 minutes, or skip.',
        `session-task:${targetEndAt}`,
      )
    }, delay)

    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetEndAt, enabled, taskTitle])
}
