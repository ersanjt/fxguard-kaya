(function () {
    'use strict';

    const endpoint = '/api/client-errors';
    let sentCount = 0;
    const maxSends = 5;

    function post(payload) {
        if (sentCount >= maxSends) return;
        sentCount += 1;
        try {
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload || {})
            }).catch(function () {});
        } catch (_) {}
    }

    window.addEventListener('error', function (event) {
        try {
            post({
                eventType: 'window.error',
                message: event && event.message ? String(event.message) : 'Unknown error',
                source: event && event.filename ? String(event.filename) : '',
                line: event && event.lineno ? Number(event.lineno) : null,
                col: event && event.colno ? Number(event.colno) : null,
                stack: event && event.error && event.error.stack ? String(event.error.stack).slice(0, 3000) : '',
                pageUrl: window.location.href
            });
        } catch (_) {}
    });

    window.addEventListener('unhandledrejection', function (event) {
        try {
            const reason = event && event.reason;
            let message = '';
            let stack = '';
            if (reason && typeof reason === 'object') {
                message = reason.message || JSON.stringify(reason);
                stack = reason.stack || '';
            } else {
                message = String(reason || 'Unhandled promise rejection');
            }
            post({
                eventType: 'unhandledrejection',
                message: String(message).slice(0, 1200),
                stack: String(stack).slice(0, 3000),
                pageUrl: window.location.href
            });
        } catch (_) {}
    });
})();
