/**
 * Local activity notifications, delivered through the already-registered
 * service worker's showNotification() — no push server, no custom SW code.
 * Every call here is defensive: unsupported platforms or a denied/undecided
 * permission just no-op instead of throwing.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Must be called directly from a user gesture (e.g. a toggle's onClick). */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export async function showActivityNotification(
  title: string,
  body: string,
  tag: string,
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  } catch {
    // Fail quietly — a denied/revoked permission or an unavailable SW should never break the UI.
  }
}
