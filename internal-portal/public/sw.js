// Service Worker for PWA
// Phase 5: PWA Architecture & Geolocation Innovation

const CACHE_NAME = 'scratch-solid-pwa-v1';
const STATIC_CACHE = 'scratch-solid-static-v1';
const API_CACHE = 'scratch-solid-api-v1';

// Cache-first strategy for static assets
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Cache-first strategy for salary preview with 12-hour TTL
const SALARY_PREVIEW_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

// Cache-first strategy for KPI score with 1-hour TTL
const KPI_SCORE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-first for static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Cache-first for salary preview API with TTL
  if (url.pathname.includes('/api/v2/staff/salary-preview')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            const cachedTime = parseInt(response.headers.get('cached-at') || '0');
            if (Date.now() - cachedTime < SALARY_PREVIEW_CACHE_DURATION) {
              return response;
            }
          }
          return fetch(event.request).then((response) => {
            const responseClone = response.clone();
            responseClone.headers.set('cached-at', Date.now().toString());
            cache.put(event.request, responseClone);
            return response;
          });
        });
      })
    );
    return;
  }

  // Cache-first for KPI score API with TTL
  if (url.pathname.includes('/api/v2/staff/kpi-score')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            const cachedTime = parseInt(response.headers.get('cached-at') || '0');
            if (Date.now() - cachedTime < KPI_SCORE_CACHE_DURATION) {
              return response;
            }
          }
          return fetch(event.request).then((response) => {
            const responseClone = response.clone();
            responseClone.headers.set('cached-at', Date.now().toString());
            cache.put(event.request, responseClone);
            return response;
          });
        });
      })
    );
    return;
  }

  // Network-first for other API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Network-first for other requests
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocationData());
  }
  if (event.tag === 'sync-booking-updates') {
    event.waitUntil(syncBookingUpdates());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Scratch Solid', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Placeholder functions for background sync
async function syncLocationData() {
  // Sync cached location data when back online
  console.log('Syncing location data...');
}

async function syncBookingUpdates() {
  // Sync booking updates when back online
  console.log('Syncing booking updates...');
}
