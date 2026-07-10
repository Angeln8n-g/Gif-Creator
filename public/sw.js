const CACHE_NAME = 'wasm-and-models-cache-v1';
const URLS_TO_CACHE_MATCHERS = [
  'unpkg.com/@ffmpeg/core',
  'unpkg.com/@imgly/background-removal-data',
  'unpkg.com/@imgly/background-removal'
];

self.addEventListener('install', () => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  
  // Only cache GET requests that match our unpkg CDN resources
  const isGet = event.request.method === 'GET';
  const shouldCache = URLS_TO_CACHE_MATCHERS.some(matcher => requestUrl.includes(matcher));
  
  if (isGet && shouldCache) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', requestUrl);
            return cachedResponse;
          }
          
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              console.log('[SW] Caching resource:', requestUrl);
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.error('[SW] Fetch failed for:', requestUrl, err);
            throw err;
          });
        });
      })
    );
  }
});
