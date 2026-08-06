// Cleanup-only service worker. It removes older ConectaCup caches and then
// unregisters itself so the app is always served from the current deployment.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
      self.registration.unregister(),
    ])
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => {
          client.navigate(client.url);
        });
      })
  );
});

self.addEventListener('fetch', () => {
  return;
});
