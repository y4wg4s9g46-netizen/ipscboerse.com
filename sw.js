const CACHE_NAME = 'ipsc-pwa-v76p';

// Install-Event: Wird aufgerufen, wenn der Service Worker das erste Mal registriert wird
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Activate-Event: Räumt alte Caches auf, falls wir später die Version ändern
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

// Fetch-Event: Leitet alle Netzwerkanfragen weiter. Falls offline, sucht er im Cache.
self.addEventListener('fetch', event => {
    // Supabase API-Calls ignorieren, die brauchen immer das Internet
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(async () => {
            const cachedResponse = await caches.match(event.request);

            if (cachedResponse) {
                return cachedResponse;
            }

            return new Response('Offline oder Ressource nicht verfügbar', {
                status: 503,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                }
            });
        })
    );
});
