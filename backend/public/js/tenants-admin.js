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
    const searchEl = document.getElementById('taSearch');
    const statusEl = document.getElementById('taStatus');
    const gatewayEl = document.getElementById('taGateway');
    const countEl = document.getElementById('taCount');
    const dialog = document.getElementById('taCred');
    const credBody = document.getElementById('taCredBody');

    const LOGIN_URL = '/login?panel=platform&return=' + encodeURIComponent('/tenants-admin');
    const STATUS_LABEL = { trial: 'آزمایشی', active: 'فعال', suspended: 'تعلیق', cancelled: 'لغو شده' };
    const PLAN_LABEL = { start: 'شروع', business: 'کسب‌وکار', legacy: 'قدیمی', pro: 'حرفه‌ای' };
    const INDUSTRY_LABEL = {
        travel: 'مسافرت',
        health: 'سلامت',
        exchange: 'صرافی',
        manufacturing: 'تولید',
        food_distribution: 'توزیع غذا',
        real_estate: 'املاک',
        general: 'عمومی',
    };
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

    let allTenants = [];
    let loaded = false;
    let credText = '';

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

    function setStat(id, n) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(n);
    }

    /** یک کوکی ورود برای کل app.fxguard.io است؛ ورود به پنل یک سازمان در همین مرورگر نشست مدیر سکو را جایگزین می‌کند. */
    function showSessionSwitched() {
        msgEl.className = 'ta-msg show err';
        msgEl.innerHTML =
            'نشست این مرورگر الان مال پنل یک سازمان است، نه مدیر سکو (احتمالاً با لینک ورود یکی از سازمان‌ها وارد شده‌اید). ' +
            'برای باز کردن پنل سازمان‌ها از پنجرهٔ ناشناس (Incognito) استفاده کنید. ' +
            '<a class="ta-btn" href="' + esc(LOGIN_URL) + '">ورود دوباره به‌عنوان مدیر سکو</a>';
    }

    async function api(path, opts) {
        const res = await fetch('/api' + path, Object.assign({
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
        }, opts || {}));
        if (res.status === 401) {
            window.location.href = LOGIN_URL;
            throw new Error('unauthorized');
        }
        let data = {};
        try { data = await res.json(); } catch (_) {}
        if (res.status === 402 || (res.status === 404 && data && data.error === 'not_found')) {
            showSessionSwitched();
            const err = new Error('unauthorized');
            err.status = res.status;
            throw err;
        }
        if (!res.ok) {
            const err = new Error((data && data.error) || ('HTTP ' + res.status));
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function trialBadge(t) {
        const label = fmtDate(t.trialEndsAt);
        if (!t.trialEndsAt || t.status !== 'trial') return esc(label);
        const left = new Date(t.trialEndsAt).getTime() - Date.now();
        const cls = left < 0 ? 'err' : (left < 3 * 86400000 ? 'warn' : '');
        return '<span class="ta-badge ' + cls + '">' + esc(label) + '</span>';
    }

    function isLocked(t) {
        return !!t.access && t.access !== 'ok';
    }

    function isPayPending(t) {
        return !!(t.payment && t.payment.status === 'pending');
    }

    function paymentCell(t) {
        const p = t.payment || {};
        if (!p.status) return isLocked(t) ? '<span class="ta-badge err">پرداخت نشده</span>' : '—';
        const tx = p.txId ? String(p.txId) : '';
        const short = tx.length > 14 ? tx.slice(0, 6) + '…' + tx.slice(-6) : tx;
        const meta = '<span class="ta-sub ta-ltr" title="' + esc(tx) + '">' + esc(p.network || '') + (short ? ' · ' + esc(short) : '') + '</span>';
        if (p.status === 'confirmed') {
            return '<div class="ta-org"><span class="ta-badge ok">تأیید شده</span>' + meta + '</div>';
        }
        if (p.status === 'pending') {
            return '<div class="ta-org"><span class="ta-badge warn">منتظر تأیید</span>' + meta + '</div>';
        }
        return '<div class="ta-org"><span class="ta-badge">' + esc(p.status) + '</span>' + meta + '</div>';
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

    function matches(t) {
        const q = (searchEl.value || '').trim().toLowerCase();
        const st = statusEl.value;
        const gw = gatewayEl.value;
        if (st === 'pay_pending') {
            if (!isPayPending(t)) return false;
        } else if (st === 'locked') {
            if (!isLocked(t)) return false;
        } else if (st && t.status !== st) return false;
        if (gw === 'on' && !t.gatewayEnabled) return false;
        if (gw === 'off' && t.gatewayEnabled) return false;
        if (!q) return true;
        const hay = [t.name, t.slug, t.ownerEmail, t.industry].join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
    }

    function paintStats() {
        setStat('taStatTotal', allTenants.length);
        setStat('taStatTrial', allTenants.filter(function (t) { return t.status === 'trial' && !isLocked(t); }).length);
        setStat('taStatPaid', allTenants.filter(function (t) { return t.status === 'active'; }).length);
        setStat('taStatPending', allTenants.filter(isPayPending).length);
        setStat('taStatLocked', allTenants.filter(isLocked).length);
        setStat('taStatGw', allTenants.filter(function (t) { return t.gatewayEnabled; }).length);
        setStat('taStatWa', allTenants.filter(function (t) { return t.gateway && t.gateway.whatsapp; }).length);
    }

    function render() {
        if (!loaded) return;
        const rows = allTenants.filter(matches);
        countEl.textContent = rows.length + ' از ' + allTenants.length;
        if (!allTenants.length) {
            body.innerHTML = '<tr><td colspan="9" class="ta-empty">هنوز سازمانی ثبت‌نام نکرده است.</td></tr>';
            return;
        }
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="9" class="ta-empty">سازمانی با این فیلتر پیدا نشد.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (t) {
            const toggle = t.gatewayEnabled
                ? '<button type="button" class="ta-btn off" data-act="off" data-id="' + esc(t.id) + '">خاموش کردن QR</button>'
                : '<button type="button" class="ta-btn on" data-act="on" data-id="' + esc(t.id) + '">روشن کردن QR</button>';
            const restart = t.gatewayEnabled
                ? '<button type="button" class="ta-btn" data-act="restart" data-id="' + esc(t.id) + '">راه‌اندازی مجدد</button>'
                : '';
            const reset = '<button type="button" class="ta-btn" data-act="password" data-id="' + esc(t.id) + '">رمز موقت مالک</button>';
            const confirmPay = isPayPending(t)
                ? '<button type="button" class="ta-btn primary" data-act="confirm-pay" data-id="' + esc(t.id) + '">تأیید پرداخت</button>'
                : '';
            const login = t.loginUrl
                ? '<a class="ta-ltr ta-link" href="' + esc(t.loginUrl) + '" target="_blank" rel="noopener" title="برای ورود به پنل سازمان از پنجرهٔ ناشناس استفاده کنید تا نشست مدیر سکو عوض نشود">' + esc(t.loginUrl.replace(/^https?:\/\//, '')) + '</a>'
                : '—';
            const industry = INDUSTRY_LABEL[t.industry] || t.industry || '';
            const plan = PLAN_LABEL[t.planTier] || t.planTier || '';
            const statusCls = t.status === 'active' ? 'ok' : (t.status === 'suspended' || t.status === 'cancelled' ? 'err' : 'warn');
            return '<tr>' +
                '<td><div class="ta-org"><strong>' + esc(t.name || '—') + '</strong>' +
                '<span class="ta-sub">' + esc(industry) + (industry && plan ? ' · ' : '') + esc(plan) + '</span></div></td>' +
                '<td><div class="ta-org"><span class="ta-ltr">' + esc(t.slug) + '</span>' + login + '</div></td>' +
                '<td class="ta-ltr ta-hide-sm">' + esc(t.ownerEmail || '—') + '</td>' +
                '<td><span class="ta-badge ' + statusCls + '">' + esc(STATUS_LABEL[t.status] || t.status || '—') + '</span></td>' +
                '<td class="ta-hide-sm">' + trialBadge(t) + '</td>' +
                '<td>' + paymentCell(t) + '</td>' +
                '<td>' + gatewayCell(t) + '</td>' +
                '<td class="ta-hide-sm">' + whatsappCell(t) + '</td>' +
                '<td><div class="ta-row-actions">' + confirmPay + toggle + restart + reset + '</div></td>' +
                '</tr>';
        }).join('');
    }

    function loadingRow() {
        body.innerHTML = '<tr><td colspan="9" class="ta-empty">در حال بارگذاری سازمان‌ها…</td></tr>';
    }

    async function load() {
        refreshBtn.disabled = true;
        loadingRow();
        const ctrl = new AbortController();
        const timer = setTimeout(function () { ctrl.abort(); }, 20000);
        try {
            const data = await api('/tenants/admin/list', { signal: ctrl.signal });
            allTenants = data.tenants || [];
            loaded = true;
            paintStats();
            render();
        } catch (e) {
            if (e.message === 'unauthorized') {
                body.innerHTML = '<tr><td colspan="9" class="ta-empty">برای دیدن فهرست دوباره به‌عنوان مدیر سکو وارد شوید.</td></tr>';
                return;
            }
            if (e.name === 'AbortError') {
                body.innerHTML = '<tr><td colspan="9" class="ta-empty">دریافت فهرست طول کشید. دوباره به‌روزرسانی کنید.</td></tr>';
                return;
            }
            if (e.status === 404) {
                body.innerHTML = '<tr><td colspan="9" class="ta-empty">این صفحه فقط برای مدیر پنل اصلی سکو است. ' +
                    'با شناسه پنل <b class="ta-ltr">platform</b> وارد شوید: ' +
                    '<a class="ta-btn" href="' + esc(LOGIN_URL) + '">ورود مدیر سکو</a></td></tr>';
                return;
            }
            body.innerHTML = '<tr><td colspan="9" class="ta-empty">' + esc(e.message || 'خطا در دریافت فهرست') + '</td></tr>';
        } finally {
            clearTimeout(timer);
            refreshBtn.disabled = false;
        }
    }

    function openCred(r) {
        credText = 'Login: ' + r.loginUrl + '\nEmail: ' + r.email + '\nPassword: ' + r.password;
        credBody.innerHTML =
            'لینک ورود: <span class="ta-ltr">' + esc(r.loginUrl) + '</span><br>' +
            'ایمیل: <span class="ta-ltr">' + esc(r.email) + '</span><br>' +
            'رمز موقت: <code class="ta-ltr">' + esc(r.password) + '</code>';
        if (dialog.showModal) dialog.showModal();
        else showMsg(credText);
    }

    async function resetOwnerPassword(btn, id) {
        if (!confirm('برای مالک این سازمان رمز موقت ساخته شود؟ رمز فعلی او از کار می‌افتد و از همهٔ دستگاه‌ها خارج می‌شود.')) return;
        btn.disabled = true;
        showMsg('');
        try {
            const r = await api('/tenants/admin/' + encodeURIComponent(id) + '/owner-password', { method: 'POST', body: '{}' });
            openCred(r);
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'عملیات ناموفق بود', true);
        } finally {
            btn.disabled = false;
        }
    }

    async function confirmPayment(btn, id) {
        const t = allTenants.find(function (x) { return x.id === id; }) || {};
        const p = t.payment || {};
        const tx = p.txId || '—';
        if (!confirm('قبل از تأیید، تراکنش را در کیف پول یا اکسپلورر شبکه چک کنید.\n\nشبکه: ' + (p.network || '—') + '\nTXID: ' + tx + '\n\nپنل «' + (t.slug || '') + '» فعال شود؟')) return;
        btn.disabled = true;
        showMsg('');
        try {
            await api('/billing/crypto/confirm', { method: 'POST', body: JSON.stringify({ tenantId: id }) });
            showMsg('پرداخت تأیید و پنل فعال شد.');
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'تأیید پرداخت ناموفق بود', true);
            btn.disabled = false;
        }
    }

    body.addEventListener('click', async function (ev) {
        const btn = ev.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (act === 'password') {
            await resetOwnerPassword(btn, id);
            return;
        }
        if (act === 'confirm-pay') {
            await confirmPayment(btn, id);
            return;
        }
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

    document.getElementById('taCredClose').addEventListener('click', function () {
        credText = '';
        credBody.textContent = '';
        if (dialog.close) dialog.close();
    });
    document.getElementById('taCredCopy').addEventListener('click', function () {
        const copyBtn = document.getElementById('taCredCopy');
        if (!credText || !navigator.clipboard) return;
        navigator.clipboard.writeText(credText).then(function () {
            copyBtn.textContent = 'کپی شد';
            setTimeout(function () { copyBtn.textContent = 'کپی اطلاعات ورود'; }, 1600);
        });
    });

    searchEl.addEventListener('input', render);
    statusEl.addEventListener('change', render);
    gatewayEl.addEventListener('change', render);
    refreshBtn.addEventListener('click', load);
    load();
})();
