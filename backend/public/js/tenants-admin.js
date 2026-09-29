/**
 * FXGuard — مدیریت سازمان‌های خودخدمت و Gateway اختصاصی واتساپ (فقط مدیر سکو)
 * @file    backend/public/js/tenants-admin.js
 * @layer   frontend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    'use strict';

    const body = document.getElementById('taBody');
    const msgEl = document.getElementById('taMsg');
    const refreshBtn = document.getElementById('taRefresh');

    const STATUS_LABEL = { trial: 'آزمایشی', active: 'فعال', suspended: 'تعلیق', cancelled: 'لغو شده' };
    const GW_LABEL = {
        ready: 'متصل',
        connected: 'متصل',
        qr: 'منتظر اسکن QR',
        waiting_qr: 'منتظر اسکن QR',
        initializing: 'در حال راه‌اندازی',
        disconnected: 'قطع',
        stopped: 'متوقف',
        unhealthy: 'ناسالم',
        port_conflict: 'تداخل پورت',
        not_configured: 'تنظیم نشده',
    };

    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function showMsg(text, isErr) {
        msgEl.textContent = text || '';
        msgEl.className = 'ta-msg' + (text ? ' show' : '') + (isErr ? ' err' : '');
    }

    function fmtDate(v) {
        if (!v) return '—';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '—';
        try {
            return d.toLocaleDateString('fa-IR');
        } catch (_) {
            return d.toISOString().slice(0, 10);
        }
    }

    async function api(path, opts) {
        const res = await fetch('/api' + path, Object.assign({
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
        }, opts || {}));
        if (res.status === 401) {
            window.location.href = '/login';
            throw new Error('unauthorized');
        }
        let data = {};
        try { data = await res.json(); } catch (_) {}
        if (!res.ok) {
            const err = new Error((data && data.error) || ('HTTP ' + res.status));
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function gatewayCell(t) {
        if (!t.gatewayEnabled) return '<span class="ta-badge">خاموش</span>';
        const port = t.gatewayPort ? ' <span class="ta-ltr">:' + esc(t.gatewayPort) + '</span>' : '';
        if (!t.gateway || !t.gateway.running) {
            const st = (t.gateway && t.gateway.status) || 'stopped';
            return '<span class="ta-badge err">' + esc(GW_LABEL[st] || st) + '</span>' + port;
        }
        return '<span class="ta-badge ok">در حال اجرا</span>' + port;
    }

    function whatsappCell(t) {
        if (!t.gateway || !t.gateway.running) return '—';
        const st = t.gateway.status || 'unknown';
        const cls = t.gateway.whatsapp ? 'ok' : 'warn';
        const num = t.gateway.number ? ' <span class="ta-ltr">' + esc(t.gateway.number) + '</span>' : '';
        return '<span class="ta-badge ' + cls + '">' + esc(GW_LABEL[st] || st) + '</span>' + num;
    }

    function render(tenants) {
        if (!tenants.length) {
            body.innerHTML = '<tr><td colspan="8" class="ta-empty">هنوز سازمانی ثبت‌نام نکرده است.</td></tr>';
            return;
        }
        body.innerHTML = tenants.map(function (t) {
            const toggle = t.gatewayEnabled
                ? '<button type="button" class="ta-btn off" data-act="off" data-id="' + esc(t.id) + '">خاموش کردن QR</button>'
                : '<button type="button" class="ta-btn on" data-act="on" data-id="' + esc(t.id) + '">روشن کردن QR</button>';
            const restart = t.gatewayEnabled
                ? '<button type="button" class="ta-btn" data-act="restart" data-id="' + esc(t.id) + '">راه‌اندازی مجدد</button>'
                : '';
            return '<tr>' +
                '<td>' + esc(t.name || '—') + '</td>' +
                '<td class="ta-ltr">' + esc(t.slug) + '</td>' +
                '<td class="ta-ltr">' + esc(t.ownerEmail || '—') + '</td>' +
                '<td><span class="ta-badge">' + esc(STATUS_LABEL[t.status] || t.status || '—') + '</span></td>' +
                '<td>' + esc(fmtDate(t.trialEndsAt)) + '</td>' +
                '<td>' + gatewayCell(t) + '</td>' +
                '<td>' + whatsappCell(t) + '</td>' +
                '<td><div class="ta-actions">' + toggle + restart + '</div></td>' +
                '</tr>';
        }).join('');
    }

    async function load() {
        refreshBtn.disabled = true;
        try {
            const data = await api('/tenants/admin/list');
            render(data.tenants || []);
        } catch (e) {
            if (e.message === 'unauthorized') return;
            const text = e.status === 404
                ? 'این صفحه فقط برای مدیر پنل اصلی سکو در دسترس است.'
                : (e.message || 'خطا در دریافت فهرست');
            body.innerHTML = '<tr><td colspan="8" class="ta-empty">' + esc(text) + '</td></tr>';
        } finally {
            refreshBtn.disabled = false;
        }
    }

    body.addEventListener('click', async function (ev) {
        const btn = ev.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (act === 'off' && !confirm('Gateway این سازمان متوقف شود؟ نشست واتساپ حفظ می‌شود و با روشن کردن دوباره برمی‌گردد.')) return;
        btn.disabled = true;
        showMsg('');
        try {
            const path = '/tenants/admin/' + encodeURIComponent(id) + '/gateway' + (act === 'restart' ? '/restart' : '');
            const payload = act === 'restart' ? {} : { enabled: act === 'on' };
            await api(path, { method: 'POST', body: JSON.stringify(payload) });
            showMsg(act === 'on'
                ? 'QR برای این سازمان روشن شد. مالک پنل می‌تواند از بخش اتصال واتساپ کد QR را اسکن کند.'
                : (act === 'off' ? 'Gateway خاموش شد.' : 'Gateway دوباره راه‌اندازی شد.'));
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'عملیات ناموفق بود', true);
            btn.disabled = false;
        }
    });

    refreshBtn.addEventListener('click', load);
    load();
})();
