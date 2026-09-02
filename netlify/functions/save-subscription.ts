import { getStore } from '@netlify/blobs'

const STORE_NAME = 'push-devices'

interface PushSubscriptionJson {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface Transition {
  id: string
  activityTitle: string
  type: 'start' | 'end'
  atUtc: string
}

interface StoredTransition extends Transition {
  sent: boolean
}

interface DeviceEntry {
  deviceId: string
  subscription: PushSubscriptionJson
  transitions: StoredTransition[]
  updatedAt: string
}

interface SavePayload {
  deviceId: string
  subscription: PushSubscriptionJson
  transitions: Transition[]
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async (req: Request): Promise<Response> => {
  const store = getStore(STORE_NAME)

  if (req.method === 'DELETE') {
    const deviceId = new URL(req.url).searchParams.get('deviceId')
    if (!deviceId) return jsonResponse({ error: 'Missing deviceId' }, 400)
    await store.delete(deviceId)
    return jsonResponse({ ok: true })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let payload: SavePayload
  try {
    payload = (await req.json()) as SavePayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const { deviceId, subscription, transitions } = payload
  if (
    !deviceId ||
    typeof deviceId !== 'string' ||
    !subscription?.endpoint ||
    !Array.isArray(transitions)
  ) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  // Never trust arbitrary keys/sizes from the client — keep the stored
  // payload to exactly what the scheduled sender needs.
  const cleanTransitions: Transition[] = transitions
    .filter(
      (t): t is Transition =>
        typeof t?.id === 'string' &&
        typeof t?.activityTitle === 'string' &&
        (t?.type === 'start' || t?.type === 'end') &&
        typeof t?.atUtc === 'string',
    )
    .slice(0, 500)
    .map((t) => ({
      id: t.id,
      activityTitle: t.activityTitle.slice(0, 200),
      type: t.type,
      atUtc: t.atUtc,
    }))

  const existing = await store.get(deviceId, { type: 'json' }).catch(() => null)
  const existingSentIds = new Set<string>(
    ((existing as DeviceEntry | null)?.transitions ?? [])
      .filter((t) => t.sent)
      .map((t) => t.id),
  )

  const entry: DeviceEntry = {
    deviceId,
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys?.p256dh ?? '', auth: subscription.keys?.auth ?? '' },
    },
    transitions: cleanTransitions.map((t) => ({ ...t, sent: existingSentIds.has(t.id) })),
    updatedAt: new Date().toISOString(),
  }

  await store.setJSON(deviceId, entry)

  return jsonResponse({ ok: true })
}
