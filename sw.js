const CACHE_NAME = 'ipscboerse-v79bi-analytics-layout-course';
const APP_SHELL_ASSETS = [
    './',
    'index.html',
  'app.html',
  'app-spa.js',
    'native-shell.html',
    'native-shell.js?v=77e',
    'global.css?v=77e',
    'header.js?v=77e',
    'auth.js?v=77e',
    'app.js?v=77e',
    'lang.js?v=77e',
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
    'elo-check.html',
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
        caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => clients.claim())
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
                const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
                if (cachedResponse) return cachedResponse;
                return new Response('Offline oder Ressource nicht verfügbar', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            })
    );
});
