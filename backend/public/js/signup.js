/**
 * Kaya CRM — ثبت‌نام خودخدمت پنل
 * @file    public/js/signup.js
 * @layer   frontend/login
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    'use strict';

    var parentHost = 'app.fxguard.io';
    var form = document.getElementById('suForm');
    var slugEl = document.getElementById('suSlug');
    var hintEl = document.getElementById('suHostHint');
    var msgEl = document.getElementById('suMsg');
    var btn = document.getElementById('suBtn');

    function setMsg(text, ok) {
        if (!msgEl) return;
        msgEl.textContent = text || '';
        msgEl.classList.toggle('success', !!ok);
        msgEl.classList.toggle('error', !ok);
        msgEl.classList.toggle('has-text', !!text);
    }

    function normalizeSlug(raw) {
        return String(raw || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 24);
    }

    function updateHint() {
        var slug = normalizeSlug(slugEl && slugEl.value);
        if (hintEl) {
            hintEl.textContent = slug ? slug + '.' + parentHost : 'your-desk.' + parentHost;
        }
    }

    fetch('/api/config', { credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (c) {
            c = c || {};
            if (!c.selfServe || !c.selfServe.enabled) {
                window.location.replace('/login');
                return;
            }
            if (c.selfServe.parentHost) parentHost = c.selfServe.parentHost;
            updateHint();
        })
        .catch(function () {
            updateHint();
        });

    if (slugEl) {
        slugEl.addEventListener('input', function () {
            var cleaned = normalizeSlug(slugEl.value);
            if (slugEl.value !== cleaned) slugEl.value = cleaned;
            updateHint();
        });
    }

    if (form) {
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            setMsg('');
            var company = (document.getElementById('suCompany').value || '').trim();
            var slug = normalizeSlug(slugEl && slugEl.value);
            var email = (document.getElementById('suEmail').value || '').trim();
            var password = document.getElementById('suPass').value || '';
            if (!company || !slug || !email || !password) {
                setMsg('همهٔ فیلدها الزامی است.');
                return;
            }
            btn.classList.add('loading');
            btn.disabled = true;
            fetch('/api/tenants/signup', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    companyName: company,
                    slug: slug,
                    email: email,
                    password: password,
                    ownerName: company
                })
            })
                .then(function (r) {
                    return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d || {} }; });
                })
                .then(function (res) {
                    btn.classList.remove('loading');
                    btn.disabled = false;
                    if (!res.ok) {
                        setMsg(res.d.error || 'ثبت‌نام ناموفق بود.');
                        return;
                    }
                    setMsg('پنل ساخته شد. در حال انتقال…', true);
                    var url = res.d.loginUrl;
                    if (url) {
                        window.location.href = url;
                    }
                })
                .catch(function () {
                    btn.classList.remove('loading');
                    btn.disabled = false;
                    setMsg('اتصال به سرور برقرار نشد.');
                });
        });
    }

    updateHint();
})();
