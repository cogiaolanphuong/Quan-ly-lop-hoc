// Service worker for "Quản lý Lớp học" — enables offline use + installability once hosted over https.
// Strategy: stale-while-revalidate. Serve from cache instantly when available (fast + works offline),
// while always fetching fresh copies in the background to keep the cache up to date for next time.

const CACHE_NAME = 'qllop1-cache-v3'; // bump version whenever cached assets (icons, etc.) change, to force old cache to be discarded
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './xem-bao-cao.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // don't block install if e.g. offline on first install
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // only cache safe, idempotent requests

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then(resp => {
          // cache successful same-origin responses and opaque cross-origin ones (CDN scripts/fonts)
          if (resp && (resp.ok || resp.type === 'opaque')) {
            cache.put(req, resp.clone());
          }
          return resp;
        })
        .catch(() => null);

      // return cached immediately if we have it (instant + offline-capable);
      // otherwise wait for the network
      return cached || (await networkFetch) || new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
