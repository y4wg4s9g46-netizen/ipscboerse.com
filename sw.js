const CACHE_NAME = 'ipsc-pwa-v2';

// Install-Event
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Activate-Event
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

// Fetch-Event
self.addEventListener('fetch', event => {

    // Supabase immer direkt durchlassen
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(

        fetch(event.request)

            .catch(async () => {

                const cachedResponse = await caches.match(event.request);

                // Falls etwas im Cache liegt → verwenden
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Niemals null/undefined zurückgeben!
                return new Response(
                    'Offline oder Ressource nicht verfügbar',
                    {
                        status: 503,
                        headers: {
                            'Content-Type': 'text/plain'
                        }
                    }
                );

            })

    );

});
