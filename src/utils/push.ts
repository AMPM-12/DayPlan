import type { Activity } from '../types'
import type { ScheduleItem } from './schedule'
import { buildTransitionsForDate } from './pushTransitions'
import { parseTimeToMinutes } from './time'
import { planRepo } from '../data/repo'

const SAVE_SUBSCRIPTION_URL = '/.netlify/functions/save-subscription'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!import.meta.env.VITE_VAPID_PUBLIC_KEY
  )
}

// Standard VAPID-key base64url -> Uint8Array conversion for applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function ensureSubscription(): Promise<PushSubscription | null> {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!isPushSupported() || !publicKey) return null

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
  })
}

/**
 * Subscribes if needed and (re)sends the current upcoming-transitions list.
 * Entirely best-effort: any failure here should never surface as broken UI —
 * local/foreground notifications already cover the same moments.
 */
export async function syncPush(
  todayDate: string,
  todayItems: ScheduleItem[],
  tomorrowDate: string,
  tomorrowActivities: Activity[],
): Promise<void> {
  try {
    const subscription = await ensureSubscription()
    if (!subscription) return

    const todayTimed = todayItems
      .filter((i) => !i.completed)
      .map((i) => ({ activity: i.activity, start: i.start, end: i.end }))
    const tomorrowTimed = tomorrowActivities.map((a) => {
      const start = parseTimeToMinutes(a.startTime)
      return { activity: a, start, end: start + a.durationMin }
    })

    const transitions = [
      ...buildTransitionsForDate(todayDate, todayTimed),
      ...buildTransitionsForDate(tomorrowDate, tomorrowTimed),
    ]

    await fetch(SAVE_SUBSCRIPTION_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        deviceId: planRepo.getDeviceId(),
        subscription: subscription.toJSON(),
        transitions,
      }),
    })
  } catch {
    // Fail quietly — push is a bonus layer on top of local notifications.
  }
}

export async function disablePush(): Promise<void> {
  try {
    if (!isPushSupported()) return
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()

    const deviceId = planRepo.getDeviceId()
    await fetch(`${SAVE_SUBSCRIPTION_URL}?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    })
  } catch {
    // Fail quietly.
  }
}
