// MahMahMia service worker — makes the app shell work offline.
// Bump CACHE when the cached assets below change to invalidate old caches.
const CACHE = 'mahmahmia-v4';
const CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Note: no skipWaiting() here — a new worker stays in "waiting" so the page
  // can show an update prompt and skip on the user's command (see 'message').
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Let cross-origin requests (Supabase CDN/API) hit the network untouched.
  if (url.origin !== self.location.origin) return;

  // Network-first for page navigations so online users always get the latest
  // index.html; fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('/', fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match('/')) || (await caches.match('/index.html'));
      }
    })());
    return;
  }

  // Cache-first for same-origin static assets (icons, manifest, etc.).
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached;
    }
  })());
});
