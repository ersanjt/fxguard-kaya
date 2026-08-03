/**
 * Kaya CRM — Bootstrap صفحه ورود داخل /dashboard
 * @file    public/js/modules/dashboard-login-bootstrap.js
 * @layer   frontend/dashboard
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * زبان و برندینگ قبل از نمایش (بدون فلش استایل).
 */
(function (global) {
    'use strict';

    var BRANDING_KEY = 'crm_panel_branding_v1';
    var LANGUAGES_KEY = 'crm_panel_languages_v1';

    function isFxguardHost() {
        try {
            return !!global.FXGUARD_PUBLIC_SITE || /^app\.fxguard\.io$/i.test(global.location.hostname || '');
        } catch (_e) {
            return !!global.FXGUARD_PUBLIC_SITE;
        }
    }

    function hasAuthToken() {
        try {
            var t = global.sessionStorage.getItem('crm_token');
            return !!(t && t.length);
        } catch (_e) {
            return false;
        }
    }

    function isDashboardPage() {
        try {
            var p = String(global.location.pathname || '').toLowerCase();
            return p === '/dashboard' || p === '/dashboard/' || p.endsWith('/dashboard.html');
        } catch (_e) {
            return false;
        }
    }

    function readCache() {
        var branding = null;
        var languages = null;
        try {
            branding = JSON.parse(global.localStorage.getItem(BRANDING_KEY) || 'null');
        } catch (_e) {
            branding = null;
        }
        try {
            languages = JSON.parse(global.localStorage.getItem(LANGUAGES_KEY) || 'null');
        } catch (_e) {
            languages = null;
        }
        return { branding: branding, languages: languages };
    }

    function writeCache(branding, languages) {
        try {
            if (branding) global.localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
            if (languages) global.localStorage.setItem(LANGUAGES_KEY, JSON.stringify(languages));
        } catch (_e) {
            /* ignore */
        }
    }

    function normalizeSupported(languages) {
        var supported =
            languages && Array.isArray(languages.supportedLanguages) && languages.supportedLanguages.length
                ? languages.supportedLanguages.slice()
                : ['fa', 'en', 'tr'];
        var defaultLanguage =
            languages && languages.defaultLanguage && supported.indexOf(languages.defaultLanguage) >= 0
                ? languages.defaultLanguage
                : supported[0] || (isFxguardHost() ? 'en' : 'fa');
        if (isFxguardHost()) {
            supported = ['en', 'tr'];
            if (supported.indexOf(defaultLanguage) < 0) defaultLanguage = 'en';
        }
        return { supported: supported, defaultLanguage: defaultLanguage };
    }

    function pickLang(stored, defaultLanguage, supported) {
        var lang = stored || defaultLanguage || (isFxguardHost() ? 'en' : 'fa');
        if (isFxguardHost()) {
            if (lang === 'fa' || supported.indexOf(lang) < 0) lang = 'en';
        } else if (supported.indexOf(lang) < 0) {
            lang = defaultLanguage || supported[0] || 'fa';
        }
        return lang;
    }

    function applyLangEarly(l) {
        var html = document.documentElement;
        html.lang = l === 'en' ? 'en' : l === 'tr' ? 'tr' : 'fa';
        html.dir = l === 'fa' ? 'rtl' : 'ltr';
        if (document.body) document.body.classList.toggle('ltr', l !== 'fa');
        global.LANG = l;
        try {
            global.localStorage.setItem('crm_lang', l);
        } catch (_e) {
            /* ignore */
        }
    }

    function applyAccentCss(root, color) {
        if (!root || !color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
        var r = parseInt(color.slice(1, 3), 16);
        var g = parseInt(color.slice(3, 5), 16);
        var b = parseInt(color.slice(5, 7), 16);
        var hoverHex =
            '#' +
            [r, g, b]
                .map(function (x) {
                    return Math.max(0, Math.min(255, x - 20)).toString(16).padStart(2, '0');
                })
                .join('');
        root.style.setProperty('--accent', color);
        root.style.setProperty('--accent-hover', hoverHex);
        root.style.setProperty('--accent-soft', 'rgba(' + r + ',' + g + ',' + b + ',0.15)');
    }

    function resolveLoginLogoSrc(b) {
        if (!b) return '/brand/kaya-logo.png';
        var login = b.loginLogoUrl && String(b.loginLogoUrl).trim();
        if (login) return login;
        var logo = b.logoUrl && String(b.logoUrl).trim();
        return logo || '/brand/kaya-logo.png';
    }

    function applyBrandingEarly(b) {
        if (!b) return;
        var root = document.documentElement;
        if (b.primaryColor) applyAccentCss(root, b.primaryColor);
        if (b.pageTitle) document.title = b.pageTitle;
        else if (b.loginTitle) document.title = b.loginTitle;
        var fav = document.getElementById('favicon');
        var favHref = (b.faviconUrl && String(b.faviconUrl).trim()) || (b.logoUrl && String(b.logoUrl).trim()) || '/brand/kaya-favicon-32.png';
        if (fav) fav.href = favHref;
        var ath = document.getElementById('appleTouchIcon');
        if (ath) ath.href = (b.faviconUrl || b.loginLogoUrl || b.logoUrl || '/brand/kaya-apple-touch.png');
        var amTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (amTitle && b.siteName) amTitle.setAttribute('content', b.siteName);
        if (b.uiTheme && b.uiTheme !== 'default' && document.body) {
            document.body.classList.remove('theme-minimal', 'theme-dark', 'theme-light', 'theme-ocean', 'theme-warm');
            document.body.classList.add('theme-' + b.uiTheme);
        }
    }

    function applyBrandingDom(b, lang) {
        if (!b || !document.body) return;
        applyBrandingEarly(b);
        var loginTitleEl = document.getElementById('loginTitle');
        if (loginTitleEl) {
            loginTitleEl.textContent =
                b.loginTitle && String(b.loginTitle).trim()
                    ? b.loginTitle
                    : lang === 'fa'
                      ? 'پورتال کارکنان کایا'
                      : 'Kaya Staff Portal';
        }
        var src = resolveLoginLogoSrc(b);
        ['loginLogo', 'loginLogoTotp'].forEach(function (id) {
            var c = document.getElementById(id);
            if (!c) return;
            if (src) {
                c.innerHTML =
                    '<img src="' +
                    src.replace(/"/g, '&quot;') +
                    '" alt="" style="width:' +
                    (id === 'loginLogoTotp' ? 40 : 48) +
                    'px;height:' +
                    (id === 'loginLogoTotp' ? 40 : 48) +
                    'px;object-fit:contain">';
            }
        });
        if (b.fontFamily && String(b.fontFamily).trim()) {
            document.documentElement.style.setProperty('--font', String(b.fontFamily).trim());
            document.documentElement.style.setProperty('--font-ltr', String(b.fontFamily).trim());
        }
    }

    function applyLangSwitchVisibility(supported) {
        if (!document.body || !supported) return;
        document.querySelectorAll('.lang-switch').forEach(function (wrap) {
            wrap.style.display = supported.length <= 1 ? 'none' : '';
        });
    }

    function initHead() {
        var cache = readCache();
        var langPack = normalizeSupported(cache.languages);
        var stored = null;
        try {
            stored = global.localStorage.getItem('crm_lang');
        } catch (_e) {
            stored = null;
        }
        var lang = pickLang(stored, langPack.defaultLanguage, langPack.supported);
        applyLangEarly(lang);
        global.SUPPORTED_LANGUAGES = langPack.supported;
        if (cache.branding) applyBrandingEarly(cache.branding);
        // Dashboard always verifies session via cookie before showing the app.
        if (isDashboardPage() || hasAuthToken()) document.documentElement.classList.add('auth-verifying');
    }

    function onDomReady() {
        var cache = readCache();
        var lang = global.LANG || 'fa';
        if (cache.branding) applyBrandingDom(cache.branding, lang);
        if (cache.languages) {
            var pack = normalizeSupported(cache.languages);
            global.SUPPORTED_LANGUAGES = pack.supported;
            applyLangSwitchVisibility(pack.supported);
        }
    }

    function markReady() {
        document.documentElement.classList.remove('login-boot-pending');
    }

    function setAuthenticated() {
        document.documentElement.classList.remove('auth-verifying', 'login-boot-pending');
        document.documentElement.classList.add('auth-has-token');
    }

    function setLoggedOut() {
        document.documentElement.classList.remove('auth-has-token', 'auth-verifying');
    }

    function fetchPublicSettings() {
        return Promise.all([
            fetch('/api/panel-settings/public/branding')
                .then(function (r) {
                    return r.json();
                })
                .catch(function () {
                    return null;
                }),
            fetch('/api/panel-settings/public/languages')
                .then(function (r) {
                    return r.json();
                })
                .catch(function () {
                    return null;
                })
        ]).then(function (pair) {
            var data = { branding: pair[0], languages: pair[1] };
            writeCache(data.branding, data.languages);
            return data;
        });
    }

    initHead();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDomReady);
    else onDomReady();

    var readyPromise = fetchPublicSettings().then(function (data) {
        var lang = global.LANG || 'fa';
        if (data.branding) applyBrandingDom(data.branding, lang);
        if (data.languages) {
            var pack = normalizeSupported(data.languages);
            global.SUPPORTED_LANGUAGES = pack.supported;
            applyLangSwitchVisibility(pack.supported);
        }
        return new Promise(function (resolve) {
            function deliver() {
                resolve(data);
            }
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    setTimeout(deliver, 0);
                });
            } else {
                setTimeout(deliver, 0);
            }
        });
    });

    global.LoginBootstrap = {
        readyPromise: readyPromise,
        markReady: markReady,
        setAuthenticated: setAuthenticated,
        setLoggedOut: setLoggedOut,
        cachePanelBranding: function (b) {
            writeCache(b, null);
        },
        cachePanelLanguages: function (languages) {
            writeCache(null, languages);
        }
    };
})(window);
