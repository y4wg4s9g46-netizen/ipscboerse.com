const CACHE_NAME = 'ipscboerse-v79y-favorites-season-auth-visual';
const APP_SHELL_ASSETS = [
  './',
  'index.html',
  'app.html',
  'app-spa.js?v=79y',
  'native-shell.html',
  'native-shell.js?v=79y',
  'global.css?v=79y',
  'header.js?v=79y',
  'auth.js?v=79y',
  'app.js?v=79y',
  'lang.js?v=79y',
  'marktplatz.html',
  'mein-planer.html',
  'community.html',
  'freie-matches.html',
  'schiessbuch.html',
  'sg-timer-live.html',
  'tools.html',
  'analytics.html',
  'wiederladen.html',
  'ipsc-hub.html',
  'doppel-aa.html',
  'performance.html',
  'icon-192.png',
  'icon-512.png',
  'icon.png',
  'target.png',
  'manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_ASSETS).catch(() => undefined))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && /^ipscboerse-/i.test(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.href.includes('supabase.co') || url.href.includes('cdn.jsdelivr.net')) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(async () => {
        return (await caches.match(event.request)) || (await caches.match(url.pathname.split('/').pop() || 'index.html')) || new Response('Offline oder Ressource nicht verfügbar', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      })
  );
});
