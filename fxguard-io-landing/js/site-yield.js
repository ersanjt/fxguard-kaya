/**
 * FXGuard site yield system — performance + conversion helpers.
 * Privacy-friendly: stores UTMs locally, optional dataLayer push (no third-party by default).
 */
(function (w, d) {
  'use strict';

  var STORAGE_UTM = 'fxg_utm';
  var STORAGE_EVENTS = 'fxg_events';
  var MAX_EVENTS = 40;

  function qs(sel, root) { return (root || d).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function parseUtms() {
    var params = new URLSearchParams(w.location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
    var found = {};
    var hit = false;
    keys.forEach(function (k) {
      var v = params.get(k);
      if (v) { found[k] = v; hit = true; }
    });
    if (hit) {
      found.landing = w.location.pathname;
      found.ts = Date.now();
      safeSet(STORAGE_UTM, JSON.stringify(found));
      return found;
    }
    try { return JSON.parse(safeGet(STORAGE_UTM) || 'null') || {}; } catch (e) { return {}; }
  }

  function pushEvent(name, payload) {
    var row = Object.assign({ name: name, path: w.location.pathname, ts: Date.now() }, payload || {});
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(Object.assign({ event: 'fxg_' + name }, row));
    try {
      var list = JSON.parse(safeGet(STORAGE_EVENTS) || '[]');
      if (!Array.isArray(list)) list = [];
      list.push(row);
      if (list.length > MAX_EVENTS) list = list.slice(-MAX_EVENTS);
      safeSet(STORAGE_EVENTS, JSON.stringify(list));
    } catch (e) {}
  }

  function utmSuffix(utm) {
    if (!utm || !utm.utm_source) return '';
    var parts = [];
    if (utm.utm_source) parts.push('src=' + utm.utm_source);
    if (utm.utm_campaign) parts.push('cmp=' + utm.utm_campaign);
    if (utm.utm_medium) parts.push('med=' + utm.utm_medium);
    return parts.length ? '\n[' + parts.join(' | ') + ']' : '';
  }

  function enhanceWhatsAppLinks(utm, force) {
    var suffix = utmSuffix(utm);
    if (!suffix) return;
    qsa('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach(function (a) {
      if (!force && a.getAttribute('data-utm-applied') === '1') return;
      try {
        var url = new URL(a.href);
        var text = url.searchParams.get('text') || '';
        if (text.indexOf('[src=') !== -1) {
          a.setAttribute('data-utm-applied', '1');
          return;
        }
        url.searchParams.set('text', text + suffix);
        a.href = url.toString();
        a.setAttribute('data-utm-applied', '1');
      } catch (e) {}
    });
  }

  function fillLeadFields() {
    var utm = {};
    try { utm = JSON.parse(safeGet(STORAGE_UTM) || '{}') || {}; } catch (e) { utm = {}; }
    qsa('form').forEach(function (form) {
      function setHidden(name, value) {
        var el = form.querySelector('input[name="' + name + '"]');
        if (el) el.value = value || '';
      }
      setHidden('utm_source', utm.utm_source);
      setHidden('utm_medium', utm.utm_medium);
      setHidden('utm_campaign', utm.utm_campaign);
      setHidden('landing_path', utm.landing || w.location.pathname);
      var langEl = form.querySelector('input[name="lang"]');
      if (langEl) langEl.value = d.documentElement.getAttribute('data-lang') || d.documentElement.lang || 'en';
    });
  }

  function reapplyWa() {
    var utm = {};
    try { utm = JSON.parse(safeGet(STORAGE_UTM) || '{}') || {}; } catch (e) { utm = {}; }
    qsa('a[href*="wa.me"], a[href*="whatsapp.com"]').forEach(function (a) {
      a.removeAttribute('data-utm-applied');
    });
    enhanceWhatsAppLinks(utm, true);
  }

  function trackCtas(utm) {
    d.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
      if (!a || !a.href) return;
      var href = a.getAttribute('href') || '';
      var kind = 'link';
      if (a.classList.contains('js-wa-link') || href.indexOf('wa.me') !== -1) kind = 'whatsapp';
      else if (a.classList.contains('js-panel-link') || href.indexOf('app.fxguard.io') !== -1) kind = 'demo';
      else if (href.indexOf('/pay') !== -1) kind = 'pay';
      else if (href.indexOf('/pricing') !== -1) kind = 'pricing';
      else if (href.indexOf('/contact') !== -1) kind = 'contact';
      else if (href.indexOf('/procurement') !== -1) kind = 'procurement';
      else if (href.indexOf('/live-demo') !== -1) kind = 'live_demo';
      else if (href.indexOf('/thanks') !== -1) kind = 'thanks';
      else if (a.classList.contains('btn-wa') || a.classList.contains('btn-primary')) kind = 'cta';
      else return;
      pushEvent('cta_click', {
        kind: kind,
        href: href.slice(0, 180),
        label: (a.textContent || '').trim().slice(0, 80),
        utm_source: utm.utm_source || null
      });
    }, { capture: true, passive: true });
  }

  function idlePrefetch() {
    if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''))) return;
    var targets = ['/pricing', '/live-demo', '/contact', '/whatsapp-crm', '/pay'];
    var path = w.location.pathname.replace(/\/$/, '') || '/';
    var run = function () {
      targets.forEach(function (url) {
        if (path === url || path.indexOf(url) === 0) return;
        var link = d.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        d.head.appendChild(link);
      });
    };
    if ('requestIdleCallback' in w) w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 2500);
  }

  function ensureLazyImages() {
    qsa('img:not([loading])').forEach(function (img, i) {
      if (img.hasAttribute('fetchpriority') && img.getAttribute('fetchpriority') === 'high') return;
      if (i === 0 && img.closest('.hero, .blog-hero-figure, .blog-featured')) return;
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  }

  function ensureStickyBuy() {
    if (qs('#stickyBuy')) return;
    return;
  }

  function ensureWaFloat() {
    if (qs('.wa-float')) return;
    return;
  }

  function contentVisibility() {
    qsa('.section, .seo-related, .blog-hub, .blog-grid, .site-footer').forEach(function (el) {
      if (!el.style.contentVisibility) {
        el.style.contentVisibility = 'auto';
        el.style.containIntrinsicSize = '1px 600px';
      }
    });
  }

  function boot() {
    var utm = parseUtms();
    pushEvent('page_view', { utm_source: utm.utm_source || null, lang: d.documentElement.getAttribute('data-lang') || d.documentElement.lang });
    enhanceWhatsAppLinks(utm);
    trackCtas(utm);
    ensureLazyImages();
    ensureStickyBuy();
    ensureWaFloat();
    contentVisibility();
    idlePrefetch();
    fillLeadFields();

    if (d.body && d.body.getAttribute('data-page') === 'thanks') {
      var purpose = '';
      try { purpose = new URLSearchParams(w.location.search).get('purpose') || ''; } catch (e) {}
      pushEvent('lead_thanks', { purpose: purpose, utm_source: utm.utm_source || null });
    }

    setTimeout(function () { reapplyWa(); fillLeadFields(); }, 800);
    w.FXG_YIELD = {
      getUtm: function () { try { return JSON.parse(safeGet(STORAGE_UTM) || '{}'); } catch (e) { return {}; } },
      getEvents: function () { try { return JSON.parse(safeGet(STORAGE_EVENTS) || '[]'); } catch (e) { return []; } },
      track: pushEvent,
      reapplyWa: reapplyWa,
      fillLeadFields: fillLeadFields
    };
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
