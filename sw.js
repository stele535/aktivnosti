/* Service worker: aplikacija se otvara i bez interneta (samo vlastite datoteke). */
const CACHE = 'trening-v20';
const SHELL = ['./', 'index.html', 'config.js', 'core.js', 'files.js', 'trackview.js', 'share.js', 'analytics.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google/Drive ide direktno na mrežu
  // mreža prvo (da nove verzije stignu), predmemorija kao rezerva offline
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
