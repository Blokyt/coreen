// ═══════════════════════════════════════════════════
// BLOKAJA v2 — Service Worker (offline support)
// ═══════════════════════════════════════════════════

// Incrementer le numero apres chaque mise a jour de fichiers
const CACHE_NAME = 'blokaja-v2-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Pre-cache core assets on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Clean old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for cached assets, network-first for others
self.addEventListener('fetch', e => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Cache-first pour Google Fonts (changent rarement)
  const url = new URL(e.request.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      // If cached, serve immediately + update in background
      if (cached) {
        fetch(e.request).then(resp => {
          if (resp && resp.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, resp));
          }
        }).catch(() => {});
        return cached;
      }
      // Not cached: fetch from network, cache if same-origin
      return fetch(e.request).then(resp => {
        if (resp && resp.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
