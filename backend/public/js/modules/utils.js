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
        formatPrice: formatPrice,
        formatChange: formatChange,
        looksLikePhone: looksLikePhone,
        customerDisplayName: customerDisplayName,
        visibleCustomerPhone: visibleCustomerPhone,
    };
})();
