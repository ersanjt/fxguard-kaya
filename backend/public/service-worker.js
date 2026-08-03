const CACHE_NAME = 'kaya-landing-v2';
const CORE_ASSETS = [
    '/',
    '/landing.html',
    '/css/style.css',
    '/css/landing.css',
    '/js/landing.js',
    '/manifest.json'
];

function isLandingAsset(url) {
    try {
        const u = new URL(url);
        const p = u.pathname || '/';
        if (p === '/' || p === '/landing.html') return true;
        if (p.indexOf('/css/') === 0) return true;
        if (p.indexOf('/js/landing') === 0) return true;
        if (p === '/manifest.json') return true;
        return false;
    } catch (_) {
        return false;
    }
}

function shouldBypass(request) {
    if (request.method !== 'GET') return true;
    try {
        const u = new URL(request.url);
        const p = u.pathname || '';
        // هرگز API / WebSocket / پنل / آپلود را کش یا fallback نکن
        if (p.indexOf('/api/') === 0) return true;
        if (p.indexOf('/socket.io') === 0) return true;
        if (p.indexOf('/uploads/') === 0) return true;
        if (p.indexOf('/dashboard') === 0) return true;
        if (p.indexOf('/login') === 0) return true;
        if (p.indexOf('/health') === 0) return true;
        return false;
    } catch (_) {
        return true;
    }
}

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
    if (shouldBypass(event.request)) return;

    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request)
                .then(function(response) {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    if (!isLandingAsset(event.request.url)) {
                        return response;
                    }
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, cloned);
                    });
                    return response;
                })
                .catch(function() {
                    // فقط برای صفحات لندینگ؛ نه برای API
                    if (isLandingAsset(event.request.url)) {
                        return caches.match('/landing.html');
                    }
                    return Response.error();
                });
        })
    );
});
