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
    const autoRefreshEl = document.getElementById('taAutoRefresh');
    const statsEl = document.getElementById('taStats');

    const LOGIN_URL = '/login?panel=platform&return=' + encodeURIComponent('/tenants-admin');
    const STATUS_LABEL = { trial: 'آزمایشی', active: 'فعال', suspended: 'تعلیق', cancelled: 'لغو شده' };
    const PLAN_LABEL = { start: 'شروع', business: 'کسب‌وکار', legacy: 'قدیمی', pro: 'حرفه‌ای' };
    const AUTO_MS = 60000;
    let autoTimer = null;
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
        starting: 'در حال راه‌اندازی',
        authenticated: 'در حال اتصال',
        disconnected: 'قطع',
        stopped: 'متوقف',
        unhealthy: 'ناسالم',
        port_conflict: 'تداخل پورت',
        not_configured: 'تنظیم نشده',
    };
    const ROLE_LABEL = { owner: 'مالک', admin: 'مدیر', manager: 'مدیر بخش', supervisor: 'ناظر', agent: 'کارشناس' };
    const SOURCE_LABEL = { whatsapp: 'واتساپ', web: 'وب', manual: 'دستی' };
    const COLS = 5;

    const detailDlg = document.getElementById('taDetail');
    const detailBody = document.getElementById('taDetailBody');
    const userDlg = document.getElementById('taUserDlg');
    const userForm = document.getElementById('taUserForm');
    const userMsg = document.getElementById('taUserMsg');

    let allTenants = [];
    let loaded = false;
    let credText = '';
    let detail = null;
    let detailTab = 'overview';
    let editingUserId = null;

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
            return d.toLocaleDateString('fa');
        } catch (_) {
            return d.toISOString().slice(0, 10);
        }
    }

    function fmtDateTime(v) {
        if (!v) return '—';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '—';
        try {
            return d.toLocaleString('fa', { dateStyle: 'medium', timeStyle: 'short' });
        } catch (_) {
            return d.toISOString().slice(0, 16).replace('T', ' ');
        }
    }

    function fmtNum(n) {
        const v = Number(n) || 0;
        try { return v.toLocaleString('fa'); } catch (_) { return String(v); }
    }

    function setStat(id, n) {
        const el = document.getElementById(id);
        if (el) el.textContent = typeof n === 'number' ? fmtNum(n) : String(n);
    }

    function sumUsage(key, list) {
        return (list || allTenants).reduce(function (acc, t) { return acc + ((t.usage && t.usage[key]) || 0); }, 0);
    }

    function filterActive() {
        return !!(statusEl.value || gatewayEl.value || (searchEl.value || '').trim());
    }

    function paintUsage(rows) {
        const visible = rows || allTenants;
        setStat('taStatUsers', sumUsage('users', visible));
        setStat('taStatCustomers', sumUsage('customers', visible));
        setStat('taStatConvos', sumUsage('conversations', visible));
        setStat('taStatMessages', sumUsage('messages', visible));
        const note = document.getElementById('taUsageNote');
        const breakdown = document.getElementById('taBreakdown');
        if (note) {
            const scope = filterActive()
                ? 'فقط ' + fmtNum(visible.length) + ' سازمان همین فیلتر. '
                : 'جمع هر ' + fmtNum(allTenants.length) + ' سازمان خودخدمت روی این سکو. ';
            const totalBit = filterActive()
                ? ' جمع کل، شامل سازمان‌هایی که الان در جدول نیستند: ' +
                    fmtNum(sumUsage('customers')) + ' مشتری و ' + fmtNum(sumUsage('messages')) + ' پیام.'
                : '';
            note.textContent = scope +
                'مشتری = مخاطبی که در CRM آن سازمان ذخیره شده. پیام = هر پیام ورودی یا خروجی که در چت مانده. پنل کایا در این اعداد نیست.' +
                totalBit;
        }
        if (!breakdown) return;
        if (!allTenants.length) {
            breakdown.hidden = true;
            breakdown.innerHTML = '';
            return;
        }
        const visibleIds = {};
        visible.forEach(function (t) { visibleIds[t.id] = true; });
        breakdown.hidden = false;
        breakdown.innerHTML = allTenants.map(function (t) {
            const u = t.usage || {};
            const dim = filterActive() && !visibleIds[t.id] ? ' is-dim' : '';
            return '<li class="' + dim + '"><strong>' + esc(t.name || t.slug || '—') + '</strong>' +
                '<span>' + fmtNum(u.customers) + ' مشتری</span>' +
                '<span>' + fmtNum(u.conversations) + ' گفتگو</span>' +
                '<span>' + fmtNum(u.messages) + ' پیام</span></li>';
        }).join('');
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
        if (!t.gateway || !t.gateway.running) return '';
        const st = t.gateway.status || 'unknown';
        const cls = t.gateway.whatsapp ? 'ok' : 'warn';
        const num = t.gateway.number ? ' <span class="ta-ltr">' + esc(t.gateway.number) + '</span>' : '';
        return '<span class="ta-badge ' + cls + '">' + esc(GW_LABEL[st] || st) + '</span>' + num;
    }

    function gatewayUnhealthy(t) {
        if (!t.gatewayEnabled) return false;
        if (!t.gateway || !t.gateway.running) return true;
        const st = t.gateway.status || '';
        return st === 'unhealthy' || st === 'port_conflict' || st === 'disconnected' || st === 'stopped';
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
        if (gw === 'bad' && !gatewayUnhealthy(t)) return false;
        if (gw === 'wa' && !(t.gateway && t.gateway.whatsapp)) return false;
        if (!q) return true;
        const hay = [t.name, t.slug, t.ownerEmail, t.industry].join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
    }

    function paintStatFilters() {
        if (!statsEl) return;
        statsEl.querySelectorAll('.ta-stat[data-filter-status], .ta-stat[data-filter-gateway]').forEach(function (el) {
            const fs = el.getAttribute('data-filter-status');
            const fg = el.getAttribute('data-filter-gateway');
            const active = (fs !== null && fs !== undefined && statusEl.value === fs && !gatewayEl.value) ||
                (fg && gatewayEl.value === fg && !statusEl.value);
            el.classList.toggle('active', !!active);
        });
    }

    function paintStats() {
        setStat('taStatTotal', allTenants.length);
        setStat('taStatTrial', allTenants.filter(function (t) { return t.status === 'trial' && !isLocked(t); }).length);
        setStat('taStatPaid', allTenants.filter(function (t) { return t.status === 'active'; }).length);
        setStat('taStatPending', allTenants.filter(isPayPending).length);
        setStat('taStatLocked', allTenants.filter(isLocked).length);
        setStat('taStatGw', allTenants.filter(function (t) { return t.gatewayEnabled; }).length);
        setStat('taStatWa', allTenants.filter(function (t) { return t.gateway && t.gateway.whatsapp; }).length);
        paintUsage(allTenants);
    }

    function usageCell(t) {
        const u = t.usage || {};
        return '<div class="ta-usage">' +
            '<span>کاربر <b>' + fmtNum(u.users) + '</b> · مشتری <b>' + fmtNum(u.customers) + '</b></span>' +
            '<span class="ta-sub">گفتگو ' + fmtNum(u.conversations) + ' · پیام ' + fmtNum(u.messages) + '</span>' +
            '<span class="ta-sub">آخرین فعالیت: ' + esc(fmtDate(u.lastActivityAt)) + '</span>' +
            '</div>';
    }

    function render() {
        if (!loaded) return;
        const rows = allTenants.filter(matches);
        paintUsage(rows);
        countEl.textContent = rows.length + ' از ' + allTenants.length;
        if (!allTenants.length) {
            body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">هنوز سازمانی ثبت‌نام نکرده است.</td></tr>';
            return;
        }
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">سازمانی با این فیلتر پیدا نشد.</td></tr>';
            return;
        }
        body.innerHTML = rows.map(function (t) {
            const toggle = t.gatewayEnabled
                ? '<button type="button" class="ta-btn off" data-act="off" data-id="' + esc(t.id) + '">خاموش QR</button>'
                : '<button type="button" class="ta-btn on" data-act="on" data-id="' + esc(t.id) + '">روشن QR</button>';
            const restart = t.gatewayEnabled
                ? '<button type="button" class="ta-btn" data-act="restart" data-id="' + esc(t.id) + '">ری‌استارت</button>'
                : '';
            const wipe = t.gatewayEnabled
                ? '<button type="button" class="ta-btn" data-act="wipe" data-id="' + esc(t.id) + '" title="پاک کردن نشست و QR تازه">پاک‌کردن نشست</button>'
                : '';
            const reset = '<button type="button" class="ta-btn" data-act="password" data-id="' + esc(t.id) + '">رمز مالک</button>';
            const details = '<button type="button" class="ta-btn primary" data-act="details" data-id="' + esc(t.id) + '">مدیریت</button>';
            const confirmPay = isPayPending(t)
                ? '<button type="button" class="ta-btn primary" data-act="confirm-pay" data-id="' + esc(t.id) + '">تأیید پرداخت</button>'
                : '';
            const suspend = t.status !== 'suspended'
                ? '<button type="button" class="ta-btn off" data-act="suspend" data-id="' + esc(t.id) + '">تعلیق</button>'
                : '<button type="button" class="ta-btn on" data-act="activate" data-id="' + esc(t.id) + '">فعال‌سازی</button>';
            const extend = t.status !== 'active'
                ? '<button type="button" class="ta-btn" data-act="extend-trial" data-id="' + esc(t.id) + '">تمدید ۱۴ روز</button>'
                : '';
            const login = t.loginUrl
                ? '<a class="ta-ltr ta-link" href="' + esc(t.loginUrl) + '" target="_blank" rel="noopener" title="برای ورود به پنل سازمان از پنجرهٔ ناشناس استفاده کنید تا نشست مدیر سکو عوض نشود">' + esc(t.loginUrl.replace(/^https?:\/\//, '')) + '</a>'
                : '';
            const industry = INDUSTRY_LABEL[t.industry] || t.industry || '';
            const plan = PLAN_LABEL[t.planTier] || t.planTier || '';
            const statusCls = t.status === 'active' ? 'ok' : (t.status === 'suspended' || t.status === 'cancelled' ? 'err' : 'warn');
            const lockBadge = isLocked(t) ? ' <span class="ta-badge err">قفل</span>' : '';
            const org = '<div class="ta-org"><strong>' + esc(t.name || '—') + '</strong>' +
                '<span class="ta-sub">' + esc(industry) + (industry && plan ? ' · ' : '') + esc(plan) + '</span>' +
                '<span class="ta-sub ta-ltr">' + esc(t.slug) + (t.ownerEmail ? ' · ' + esc(t.ownerEmail) : '') + '</span>' +
                login + '</div>';
            const trialLine = t.status === 'trial'
                ? '<span class="ta-sub">پایان آزمایش: ' + trialBadge(t) + '</span>'
                : '';
            const status = '<div class="ta-stack"><span class="ta-badge ' + statusCls + '">' +
                esc(STATUS_LABEL[t.status] || t.status || '—') + '</span>' + lockBadge +
                trialLine +
                paymentCell(t) + '</div>';
            const wa = '<div class="ta-stack">' + gatewayCell(t) + whatsappCell(t) + '</div>';
            return '<tr>' +
                '<td data-label="سازمان">' + org + '</td>' +
                '<td data-label="وضعیت">' + status + '</td>' +
                '<td data-label="داده">' + usageCell(t) + '</td>' +
                '<td data-label="واتساپ">' + wa + '</td>' +
                '<td data-label="عملیات"><div class="ta-row-actions">' + details + confirmPay + suspend + extend + toggle + restart + wipe + reset + '</div></td>' +
                '</tr>';
        }).join('');
        paintStatFilters();
    }

    function loadingRow() {
        body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">در حال بارگذاری سازمان‌ها…</td></tr>';
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
                body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">برای دیدن فهرست دوباره به‌عنوان مدیر سکو وارد شوید.</td></tr>';
                return;
            }
            if (e.name === 'AbortError') {
                body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">دریافت فهرست طول کشید. دوباره به‌روزرسانی کنید.</td></tr>';
                return;
            }
            if (e.status === 404) {
                body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">این صفحه فقط برای مدیر پنل اصلی سکو است. ' +
                    'با شناسه پنل <b class="ta-ltr">platform</b> وارد شوید: ' +
                    '<a class="ta-btn" href="' + esc(LOGIN_URL) + '">ورود مدیر سکو</a></td></tr>';
                return;
            }
            body.innerHTML = '<tr><td colspan="' + COLS + '" class="ta-empty">' + esc(e.message || 'خطا در دریافت فهرست') + '</td></tr>';
        } finally {
            clearTimeout(timer);
            refreshBtn.disabled = false;
        }
    }

    function openCred(r, title) {
        document.getElementById('taCredTitle').textContent = title || 'رمز موقت مالک';
        credText = 'Login: ' + r.loginUrl + '\nEmail: ' + r.email +
            (r.username ? '\nUsername: ' + r.username : '') + '\nPassword: ' + r.password;
        credBody.innerHTML =
            'لینک ورود: <span class="ta-ltr">' + esc(r.loginUrl) + '</span><br>' +
            'ایمیل: <span class="ta-ltr">' + esc(r.email) + '</span><br>' +
            (r.username ? 'نام کاربری: <span class="ta-ltr">' + esc(r.username) + '</span><br>' : '') +
            'رمز: <code class="ta-ltr">' + esc(r.password) + '</code>';
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

    async function extendTrial(btn, id) {
        const t = allTenants.find(function (x) { return x.id === id; }) || {};
        if (!confirm('آزمایش رایگان پنل «' + (t.slug || '') + '» از همین الان ۱۴ روز دیگر باز شود؟')) return;
        btn.disabled = true;
        showMsg('');
        try {
            const r = await api('/tenants/admin/' + encodeURIComponent(id) + '/extend-trial', { method: 'POST', body: JSON.stringify({ days: 14 }) });
            showMsg('آزمایش رایگان ' + r.days + ' روز تمدید شد. مالک پنل با رفرش صفحه دوباره وارد داشبورد می‌شود.');
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'تمدید آزمایش ناموفق بود', true);
            btn.disabled = false;
        }
    }

    function kv(label, value) {
        return '<div><dt>' + esc(label) + '</dt><dd>' + value + '</dd></div>';
    }

    function renderOverview() {
        const t = detail.tenant;
        const u = detail.usage || {};
        const statusCls = t.status === 'active' ? 'ok' : (t.status === 'suspended' || t.status === 'cancelled' ? 'err' : 'warn');
        const skills = (t.enabledSkills || []).map(function (s) { return '<span class="ta-badge">' + esc(s) + '</span>'; }).join('');
        const login = t.loginUrl
            ? '<a class="ta-ltr ta-link" href="' + esc(t.loginUrl) + '" target="_blank" rel="noopener">' + esc(t.loginUrl.replace(/^https?:\/\//, '')) + '</a>'
            : '—';
        return '<dl class="ta-kv">' +
            kv('وضعیت', '<span class="ta-badge ' + statusCls + '">' + esc(STATUS_LABEL[t.status] || t.status || '—') + '</span>' +
                (t.access && t.access !== 'ok' ? ' <span class="ta-badge err">قفل</span>' : '')) +
            kv('پایان آزمایش', trialBadge(t)) +
            kv('پلن', esc(PLAN_LABEL[t.planTier] || t.planTier || '—')) +
            kv('صنعت', esc(INDUSTRY_LABEL[t.industry] || t.industry || '—')) +
            kv('شناسه پنل', '<span class="ta-ltr">' + esc(t.slug) + '</span>') +
            kv('لینک ورود', login) +
            kv('دامنهٔ اختصاصی', t.customDomain ? '<span class="ta-ltr">' + esc(t.customDomain) + '</span>' : '—') +
            kv('تاریخ ثبت‌نام', esc(fmtDateTime(t.createdAt))) +
            kv('Gateway', gatewayCell(t)) +
            kv('واتساپ', whatsappCell(t)) +
            '</dl>' +
            '<dl class="ta-kv">' +
            kv('کاربران', fmtNum(u.users)) +
            kv('مشتریان', fmtNum(u.customers)) +
            kv('گفتگوها (باز)', fmtNum(u.conversations) + ' (' + fmtNum(u.openConversations) + ')') +
            kv('پیام‌ها', fmtNum(u.messages)) +
            kv('آخرین فعالیت', esc(fmtDateTime(u.lastActivityAt))) +
            '</dl>' +
            '<div class="ta-section-head"><h3>ماژول‌های فعال</h3></div>' +
            '<div class="ta-chips">' + (skills || '<span class="ta-sub">—</span>') + '</div>' +
            '<div class="ta-quick-actions">' +
            '<button type="button" class="ta-btn primary" data-tabjump="manage">ویرایش وضعیت و ماژول‌ها</button>' +
            (t.gatewayEnabled
                ? '<button type="button" class="ta-btn" data-act="wipe" data-id="' + esc(t.id) + '">پاک کردن نشست QR</button>' +
                  '<button type="button" class="ta-btn" data-act="restart" data-id="' + esc(t.id) + '">راه‌اندازی مجدد Gateway</button>'
                : '<button type="button" class="ta-btn on" data-act="on" data-id="' + esc(t.id) + '">روشن کردن QR</button>') +
            '</div>';
    }

    function skillLabel(s) {
        if (!s) return '';
        if (s.label && s.label.fa) return s.label.fa;
        return s.id || '';
    }

    function renderManage() {
        const t = detail.tenant;
        const catalog = detail.catalog || {};
        const industries = catalog.industries || [];
        const skills = (catalog.skills || []).filter(function (s) { return s.tier !== 'general' && !s.comingSoon; });
        const enabled = {};
        (t.enabledSkills || []).forEach(function (id) { enabled[id] = true; });
        const industryOpts = industries.map(function (i) {
            const lab = (i.label && i.label.fa) || i.id;
            return '<option value="' + esc(i.id) + '"' + (t.industry === i.id ? ' selected' : '') + '>' + esc(lab) + '</option>';
        }).join('');
        const skillChecks = skills.map(function (s) {
            return '<label class="ta-check"><input type="checkbox" name="skill" value="' + esc(s.id) + '"' +
                (enabled[s.id] ? ' checked' : '') + '> ' + esc(skillLabel(s)) + '</label>';
        }).join('');
        return '<form class="ta-manage-form" id="taManageForm">' +
            '<div class="ta-form-grid">' +
            '<label>نام سازمان<input class="ta-search" name="name" maxlength="255" value="' + esc(t.name || '') + '" required></label>' +
            '<label>وضعیت اشتراک<select class="ta-select" name="status">' +
            ['trial', 'active', 'suspended', 'cancelled'].map(function (s) {
                return '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + esc(STATUS_LABEL[s]) + '</option>';
            }).join('') +
            '</select></label>' +
            '<label>پلن<select class="ta-select" name="planTier">' +
            Object.keys(PLAN_LABEL).map(function (p) {
                return '<option value="' + p + '"' + (t.planTier === p ? ' selected' : '') + '>' + esc(PLAN_LABEL[p]) + '</option>';
            }).join('') +
            '</select></label>' +
            '<label>حوزهٔ فعالیت<select class="ta-select" name="industry">' + industryOpts + '</select></label>' +
            '<label>تمدید آزمایش (روز)<input class="ta-search" name="extendTrialDays" type="number" min="0" max="90" placeholder="خالی = بدون تغییر"></label>' +
            '</div>' +
            '<div class="ta-section-head"><h3>ماژول‌های اختیاری / صنعتی</h3></div>' +
            '<div class="ta-skills-grid">' + (skillChecks || '<span class="ta-sub">کاتالوگ ماژول در دسترس نیست</span>') + '</div>' +
            '<div class="ta-msg" id="taManageMsg" role="alert"></div>' +
            '<div class="ta-dialog-actions" style="justify-content:flex-start">' +
            '<button type="submit" class="ta-btn primary">ذخیره تغییرات</button>' +
            (t.status !== 'suspended'
                ? '<button type="button" class="ta-btn off" data-act="suspend" data-id="' + esc(t.id) + '">تعلیق فوری</button>'
                : '<button type="button" class="ta-btn on" data-act="activate" data-id="' + esc(t.id) + '">فعال‌سازی فوری</button>') +
            '</div></form>';
    }

    function renderUsers() {
        const rows = detail.users.map(function (u) {
            const active = u.isActive
                ? '<span class="ta-badge ok">فعال</span>'
                : '<span class="ta-badge err">غیرفعال</span>';
            return '<tr>' +
                '<td><div class="ta-org"><strong>' + esc(u.name || '—') + '</strong>' +
                '<span class="ta-sub ta-ltr">' + esc(u.email) + '</span></div></td>' +
                '<td class="ta-ltr">' + esc(u.username || '—') + '</td>' +
                '<td><span class="ta-badge">' + esc(ROLE_LABEL[u.role] || u.role) + '</span>' +
                (u.totpEnabled ? ' <span class="ta-badge ok" title="ورود دو مرحله‌ای">2FA</span>' : '') + '</td>' +
                '<td>' + active + '</td>' +
                '<td class="ta-hide-sm">' + esc(fmtDateTime(u.lastLoginAt)) + '</td>' +
                '<td><div class="ta-row-actions">' +
                '<button type="button" class="ta-btn" data-uact="edit" data-uid="' + esc(u.id) + '">ویرایش / رمز</button>' +
                '</div></td>' +
                '</tr>';
        }).join('');
        return '<div class="ta-section-head"><h3>کاربران این پنل (' + fmtNum(detail.users.length) + ')</h3>' +
            '<button type="button" class="ta-btn primary" data-uact="create">+ کاربر جدید</button></div>' +
            '<div class="ta-table-wrap"><table><thead><tr>' +
            '<th>کاربر</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th class="ta-hide-sm">آخرین ورود</th><th>عملیات</th>' +
            '</tr></thead><tbody>' +
            (rows || '<tr><td colspan="6" class="ta-empty">کاربری ثبت نشده است.</td></tr>') +
            '</tbody></table></div>';
    }

    function renderCustomers() {
        const total = (detail.usage && detail.usage.customers) || 0;
        const rows = detail.customers.map(function (c) {
            return '<tr>' +
                '<td><strong>' + esc(c.name || '—') + '</strong></td>' +
                '<td class="ta-ltr">' + esc(c.phone || '—') + '</td>' +
                '<td>' + esc(SOURCE_LABEL[c.source] || c.source || '—') + '</td>' +
                '<td>' + fmtNum(c.totalMessages) + '</td>' +
                '<td>' + esc(fmtDateTime(c.lastContactAt)) + '</td>' +
                '</tr>';
        }).join('');
        return '<div class="ta-section-head"><h3>آخرین مشتریان (' + fmtNum(detail.customers.length) + ' از ' + fmtNum(total) + ')</h3></div>' +
            '<div class="ta-table-wrap"><table><thead><tr>' +
            '<th>نام</th><th>شماره</th><th>منبع</th><th>پیام</th><th>آخرین تماس</th>' +
            '</tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="ta-empty">هنوز مشتری‌ای ثبت نشده است.</td></tr>') +
            '</tbody></table></div>';
    }

    function paintDetail() {
        if (!detail) return;
        document.getElementById('taDetailTitle').textContent = detail.tenant.name || detail.tenant.slug;
        document.getElementById('taDetailKicker').textContent = 'جزئیات سازمان · ' + detail.tenant.slug;
        detailDlg.querySelectorAll('.ta-tab').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-tab') === detailTab);
        });
        if (detailTab === 'users') detailBody.innerHTML = renderUsers();
        else if (detailTab === 'customers') detailBody.innerHTML = renderCustomers();
        else if (detailTab === 'manage') detailBody.innerHTML = renderManage();
        else detailBody.innerHTML = renderOverview();
    }

    async function saveManagedTenant(ev) {
        ev.preventDefault();
        if (!detail) return;
        const form = document.getElementById('taManageForm');
        if (!form) return;
        const f = form.elements;
        const skills = [];
        form.querySelectorAll('input[name="skill"]:checked').forEach(function (el) { skills.push(el.value); });
        const payload = {
            name: f.name.value.trim(),
            status: f.status.value,
            planTier: f.planTier.value,
            industry: f.industry.value,
            enabledSkills: skills,
        };
        const days = parseInt(String(f.extendTrialDays.value || ''), 10);
        if (Number.isFinite(days) && days > 0) payload.extendTrialDays = days;
        const msg = document.getElementById('taManageMsg');
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        if (msg) { msg.className = 'ta-msg'; msg.textContent = ''; }
        try {
            await api('/tenants/admin/' + encodeURIComponent(detail.tenant.id), {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            showMsg('سازمان به‌روزرسانی شد.');
            await loadDetail(detail.tenant.id);
            detailTab = 'manage';
            paintDetail();
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized' && msg) {
                msg.textContent = e.message || 'ذخیره ناموفق بود';
                msg.className = 'ta-msg show err';
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function setTenantStatus(btn, id, status) {
        const t = allTenants.find(function (x) { return x.id === id; }) || (detail && detail.tenant) || {};
        const label = STATUS_LABEL[status] || status;
        if (!confirm('وضعیت پنل «' + (t.slug || '') + '» به «' + label + '» تغییر کند؟')) return;
        btn.disabled = true;
        showMsg('');
        try {
            await api('/tenants/admin/' + encodeURIComponent(id), {
                method: 'PATCH',
                body: JSON.stringify({ status: status }),
            });
            showMsg('وضعیت به «' + label + '» تغییر کرد.');
            if (detail && detail.tenant && detail.tenant.id === id) await loadDetail(id);
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'تغییر وضعیت ناموفق بود', true);
            btn.disabled = false;
        }
    }

    async function wipeGateway(btn, id) {
        const t = allTenants.find(function (x) { return x.id === id; }) || {};
        if (!confirm('نشست واتساپ وب پنل «' + (t.slug || '') + '» پاک شود و QR تازه ساخته شود؟ مالک باید دوباره اسکن کند.')) return;
        btn.disabled = true;
        showMsg('');
        try {
            await api('/tenants/admin/' + encodeURIComponent(id) + '/gateway/wipe', { method: 'POST', body: '{}' });
            showMsg('نشست پاک شد. مالک می‌تواند QR تازه را اسکن کند.');
            if (detail && detail.tenant && detail.tenant.id === id) await loadDetail(id);
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'پاک کردن نشست ناموفق بود', true);
            btn.disabled = false;
        }
    }

    async function loadDetail(id) {
        const data = await api('/tenants/admin/' + encodeURIComponent(id) + '/details');
        detail = data;
        paintDetail();
    }

    async function openDetail(id) {
        detail = null;
        detailTab = 'overview';
        document.getElementById('taDetailTitle').textContent = '…';
        detailBody.innerHTML = '<div class="ta-empty">در حال بارگذاری…</div>';
        if (detailDlg.showModal && !detailDlg.open) detailDlg.showModal();
        try {
            await loadDetail(id);
        } catch (e) {
            if (e.message !== 'unauthorized') {
                detailBody.innerHTML = '<div class="ta-empty">' + esc(e.message || 'خواندن جزئیات ناموفق بود') + '</div>';
            }
        }
    }

    function openUserForm(user) {
        editingUserId = user ? user.id : null;
        userForm.reset();
        userMsg.className = 'ta-msg';
        userMsg.textContent = '';
        document.getElementById('taUserTitle').textContent = user ? 'ویرایش کاربر' : 'کاربر جدید در ' + detail.tenant.slug;
        document.getElementById('taUserHint').textContent = user
            ? 'برای تغییر رمز، رمز جدید را بنویسید یا «ساخت رمز جدید خودکار» را بزنید. با تغییر رمز، ایمیل، نام کاربری یا غیرفعال کردن، کاربر از همهٔ دستگاه‌ها خارج می‌شود.'
            : 'ورود با ایمیل یا نام کاربری انجام می‌شود. اگر رمز را خالی بگذارید یک رمز امن ساخته و یک بار نمایش داده می‌شود.';
        document.getElementById('taUserActiveRow').hidden = !user;
        document.getElementById('taUserGenRow').hidden = !user;
        const f = userForm.elements;
        f.password.placeholder = user ? 'خالی = بدون تغییر' : 'خالی = ساخت خودکار';
        if (user) {
            f.name.value = user.name || '';
            f.email.value = user.email || '';
            f.username.value = user.username || '';
            f.role.value = user.role;
            f.isActive.checked = user.isActive;
        }
        if (userDlg.showModal) userDlg.showModal();
    }

    async function saveUser(ev) {
        ev.preventDefault();
        const f = userForm.elements;
        const payload = {
            name: f.name.value.trim(),
            email: f.email.value.trim(),
            username: f.username.value.trim(),
            role: f.role.value,
        };
        if (f.password.value) payload.password = f.password.value;
        if (editingUserId) {
            payload.isActive = f.isActive.checked;
            if (!payload.password && f.generatePassword.checked) payload.generatePassword = true;
        }
        const saveBtn = document.getElementById('taUserSave');
        saveBtn.disabled = true;
        userMsg.className = 'ta-msg';
        try {
            const tid = encodeURIComponent(detail.tenant.id);
            const r = editingUserId
                ? await api('/tenants/admin/' + tid + '/users/' + encodeURIComponent(editingUserId), { method: 'PATCH', body: JSON.stringify(payload) })
                : await api('/tenants/admin/' + tid + '/users', { method: 'POST', body: JSON.stringify(payload) });
            if (userDlg.close) userDlg.close();
            await loadDetail(detail.tenant.id);
            if (r.password) {
                openCred({ loginUrl: r.loginUrl, email: r.user.email, username: r.user.username, password: r.password },
                    editingUserId ? 'رمز جدید کاربر' : 'اطلاعات ورود کاربر جدید');
            }
            load();
        } catch (e) {
            if (e.message !== 'unauthorized') {
                userMsg.textContent = e.message || 'ذخیره ناموفق بود';
                userMsg.className = 'ta-msg show err';
            }
        } finally {
            saveBtn.disabled = false;
        }
    }

    detailDlg.querySelector('.ta-tabs').addEventListener('click', function (ev) {
        const tab = ev.target.closest('.ta-tab');
        if (!tab || !detail) return;
        detailTab = tab.getAttribute('data-tab');
        paintDetail();
    });
    detailBody.addEventListener('click', async function (ev) {
        const jump = ev.target.closest('[data-tabjump]');
        if (jump && detail) {
            detailTab = jump.getAttribute('data-tabjump');
            paintDetail();
            return;
        }
        const actBtn = ev.target.closest('button[data-act]');
        if (actBtn) {
            const id = actBtn.getAttribute('data-id');
            const act = actBtn.getAttribute('data-act');
            if (act === 'wipe') { await wipeGateway(actBtn, id); return; }
            if (act === 'suspend') { await setTenantStatus(actBtn, id, 'suspended'); return; }
            if (act === 'activate') { await setTenantStatus(actBtn, id, 'active'); return; }
            if (act === 'on' || act === 'off' || act === 'restart') {
                await runGatewayAction(actBtn, id, act);
                return;
            }
        }
        const btn = ev.target.closest('button[data-uact]');
        if (!btn || !detail) return;
        if (btn.getAttribute('data-uact') === 'create') {
            openUserForm(null);
            return;
        }
        const uid = btn.getAttribute('data-uid');
        const user = detail.users.find(function (u) { return u.id === uid; });
        if (user) openUserForm(user);
    });
    detailBody.addEventListener('submit', function (ev) {
        if (ev.target && ev.target.id === 'taManageForm') saveManagedTenant(ev);
    });
    document.getElementById('taDetailClose').addEventListener('click', function () {
        if (detailDlg.close) detailDlg.close();
    });
    document.getElementById('taUserCancel').addEventListener('click', function () {
        if (userDlg.close) userDlg.close();
    });
    userForm.addEventListener('submit', saveUser);

    async function runGatewayAction(btn, id, act) {
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
            if (detail && detail.tenant && detail.tenant.id === id) await loadDetail(id);
            await load();
        } catch (e) {
            if (e.message !== 'unauthorized') showMsg(e.message || 'عملیات ناموفق بود', true);
            btn.disabled = false;
        }
    }

    body.addEventListener('click', async function (ev) {
        const btn = ev.target.closest('button[data-act]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (act === 'details') {
            await openDetail(id);
            return;
        }
        if (act === 'password') {
            await resetOwnerPassword(btn, id);
            return;
        }
        if (act === 'confirm-pay') {
            await confirmPayment(btn, id);
            return;
        }
        if (act === 'extend-trial') {
            await extendTrial(btn, id);
            return;
        }
        if (act === 'wipe') {
            await wipeGateway(btn, id);
            return;
        }
        if (act === 'suspend') {
            await setTenantStatus(btn, id, 'suspended');
            return;
        }
        if (act === 'activate') {
            await setTenantStatus(btn, id, 'active');
            return;
        }
        if (act === 'on' || act === 'off' || act === 'restart') {
            await runGatewayAction(btn, id, act);
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
    statusEl.addEventListener('change', function () { paintStatFilters(); render(); });
    gatewayEl.addEventListener('change', function () { paintStatFilters(); render(); });
    if (statsEl) {
        statsEl.addEventListener('click', function (ev) {
            const btn = ev.target.closest('.ta-stat[data-filter-status], .ta-stat[data-filter-gateway]');
            if (!btn) return;
            const fs = btn.getAttribute('data-filter-status');
            const fg = btn.getAttribute('data-filter-gateway');
            if (fs !== null && fs !== undefined) {
                statusEl.value = statusEl.value === fs ? '' : fs;
                gatewayEl.value = '';
            } else if (fg) {
                gatewayEl.value = gatewayEl.value === fg ? '' : fg;
                statusEl.value = '';
            }
            paintStatFilters();
            render();
        });
    }
    function syncAutoRefresh() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (autoRefreshEl && autoRefreshEl.checked) {
            autoTimer = setInterval(function () { load(); }, AUTO_MS);
        }
    }
    if (autoRefreshEl) autoRefreshEl.addEventListener('change', syncAutoRefresh);
    refreshBtn.addEventListener('click', load);
    load();
})();
