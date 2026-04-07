/**
 * زبان و ترجمهٔ داشبورد — بعد از i18n-fa.js / i18n-en.js / i18n-tr.js و قبل از dashboard.js
 * متغیر LANG سراسری است تا بقیهٔ dashboard.js به همان نام دسترسی داشته باشد.
 */
var LANG = localStorage.getItem('crm_lang') || 'fa';
var I18N = { fa: {}, en: {}, tr: {} };
if (window.__I18N_FA) Object.assign(I18N.fa, window.__I18N_FA);
if (window.__I18N_EN) Object.assign(I18N.en, window.__I18N_EN);
if (window.__I18N_TR) Object.assign(I18N.tr, window.__I18N_TR);
window.LANG = LANG;

window.t = function (k) {
    if (LANG === 'fa' && window.__I18N_FA && window.__I18N_FA[k] !== undefined) return window.__I18N_FA[k];
    if (LANG === 'en' && window.__I18N_EN && window.__I18N_EN[k] !== undefined) return window.__I18N_EN[k];
    if (LANG === 'tr' && window.__I18N_TR && window.__I18N_TR[k] !== undefined) return window.__I18N_TR[k];
    return (I18N[LANG] && I18N[LANG][k]) || (I18N.fa && I18N.fa[k]) || (I18N.en && I18N.en[k]) || (I18N.tr && I18N.tr[k]) || k;
};

window.setLang = function (l) {
    var supported = window.SUPPORTED_LANGUAGES || ['fa', 'en', 'tr'];
    if (supported.indexOf(l) < 0) l = supported[0] || 'fa';
    LANG = l;
    window.LANG = l;
    localStorage.setItem('crm_lang', l);
    document.documentElement.lang = l === 'en' ? 'en' : l === 'tr' ? 'tr' : 'fa';
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('ltr', l !== 'fa');
    document.querySelectorAll('.lang-switch button[data-lang], .lang-switch button[onclick*="setLang"]').forEach(function (btn) {
        var dataLang = btn.getAttribute('data-lang');
        var onclick = btn.getAttribute('onclick') || '';
        if (!dataLang && onclick.indexOf('setLang(') >= 0) {
            var m = onclick.match(/setLang\s*\(\s*['"]([a-z]+)['"]/);
            dataLang = m ? m[1] : null;
        }
        var active = dataLang && dataLang === l;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.style.display = dataLang && supported.indexOf(dataLang) < 0 ? 'none' : '';
    });
    var lbl = document.getElementById('langDropdownLabel');
    if (lbl) lbl.textContent = l === 'fa' ? 'FA' : l === 'tr' ? 'TR' : 'EN';
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    try {
        document.title = window.t('page_title');
    } catch (_e) {
        /* ignore */
    }
    if (typeof window.reapplyFxguardPublicBranding === 'function') window.reapplyFxguardPublicBranding();
};

window.applyTranslations = function () {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var k = el.getAttribute('data-i18n');
        if (k && t(k)) el.textContent = t(k);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
        var k = el.getAttribute('data-i18n-ph');
        if (k && t(k)) el.placeholder = t(k);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        var k = el.getAttribute('data-i18n-title');
        if (k && t(k)) {
            el.title = t(k);
            if (el.classList.contains('nav-link') && el.closest('.sidebar')) el.setAttribute('data-tooltip', t(k));
        }
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
        var k = el.getAttribute('data-i18n-aria-label');
        if (k && t(k)) el.setAttribute('aria-label', t(k));
    });
    if (typeof initSidebarCollapsedState === 'function') initSidebarCollapsedState();
};

window.SUPPORTED_LANGUAGES = window.SUPPORTED_LANGUAGES || ['fa', 'en', 'tr'];

(function applyInitialLang() {
    var l = localStorage.getItem('crm_lang') || 'fa';
    if (['fa', 'en', 'tr'].indexOf(l) >= 0) {
        LANG = l;
        window.LANG = l;
        document.documentElement.lang = l === 'en' ? 'en' : l === 'tr' ? 'tr' : 'fa';
        document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
        document.body.classList.toggle('ltr', l !== 'fa');
        if (typeof applyTranslations === 'function') applyTranslations();
        try {
            document.title = t('page_title');
        } catch (_) {
            /* ignore */
        }
    }
})();

window.applySupportedLanguages = function (supported, defaultLanguage) {
    window.SUPPORTED_LANGUAGES = Array.isArray(supported) && supported.length ? supported : ['fa', 'en', 'tr'];
    var cur = localStorage.getItem('crm_lang') || 'fa';
    if (window.SUPPORTED_LANGUAGES.indexOf(cur) < 0) {
        cur =
            defaultLanguage && window.SUPPORTED_LANGUAGES.indexOf(defaultLanguage) >= 0
                ? defaultLanguage
                : window.SUPPORTED_LANGUAGES[0] || 'fa';
        localStorage.setItem('crm_lang', cur);
    }
    if (typeof setLang === 'function') setLang(cur);
    document.querySelectorAll('.lang-switch').forEach(function (wrap) {
        wrap.style.display = window.SUPPORTED_LANGUAGES.length <= 1 ? 'none' : '';
    });
};
