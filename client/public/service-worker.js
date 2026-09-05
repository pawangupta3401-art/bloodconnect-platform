// BloodConnect & LifeStream PRO — Progressive Web App Service Worker
const CACHE_NAME = 'bloodconnect-v1.2'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/blood-drop.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg'
]

// ── Install Event: Cache Core App Shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some static assets failed to precache:', err)
      })
    }).then(() => {
      return self.skipWaiting()
    })
  )
})

// ── Activate Event: Clean up stale caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// ── Fetch Event: Network First with Cache Fallback ──
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Skip non-GET or cross-origin external API / socket requests
  if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return
  }

  // For navigation requests (HTML pages), try network first, then cache index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html') || caches.match('/')
      })
    )
    return
  }

  // For static assets (JS, CSS, Images, Fonts), use Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          return cachedResponse
        })

      return cachedResponse || fetchPromise
    })
  )
})

// ── Background Sync / Push Notification hooks (Simulated Ready) ──
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '🚨 BloodConnect Emergency SOS'
  const options = {
    body: data.body || 'Immediate blood donation needed in your area.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/donor' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})
