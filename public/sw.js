/* public/sw.js */
const CACHE_NAME = 'pool-app-v1';
const APP_SHELL = [
  '/', '/index.html',
  '/manifest.webmanifest',
  // Vite will fingerprint assets; runtime will still cache after first load.
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API; fallback to cache if available.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(event.request);
        return net;
      } catch {
        const cache = await caches.match(event.request);
        if (cache) return cache;
        // As last resort, generic response so UI can fallback to localStorage
        return new Response(JSON.stringify({ offline: true }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // Cache-first for everything else (app shell)
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const net = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, net.clone());
      return net;
    } catch {
      return cached || Response.error();
    }
  })());
});
