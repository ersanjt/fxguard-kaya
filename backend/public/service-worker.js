const CACHE_NAME = 'kaya-landing-v1';
const CORE_ASSETS = [
    '/',
    '/landing.html',
    '/css/style.css',
    '/css/landing.css',
    '/js/landing.js',
    '/manifest.json'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(CORE_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.map(function(key) {
                    if (key !== CACHE_NAME) return caches.delete(key);
                    return null;
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request)
                .then(function(response) {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, cloned);
                    });
                    return response;
                })
                .catch(function() {
                    return caches.match('/landing.html');
                });
        })
    );
});
