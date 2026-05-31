// SYLEX FOS — service worker (network-first, offline fallback)
const CACHE = 'fos-cache-v1';
const CORE = ['/', '/css/style.css', '/js/app.js', '/js/editor.bundle.js', '/js/meniny.js', '/img/icon-192.png', '/img/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // externé CDN nechaj tak
  if (url.pathname.startsWith('/api')) return;              // API priamo do siete (vrátane tokenu)
  // network-first, fallback do cache (aby sa nové verzie prejavili po deployi)
  e.respondWith(
    fetch(req).then(res => {
      const cp = res.clone();
      caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(m => m || caches.match('/')))
  );
});
