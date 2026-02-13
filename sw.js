
const CACHE_NAME = 'madrasah-app-v4';
const ASSETS = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // EXCEPTION: Never cache Supabase API calls or external dynamic resources
  if (url.hostname.includes('supabase.co') || url.hostname.includes('google.com')) {
    event.respondWith(
      fetch(event.request).catch(err => {
        console.error('[SW] API Fetch failed:', err);
        return new Response(JSON.stringify({ error: 'Network failure', details: err.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network First strategy for the app shell to ensure updates are seen
  if (ASSETS.includes(url.pathname) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First strategy for other static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(err => {
        console.error('[SW] Static Fetch failed:', err);
        throw err;
      });
    })
  );
});
