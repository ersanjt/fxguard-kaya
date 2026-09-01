/**
 * Dashboard utilities — formatting, escaping
 */
(function () {
    'use strict';

    function escapeHtml(s) {
        if (s == null) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function escapeAttr(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function dashboardLang() {
        try {
            return window.LANG || 'fa';
        } catch (_) {
            return 'fa';
        }
    }

    function formatPrice(val) {
        if (val == null || val === '' || val === '\u2014' || (typeof val === 'string' && val.trim() === '')) {
            return '\u2014';
        }
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
        if (isNaN(num)) return '\u2014';
        if (dashboardLang() !== 'fa') {
            return Math.round(num).toLocaleString('en-US');
        }
        const n = String(Math.round(num)).replace(/[^\d]/g, '');
        let out = '';
        if (n.length > 3) {
            for (let i = n.length - 1, c = 0; i >= 0; i--, c++) {
                if (c && c % 3 === 0) out = ',' + out;
                out = n[i] + out;
            }
        } else {
            out = n;
        }
        return out.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    }

    function formatChange(ch) {
        if (ch == null || ch === '') return '';
        const num = typeof ch === 'number' ? ch : parseFloat(String(ch));
        if (isNaN(num) || num === 0) return '';
        const abs = Math.abs(num);
        const s = abs >= 1000 ? abs.toLocaleString('en-US') : String(abs);
        if (dashboardLang() !== 'fa') {
            return (num > 0 ? '+' : '−') + s;
        }
        const fa = '۰۱۲۳۴۵۶۷۸۹';
        const out = s.replace(/\d/g, function (d) { return fa[d]; });
        return (num > 0 ? '+' : '−') + out;
    }

    function looksLikePhone(val) {
        const s = String(val || '').trim();
        if (!s || /@g\.us$/i.test(s)) return false;
        const stripped = s
            .replace(/^مشتری\s+/i, '')
            .replace(/^customer\s+/i, '')
            .replace(/^müşteri\s+/i, '')
            .trim();
        const compact = stripped.replace(/[\s.()+-]/g, '');
        if (/^\d{8,15}$/.test(compact)) return true;
        const digitCount = (stripped.match(/\d/g) || []).length;
        if (/^\+?\d[\d\s\-()]{7,22}$/.test(stripped) && digitCount >= 8) return true;
        return false;
    }

    function customerDisplayName(cust, opts) {
        opts = opts || {};
        const seePhone = !!opts.seePhone;
        const fallback = opts.fallback || 'مشتری';
        const c = cust || {};
        const rawName = String(c.name || '').trim();
        const phone = String(c.phone || '').trim();
        if (rawName && (seePhone || !looksLikePhone(rawName))) return rawName;
        if (seePhone && phone && !/@g\.us$/i.test(phone)) return phone;
        return fallback;
    }

    function visibleCustomerPhone(cust, seePhone) {
        if (!seePhone) return '';
        const p = String((cust && cust.phone) || '').trim();
        if (!p || /@g\.us$/i.test(p)) return '';
        return p;
    }

    window.CRM = window.CRM || {};
    window.CRM.Utils = {
        escapeHtml: escapeHtml,
        escapeAttr: escapeAttr,
        formatPrice: formatPrice,
        formatChange: formatChange,
        looksLikePhone: looksLikePhone,
        customerDisplayName: customerDisplayName,
        visibleCustomerPhone: visibleCustomerPhone,
    };

    /**
     * Tab cycle stays inside an open .modal-overlay so keyboard users
     * do not land on the dashboard behind the dimmer. Call once after DOM ready.
     */
    function bindModalA11y() {
        if (document.documentElement.getAttribute('data-crm-modal-a11y') === '1') return;
        document.documentElement.setAttribute('data-crm-modal-a11y', '1');

        function overlayIsOpen(overlay) {
            if (!overlay || overlay.hidden) return false;
            if (overlay.style.display === 'none') return false;
            var cs = window.getComputedStyle(overlay);
            return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
        }

        function focusableIn(root) {
            var nodes = root.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            return Array.prototype.filter.call(nodes, function (el) {
                return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
            });
        }

        function openOverlay() {
            var list = document.querySelectorAll('.modal-overlay');
            var found = null;
            for (var i = 0; i < list.length; i++) {
                if (overlayIsOpen(list[i])) found = list[i];
            }
            return found;
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab') return;
            var overlay = openOverlay();
            if (!overlay) return;
            var box = overlay.querySelector('.modal-box') || overlay;
            var items = focusableIn(box);
            if (!items.length) return;
            var first = items[0];
            var last = items[items.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first || !box.contains(document.activeElement)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (document.activeElement === last || !box.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
            }
        });

        var lastFocus = null;
        function onOverlayShown(overlay) {
            lastFocus = document.activeElement;
            var box = overlay.querySelector('.modal-box') || overlay;
            box.setAttribute('role', box.getAttribute('role') || 'dialog');
            box.setAttribute('aria-modal', 'true');
            var items = focusableIn(box);
            var prefer = box.querySelector('input:not([type="hidden"]), select, textarea, button.btn-primary');
            if (prefer && items.indexOf(prefer) >= 0) prefer.focus();
            else if (items[0]) items[0].focus();
        }

        document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
            var wasOpen = overlayIsOpen(overlay);
            if (wasOpen) onOverlayShown(overlay);
            var obs = new MutationObserver(function () {
                var now = overlayIsOpen(overlay);
                if (now && !wasOpen) onOverlayShown(overlay);
                if (!now && wasOpen && lastFocus && typeof lastFocus.focus === 'function') {
                    try { lastFocus.focus(); } catch (_) { /* ignore */ }
                }
                wasOpen = now;
            });
            obs.observe(overlay, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        });
    }

    window.CRM.Ui = window.CRM.Ui || {};
    window.CRM.Ui.bindModalA11y = bindModalA11y;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindModalA11y);
    } else {
        bindModalA11y();
    }
})();
