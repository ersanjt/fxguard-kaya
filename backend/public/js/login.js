/**
 * login.js — منطق احراز هویت صفحه ورود مستقل
 * هیچ onclick/event attribute ای در HTML استفاده نشده — همه از طریق addEventListener
 */
(function () {
    'use strict';

    /* ── i18n ─────────────────────────────────────── */
    var I18N = {
        fa: {
            login_title:          'پورتال کارکنان',
            login_sub:            'ورود به پورتال از سراسر دنیا',
            login_email_lbl:      'ایمیل یا نام کاربری',
            login_pass_lbl:       'رمز عبور',
            login_btn:            'ورود به سیستم',
            login_loading:        'در حال ورود...',
            login_forgot_password:'فراموشی رمز عبور',
            login_email_required: 'ایمیل یا نام کاربری را وارد کنید.',
            login_pass_required:  'رمز عبور را وارد کنید.',
            login_err_connect:    'اتصال به سرور برقرار نشد. لطفاً دوباره تلاش کنید.',
            login_err_server:     'خطای سرور. لطفاً دوباره تلاش کنید.',
            login_err_invalid:    'پاسخ سرور نامعتبر است.',
            login_err_429:        'تعداد درخواست‌ها زیاد است. چند دقیقه صبر کنید.',
            login_err_fail:       'ایمیل یا رمز عبور اشتباه است.',
            toggle_show:          'نمایش رمز عبور',
            toggle_hide:          'مخفی کردن رمز عبور',
            totp_title:           'احراز هویت دو مرحله‌ای',
            totp_sub:             'کد شش‌رقمی اپلیکیشن Google Authenticator را وارد کنید.',
            totp_code_lbl:        'کد ۶ رقمی',
            totp_verify_btn:      'تأیید و ورود',
            totp_back:            'بازگشت',
            totp_loading:         'در حال تأیید...',
            totp_required:        'کد شش‌رقمی را وارد کنید.',
            totp_bad:             'کد اشتباه یا منقضی است.',
            totp_retry:           'لطفاً دوباره از مرحله اول وارد شوید.',
            totp_for:             'کد Google Authenticator برای',
            totp_enter:           'را وارد کنید.',
            forgot_title:         'بازیابی رمز عبور',
            forgot_sub:           'ایمیل حساب خود را وارد کنید. در صورت وجود حساب، لینک بازیابی ارسال می‌شود.',
            forgot_email_lbl:     'ایمیل حساب',
            forgot_send_btn:      'ارسال لینک بازیابی',
            forgot_back:          'بازگشت به ورود',
            forgot_loading:       'در حال ارسال...',
            forgot_email_req:     'ایمیل را وارد کنید.',
            forgot_success:       'در صورت وجود حساب، لینک بازیابی به ایمیل شما ارسال شد.',
            reset_title:          'تعیین رمز عبور جدید',
            reset_sub:            'رمز عبور جدید و تکرار آن را وارد کنید.',
            reset_new_lbl:        'رمز عبور جدید',
            reset_confirm_lbl:    'تکرار رمز عبور',
            reset_btn:            'تغییر رمز و ورود',
            reset_loading:        'در حال تغییر...',
            reset_match:          'رمز عبور و تکرار آن یکسان نیستند.',
            reset_length:         'رمز عبور حداقل ۶ کاراکتر باشد.',
            reset_expired:        'لینک بازیابی منقضی شده است. دوباره درخواست بازیابی کنید.',
            reset_fail:           'خطا در تغییر رمز عبور.',
            cant_signin:          'نمی‌توانید وارد شوید؟',
            contact_support:      'با پشتیبانی تماس بگیرید',
            demo_title:           'نسخه دمو',
            demo_credentials:     'نام کاربری: {username} | رمز عبور: {password}',
            demo_buy:             'مشاهده پلن‌ها و خرید',
            demo_brand_name:      'دمو FXGuard',
            demo_login_sub:       'ورود به محیط نمایشی — در دمو عمومی تغییرات ذخیره نمی‌شود',
            demo_page_title:      'ورود | دمو FXGuard',
            forgot_email_ph:      'email@example.com',
            reset_new_ph:         'حداقل ۶ کاراکتر',
            reset_confirm_ph:     'تکرار رمز',
            lang_fa: 'فارسی', lang_en: 'English', lang_tr: 'ترکی',
        },
        en: {
            login_title:          'Staff Portal',
            login_sub:            'Sign in to the portal from anywhere in the world',
            login_email_lbl:      'Email or username',
            login_pass_lbl:       'Password',
            login_btn:            'Sign in',
            login_loading:        'Signing in...',
            login_forgot_password:'Forgot password',
            login_email_required: 'Please enter your email or username.',
            login_pass_required:  'Please enter your password.',
            login_err_connect:    'Could not connect to server. Please try again.',
            login_err_server:     'Server error. Please try again.',
            login_err_invalid:    'Invalid server response.',
            login_err_429:        'Too many requests. Please wait a few minutes.',
            login_err_fail:       'Incorrect email or password.',
            toggle_show:          'Show password',
            toggle_hide:          'Hide password',
            totp_title:           'Two-Factor Authentication',
            totp_sub:             'Enter the 6-digit code from your Google Authenticator app.',
            totp_code_lbl:        '6-digit code',
            totp_verify_btn:      'Verify & sign in',
            totp_back:            'Back',
            totp_loading:         'Verifying...',
            totp_required:        'Please enter the 6-digit code.',
            totp_bad:             'Invalid or expired code.',
            totp_retry:           'Please sign in again from step 1.',
            totp_for:             'Google Authenticator code for',
            totp_enter:           '.',
            forgot_title:         'Reset password',
            forgot_sub:           'Enter your account email. A reset link will be sent if an account exists.',
            forgot_email_lbl:     'Account email',
            forgot_send_btn:      'Send reset link',
            forgot_back:          'Back to sign in',
            forgot_loading:       'Sending...',
            forgot_email_req:     'Please enter your email.',
            forgot_success:       'If an account exists with this email, a reset link has been sent.',
            reset_title:          'Set new password',
            reset_sub:            'Enter your new password and confirm it.',
            reset_new_lbl:        'New password',
            reset_confirm_lbl:    'Confirm password',
            reset_btn:            'Change password & sign in',
            reset_loading:        'Changing...',
            reset_match:          'Password and confirmation do not match.',
            reset_length:         'Password must be at least 6 characters.',
            reset_expired:        'Reset link has expired. Please request a new one.',
            reset_fail:           'Failed to reset password.',
            cant_signin:          "Can't sign in?",
            contact_support:      'Contact support',
            demo_title:           'Demo Access',
            demo_credentials:     'Username: {username} | Password: {password}',
            demo_buy:             'View plans and purchase',
            demo_brand_name:      'FXGuard Demo',
            demo_login_sub:       'Sign in to the read-only public demo',
            demo_page_title:      'Sign in | FXGuard Demo',
            forgot_email_ph:      'you@example.com',
            reset_new_ph:         'At least 6 characters',
            reset_confirm_ph:     'Confirm password',
            lang_fa: 'فارسی', lang_en: 'English', lang_tr: 'Turkish',
        },
        tr: {
            login_title:          'Personel Portalı',
            login_sub:            'Dünyanın her yerinden portala giriş yapın',
            login_email_lbl:      'E-posta veya kullanıcı adı',
            login_pass_lbl:       'Şifre',
            login_btn:            'Giriş yap',
            login_loading:        'Giriş yapılıyor...',
            login_forgot_password:'Şifremi unuttum',
            login_email_required: 'E-posta veya kullanıcı adınızı girin.',
            login_pass_required:  'Şifrenizi girin.',
            login_err_connect:    'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.',
            login_err_server:     'Sunucu hatası. Lütfen tekrar deneyin.',
            login_err_invalid:    'Sunucu yanıtı geçersiz.',
            login_err_429:        'Çok fazla istek. Birkaç dakika bekleyin.',
            login_err_fail:       'E-posta veya şifre hatalı.',
            toggle_show:          'Şifreyi göster',
            toggle_hide:          'Şifreyi gizle',
            totp_title:           'İki Faktörlü Doğrulama',
            totp_sub:             'Google Authenticator uygulamasındaki 6 haneli kodu girin.',
            totp_code_lbl:        '6 haneli kod',
            totp_verify_btn:      'Doğrula ve giriş yap',
            totp_back:            'Geri',
            totp_loading:         'Doğrulanıyor...',
            totp_required:        '6 haneli kodu girin.',
            totp_bad:             'Kod hatalı veya süresi dolmuş.',
            totp_retry:           'Lütfen tekrar birinci adımdan giriş yapın.',
            totp_for:             'Google Authenticator kodu',
            totp_enter:           'girin.',
            forgot_title:         'Şifre sıfırlama',
            forgot_sub:           'Hesap e-postanızı girin. Hesap varsa sıfırlama bağlantısı gönderilir.',
            forgot_email_lbl:     'Hesap e-postası',
            forgot_send_btn:      'Sıfırlama bağlantısı gönder',
            forgot_back:          'Girişe dön',
            forgot_loading:       'Gönderiliyor...',
            forgot_email_req:     'E-postanızı girin.',
            forgot_success:       'Bu e-postayla hesap varsa sıfırlama bağlantısı gönderildi.',
            reset_title:          'Yeni şifre belirleme',
            reset_sub:            'Yeni şifrenizi ve tekrarını girin.',
            reset_new_lbl:        'Yeni şifre',
            reset_confirm_lbl:    'Şifre tekrar',
            reset_btn:            'Şifreyi değiştir ve giriş yap',
            reset_loading:        'Değiştiriliyor...',
            reset_match:          'Şifre ve tekrarı aynı değil.',
            reset_length:         'Şifre en az 6 karakter olmalıdır.',
            reset_expired:        'Sıfırlama bağlantısının süresi dolmuş. Yeniden isteyin.',
            reset_fail:           'Şifre sıfırlama başarısız.',
            cant_signin:          'Giriş yapamıyor musunuz?',
            contact_support:      'Destekle iletişime geçin',
            demo_title:           'Demo Erişimi',
            demo_credentials:     'Kullanıcı adı: {username} | Şifre: {password}',
            demo_buy:             'Planları incele ve satın al',
            demo_brand_name:      'FXGuard Demo',
            demo_login_sub:       'Salt okunur genel demo ortamına giriş',
            demo_page_title:      'Giriş | FXGuard Demo',
            forgot_email_ph:      'ornek@email.com',
            reset_new_ph:         'En az 6 karakter',
            reset_confirm_ph:     'Şifre tekrar',
            lang_fa: 'فارسی', lang_en: 'English', lang_tr: 'Türkçe',
        }
    };

    var SUPPORTED = ['fa', 'en', 'tr'];
    var lang = localStorage.getItem('crm_lang') || 'fa';
    if (SUPPORTED.indexOf(lang) < 0) lang = 'fa';
    (function syncAppHostLoginLangEarly() {
        try {
            if (/^app\.fxguard\.io$/i.test(window.location.hostname || '')) {
                SUPPORTED = ['en', 'tr'];
                if (lang === 'fa' || SUPPORTED.indexOf(lang) < 0) lang = 'en';
                localStorage.setItem('crm_lang', lang);
            }
        } catch (e) {}
    })();

    function loginIsPublicRestricted() {
        return !!(DEMO_INFO.publicSite || /^app\.fxguard\.io$/i.test(window.location.hostname || ''));
    }

    function t(k) {
        return (I18N[lang] && I18N[lang][k]) || (I18N['fa'] && I18N['fa'][k]) || k;
    }
    var DEMO_INFO = { enabled: false, publicSite: false, username: 'demo', password: '123456', salesUrl: 'https://fxguard.io' };

    function detectFxguardPublicSite(c) {
        try {
            if (c && c.fxguardPublicSite) return true;
            return /^app\.fxguard\.io$/i.test(window.location.hostname || '');
        } catch (e) {
            return !!(c && c.fxguardPublicSite);
        }
    }

    function renderDemoBox() {
        var box = document.getElementById('lpDemoBox');
        if (!box) return;
        if (!DEMO_INFO.enabled) {
            box.style.display = 'none';
            return;
        }
        box.style.display = '';
        var titleEl = box.querySelector('.lp-demo-title');
        if (titleEl) titleEl.textContent = t('demo_title');
        var textEl = document.getElementById('lpDemoText');
        if (textEl) {
            textEl.textContent = t('demo_credentials')
                .replace('{username}', DEMO_INFO.username || 'demo')
                .replace('{password}', DEMO_INFO.password || '123456');
        }
        var buyLink = document.getElementById('lpDemoBuyLink');
        if (buyLink) {
            buyLink.textContent = t('demo_buy');
            buyLink.href = DEMO_INFO.salesUrl || 'https://fxguard.io';
        }
    }

    /* ── Apply Language ───────────────────────────── */
    function applyLang(l) {
        if (loginIsPublicRestricted()) {
            SUPPORTED = ['en', 'tr'];
            if (SUPPORTED.indexOf(l) < 0 || l === 'fa') l = 'en';
        } else if (SUPPORTED.indexOf(l) < 0) {
            l = 'fa';
        }
        lang = l;
        localStorage.setItem('crm_lang', l);

        var isRtl = (l === 'fa');
        document.documentElement.lang = l;
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.body.classList.toggle('ltr', !isRtl);

        /* lang buttons */
        document.querySelectorAll('#lpLangSwitch button[data-lang]').forEach(function(btn) {
            var code = btn.getAttribute('data-lang');
            if (loginIsPublicRestricted() && code === 'fa') {
                btn.style.display = 'none';
                return;
            }
            if (code === 'fa') btn.style.display = '';
            var isActive = code === l;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            var k = 'lang_' + code;
            btn.textContent = t(k);
        });

        /* data-i18n elements */
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var v = t(el.getAttribute('data-i18n'));
            if (v) el.textContent = v;
        });

        /* data-i18n-ph placeholders */
        document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
            var v = t(el.getAttribute('data-i18n-ph'));
            if (v) el.placeholder = v;
        });
        if (DEMO_INFO.enabled || DEMO_INFO.publicSite) {
            document.title = t('demo_page_title');
        }
        renderDemoBox();
    }

    /* ── Step Management ─────────────────────────── */
    function showStep(id) {
        document.querySelectorAll('.lp-step').forEach(function(s) {
            s.classList.remove('active');
        });
        var el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    /* ── Messages ────────────────────────────────── */
    function setMsg(id, text, type) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = text || '';
        el.className = 'lp-msg ' + (type || 'error');
        if (text) el.classList.add('has-text');
    }
    function clearMsg(id) { setMsg(id, '', 'error'); }

    /* ── Button Loading ──────────────────────────── */
    function setBtnLoading(btnId, loading, text) {
        var btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.classList.toggle('loading', loading);
        var span = btn.querySelector('.lp-btn-text');
        if (span && text) span.textContent = text;
    }

    /* ── Login ───────────────────────────────────── */
    function doLogin() {
        var emailEl = document.getElementById('lpEmail');
        var passEl  = document.getElementById('lpPass');
        var email   = emailEl ? emailEl.value.trim() : '';
        var pass    = passEl  ? passEl.value          : '';
        clearMsg('loginMsg');

        if (!email) { setMsg('loginMsg', t('login_email_required')); return; }
        if (!pass)  { setMsg('loginMsg', t('login_pass_required'));  return; }

        setBtnLoading('btnLogin', true, t('login_loading'));

        fetch('/api/auth/login', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        }).then(function(r) {
            var status = r.status;
            return r.text().then(function(text) { return { status: status, text: text }; });
        }).then(function(res) {
            setBtnLoading('btnLogin', false, t('login_btn'));

            if ((res.text || '').trim().startsWith('<')) {
                setMsg('loginMsg', t('login_err_server'));
                return;
            }

            var data;
            try { data = JSON.parse(res.text); } catch (_) {
                setMsg('loginMsg', res.status === 429 ? t('login_err_429') : t('login_err_invalid'));
                return;
            }

            if (res.status === 429) {
                setMsg('loginMsg', (data && data.error) || t('login_err_429'));
                return;
            }

            if (data && data.needTotp && data.tempToken) {
                window._lpTotpTemp = data.tempToken;
                var subEl = document.getElementById('totpFor');
                if (subEl) subEl.textContent = t('totp_for') + ' ' + (data.email || '') + ' ' + t('totp_enter');
                var codeEl = document.getElementById('lpTotpCode');
                if (codeEl) { codeEl.value = ''; setTimeout(function(){ codeEl.focus(); }, 100); }
                clearMsg('totpMsg');
                showStep('stepTotp');
                return;
            }

            if (data && data.token) {
                localStorage.setItem('crm_token', data.token);
                window.location.href = '/dashboard';
                return;
            }

            setMsg('loginMsg', (data && data.error) || t('login_err_fail'));
        }).catch(function() {
            setBtnLoading('btnLogin', false, t('login_btn'));
            setMsg('loginMsg', t('login_err_connect'));
        });
    }

    /* ── TOTP ────────────────────────────────────── */
    function doVerifyTotp() {
        var codeEl = document.getElementById('lpTotpCode');
        var code   = codeEl ? codeEl.value.replace(/\s/g, '') : '';
        clearMsg('totpMsg');

        if (!code || code.length !== 6) { setMsg('totpMsg', t('totp_required')); return; }
        if (!window._lpTotpTemp)        { setMsg('totpMsg', t('totp_retry'));    return; }

        setBtnLoading('btnTotpVerify', true, t('totp_loading'));

        fetch('/api/auth/totp/verify-login', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken: window._lpTotpTemp, code: code })
        }).then(function(r) {
            return r.json().catch(function() { return {}; });
        }).then(function(data) {
            setBtnLoading('btnTotpVerify', false, t('totp_verify_btn'));
            if (data && data.token) {
                localStorage.setItem('crm_token', data.token);
                window.location.href = '/dashboard';
                return;
            }
            setMsg('totpMsg', (data && data.error) || t('totp_bad'));
        }).catch(function() {
            setBtnLoading('btnTotpVerify', false, t('totp_verify_btn'));
            setMsg('totpMsg', t('login_err_connect'));
        });
    }

    function goBackToLogin() {
        window._lpTotpTemp = null;
        clearMsg('loginMsg');
        showStep('stepLogin');
    }

    /* ── Forgot Password ─────────────────────────── */
    function showForgot() {
        clearMsg('forgotMsg');
        var fEl = document.getElementById('lpForgotEmail');
        if (fEl) fEl.value = '';
        var suc = document.getElementById('forgotSuccess');
        if (suc) { suc.textContent = ''; suc.className = 'lp-msg success'; }
        showStep('stepForgot');
        setTimeout(function() { var e = document.getElementById('lpForgotEmail'); if (e) e.focus(); }, 100);
    }

    function doForgot() {
        var emailEl = document.getElementById('lpForgotEmail');
        var email   = emailEl ? emailEl.value.trim() : '';
        clearMsg('forgotMsg');
        var suc = document.getElementById('forgotSuccess');
        if (suc) { suc.textContent = ''; suc.className = 'lp-msg success'; }

        if (!email) { setMsg('forgotMsg', t('forgot_email_req')); return; }

        setBtnLoading('btnForgotSend', true, t('forgot_loading'));

        fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        }).then(function(r) {
            return r.json().catch(function() { return {}; });
        }).then(function(data) {
            setBtnLoading('btnForgotSend', false, t('forgot_send_btn'));
            if (suc) {
                suc.textContent = (data && data.message) || t('forgot_success');
                suc.className = 'lp-msg success has-text';
            }
        }).catch(function() {
            setBtnLoading('btnForgotSend', false, t('forgot_send_btn'));
            setMsg('forgotMsg', t('login_err_connect'));
        });
    }

    function goBackFromForgot() {
        clearMsg('loginMsg');
        showStep('stepLogin');
    }

    /* ── Reset Password ──────────────────────────── */
    function showReset(token) {
        window._lpResetToken = token;
        var p1 = document.getElementById('lpResetNew');
        var p2 = document.getElementById('lpResetConfirm');
        if (p1) p1.value = '';
        if (p2) p2.value = '';
        clearMsg('resetMsg');
        showStep('stepReset');
    }

    function doReset() {
        var np = document.getElementById('lpResetNew')     ? document.getElementById('lpResetNew').value     : '';
        var cp = document.getElementById('lpResetConfirm') ? document.getElementById('lpResetConfirm').value : '';
        clearMsg('resetMsg');

        if (np !== cp)     { setMsg('resetMsg', t('reset_match'));   return; }
        if (np.length < 6) { setMsg('resetMsg', t('reset_length'));  return; }
        if (!window._lpResetToken) { setMsg('resetMsg', t('reset_expired')); return; }

        setBtnLoading('btnResetSubmit', true, t('reset_loading'));

        fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window._lpResetToken, newPassword: np })
        }).then(function(r) {
            return r.json().catch(function() { return {}; });
        }).then(function(data) {
            if (data && data.message) {
                window._lpResetToken = null;
                try { window.history.replaceState(null, '', window.location.pathname); } catch(_) {}
                setBtnLoading('btnResetSubmit', false, t('reset_btn'));
                setMsg('resetMsg', data.message, 'success');
                setTimeout(function() {
                    clearMsg('resetMsg');
                    showStep('stepLogin');
                    setMsg('loginMsg', data.message, 'success');
                }, 1800);
                return;
            }
            setBtnLoading('btnResetSubmit', false, t('reset_btn'));
            setMsg('resetMsg', (data && data.error) || t('reset_fail'));
        }).catch(function() {
            setBtnLoading('btnResetSubmit', false, t('reset_btn'));
            setMsg('resetMsg', t('login_err_connect'));
        });
    }

    function goBackFromReset() {
        window._lpResetToken = null;
        clearMsg('loginMsg');
        try { window.history.replaceState(null, '', window.location.pathname); } catch(_) {}
        showStep('stepLogin');
    }

    /* ── Password Toggle ─────────────────────────── */
    function initToggle() {
        var inp = document.getElementById('lpPass');
        var btn = document.getElementById('btnTogglePass');
        if (!inp || !btn) return;
        btn.addEventListener('click', function() {
            var show = inp.type === 'password';
            inp.type = show ? 'text' : 'password';
            var lbl = show ? t('toggle_hide') : t('toggle_show');
            btn.setAttribute('title', lbl);
            btn.setAttribute('aria-label', lbl);
            btn.setAttribute('aria-pressed', show ? 'true' : 'false');
            var iconUse = btn.querySelector('use');
            if (iconUse) iconUse.setAttribute('href', show ? '#lp-eye-off' : '#lp-eye');
        });
    }

    /* ── Enter Key ───────────────────────────────── */
    function onEnterKey(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var activeStep = document.querySelector('.lp-step.active');
        if (!activeStep) { doLogin(); return; }
        var id = activeStep.id;
        if (id === 'stepTotp')   doVerifyTotp();
        else if (id === 'stepForgot') doForgot();
        else if (id === 'stepReset')  doReset();
        else                          doLogin();
    }

    /* ── Load Branding ───────────────────────────── */
    function loadBranding() {
        fetch('/api/panel-settings/public/branding')
            .then(function(r) { return r.json().catch(function() { return {}; }); })
            .then(function(d) {
                if (!d) return;
                var nameEl = document.getElementById('lpBrandName');
                if (nameEl && d.siteName) nameEl.textContent = d.siteName;

                var logoWrap = document.getElementById('lpLogoWrap');
                var loginLogoSrc = (d.loginLogoUrl && String(d.loginLogoUrl).trim()) ? d.loginLogoUrl : d.logoUrl;
                if (logoWrap && loginLogoSrc) {
                    var img = document.createElement('img');
                    img.src = loginLogoSrc; img.alt = 'logo';
                    logoWrap.innerHTML = '';
                    logoWrap.appendChild(img);
                }

                var fav = document.getElementById('lpFavicon');
                if (fav && d.faviconUrl) fav.href = d.faviconUrl;

                if (d.siteName) document.title = d.siteName + ' | ورود';

                if (d.supportedLanguages && Array.isArray(d.supportedLanguages) && d.supportedLanguages.length) {
                    SUPPORTED = d.supportedLanguages;
                    var lpLang = document.getElementById('lpLangSwitch');
                    if (lpLang) {
                        lpLang.querySelectorAll('button[data-lang]').forEach(function(btn) {
                            btn.style.display = SUPPORTED.indexOf(btn.getAttribute('data-lang')) >= 0 ? '' : 'none';
                        });
                    }
                    if (SUPPORTED.indexOf(lang) < 0) {
                        applyLang(d.defaultLanguage || SUPPORTED[0] || 'fa');
                    }
                }

                var supportLink = document.getElementById('lpSupportLink');
                if (supportLink && d.supportUrl) supportLink.href = d.supportUrl;
            })
            .catch(function() {});
    }
    function applyDemoPortalBranding() {
        var nameEl = document.getElementById('lpBrandName');
        if (nameEl) nameEl.setAttribute('data-i18n', 'demo_brand_name');
        var subEl = document.getElementById('lpBrandSub');
        if (subEl) subEl.setAttribute('data-i18n', 'demo_login_sub');
        var fav = document.getElementById('lpFavicon');
        if (fav) fav.href = '/favicon-fxguard.svg';
        applyLang(lang);
    }

    function loadPublicConfigAndBranding() {
        fetch('/api/config')
            .then(function(r) { return r.json().catch(function() { return {}; }); })
            .then(function(c) {
                c = c || {};
                DEMO_INFO.enabled = !!c.demoMode;
                DEMO_INFO.publicSite = detectFxguardPublicSite(c);
                DEMO_INFO.username = c.demoUsername || 'demo';
                DEMO_INFO.password = c.demoPassword || '123456';
                DEMO_INFO.salesUrl = c.salesUrl || 'https://fxguard.io';
                var supportLink = document.getElementById('lpSupportLink');
                if (supportLink && c.supportUrl) supportLink.href = c.supportUrl;
                if (DEMO_INFO.publicSite) {
                    SUPPORTED = ['en', 'tr'];
                    if (lang === 'fa' || SUPPORTED.indexOf(lang) < 0) lang = 'en';
                    localStorage.setItem('crm_lang', lang);
                    applyDemoPortalBranding();
                } else {
                    loadBranding();
                }
                renderDemoBox();
            })
            .catch(function() {
                DEMO_INFO.publicSite = detectFxguardPublicSite(null);
                if (DEMO_INFO.publicSite) {
                    SUPPORTED = ['en', 'tr'];
                    if (lang === 'fa' || SUPPORTED.indexOf(lang) < 0) lang = 'en';
                    localStorage.setItem('crm_lang', lang);
                    applyDemoPortalBranding();
                } else {
                    loadBranding();
                }
                renderDemoBox();
            });
    }

    /* ── Check URL for reset token ───────────────── */
    function checkResetUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            if (params.get('reset') === '1' && params.get('token')) {
                showReset(params.get('token'));
            }
        } catch(_) {}
    }

    /* ── Check existing token ────────────────────── */
    function checkExistingToken() {
        var existing = localStorage.getItem('crm_token');
        if (!existing) return;
        fetch('/api/auth/me', {
            credentials: 'include',
            headers: { 'Authorization': 'Bearer ' + existing }
        }).then(function(r) {
            return r.json().then(function(d) {
                return { ok: r.ok, d: d };
            }).catch(function() {
                return { ok: r.ok, d: {} };
            });
        }).then(function(res) {
            if (res.ok && res.d && res.d.email && !res.d.error) {
                window.location.href = '/dashboard';
            } else {
                localStorage.removeItem('crm_token');
            }
        }).catch(function() {
            localStorage.removeItem('crm_token');
        });
    }

    /* ── DOMContentLoaded — attach ALL event listeners ── */
    document.addEventListener('DOMContentLoaded', function() {

        /* Language buttons */
        document.querySelectorAll('#lpLangSwitch button[data-lang]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                applyLang(btn.getAttribute('data-lang'));
            });
        });

        /* Login button */
        var btnLogin = document.getElementById('btnLogin');
        if (btnLogin) btnLogin.addEventListener('click', doLogin);

        /* Forgot password link */
        var forgotLink = document.getElementById('lpForgotLink');
        if (forgotLink) forgotLink.addEventListener('click', function(e) {
            e.preventDefault(); showForgot();
        });

        /* TOTP verify button */
        var btnTotp = document.getElementById('btnTotpVerify');
        if (btnTotp) btnTotp.addEventListener('click', doVerifyTotp);

        /* TOTP back button */
        var btnTotpBack = document.getElementById('btnTotpBack');
        if (btnTotpBack) btnTotpBack.addEventListener('click', goBackToLogin);

        /* Forgot send button */
        var btnForgotSend = document.getElementById('btnForgotSend');
        if (btnForgotSend) btnForgotSend.addEventListener('click', doForgot);

        /* Forgot back button */
        var btnForgotBack = document.getElementById('btnForgotBack');
        if (btnForgotBack) btnForgotBack.addEventListener('click', goBackFromForgot);

        /* Reset submit button */
        var btnReset = document.getElementById('btnResetSubmit');
        if (btnReset) btnReset.addEventListener('click', doReset);

        /* Reset back button */
        var btnResetBack = document.getElementById('btnResetBack');
        if (btnResetBack) btnResetBack.addEventListener('click', goBackFromReset);

        /* Password toggle */
        initToggle();

        /* Enter key on inputs */
        ['lpEmail', 'lpPass', 'lpTotpCode', 'lpForgotEmail', 'lpResetNew', 'lpResetConfirm'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('keydown', onEnterKey);
        });

        /* Apply stored language */
        applyLang(lang);

        /* Config + panel branding (skipped in demo mode — FXGuard demo labels instead) */
        loadPublicConfigAndBranding();

        /* Redirect if already logged in */
        checkExistingToken();

        /* Handle reset link */
        checkResetUrl();
    });

})();
