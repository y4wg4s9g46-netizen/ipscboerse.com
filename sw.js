const CACHE_NAME = 'ipscboerse-v79v-ui-auth-season-fix';
const APP_SHELL_ASSETS = [
  './',
  'index.html',
  'app.html',
  'app-spa.js?v=79v',
  'native-shell.html',
  'native-shell.js?v=79v',
  'global.css?v=79v',
  'header.js?v=79v',
  'auth.js?v=79v',
  'app.js?v=79v',
  'lang.js?v=79v',
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
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_ASSETS).catch(() => undefined)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && /^ipscboerse-v79v-ui-auth-season-fix'fetch', event => {
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
