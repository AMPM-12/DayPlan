import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import webpush from 'web-push'

const STORE_NAME = 'push-devices'
// "within the last 2-3 minutes" — the function itself runs every 2 minutes,
// so a 3-minute lookback comfortably covers one run's worth of jitter.
const LOOKBACK_MS = 3 * 60_000

interface StoredTransition {
  id: string
  activityTitle: string
  type: 'start' | 'end'
  atUtc: string
  sent: boolean
}

interface DeviceEntry {
  deviceId: string
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  transitions: StoredTransition[]
  updatedAt: string
}

function isDue(t: StoredTransition, now: number): boolean {
  if (t.sent) return false
  const at = new Date(t.atUtc).getTime()
  if (Number.isNaN(at)) return false
  return at <= now && now - at <= LOOKBACK_MS
}

export default async (): Promise<Response> => {
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

  if (!publicKey || !privateKey) {
    console.error('send-transitions: VAPID_PUBLIC/PRIVATE key env vars are not set')
    return new Response('VAPID keys not configured', { status: 500 })
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const store = getStore(STORE_NAME)
  const { blobs } = await store.list()
  const now = Date.now()

  for (const { key } of blobs) {
    const entry = await store.get(key, { type: 'json' }).catch(() => null)
    if (!entry) continue
    const device = entry as DeviceEntry

    const due = device.transitions.filter((t) => isDue(t, now))
    if (due.length === 0) continue

    let subscriptionGone = false
    const sentIds = new Set<string>()

    for (const transition of due) {
      const title =
        transition.type === 'start'
          ? `${transition.activityTitle} is starting`
          : `${transition.activityTitle} is ending`
      const body = transition.type === 'start' ? 'Now' : 'Wrapping up'

      try {
        await webpush.sendNotification(
          device.subscription,
          JSON.stringify({ title, body, tag: transition.id }),
        )
        sentIds.add(transition.id)
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          subscriptionGone = true
        } else {
          console.error(`send-transitions: failed to send to ${key}`, err)
        }
      }
    }

    if (subscriptionGone) {
      await store.delete(key)
      continue
    }

    if (sentIds.size > 0) {
      const updated: DeviceEntry = {
        ...device,
        transitions: device.transitions.map((t) =>
          sentIds.has(t.id) ? { ...t, sent: true } : t,
        ),
      }
      await store.setJSON(key, updated)
    }
  }

  return new Response('ok', { status: 200 })
}

export const config: Config = {
  schedule: '*/2 * * * *',
}
