// Batangas City Info - service worker
// App shell: cache-first (works offline). Data: network-first, falls back to cache.
// Bump SHELL_VERSION whenever you change index.html, manifest or icons.
const SHELL_VERSION = 'v1';
const SHELL_CACHE = 'bcinfo-shell-' + SHELL_VERSION;
const DATA_CACHE = 'bcinfo-data';
const SHELL_FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'data.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('bcinfo-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Data: try the network first so updates arrive, keep a copy for offline use.
  if (url.pathname.endsWith('/data.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((c) => c.put('data.json', copy));
          }
          return res;
        })
        .catch(() =>
          caches.open(DATA_CACHE).then((c) => c.match('data.json')).then((r) => r || caches.match('data.json'))
        )
    );
    return;
  }

  // Everything else: cache-first, fall back to network, then to the app page.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : undefined));
    })
  );
});
