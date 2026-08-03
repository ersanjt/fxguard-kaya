/**
 * Landing PWA SW — retired.
 * Older versions intercepted /api and returned landing HTML, which made the CRM
 * show «سرور به جای JSON پاسخ داد». This build clears caches and unregisters.
 */
self.addEventListener('install', function (event) {
    self.skipWaiting();
    event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches
            .keys()
            .then(function (keys) {
                return Promise.all(
                    keys.map(function (key) {
                        return caches.delete(key);
                    })
                );
            })
            .then(function () {
                return self.registration.unregister();
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

// Do not intercept any requests while this worker is briefly active.
self.addEventListener('fetch', function () {});
