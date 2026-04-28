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

    window.CRM = window.CRM || {};
    window.CRM.Utils = {
        escapeHtml: escapeHtml,
        formatPrice: formatPrice,
        formatChange: formatChange,
    };
})();
