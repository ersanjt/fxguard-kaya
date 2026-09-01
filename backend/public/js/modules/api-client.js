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

    function apiLang() {
        try {
            if (typeof config.getLang === 'function') return config.getLang() || 'fa';
        } catch (_e) {}
        return typeof window.LANG === 'string' && window.LANG ? window.LANG : 'fa';
    }

    function apiMsg(key, fa, en, tr) {
        try {
            if (typeof window.t === 'function') {
                var v = window.t(key);
                if (v != null && String(v) !== '' && v !== key) return v;
            }
        } catch (_e) {}
        var lang = apiLang();
        if (lang === 'tr') return tr;
        if (lang === 'en') return en;
        return fa;
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
        const timedOut = !!(_ac && _ac.signal && _ac.signal.aborted);
        return {
            ok: false,
            needLogin: false,
            timeout: timedOut,
            error: apiMsg(
                'api_err_network',
                'اتصال به سرور برقرار نشد. شبکه یا آدرس سرور را بررسی کنید.',
                'Could not connect to server. Check network or server address.',
                'Sunucuya bağlanılamadı. Ağ veya sunucu adresini kontrol edin.'
            ),
        };
    } finally {
        if (_to) clearTimeout(_to);
    }
    if ((text || '').trim().startsWith('<')) {
        const status = r && r.status ? r.status : 0;
        const sample = String(text || '').slice(0, 280).toLowerCase();
        const isCf =
            sample.indexOf('cloudflare') !== -1 ||
            sample.indexOf('cf-ray') !== -1 ||
            sample.indexOf('just a moment') !== -1;
        const isProxyTimeout = status === 502 || status === 504 || status === 524;
        let htmlErr;
        if (isCf) {
            htmlErr = apiMsg(
                'api_err_html_cf',
                'پاسخ HTML از Cloudflare آمد (چالش یا خطای لبه). صفحه را رفرش کنید.',
                'Cloudflare returned HTML (challenge/edge). Refresh the page.',
                'Cloudflare HTML döndürdü. Sayfayı yenileyin.'
            );
        } else if (isProxyTimeout) {
            htmlErr =
                apiMsg(
                    'api_err_html_proxy',
                    'تایم‌اوت پراکسی. درخواست طولانی بود؛ دوباره تلاش کنید.',
                    'Proxy timeout. The request took too long; try again.',
                    'Proxy zaman aşımı. İstek uzun sürdü; tekrar deneyin.'
                ) +
                (status ? ' (HTTP ' + status + ')' : '');
        } else {
            htmlErr =
                apiMsg(
                    'api_err_html',
                    'پاسخ HTML به‌جای JSON. یک‌بار Ctrl+Shift+R بزنید؛ اگر ادامه داشت کش را پاک کنید.',
                    'Server returned HTML instead of JSON. Hard-refresh (Ctrl+Shift+R).',
                    'Sunucu JSON yerine HTML döndürdü. Sayfayı yenileyin.'
                ) +
                (status ? ' (HTTP ' + status + ')' : '');
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
        return {
            ok: false,
            needLogin: false,
            error: apiMsg('api_err_invalid', 'پاسخ سرور معتبر نیست', 'Invalid server response', 'Sunucu yanıtı geçersiz'),
        };
    }
    if (r.status === 401) {
        if (!opt.softAuth && typeof config.on401 === 'function') config.on401(data);
        return {
            ok: false,
            needLogin: !opt.softAuth,
            softAuth: !!opt.softAuth,
            status: 401,
            data: data,
            error:
                data && data.error
                    ? data.error
                    : apiMsg('api_err_reauth', 'لطفاً دوباره وارد شوید', 'Please sign in again', 'Lütfen tekrar giriş yapın'),
        };
    }
    if (r.status === 429) {
        return {
            ok: false,
            needLogin: false,
            status: 429,
            data: data,
            error:
                (data && data.error) ||
                apiMsg(
                    'api_err_429',
                    'تعداد درخواست‌ها زیاد شده. چند ثانیه صبر کنید.',
                    'Too many requests. Please wait a moment.',
                    'Çok fazla istek. Lütfen bir süre bekleyin.'
                ),
        };
    }
    if (!r.ok && data && (data.error || data.message)) {
        const errVal = data.error || data.message;
        return {
            ok: false,
            needLogin: r.status === 401,
            status: r.status,
            data: data,
            error: typeof errVal === 'string' ? errVal : (errVal && errVal.message) || null,
        };
    }
    if (!r.ok) {
        let failMsg;
        if (r.status === 502 || r.status === 503) {
            failMsg = apiMsg(
                'api_err_gateway',
                'واتساپ/Gateway آماده نیست یا پیام به واتساپ نرسید. اتصال واتساپ را در تنظیمات بررسی کنید.',
                'WhatsApp Gateway is not ready or the message was not delivered.',
                'WhatsApp Gateway hazır değil veya mesaj iletilemedi. WhatsApp bağlantısını kontrol edin.'
            );
        } else {
            failMsg =
                apiMsg('api_err_http', 'خطای سرور', 'Server error', 'Sunucu hatası') +
                ' (HTTP ' +
                (r.status || '?') +
                ')';
        }
        return {
            ok: false,
            needLogin: r.status === 401,
            status: r.status,
            data: data,
            error: failMsg,
        };
    }
    return { ok: r.ok, status: r.status, data: data };
}

function getApiError(res) {
    if (res && typeof res.error === 'string' && res.error.trim()) return res.error;
    if (res && res.data) {
        const e = res.data.error || res.data.message;
        if (typeof e === 'string' && e.trim()) return e;
    }
    const status = res && res.status ? Number(res.status) : 0;
    if (status === 502 || status === 503) {
        return apiMsg(
            'api_err_gateway',
            'واتساپ/Gateway آماده نیست یا پیام ارسال نشد. اتصال واتساپ را بررسی کنید.',
            'WhatsApp Gateway is not ready or the message could not be delivered.',
            'WhatsApp Gateway hazır değil veya mesaj iletilemedi. Bağlantıyı kontrol edin.'
        );
    }
    if (status === 429) {
        return apiMsg(
            'api_err_429',
            'تعداد درخواست‌ها زیاد شده. چند ثانیه صبر کنید.',
            'Too many requests. Please wait.',
            'Çok fazla istek. Lütfen biraz bekleyin.'
        );
    }
    if (status >= 400) {
        return apiMsg('api_err_http', 'خطای سرور', 'Server error', 'Sunucu hatası') + ' (HTTP ' + status + ')';
    }
    return apiMsg('api_err_http', 'خطا در ارتباط با سرور', 'Server error', 'Sunucu hatası');
}

    window.CRM = window.CRM || {};
    window.CRM.Api = {
        init: init,
        fetch: apiFetch,
        getError: getApiError,
    };
    window.CRM_API_BASE = window.CRM_API_BASE != null ? window.CRM_API_BASE : '';
})();
