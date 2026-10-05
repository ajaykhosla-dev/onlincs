/* Service worker: web push, notification clicks and a small offline layer.
 * Bump VERSION on any change to this file. The browser re-fetches sw.js on every visit (it is served no-cache),
 * and a new version takes over without a manual cache clear (skipWaiting + clients.claim + old caches deleted). */
const VERSION = 'v2'
const STATIC_CACHE = `static-${VERSION}`
const PAGE_CACHE = `pages-${VERSION}`
const OFFLINE_URL = '/offline.html'
const CAMERAMAN_PAGE = /^\/cameraman(\/|$)/

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (![STATIC_CACHE, PAGE_CACHE].includes(key)) await caches.delete(key)
    await self.clients.claim()
  })())
})

// Signing out wipes anything cached for the previous person on a shared device.
self.addEventListener('message', (event) => {
  if (event.data === 'clear-user-caches') event.waitUntil(caches.delete(PAGE_CACHE))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/approve/')) return

  // Built assets are content-hashed: cache first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.open(STATIC_CACHE).then(async (cache) => {
      const hit = await cache.match(request)
      if (hit) return hit
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    }))
    return
  }

  // Pages: network first. The cameraman's screens are also kept so the schedule opens with no connection.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        // A redirect (for example to the sign-in page after the session ended) must not be stored under the cameraman URL.
        if (response.ok && !response.redirected && CAMERAMAN_PAGE.test(url.pathname)) (await caches.open(PAGE_CACHE)).put(request, response.clone())
        return response
      } catch {
        const cached = await caches.match(request, { cacheName: PAGE_CACHE })
        return cached || (await caches.match(OFFLINE_URL)) || Response.error()
      }
    })())
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'Ashmeet SMMA', body: event.data && event.data.text() } }
  const title = data.title || 'Ashmeet SMMA'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Same tag replaces instead of stacking, so a burst of events reads as one notification.
    tag: data.tag || 'general',
    renotify: false,
    data: { link: data.link || '/', id: data.id || null },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  const target = new URL(link, self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Reuse an open tab of this app rather than opening a duplicate.
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus()
        if ('navigate' in client) { try { await client.navigate(target) } catch { /* cross-origin or detached */ } }
        return
      }
    }
    await self.clients.openWindow(target)
  })())
})
