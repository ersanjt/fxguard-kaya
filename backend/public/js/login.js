/**
 * login.js — منطق احراز هویت صفحه ورود مستقل
 * بدون وابستگی به dashboard.js / dashboard-i18n.js
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
            lang_fa: 'فارسی', lang_en: 'English', lang_tr: 'Türkçe',
        }
    };

    var SUPPORTED = ['fa', 'en', 'tr'];
    var lang = localStorage.getItem('crm_lang') || 'fa';
    if (SUPPORTED.indexOf(lang) < 0) lang = 'fa';

    function t(k) {
        return (I18N[lang] && I18N[lang][k]) || (I18N.fa && I18N.fa[k]) || k;
    }

    /* ── Apply Language ───────────────────────────── */
    function applyLang(l) {
        if (SUPPORTED.indexOf(l) < 0) l = 'fa';
        lang = l;
        window.__LP_LANG = l;
        localStorage.setItem('crm_lang', l);

        var isRtl = (l === 'fa');
        document.documentElement.lang = l;
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.body.classList.toggle('ltr', !isRtl);

        /* update lang buttons */
        document.querySelectorAll('.lp-lang button[data-lang]').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === l);
            var k = 'lang_' + btn.getAttribute('data-lang');
            btn.textContent = t(k);
        });

        /* translate all [data-i18n] elements */
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var v = t(el.getAttribute('data-i18n'));
            if (v) el.textContent = v;
        });
        document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
            var v = t(el.getAttribute('data-i18n-ph'));
            if (v) el.placeholder = v;
        });
    }

    window.setLang = function(l) { applyLang(l); };

    /* ── Step Management ─────────────────────────── */
    function showStep(id) {
        document.querySelectorAll('.lp-step').forEach(function(s) {
            s.classList.remove('active');
        });
        var el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    /* ── Error/Success Messages ──────────────────── */
    function setMsg(id, text, type) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = text || '';
        el.className = 'lp-msg ' + (type || 'error');
        if (text) el.classList.add('has-text');
    }
    function clearMsg(id) { setMsg(id, '', 'error'); }

    /* ── Button Loading State ─────────────────────── */
    function setBtnLoading(btnId, loading, text) {
        var btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = loading;
        btn.classList.toggle('loading', loading);
        var span = btn.querySelector('.lp-btn-text');
        if (span && text) span.textContent = text;
    }

    /* ── Step 1: Login ───────────────────────────── */
    window.doLogin = async function() {
        var email = (document.getElementById('lpEmail') && document.getElementById('lpEmail').value || '').trim();
        var pass  = (document.getElementById('lpPass')  && document.getElementById('lpPass').value  || '');
        clearMsg('loginMsg');

        if (!email) { setMsg('loginMsg', t('login_email_required')); return; }
        if (!pass)  { setMsg('loginMsg', t('login_pass_required'));  return; }

        setBtnLoading('btnLogin', true, t('login_loading'));

        var r, text;
        try {
            r = await fetch('/api/auth/login', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: pass })
            });
            text = await r.text();
        } catch (e) {
            setBtnLoading('btnLogin', false, t('login_btn'));
            setMsg('loginMsg', t('login_err_connect'));
            return;
        }

        setBtnLoading('btnLogin', false, t('login_btn'));

        if ((text || '').trim().startsWith('<')) {
            setMsg('loginMsg', t('login_err_server'));
            return;
        }

        var data;
        try { data = JSON.parse(text); } catch (_) {
            setMsg('loginMsg', r.status === 429 ? t('login_err_429') : t('login_err_invalid'));
            return;
        }

        if (r.status === 429) {
            setMsg('loginMsg', (data && data.error) || t('login_err_429'));
            return;
        }

        /* TOTP required */
        if (data.needTotp && data.tempToken) {
            window._lpTotpTemp = data.tempToken;
            var sub = document.getElementById('totpFor');
            if (sub) sub.textContent = t('totp_for') + ' ' + (data.email || '') + ' ' + t('totp_enter');
            var codeEl = document.getElementById('lpTotpCode');
            if (codeEl) { codeEl.value = ''; setTimeout(function(){ codeEl.focus(); }, 100); }
            clearMsg('totpMsg');
            showStep('stepTotp');
            return;
        }

        /* Success */
        if (data.token) {
            localStorage.setItem('crm_token', data.token);
            window.location.href = '/dashboard';
            return;
        }

        setMsg('loginMsg', (data && data.error) || t('login_err_fail'));
    };

    /* ── Step 2: TOTP ────────────────────────────── */
    window.doVerifyTotp = async function() {
        var code = (document.getElementById('lpTotpCode') && document.getElementById('lpTotpCode').value || '').replace(/\s/g,'');
        clearMsg('totpMsg');

        if (!code || code.length !== 6) { setMsg('totpMsg', t('totp_required')); return; }
        if (!window._lpTotpTemp)        { setMsg('totpMsg', t('totp_retry')); return; }

        setBtnLoading('btnTotpVerify', true, t('totp_loading'));

        var r, data;
        try {
            r = await fetch('/api/auth/totp/verify-login', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempToken: window._lpTotpTemp, code: code })
            });
            data = await r.json().catch(function(){ return {}; });
        } catch (e) {
            setBtnLoading('btnTotpVerify', false, t('totp_verify_btn'));
            setMsg('totpMsg', t('login_err_connect'));
            return;
        }

        setBtnLoading('btnTotpVerify', false, t('totp_verify_btn'));

        if (data.token) {
            localStorage.setItem('crm_token', data.token);
            window.location.href = '/dashboard';
            return;
        }
        setMsg('totpMsg', (data && data.error) || t('totp_bad'));
    };

    window.goBackToLogin = function() {
        window._lpTotpTemp = null;
        clearMsg('loginMsg');
        showStep('stepLogin');
    };

    /* ── Step 3: Forgot Password ─────────────────── */
    window.showForgot = function() {
        clearMsg('forgotMsg');
        var fEl = document.getElementById('lpForgotEmail');
        if (fEl) fEl.value = '';
        var suc = document.getElementById('forgotSuccess');
        if (suc) { suc.textContent = ''; suc.classList.remove('has-text','success'); }
        showStep('stepForgot');
    };

    window.doForgot = async function() {
        var email = (document.getElementById('lpForgotEmail') && document.getElementById('lpForgotEmail').value || '').trim();
        clearMsg('forgotMsg');
        var suc = document.getElementById('forgotSuccess');
        if (suc) { suc.textContent = ''; suc.classList.remove('has-text','success'); }

        if (!email) { setMsg('forgotMsg', t('forgot_email_req')); return; }

        setBtnLoading('btnForgotSend', true, t('forgot_loading'));

        try {
            var r = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            var data = await r.json().catch(function(){ return {}; });
            if (suc) {
                suc.textContent = data.message || t('forgot_success');
                suc.className = 'lp-msg success has-text';
            }
        } catch (e) {
            setMsg('forgotMsg', t('login_err_connect'));
        }

        setBtnLoading('btnForgotSend', false, t('forgot_send_btn'));
    };

    window.goBackFromForgot = function() {
        clearMsg('loginMsg');
        showStep('stepLogin');
    };

    /* ── Step 4: Reset Password ──────────────────── */
    window.showReset = function(token) {
        window._lpResetToken = token;
        var p1 = document.getElementById('lpResetNew');
        var p2 = document.getElementById('lpResetConfirm');
        if (p1) p1.value = '';
        if (p2) p2.value = '';
        clearMsg('resetMsg');
        showStep('stepReset');
    };

    window.doReset = async function() {
        var np = (document.getElementById('lpResetNew')     && document.getElementById('lpResetNew').value     || '');
        var cp = (document.getElementById('lpResetConfirm') && document.getElementById('lpResetConfirm').value || '');
        clearMsg('resetMsg');

        if (np !== cp)      { setMsg('resetMsg', t('reset_match'));   return; }
        if (np.length < 6)  { setMsg('resetMsg', t('reset_length'));  return; }
        if (!window._lpResetToken) { setMsg('resetMsg', t('reset_expired')); return; }

        setBtnLoading('btnResetSubmit', true, t('reset_loading'));

        try {
            var r = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: window._lpResetToken, newPassword: np })
            });
            var data = await r.json().catch(function(){ return {}; });

            if (r.ok && data.message) {
                window._lpResetToken = null;
                try { window.history.replaceState(null,'', window.location.pathname); } catch(_){}
                /* Show success then go to login */
                setMsg('resetMsg', data.message, 'success');
                setTimeout(function(){
                    clearMsg('resetMsg');
                    showStep('stepLogin');
                    /* Show the success message on login step */
                    setMsg('loginMsg', data.message, 'success');
                }, 1800);
                setBtnLoading('btnResetSubmit', false, t('reset_btn'));
                return;
            }
            setMsg('resetMsg', (data && data.error) || t('reset_fail'));
        } catch (e) {
            setMsg('resetMsg', t('login_err_connect'));
        }

        setBtnLoading('btnResetSubmit', false, t('reset_btn'));
    };

    window.goBackFromReset = function() {
        window._lpResetToken = null;
        clearMsg('loginMsg');
        try { window.history.replaceState(null,'', window.location.pathname); } catch(_){}
        showStep('stepLogin');
    };

    /* ── Password Toggle ─────────────────────────── */
    function initToggle(inputId, btnId) {
        var inp = document.getElementById(inputId);
        var btn = document.getElementById(btnId);
        if (!inp || !btn) return;
        btn.addEventListener('click', function() {
            var show = inp.type === 'password';
            inp.type = show ? 'text' : 'password';
            var lbl = show ? t('toggle_hide') : t('toggle_show');
            btn.setAttribute('title', lbl);
            btn.setAttribute('aria-label', lbl);
            btn.setAttribute('aria-pressed', show ? 'true' : 'false');
            btn.classList.toggle('active', show);
            var icon = btn.querySelector('.eye-icon, use');
            if (icon && icon.tagName.toLowerCase() === 'use') {
                icon.setAttribute('href', show ? '#lp-eye-off' : '#lp-eye');
            }
        });
    }

    /* ── Enter Key ───────────────────────────────── */
    function onKey(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var totp  = document.getElementById('stepTotp');
        var forgot= document.getElementById('stepForgot');
        var reset = document.getElementById('stepReset');
        if (totp   && totp.classList.contains('active'))   window.doVerifyTotp();
        else if (forgot && forgot.classList.contains('active')) window.doForgot();
        else if (reset  && reset.classList.contains('active'))  window.doReset();
        else window.doLogin();
    }

    /* ── Load Branding ───────────────────────────── */
    function loadBranding() {
        fetch('/api/panel-settings/public/branding')
            .then(function(r){ return r.json().catch(function(){ return {}; }); })
            .then(function(d) {
                if (!d) return;
                /* Brand name */
                var nameEl = document.getElementById('lpBrandName');
                if (nameEl && d.siteName) nameEl.textContent = d.siteName;

                /* Logo */
                var logoWrap = document.getElementById('lpLogoWrap');
                if (logoWrap && d.logoUrl) {
                    logoWrap.innerHTML = '<img src="' + d.logoUrl + '" alt="logo">';
                }

                /* Favicon */
                var fav = document.getElementById('lpFavicon');
                if (fav && d.faviconUrl) fav.href = d.faviconUrl;

                /* Page title */
                if (d.siteName) document.title = d.siteName + ' | ورود';

                /* Supported languages */
                if (d.supportedLanguages && Array.isArray(d.supportedLanguages)) {
                    var sup = d.supportedLanguages;
                    SUPPORTED = sup.length ? sup : ['fa','en','tr'];
                    var lpLang = document.getElementById('lpLangSwitch');
                    if (lpLang) {
                        lpLang.querySelectorAll('button[data-lang]').forEach(function(btn){
                            btn.style.display = sup.indexOf(btn.getAttribute('data-lang')) >= 0 ? '' : 'none';
                        });
                    }
                    if (SUPPORTED.indexOf(lang) < 0) {
                        lang = d.defaultLanguage || SUPPORTED[0] || 'fa';
                        applyLang(lang);
                    }
                }

                /* Support URL */
                var supportLink = document.getElementById('lpSupportLink');
                if (supportLink && d.supportUrl) supportLink.href = d.supportUrl;
            })
            .catch(function(){});
    }

    /* ── Check URL for reset token ───────────────── */
    function checkResetUrl() {
        try {
            var params = new URLSearchParams(window.location.search);
            var reset = params.get('reset');
            var token = params.get('token');
            if (reset === '1' && token) {
                window.showReset(token);
            }
        } catch(_) {}
    }

    /* ── If already logged in, go to dashboard ───── */
    function checkExistingToken() {
        var existing = localStorage.getItem('crm_token');
        if (!existing) return;
        fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + existing }
        }).then(function(r){ return r.json().catch(function(){ return {}; }); })
          .then(function(d) {
              if (d && d.ok && d.data && d.data.email) {
                  window.location.href = '/dashboard';
              } else {
                  localStorage.removeItem('crm_token');
              }
          }).catch(function(){ localStorage.removeItem('crm_token'); });
    }

    /* ── Init ────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function() {
        /* Apply stored language */
        applyLang(lang);

        /* Password toggle */
        initToggle('lpPass', 'btnTogglePass');

        /* Enter key on all inputs */
        ['lpEmail','lpPass','lpTotpCode','lpForgotEmail','lpResetNew','lpResetConfirm'].forEach(function(id){
            var el = document.getElementById(id);
            if (el) el.addEventListener('keydown', onKey);
        });

        /* Load branding */
        loadBranding();

        /* Check if already logged in */
        checkExistingToken();

        /* Check for reset token in URL */
        checkResetUrl();
    });

})();
