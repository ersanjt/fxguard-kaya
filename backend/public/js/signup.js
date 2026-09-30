/**
 * Kaya CRM — ثبت‌نام خودخدمت پنل
 * @file    public/js/signup.js
 * @layer   frontend/login
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    'use strict';

    const I18N = {
        fa: {
            doc_title: 'ساخت پنل | FXGuard',
            skip_link: 'رفتن به فرم ثبت‌نام',
            brand_sub: 'پنل واتساپ کسب‌وکار',
            kicker: '۱۴ روز آزمایش رایگان',
            hero_title: 'پنل سازمان‌تان را در چند دقیقه بسازید',
            hero_lead: 'بعد از ساخت، با همین ایمیل و رمز وارد داشبورد می‌شوید. برای ادامه بعد از آزمایش، اشتراک لازم است.',
            pt1_t: 'پنل جدا',
            pt1_d: 'هر سازمان شناسه، ورود و داده‌های خودش را دارد.',
            pt2_t: 'منو متناسب با کار شما',
            pt2_d: 'زمینهٔ فعالیت را انتخاب کنید؛ ماژول‌ها را بعداً هم می‌توانید عوض کنید.',
            pt3_t: 'شروع بدون کارت',
            pt3_d: 'برای ساخت پنل و ورود اول، اطلاعات کارت بانکی لازم نیست.',
            trust_1: '۱۴ روز آزمایش',
            trust_2: 'ورود بلافاصله',
            trust_3: 'فارسی، English، Türkçe',
            sec_org: 'سازمان',
            sec_account: 'حساب مالک',
            sub: '۱۴ روز آزمایش رایگان — بعد از آن برای ادامه اشتراک لازم است',
            lang_label: 'انتخاب زبان',
            title: 'ساخت پنل شما',
            company: 'نام مجموعه',
            industry: 'زمینهٔ فعالیت',
            industry_hint: 'منوی پنل بر اساس کسب‌وکار شما چیده می‌شود؛ بعداً از تنظیمات پنل ماژول اضافه یا حذف کنید.',
            ind_travel: 'آژانس مسافرتی و گردشگری',
            ind_health: 'بیمارستان، کلینیک و توریسم سلامت',
            ind_exchange: 'صرافی',
            ind_manufacturing: 'کارخانه و تولید',
            ind_food_distribution: 'توزیع مواد غذایی',
            ind_real_estate: 'املاک و ساخت‌وساز',
            ind_general: 'سایر کسب‌وکارها',
            modules_with: 'ماژول‌های عمومی همهٔ پنل‌ها + ماژول‌های اختصاصی: ',
            modules_general: 'ماژول‌های عمومی همهٔ پنل‌ها؛ ماژول‌های اضافی را بعداً از تنظیمات پنل اضافه کنید.',
            list_sep: '، ',
            owner: 'نام مالک',
            email: 'ایمیل مالک',
            slug: 'شناسه پنل',
            slug_help: 'فقط حروف انگلیسی کوچک، عدد و خط تیره — از نام مجموعه یا ایمیل پیشنهاد می‌شود.',
            password: 'رمز عبور',
            password_ph: 'حداقل ۸ کاراکتر، شامل حرف و عدد',
            password2: 'تکرار رمز عبور',
            password2_ph: 'همان رمز را دوباره وارد کنید',
            toggle_show: 'نمایش رمز عبور',
            toggle_hide: 'مخفی کردن رمز عبور',
            strength_1: 'ضعیف — حرف و عدد اضافه کنید',
            strength_2: 'قابل قبول',
            strength_3: 'خوب',
            strength_4: 'قوی',
            fine: 'با ساخت پنل، به‌عنوان مالک همان سازمان وارد داشبورد می‌شوید.',
            submit: 'شروع آزمایش ۱۴روزه',
            have_panel: 'قبلاً پنل دارید؟ ورود',
            slug_checking: 'در حال بررسی شناسه…',
            slug_free: 'این شناسه آزاد است.',
            slug_unavailable: 'این شناسه در دسترس نیست.',
            err_industry: 'زمینهٔ فعالیت مجموعه را انتخاب کنید.',
            err_required: 'همهٔ فیلدهای لازم را پر کنید.',
            err_slug_taken: 'شناسه پنل در دسترس نیست. یک شناسه دیگر انتخاب کنید.',
            err_email_taken: 'این ایمیل قبلاً ثبت شده است — از صفحه ورود وارد شوید.',
            err_email_invalid: 'ایمیل معتبر وارد کنید.',
            err_password_invalid: 'رمز عبور باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.',
            err_password_match: 'رمز عبور و تکرار آن یکسان نیستند.',
            err_slug_invalid: 'شناسه پنل معتبر نیست (۳ تا ۲۴ حرف انگلیسی کوچک، عدد یا خط تیره).',
            err_failed: 'ثبت‌نام ناموفق بود.',
            err_network: 'اتصال به سرور برقرار نشد.',
            ok_created: 'پنل ساخته شد. در حال ورود…',
        },
        en: {
            doc_title: 'Create your panel | FXGuard',
            skip_link: 'Skip to signup form',
            brand_sub: 'Business WhatsApp panel',
            kicker: '14-day free trial',
            hero_title: 'Create your organization’s panel in a few minutes',
            hero_lead: 'After signup you land in the dashboard with this email and password. A subscription is required to continue after the trial.',
            pt1_t: 'A separate panel',
            pt1_d: 'Each organization has its own ID, sign-in, and data.',
            pt2_t: 'A menu that fits your work',
            pt2_d: 'Pick an industry now; you can change modules later.',
            pt3_t: 'No card to start',
            pt3_d: 'Creating the panel and the first sign-in does not ask for a card.',
            trust_1: '14-day trial',
            trust_2: 'Instant sign-in',
            trust_3: 'فارسی, English, Türkçe',
            sec_org: 'Organization',
            sec_account: 'Owner account',
            sub: '14-day free trial — a subscription is required afterwards',
            lang_label: 'Language',
            title: 'Create your panel',
            company: 'Company name',
            industry: 'Industry',
            industry_hint: 'Your panel menu is arranged for your business; add or remove modules later in panel settings.',
            ind_travel: 'Travel & tourism agency',
            ind_health: 'Hospital, clinic & health tourism',
            ind_exchange: 'Currency exchange',
            ind_manufacturing: 'Factory & manufacturing',
            ind_food_distribution: 'Food distribution',
            ind_real_estate: 'Real estate & construction',
            ind_general: 'Other businesses',
            modules_with: 'Common modules for every panel + industry modules: ',
            modules_general: 'Common modules for every panel; add extra modules later in panel settings.',
            list_sep: ', ',
            owner: 'Owner name',
            email: 'Owner email',
            slug: 'Panel ID',
            slug_help: 'Lowercase letters, digits and hyphens only — suggested from the company name or email.',
            password: 'Password',
            password_ph: 'At least 8 characters, with a letter and a digit',
            password2: 'Confirm password',
            password2_ph: 'Enter the same password again',
            toggle_show: 'Show password',
            toggle_hide: 'Hide password',
            strength_1: 'Weak — add a letter and a digit',
            strength_2: 'Okay',
            strength_3: 'Good',
            strength_4: 'Strong',
            fine: 'Creating the panel signs you in as that organization’s owner.',
            submit: 'Start 14-day trial',
            have_panel: 'Already have a panel? Sign in',
            slug_checking: 'Checking panel ID…',
            slug_free: 'This panel ID is available.',
            slug_unavailable: 'This panel ID is not available.',
            err_industry: 'Select your industry.',
            err_required: 'Please fill in all required fields.',
            err_slug_taken: 'This panel ID is not available. Choose another one.',
            err_email_taken: 'This email is already registered — sign in from the login page.',
            err_email_invalid: 'Enter a valid email address.',
            err_password_invalid: 'Password must be at least 8 characters and include a letter and a digit.',
            err_password_match: 'Password and confirmation do not match.',
            err_slug_invalid: 'Invalid panel ID (3–24 lowercase letters, digits or hyphens).',
            err_failed: 'Signup failed.',
            err_network: 'Could not reach the server.',
            ok_created: 'Panel created. Signing you in…',
        },
        tr: {
            doc_title: 'Panelinizi oluşturun | FXGuard',
            skip_link: 'Kayıt formuna geç',
            brand_sub: 'İşletme WhatsApp paneli',
            kicker: '14 gün ücretsiz deneme',
            hero_title: 'Kuruluş panelinizi birkaç dakikada oluşturun',
            hero_lead: 'Kayıttan sonra aynı e-posta ve şifreyle panele girersiniz. Deneme bitince devam için abonelik gerekir.',
            pt1_t: 'Ayrı panel',
            pt1_d: 'Her kuruluşun kendi kimliği, girişi ve verisi vardır.',
            pt2_t: 'İşinize göre menü',
            pt2_d: 'Sektörü şimdi seçin; modülleri sonra değiştirebilirsiniz.',
            pt3_t: 'Başlamak için kart yok',
            pt3_d: 'Panel oluşturmak ve ilk giriş kart bilgisi istemez.',
            trust_1: '14 gün deneme',
            trust_2: 'Anında giriş',
            trust_3: 'فارسی, English, Türkçe',
            sec_org: 'Kuruluş',
            sec_account: 'Sahip hesabı',
            sub: '14 gün ücretsiz deneme — sonrasında abonelik gerekir',
            lang_label: 'Dil seçimi',
            title: 'Panelinizi oluşturun',
            company: 'Şirket adı',
            industry: 'Sektör',
            industry_hint: 'Panel menüsü işletmenize göre düzenlenir; modülleri daha sonra panel ayarlarından ekleyip kaldırabilirsiniz.',
            ind_travel: 'Seyahat ve turizm acentesi',
            ind_health: 'Hastane, klinik ve sağlık turizmi',
            ind_exchange: 'Döviz bürosu',
            ind_manufacturing: 'Fabrika ve üretim',
            ind_food_distribution: 'Gıda dağıtımı',
            ind_real_estate: 'Emlak ve inşaat',
            ind_general: 'Diğer işletmeler',
            modules_with: 'Tüm panellerin ortak modülleri + sektör modülleri: ',
            modules_general: 'Tüm panellerin ortak modülleri; ek modülleri daha sonra panel ayarlarından ekleyin.',
            list_sep: ', ',
            owner: 'Sahip adı',
            email: 'Sahip e-postası',
            slug: 'Panel kimliği',
            slug_help: 'Yalnızca küçük harf, rakam ve tire — şirket adından veya e-postadan önerilir.',
            password: 'Şifre',
            password_ph: 'En az 8 karakter, harf ve rakam içermeli',
            password2: 'Şifre tekrar',
            password2_ph: 'Aynı şifreyi yeniden girin',
            toggle_show: 'Şifreyi göster',
            toggle_hide: 'Şifreyi gizle',
            strength_1: 'Zayıf — harf ve rakam ekleyin',
            strength_2: 'Kabul edilebilir',
            strength_3: 'İyi',
            strength_4: 'Güçlü',
            fine: 'Paneli oluşturunca o kuruluşun sahibi olarak giriş yaparsınız.',
            submit: '14 günlük denemeyi başlat',
            have_panel: 'Zaten paneliniz var mı? Giriş yapın',
            slug_checking: 'Panel kimliği kontrol ediliyor…',
            slug_free: 'Bu panel kimliği kullanılabilir.',
            slug_unavailable: 'Bu panel kimliği kullanılamıyor.',
            err_industry: 'Sektörünüzü seçin.',
            err_required: 'Lütfen tüm zorunlu alanları doldurun.',
            err_slug_taken: 'Bu panel kimliği kullanılamıyor. Başka bir tane seçin.',
            err_email_taken: 'Bu e-posta zaten kayıtlı — giriş sayfasından oturum açın.',
            err_email_invalid: 'Geçerli bir e-posta adresi girin.',
            err_password_invalid: 'Şifre en az 8 karakter olmalı ve harf ile rakam içermelidir.',
            err_password_match: 'Şifre ve tekrarı aynı değil.',
            err_slug_invalid: 'Geçersiz panel kimliği (3–24 küçük harf, rakam veya tire).',
            err_failed: 'Kayıt başarısız oldu.',
            err_network: 'Sunucuya ulaşılamadı.',
            ok_created: 'Panel oluşturuldu. Giriş yapılıyor…',
        },
    };
    const SUPPORTED = ['fa', 'en', 'tr'];
    const ERROR_KEYS = {
        SLUG_TAKEN: 'err_slug_taken',
        SLUG_INVALID: 'err_slug_invalid',
        EMAIL_TAKEN: 'err_email_taken',
        EMAIL_INVALID: 'err_email_invalid',
        PASSWORD_INVALID: 'err_password_invalid',
    };

    let lang = 'fa';
    try {
        const stored = localStorage.getItem('crm_lang');
        if (SUPPORTED.indexOf(stored) >= 0) lang = stored;
    } catch (_) {}

    function t(k) {
        return (I18N[lang] && I18N[lang][k]) || I18N.fa[k] || k;
    }

    let parentHost = 'app.fxguard.io';
    let wildcardDns = false;
    const form = document.getElementById('suForm');
    const companyEl = document.getElementById('suCompany');
    const emailEl = document.getElementById('suEmail');
    const slugEl = document.getElementById('suSlug');
    const hintEl = document.getElementById('suHostHint');
    const slugStatusEl = document.getElementById('suSlugStatus');
    const msgEl = document.getElementById('suMsg');
    const btn = document.getElementById('suBtn');
    let slugCheckTimer = null;
    let lastSlugOk = null;
    let slugEdited = false;
    let slugStatusKey = '';
    let slugStatusOk = null;
    let msgKey = '';
    let msgOk = false;

    function paintMsg() {
        if (!msgEl) return;
        const text = msgKey ? t(msgKey) : '';
        msgEl.textContent = text;
        msgEl.classList.toggle('success', !!msgOk);
        msgEl.classList.toggle('error', !msgOk);
        msgEl.classList.toggle('has-text', !!text);
    }

    function setMsg(key, ok) {
        msgKey = key || '';
        msgOk = !!ok;
        paintMsg();
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

    function slugFromText(raw) {
        return normalizeSlug(String(raw || '').replace(/[\s_.]+/g, '-')).replace(/-$/, '');
    }

    function suggestedSlug() {
        const fromCompany = slugFromText(companyEl && companyEl.value);
        if (fromCompany.length >= 3) return fromCompany;
        const email = String((emailEl && emailEl.value) || '').trim().toLowerCase();
        const at = email.indexOf('@');
        if (at < 1) return '';
        const domain = email.slice(at + 1).split('.')[0] || '';
        const publicMail = /^(gmail|yahoo|hotmail|outlook|live|icloud|aol|mail|protonmail|proton|yandex|gmx|zoho)$/;
        const fromDomain = publicMail.test(domain) ? '' : slugFromText(domain);
        if (fromDomain.length >= 3) return fromDomain;
        const fromLocal = slugFromText(email.slice(0, at));
        return fromLocal.length >= 3 ? fromLocal : '';
    }

    function autofillSlug() {
        if (slugEdited || !slugEl) return;
        const next = suggestedSlug();
        if (next === slugEl.value) return;
        slugEl.value = next;
        onSlugChanged();
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

    function paintSlugStatus() {
        if (!slugStatusEl) return;
        slugStatusEl.textContent = slugStatusKey ? t(slugStatusKey) : '';
        slugStatusEl.classList.toggle('su-slug-ok', slugStatusOk === true);
        slugStatusEl.classList.toggle('su-slug-bad', slugStatusOk === false);
    }

    const passEl = document.getElementById('suPass');
    const pass2El = document.getElementById('suPass2');
    const strengthEl = document.getElementById('suStrength');
    const strengthLabel = document.getElementById('suStrengthLabel');

    function passwordScore(value) {
        const p = String(value || '');
        let score = 0;
        if (p.length >= 8) score += 1;
        if (/[A-Za-z]/.test(p) && /\d/.test(p)) score += 1;
        if (p.length >= 12) score += 1;
        if (/[^A-Za-z0-9]/.test(p)) score += 1;
        return score;
    }

    function paintStrength() {
        if (!strengthEl || !passEl) return;
        const value = passEl.value || '';
        const score = value ? passwordScore(value) : 0;
        strengthEl.className = 'su-strength' + (score ? ' is-' + score : '');
        if (strengthLabel) strengthLabel.textContent = value ? t('strength_' + score) : '';
    }

    function setSlugStatus(key, ok) {
        slugStatusKey = key || '';
        slugStatusOk = ok === undefined ? null : ok;
        paintSlugStatus();
    }

    function checkSlugAvailability() {
        const slug = normalizeSlug(slugEl && slugEl.value);
        lastSlugOk = null;
        if (!slug || slug.length < 3) {
            setSlugStatus('');
            return;
        }
        setSlugStatus('slug_checking');
        fetch('/api/tenants/check-slug?slug=' + encodeURIComponent(slug), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (d) {
                if (normalizeSlug(slugEl && slugEl.value) !== slug) return;
                if (d && d.available) {
                    lastSlugOk = true;
                    setSlugStatus('slug_free', true);
                } else {
                    lastSlugOk = false;
                    setSlugStatus('slug_unavailable', false);
                }
            })
            .catch(function () {
                if (normalizeSlug(slugEl && slugEl.value) !== slug) return;
                setSlugStatus('');
            });
    }

    function onSlugChanged() {
        updateHint();
        if (slugCheckTimer) clearTimeout(slugCheckTimer);
        slugCheckTimer = setTimeout(checkSlugAvailability, 350);
    }

    let catalog = null;
    const industryModulesEl = document.getElementById('suIndustryModules');

    function renderIndustryModules() {
        if (!industryModulesEl || !catalog || !form) return;
        const picked = form.querySelector('input[name="industry"]:checked');
        if (!picked) {
            industryModulesEl.textContent = '';
            return;
        }
        const ind = (catalog.industries || []).find(function (i) { return i.id === picked.value; });
        const labelOf = function (id) {
            const s = (catalog.skills || []).find(function (x) { return x.id === id; });
            return s && s.label ? s.label[lang] || s.label.fa || id : id;
        };
        const own = ind && ind.modules ? ind.modules.map(labelOf) : [];
        industryModulesEl.textContent = own.length
            ? t('modules_with') + own.join(t('list_sep'))
            : t('modules_general');
    }

    function applyLang(l) {
        lang = SUPPORTED.indexOf(l) >= 0 ? l : 'fa';
        try { localStorage.setItem('crm_lang', lang); } catch (_) {}
        const rtl = lang === 'fa';
        document.documentElement.lang = lang;
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        document.body.classList.toggle('ltr', !rtl);
        document.title = t('doc_title');
        document.querySelectorAll('[data-su-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-su-i18n'));
        });
        document.querySelectorAll('[data-su-i18n-ph]').forEach(function (el) {
            el.setAttribute('placeholder', t(el.getAttribute('data-su-i18n-ph')));
        });
        document.querySelectorAll('[data-su-i18n-aria]').forEach(function (el) {
            el.setAttribute('aria-label', t(el.getAttribute('data-su-i18n-aria')));
        });
        document.querySelectorAll('#lpLangSwitch button[data-lang]').forEach(function (b) {
            const active = b.getAttribute('data-lang') === lang;
            b.classList.toggle('active', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        paintSlugStatus();
        paintMsg();
        paintStrength();
        renderIndustryModules();
        const toggleBtn = document.getElementById('suTogglePass');
        if (toggleBtn && passEl) {
            const shown = passEl.type === 'text';
            toggleBtn.setAttribute('aria-label', t(shown ? 'toggle_hide' : 'toggle_show'));
        }
    }

    document.querySelectorAll('#lpLangSwitch button[data-lang]').forEach(function (b) {
        b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
    });
    applyLang(lang);

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

    fetch('/api/tenants/catalog', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (d) {
            if (d && d.ok) {
                catalog = d;
                renderIndustryModules();
            }
        })
        .catch(function () {});

    if (form) {
        form.querySelectorAll('input[name="industry"]').forEach(function (el) {
            el.addEventListener('change', renderIndustryModules);
        });
    }

    if (passEl) passEl.addEventListener('input', paintStrength);
    const passToggle = document.getElementById('suTogglePass');
    if (passToggle && passEl) {
        passToggle.addEventListener('click', function () {
            const show = passEl.type === 'password';
            passEl.type = show ? 'text' : 'password';
            if (pass2El) pass2El.type = passEl.type;
            passToggle.setAttribute('aria-label', t(show ? 'toggle_hide' : 'toggle_show'));
            passToggle.setAttribute('aria-pressed', show ? 'true' : 'false');
            const use = passToggle.querySelector('use');
            if (use) use.setAttribute('href', show ? '#lp-eye-off' : '#lp-eye');
        });
    }

    if (companyEl) companyEl.addEventListener('input', autofillSlug);
    if (emailEl) emailEl.addEventListener('input', autofillSlug);

    if (slugEl) {
        slugEl.addEventListener('input', function () {
            const cleaned = normalizeSlug(slugEl.value);
            if (slugEl.value !== cleaned) slugEl.value = cleaned;
            slugEdited = cleaned.length > 0;
            if (!slugEdited) autofillSlug();
            onSlugChanged();
        });
        slugEl.addEventListener('blur', checkSlugAvailability);
    }

    if (form) {
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            setMsg('');
            const company = (companyEl.value || '').trim();
            const ownerName = (document.getElementById('suOwner') && document.getElementById('suOwner').value || '').trim();
            const slug = normalizeSlug(slugEl && slugEl.value);
            const email = (emailEl.value || '').trim();
            const password = (passEl && passEl.value) || '';
            const password2 = (pass2El && pass2El.value) || '';
            const industryEl = form.querySelector('input[name="industry"]:checked');
            const industry = industryEl ? industryEl.value : '';
            if (!industry) {
                setMsg('err_industry');
                return;
            }
            if (!company || !slug || !email || !password) {
                setMsg('err_required');
                return;
            }
            if (password !== password2) {
                setMsg('err_password_match');
                return;
            }
            if (lastSlugOk === false) {
                setMsg('err_slug_taken');
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
                    ownerName: ownerName || company,
                    industry: industry,
                }),
            })
                .then(function (r) {
                    return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d || {} }; });
                })
                .then(function (res) {
                    if (!res.ok) {
                        btn.classList.remove('loading');
                        btn.disabled = false;
                        setMsg(ERROR_KEYS[res.d.code] || 'err_failed');
                        return;
                    }
                    setMsg('ok_created', true);
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
                    setMsg('err_network');
                });
        });
    }

    updateHint();
})();
