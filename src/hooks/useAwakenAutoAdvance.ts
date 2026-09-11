import { useEffect, useRef } from 'react'

/**
 * Automatically completes the current AWAKEN practice the instant its timer
 * reaches zero — mirrors useSessionTimerNotification's approach (a single
 * setTimeout to the wall-clock target, not a decrementing interval) so it
 * fires correctly even if the practice's whole duration elapsed while the
 * app was backgrounded or the screen was locked. Re-armed automatically
 * whenever `targetEndAt` changes, i.e. after each practice advances.
 */
export function useAwakenAutoAdvance(targetEndAt: string | undefined, onElapsed: () => void) {
  const onElapsedRef = useRef(onElapsed)
  useEffect(() => {
    onElapsedRef.current = onElapsed
  }, [onElapsed])

  useEffect(() => {
    if (!targetEndAt) return
    const delay = new Date(targetEndAt).getTime() - Date.now()
    const id = setTimeout(() => onElapsedRef.current(), Math.max(0, delay))
    return () => clearTimeout(id)
  }, [targetEndAt])
}
