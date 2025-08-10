/* public/sw.js
 * PWA shell cache; NEVER cache /.auth/*; network-first for /api
 */
const CACHE_NAME = 'pool-app-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

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

  // 1) Never cache Azure Static Web Apps auth endpoints
  if (url.pathname.startsWith('/.auth/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 204 })));
    return;
  }

  // 2) Network-first for API; fallback to cache if available
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        const net = await fetch(event.request);
        return net;
      } catch {
        const cache = await caches.match(event.request);
        if (cache) return cache;
        return new Response(JSON.stringify({ offline: true }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // 3) Cache-first for app shell & static assets
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
