/**
 * API Client — HTTP wrapper for dashboard requests
 * Load before dashboard.js. Init from dashboard after headers() is defined.
 */
(function () {
    'use strict';

    var config = { getHeaders: null, getLang: null, on401: null };

    function init(cfg) {
        config.getHeaders = cfg && cfg.getHeaders;
        config.getLang = cfg && cfg.getLang;
        config.on401 = cfg && cfg.on401;
    }

    async function apiFetch(url, opts) {
        var opt = opts || {};
        var h =
            opt.auth === false
                ? { 'Content-Type': 'application/json' }
                : config.getHeaders
                  ? config.getHeaders()
                  : { 'Content-Type': 'application/json' };
        if (opt.body instanceof FormData) {
            delete h['Content-Type'];
        }
        var apiBase = window.CRM_API_BASE != null ? window.CRM_API_BASE : '';
        var r, text;
        try {
            r = await fetch(apiBase + url, {
                ...opt,
                credentials: 'include',
                headers: { ...h, ...(opt.headers || {}) },
                body: opt.body,
            });
            text = await r.text();
        } catch (e) {
            var lang = config.getLang ? config.getLang() : 'fa';
            return {
                ok: false,
                needLogin: false,
                error:
                    lang === 'fa'
                        ? 'اتصال به سرور برقرار نشد. شبکه یا آدرس سرور را بررسی کنید.'
                        : 'Could not connect to server. Check network or server address.',
            };
        }
        if ((text || '').trim().startsWith('<')) {
            var lang2 = config.getLang ? config.getLang() : 'fa';
            return {
                ok: false,
                needLogin: false,
                error:
                    lang2 === 'fa'
                        ? 'سرور به جای JSON پاسخ داد. مطمئن شوید backend در حال اجراست.'
                        : 'Server returned non-JSON. Ensure backend is running.',
            };
        }
        var data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            var lang3 = config.getLang ? config.getLang() : 'fa';
            return {
                ok: false,
                needLogin: false,
                error:
                    lang3 === 'fa' ? 'پاسخ سرور معتبر نیست' : 'Invalid server response',
            };
        }
        if (r.status === 401) {
            if (typeof config.on401 === 'function') config.on401(data);
            var lang4 = config.getLang ? config.getLang() : 'fa';
            return {
                ok: false,
                needLogin: true,
                error:
                    data && data.error
                        ? data.error
                        : lang4 === 'fa'
                          ? 'لطفاً دوباره وارد شوید'
                          : 'Please sign in again',
            };
        }
        if (r.status === 429) {
            var lang5 = config.getLang ? config.getLang() : 'fa';
            return {
                ok: false,
                needLogin: false,
                error:
                    (data && data.error) ||
                    (lang5 === 'fa'
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
        var lang = config.getLang ? config.getLang() : 'fa';
        return lang === 'fa' ? 'خطا در ارتباط با سرور' : 'Server error';
    }

    window.CRM = window.CRM || {};
    window.CRM.Api = {
        init: init,
        fetch: apiFetch,
        getError: getApiError,
    };
    window.CRM_API_BASE = window.CRM_API_BASE != null ? window.CRM_API_BASE : '';
})();
