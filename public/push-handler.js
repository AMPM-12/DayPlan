// Imported into the Workbox-generated service worker via workbox.importScripts
// (see vite.config.ts). Runs in the SW's scope regardless of whether the app
// is open — this is what makes real push notifications possible.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'Daily Plan'
  const options = {
    body: data.body || '',
    tag: data.tag || 'dayplan-push',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
      return undefined
    }),
  )
})
