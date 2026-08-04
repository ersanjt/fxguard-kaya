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
                    socket.on('main_admin_critical_alert', function(data) {
                        try {
                            playInternalChatSound();
                            const sev = (data && data.severity) || 'ALERT';
                            const title = (data && data.title) || (LANG === 'fa' ? 'هشدار سیستم' : 'System alert');
                            const body = String((data && data.body) || '').replace(/\n/g, ' ').trim();
                            const preview = body.length > 160 ? body.slice(0, 160) + '…' : body;
                            const msg = sev + ': ' + title + (preview ? ' — ' + preview : '');
                            toast(msg, 14000);
                        } catch (e) {}
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
                const notifIcon = typeof resolvePanelFaviconHref === 'function' ? resolvePanelFaviconHref(PANEL_BRANDING_STATE || {}) : '/brand/kaya-favicon-32.png';
                const n = new Notification((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + cust, { body: preview || (LANG === 'fa' ? 'پیام واتساپ' : 'WhatsApp message'), icon: notifIcon });
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
            const html = '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + linkifyMessageContent(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
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
            staffActivityAttendanceInitDone = false;
        }

        function doHeaderSearch() {
            const inp = document.getElementById('headerSearch');
            const modalInp = document.getElementById('headerSearchModalInput');
            const q = (inp && inp.value) ? inp.value.trim() : ((modalInp && modalInp.value) ? modalInp.value.trim() : '');
            if (!q) return;
            const active = document.querySelector('.nav-link.active');
            const page = active ? active.getAttribute('data-page') : '';
            const canConv = typeof canAccessSection === 'function' ? canAccessSection('conversations') : false;
            const canCust = typeof canAccessSection === 'function' ? canAccessSection('customers') : false;
            const closeModal = typeof closeHeaderSearchPopup === 'function' ? closeHeaderSearchPopup : function() {};
            if (page === 'customers' && canCust) {
                const el = document.getElementById('customerSearch');
                if (el) el.value = q;
                showPage('customers');
                if (typeof loadCustomers === 'function') loadCustomers();
                closeModal();
            } else if ((page === 'conversations' || !canCust) && canConv) {
                const el = document.getElementById('convSearch');
                if (el) el.value = q;
                showPage('conversations');
                if (typeof loadConversations === 'function') loadConversations();
                closeModal();
            } else if (canCust) {
                const el = document.getElementById('customerSearch');
                if (el) el.value = q;
                showPage('customers');
                if (typeof loadCustomers === 'function') loadCustomers();
                closeModal();
            } else {
                toast(LANG === 'en' ? 'Search is not available for your role.' : 'جستجو برای نقش شما در دسترس نیست.', true);
            }
        }

        function toast(msg, isErr) {
            const el = document.getElementById('toast');
            if (!el) return;
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

        function teardownActiveSession(redirectLogin, opts) {
            const o = opts || {};
            if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
            if (ratesInterval) { clearInterval(ratesInterval); ratesInterval = null; }
            if (tickerTimeInterval) { clearInterval(tickerTimeInterval); tickerTimeInterval = null; }
            stopStaffActivityLive();
            stopNavBadgeRefresh();
            disconnectSocket();
            persistAuthToken(null);
            currentUser = null;
            // فقط خروج صریح کاربر کوکی httpOnly را پاک کند — kick خودکار با logout
            // باعث پاک شدن کوکیِ تازهٔ ورود و حلقهٔ login↔dashboard می‌شود
            if (o.clearCookie) {
                try {
                    fetch((typeof API === 'string' ? API : '') + '/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                        cache: 'no-store'
                    }).catch(function () {});
                } catch (_e) {}
            }
            if (redirectLogin !== false) {
                if (window.LoginBootstrap && typeof window.LoginBootstrap.setLoggedOut === 'function') {
                    window.LoginBootstrap.setLoggedOut();
                } else {
                    document.documentElement.classList.remove('auth-has-token', 'auth-verifying');
                }
                const appEl = document.getElementById('app');
                if (appEl) appEl.classList.remove('show', 'app-loading', 'app-ready');
                redirectToLoginPage({ reauth: true });
            }
        }

        async function apiFetch(url, opts) {
            if (window.CRM && window.CRM.Api && typeof window.CRM.Api.fetch === 'function') {
                return window.CRM.Api.fetch(url, opts);
            }
            const opt = opts || {};
            const h = opt.auth === false ? { 'Content-Type': 'application/json' } : headers();
            if (opt.body instanceof FormData) { delete h['Content-Type']; }
            let r, text;
            let _ac = null, _to = null;
            if (opt.timeoutMs && typeof AbortController !== 'undefined') {
                _ac = new AbortController();
                _to = setTimeout(function () { try { _ac.abort(); } catch (_e) {} }, opt.timeoutMs);
            }
            try {
                r = await fetch(API + url, {
                    ...opt,
                    credentials: 'include',
                    cache: opt.cache || 'no-store',
                    headers: { Accept: 'application/json', ...h, ...opt.headers },
                    body: opt.body,
                    signal: _ac ? _ac.signal : opt.signal
                });
                text = await r.text();
            } catch (e) {
                return { ok: false, needLogin: false, timeout: !!(_ac && _ac.signal && _ac.signal.aborted), error: (LANG === 'fa' ? 'اتصال به سرور برقرار نشد. شبکه یا آدرس سرور را بررسی کنید.' : 'Could not connect to server. Check network or server address.') };
            } finally {
                if (_to) clearTimeout(_to);
            }
            if ((text || '').trim().startsWith('<')) {
                var _st = r && r.status ? r.status : 0;
                var _sample = String(text || '').slice(0, 280).toLowerCase();
                var _isCf = _sample.indexOf('cloudflare') !== -1 || _sample.indexOf('just a moment') !== -1;
                var _msg;
                if (LANG === 'fa') {
                    _msg = _isCf
                        ? 'پاسخ HTML از Cloudflare آمد. صفحه را رفرش کنید.'
                        : ('پاسخ HTML به‌جای JSON' + (_st ? ' (HTTP ' + _st + ')' : '') + '. Ctrl+Shift+R بزنید.');
                } else {
                    _msg = _isCf
                        ? 'Cloudflare returned HTML. Refresh the page.'
                        : ('Server returned HTML instead of JSON' + (_st ? ' (HTTP ' + _st + ')' : '') + '. Hard-refresh.');
                }
                try { console.warn('[apiFetch] non-JSON HTML', { url: API + url, status: _st }); } catch (_e) {}
                return { ok: false, needLogin: false, status: _st || undefined, error: _msg };
            }
            let data;
            try { data = JSON.parse(text); } catch (_) {
                return { ok: false, needLogin: false, error: (LANG === 'fa' ? 'پاسخ سرور معتبر نیست' : 'Invalid server response') };
            }
            if (r.status === 401) {
                if (!opt.softAuth) teardownActiveSession(true);
                return {
                    ok: false,
                    needLogin: !opt.softAuth,
                    softAuth: !!opt.softAuth,
                    status: 401,
                    data: data,
                    error: (data && data.error) ? data.error : (LANG === 'fa' ? 'لطفاً دوباره وارد شوید' : 'Please sign in again')
                };
            }
            if (r.status === 429) {
                return { ok: false, needLogin: false, status: 429, data: data, error: (data && data.error) || (LANG === 'fa' ? 'تعداد درخواست‌ها زیاد شده. چند ثانیه صبر کنید.' : 'Too many requests. Please wait a moment.') };
            }
            if (!r.ok && data && (data.error || data.message)) {
                var errVal = data.error || data.message;
                return { ok: false, needLogin: r.status === 401, status: r.status, data: data, error: typeof errVal === 'string' ? errVal : (errVal && errVal.message) || null };
            }
            if (!r.ok) {
                var failMsg = (r.status === 502 || r.status === 503)
                    ? (LANG === 'tr' ? 'WhatsApp Gateway hazır değil veya mesaj iletilemedi.' : (LANG === 'fa' ? 'واتساپ/Gateway آماده نیست یا پیام به واتساپ نرسید.' : 'WhatsApp Gateway not ready.'))
                    : (LANG === 'tr' ? 'Sunucu hatası (HTTP ' + (r.status || '?') + ')' : LANG === 'fa' ? 'خطای سرور (HTTP ' + (r.status || '?') + ')' : 'Server error (HTTP ' + (r.status || '?') + ')');
                return { ok: false, needLogin: r.status === 401, status: r.status, data: data, error: failMsg };
            }
            return { ok: r.ok, status: r.status, data: data };
        }
        function getApiError(res) {
            if (window.CRM && window.CRM.Api && typeof window.CRM.Api.getError === 'function') {
                return window.CRM.Api.getError(res);
            }
            if (res && typeof res.error === 'string' && res.error.trim()) return res.error;
            if (res && res.data) {
                var e = res.data.error || res.data.message;
                if (typeof e === 'string' && e.trim()) return e;
            }
            if (res && (res.status === 502 || res.status === 503)) {
                return LANG === 'tr' ? 'WhatsApp Gateway hazır değil veya mesaj iletilemedi.' : (LANG === 'fa' ? 'واتساپ/Gateway آماده نیست یا پیام ارسال نشد.' : 'WhatsApp Gateway not ready.');
            }
            return LANG === 'tr' ? ('Sunucu hatası' + (res && res.status ? ' (HTTP ' + res.status + ')' : '')) : (LANG === 'fa' ? 'خطا در ارتباط با سرور' : 'Server error');
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
            // Paint immediately from the cached user so the page is never blank,
            // then refresh from the server with a timeout so a slow/hung
            // /api/users/me request can't leave the profile stuck on empty "—"
            // placeholders (previously this awaited the request before rendering
            // anything, so a slow response showed an empty profile until the user
            // navigated to another section and back).
            if (currentUser) renderProfile(currentUser);
            const res = await apiFetch('/api/users/me', { timeoutMs: 12000 });
            const u = (res.ok && res.data) ? (currentUser = res.data) : currentUser;
            renderProfile(u);
            setupProfileEventHandlers();
            await refreshTelegramProfileSection();
        }
        function renderProfile(u) {
            if (u) {
                setUserDisplay(u);
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
                const waSenderEl = document.getElementById('profileWhatsappSenderName');
                if (waSenderEl) {
                    const waName = (u.whatsappSenderName || '').trim() || displayName;
                    waSenderEl.textContent = waName || '\u2014';
                }
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
            }
        }
        async function refreshTelegramProfileSection() {
            const statusEl = document.getElementById('telegramLinkStatus');
            const btnGen = document.getElementById('btnGenerateTelegramToken');
            const btnUnlink = document.getElementById('btnUnlinkTelegram');
            const tokenBox = document.getElementById('telegramTokenBox');
            if (!statusEl && !btnGen) return;
            const res = await apiFetch('/api/auth/telegram-status');
            if (res.needLogin) return;
            const linked = !!(res.ok && res.data && res.data.linked);
            if (statusEl) {
                statusEl.innerHTML = linked
                    ? '<span class="badge done">' + (LANG === 'fa' ? 'تلگرام متصل است' : 'Telegram linked') + '</span>'
                    : '<span class="badge pending">' + (LANG === 'fa' ? 'تلگرام متصل نیست' : 'Telegram not linked') + '</span>';
            }
            if (btnUnlink) btnUnlink.style.display = linked ? '' : 'none';
            if (btnGen) btnGen.style.display = linked ? 'none' : '';
            if (tokenBox && linked) tokenBox.style.display = 'none';
        }
        async function generateTelegramLinkToken() {
            const btn = document.getElementById('btnGenerateTelegramToken');
            if (btn) btn.disabled = true;
            try {
                const res = await apiFetch('/api/auth/telegram-link-token', { method: 'POST', body: JSON.stringify({}) });
                if (res.needLogin) return;
                if (!res.ok) {
                    toast(getApiError(res), true);
                    return;
                }
                const d = res.data || {};
                const codeEl = document.getElementById('telegramLinkTokenText');
                const tokenBox = document.getElementById('telegramTokenBox');
                const wrap = document.getElementById('telegramBotUrlWrap');
                const linkEl = document.getElementById('telegramBotUrl');
                if (codeEl) codeEl.textContent = d.token || '';
                if (tokenBox) tokenBox.style.display = d.token ? '' : 'none';
                if (wrap && linkEl) {
                    if (d.botUrl) {
                        wrap.style.display = '';
                        linkEl.href = d.botUrl;
                    } else {
                        wrap.style.display = 'none';
                    }
                }
                toast(LANG === 'fa' ? 'کد اتصال آماده است. در بات بفرستید: /link و سپس کد' : 'Code ready. In the bot send: /link then the code');
            } finally {
                if (btn) btn.disabled = false;
            }
        }
        function copyTelegramToken() {
            const codeEl = document.getElementById('telegramLinkTokenText');
            const text = (codeEl && codeEl.textContent) ? codeEl.textContent.trim() : '';
            if (!text) {
                toast(LANG === 'fa' ? 'ابتدا کد را بسازید' : 'Generate a code first', true);
                return;
            }
            const line = '/link ' + text;
            function done(ok) {
                toast(ok ? (LANG === 'fa' ? 'کپی شد (دستور کامل)' : 'Copied (full command)') : (LANG === 'fa' ? 'کپی نشد' : 'Copy failed'), !ok);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(line).then(function() { done(true); }, function() { done(false); });
            } else {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = line;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    done(true);
                } catch (e) {
                    done(false);
                }
            }
        }
        async function unlinkTelegram() {
            const msg = LANG === 'fa' ? 'قطع اتصال تلگرام از حساب؟' : 'Disconnect Telegram from your account?';
            if (typeof confirm === 'function' && !confirm(msg)) return;
            const res = await apiFetch('/api/auth/telegram-link', { method: 'DELETE' });
            if (res.needLogin) return;
            if (!res.ok) {
                toast(getApiError(res), true);
                return;
            }
            toast((res.data && res.data.message) || (LANG === 'fa' ? 'اتصال قطع شد' : 'Disconnected'));
            await refreshTelegramProfileSection();
        }
        if (typeof window !== 'undefined') {
            window.generateTelegramLinkToken = generateTelegramLinkToken;
            window.copyTelegramToken = copyTelegramToken;
            window.unlinkTelegram = unlinkTelegram;
        }
        async function uploadProfileAvatar(file) {
            const formData = new FormData();
            formData.append('file', file);
            const r = await fetch((API || '') + '/api/upload', { method: 'POST', credentials: 'include', body: formData });
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
            // کوکی همین‌الان با /logout پاک شده؛ دوباره logout نزن
            teardownActiveSession(true, { clearCookie: false });
        }

        function escapeHtml(s) { if (window.CRM && window.CRM.Utils && typeof window.CRM.Utils.escapeHtml === 'function') return window.CRM.Utils.escapeHtml(s); if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
        /** متن پیام: ابتدا escape، سپس http(s) به &lt;a&gt; امن (فقط همان پروتکل‌ها) */
        function linkifyMessageContent(raw) {
            if (raw == null || raw === '') return '';
            const s = String(raw);
            const re = /https?:\/\/[^\s<>'"]+/gi;
            let out = '';
            let last = 0;
            let m;
            while ((m = re.exec(s)) !== null) {
                const chunk = m[0];
                out += escapeHtml(s.slice(last, m.index));
                let core = chunk;
                let href = '';
                for (let tries = 0; tries < 8 && core.length >= 8; tries++) {
                    try {
                        const u = new URL(core);
                        if (u.protocol === 'http:' || u.protocol === 'https:') {
                            href = u.href;
                            break;
                        }
                    } catch (_e) { /* shrink */ }
                    core = core.slice(0, -1);
                }
                if (!href) {
                    out += escapeHtml(chunk);
                } else {
                    const tail = chunk.slice(core.length);
                    out += '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer" class="msg-text-link">' + escapeHtml(core) + '</a>' + escapeHtml(tail);
                }
                last = m.index + chunk.length;
            }
            out += escapeHtml(s.slice(last));
            return out;
        }
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
        function profilePicShowsImage(url, customerId) {
            if (customerId) return true;
            if (!url || typeof url !== 'string') return false;
            var n = normalizeProfilePicUrl(url);
            return !!n && (/^https?:\/\//i.test(n) || n.indexOf('data:') === 0 || n.indexOf('/api/customers/') === 0);
        }
        function isLocalUploadAvatarPath(url) {
            if (!url || typeof url !== 'string') return false;
            var u = url.trim();
            return u.indexOf('/uploads/') === 0 || u.indexOf('uploads/') === 0;
        }
        /** آواتار مشتری — فایل محلی یا API سرور (واکشی از واتساپ) */
        function customerAvatarDisplaySrc(customerOrPic, customerId) {
            var cust = (customerOrPic && typeof customerOrPic === 'object') ? customerOrPic : null;
            var raw = cust ? String(cust.profilePic || '').trim() : String(customerOrPic || '').trim();
            var id = (cust && cust.id) ? cust.id : customerId;
            if (raw && isLocalUploadAvatarPath(raw)) {
                var localSrc = profilePicDisplaySrc(raw);
                if (localSrc) return localSrc;
            }
            if (id) return '/api/customers/' + encodeURIComponent(String(id)) + '/avatar';
            if (raw) return profilePicDisplaySrc(raw);
            return '';
        }
        function customerAvatarShowsImage(customerOrPic, customerId) {
            return !!customerAvatarDisplaySrc(customerOrPic, customerId);
        }
        /** میزبان‌های CDN پروفایل (واتساپ/متا/…) — بارگذاری از طریق پروکسی API تا مرورگر مسدود نشود */
        var PROFILE_PIC_PROXY_SUFFIXES = ['whatsapp.net', 'fbcdn.net', 'facebook.com', 'instagram.com', 'cdninstagram.com', 'googleusercontent.com'];
        function profilePicHostNeedsProxy(hostname) {
            if (!hostname || typeof hostname !== 'string') return false;
            var h = hostname.toLowerCase();
            for (var i = 0; i < PROFILE_PIC_PROXY_SUFFIXES.length; i++) {
                var s = PROFILE_PIC_PROXY_SUFFIXES[i];
                if (h === s || h.endsWith('.' + s)) return true;
            }
            return false;
        }
        /** URL نهایی برای src تصویر (همان‌origin و data بدون تغییر؛ CDNهای پروفایل → /api/profile-image) */
        function profilePicDisplaySrc(rawUrl) {
            if (!rawUrl || typeof rawUrl !== 'string') return '';
            if (!profilePicShowsImage(rawUrl)) return '';
            var n = normalizeProfilePicUrl(rawUrl);
            if (!n) return '';
            if (n.indexOf('data:') === 0) return n;
            try {
                var parsed = new URL(n);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return n;
                var pageHost = '';
                try { pageHost = (window.location && window.location.hostname) ? String(window.location.hostname) : ''; } catch (_e2) {}
                if (pageHost && parsed.hostname.toLowerCase() === pageHost.toLowerCase()) return n;
                if (profilePicHostNeedsProxy(parsed.hostname)) {
                    return '/api/profile-image?url=' + encodeURIComponent(n);
                }
            } catch (_e) {}
            return n;
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
        /** وقتی پروکسی /api/profile-image به‌جای خطا PNG ۱×۱ برمی‌گرداند، حرف اول را نشان بده */
        function crmAvatarImgLoaded(img) {
            try {
                if (!img) return;
                var s = String(img.currentSrc || img.src || '');
                if (s.indexOf('/api/profile-image') === -1 && s.indexOf('/api/customers/') === -1) return;
                if (img.naturalWidth <= 1 && img.naturalHeight <= 1) crmAvatarImgErr(img);
            } catch (_e) {}
        }
        window.crmAvatarImgLoaded = crmAvatarImgLoaded;
        function resolveAvatarUrl(avatar) {
            if (!avatar) return '';
            return profilePicDisplaySrc(avatar) || normalizeProfilePicUrl(avatar);
        }
        function internalMsgAvatarHtml(fromUser, extraClass) {
            const u = fromUser || {};
            var dedicated = (u.whatsappSenderName || '').trim();
            var parts = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
            const name = dedicated || parts || (u.name || u.username || u.email || '').trim();
            const initial = name[0] ? name[0].toUpperCase() : '?';
            const cls = 'msg-avatar' + (extraClass ? ' ' + extraClass : '');
            const rawAv = (u.avatar || '').trim();
            const pic = rawAv ? resolveAvatarUrl(rawAv) : '';
            if (pic && profilePicShowsImage(rawAv)) {
                return '<span class="' + cls + '"><span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)"></span>';
            }
            return '<span class="' + cls + '"><span class="avatar-fallback">' + escapeHtml(initial) + '</span></span>';
        }
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
        function dashFormatNum(v) {
            var num = (v != null && typeof v === 'number') ? v : parseFloat(v);
            if (isNaN(num)) num = 0;
            var lang = (typeof window !== 'undefined' && window.LANG) || (typeof LANG !== 'undefined' ? LANG : 'fa');
            if (lang !== 'fa') {
                return Math.round(num) === num ? Math.round(num).toLocaleString('en-US') : Number(num).toLocaleString('en-US', { maximumFractionDigits: 1 });
            }
            if (typeof formatPrice === 'function') return formatPrice(num);
            return String(num).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
        }
        function refreshDashboardUiAfterLang() {
            try {
                if (typeof loadDashboard === 'function') loadDashboard();
                if (typeof fetchRates === 'function') fetchRates();
                if (typeof loadCustomers === 'function') {
                    var custPage = document.getElementById('pageCustomers');
                    if (custPage && custPage.classList.contains('show')) loadCustomers();
                }
                if (typeof loadServicesPage === 'function') {
                    var svcPage = document.getElementById('pageServices');
                    if (svcPage && svcPage.classList.contains('show')) loadServicesPage();
                }
            } catch (_e) { /* ignore */ }
        }
        window.refreshDashboardUiAfterLang = refreshDashboardUiAfterLang;
        function dashboardSummarySkeleton(count) {
            var n = count || 4;
            var html = '';
            for (var i = 0; i < n; i++) html += '<div class="dashboard-stat-box dashboard-stat-skeleton loading-skeleton" aria-hidden="true"></div>';
            return html;
        }
        function renderDashboardStatBox(item, primary) {
            var cls = 'dashboard-stat-box' + (item.warn ? ' warn' : '') + (primary ? ' dashboard-stat-box--primary' : '');
            var convTab = item.convTab ? (' data-conv-tab="' + escapeHtml(item.convTab) + '"') : '';
            return '<a href="#' + escapeHtml(item.page) + '" class="' + cls + '" data-dashboard-page="' + escapeHtml(item.page) + '"' + convTab + '><span class="stat-number">' + escapeHtml(String(item.num)) + '</span><span class="stat-label">' + escapeHtml(item.label) + '</span></a>';
        }
        let _loadDashboardSeq = 0;
        async function loadDashboard(_attempt) {
            const container = document.getElementById('dashboardCards');
            const summaryEl = document.getElementById('dashboardSummary');
            const kpiPrimaryEl = document.getElementById('dashboardKpiPrimary');
            const quickEl = document.getElementById('dashboardQuickActions');
            const attentionEl = document.getElementById('dashboardAttention');
            const cardsTitleEl = document.getElementById('dashboardCardsTitle');
            const lastUpdatedEl = document.getElementById('dashboardLastUpdated');
            if (!container) return;
            const seq = ++_loadDashboardSeq;
            if (!currentUser || !currentUser.id) {
                if ((_attempt || 0) < 20) {
                    setTimeout(function () { if (seq === _loadDashboardSeq) loadDashboard((_attempt || 0) + 1); }, 500);
                }
                return;
            }
            const can = (typeof canAccessSection === 'function')
                ? canAccessSection
                : function(section) {
                    if (section === 'profile' || section === 'dashboard') return true;
                    const key = section === 'rates_charts' ? 'rates' : section;
                    const perms = (currentUser && currentUser.permissions) || {};
                    return perms[key] === true;
                };
            const n = function(v) { return (v != null && typeof v === 'number') ? v : 0; };
            const CARD_DEFS = [
                { page: 'conversations', section: 'conversations', title: t('nav_conversations'), icon: 'icon-chat', statKey: 'unreadConversations', statAltKey: 'openConversations', statSuffix: t('dashboard_stat_unread'), statAltSuffix: t('filter_open'), badgeWarn: true },
                { page: 'customers', section: 'customers', title: t('nav_customers'), icon: 'icon-users', statKey: 'totalCustomers', statSuffix: t('nav_customers').toLowerCase() },
                { page: 'tickets', section: 'tickets', title: t('nav_tickets'), icon: 'icon-ticket', statKey: 'ticketsOpen', statSuffix: t('status_open').toLowerCase() },
                { page: 'tasks', section: 'tasks', title: t('nav_tasks'), icon: 'icon-task', statKey: 'tasksPending', statSuffix: t('status_pending').toLowerCase() },
                { page: 'announcements', section: 'announcements', title: t('nav_announcements'), icon: 'icon-megaphone', statKey: 'announcementsCount', statSuffix: t('nav_announcements').toLowerCase() },
                { page: 'departments', section: 'departments', title: t('nav_departments'), icon: 'icon-building' },
                { page: 'users', section: 'users', title: t('nav_users'), icon: 'icon-user' },
                { page: 'branches', section: 'branches', title: t('nav_branches'), icon: 'icon-building-2' },
                { page: 'processes', section: 'processes', title: t('nav_processes'), icon: 'icon-expand' },
                { page: 'whatsapp', section: 'whatsapp', title: t('nav_whatsapp'), icon: 'icon-phone' },
                { page: 'message-templates', section: 'conversations', title: t('nav_message_templates'), icon: 'icon-file-plus' },
                { page: 'rates', section: 'rates', title: t('nav_rates'), icon: 'icon-chart' },
                { page: 'rates-charts', section: 'rates', title: t('nav_rates_charts'), icon: 'icon-trending-up' },
                { page: 'services', section: 'services', title: t('nav_services'), icon: 'icon-file-plus' },
                { page: 'profile', section: 'profile', title: t('nav_profile'), icon: 'icon-user' },
                { page: 'internal-chat', section: 'internal_chat', title: t('nav_internal_chat'), icon: 'icon-chat' },
                { page: 'supervision', section: 'supervision', title: t('nav_supervision'), icon: 'icon-chart' },
                { page: 'staff-activity', section: 'staff_activity', title: t('nav_staff_activity'), icon: 'icon-user-online' },
                { page: 'panel-settings', section: 'panel_settings', title: t('nav_panel_settings'), icon: 'icon-settings' }
            ];
            const CARD_GROUPS = [
                { key: 'communications', titleKey: 'dashboard_group_communications', pages: ['conversations', 'customers', 'tickets', 'internal-chat', 'whatsapp', 'message-templates'] },
                { key: 'organization', titleKey: 'dashboard_group_organization', pages: ['tasks', 'processes', 'users', 'departments', 'branches'] },
                { key: 'finance', titleKey: 'dashboard_group_finance', pages: ['rates', 'rates-charts', 'services'] },
                { key: 'monitoring', titleKey: 'dashboard_group_monitoring', pages: ['supervision', 'staff-activity', 'announcements'] },
                { key: 'account', titleKey: 'dashboard_group_account', pages: ['profile', 'panel-settings'] }
            ];
            function cardStatText(c, stats) {
                stats = stats || {};
                if (!c.statKey) return null;
                if (c.statKey === 'unreadConversations' && n(stats.unreadConversations) > 0) {
                    return dashFormatNum(stats.unreadConversations) + ' ' + c.statSuffix;
                }
                if (c.statAltKey && stats[c.statAltKey] != null) {
                    return dashFormatNum(stats[c.statAltKey]) + ' ' + (c.statAltSuffix || '');
                }
                if (stats[c.statKey] != null) {
                    return dashFormatNum(stats[c.statKey]) + ' ' + (c.statSuffix || '');
                }
                return null;
            }
            const paintCards = function(stats) {
                stats = stats || {};
                const defByPage = {};
                CARD_DEFS.forEach(function(c) { defByPage[c.page] = c; });
                let html = '';
                CARD_GROUPS.forEach(function(grp) {
                    let groupHtml = '';
                    grp.pages.forEach(function(page) {
                        const c = defByPage[page];
                        if (!c || !can(c.section)) return;
                        const stat = cardStatText(c, stats);
                        const badgeWarn = c.badgeWarn && c.statKey === 'unreadConversations' && n(stats.unreadConversations) > 0;
                        const badge = stat ? ('<span class="card-badge' + (badgeWarn ? ' warn' : '') + '">' + escapeHtml(stat) + '</span>') : '';
                        groupHtml += '<a href="#' + escapeHtml(c.page) + '" class="dashboard-card" data-page="' + escapeHtml(c.page) + '"><div class="card-icon"><svg viewBox="0 0 24 24"><use href="#' + c.icon + '"/></svg></div><div class="card-title">' + escapeHtml(c.title) + '</div>' + (stat ? '<p class="card-meta">' + escapeHtml(stat) + '</p>' : '') + badge + '</a>';
                    });
                    if (groupHtml) {
                        html += '<section class="dashboard-card-group"><h4 class="dashboard-group-title" data-i18n="' + grp.titleKey + '">' + t(grp.titleKey) + '</h4><div class="dashboard-cards-in-group">' + groupHtml + '</div></section>';
                    }
                });
                container.innerHTML = html || ('<div class="empty">' + (LANG === 'fa' ? 'دسترسی به بخشی وجود ندارد.' : t('no_data')) + '</div>');
                if (cardsTitleEl) cardsTitleEl.style.display = html ? '' : 'none';
            };
            if (kpiPrimaryEl) kpiPrimaryEl.innerHTML = can('conversations') ? dashboardSummarySkeleton(4) : '';
            if (summaryEl) summaryEl.innerHTML = dashboardSummarySkeleton(6);
            if (!container.querySelector('.dashboard-card')) paintCards({});
            let res;
            try {
                res = await apiFetch('/api/analytics/dashboard', { timeoutMs: 15000 });
            } catch (e) {
                if (seq !== _loadDashboardSeq) return;
                if (summaryEl) summaryEl.innerHTML = '<div class="dashboard-load-error empty">' + t('loading_err') + '</div>';
                if (kpiPrimaryEl) kpiPrimaryEl.innerHTML = '';
                setDashboardError(container, cardsTitleEl, t('loading_err'));
                return;
            }
            if (seq !== _loadDashboardSeq) return;
            if (res.needLogin) return;
            if (!res.ok) {
                var errMsg = (res.data && res.data.error) ? res.data.error : t('loading_err');
                if (summaryEl) summaryEl.innerHTML = '<div class="dashboard-load-error empty">' + escapeHtml(errMsg) + '</div>';
                if (kpiPrimaryEl) kpiPrimaryEl.innerHTML = '';
                setDashboardError(container, cardsTitleEl, errMsg);
                return;
            }
            const stats = res.data || {};
            if (lastUpdatedEl) {
                var now = new Date();
                var timeStr = typeof fmtTZ === 'function' ? fmtTZ(now, 'time') : now.toLocaleTimeString();
                lastUpdatedEl.textContent = (t('dashboard_updated_at') || '') + ' ' + timeStr;
            }
            if (attentionEl) { attentionEl.innerHTML = ''; attentionEl.style.display = 'none'; }
            if (quickEl) quickEl.innerHTML = '';
            if (attentionEl && (n(stats.unreadConversations) > 0 || n(stats.unansweredConversations) > 0 || n(stats.unassignedConversations) > 0 || n(stats.tasksPending) > 0 || n(stats.unreadAnnouncements) > 0)) {
                const parts = [];
                if (can('conversations') && n(stats.unreadConversations) > 0) parts.push('<a href="#conversations" class="dashboard-attention-link" data-dashboard-page="conversations" data-conv-tab="unread">' + dashFormatNum(stats.unreadConversations) + ' ' + t('dashboard_stat_unread') + '</a>');
                if (can('conversations') && n(stats.unansweredConversations) > 0) parts.push('<a href="#conversations" class="dashboard-attention-link" data-dashboard-page="conversations" data-conv-tab="unanswered">' + dashFormatNum(stats.unansweredConversations) + ' ' + t('dashboard_stat_unanswered') + '</a>');
                if (can('conversations') && n(stats.unassignedConversations) > 0) parts.push('<a href="#conversations" class="dashboard-attention-link" data-dashboard-page="conversations" data-conv-tab="unassigned">' + dashFormatNum(stats.unassignedConversations) + ' ' + t('dashboard_stat_unassigned') + '</a>');
                if (can('tasks') && n(stats.tasksPending) > 0) parts.push('<a href="#tasks" class="dashboard-attention-link" data-dashboard-page="tasks">' + dashFormatNum(stats.tasksPending) + ' ' + t('dashboard_stat_tasks') + '</a>');
                if (can('announcements') && n(stats.unreadAnnouncements) > 0) parts.push('<a href="#announcements" class="dashboard-attention-link" data-dashboard-page="announcements">' + dashFormatNum(stats.unreadAnnouncements) + ' ' + t('dashboard_stat_announcements') + '</a>');
                if (parts.length) {
                    const needsLabel = (t('dashboard_needs_attention') || (LANG === 'fa' ? 'نیاز به توجه: ' : 'Needs attention: ')) + ' ';
                    attentionEl.innerHTML = needsLabel + parts.join(' · ');
                    attentionEl.style.display = 'block';
                }
            }
            if (kpiPrimaryEl && can('conversations')) {
                const primaryItems = [
                    { page: 'conversations', num: dashFormatNum(n(stats.openConversations)), label: t('dashboard_stat_conversations'), warn: n(stats.unreadConversations) > 0, convTab: 'open' },
                    { page: 'conversations', num: dashFormatNum(n(stats.unreadConversations)), label: t('dashboard_stat_unread'), warn: n(stats.unreadConversations) > 0, convTab: 'unread' },
                    { page: 'conversations', num: dashFormatNum(n(stats.unansweredConversations)), label: t('dashboard_stat_unanswered'), warn: n(stats.unansweredConversations) > 0, convTab: 'unanswered' },
                    { page: 'conversations', num: dashFormatNum(n(stats.unassignedConversations)), label: t('dashboard_stat_unassigned'), warn: n(stats.unassignedConversations) > 0, convTab: 'unassigned' }
                ];
                kpiPrimaryEl.innerHTML = primaryItems.map(function(item) { return renderDashboardStatBox(item, true); }).join('');
            } else if (kpiPrimaryEl) kpiPrimaryEl.innerHTML = '';
            if (summaryEl) {
                const summaryItems = [];
                if (can('conversations')) summaryItems.push({ page: 'conversations', num: dashFormatNum(n(stats.todayMessages)), label: t('dashboard_stat_messages_today'), convTab: 'all' });
                if (can('tickets')) summaryItems.push({ page: 'tickets', num: dashFormatNum(n(stats.ticketsOpen)), label: t('dashboard_stat_tickets') });
                if (can('tasks')) summaryItems.push({ page: 'tasks', num: dashFormatNum(n(stats.tasksPending)), label: t('dashboard_stat_tasks'), warn: n(stats.tasksPending) > 0 });
                if (can('customers')) summaryItems.push({ page: 'customers', num: dashFormatNum(n(stats.totalCustomers)), label: t('dashboard_stat_customers') });
                if (can('staff_activity')) {
                    summaryItems.push({ page: 'staff-activity', num: dashFormatNum(n(stats.staffOnline)), label: t('dashboard_stat_online') });
                    summaryItems.push({ page: 'staff-activity', num: dashFormatNum(n(stats.loginsToday)), label: t('dashboard_stat_logins_today') });
                }
                if (stats.avgResponseTimeMinutes != null && can('conversations')) summaryItems.push({ page: 'conversations', num: dashFormatNum(stats.avgResponseTimeMinutes) + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min'), label: (LANG === 'fa' ? 'میانگین زمان پاسخ' : 'Avg response time'), convTab: 'all' });
                if (stats.avgRating != null && can('conversations')) summaryItems.push({ page: 'conversations', num: dashFormatNum(stats.avgRating) + '/5', label: (LANG === 'fa' ? 'نرخ رضایت' : 'Satisfaction') + (stats.ratedConversationsCount ? ' (' + dashFormatNum(stats.ratedConversationsCount) + ')' : ''), convTab: 'all' });
                if (can('announcements') && n(stats.unreadAnnouncements) > 0) summaryItems.push({ page: 'announcements', num: dashFormatNum(n(stats.unreadAnnouncements)), label: t('dashboard_stat_announcements'), warn: true });
                summaryEl.innerHTML = summaryItems.map(function(item) { return renderDashboardStatBox(item, false); }).join('') || '<div class="dashboard-summary-empty text-muted">' + (LANG === 'fa' ? 'آمار دیگری برای نمایش نیست.' : 'No additional stats.') + '</div>';
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
            paintCards(stats);
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
            const users = (res.data && res.data.users) || [];
            const departments = (res.data && res.data.departments) || [];
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

        /* ========== Kaya CRM chunk-02 | login، apiFetch، delegated handlers | docs/CODEBASE-MAP.md ========== */
        /* ========== Global Delegated Event Handler for Dynamic Content ========== */
        function setupGlobalDelegatedHandlers() {
            if (window._crmDelegatedHandlersBound) return;
            window._crmDelegatedHandlersBound = true;
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
                    var _statPage = dashStat.getAttribute('data-dashboard-page') || '';
                    var _statConvTab = dashStat.getAttribute('data-conv-tab');
                    showPage(_statPage);
                    if (_statConvTab && _statPage === 'conversations' && typeof setConvQuickTab === 'function') {
                        setTimeout(function() { setConvQuickTab(_statConvTab); }, 0);
                    }
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
                if (target.closest('#btnCopyWhatsappWebhook') && typeof copyWhatsappWebhookUrl === 'function') { e.preventDefault(); e.stopPropagation(); copyWhatsappWebhookUrl(); return; }
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
                const msgForwardBtn = target.closest('.msg-forward-btn[data-msg-id]');
                if (msgForwardBtn && typeof openForwardMsgModal === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    openForwardMsgModal(msgForwardBtn.getAttribute('data-msg-id') || '', msgForwardBtn.getAttribute('data-preview') || '');
                    return;
                }
                const forwardCust = target.closest('.forward-customer-item[data-forward-customer-id]');
                if (forwardCust && typeof forwardMessageToCustomer === 'function') {
                    e.preventDefault();
                    e.stopPropagation();
                    forwardMessageToCustomer(forwardCust.getAttribute('data-forward-customer-id') || '', forwardCust.getAttribute('data-forward-customer-name') || '');
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
                if (target.closest('#internalChatManageBtn') && typeof showInternalThreadManageModal === 'function') { e.preventDefault(); e.stopPropagation(); showInternalThreadManageModal(); return; }
                if (target.closest('#btnInternalRenameThread') && typeof renameInternalThread === 'function') { e.preventDefault(); e.stopPropagation(); renameInternalThread(); return; }
                if (target.closest('#btnInternalAddMembers') && typeof addInternalThreadMembers === 'function') { e.preventDefault(); e.stopPropagation(); addInternalThreadMembers(); return; }
                if (target.closest('#btnInternalLeaveThread') && typeof leaveInternalThread === 'function') { e.preventDefault(); e.stopPropagation(); leaveInternalThread(); return; }
                const removeMemberBtn = target.closest('.internal-thread-remove-member[data-user-id]');
                if (removeMemberBtn && typeof removeInternalThreadMember === 'function') { e.preventDefault(); e.stopPropagation(); removeInternalThreadMember(removeMemberBtn.getAttribute('data-user-id')); return; }
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
                        if (typeof setChatTemplateDropdownOpen === 'function') setChatTemplateDropdownOpen(false);
                        else if (typeof closeWaTemplateDropdown === 'function') closeWaTemplateDropdown();
                        apiFetch('/api/file-templates/' + fid + '/use', { method: 'POST' }).catch(function(){});
                        apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: '', media: { url: furl, filename: fname, mimetype: fmime } }) }).then(function(r) { if (!r.ok) toast((r.data && r.data.error) || t('err_generic'), true); });
                    }
                    return;
                }
                const tplItem = target.closest('.chat-template-dropdown-item[data-id]');
                if (tplItem && tplItem.hasAttribute('data-content')) {
                    var tid = tplItem.getAttribute('data-id');
                    const c = typeof unescapeFromDataAttr === 'function' ? unescapeFromDataAttr(tplItem.getAttribute('data-content') || '') : (tplItem.getAttribute('data-content') || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    if (typeof insertTemplateIntoChat === 'function') {
                        e.preventDefault(); e.stopPropagation();
                        insertTemplateIntoChat(c, tid);
                        if (typeof setChatTemplateDropdownOpen === 'function') setChatTemplateDropdownOpen(false);
                        else if (typeof closeWaTemplateDropdown === 'function') closeWaTemplateDropdown();
                    }
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
                // msgInput Enter → فقط در chunk-03 روی خود input بایند شده (اینجا دوباره sendMsg نزن)
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

        /* Auth UI lives on /login only — dashboard binds accessibility helpers only */
        function setupLoginEventHandlers() {
            const skipLink = document.getElementById('skipLink');
            if (skipLink && !skipLink._crmSkipBound) {
                skipLink._crmSkipBound = true;
                skipLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    const m = document.getElementById('mainContent');
                    if (m) m.focus();
                });
            }
        }
