
const CACHE = 'bingo-pwa-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  const { request } = e;
  e.respondWith(
    caches.match(request).then(cached=>{
      if (cached) return cached;
      return fetch(request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE).then(cache=>cache.put(request, copy)).catch(()=>{});
        return resp;
      }).catch(()=> cached)
    })
  );
});
