/**
 * API Client — HTTP wrapper for dashboard requests
 * Load before dashboard.js. Init from dashboard after headers() is defined.
 */
(function () {
    'use strict';

    const config = { getHeaders: null, getLang: null, on401: null };

    function init(cfg) {
        config.getHeaders = cfg && cfg.getHeaders;
        config.getLang = cfg && cfg.getLang;
        config.on401 = cfg && cfg.on401;
    }

    async function apiFetch(url, opts) {
        const opt = opts || {};
        const h =
            opt.auth === false
                ? { 'Content-Type': 'application/json' }
                : config.getHeaders
                  ? config.getHeaders()
                  : { 'Content-Type': 'application/json' };
        if (opt.body instanceof FormData) {
            delete h['Content-Type'];
        }
        const apiBase = window.CRM_API_BASE != null ? window.CRM_API_BASE : '';
        let r, text;
        // Optional per-request timeout: only active when opt.timeoutMs is set, so
        // existing calls are unaffected. Prevents requests from hanging forever
        // (e.g. WhatsApp gateway status) and leaving the UI stuck on a loading state.
        let _ac = null;
        let _to = null;
        if (opt.timeoutMs && typeof AbortController !== 'undefined') {
            _ac = new AbortController();
            _to = setTimeout(function () {
                try { _ac.abort(); } catch (_e) {}
            }, opt.timeoutMs);
        }
        try {
            r = await fetch(apiBase + url, {
                ...opt,
                credentials: 'include',
                cache: opt.cache || 'no-store',
                headers: {
                    Accept: 'application/json',
                    ...h,
                    ...(opt.headers || {}),
                },
                body: opt.body,
                signal: _ac ? _ac.signal : opt.signal,
            });
            text = await r.text();
        } catch (e) {
        const lang = config.getLang ? config.getLang() : 'fa';
        const timedOut = !!(_ac && _ac.signal && _ac.signal.aborted);
        return {
            ok: false,
            needLogin: false,
            timeout: timedOut,
            error:
                lang === 'tr'
                    ? 'Sunucuya bağlanılamadı. Ağ veya sunucu adresini kontrol edin.'
                    : lang === 'fa'
                      ? 'اتصال به سرور برقرار نشد. شبکه یا آدرس سرور را بررسی کنید.'
                      : 'Could not connect to server. Check network or server address.',
        };
    } finally {
        if (_to) clearTimeout(_to);
    }
    if ((text || '').trim().startsWith('<')) {
        const lang2 = config.getLang ? config.getLang() : 'fa';
        const status = r && r.status ? r.status : 0;
        const sample = String(text || '').slice(0, 280).toLowerCase();
        const isCf =
            sample.indexOf('cloudflare') !== -1 ||
            sample.indexOf('cf-ray') !== -1 ||
            sample.indexOf('just a moment') !== -1;
        const isProxyTimeout = status === 502 || status === 504 || status === 524;
        let htmlErr;
        if (lang2 === 'fa') {
            if (isCf) htmlErr = 'پاسخ HTML از Cloudflare آمد (چالش یا خطای لبه). صفحه را رفرش کنید.';
            else if (isProxyTimeout)
                htmlErr = 'تایم‌اوت پراکسی (HTML ' + status + '). درخواست طولانی بود؛ دوباره تلاش کنید.';
            else
                htmlErr =
                    'پاسخ HTML به‌جای JSON' +
                    (status ? ' (HTTP ' + status + ')' : '') +
                    '. یک‌بار Ctrl+Shift+R بزنید؛ اگر ادامه داشت کش/Service Worker را پاک کنید.';
        } else if (lang2 === 'tr') {
            htmlErr = isCf
                ? 'Cloudflare HTML döndürdü. Sayfayı yenileyin.'
                : 'Sunucu JSON yerine HTML döndürdü' + (status ? ' (HTTP ' + status + ')' : '') + '.';
        } else {
            htmlErr = isCf
                ? 'Cloudflare returned HTML (challenge/edge). Refresh the page.'
                : 'Server returned HTML instead of JSON' +
                  (status ? ' (HTTP ' + status + ')' : '') +
                  '. Hard-refresh (Ctrl+Shift+R).';
        }
        try {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('[apiFetch] non-JSON HTML', { url: apiBase + url, status: status, preview: String(text || '').slice(0, 120) });
            }
        } catch (_e) {}
        return {
            ok: false,
            needLogin: false,
            status: status || undefined,
            error: htmlErr,
        };
    }
    let data;
    try {
        data = JSON.parse(text);
    } catch (_) {
        const lang3 = config.getLang ? config.getLang() : 'fa';
        return {
            ok: false,
            needLogin: false,
            error:
                lang3 === 'tr'
                    ? 'Sunucu yanıtı geçersiz'
                    : lang3 === 'fa'
                      ? 'پاسخ سرور معتبر نیست'
                      : 'Invalid server response',
        };
    }
    if (r.status === 401) {
        if (!opt.softAuth && typeof config.on401 === 'function') config.on401(data);
        const lang4 = config.getLang ? config.getLang() : 'fa';
        return {
            ok: false,
            needLogin: !opt.softAuth,
            softAuth: !!opt.softAuth,
            status: 401,
            data: data,
            error:
                data && data.error
                    ? data.error
                    : lang4 === 'tr'
                      ? 'Lütfen tekrar giriş yapın'
                      : lang4 === 'fa'
                        ? 'لطفاً دوباره وارد شوید'
                        : 'Please sign in again',
        };
    }
    if (r.status === 429) {
        const lang5 = config.getLang ? config.getLang() : 'fa';
        return {
            ok: false,
            needLogin: false,
            status: 429,
            data: data,
            error:
                (data && data.error) ||
                (lang5 === 'tr'
                    ? 'Çok fazla istek. Lütfen bir süre bekleyin.'
                    : lang5 === 'fa'
                      ? 'تعداد درخواست‌ها زیاد شده. چند ثانیه صبر کنید.'
                      : 'Too many requests. Please wait a moment.'),
        };
    }
    if (!r.ok && data && (data.error || data.message)) {
        return {
            ok: false,
            needLogin: r.status === 401,
            status: r.status,
            data: data,
            error: data.error || data.message,
        };
    }
    return { ok: r.ok, status: r.status, data: data };
}

function getApiError(res) {
    if (res && res.error) return res.error;
    if (res && res.data && (res.data.error || res.data.message))
        return res.data.error || res.data.message;
    const lang = config.getLang ? config.getLang() : 'fa';
    return lang === 'tr'
        ? 'Sunucu hatası'
        : lang === 'fa'
          ? 'خطا در ارتباط با سرور'
          : 'Server error';
}

    window.CRM = window.CRM || {};
    window.CRM.Api = {
        init: init,
        fetch: apiFetch,
        getError: getApiError,
    };
    window.CRM_API_BASE = window.CRM_API_BASE != null ? window.CRM_API_BASE : '';
})();
