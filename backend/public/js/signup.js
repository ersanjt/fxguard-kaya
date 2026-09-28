/**
 * Kaya CRM — ثبت‌نام خودخدمت پنل
 * @file    public/js/signup.js
 * @layer   frontend/login
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    'use strict';

    let parentHost = 'app.fxguard.io';
    let wildcardDns = false;
    const form = document.getElementById('suForm');
    const slugEl = document.getElementById('suSlug');
    const hintEl = document.getElementById('suHostHint');
    const slugStatusEl = document.getElementById('suSlugStatus');
    const msgEl = document.getElementById('suMsg');
    const btn = document.getElementById('suBtn');
    let slugCheckTimer = null;
    let lastSlugOk = null;

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
        const slug = normalizeSlug(slugEl && slugEl.value);
        if (hintEl) {
            if (wildcardDns) {
                hintEl.textContent = slug ? slug + '.' + parentHost : 'your-desk.' + parentHost;
            } else {
                hintEl.textContent = slug
                    ? parentHost + '/login?panel=' + slug
                    : parentHost + '/login?panel=your-desk';
            }
        }
    }

    function setSlugStatus(text, ok) {
        if (!slugStatusEl) return;
        slugStatusEl.textContent = text || '';
        slugStatusEl.style.color = ok === true ? '#34d399' : ok === false ? '#f87171' : '';
    }

    function checkSlugAvailability() {
        const slug = normalizeSlug(slugEl && slugEl.value);
        lastSlugOk = null;
        if (!slug || slug.length < 3) {
            setSlugStatus('');
            return;
        }
        setSlugStatus('در حال بررسی شناسه…');
        fetch('/api/tenants/check-slug?slug=' + encodeURIComponent(slug), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (d) {
                if (normalizeSlug(slugEl && slugEl.value) !== slug) return;
                if (d && d.available) {
                    lastSlugOk = true;
                    setSlugStatus('این شناسه آزاد است.', true);
                } else {
                    lastSlugOk = false;
                    setSlugStatus((d && d.error) || 'این شناسه در دسترس نیست.', false);
                }
            })
            .catch(function () {
                if (normalizeSlug(slugEl && slugEl.value) !== slug) return;
                setSlugStatus('');
            });
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
            wildcardDns = !!(c.selfServe && c.selfServe.wildcardDns);
            updateHint();
        })
        .catch(function () {
            updateHint();
        });

    if (slugEl) {
        slugEl.addEventListener('input', function () {
            const cleaned = normalizeSlug(slugEl.value);
            if (slugEl.value !== cleaned) slugEl.value = cleaned;
            updateHint();
            if (slugCheckTimer) clearTimeout(slugCheckTimer);
            slugCheckTimer = setTimeout(checkSlugAvailability, 350);
        });
        slugEl.addEventListener('blur', checkSlugAvailability);
    }

    if (form) {
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            setMsg('');
            const company = (document.getElementById('suCompany').value || '').trim();
            const ownerName = (document.getElementById('suOwner') && document.getElementById('suOwner').value || '').trim();
            const slug = normalizeSlug(slugEl && slugEl.value);
            const email = (document.getElementById('suEmail').value || '').trim();
            const password = document.getElementById('suPass').value || '';
            if (!company || !slug || !email || !password) {
                setMsg('همهٔ فیلدهای لازم را پر کنید.');
                return;
            }
            if (lastSlugOk === false) {
                setMsg('شناسه پنل در دسترس نیست. یک شناسه دیگر انتخاب کنید.');
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
                    ownerName: ownerName || company
                })
            })
                .then(function (r) {
                    return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d || {} }; });
                })
                .then(function (res) {
                    if (!res.ok) {
                        btn.classList.remove('loading');
                        btn.disabled = false;
                        if (res.d.code === 'EMAIL_TAKEN') {
                            setMsg((res.d.error || 'این ایمیل قبلاً ثبت شده') + ' — از صفحه ورود وارد شوید.');
                            return;
                        }
                        setMsg(res.d.error || 'ثبت‌نام ناموفق بود.');
                        return;
                    }
                    setMsg('پنل ساخته شد. در حال ورود…', true);
                    try {
                        if (res.d.slug) localStorage.setItem('fxguard_panel_slug', String(res.d.slug).toLowerCase());
                    } catch (_) {}
                    const dash = res.d.dashboardUrl;
                    if (res.d.session && dash) {
                        window.location.href = dash;
                        return;
                    }
                    const url = res.d.loginUrl;
                    if (url) {
                        const join = url.indexOf('?') >= 0 ? '&' : '?';
                        window.location.href = url + join + 'email=' + encodeURIComponent(email);
                        return;
                    }
                    btn.classList.remove('loading');
                    btn.disabled = false;
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
