const CACHE_PREFIX = 'wu-operational-schedule-';
const CACHE_NAME = `${CACHE_PREFIX}a8d3b18ba5dbd7a8`;
const PRECACHE = [
  './index.html',
  './app.css',
  './app.js',
  './auth-config.js',
  './vendor/supabase.js',
  './js/plan-model.js',
  './js/account.js',
  './manifest.webmanifest',
  './data/schedule.json',
  './icons/agenda-192.png',
  './icons/agenda-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept an OAuth return or a personal API response. Cache only the
  // explicitly listed public app files, not arbitrary same-origin GET requests.
  if (url.searchParams.has('code') || url.searchParams.has('error') || event.request.headers.has('Authorization')) return;
  if (event.request.mode === 'navigate') {
    const rootPath = new URL('./', self.location.href).pathname;
    const indexPath = new URL('./index.html', self.location.href).pathname;
    if (url.search || ![rootPath, indexPath].includes(url.pathname)) return;
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)));
        }
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match('./index.html') || Response.error();
      })
    );
    return;
  }
  if (!PRECACHE.some(path => new URL(path, self.location.href).pathname === url.pathname)) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || !response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
