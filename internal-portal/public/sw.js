// Service Worker — SELF-DESTRUCT / KILL SWITCH
//
// A previous version of this app registered a caching service worker that
// kept serving a stale application shell (old dashboard UI) to returning
// visitors. This worker replaces it: on activation it unregisters itself,
// deletes every cache, and force-reloads open tabs so clients always load
// the freshly deployed assets from the network. It never intercepts fetches.

self.addEventListener('install', () => {
  // Activate immediately, bypassing the waiting phase.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Delete all caches created by the old worker.
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (e) {
        // ignore
      }

      try {
        // 2. Unregister this service worker entirely.
        await self.registration.unregister();
      } catch (e) {
        // ignore
      }

      try {
        // 3. Force every controlled tab to reload from the network.
        const clientList = await self.clients.matchAll({ type: 'window' });
        clientList.forEach((client) => {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        });
      } catch (e) {
        // ignore
      }
    })()
  );
});

// Intentionally NO fetch handler: all requests go straight to the network.
