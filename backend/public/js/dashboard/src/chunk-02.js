                        const name = (data.userName || '').trim() || (LANG === 'fa' ? 'کاربر' : 'User');
                        toast(name + (LANG === 'fa' ? ' دعوت را رد کرد' : ' declined the invite'));
                    });
                    socket.on('call_end', function(data) {
                        if (data.threadId === currentInternalThreadId) endInternalCall();
                    });
                    socket.on('call_reject', function(data) {
                        if (data.threadId === currentInternalThreadId) { hideInternalCallModal(); internalCallPendingOffer = null; internalCallIsIncoming = false; toast(t('call_rejected')); }
                    });
                    socket.on('unanswered_alert', function(data) {
                        playInternalChatSound();
                        const cust = (data.customer && (data.customer.name || data.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                        const mins = data.minutesWaiting || 0;
                        const waitStr = mins < 60 ? (mins + (LANG === 'fa' ? ' دقیقه' : ' min')) : (mins < 1440 ? (Math.floor(mins / 60) + (LANG === 'fa' ? ' ساعت' : ' hr')) : (Math.floor(mins / 1440) + (LANG === 'fa' ? ' روز' : ' days')));
                        const msg = (LANG === 'fa' ? 'مکالمه بدون پاسخ: ' : 'Unanswered: ') + cust + ' — ' + waitStr;
                        toast(msg, 8000);
                        const active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'conversations') debouncedLoadConversations(400);
                    });
                    socket.on('conversation_escalated', function(data) {
                        playInternalChatSound();
                        const cust = (data.customer && (data.customer.name || data.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                        const dept = data.department || (LANG === 'fa' ? 'پشتیبانی' : 'Support');
                        const msg = (LANG === 'fa' ? 'Escalation: ' : 'Escalated: ') + cust + (LANG === 'fa' ? ' به ' : ' to ') + dept;
                        toast(msg, 10000);
                        const active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'conversations') debouncedLoadConversations(400);
                    });
                    socket.on('important_announcement', function(data) {
                        playInternalChatSound();
                        window._lastImportantAnnouncementId = data.id;
                        const a = { id: data.id, title: data.title, body: data.body, fromUser: data.fromUser, targetType: 'all', targetId: null, createdAt: new Date().toISOString() };
                        showAnnouncementModal(a);
                        loadAnnouncements();
                        loadGeneralAnnouncementsMarquee();
                        if (typeof updateNavBadges === 'function') updateNavBadges();
                    });
                    socket.on('connect_error', function() { socket = null; });
                }
            } catch (e) { socket = null; }
        }
        function disconnectSocket() {
            if (socket) { socket.disconnect(); socket = null; }
        }
        let navBadgeRefreshInterval = null;
        function startNavBadgeRefresh() {
            if (navBadgeRefreshInterval) return;
            if (typeof fetchWhatsappHeaderStatus === 'function') fetchWhatsappHeaderStatus();
            navBadgeRefreshInterval = setInterval(function() {
                if (!token) return;
                apiFetch('/api/analytics/dashboard').then(function(res) {
                    if (res.ok && res.data) updateNavBadges(res.data);
                }).catch(function(){});
                if (typeof fetchWhatsappHeaderStatus === 'function') fetchWhatsappHeaderStatus();
            }, 120000);
        }
        function stopNavBadgeRefresh() { if (navBadgeRefreshInterval) { clearInterval(navBadgeRefreshInterval); navBadgeRefreshInterval = null; } }
        let callRingtoneInterval = null;
        let callRingtoneCtx = null;
        function showDesktopNotification(data) {
            try {
                if (!('Notification' in window) || Notification.permission === 'denied') return;
                if (Notification.permission === 'default') { Notification.requestPermission(function(p) { if (p === 'granted' && data) showDesktopNotification(data); }); return; }
                const cust = (data.customer && (data.customer.name || data.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                let preview = (data.message && data.message.content) ? String(data.message.content).slice(0, 80) : '';
                if (preview.length >= 80) preview += '…';
                const n = new Notification((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + cust, { body: preview || (LANG === 'fa' ? 'پیام واتساپ' : 'WhatsApp message'), icon: '/favicon.ico' });
                n.onclick = function() { window.focus(); n.close(); if (data.conversationId) { showPage('conversations'); setTimeout(function() { openChat(data.conversationId, cust, data.customer && data.customer.phone, data.customer && data.customer.profilePic); }, 200); } };
            } catch (e) {}
        }

        function playInternalChatSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const playTone = function(freq, start, dur, vol) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0, start);
                    gain.gain.linearRampToValueAtTime(vol || 0.08, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + (dur || 0.15));
                    osc.start(start);
                    osc.stop(start + (dur || 0.15));
                };
                playTone(523.25, 0, 0.1, 0.06);
                playTone(659.25, 0.12, 0.12, 0.05);
            } catch (e) {}
        }
        function playCallRingtone() {
            stopCallRingtone();
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                callRingtoneCtx = ctx;
                const playTone = function() {
                    if (!callRingtoneCtx) return;
                    const c = callRingtoneCtx;
                    const melody = [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.12 }, { f: 783.99, t: 0.24 }, { f: 1046.5, t: 0.36 }];
                    const t0 = c.currentTime;
                    melody.forEach(function(n, i) {
                        const osc = c.createOscillator();
                        const osc2 = c.createOscillator();
                        const gain = c.createGain();
                        osc.type = 'sine';
                        osc2.type = 'sine';
                        osc.frequency.value = n.f;
                        osc2.frequency.value = n.f * 1.25;
                        osc.connect(gain);
                        osc2.connect(gain);
                        gain.connect(c.destination);
                        const st = t0 + n.t;
                        gain.gain.setValueAtTime(0, st);
                        gain.gain.linearRampToValueAtTime(0.06, st + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
                        osc.start(st);
                        osc.stop(st + 0.22);
                        osc2.start(st);
                        osc2.stop(st + 0.22);
                    });
                };
                playTone();
                callRingtoneInterval = setInterval(playTone, 2000);
            } catch (e) {}
        }
        function stopCallRingtone() {
            if (callRingtoneInterval) { clearInterval(callRingtoneInterval); callRingtoneInterval = null; }
            callRingtoneCtx = null;
        }
        function playCallConnected() {
            stopCallRingtone();
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const osc3 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.type = 'sine';
                osc2.type = 'sine';
                osc3.type = 'sine';
                osc1.frequency.value = 523.25;
                osc2.frequency.value = 659.25;
                osc3.frequency.value = 783.99;
                osc1.connect(gain);
                osc2.connect(gain);
                osc3.connect(gain);
                gain.connect(ctx.destination);
                const t = ctx.currentTime;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.08, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc1.start(t);
                osc1.stop(t + 0.4);
                osc2.start(t);
                osc2.stop(t + 0.4);
                osc3.start(t);
                osc3.stop(t + 0.4);
            } catch (e) {}
        }
        function isImageExt(name) { return /\.(png|jpg|jpeg|gif|webp)$/i.test(name || ''); }
        function isPdfExt(name) { return /\.pdf$/i.test(name || ''); }
        function renderInternalAttachment(a) {
            const allowDl = a.allowDownload !== false;
            const name = a.name || t('file');
            let fullUrl = (a.url && a.url.startsWith('/')) ? (window.API || '') + a.url : a.url;
            fullUrl = ensureHttpsUrl(fullUrl);
            if (allowDl) return '<a href="' + escapeHtml(fullUrl) + '" target="_blank" rel="noopener" style="color:var(--accent); display:block; margin-top:4px;">📎 ' + escapeHtml(name) + '</a>';
            if (isImageExt(name)) return '<div class="internal-att-viewonly" style="margin-top:6px;"><img src="' + escapeHtml(fullUrl) + '" alt="" style="max-width:100%; max-height:200px; border-radius:6px; pointer-events:none; user-select:none;" oncontextmenu="return false;"><span class="badge" style="font-size:0.7rem; margin-top:4px; display:inline-block;">' + (LANG === 'fa' ? 'فقط نمایش' : 'View only') + '</span></div>';
            if (isPdfExt(name)) return '<div class="internal-att-viewonly" style="margin-top:6px;"><iframe src="' + escapeHtml(fullUrl) + '#toolbar=0" style="width:100%; height:200px; border:1px solid var(--border); border-radius:6px;" oncontextmenu="return false;"></iframe><span class="badge" style="font-size:0.7rem; margin-top:4px; display:inline-block;">' + (LANG === 'fa' ? 'فقط نمایش' : 'View only') + '</span></div>';
            return '<div style="margin-top:4px;"><span style="color:var(--text-secondary);">📎 ' + escapeHtml(name) + '</span> <span class="badge" style="font-size:0.7rem;">' + (LANG === 'fa' ? 'فقط نمایش' : 'View only') + '</span></div>';
        }
        function toggleInternalFileOption() {
            const fi = document.getElementById('internalChatFile');
            const opt = document.getElementById('internalChatFileOption');
            if (opt) opt.style.display = (fi && fi.files && fi.files[0]) ? 'inline' : 'none';
        }
        function appendInternalMessage(m) {
            const list = document.getElementById('internalChatMessages');
            if (!list || !currentInternalThreadId) return;
            const emptyEl = list.querySelector('.empty');
            if (emptyEl) emptyEl.remove();
            const me = (currentUser && currentUser.id) || '';
            const isOut = m.fromUserId === me;
            const att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
            const avatarHtml = internalMsgAvatarHtml(m.fromUser);
            const timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
            const html = '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        const STAFF_ACTIVITY_INTERVAL_VISIBLE = 15000;
        const STAFF_ACTIVITY_INTERVAL_HIDDEN = 30000;
        function startStaffActivityLive() {
            if (staffActivityInterval) clearInterval(staffActivityInterval);
            const ms = (typeof document !== 'undefined' && document.hidden) ? STAFF_ACTIVITY_INTERVAL_HIDDEN : STAFF_ACTIVITY_INTERVAL_VISIBLE;
            staffActivityInterval = setInterval(loadStaffActivity, ms);
            if (typeof document !== 'undefined' && document.addEventListener) {
                document.removeEventListener('visibilitychange', _staffActivityVisibilityHandler);
                document.addEventListener('visibilitychange', _staffActivityVisibilityHandler);
            }
        }
        function _staffActivityVisibilityHandler() {
            if (!staffActivityInterval) return;
            clearInterval(staffActivityInterval);
            const ms = document.hidden ? STAFF_ACTIVITY_INTERVAL_HIDDEN : STAFF_ACTIVITY_INTERVAL_VISIBLE;
            staffActivityInterval = setInterval(loadStaffActivity, ms);
        }
        function stopStaffActivityLive() {
            if (staffActivityInterval) { clearInterval(staffActivityInterval); staffActivityInterval = null; }
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', _staffActivityVisibilityHandler);
        }

        function doHeaderSearch() {
            const inp = document.getElementById('headerSearch');
            const modalInp = document.getElementById('headerSearchModalInput');
            const q = (inp && inp.value) ? inp.value.trim() : ((modalInp && modalInp.value) ? modalInp.value.trim() : '');
            if (!q) return;
            const active = document.querySelector('.nav-link.active');
            const page = active ? active.getAttribute('data-page') : '';
            if (page === 'conversations') { showPage('conversations'); toast(LANG === 'en' ? 'Search in conversations is supported via API filter.' : 'جستج�� در ��Rست �&کا��&ات از ف�R�تر API پشت�Rبا� �R �&�R�Rش��د.'); }
            else if (page === 'customers') { showPage('customers'); toast(LANG === 'en' ? 'Search in customers is supported via API filter.' : 'جستج�� در �&شتر�Rا�  از ف�R�تر API پشت�Rبا� �R �&�R�Rش��د.'); }
            else toast(LANG === 'en' ? 'Search in this section coming soon.' : 'جستج�� در ا�R�  بخش ب�! ز��د�R.'); 
        }

        function toast(msg, isErr) {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.className = 'toast' + (isErr ? ' err' : '');
            el.style.display = 'block';
            setTimeout(function() { el.style.display = 'none'; }, 3500);
        }

        function setLoading(listId, count) {
            const list = document.getElementById(listId);
            if (!list) return;
            const isTicketList = listId === 'ticketList';
            const isCustomerList = listId === 'customerList';
            let html = '';
            for (let i = 0; i < (count || 5); i++) {
                if (isTicketList) html += '<div class="ticket-card ticket-card-skeleton"><div class="ticket-card-body"><div class="loading-skeleton" style="height:12px;width:80px;margin-bottom:8px;"></div><div class="loading-skeleton" style="height:16px;width:90%;margin-bottom:6px;"></div><div class="loading-skeleton" style="height:12px;width:60%;"></div></div><div class="ticket-card-badges"><span class="loading-skeleton" style="height:24px;width:50px;border-radius:8px;"></span><span class="loading-skeleton" style="height:24px;width:60px;border-radius:8px;"></span></div></div>';
                else if (isCustomerList) html += '<div class="customer-card customer-card-skeleton"><div class="customer-card-main"><div class="loading-skeleton" style="width:44px;height:44px;border-radius:10px;"></div><div class="customer-card-body" style="flex:1;"><div class="loading-skeleton" style="height:14px;width:70%;margin-bottom:8px;"></div><div class="loading-skeleton" style="height:12px;width:90%;margin-bottom:4px;"></div><div class="loading-skeleton" style="height:12px;width:60%;"></div></div></div><div class="loading-skeleton" style="width:70px;height:36px;border-radius:8px;"></div></div>';
                else html += '<div class="loading-skeleton loading-row"></div>';
            }
            list.innerHTML = html;
        }

        async function apiFetch(url, opts) {
            if (window.CRM && window.CRM.Api && typeof window.CRM.Api.fetch === 'function') {
                return window.CRM.Api.fetch(url, opts);
            }
            const opt = opts || {};
            const h = opt.auth === false ? { 'Content-Type': 'application/json' } : headers();
            if (opt.body instanceof FormData) { delete h['Content-Type']; }
            let r, text;
            try {
                r = await fetch(API + url, { ...opt, credentials: 'include', headers: { ...h, ...opt.headers }, body: opt.body });
                text = await r.text();
            } catch (e) {
                return { ok: false, needLogin: false, error: (LANG === 'fa' ? 'اتصال به سرور برقرار نشد. شبکه یا آدرس سرور را بررسی کنید.' : 'Could not connect to server. Check network or server address.') };
            }
            if ((text || '').trim().startsWith('<')) {
                return { ok: false, needLogin: false, error: (LANG === 'fa' ? 'سرور به جای JSON پاسخ داد. مطمئن شوید backend در حال اجراست.' : 'Server returned non-JSON. Ensure backend is running.') };
            }
            let data;
            try { data = JSON.parse(text); } catch (_) {
                return { ok: false, needLogin: false, error: (LANG === 'fa' ? 'پاسخ سرور معتبر نیست' : 'Invalid server response') };
            }
            if (r.status === 401) {
                token = null; localStorage.removeItem('crm_token'); document.documentElement.classList.remove('auth-has-token'); document.getElementById('loginBox').style.display = 'flex'; document.getElementById('app').classList.remove('show');
                const errEl = document.getElementById('loginErr');
                if (errEl) errEl.textContent = (LANG === 'fa' ? 'نشست منقضی شده. لطفاً دوباره وارد شوید.' : 'Session expired. Please sign in again.');
                return { ok: false, needLogin: true, error: (data && data.error) ? data.error : (LANG === 'fa' ? 'لطفاً دوباره وارد شوید' : 'Please sign in again') };
            }
            if (r.status === 429) {
                return { ok: false, needLogin: false, error: (data && data.error) || (LANG === 'fa' ? 'تعداد درخواست‌ها زیاد شده. چند ثانیه صبر کنید.' : 'Too many requests. Please wait a moment.') };
            }
            if (!r.ok && data && (data.error || data.message)) {
                return { ok: false, needLogin: r.status === 401, status: r.status, data: data, error: data.error || data.message };
            }
            return { ok: r.ok, status: r.status, data: data };
        }
        function getApiError(res) {
            if (window.CRM && window.CRM.Api && typeof window.CRM.Api.getError === 'function') {
                return window.CRM.Api.getError(res);
            }
            if (res && res.error) return res.error;
            if (res && res.data && (res.data.error || res.data.message)) return res.data.error || res.data.message;
            return LANG === 'fa' ? 'خطا در ارتباط با سرور' : 'Server error';
        }

        (function initLoginTogglePass() {
            const wrap = document.querySelector('.login-box .password-wrap');
            if (!wrap) return;
            const input = wrap.querySelector('input');
            const btn = document.getElementById('loginTogglePass');
            if (!input || !btn) return;
            btn.addEventListener('click', function() {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                const title = show ? (LANG === 'fa' ? 'مخفی کردن رمز' : 'Hide password') : (LANG === 'fa' ? 'نمایش رمز' : 'Show password');
                btn.setAttribute('title', title);
                btn.setAttribute('aria-label', title);
                btn.setAttribute('aria-pressed', show ? 'true' : 'false');
                btn.classList.toggle('active', show);
                const use = btn.querySelector('use');
                if (use) use.setAttribute('href', show ? '#icon-eye-off' : '#icon-eye');
            });
        })();

        (function setupLoginEnterKey() {
            function onLoginKeydown(e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const totpStep = document.getElementById('loginStepTotp');
                const isTotpVisible = totpStep && totpStep.style.display !== 'none';
                if (isTotpVisible) {
                    if (typeof verifyTotpLogin === 'function') verifyTotpLogin();
                } else {
                    if (typeof login === 'function') login();
                }
            }
            const emailEl = document.getElementById('email');
            const passEl = document.getElementById('pass');
            const totpEl = document.getElementById('totpCode');
            if (emailEl) emailEl.addEventListener('keydown', onLoginKeydown);
            if (passEl) passEl.addEventListener('keydown', onLoginKeydown);
            if (totpEl) totpEl.addEventListener('keydown', onLoginKeydown);
        })();

        async function login() {
            const email = document.getElementById('email').value.trim();
            const pass = document.getElementById('pass').value;
            document.getElementById('loginErr').textContent = '';
            const btn = document.getElementById('btnLogin');
            btn.disabled = true;
            btn.textContent = t('login_loading');
            let r, text;
            try {
                r = await fetch(API + '/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: pass }) });
                text = await r.text();
            } catch (e) {
                btn.disabled = false;
                btn.textContent = t('login_btn');
                document.getElementById('loginErr').textContent = t('login_err_connect');
                return;
            }
            btn.disabled = false;
            btn.textContent = t('login_btn');
            if ((text || '').trim().startsWith('<')) {
                document.getElementById('loginErr').textContent = t('login_err_server_html');
                return;
            }
            let data;
            try { data = JSON.parse(text); } catch (_) {
                let hint;
                if (r.status === 0) hint = t('login_err_connect');
                else if (r.status === 429) hint = t('login_err_429');
                else hint = t('login_err_invalid') + ' (HTTP ' + r.status + ')';
                document.getElementById('loginErr').textContent = hint;
                return;
            }
            if (r.status === 429) {
                document.getElementById('loginErr').textContent = (data && data.error) ? data.error : t('login_err_429');
                return;
            }
            if (data.needTotp && data.tempToken) {
                window._totpTempToken = data.tempToken;
                document.getElementById('totpStepEmail').textContent = t('login_totp_for') + ' ' + (data.email || '') + ' ' + t('login_totp_enter');
                document.getElementById('loginStep1').style.display = 'none';
                document.getElementById('loginStepTotp').style.display = 'block';
                document.getElementById('totpCode').value = '';
                document.getElementById('totpErr').textContent = '';
                document.getElementById('totpCode').focus();
                return;
            }
            if (data.token) {
                token = data.token;
                localStorage.setItem('crm_token', token);
                document.documentElement.classList.add('auth-has-token');
                currentUser = data.user || {};
                setUserDisplay(currentUser);
                document.getElementById('loginBox').style.display = 'none';
                document.getElementById('app').classList.add('show');
                try {
                    applyNavByRole();
                    await loadPanelSettingsAndApply();
                    applyHashRoute();
                    startRatesInterval();
                    startPresenceInterval();
                    connectSocket();
                    startNavBadgeRefresh();
                    showTotpPromptIfNeeded();
                } catch (e) { console.error('Post-login init:', e); }
            } else {
                document.getElementById('loginErr').textContent = data.error || t('login_err_fail');
            }
        }
        function backToLoginStep1() {
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
            document.getElementById('loginStepForgot').style.display = 'none';
            document.getElementById('loginStepReset').style.display = 'none';
            window._totpTempToken = null;
        }
        function showForgotStep() {
            document.getElementById('loginStep1').style.display = 'none';
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStepReset').style.display = 'none';
            const el = document.getElementById('loginStepForgot');
            if (el) { el.style.display = 'block'; document.getElementById('forgotEmail').value = ''; document.getElementById('forgotErr').textContent = ''; document.getElementById('forgotSuccess').style.display = 'none'; }
        }
        function backToLoginFromForgot() {
            document.getElementById('loginStepForgot').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
        }
        async function submitForgotPassword() {
            const email = (document.getElementById('forgotEmail') && document.getElementById('forgotEmail').value || '').trim();
            const errEl = document.getElementById('forgotErr');
            const successEl = document.getElementById('forgotSuccess');
            const btn = document.getElementById('btnForgotSubmit');
            if (!email) { if (errEl) errEl.textContent = (LANG === 'fa' ? 'ایمیل را وارد کنید.' : 'Please enter your email.'); return; }
            if (errEl) errEl.textContent = '';
            if (successEl) successEl.style.display = 'none';
            if (btn) btn.disabled = true;
            try {
                const r = await fetch(API + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) });
                const data = await r.json().catch(function() { return {}; });
                if (successEl) { successEl.textContent = (data.message || t('forgot_success_msg')); successEl.style.display = 'block'; }
            } catch (e) { if (errEl) errEl.textContent = t('login_err_connect'); }
            if (btn) btn.disabled = false;
        }
        function showResetStep(resetToken) {
            window._resetToken = resetToken;
            document.getElementById('loginStep1').style.display = 'none';
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStepForgot').style.display = 'none';
            const el = document.getElementById('loginStepReset');
            if (el) { el.style.display = 'block'; document.getElementById('resetNewPass').value = ''; document.getElementById('resetConfirmPass').value = ''; document.getElementById('resetErr').textContent = ''; }
        }
        function backToLoginFromReset() {
            window._resetToken = null;
            document.getElementById('loginStepReset').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
            try { const u = window.location.pathname + window.location.hash; window.history.replaceState(null, '', u.replace(/\?.*$/, '')); } catch (_) {}
        }
        async function submitResetPassword() {
            const newPass = document.getElementById('resetNewPass') && document.getElementById('resetNewPass').value || '';
            const confirmPass = document.getElementById('resetConfirmPass') && document.getElementById('resetConfirmPass').value || '';
            const errEl = document.getElementById('resetErr');
            const btn = document.getElementById('btnResetSubmit');
            if (newPass !== confirmPass) { if (errEl) errEl.textContent = t('reset_err_match'); return; }
            if (newPass.length < 6) { if (errEl) errEl.textContent = t('reset_err_length'); return; }
            if (!window._resetToken) { if (errEl) errEl.textContent = 'لینک منقضی شده است.'; return; }
            if (errEl) errEl.textContent = '';
            if (btn) btn.disabled = true;
            try {
                const r = await fetch(API + '/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window._resetToken, newPassword: newPass }) });
                const data = await r.json().catch(function() { return {}; });
                if (r.ok && data.message) {
                    window._resetToken = null;
                    if (errEl) errEl.textContent = '';
                    try { window.history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (_) {}
                    document.getElementById('loginStepReset').style.display = 'none';
                    document.getElementById('loginStep1').style.display = 'block';
                    document.getElementById('email').value = '';
                    document.getElementById('pass').value = '';
                    document.getElementById('loginErr').textContent = data.message;
                    document.getElementById('loginErr').style.color = 'var(--success, #059669)';
                    return;
                }
                if (errEl) errEl.textContent = (data.error || (LANG === 'fa' ? 'خطا در تغییر رمز.' : 'Failed to reset password.'));
            } catch (e) { if (errEl) errEl.textContent = t('login_err_connect'); }
            if (btn) btn.disabled = false;
        }
        (function checkResetPasswordUrl() {
            if (localStorage.getItem('crm_token')) return;
            const params = new URLSearchParams(window.location.search);
            const reset = params.get('reset');
            const token = params.get('token');
            if (reset === '1' && token && typeof showResetStep === 'function') showResetStep(token);
        })();
        async function verifyTotpLogin() {
            const code = (document.getElementById('totpCode') && document.getElementById('totpCode').value || '').replace(/\s/g, '');
            if (!code || code.length !== 6) { document.getElementById('totpErr').textContent = t('login_totp_code_required'); return; }
            if (!window._totpTempToken) { document.getElementById('totpErr').textContent = t('login_totp_retry'); return; }
            document.getElementById('totpErr').textContent = '';
            document.getElementById('btnTotpVerify').disabled = true;
            const r = await fetch(API + '/api/auth/totp/verify-login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tempToken: window._totpTempToken, code: code }) });
            const data = await r.json().catch(function() { return {}; });
            document.getElementById('btnTotpVerify').disabled = false;
            if (data.token) {
                window._totpTempToken = null;
                token = data.token;
                localStorage.setItem('crm_token', token);
                document.documentElement.classList.add('auth-has-token');
                currentUser = data.user || {};
                setUserDisplay(currentUser);
                document.getElementById('loginBox').style.display = 'none';
                document.getElementById('app').classList.add('show');
                try {
                    applyNavByRole();
                    await loadPanelSettingsAndApply();
                    applyHashRoute();
                    startRatesInterval();
                    startPresenceInterval();
                    connectSocket();
                    startNavBadgeRefresh();
                    showTotpPromptIfNeeded();
                } catch (e) { console.error('Post-TOTP init:', e); }
            } else {
                document.getElementById('totpErr').textContent = data.error || t('login_totp_bad');
            }
        }
        if (typeof window !== 'undefined') {
            window.login = login;
            window.verifyTotpLogin = verifyTotpLogin;
            window.backToLoginStep1 = backToLoginStep1;
            window.showForgotStep = showForgotStep;
            window.backToLoginFromForgot = backToLoginFromForgot;
            window.submitForgotPassword = submitForgotPassword;
            window.submitResetPassword = submitResetPassword;
            window.backToLoginFromReset = backToLoginFromReset;
        }
        function showTotpPromptIfNeeded() {
            if (!currentUser) return;
            if (currentUser.totpEnabled) return;
            if (localStorage.getItem('totp_prompt_dismissed')) return;
            const ban = document.getElementById('totpPromptBanner');
            if (ban) ban.style.display = 'block';
        }
        function setElText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text || '\u2014'; }
        function updateProfileAvatarPreview(urlOrName) {
            const el = document.getElementById('profileAvatarPreview');
            if (!el) return;
            const raw = (typeof urlOrName === 'string' && urlOrName.trim()) ? urlOrName.trim() : '';
            let url = null;
            if (raw.indexOf('http') === 0) url = raw;
            else if (raw.indexOf('/') === 0) url = (window.location.origin || '') + raw;
            const name = !url ? raw : (currentUser && (currentUser.firstName || currentUser.lastName || currentUser.name)) ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim() || currentUser.name : '';
            const initial = (name && name[0]) ? name[0].toUpperCase() : '?';
            if (url) {
                const img = new Image();
                img.onload = function() { el.innerHTML = ''; el.appendChild(img); };
                img.onerror = function() { el.innerHTML = '<span>' + escapeHtml(initial) + '</span>'; };
                img.src = url;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
            } else {
                el.innerHTML = '<span>' + escapeHtml(initial) + '</span>';
            }
        }
        async function loadProfile() {
            let u = null;
            const res = await apiFetch('/api/users/me');
            if (res.ok && res.data) { u = res.data; currentUser = res.data; }
            else if (currentUser) u = currentUser;
            if (u) {
                const roleLabel = (LANG === 'fa' ? { owner: 'مالک', admin: 'ادمین', manager: 'مدیر', supervisor: 'ناظر', agent: 'کارمند' } : { owner: 'Owner', admin: 'Admin', manager: 'Manager', supervisor: 'Supervisor', agent: 'Agent' })[u.role] || u.role;
                const branchName = (u.branch && u.branch.name) ? u.branch.name : '\u2014';
                const deptName = (u.department && u.department.name) ? u.department.name : '\u2014';
                const lastLogin = u.lastLoginAt ? fmtTZ(u.lastLoginAt, 'datetime') : '\u2014';
                const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || '\u2014';
                setElText('profileDisplayUsername', u.username ? '@' + u.username : '\u2014');
                setElText('profileDisplayName', displayName);
                setElText('profileDisplayEmail', u.email || '\u2014');
                setElText('profileRoleBadge', roleLabel);
                const branchBadge = document.getElementById('profileBranchBadge');
                if (branchBadge) {
                    branchBadge.textContent = branchName;
                    branchBadge.style.display = (u.branch && u.branch.name) ? '' : 'none';
                }
                setElText('profileDepartmentText', (LANG === 'fa' ? 'دپارتمان: ' : 'Dept: ') + deptName);
                setElText('profileLastLogin', (LANG === 'fa' ? 'آخرین ورود: ' : 'Last login: ') + lastLogin);
                setElText('profileEmail', u.email);
                setElText('profileDepartment', deptName);
                const canEditEmail = !!(currentUser && currentUser.permissions && currentUser.permissions.manage_users);
                const emailGroup = document.getElementById('profileEmailGroup');
                const emailReadonlyRow = document.getElementById('profileEmailReadonlyRow');
                const emailInput = document.getElementById('profileEmailInput');
                if (emailGroup && emailReadonlyRow && emailInput) {
                    if (canEditEmail) {
                        emailGroup.style.display = '';
                        emailReadonlyRow.style.display = 'none';
                        emailInput.value = u.email || '';
                    } else {
                        emailGroup.style.display = 'none';
                        emailReadonlyRow.style.display = '';
                    }
                }
                const usernameEl = document.getElementById('profileUsername');
                const firstEl = document.getElementById('profileFirstName');
                const lastEl = document.getElementById('profileLastName');
                const dobEl = document.getElementById('profileDateOfBirth');
                if (usernameEl) usernameEl.value = u.username || '';
                if (firstEl) firstEl.value = u.firstName || '';
                if (lastEl) lastEl.value = u.lastName || '';
                if (dobEl) dobEl.value = u.dateOfBirth || '';
                if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = u.phone || '';
                const avatarEl = document.getElementById('profileAvatar');
                if (avatarEl) { avatarEl.value = u.avatar || ''; if (!avatarEl._bound) { avatarEl._bound = true; avatarEl.addEventListener('input', function() { updateProfileAvatarPreview(avatarEl.value); }); avatarEl.addEventListener('blur', function() { updateProfileAvatarPreview(avatarEl.value || displayName); }); } }
                const avatarFileEl = document.getElementById('profileAvatarFile');
                if (avatarFileEl && !avatarFileEl._bound) { avatarFileEl._bound = true; avatarFileEl.addEventListener('change', function() { if (avatarFileEl.files && avatarFileEl.files[0]) uploadProfileAvatar(avatarFileEl.files[0]); }); }
                if (document.getElementById('profilePassword')) document.getElementById('profilePassword').value = '';
                updateProfileAvatarPreview(u.avatar || displayName);
                const profileFields = ['profileUsername','profileFirstName','profileLastName','profileDateOfBirth','profilePhone','profileAvatar','profilePassword','profileEmailInput','profileAvatarFile'];
                profileFields.forEach(function(fid) { const el = document.getElementById(fid); if (el) el.disabled = false; });
                const profileSaveBtn = document.getElementById('profileSaveBtn');
                if (profileSaveBtn) profileSaveBtn.style.display = '';
                const profileProtectedBanner = document.getElementById('profileProtectedBanner');
                if (profileProtectedBanner) profileProtectedBanner.style.display = 'none';
            }
            const statusEl = document.getElementById('profileTotpStatus');
            const actionsEl = document.getElementById('profileTotpActions');
            if (statusEl && actionsEl) {
                const enabled = !!(u && u.totpEnabled);
                statusEl.innerHTML = enabled ? '<span class="badge done">' + t('totp_active') + '</span>' : '<span class="badge pending">' + t('totp_inactive') + '</span>';
                if (enabled) {
                    actionsEl.innerHTML = '<button type="button" class="btn-secondary" id="totpDisableBtnDynamic">' + t('totp_disable_btn') + '</button>';
                } else {
                    actionsEl.innerHTML = '<button type="button" class="btn-primary" id="totpSetupBtnDynamic">' + t('totp_setup_btn') + '</button>';
                }
                // Bind event handlers after DOM update
                setupProfileEventHandlers();
            }
        }
        async function uploadProfileAvatar(file) {
            const formData = new FormData();
            formData.append('file', file);
            const r = await fetch((API || '') + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
            const data = await r.json().catch(function() { return {}; });
            if (data.url) {
                const avatarInput = document.getElementById('profileAvatar');
                const avatarValue = data.url;
                if (avatarInput) { avatarInput.value = avatarValue; updateProfileAvatarPreview(avatarValue); }
                const patchRes = await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify({ avatar: avatarValue }) });
                if (patchRes.ok) { if (patchRes.data) currentUser = patchRes.data; setUserDisplay(currentUser); toast(t('saved') || (LANG === 'fa' ? 'تصویر بارگذاری و ذخیره شد' : 'Image uploaded and saved')); }
                else { toast(t('saved') || (LANG === 'fa' ? 'تصویر بارگذاری شد — ذخیره تغییرات را بزنید' : 'Image uploaded — click Save to persist')); }
            } else { toast((data.error) || t('err_generic'), true); }
        }
        async function saveProfile() {
            const username = document.getElementById('profileUsername') && document.getElementById('profileUsername').value;
            const firstName = document.getElementById('profileFirstName') && document.getElementById('profileFirstName').value;
            const lastName = document.getElementById('profileLastName') && document.getElementById('profileLastName').value;
            const dateOfBirth = document.getElementById('profileDateOfBirth') && document.getElementById('profileDateOfBirth').value;
            const phone = document.getElementById('profilePhone') && document.getElementById('profilePhone').value;
            const avatar = document.getElementById('profileAvatar') && document.getElementById('profileAvatar').value;
            const password = document.getElementById('profilePassword') && document.getElementById('profilePassword').value;
            const body = { username: (username || '').trim() || null, firstName: (firstName || '').trim() || null, lastName: (lastName || '').trim() || null, dateOfBirth: (dateOfBirth || '').trim() || null, phone: (phone || '').trim() || null, avatar: (avatar || '').trim() || null };
            const canEditEmail = !!(currentUser && currentUser.permissions && currentUser.permissions.manage_users);
            if (canEditEmail) {
                const emailInput = document.getElementById('profileEmailInput');
                if (emailInput && emailInput.offsetParent !== null) {
                    const emailVal = (emailInput.value || '').trim();
                    if (emailVal) body.email = emailVal;
                }
            }
            const usernameTrim = (username || '').trim();
            if (usernameTrim) body.username = usernameTrim;
            if (password) body.password = password;
            const btn = document.getElementById('profileSaveBtn');
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال ذخیره...' : LANG === 'tr' ? 'Kaydediliyor...' : 'Saving...'); }
            const res = await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) });
            if (btn) { btn.disabled = false; btn.textContent = t('profile_save') || (LANG === 'fa' ? 'ذخیره تغییرات' : 'Save changes'); }
            if (res.needLogin) return;
            if (res.ok) {
                toast(t('saved'));
                if (res.data) currentUser = res.data;
                const passEl = document.getElementById('profilePassword');
                if (passEl) passEl.value = '';
                setUserDisplay(currentUser);
                loadProfile();
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }
        function closeTotpSetupModal() { document.getElementById('totpSetupModal').style.display = 'none'; }
        async function openTotpSetup() {
            const res = await apiFetch('/api/auth/totp/setup');
            if (res.needLogin || !res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            const d = res.data;
            var safeQr = (d.qrCode && (String(d.qrCode).startsWith('data:') || String(d.qrCode).startsWith('https:'))) ? d.qrCode : '';
            document.getElementById('totpSetupQr').innerHTML = safeQr ? '<img src="' + safeQr.replace(/"/g, '&quot;') + '" alt="QR" style="max-width:220px; height:auto;">' : '';
            document.getElementById('totpSetupSecret').textContent = d.secret ? t('modal_totp_secret') + ' ' + d.secret : '';
            document.getElementById('totpSetupCode').value = '';
            document.getElementById('totpSetupModal').style.display = 'flex';
        }
        async function confirmTotpSetup() {
            const code = (document.getElementById('totpSetupCode') && document.getElementById('totpSetupCode').value || '').replace(/\s/g, '');
            if (!code || code.length !== 6) { toast(t('enter_6_digit'), true); return; }
            const res = await apiFetch('/api/auth/totp/confirm-setup', { method: 'POST', body: JSON.stringify({ code: code }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_totp_enabled')); closeTotpSetupModal(); currentUser.totpEnabled = true; loadProfile(); document.getElementById('totpPromptBanner').style.display = 'none'; } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function closeTotpDisableModal() { document.getElementById('totpDisableModal').style.display = 'none'; document.getElementById('totpDisablePassword').value = ''; }
        function openTotpDisableModal() { document.getElementById('totpDisablePassword').value = ''; document.getElementById('totpDisableModal').style.display = 'flex'; }
        async function disableTotpSubmit() {
            const password = document.getElementById('totpDisablePassword') && document.getElementById('totpDisablePassword').value;
            if (!password) { toast(t('enter_password'), true); return; }
            const res = await apiFetch('/api/auth/totp/disable', { method: 'POST', body: JSON.stringify({ password: password }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_totp_disabled')); closeTotpDisableModal(); currentUser.totpEnabled = false; loadProfile(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        async function logout() {
            try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (_) {}
            if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
            if (ratesInterval) { clearInterval(ratesInterval); ratesInterval = null; }
            if (tickerTimeInterval) { clearInterval(tickerTimeInterval); tickerTimeInterval = null; }
            stopStaffActivityLive();
            stopNavBadgeRefresh();
            disconnectSocket();
            token = null;
            currentUser = null;
            localStorage.removeItem('crm_token');
            document.documentElement.classList.remove('auth-has-token');
            document.getElementById('loginBox').style.display = 'flex';
            const appEl = document.getElementById('app');
            if (appEl) { appEl.classList.remove('show', 'app-loading', 'app-ready'); }
        }

        function escapeHtml(s) { if (window.CRM && window.CRM.Utils && typeof window.CRM.Utils.escapeHtml === 'function') return window.CRM.Utils.escapeHtml(s); if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
        function ensureHttpsUrl(url) { if (!url || typeof url !== 'string') return url; if (url.startsWith('http:') && window.location.protocol === 'https:') return 'https:' + url.slice(5); return url; }
        /** تشخیص host/path بدون scheme (مثلاً pps.whatsapp.net/v/...) تا به جای چسباندن به origin اشتباه، https اضافه شود */
        function looksLikeSchemelessHttpHost(host) {
            if (!host || typeof host !== 'string' || host.length > 253) return false;
            if (host.indexOf('.') < 0) return false;
            var labels = host.split('.');
            if (labels.length < 2) return false;
            var tld = labels[labels.length - 1];
            if (!/^[a-z]{2,63}$/i.test(tld)) return false;
            for (var i = 0; i < labels.length; i++) {
                var lab = labels[i];
                if (!lab || lab.length > 63) return false;
                if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(lab)) return false;
            }
            return true;
        }
        /** آواتار مشتری/چت: // و مسیر نسبی (حتی بدون / اول) و data: */
        function normalizeProfilePicUrl(url) {
            if (!url || typeof url !== 'string') return '';
            var u = url.trim();
            if (!u) return '';
            if (u.indexOf('data:') === 0) return u;
            if (u.indexOf('//') === 0) return ensureHttpsUrl('https:' + u);
            if (/^https?:\/\//i.test(u)) return ensureHttpsUrl(u);
            var slashIdx = u.indexOf('/');
            var hostPart = slashIdx >= 0 ? u.slice(0, slashIdx) : u;
            if (hostPart && looksLikeSchemelessHttpHost(hostPart)) {
                return ensureHttpsUrl('https://' + u.replace(/^\/+/, ''));
            }
            var origin = window.location.origin || '';
            if (u.indexOf('/') === 0) return ensureHttpsUrl(origin + u);
            if (u.indexOf('/') > 0) return ensureHttpsUrl(origin + '/' + u.replace(/^\/+/, ''));
            if (looksLikeSchemelessHttpHost(u)) return ensureHttpsUrl('https://' + u);
            return '';
        }
        function profilePicShowsImage(url) {
            if (!url || typeof url !== 'string') return false;
            var n = normalizeProfilePicUrl(url);
            return !!n && (/^https?:\/\//i.test(n) || n.indexOf('data:') === 0);
        }
        function crmAvatarImgErr(img) {
            try {
                if (!img) return;
                img.style.display = 'none';
                try { img.removeAttribute('src'); } catch (_) { img.src = ''; }
                var p = img.parentElement;
                if (p) {
                    p.classList.add('avatar-img-failed');
                    var fb = p.querySelector('.avatar-fallback, .customer-card-avatar-fallback');
                    if (fb) { fb.style.display = 'flex'; fb.style.visibility = 'visible'; fb.style.opacity = '1'; }
                }
            } catch (_) {}
        }
        window.crmAvatarImgErr = crmAvatarImgErr;
        function resolveAvatarUrl(avatar) { return normalizeProfilePicUrl(avatar); }
        function internalMsgAvatarHtml(fromUser, extraClass) { const u = fromUser || {}; const name = (u.name || u.username || u.email || '').trim(); const initial = name[0] ? name[0].toUpperCase() : '?'; const pic = resolveAvatarUrl(u.avatar); const cls = 'msg-avatar' + (extraClass ? ' ' + extraClass : ''); if (pic) return '<span class="' + cls + '"><span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)"></span>'; return '<span class="' + cls + '"><span class="avatar-fallback">' + escapeHtml(initial) + '</span></span>'; }
        function userDisplay(u) { return (u && (u.username || u.name || u.email)) || ''; }

        function refreshDashboard() {
            const btn = document.getElementById('dashboardRefreshBtn');
            if (btn) { btn.classList.add('loading'); btn.disabled = true; }
            loadDashboard().then(function() {
                if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
            }).catch(function() { if (btn) { btn.classList.remove('loading'); btn.disabled = false; } });
        }
        function setDashboardError(container, cardsTitleEl, message) {
            if (container) container.innerHTML = '<div class="dashboard-load-error empty">' + (message || t('loading_err')) + '</div>';
            if (cardsTitleEl) cardsTitleEl.style.display = 'none';
        }
        async function loadDashboard() {
            const container = document.getElementById('dashboardCards');
            const summaryEl = document.getElementById('dashboardSummary');
            const quickEl = document.getElementById('dashboardQuickActions');
            const attentionEl = document.getElementById('dashboardAttention');
            const cardsTitleEl = document.getElementById('dashboardCardsTitle');
            if (!container) return;
            const perms = (currentUser && currentUser.permissions) || {};
            const can = function(section) { return section === 'profile' || section === 'dashboard' || perms[section] === true || (section === 'rates_charts' && perms.rates === true); };
            if (container) container.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (summaryEl) summaryEl.innerHTML = '';
            if (quickEl) quickEl.innerHTML = '';
            if (attentionEl) { attentionEl.innerHTML = ''; attentionEl.style.display = 'none'; }
            let res;
            try {
                res = await apiFetch('/api/analytics/dashboard');
            } catch (e) {
                setDashboardError(container, cardsTitleEl, LANG === 'fa' ? 'خطا در ارتباط با سرور.' : 'Network error.');
                return;
            }
            if (res.needLogin) {
                setDashboardError(container, cardsTitleEl, LANG === 'fa' ? 'لطفاً وارد شوید.' : 'Please sign in.');
                return;
            }
            if (!res.ok) {
                setDashboardError(container, cardsTitleEl, getApiError(res));
                return;
            }
            const stats = res.data || {};
            const n = function(v) { return (v != null && typeof v === 'number') ? v : 0; };
            if (attentionEl && (n(stats.unreadConversations) > 0 || n(stats.tasksPending) > 0 || n(stats.unreadAnnouncements) > 0)) {
                const parts = [];
                if (can('conversations') && n(stats.unreadConversations) > 0) parts.push('<a href="#conversations" class="dashboard-attention-link" data-dashboard-page="conversations" data-conv-tab="unread">' + n(stats.unreadConversations) + ' ' + t('dashboard_stat_unread') + '</a>');
                if (can('tasks') && n(stats.tasksPending) > 0) parts.push('<a href="#tasks" class="dashboard-attention-link" data-dashboard-page="tasks">' + n(stats.tasksPending) + ' ' + t('dashboard_stat_tasks') + '</a>');
                if (can('announcements') && n(stats.unreadAnnouncements) > 0) parts.push('<a href="#announcements" class="dashboard-attention-link" data-dashboard-page="announcements">' + n(stats.unreadAnnouncements) + ' ' + t('dashboard_stat_announcements') + '</a>');
                if (parts.length) {
                    const needsLabel = (t('dashboard_needs_attention') || (LANG === 'fa' ? 'نیاز به توجه: ' : 'Needs attention: ')) + ' ';
                    attentionEl.innerHTML = needsLabel + parts.join(' · ');
                    attentionEl.style.display = 'block';
                }
            }
            if (summaryEl) {
                const summaryItems = [];
                if (can('staff_activity') || can('users')) {
                    summaryItems.push({ page: 'staff-activity', num: n(stats.staffOnline), label: t('dashboard_stat_online') });
                    summaryItems.push({ page: 'staff-activity', num: n(stats.loginsToday), label: t('dashboard_stat_logins_today') });
                }
                if (can('conversations')) {
                    summaryItems.push({ page: 'conversations', num: n(stats.openConversations), label: t('dashboard_stat_conversations'), warn: n(stats.unreadConversations) > 0 });
                    if (n(stats.unreadConversations) > 0) summaryItems.push({ page: 'conversations', num: n(stats.unreadConversations), label: t('dashboard_stat_unread'), warn: true });
                }
                if (can('tickets')) summaryItems.push({ page: 'tickets', num: n(stats.ticketsOpen), label: t('dashboard_stat_tickets') });
                if (can('customers')) summaryItems.push({ page: 'customers', num: n(stats.totalCustomers), label: t('dashboard_stat_customers') });
                if (can('tasks')) summaryItems.push({ page: 'tasks', num: n(stats.tasksPending), label: t('dashboard_stat_tasks') });
                if (can('conversations')) summaryItems.push({ page: 'conversations', num: n(stats.todayMessages), label: t('dashboard_stat_messages_today') });
                if (stats.avgResponseTimeMinutes != null && can('conversations')) summaryItems.push({ page: 'conversations', num: stats.avgResponseTimeMinutes + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min'), label: (LANG === 'fa' ? 'میانگین زمان پاسخ' : 'Avg response time') });
                if (stats.avgRating != null && can('conversations')) summaryItems.push({ page: 'conversations', num: stats.avgRating + '/5', label: (LANG === 'fa' ? 'نرخ رضایت' : 'Satisfaction') + (stats.ratedConversationsCount ? ' (' + stats.ratedConversationsCount + ')' : '') });
                if (can('announcements') && n(stats.unreadAnnouncements) > 0) summaryItems.push({ page: 'announcements', num: n(stats.unreadAnnouncements), label: t('dashboard_stat_announcements'), warn: true });
                const summaryHtml = summaryItems.map(function(item) {
                    const cls = 'dashboard-stat-box' + (item.warn ? ' warn' : '');
                    return '<a href="#' + escapeHtml(item.page) + '" class="' + cls + '" data-dashboard-page="' + escapeHtml(item.page) + '"><span class="stat-number">' + escapeHtml(String(item.num)) + '</span><span class="stat-label">' + escapeHtml(item.label) + '</span></a>';
                }).join('');
                summaryEl.innerHTML = summaryHtml || '';
            }
            if (quickEl) {
                const quickBtns = [];
                if (can('conversations')) quickBtns.push({ label: t('dashboard_quick_new_conv'), icon: 'icon-chat', quickAction: 'conv-new' });
                if (can('customers')) quickBtns.push({ label: t('dashboard_quick_new_customer'), icon: 'icon-user-plus', quickAction: 'customer-new' });
                if (can('tickets')) quickBtns.push({ label: t('dashboard_quick_new_ticket'), icon: 'icon-ticket', quickAction: 'ticket-new' });
                const quickHtml = quickBtns.map(function(b) {
                    return '<button type="button" class="btn-quick" data-quick-action="' + escapeHtml(b.quickAction) + '"><svg viewBox="0 0 24 24"><use href="#' + escapeHtml(b.icon) + '"/></svg>' + escapeHtml(b.label) + '</button>';
                }).join('');
                quickEl.innerHTML = quickHtml || '';
            }
            const cards = [
                { page: 'conversations', section: 'conversations', title: t('nav_conversations'), icon: 'icon-chat', stat: n(stats.unreadConversations) > 0 ? (n(stats.unreadConversations) + ' ' + t('dashboard_stat_unread')) : (n(stats.openConversations) + ' ' + t('filter_open')), badgeWarn: n(stats.unreadConversations) > 0 },
                { page: 'customers', section: 'customers', title: t('nav_customers'), icon: 'icon-users', stat: n(stats.totalCustomers) + ' ' + t('nav_customers').toLowerCase() },
                { page: 'tickets', section: 'tickets', title: t('nav_tickets'), icon: 'icon-ticket', stat: n(stats.ticketsOpen) + ' ' + t('status_open').toLowerCase() },
                { page: 'tasks', section: 'tasks', title: t('nav_tasks'), icon: 'icon-task', stat: n(stats.tasksPending) + ' ' + t('status_pending').toLowerCase() },
                { page: 'announcements', section: 'announcements', title: t('nav_announcements'), icon: 'icon-megaphone', stat: n(stats.announcementsCount) + ' ' + t('nav_announcements').toLowerCase() },
                { page: 'departments', section: 'departments', title: t('nav_departments'), icon: 'icon-building', stat: null },
                { page: 'users', section: 'users', title: t('nav_users'), icon: 'icon-user', stat: null },
                { page: 'branches', section: 'branches', title: t('nav_branches'), icon: 'icon-building-2', stat: null },
                { page: 'processes', section: 'processes', title: t('nav_processes'), icon: 'icon-expand', stat: null },
                { page: 'whatsapp', section: 'whatsapp', title: t('nav_whatsapp'), icon: 'icon-phone', stat: null },
                { page: 'rates', section: 'rates', title: t('nav_rates'), icon: 'icon-chart', stat: null },
                { page: 'services', section: 'services', title: t('nav_services'), icon: 'icon-file-plus', stat: null },
                { page: 'profile', section: 'profile', title: t('nav_profile'), icon: 'icon-user', stat: null },
                { page: 'internal-chat', section: 'internal_chat', title: t('nav_internal_chat'), icon: 'icon-chat', stat: null },
                { page: 'supervision', section: 'supervision', title: t('nav_supervision'), icon: 'icon-chart', stat: null },
                { page: 'staff-activity', section: 'staff_activity', title: t('nav_staff_activity'), icon: 'icon-user-online', stat: null },
                { page: 'panel-settings', section: 'panel_settings', title: t('nav_panel_settings'), icon: 'icon-settings', stat: null }
            ];
            let html = '';
            cards.forEach(function(c) {
                if (!can(c.section)) return;
                const badge = c.stat ? ('<span class="card-badge' + (c.badgeWarn ? ' warn' : '') + '">' + escapeHtml(c.stat) + '</span>') : '';
                html += '<a href="#' + escapeHtml(c.page) + '" class="dashboard-card" data-page="' + escapeHtml(c.page) + '"><div class="card-icon"><svg viewBox="0 0 24 24"><use href="#' + c.icon + '"/></svg></div><div class="card-title">' + escapeHtml(c.title) + '</div>' + (c.stat ? '<p class="card-meta">' + escapeHtml(c.stat) + '</p>' : '') + badge + '</a>';
            });
            container.innerHTML = html || ('<div class="empty">' + (LANG === 'fa' ? 'دسترسی به بخشی وجود ندارد.' : t('no_data')) + '</div>');
            if (cardsTitleEl) cardsTitleEl.style.display = html ? '' : 'none';
            updateNavBadges(stats);
        }

        window._marqueeAnnouncements = [];
        function pauseAnnouncementMarquee() { const el = document.querySelector('.announcement-marquee-inner'); if (el) el.classList.add('paused'); }
        function resumeAnnouncementMarquee() { const el = document.querySelector('.announcement-marquee-inner'); if (el) el.classList.remove('paused'); }
        function getAnnMarqueeDismissedKey() {
            const uid = (currentUser && currentUser.id) ? String(currentUser.id) : 'guest';
            return 'ann_marquee_dismissed_' + uid;
        }
        function closeAnnouncementMarquee() { 
            const el = document.getElementById('announcementMarquee'); 
            if (el) { 
                el.style.display = 'none'; 
                const ids = (window._marqueeAnnouncements || []).map(function(a) { return String(a.id); });
                try { localStorage.setItem(getAnnMarqueeDismissedKey(), JSON.stringify(ids)); } catch (e) {}
            }
            // Show toggle button
            const toggleBtn = document.getElementById('headerAnnToggleBtn');
            if (toggleBtn) toggleBtn.style.display = 'flex';
        }
        /** دکمهٔ «بیشتر» نوار اعلان — رفتن به صفحهٔ اعلان‌ها */
        function handleAnnMoreClick(e) {
            if (e && e.preventDefault) e.preventDefault();
            if (typeof showPage === 'function') showPage('announcements');
        }
        function openAnnouncementMarquee() {
            const el = document.getElementById('announcementMarquee');
            if (el) el.style.display = 'flex';
            // Hide toggle button
            const toggleBtn = document.getElementById('headerAnnToggleBtn');
            if (toggleBtn) toggleBtn.style.display = 'none';
        }
        function toggleAnnouncementMarquee() {
            const el = document.getElementById('announcementMarquee');
            if (el && el.style.display !== 'none') {
                closeAnnouncementMarquee();
            } else {
                showAnnouncementMarquee();
            }
        }
        function showAnnouncementMarquee() {
            const el = document.getElementById('announcementMarquee');
            if (el && window._marqueeAnnouncements && window._marqueeAnnouncements.length > 0) {
                el.style.display = 'flex';
            }
            // Hide toggle button
            const toggleBtn = document.getElementById('headerAnnToggleBtn');
            if (toggleBtn) toggleBtn.style.display = 'none';
        }
        function checkAnnouncementMarqueeVisibility() {
            const el = document.getElementById('announcementMarquee');
            const toggleBtn = document.getElementById('headerAnnToggleBtn');
            const announcements = window._marqueeAnnouncements || [];
            if (el && el.style.display !== 'none') {
                if (toggleBtn) toggleBtn.style.display = 'none';
            } else if (announcements.length > 0 && toggleBtn) {
                toggleBtn.style.display = 'flex';
            } else if (toggleBtn) {
                toggleBtn.style.display = 'none';
            }
        }
        function handleMarqueeItemClick(e) {
            const item = e.target.closest('.announcement-marquee-item');
            if (!item) return;
            const id = item.getAttribute('data-id');
            if (!id) return;
            marqueeAnnouncementClick(id);
        }
        function pauseTickerRatesMarquee() { const el = document.getElementById('ratesMarqueeInner'); if (el) el.classList.add('paused'); }
        function resumeTickerRatesMarquee() { const el = document.getElementById('ratesMarqueeInner'); if (el) el.classList.remove('paused'); }
        function renderMarqueeItem(a) {
            const badge = a.isImportant ? '<span class="ann-marquee-badge important">' + (t('ann_type_important') || 'Important') + '</span>' : '<span class="ann-marquee-badge info">' + (t('ann_type_info') || 'Info') + '</span>';
            const text = (a.title || '') + (a.body ? (LANG === 'fa' ? ': ' : ': ') + String(a.body).substring(0, 80) + (a.body.length > 80 ? '…' : '') : '');
            return '<div class="announcement-marquee-item' + (a.isImportant ? ' ann-important' : '') + '" data-id="' + escapeHtml(a.id) + '" style="cursor:pointer;"><span class="ann-marquee-badge-wrap">' + badge + '</span><span class="ann-marquee-sep">|</span><span class="ann-marquee-text">' + escapeHtml(text) + '</span></div>';
        }
        function marqueeAnnouncementClick(id) {
            const a = (window._marqueeAnnouncements || []).find(function(x) { return String(x.id) === String(id); });
            if (a) {
                apiFetch('/api/announcements/' + id + '/read', { method: 'POST' }).then(function() {
                    loadGeneralAnnouncementsMarquee();
                    apiFetch('/api/analytics/dashboard').then(function(r) { if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data); }).catch(function(){});
                });
                showAnnouncementModal(a);
            } else {
                showPage('announcements');
                setTimeout(function() {
                    const el = document.querySelector('.announcement-item[data-id="' + id + '"]');
                    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('highlight'); }
                }, 300);
            }
        }
        async function loadGeneralAnnouncementsMarquee() {
            const banner = document.getElementById('announcementMarquee');
            if (!banner) return;
            if (HIDDEN_SECTIONS && HIDDEN_SECTIONS.indexOf('announcements') >= 0) { banner.style.display = 'none'; return; }
            try {
                const res = await apiFetch('/api/announcements/for-me');
                if (res.needLogin || !res.ok) { banner.style.display = 'none'; return; }
                const list = (res.data && res.data.data) ? res.data.data : [];
                let general = list.filter(function(a) { return a.targetType === 'all'; });
                const seenIds = {};
                general = general.filter(function(a) { if (a.id && seenIds[a.id]) return false; if (a.id) seenIds[a.id] = true; return true; });
                if (general.length === 0) { banner.style.display = 'none'; return; }
                window._marqueeAnnouncements = general;
                const inner = banner.querySelector('.announcement-marquee-inner');
                const countEl = document.getElementById('annMarqueeCount');
                if (countEl) { countEl.textContent = general.length; countEl.style.display = general.length > 1 ? 'inline' : 'none'; }
                if (inner) {
                    const html = general.map(renderMarqueeItem).join('');
                    inner.innerHTML = html;
                    delete inner.dataset.marqueeDuplicated;
                    const track = banner.querySelector('.announcement-marquee-track');
                    function updateMarqueeMode() {
                        if (!track) return;
                        const fits = inner.scrollWidth <= track.clientWidth;
                        if (!fits && !inner.dataset.marqueeDuplicated) {
                            inner.innerHTML = inner.innerHTML + inner.innerHTML;
                            inner.dataset.marqueeDuplicated = '1';
                        }
                        inner.classList.toggle('centered', fits);
                        inner.classList.toggle('scrolling', !fits);
                        track.classList.toggle('announcement-centered', fits);
                    }
                    inner.classList.remove('centered', 'scrolling');
                    if (track) {
                        requestAnimationFrame(updateMarqueeMode);
                        if (typeof ResizeObserver !== 'undefined') {
                            if (track._marqueeRo) track._marqueeRo.disconnect();
                            track._marqueeRo = new ResizeObserver(updateMarqueeMode);
                            track._marqueeRo.observe(track);
                        }
                    } else {
                        inner.classList.add('scrolling');
                    }
                }
                const currentIds = general.map(function(a) { return String(a.id); });
                let dismissedIds = [];
                try {
                    const stored = localStorage.getItem(getAnnMarqueeDismissedKey());
                    if (stored) dismissedIds = JSON.parse(stored) || [];
                } catch (e) {}
                const hasNew = currentIds.some(function(id) { return dismissedIds.indexOf(id) === -1; });
                const toggleBtn = document.getElementById('headerAnnToggleBtn');
                if (dismissedIds.length > 0 && !hasNew) {
                    banner.style.display = 'none';
                    if (toggleBtn) toggleBtn.style.display = 'flex';
                } else {
                    banner.style.display = 'block';
                    if (toggleBtn) toggleBtn.style.display = 'none';
                }
            } catch (e) { banner.style.display = 'none'; }
        }

        let announcementsTab = 'all';
        let announcementsData = [];
        let announcementsSearchQuery = '';
        let announcementsSort = 'newest';
        function toggleAnnouncementSendForm() {
            const box = document.getElementById('announcementSendBox');
            const toggle = document.getElementById('annSendFormToggle');
            const textSpan = toggle ? toggle.querySelector('.ann-send-toggle-text') : null;
            if (box && toggle) {
                box.classList.toggle('collapsed');
                const isCollapsed = box.classList.contains('collapsed');
                toggle.setAttribute('aria-expanded', !isCollapsed);
                if (textSpan) textSpan.textContent = t(isCollapsed ? 'ann_expand' : 'ann_collapse');
            }
        }
        function resetAnnouncementForm() {
            const titleEl = document.getElementById('annTitle');
            const bodyEl = document.getElementById('annBody');
            const importantEl = document.getElementById('annImportant');
            if (titleEl) titleEl.value = '';
            if (bodyEl) bodyEl.value = '';
            if (importantEl) importantEl.checked = false;
            const hintEl = document.getElementById('annImportantHint');
            if (hintEl) hintEl.style.display = 'none';
            toast(LANG === 'fa' ? 'فرم پاک شد' : 'Form cleared');
        }
        function toggleAnnImportantHint() {
            const importantEl = document.getElementById('annImportant');
            const hintEl = document.getElementById('annImportantHint');
            if (hintEl && importantEl) hintEl.style.display = importantEl.checked ? 'block' : 'none';
        }
        function filterAnnouncementsBySearch(q) {
            announcementsSearchQuery = (q || '').trim().toLowerCase();
            renderAnnouncementsList();
        }
        function setAnnouncementsTab(tab) {
            announcementsTab = tab || 'all';
            document.querySelectorAll('.announcements-tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === announcementsTab); });
            renderAnnouncementsList();
        }
        function setAnnouncementsSort(sort) {
            announcementsSort = sort || 'newest';
            const sel = document.getElementById('announcementSort');
            if (sel) sel.value = announcementsSort;
            renderAnnouncementsList();
        }
        function filterAnnouncementsByTab(list) {
            if (announcementsTab === 'all') return list;
            if (announcementsTab === 'general') return list.filter(function(a) { return a.targetType === 'all'; });
            if (announcementsTab === 'department') return list.filter(function(a) { return a.targetType === 'department'; });
            if (announcementsTab === 'personal') return list.filter(function(a) { return a.targetType === 'user'; });
            return list;
        }
        function sortAnnouncements(list) {
            const arr = list.slice();
            if (announcementsSort === 'oldest') arr.sort(function(a, b) { return new Date(a.createdAt || 0) - new Date(b.createdAt || 0); });
            else if (announcementsSort === 'important') arr.sort(function(a, b) { const ai = a.isImportant ? 1 : 0; const bi = b.isImportant ? 1 : 0; if (bi !== ai) return bi - ai; return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
            else arr.sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
            return arr;
        }
        function annTargetLabel(a) {
            if (a.targetType === 'all') return t('ann_all');
            if (a.targetType === 'department' && a.targetId) return a.targetName || t('ann_one_dept');
            if (a.targetType === 'user' && a.targetId) return a.targetName || t('ann_one_user');
            return '';
        }
        async function loadAnnouncements() {
            const list = document.getElementById('announcementList');
            if (!list) return;
            list.innerHTML = t('loading');
            const res = await apiFetch('/api/announcements/for-me');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            announcementsData = (res.data && res.data.data) || [];
            renderAnnouncementsList();
            // mark همه اعلان‌های خوانده‌نشده به عنوان خوانده‌شده
            const unread = announcementsData.filter(function(a) { return !a.read; });
            if (unread.length > 0) {
                Promise.all(unread.map(function(a) {
                    return apiFetch('/api/announcements/' + a.id + '/read', { method: 'POST' }).catch(function(){});
                })).then(function() {
                    unread.forEach(function(a) { a.read = true; });
                    renderAnnouncementsList();
                    apiFetch('/api/analytics/dashboard').then(function(r) {
                        if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data);
                    }).catch(function(){});
                });
            }
        }
        function renderAnnouncementsList() {
            const list = document.getElementById('announcementList');
            if (!list) return;
            let filtered = filterAnnouncementsByTab(announcementsData);
            if (announcementsSearchQuery) {
                const q = announcementsSearchQuery;
                filtered = filtered.filter(function(a) {
                    const title = (a.title || '').toLowerCase();
                    const body = (a.body || '').toLowerCase();
                    const fromName = (a.fromUser && a.fromUser.name || '').toLowerCase();
                    return title.indexOf(q) >= 0 || body.indexOf(q) >= 0 || fromName.indexOf(q) >= 0;
                });
            }
            filtered = sortAnnouncements(filtered);
            if (filtered.length === 0) { list.className = 'announcements-list empty'; list.innerHTML = '<span class="empty-icon">📢</span><p class="empty-text">' + (t('ann_empty') || (LANG === 'fa' ? 'اعلانی وجود ندارد.' : 'No announcements.')) + '</p><p class="empty-hint">' + (t('ann_empty_hint') || '') + '</p>'; return; }
            list.classList.remove('empty');
            list.innerHTML = filtered.map(function(a) {
                const fromName = (a.fromUser && a.fromUser.name) ? a.fromUser.name : '';
                const targetStr = annTargetLabel(a);
                const readCls = a.read ? ' ann-read' : '';
                const impBadge = a.isImportant ? '<span class="ann-badge-important">' + (t('ann_type_important') || 'Important') + '</span>' : '';
                const typeIcon = a.isImportant ? '<span class="ann-card-type-icon ann-card-type-important" title="' + (t('ann_type_important') || '') + '">⚠</span>' : '<span class="ann-card-type-icon ann-card-type-info" title="' + (t('ann_type_info') || '') + '">ℹ</span>';
                const timeStr = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                const bodyHtml = (escapeHtml(a.body || '') || '').replace(/\n/g, '<br>');
                const delBtn = a.canDelete ? '<button type="button" class="ann-delete-btn btn-secondary btn-sm" data-id="' + escapeHtml(a.id) + '" title="' + (t('ann_delete') || '') + '">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button>' : '';
                return '<div class="announcement-card' + readCls + (a.isImportant ? ' ann-card-important' : '') + '" data-id="' + escapeHtml(a.id) + '"><div class="announcement-card-header">' + typeIcon + '<span class="announcement-card-title">' + escapeHtml(a.title || '') + '</span><div class="announcement-card-header-right">' + impBadge + delBtn + '</div></div><div class="announcement-card-body">' + bodyHtml + '</div><div class="announcement-card-meta"><span>' + t('ann_from') + ' ' + escapeHtml(fromName) + '</span><span>' + t('ann_to') + ' ' + escapeHtml(targetStr) + '</span><span class="announcement-card-time">' + (t('ann_sent_at') ? t('ann_sent_at') + ' ' : '') + timeStr + '</span></div></div>';
            }).join('');
            list.querySelectorAll('.announcement-card').forEach(function(card) {
                card.onclick = function(e) { if (!e.target.closest('.ann-delete-btn')) markAnnouncementReadAndShow(card.getAttribute('data-id')); };
            });
            list.querySelectorAll('.ann-delete-btn').forEach(function(btn) {
                btn.onclick = function(e) { e.stopPropagation(); deleteAnnouncement(btn.getAttribute('data-id')); };
            });
        }
        async function markAnnouncementReadAndShow(id) {
            if (!id) return;
            let a = announcementsData.find(function(x) { return x.id === id; });
            const needRead = !a || !a.read;
            if (needRead) {
                await apiFetch('/api/announcements/' + id + '/read', { method: 'POST' });
                apiFetch('/api/analytics/dashboard').then(function(r) { if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data); }).catch(function(){});
            }
            if (!a) {
                const res = await apiFetch('/api/announcements/for-me');
                if (res.ok && res.data && res.data.data) {
                    a = res.data.data.find(function(x) { return x.id === id; });
                    if (a) { a.read = true; announcementsData = res.data.data; renderAnnouncementsList(); }
                }
            } else if (needRead) {
                a.read = true;
                renderAnnouncementsList();
            }
            if (a) showAnnouncementModal(a);
        }
        function showAnnouncementModal(a) {
            const modal = document.getElementById('announcementModal');
            const box = document.getElementById('announcementModalBox');
            if (!modal) return;
            document.getElementById('annModalTitle').textContent = a.title || '';
            document.getElementById('annModalBody').innerHTML = (escapeHtml(a.body || '') || '').replace(/\n/g, '<br>');
            const metaEl = document.getElementById('annModalMeta');
            if (metaEl) {
                const fromName = (a.fromUser && a.fromUser.name) ? a.fromUser.name : '';
                const targetStr = annTargetLabel(a);
                const timeStr = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                metaEl.innerHTML = (t('ann_from') || '') + ' ' + escapeHtml(fromName) + ' · ' + (t('ann_to') || '') + ' ' + escapeHtml(targetStr) + (timeStr ? ' · ' + (t('ann_sent_at') || '') + ' ' + timeStr : '');
                metaEl.style.display = 'block';
            }
            const badgeEl = document.getElementById('annModalTypeBadge');
            if (badgeEl) {
                badgeEl.textContent = a.isImportant ? (t('ann_type_important') || 'Important') : (t('ann_type_info') || 'Info');
                badgeEl.className = 'announcement-modal-type-badge' + (a.isImportant ? ' important' : ' info');
                badgeEl.style.display = 'inline-block';
            }
            if (box) box.classList.toggle('announcement-modal-important', !!a.isImportant);
            modal.style.display = 'flex';
        }
        async function loadAnnouncementTargets() {
            const typeSel = document.getElementById('annTargetType');
            const idSel = document.getElementById('annTargetId');
            const wrap = document.getElementById('annTargetIdWrap');
            const typeWrap = typeSel ? typeSel.closest('.announcements-send-field') : null;
            if (!typeSel || !idSel) return;
            const res = await apiFetch('/api/announcements/targets');
            if (res.needLogin || !res.ok) return;
            const users = res.users || [];
            const departments = res.departments || [];
            const isManager = currentUser && currentUser.role === 'manager';
            if (isManager && departments.length >= 1) {
                typeSel.value = 'department';
                idSel.innerHTML = '';
                departments.forEach(function(d) { idSel.innerHTML += '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; });
                wrap.style.display = 'block';
                const labelEl = wrap.querySelector('label');
                if (labelEl) labelEl.textContent = (LANG === 'fa' ? 'دپارتمان' : LANG === 'tr' ? 'Departman' : 'Department');
                if (typeWrap) typeWrap.style.display = 'none';
            } else if (isManager && departments.length === 0) {
                if (typeWrap) typeWrap.style.display = 'none';
                wrap.style.display = 'none';
                toast(LANG === 'fa' ? 'شما به هیچ دپارتمانی تخصیص ندارید.' : 'You are not assigned to any department.', true);
            } else {
                if (typeWrap) typeWrap.style.display = 'block';
                typeSel.onchange = function() {
                    const v = typeSel.value;
                    wrap.style.display = (v === 'department' || v === 'user') ? 'block' : 'none';
                    idSel.innerHTML = '<option value="">' + t('ann_select') + '</option>';
                    if (v === 'department') departments.forEach(function(d) { idSel.innerHTML += '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; });
                    if (v === 'user') users.forEach(function(u) { idSel.innerHTML += '<option value="' + u.id + '">' + escapeHtml(u.name) + (u.department && u.department.name ? ' (' + u.department.name + ')' : '') + '</option>'; });
                };
                typeSel.dispatchEvent(new Event('change'));
            }
        }
        async function sendAnnouncement() {
            const title = (document.getElementById('annTitle') && document.getElementById('annTitle').value) || '';
            const body = (document.getElementById('annBody') && document.getElementById('annBody').value) || '';
            if (!title.trim() || !body.trim()) { toast(t('ann_title') + ' ' + (LANG === 'fa' ? 'و متن الزامی است' : 'and message are required'), true); return; }
            const targetType = (document.getElementById('annTargetType') && document.getElementById('annTargetType').value) || 'all';
            const targetId = (document.getElementById('annTargetId') && document.getElementById('annTargetId').value) || '';
            if (targetType !== 'all' && !targetId) { toast(t('ann_select'), true); return; }
            const isImportant = (document.getElementById('annImportant') && document.getElementById('annImportant').checked) || false;
            const payload = { title: title.trim(), body: body.trim(), isImportant: isImportant, targetType: targetType, targetId: targetType === 'all' ? null : targetId };
            const res = await apiFetch('/api/announcements', { method: 'POST', body: JSON.stringify(payload) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('annTitle').value = '';
                document.getElementById('annBody').value = '';
                document.getElementById('annImportant').checked = false;
                toast(LANG === 'fa' ? 'اعلان ارسال شد.' : 'Announcement sent.');
                loadAnnouncements();
                loadGeneralAnnouncementsMarquee();
                if (typeof updateNavBadges === 'function') updateNavBadges();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function closeAnnouncementModal() {
            const id = window._lastImportantAnnouncementId;
            if (id) {
                window._lastImportantAnnouncementId = null;
                apiFetch('/api/announcements/' + id + '/read', { method: 'POST' }).then(function() { loadAnnouncements(); loadGeneralAnnouncementsMarquee(); apiFetch('/api/analytics/dashboard').then(function(r) { if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data); }).catch(function(){}); });
            }
            const m = document.getElementById('announcementModal'); if (m) m.style.display = 'none';
        }
        async function deleteAnnouncement(id) {
            if (!id) return;
            if (!confirm(t('ann_delete_confirm') || (LANG === 'fa' ? 'حذف این اعلان؟' : 'Delete this announcement?'))) return;
            const res = await apiFetch('/api/announcements/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) {
                toast(LANG === 'fa' ? 'اعلان حذف شد' : 'Announcement deleted');
                announcementsData = announcementsData.filter(function(a) { return a.id !== id; });
                renderAnnouncementsList();
                loadGeneralAnnouncementsMarquee();
                if (typeof updateNavBadges === 'function') updateNavBadges();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let convQuickTab = 'all';
        let convCurrentPage = 1;

        /* ========== Global Delegated Event Handler for Dynamic Content ========== */
        function setupGlobalDelegatedHandlers() {
            // Global document-level click handler to catch dynamically generated buttons with onclick
            document.addEventListener('click', function(e) {
                const target = e.target;
                const targetEl = (target && target.nodeType === 1) ? target : (target && target.parentElement);
                // تب‌های مودال ویرایش کاربر (اطلاعات پایه / دسترسی‌ها) — delegation تا همیشه کار کند
                const userEditTabEl = targetEl && targetEl.closest && targetEl.closest('#userEditModal .user-edit-tab[data-tab]');
                if (userEditTabEl) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelectorAll('#userEditModal .user-edit-tab').forEach(function(b) {
                        const on = b === userEditTabEl;
                        b.classList.toggle('active', on);
                        b.setAttribute('aria-selected', on ? 'true' : 'false');
                    });
                    document.querySelectorAll('#userEditModal .user-edit-tab-panel').forEach(function(p) {
                        p.classList.remove('active');
                        p.style.display = 'none';
                    });
                    const panelId = userEditTabEl.getAttribute('aria-controls');
                    const pan = panelId && document.getElementById(panelId);
                    if (pan) {
                        pan.classList.add('active');
                        pan.style.display = 'block';
                    }
                    return;
                }
                // داشبورد — کارت‌ها، آمار، اقدام سریع، نوار «نیاز به توجه» (بدون inline onclick)
                const dashCard = targetEl && targetEl.closest && targetEl.closest('.dashboard-card[data-page]');
                if (dashCard && typeof showPage === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    showPage(dashCard.getAttribute('data-page') || '');
                    return;
                }
                const dashStat = targetEl && targetEl.closest && targetEl.closest('.dashboard-stat-box[data-dashboard-page]');
                if (dashStat && typeof showPage === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    showPage(dashStat.getAttribute('data-dashboard-page') || '');
                    return;
                }
                const dashAtt = targetEl && targetEl.closest && targetEl.closest('.dashboard-attention-link[data-dashboard-page]');
                if (dashAtt && typeof showPage === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    var _dashPage = dashAtt.getAttribute('data-dashboard-page') || '';
                    var _dashConvTab = dashAtt.getAttribute('data-conv-tab');
                    showPage(_dashPage);
                    if (_dashConvTab && _dashPage === 'conversations' && typeof setConvQuickTab === 'function') {
                        setTimeout(function() { setConvQuickTab(_dashConvTab); }, 0);
                    }
                    return;
                }
                const dashQuick = targetEl && targetEl.closest && targetEl.closest('.btn-quick[data-quick-action]');
                if (dashQuick) {
                    var _qa = dashQuick.getAttribute('data-quick-action');
                    e.preventDefault();
                    e.stopPropagation();
                    if (_qa === 'conv-new' && typeof showPage === 'function' && typeof openNewConvModal === 'function') {
                        showPage('conversations');
                        openNewConvModal();
                    } else if (_qa === 'customer-new' && typeof showPage === 'function' && typeof openCustomerModal === 'function') {
                        showPage('customers');
                        openCustomerModal();
                    } else if (_qa === 'ticket-new' && typeof showPage === 'function' && typeof toggleTicketForm === 'function') {
                        showPage('tickets');
                        setTimeout(function() { toggleTicketForm(); }, 350);
                    }
                    return;
                }
                // کلیک روی اسم فرستنده در گروه → باز کردن مکالمه خصوصی
                const senderEl = target.closest('.msg-sender-clickable');
                if (senderEl) {
                    e.preventDefault(); e.stopPropagation();
                    const sPhone = senderEl.getAttribute('data-sender-phone');
                    const sName = senderEl.getAttribute('data-sender-name');
                    if (sPhone && typeof openPrivateChatFromGroup === 'function') {
                        openPrivateChatFromGroup(sPhone, sName);
                    } else {
                        toast(LANG === 'fa' ? 'شماره این عضو در دسترس نیست' : 'Phone number not available', true);
                    }
                    return;
                }
                // Conversation quick tab buttons (همه، خوانده‌نشده، بدون پاسخ، ...)
                const convTabBtn = target.closest('.conv-quick-tabs .conv-tab');
                if (convTabBtn && typeof setConvQuickTab === 'function') {
                    var tab = convTabBtn.getAttribute('data-tab');
                    if (tab) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); setConvQuickTab(tab); }
                    return;
                }
                // مکالمه جدید — دکمه جدید مکالمه
                if (target.closest('#btnNewConv') && typeof openNewConvModal === 'function') {
                    e.preventDefault(); e.stopPropagation(); openNewConvModal();
                    return;
                }
                // فیلترهای بیشتر — نمایش/مخفی فیلترهای پیشرفته
                if (target.closest('#convFilterToggle') && typeof toggleConvAdvancedFilters === 'function') {
                    e.preventDefault(); e.stopPropagation(); toggleConvAdvancedFilters();
                    return;
                }
                // همگام‌سازی گروه‌ها
                if (target.closest('#btnSyncGroups') && typeof syncWhatsAppGroups === 'function') {
                    e.preventDefault(); e.stopPropagation(); syncWhatsAppGroups();
                    return;
                }
                // اعمال فیلتر — دکمه اعمال فیلترهای مکالمات
                if (target.closest('#btnApplyConvFilters') && typeof applyConvFilters === 'function') {
                    e.preventDefault(); e.stopPropagation(); applyConvFilters();
                    return;
                }
                // دکمه مکالمه جدید در حالت خالی لیست
                if (target.closest('#emptyConvNewBtn') && typeof openNewConvModal === 'function') {
                    e.preventDefault(); e.stopPropagation(); openNewConvModal();
                    return;
                }
                const newConvCust = targetEl && targetEl.closest && targetEl.closest('.new-conv-customer-item[data-start-conv-id]');
                if (newConvCust && typeof startNewConversation === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    startNewConversation(newConvCust.getAttribute('data-start-conv-id') || '', newConvCust.getAttribute('data-start-conv-name') || '');
                    return;
                }
                // تب‌های سریع تسک (همه، در انتظار، در حال انجام، ...)
                const taskTabBtn = target.closest('.task-quick-tabs .task-tab');
                if (taskTabBtn && typeof setTaskQuickTab === 'function') {
                    var tab = taskTabBtn.getAttribute('data-tab');
                    if (tab) { e.preventDefault(); e.stopPropagation(); setTaskQuickTab(tab); }
                    return;
                }
                // تسک جدید — دکمه باز کردن فرم
                if (target.closest('#btnTaskCreate') && typeof toggleTaskForm === 'function') {
                    e.preventDefault(); e.stopPropagation(); toggleTaskForm();
                    return;
                }
                // دکمه تسک جدید در حالت خالی لیست
                if (target.closest('#emptyTaskFormBtn') && typeof toggleTaskForm === 'function') {
                    e.preventDefault(); e.stopPropagation(); toggleTaskForm();
                    return;
                }
                // اعمال فیلتر تسک‌ها
                if (target.closest('#btnApplyTaskFilters') && typeof loadTasks === 'function') {
                    e.preventDefault(); e.stopPropagation(); loadTasks();
                    return;
                }
                // ثبت تسک جدید
                if (target.closest('#btnTaskSubmit') && typeof addTask === 'function') {
                    e.preventDefault(); e.stopPropagation(); addTask();
                    return;
                }
                // انصراف از فرم تسک
                if (target.closest('#btnTaskCancel') && typeof toggleTaskForm === 'function') {
                    e.preventDefault(); e.stopPropagation(); toggleTaskForm();
                    return;
                }
                // کلیک روی آیتم تسک — باز کردن جزئیات
                const taskItem = target.closest('.task-list-item[data-task-id]');
                if (taskItem && typeof loadTaskDetail === 'function') {
                    var tid = taskItem.getAttribute('data-task-id');
                    if (tid) { e.preventDefault(); e.stopPropagation(); loadTaskDetail(tid); }
                    return;
                }
                // دکمه بازگشت به لیست تسک‌ها
                if (target.closest('.task-back-btn') && typeof showTaskList === 'function') {
                    e.preventDefault(); e.stopPropagation(); showTaskList();
                    return;
                }
                // بارگذاری بیشتر تسک‌ها
                if (target.closest('#btnLoadMoreTasks') && typeof loadMoreTasks === 'function') {
                    e.preventDefault(); e.stopPropagation(); loadMoreTasks();
                    return;
                }
                // دکمه ثبت پیگیری تسک
                if (target.closest('#btnTaskUpdateSubmit') && typeof addTaskUpdate === 'function') {
                    e.preventDefault(); e.stopPropagation(); addTaskUpdate();
                    return;
                }
                // دکمه اعمال تغییرات جزئیات تسک
                if (target.closest('#btnTaskDetailUpdate') && typeof updateTaskFromDetail === 'function') {
                    e.preventDefault(); e.stopPropagation(); updateTaskFromDetail();
                    return;
                }
                // تمپلیت‌های پیام — افزودن تمپلیت متنی
                if (target.closest('#btnAddTextTemplate') && typeof openTemplateModal === 'function') {
                    e.preventDefault(); e.stopPropagation(); openTemplateModal();
                    return;
                }
                // تمپلیت‌های پیام — بارگذاری فایل
                if (target.closest('#btnAddFileTemplate') && typeof openFileTemplateModal === 'function') {
                    e.preventDefault(); e.stopPropagation(); openFileTemplateModal();
                    return;
                }
                // مودال تمپلیت متنی — بستن و ذخیره
                if (target.closest('#closeTemplateModalBtn') || target.closest('#cancelTemplateModalBtn')) {
                    if (typeof closeTemplateModal === 'function') { e.preventDefault(); closeTemplateModal(); }
                    return;
                }
                if (target.closest('#saveTemplateBtn') && typeof saveTemplate === 'function') {
                    e.preventDefault(); e.stopPropagation(); saveTemplate();
                    return;
                }
                // مودال فایل — بستن و ذخیره
                if (target.closest('#closeFileTemplateModalBtn') || target.closest('#cancelFileTemplateModalBtn')) {
                    if (typeof closeFileTemplateModal === 'function') { e.preventDefault(); closeFileTemplateModal(); }
                    return;
                }
                if (target.closest('#saveFileTemplateBtn') && typeof saveFileTemplate === 'function') {
                    e.preventDefault(); e.stopPropagation(); saveFileTemplate();
                    return;
                }
                // ویرایش و حذف تمپلیت متنی
                if (target.closest('.btn-tpl-edit') && typeof editTemplate === 'function') {
                    var tid = (target.closest('.btn-tpl-edit') || {}).getAttribute('data-id');
                    if (tid) { e.preventDefault(); e.stopPropagation(); editTemplate(tid); }
                    return;
                }
                if (target.closest('.btn-tpl-delete') && typeof deleteTemplate === 'function') {
                    var tid = (target.closest('.btn-tpl-delete') || {}).getAttribute('data-id');
                    if (tid) { e.preventDefault(); e.stopPropagation(); deleteTemplate(tid); }
                    return;
                }
                // لینک‌های آمار واتساپ — مشاهده مکالمات
                const statLink = target.closest('.whatsapp-stat-link[data-stat]');
                if (statLink && typeof showPage === 'function' && typeof setConvQuickTab === 'function') {
                    const stat = statLink.getAttribute('data-stat');
                    if (stat) { e.preventDefault(); e.stopPropagation(); showPage('conversations'); setConvQuickTab(stat); }
                    return;
                }
                // دکمه‌های اتصال واتساپ
                if (target.closest('#btnStartGateway') && typeof startGateway === 'function') { e.preventDefault(); e.stopPropagation(); startGateway(); return; }
                if (target.closest('#btnStartWhatsApp') && typeof startWhatsAppClient === 'function') { e.preventDefault(); e.stopPropagation(); startWhatsAppClient(); return; }
                if (target.closest('#btnRefreshStatus') && typeof refreshWhatsappStatusDebounced === 'function') { e.preventDefault(); e.stopPropagation(); refreshWhatsappStatusDebounced(); return; }
                if (target.closest('#btnDisconnectWhatsApp') && typeof disconnectWhatsApp === 'function') { e.preventDefault(); e.stopPropagation(); disconnectWhatsApp(); return; }
                if (target.closest('#whatsappManageConvsLink') || target.closest('#whatsappUnassignedManageLink')) { e.preventDefault(); e.stopPropagation(); if (typeof showPage === 'function') showPage('conversations'); return; }
                if (target.closest('#whatsappEditDeptsLink')) { e.preventDefault(); e.stopPropagation(); if (typeof showPage === 'function') showPage('departments'); return; }
                // ذخیره تنظیمات واتساپ
                if (target.closest('#btnSaveWhatsappWelcome') && typeof saveWhatsappWelcomeConfig === 'function') { e.preventDefault(); e.stopPropagation(); saveWhatsappWelcomeConfig(); return; }
                if (target.closest('#btnSaveWhatsappAI') && typeof saveWhatsappAIConfig === 'function') { e.preventDefault(); e.stopPropagation(); saveWhatsappAIConfig(); return; }
                if (target.closest('#whatsappOpenAIClearKey') && typeof clearWhatsappOpenAIKey === 'function') { e.preventDefault(); e.stopPropagation(); clearWhatsappOpenAIKey(); return; }
                if (target.closest('#btnSaveWhatsappAutoMessages') && typeof saveWhatsappAutoMessagesConfig === 'function') { e.preventDefault(); e.stopPropagation(); saveWhatsappAutoMessagesConfig(); return; }
                if (target.closest('#btnSaveWhatsappUnanswered') && typeof saveWhatsappUnansweredConfig === 'function') { e.preventDefault(); e.stopPropagation(); saveWhatsappUnansweredConfig(); return; }
                if (target.closest('#btnSaveWhatsappConnection') && typeof saveWhatsappConnectionSettings === 'function') { e.preventDefault(); e.stopPropagation(); saveWhatsappConnectionSettings(); return; }
                if (target.closest('.whatsapp-conn-tab') && typeof switchWhatsappConnectionTab === 'function') { e.preventDefault(); var tb = target.closest('.whatsapp-conn-tab'); if (tb) switchWhatsappConnectionTab(tb.getAttribute('data-tab')); return; }
                // ویرایش و حذف فایل تمپلیت
                if (target.closest('.btn-ft-edit') && typeof editFileTemplate === 'function') {
                    var fid = (target.closest('.btn-ft-edit') || {}).getAttribute('data-id');
                    if (fid) { e.preventDefault(); e.stopPropagation(); editFileTemplate(fid); }
                    return;
                }
                if (target.closest('.btn-ft-delete') && typeof deleteFileTemplate === 'function') {
                    var fid = (target.closest('.btn-ft-delete') || {}).getAttribute('data-id');
                    if (fid) { e.preventDefault(); e.stopPropagation(); deleteFileTemplate(fid); }
                    return;
                }
                // Chat back button (mobile) — fallback for returning to conversation list
                if (target.closest('.chat-back-btn') && typeof closeChatMobile === 'function') {
                    e.preventDefault();
                    closeChatMobile();
                    return;
                }
                const msgReplyBtn = target.closest('.msg-reply-btn[data-wa-id]');
                if (msgReplyBtn && typeof setReplyTo === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    const waId = msgReplyBtn.getAttribute('data-wa-id');
                    const prev = msgReplyBtn.getAttribute('data-preview');
                    setReplyTo(waId, prev != null ? prev : '');
                    return;
                }
                // چت داخلی — دکمه‌ها و المان‌های کلیکی
                if (target.closest('.internal-chat-new-btn') && typeof showNewChatForm === 'function') { e.preventDefault(); e.stopPropagation(); showNewChatForm(); return; }
                if (target.closest('.internal-chat-back-btn') && typeof backToInternalChatList === 'function') { e.preventDefault(); e.stopPropagation(); backToInternalChatList(); return; }
                if (target.closest('.internal-chat-attach-btn-sm')) { e.preventDefault(); e.stopPropagation(); const f = document.getElementById('internalChatFile'); if (f) f.click(); return; }
                if (target.closest('.internal-chat-send-btn-sm') && typeof sendInternalMessage === 'function') { e.preventDefault(); e.stopPropagation(); sendInternalMessage(); return; }
                if (target.closest('#internalChatFloatingBtn') && typeof toggleInternalChatFloating === 'function') { e.preventDefault(); e.stopPropagation(); toggleInternalChatFloating(); return; }
                if (target.closest('.internal-chat-popup-minimize') && typeof toggleInternalChatPopupMinimize === 'function') { e.preventDefault(); e.stopPropagation(); toggleInternalChatPopupMinimize(); return; }
                if (target.closest('.internal-chat-popup-expand') && typeof openInternalChatFromPopup === 'function') { e.preventDefault(); e.stopPropagation(); openInternalChatFromPopup(); return; }
                if (target.closest('.internal-chat-popup-close') && typeof closeInternalChatPopup === 'function') { e.preventDefault(); e.stopPropagation(); closeInternalChatPopup(); return; }
                if (target.closest('.internal-chat-popup-attach-btn')) { e.preventDefault(); e.stopPropagation(); const pf = document.getElementById('internalChatPopupFile'); if (pf) pf.click(); return; }
                if (target.closest('.internal-chat-popup-send-btn') && typeof sendInternalMessageFromPopup === 'function') { e.preventDefault(); e.stopPropagation(); sendInternalMessageFromPopup(); return; }
                const internalThreadItem = target.closest('.internal-chat-thread-item[data-id]');
                if (internalThreadItem && typeof openInternalThread === 'function') { var tid = internalThreadItem.getAttribute('data-id'); if (tid) { e.preventDefault(); e.stopPropagation(); openInternalThread(tid); } return; }
                const popupThreadItem = target.closest('.internal-chat-popup-thread-item[data-id]');
                if (popupThreadItem && typeof selectThreadInPopup === 'function') { const pid = popupThreadItem.getAttribute('data-id'); if (pid) { e.preventDefault(); e.stopPropagation(); selectThreadInPopup(pid); } return; }
                if (target.closest('.internal-chat-popup-new-btn')) { e.preventDefault(); e.stopPropagation(); if (typeof closeInternalChatPopup === 'function') closeInternalChatPopup(); if (typeof showPage === 'function') showPage('internal-chat'); return; }
                if (target.closest('#btnInternalStartChat') && typeof startInternalChat === 'function') { e.preventDefault(); e.stopPropagation(); startInternalChat(); return; }
                if (target.closest('#btnInternalCancelChat') && typeof hideNewChatForm === 'function') { e.preventDefault(); e.stopPropagation(); hideNewChatForm(); return; }
                if (target.closest('.internal-call-btn[data-call-type="voice"]') && typeof startInternalCall === 'function') { e.preventDefault(); e.stopPropagation(); startInternalCall('voice'); return; }
                if (target.closest('.internal-call-btn[data-call-type="video"]') && typeof startInternalCall === 'function') { e.preventDefault(); e.stopPropagation(); startInternalCall('video'); return; }
                // Handle internal chat popup header click (minimize)
                if (target.closest('.internal-chat-popup-header-compact') && !target.closest('.internal-chat-popup-actions') && typeof toggleInternalChatPopupMinimize === 'function') { e.preventDefault(); e.stopPropagation(); toggleInternalChatPopupMinimize(); return; }
                // صفحه کاربران — CSP / حذف onclick (backup به toggleUserForm/addUser نیاز به window دارد)
                if (target.closest('#btnAddUser') && typeof toggleUserForm === 'function') { e.preventDefault(); e.stopPropagation(); toggleUserForm(); return; }
                if (target.closest('#btnCancelUserForm') && typeof toggleUserForm === 'function') { e.preventDefault(); e.stopPropagation(); toggleUserForm(); return; }
                if (target.closest('#btnSubmitNewUser') && typeof addUser === 'function') { e.preventDefault(); e.stopPropagation(); addUser(); return; }
                const ueBtn = target.closest('#userList .btn-user-list-edit[data-user-id]');
                if (ueBtn && typeof openUserEdit === 'function') { e.preventDefault(); e.stopPropagation(); openUserEdit(ueBtn.getAttribute('data-user-id')); return; }
                const usBtn = target.closest('#userList .btn-user-list-staff[data-user-id]');
                if (usBtn && typeof openStaffDetailModal === 'function') { e.preventDefault(); e.stopPropagation(); openStaffDetailModal(usBtn.getAttribute('data-user-id')); return; }
                const uCard = target.closest('#userList .user-card[data-user-id].user-card-clickable');
                if (uCard && !target.closest('.user-card-actions') && typeof openStaffDetailModal === 'function') { e.preventDefault(); e.stopPropagation(); openStaffDetailModal(uCard.getAttribute('data-user-id')); return; }
                // احراز دو مرحله‌ای — دکمه‌های پروفایل
                if (target.closest('#totpSetupBtnDynamic') && typeof openTotpSetup === 'function') { e.preventDefault(); e.stopPropagation(); openTotpSetup(); return; }
                if (target.closest('#totpDisableBtnDynamic') && typeof openTotpDisableModal === 'function') { e.preventDefault(); e.stopPropagation(); openTotpDisableModal(); return; }
                if (target.closest('#closeTotpSetupModalBtn') && typeof closeTotpSetupModal === 'function') { e.preventDefault(); e.stopPropagation(); closeTotpSetupModal(); return; }
                if (target.closest('#closeTotpDisableModalBtn') && typeof closeTotpDisableModal === 'function') { e.preventDefault(); e.stopPropagation(); closeTotpDisableModal(); return; }
                if (target.closest('#confirmTotpSetupBtn') && typeof confirmTotpSetup === 'function') { e.preventDefault(); e.stopPropagation(); confirmTotpSetup(); return; }
                if (target.closest('#disableTotpSubmitBtn') && typeof disableTotpSubmit === 'function') { e.preventDefault(); e.stopPropagation(); disableTotpSubmit(); return; }
                // دکمه تنظیمات مکالمه (chat detail toggle)
                if (target.closest('#chatDetailToggle') && typeof toggleChatDetailBar === 'function') { e.preventDefault(); e.stopPropagation(); toggleChatDetailBar(); return; }
                // دکمه تمپلیت پیام در چت مکالمات
                if (target.closest('#waAttachTemplateBtn') && typeof toggleTemplateDropdown === 'function') { e.preventDefault(); e.stopPropagation(); toggleTemplateDropdown(); return; }
                // آیتم‌های دراپ‌داون تمپلیت — کلیک برای درج در چت
                // آیتم فایل template در dropdown
                const fileTplItem = target.closest('.chat-file-tpl-item[data-file-id]');
                if (fileTplItem) {
                    var fid = fileTplItem.getAttribute('data-file-id');
                    const fname = fileTplItem.getAttribute('data-filename') || fileTplItem.getAttribute('data-file-name') || '';
                    const fmime = fileTplItem.getAttribute('data-mimetype') || '';
                    const furl = fileTplItem.getAttribute('data-file-url') || '';
                    if (fid && typeof sendMsg === 'function') {
                        e.preventDefault(); e.stopPropagation();
                        var dd = document.getElementById('chatTemplateDropdown'); var btn = document.getElementById('waAttachTemplateBtn') || document.getElementById('msgTemplateBtn');
                        if (dd) dd.style.display = 'none'; if (btn) btn.setAttribute('aria-expanded', 'false');
                        apiFetch('/api/file-templates/' + fid + '/use', { method: 'POST' }).catch(function(){});
                        apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: '', media: { url: furl, filename: fname, mimetype: fmime } }) }).then(function(r) { if (!r.ok) toast((r.data && r.data.error) || t('err_generic'), true); });
                    }
                    return;
                }
                const tplItem = target.closest('.chat-template-dropdown-item[data-id]');
                if (tplItem && tplItem.hasAttribute('data-content')) {
                    var tid = tplItem.getAttribute('data-id');
                    const c = typeof unescapeFromDataAttr === 'function' ? unescapeFromDataAttr(tplItem.getAttribute('data-content') || '') : (tplItem.getAttribute('data-content') || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    if (typeof insertTemplateIntoChat === 'function') { e.preventDefault(); e.stopPropagation(); insertTemplateIntoChat(c, tid); var dd = document.getElementById('chatTemplateDropdown'); var btn = document.getElementById('waAttachTemplateBtn') || document.getElementById('msgTemplateBtn'); if (dd) dd.style.display = 'none'; if (btn) btn.setAttribute('aria-expanded', 'false'); }
                    return;
                }
                // کلیک روی آیتم تاریخچه مکالمات یا تاریخچه کامل در کارت مشتری — باز کردن مکالمه
                const custHistItem = target.closest('.cust-hist-item[data-convid]');
                const timelineConvItem = target.closest('.customer-timeline-conv[data-convid], .customer-timeline-item.customer-timeline-conv[data-convid]');
                const historyItem = custHistItem || timelineConvItem;
                if (historyItem && typeof openChatFromHistory === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    openChatFromHistory(historyItem);
                    return;
                }
                /* onclick روی DOM می‌ماند؛ CSP با script-src-attr 'unsafe-inline' (همان helmet) مجاز است — بدون new Function / unsafe-eval */
                // Handle buttons with specific functions
                if (target.matches('[onclick*="openNewConvModal"]')) {
                    e.preventDefault();
                    openNewConvModal();
                }
                else if (target.matches('[onclick*="openCustomerModal"]') || target.closest('#emptyCustomerAddBtn')) {
                    e.preventDefault();
                    const customerId = (target.closest('[data-id]') || target).getAttribute('data-id') || '';
                    openCustomerModal(customerId);
                }
                else if (target.closest('#customerRetryBtn') || target.closest('#customerRefreshBtn')) {
                    e.preventDefault();
                    if (typeof loadCustomers === 'function') loadCustomers();
                }
                else if (target.closest('.customer-avatar-clickable')) {
                    e.preventDefault();
                    const avatar = target.closest('.customer-avatar-clickable');
                    const src = avatar && avatar.getAttribute('data-profile-pic');
                    if (src && typeof openImagePreviewModal === 'function') openImagePreviewModal(src);
                }
                else if (target.closest('.image-preview-close') || (target.closest('#imagePreviewModal') && target.id === 'imagePreviewModal')) {
                    e.preventDefault();
                    if (typeof closeImagePreviewModal === 'function') closeImagePreviewModal();
                }
                else if (target.matches('[onclick*="toggleTicketForm"]')) {
                    e.preventDefault();
                    toggleTicketForm();
                }
                else if (target.matches('[onclick*="startCustomerChat"]') || target.closest('.customer-send-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    var btn = target.closest('.customer-send-btn') || target;
                    var custId = btn.getAttribute('data-customer-id') || btn.getAttribute('data-cust-id') || '';
                    var custName = btn.getAttribute('data-customer-name') || btn.getAttribute('data-cust-name') || '';
                    var custPhone = btn.getAttribute('data-customer-phone') || btn.getAttribute('data-cust-phone') || '';
                    if (custId) startCustomerChat(custId, custName, custPhone);
                }
                else if (target.closest('.bulk-customer-check')) {
                    e.stopPropagation();
                    toggleBulkSelect(target.closest('.bulk-customer-check'));
                }
                else if (target.closest('.customer-card') && !target.closest('.customer-card-skeleton')) {
                    const card = target.closest('.customer-card');
                    if (!card || target.closest('.bulk-customer-check') || target.closest('.customer-send-btn')) return;
                    e.preventDefault();
                    var custId = card.getAttribute('data-customer-id');
                    var custName = card.getAttribute('data-customer-name') || '';
                    var custPhone = card.getAttribute('data-customer-phone') || '';
                    if (custId && typeof showCustomerHistory === 'function') showCustomerHistory(custId, custName);
                }
                else if (target.matches('[onclick*="openTransactionModal"]')) {
                    e.preventDefault();
                    var custId = target.getAttribute('data-cust-id') || '';
                    if (custId) openTransactionModal(custId);
                }
                else if (target.matches('[onclick*="loadTicketDetail"]')) {
                    e.preventDefault();
                    const ticketId = target.getAttribute('data-ticket-id') || '';
                    if (ticketId) loadTicketDetail(ticketId);
                }
            }, true); // Use capturing phase to catch before other handlers
            document.addEventListener('keydown', function(e) {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const active = document.activeElement;
                if (!active || !active.closest) return;
                if (active.closest('.customer-avatar-clickable')) {
                    const avatar = active.closest('.customer-avatar-clickable');
                    const src = avatar && avatar.getAttribute('data-profile-pic');
                    if (src) { e.preventDefault(); if (typeof openImagePreviewModal === 'function') openImagePreviewModal(src); }
                    return;
                }
                if (active.closest('.bulk-customer-check') || active.closest('.customer-send-btn')) return;
                const card = active.closest('.customer-card:not(.customer-card-skeleton)');
                if (card) {
                    const custId = card.getAttribute('data-customer-id');
                    const custName = card.getAttribute('data-customer-name') || '';
                    if (custId) { e.preventDefault(); if (typeof showCustomerHistory === 'function') showCustomerHistory(custId, custName); }
                    return;
                }
                const taskItem = active.closest('.task-list-item[data-task-id]');
                if (taskItem && typeof loadTaskDetail === 'function') {
                    const tid = taskItem.getAttribute('data-task-id');
                    if (tid) { e.preventDefault(); loadTaskDetail(tid); }
                }
                // چت داخلی — Enter برای ارسال پیام
                if (active.id === 'internalChatInput' && e.key === 'Enter' && !e.shiftKey && typeof sendInternalMessage === 'function') { e.preventDefault(); sendInternalMessage(); return; }
                if (active.id === 'internalChatPopupInput' && typeof handlePopupChatKeydown === 'function') { handlePopupChatKeydown(e); return; }
                // مکالمات واتساپ — Enter برای ارسال (inline onkeypress با CSP حذف می‌شود)
                if (active.id === 'msgInput' && e.key === 'Enter' && !e.shiftKey && typeof sendMsg === 'function') {
                    if (e.isComposing || (active && active.isComposing)) return;
                    e.preventDefault();
                    sendMsg();
                    return;
                }
            }, true);
            document.addEventListener('input', function(e) {
                if (e.target.id === 'internalChatSearch' && typeof filterInternalThreads === 'function') filterInternalThreads(e.target.value);
            }, true);
            document.addEventListener('change', function(e) {
                if (e.target.id === 'internalChatFile' && typeof toggleInternalFileOption === 'function') toggleInternalFileOption();
                if (e.target.id === 'internalChatPopupFile') {
                    const f = e.target.files && e.target.files[0];
                    const label = document.getElementById('internalChatPopupFileLabel');
                    if (label) { label.textContent = f ? f.name : ''; label.style.display = f ? 'inline' : 'none'; }
                }
            }, true);
        }
        
        /* ========== Remove All Inline Handlers (CSP Compliance) ========== */
        function removeAllInlineHandlers() {
            // onclick روی المنت‌ها می‌ماند (helmet: script-src-attr 'unsafe-inline') — بدون new Function / unsafe-eval
            document.querySelectorAll('[onkeyup]').forEach(function(el) {
                el.removeAttribute('onkeyup');
            });
            document.querySelectorAll('[onchange]').forEach(function(el) {
                el.removeAttribute('onchange');
            });
            document.querySelectorAll('[onkeypress]').forEach(function(el) {
                el.removeAttribute('onkeypress');
            });
        }

        function scheduleRemoveAllInlineHandlers() {
            if (window._crmStripInlineScheduled) return;
            window._crmStripInlineScheduled = true;
            requestAnimationFrame(function() {
                window._crmStripInlineScheduled = false;
                try { removeAllInlineHandlers(); } catch (err) { console.error(err); }
            });
        }
        function initCspInlineMutationStrip() {
            if (window._crmInlineMutObs) return;
            const root = document.getElementById('app');
            if (!root || typeof MutationObserver === 'undefined') return;
            var mutT = null;
            var mo = new MutationObserver(function() {
                if (mutT) clearTimeout(mutT);
                mutT = setTimeout(function() {
                    mutT = null;
                    scheduleRemoveAllInlineHandlers();
                }, 50);
            });
            mo.observe(root, { childList: true, subtree: true });
            window._crmInlineMutObs = mo;
        }

        /* ========== Login Page Event Handlers Setup ========== */
        function setupLoginEventHandlers() {
            const bindTapSafe = function(el, handler) {
                if (!el || typeof handler !== 'function') return;
                if (el._tapSafeHandler) {
                    el.removeEventListener('click', el._tapSafeHandler);
                    el.removeEventListener('touchend', el._tapSafeHandler);
                }
                let touched = false;
                const wrapped = function(e) {
                    if (e.type === 'touchend') {
                        touched = true;
                        if (e.cancelable) e.preventDefault();
                    } else if (e.type === 'click' && touched) {
                        touched = false;
                        return;
                    }
                    handler(e);
                };
                el._tapSafeHandler = wrapped;
                el.addEventListener('touchend', wrapped, { passive: false });
                el.addEventListener('click', wrapped);
            };
            // Language buttons on login page
            const loginLangButtons = document.querySelectorAll('.login-lang button[data-lang]');
            if (loginLangButtons) {
                loginLangButtons.forEach(function(btn) {
                    bindTapSafe(btn, function() {
                        const lang = btn.getAttribute('data-lang');
                        if (lang) window.setLang(lang);
                    });
                });
            }
            
            // Login button
            const btnLogin = document.getElementById('btnLogin');
            if (btnLogin) {
                bindTapSafe(btnLogin, window.login);
            }
            
            // Forgot password link
            const linkForgot = document.getElementById('linkForgotPassword');
            if (linkForgot) {
                bindTapSafe(linkForgot, function(e) { if (e && e.preventDefault) e.preventDefault(); window.showForgotStep(); });
            }
            
            // TOTP verify button
            const btnTotpVerify = document.getElementById('btnTotpVerify');
            if (btnTotpVerify) {
                bindTapSafe(btnTotpVerify, window.verifyTotpLogin);
            }
            
            // Back to login button (from TOTP)
            const btnBackToLogin1 = document.getElementById('btnBackToLoginStep1');
            if (btnBackToLogin1) {
                bindTapSafe(btnBackToLogin1, window.backToLoginStep1);
            }
            
            // Forgot password submit button
            const btnForgotSubmit = document.getElementById('btnForgotSubmit');
            if (btnForgotSubmit) {
