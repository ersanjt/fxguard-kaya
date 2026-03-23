            if (!waAlive()) return;
            if (res.needLogin) return;
            const data = res.data;
            if (data && data.error) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_gateway_off');
                setWhatsappStatusBadge('disconnected');
                if (btn) { btn.style.display = 'inline-block'; btn.textContent = t('whatsapp_start_btn'); }
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                return;
            }
            if (!waAlive()) return;
            st.className = 'whatsapp-status-line';
            const phase = data && data.phase;
            var isCloudApi = !!(data && data.cloudApi);
            const statusLabel = data && data.whatsapp ? (isCloudApi ? t('whatsapp_cloud_api_connected') : t('whatsapp_connected')) : (phase === 'authenticated' ? t('whatsapp_syncing') : (data && data.starting ? (LANG === 'fa' ? 'در حال اتصال...' : 'Connecting...') : t('whatsapp_disconnected')));
            const statusText = t('whatsapp_status') + ' ' + statusLabel + (isCloudApi ? '' : (' | ' + t('redis') + ': ' + (data && data.redis ? t('active') : t('inactive'))));
            st.textContent = statusText;
            const authFailureEl = document.getElementById('whatsappAuthFailure');
            if (authFailureEl) {
                if (data && data.authFailure) {
                    authFailureEl.style.display = 'block';
                    authFailureEl.textContent = (LANG === 'fa' ? 'خطای احراز هویت: ' : 'Auth error: ') + data.authFailure;
                } else {
                    authFailureEl.style.display = 'none';
                    authFailureEl.textContent = '';
                }
            }
            if (data && data.whatsapp) {
                var isCloudApi = !!(data && data.cloudApi);
                isWhatsappPolling = false;
                setWhatsappStatusBadge('connected');
                qrBox.style.display = 'none';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                if (authFailureEl) authFailureEl.style.display = 'none';
                if (btnDisconnect) {
                    if (isCloudApi) {
                        btnDisconnect.style.display = 'none';
                    } else {
                        btnDisconnect.style.display = 'inline-flex';
                        btnDisconnect.textContent = t('whatsapp_disconnect_btn');
                        btnDisconnect.disabled = false;
                    }
                }
                const openWebBtn = document.querySelector('.whatsapp-actions a[href="https://web.whatsapp.com"]');
                if (openWebBtn) openWebBtn.style.display = isCloudApi ? 'none' : 'inline-flex';
                if (btn) btn.style.display = 'none';
                if (btnStartClient) btnStartClient.style.display = 'none';
                if (lastCard) {
                    lastCard.style.display = 'block';
                    const lastStatus = document.getElementById('whatsappLastStatus');
                    const lastNumber = document.getElementById('whatsappLastNumber');
                    const lastResult = document.getElementById('whatsappLastResult');
                    if (lastStatus) lastStatus.textContent = isCloudApi ? t('whatsapp_cloud_api_connected') : t('whatsapp_connected');
                    if (lastNumber) lastNumber.textContent = (data.number || data.pushname) || '—';
                    if (lastResult) lastResult.textContent = LANG === 'fa' ? 'موفق' : 'Success';
                    const cloudApiInfo = document.getElementById('whatsappCloudApiInfo');
                    if (cloudApiInfo) {
                        cloudApiInfo.textContent = t('whatsapp_cloud_api_info');
                        cloudApiInfo.style.display = isCloudApi ? 'block' : 'none';
                    }
                }
                if (waAlive()) { loadWhatsappDeptRouting(); loadWhatsappUnassigned(); }
                return;
            }
            if (!waAlive()) return;
            setWhatsappStatusBadge(data && data.starting ? 'starting' : 'disconnected');
            if (lastCard) lastCard.style.display = 'none';
            if (btnDisconnect) { btnDisconnect.disabled = true; btnDisconnect.style.display = 'inline-flex'; }
            const openWebBtnEl = document.querySelector('.whatsapp-actions a[href="https://web.whatsapp.com"]');
            if (openWebBtnEl) openWebBtnEl.style.display = 'inline-flex';
            const cloudApiInfoEl = document.getElementById('whatsappCloudApiInfo');
            if (cloudApiInfoEl) cloudApiInfoEl.style.display = 'none';
            if (waAlive()) loadWhatsappDeptRouting();
            const qrRes = await apiFetch('/api/gateway/qr');
            if (!waAlive()) return;
            if (qrRes.needLogin) return;
            const qrData = qrRes.data;
            if (qrData && qrData.qr) {
                qrImg.src = qrData.qr;
                qrBox.style.display = 'block';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (phase === 'authenticated' && qrWaitingMsg) { qrWaitingMsg.style.display = 'block'; qrWaitingMsg.textContent = t('whatsapp_syncing'); } else if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                isWhatsappPolling = true;
                const pollMs = 1500;
                qrRefreshInterval = setInterval(function() { loadWhatsappStatus(false); }, pollMs);
            } else {
                qrBox.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                if (data && data.starting) {
                    if (btnStartClient) btnStartClient.style.display = 'none';
                    if (qrUnavailable) {
                        qrUnavailable.style.display = 'block';
                        qrUnavailable.textContent = LANG === 'fa' ? 'در حال آماده‌سازی QR... لطفاً صبر کنید.' : 'Preparing QR code... Please wait.';
                    }
                    qrRetryTimeout = setTimeout(function() { loadWhatsappStatus(false); }, WHATSAPP_QR_RETRY_MS);
                } else {
                    if (btnStartClient) { btnStartClient.style.display = 'inline-block'; btnStartClient.textContent = t('whatsapp_start_client_btn'); }
                    if (qrUnavailable) qrUnavailable.style.display = 'none';
                }
            }
        }

        var _whatsappBurstT = [];
        function clearWhatsappStatusBurst() {
            _whatsappBurstT.forEach(function(id) { try { clearTimeout(id); } catch (_e) {} });
            _whatsappBurstT = [];
        }
        /** بعد از شروع/قطع واتساپ چند بار سریع وضعیت را می‌گیرد تا UI زود به‌روز شود */
        function scheduleWhatsappStatusBurst() {
            clearWhatsappStatusBurst();
            [400, 1200, 2800, 5500, 10000, 18000].forEach(function(ms) {
                _whatsappBurstT.push(setTimeout(function() { loadWhatsappStatus(false); }, ms));
            });
        }

        async function startGateway() {
            const res = await apiFetch('/api/admin/start-gateway', { method: 'POST' });
            if (res.needLogin) return;
            const msg = (res.data && (res.data.message || res.data.error)) || t('done_msg');
            toast(msg);
            if (res.ok) scheduleWhatsappStatusBurst();
        }
        async function startWhatsAppClient() {
            const res = await apiFetch('/api/gateway/start', { method: 'POST' });
            if (res.needLogin) return;
            const msg = (res.data && (res.data.message || res.data.error)) || t('done_msg');
            toast(msg);
            if (res.ok) scheduleWhatsappStatusBurst();
        }
        async function disconnectWhatsApp() {
            const btnDisconnect = document.getElementById('btnDisconnectWhatsApp');
            if (btnDisconnect && btnDisconnect.disabled) return;
            if (btnDisconnect) btnDisconnect.disabled = true;
            toast(LANG === 'fa' ? 'در حال خروج و حذف سشن واتساپ...' : 'Logging out and clearing session...');
            try {
                const res = await apiFetch('/api/gateway/logout', { method: 'POST', body: JSON.stringify({}) });
                if (res.needLogin) { if (btnDisconnect) btnDisconnect.disabled = false; return; }
                if (!res.ok) {
                    toast((res.data && res.data.error) || res.error || t('err_generic'), true);
                    if (btnDisconnect) btnDisconnect.disabled = false;
                    return;
                }
                toast(LANG === 'fa' ? 'در حال ایجاد QR جدید...' : 'Generating new QR code...');
                setWhatsappStatusBadge('starting');
                const startRes = await apiFetch('/api/gateway/start', { method: 'POST' });
                if (startRes.ok) {
                    toast(LANG === 'fa' ? 'QR جدید در حال آماده‌سازی... لطفاً چند ثانیه صبر کنید.' : 'New QR code loading... Please wait a few seconds.');
                } else {
                    toast(LANG === 'fa' ? 'خطا در شروع مجدد واتساپ' : 'Error restarting WhatsApp', true);
                    if (btnDisconnect) btnDisconnect.disabled = false;
                }
                scheduleWhatsappStatusBurst();
            } catch (e) {
                toast((e && e.message) || t('err_generic'), true);
                if (btnDisconnect) btnDisconnect.disabled = false;
            }
        }
        function switchWhatsappConnectionTab(tab) {
            document.querySelectorAll('.whatsapp-conn-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
            var cloud = document.getElementById('whatsappCloudSettings');
            var gw = document.getElementById('whatsappGatewaySettings');
            if (cloud) cloud.style.display = tab === 'cloud' ? 'block' : 'none';
            if (cloud) cloud.classList.toggle('active', tab === 'cloud');
            if (gw) gw.style.display = tab === 'gateway' ? 'block' : 'none';
            if (gw) gw.classList.toggle('active', tab === 'gateway');
        }
        async function loadWhatsappConnectionSettings() {
            var res = await apiFetch('/api/whatsapp/connection');
            if (res.needLogin) return;
            var d = res.ok && res.data ? res.data : {};
            var mode = document.getElementById('whatsappConnectionMode');
            var cloudEn = document.getElementById('whatsappCloudEnabled');
            var cloudToken = document.getElementById('whatsappCloudAccessToken');
            var cloudPhone = document.getElementById('whatsappCloudPhoneNumberId');
            var cloudVerify = document.getElementById('whatsappCloudVerifyToken');
            var gwEn = document.getElementById('whatsappGatewayEnabled');
            var gwUrl = document.getElementById('whatsappGatewayUrl');
            var gwSecret = document.getElementById('whatsappGatewayApiSecret');
            if (mode) mode.value = d.connectionMode || 'cloud_first';
            if (cloudEn) cloudEn.checked = d.cloudEnabled !== false;
            if (cloudToken) { cloudToken.value = ''; cloudToken.placeholder = d.cloudAccessTokenSet ? (LANG === 'fa' ? 'کلید ذخیره شده ✓ — برای تغییر وارد کنید' : 'Saved ✓ — Enter to change') : 'EAAxxx...'; }
            if (cloudPhone) cloudPhone.value = d.cloudPhoneNumberId || '';
            if (cloudVerify) cloudVerify.value = d.cloudVerifyToken || '';
            if (gwEn) gwEn.checked = d.gatewayEnabled !== false;
            if (gwUrl) gwUrl.value = d.gatewayUrl || '';
            if (gwSecret) { gwSecret.value = ''; gwSecret.placeholder = d.gatewayApiSecretSet ? (LANG === 'fa' ? 'ذخیره شده ✓' : 'Saved ✓') : (LANG === 'fa' ? 'اختیاری' : 'Optional'); }
        }
        async function saveWhatsappConnectionSettings() {
            var saveBtn = document.getElementById('btnSaveWhatsappConnection');
            waBtnLoading(saveBtn, true);
            var cloudToken = document.getElementById('whatsappCloudAccessToken');
            var cloudPhone = document.getElementById('whatsappCloudPhoneNumberId');
            var cloudVerify = document.getElementById('whatsappCloudVerifyToken');
            var gwUrl = document.getElementById('whatsappGatewayUrl');
            var gwSecret = document.getElementById('whatsappGatewayApiSecret');
            var body = {
                connectionMode: (document.getElementById('whatsappConnectionMode') || {}).value || 'cloud_first',
                cloudEnabled: (document.getElementById('whatsappCloudEnabled') || {}).checked !== false,
                cloudPhoneNumberId: (cloudPhone && cloudPhone.value) ? cloudPhone.value.trim() : undefined,
                cloudVerifyToken: (cloudVerify && cloudVerify.value) ? cloudVerify.value.trim() : undefined,
                gatewayEnabled: (document.getElementById('whatsappGatewayEnabled') || {}).checked !== false,
                gatewayUrl: (gwUrl && gwUrl.value) ? gwUrl.value.trim() : undefined
            };
            if (cloudToken && cloudToken.value.trim()) body.cloudAccessToken = cloudToken.value.trim();
            if (gwSecret && gwSecret.value.trim()) body.gatewayApiSecret = gwSecret.value.trim();
            try {
                var res = await apiFetch('/api/whatsapp/connection', { method: 'PUT', body: JSON.stringify(body) });
                if (res.needLogin) return;
                if (res.ok) { toast(t('done_msg')); loadWhatsappConnectionSettings(); loadWhatsappStatus(); }
                else toast((res.data && res.data.error) || t('err_generic'), true);
            } finally { waBtnLoading(saveBtn, false); }
        }
        async function loadWhatsappWelcomeConfig() {
            const ta = document.getElementById('whatsappWelcomeMessage');
            const cb = document.getElementById('whatsappWelcomeEnabled');
            const aiCb = document.getElementById('whatsappAIEnabled');
            const alertIn = document.getElementById('whatsappAlertMinutes');
            const escalateIn = document.getElementById('whatsappEscalateMinutes');
            const deptSel = document.getElementById('whatsappEscalationDept');
            const res = await apiFetch('/api/whatsapp/config');
            if (res.needLogin) return;
            if (res.ok && res.data) {
                if (ta) ta.value = res.data.welcomeMessage || '';
                if (cb) cb.checked = res.data.welcomeEnabled !== false;
                if (aiCb) aiCb.checked = res.data.aiAnswerEnabled !== false;
                const openaiInput = document.getElementById('whatsappOpenAIApiKey');
                const openaiStatus = document.getElementById('whatsappOpenAIKeyStatus');
                if (openaiInput) { openaiInput.value = ''; openaiInput.placeholder = res.data.openaiApiKeySet ? (LANG === 'fa' ? 'کلید ذخیره شده ✓ — برای تغییر، کلید جدید وارد کنید' : 'Key saved ✓ — Enter new key to change') : (LANG === 'fa' ? 'کلید API را از platform.openai.com وارد کنید' : 'Enter API key from platform.openai.com'); }
                if (openaiStatus) openaiStatus.textContent = res.data.openaiApiKeySet ? (LANG === 'fa' ? 'کلید API تنظیم شده است' : 'API key is set') : ''; if (openaiStatus && res.data.openaiApiKeySet) openaiStatus.classList.add('set'); else if (openaiStatus) openaiStatus.classList.remove('set');
                const clearLink = document.getElementById('whatsappOpenAIClearKey'); if (clearLink) clearLink.style.display = res.data.openaiApiKeySet ? 'inline' : 'none';
                if (alertIn) alertIn.value = res.data.alertUnansweredAfterMinutes ?? 5;
                if (escalateIn) escalateIn.value = res.data.escalateUnansweredAfterMinutes ?? 15;
                const deptMsg = document.getElementById('whatsappDeptAssignedMessage');
                const empMsg = document.getElementById('whatsappEmployeeIntroMessage');
                const autoAsgCb = document.getElementById('whatsappAutoAssignmentMessagesEnabled');
                if (deptMsg) deptMsg.value = res.data.deptAssignedMessage || '';
                if (empMsg) empMsg.value = res.data.employeeIntroMessage || '';
                if (autoAsgCb) autoAsgCb.checked = res.data.autoAssignmentMessagesEnabled !== false;
                if (deptSel) {
                    const deptRes = await apiFetch('/api/departments');
                    if (deptRes.ok && deptRes.data && deptRes.data.data) {
                        const opts = deptRes.data.data.filter(function(d){ return d.isActive !== false; }).map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; });
                        deptSel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'پشتیبانی (پیش‌فرض)' : 'Support (default)') + '</option>' + opts.join('');
                        deptSel.value = res.data.escalationDepartmentId || '';
                    }
                }
            }
        }
        async function saveWhatsappUnansweredConfig() {
            const alertIn = document.getElementById('whatsappAlertMinutes');
            const escalateIn = document.getElementById('whatsappEscalateMinutes');
            const deptSel = document.getElementById('whatsappEscalationDept');
            const btn = document.getElementById('btnSaveWhatsappUnanswered');
            if (!alertIn || !escalateIn) return;
            waBtnLoading(btn, true);
            try {
                const res = await apiFetch('/api/whatsapp/config', {
                    method: 'PUT',
                    body: JSON.stringify({
                        alertUnansweredAfterMinutes: parseInt(alertIn.value, 10) || 5,
                        escalateUnansweredAfterMinutes: parseInt(escalateIn.value, 10) || 15,
                        escalationDepartmentId: (deptSel && deptSel.value) || null
                    })
                });
                if (res.needLogin) return;
                if (res.ok) toast(t('done_msg'));
                else toast((res.data && res.data.error) || t('err_generic'), true);
            } finally { waBtnLoading(btn, false); }
        }
        async function saveWhatsappWelcomeConfig() {
            const ta = document.getElementById('whatsappWelcomeMessage');
            const cb = document.getElementById('whatsappWelcomeEnabled');
            const btn = document.getElementById('btnSaveWhatsappWelcome');
            if (!ta || !cb) return;
            waBtnLoading(btn, true);
            try {
                const res = await apiFetch('/api/whatsapp/config', {
                    method: 'PUT',
                    body: JSON.stringify({ welcomeMessage: ta.value.trim(), welcomeEnabled: cb.checked })
                });
                if (res.needLogin) return;
                if (res.ok) toast(t('done_msg'));
                else toast((res.data && res.data.error) || t('err_generic'), true);
            } finally { waBtnLoading(btn, false); }
        }
        async function clearWhatsappOpenAIKey() {
            const res = await apiFetch('/api/whatsapp/config', { method: 'PUT', body: JSON.stringify({ openaiApiKey: '' }) });
            if (res.needLogin) return;
            if (res.ok) { loadWhatsappWelcomeConfig(); toast(t('done_msg')); } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        async function saveWhatsappAIConfig() {
            const aiCb = document.getElementById('whatsappAIEnabled');
            const openaiInput = document.getElementById('whatsappOpenAIApiKey');
            const btn = document.getElementById('btnSaveWhatsappAI');
            if (!aiCb) return;
            waBtnLoading(btn, true);
            try {
                const body = { aiAnswerEnabled: aiCb.checked };
                if (openaiInput && openaiInput.value.trim()) body.openaiApiKey = openaiInput.value.trim();
                const res = await apiFetch('/api/whatsapp/config', {
                    method: 'PUT',
                    body: JSON.stringify(body)
                });
                if (res.needLogin) return;
                if (res.ok && openaiInput && openaiInput.value.trim()) {
                    openaiInput.value = '';
                    openaiInput.placeholder = LANG === 'fa' ? 'کلید ذخیره شد ✓ — برای تغییر، کلید جدید وارد کنید' : 'Key saved ✓ — Enter new key to change';
                    const st = document.getElementById('whatsappOpenAIKeyStatus');
                    if (st) { st.textContent = LANG === 'fa' ? 'کلید API تنظیم شده است' : 'API key is set'; st.classList.add('set'); }
                }
                if (res.ok) toast(t('done_msg'));
                else toast((res.data && res.data.error) || t('err_generic'), true);
            } finally { waBtnLoading(btn, false); }
        }
        async function saveWhatsappAutoMessagesConfig() {
            const deptMsg = document.getElementById('whatsappDeptAssignedMessage');
            const empMsg = document.getElementById('whatsappEmployeeIntroMessage');
            const autoAsgCb = document.getElementById('whatsappAutoAssignmentMessagesEnabled');
            const btn = document.getElementById('btnSaveWhatsappAutoMessages');
            if (!deptMsg || !empMsg) return;
            waBtnLoading(btn, true);
            try {
                const res = await apiFetch('/api/whatsapp/config', {
                    method: 'PUT',
                    body: JSON.stringify({
                        deptAssignedMessage: deptMsg.value.trim(),
                        employeeIntroMessage: empMsg.value.trim(),
                        autoAssignmentMessagesEnabled: autoAsgCb ? autoAsgCb.checked : true
                    })
                });
                if (res.needLogin) return;
                if (res.ok) toast(t('done_msg'));
                else toast((res.data && res.data.error) || t('err_generic'), true);
            } finally { waBtnLoading(btn, false); }
        }
        async function loadWhatsappStats() {
            const perms = (currentUser && currentUser.permissions) || {};
            if (!token || perms.conversations === false) return;
            const openEl = document.getElementById('whatsappStatOpen');
            const unassignedEl = document.getElementById('whatsappStatUnassigned');
            const unansweredEl = document.getElementById('whatsappStatUnanswered');
            if (!openEl && !unassignedEl && !unansweredEl) return;
            [openEl, unassignedEl, unansweredEl].forEach(function (el) {
                if (!el) return;
                el.classList.add('whatsapp-stat-skel', 'loading-skeleton');
                el.textContent = '\u00a0';
            });
            try {
                const resOpen = apiFetch('/api/conversations?status=open&limit=1');
                const resUnassigned = apiFetch('/api/conversations?unassigned=1&limit=1');
                const resUnanswered = apiFetch('/api/conversations?unanswered=1&limit=1');
                const arr = await Promise.all([resOpen, resUnassigned, resUnanswered]);
                if (openEl) {
                    openEl.classList.remove('whatsapp-stat-skel', 'loading-skeleton');
                    openEl.textContent = (arr[0].ok && arr[0].data && arr[0].data.total != null) ? String(arr[0].data.total) : '—';
                }
                if (unassignedEl) {
                    unassignedEl.classList.remove('whatsapp-stat-skel', 'loading-skeleton');
                    unassignedEl.textContent = (arr[1].ok && arr[1].data && arr[1].data.total != null) ? String(arr[1].data.total) : '—';
                }
                if (unansweredEl) {
                    unansweredEl.classList.remove('whatsapp-stat-skel', 'loading-skeleton');
                    unansweredEl.textContent = (arr[2].ok && arr[2].data && arr[2].data.total != null) ? String(arr[2].data.total) : '—';
                }
            } catch (e) {
                [openEl, unassignedEl, unansweredEl].forEach(function (el) {
                    if (el) { el.classList.remove('whatsapp-stat-skel', 'loading-skeleton'); el.textContent = '—'; }
                });
            }
        }
        async function loadWhatsappDeptRouting() {
            const box = document.getElementById('whatsappDeptRouting');
            const list = document.getElementById('whatsappDeptList');
            if (!box || !list) return;
            box.style.display = 'block';
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/departments');
            if (res.needLogin) return;
            if (!res.ok || !res.data || !res.data.data) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const depts = res.data.data.filter(function(d){ return d.isActive !== false; });
            if (depts.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'دپارتمانی تعریف نشده' : 'No departments') + '</div>'; return; }
            list.innerHTML = depts.map(function(d) {
                const kw = (d.keywords || '').trim() || '—';
                const def = d.isDefault ? ' <span class="badge" style="font-size:0.7rem;">' + (LANG === 'fa' ? 'پیش‌فرض' : 'Default') + '</span>' : '';
                return '<div class="list-item" style="padding:10px 14px;"><span class="name">' + escapeHtml(d.name || '') + def + '</span><div class="meta" style="font-size:0.85rem; margin-top:4px;">' + (LANG === 'fa' ? 'کلمات کلیدی: ' : 'Keywords: ') + escapeHtml(kw) + '</div></div>';
            }).join('');
        }
        async function loadWhatsappUnassigned() {
            const box = document.getElementById('whatsappUnassignedBox');
            const list = document.getElementById('whatsappUnassignedList');
            if (!box || !list) return;
            const res = await apiFetch('/api/conversations?status=open&unassigned=1&limit=15');
            if (res.needLogin) return;
            if (!res.ok || !res.data) return;
            const convs = res.data.data || [];
            if (convs.length === 0) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            list.innerHTML = convs.map(function(c) {
                const name = (c.customer && (c.customer.name || c.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                let preview = (c.lastMessagePreview || '').slice(0, 50);
                if (preview.length >= 50) preview += '…';
                return '<div class="list-item" data-convid="' + c.id + '" onclick="openChat(\'' + c.id + '\', \'' + (name || '').replace(/'/g, "\\'") + '\', \'\'); showPage(\'conversations\');" style="cursor:pointer;"><span class="name">' + escapeHtml(name) + '</span><div class="meta">' + escapeHtml(preview) + '</div></div>';
            }).join('');
        }

        var chatTemplatesCache = [];
        let _tplActiveCat = 'all';
        function initTplVarPills() {
            var wrap = document.getElementById('tplProVarChips');
            if (!wrap || wrap._tplVarBound) return;
            wrap._tplVarBound = true;
            wrap.addEventListener('click', function (e) {
                var b = e.target.closest('[data-tpl-copy]');
                if (!b) return;
                var v = b.getAttribute('data-tpl-copy') || '';
                if (v && navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(v).then(function () {
                        toast((LANG === 'fa' ? 'کپی شد: ' : 'Copied: ') + v);
                    }).catch(function () { toast(t('err_generic'), true); });
                }
            });
        }
        function initMessageTemplatesTabs() {
            document.querySelectorAll('.tpl-pro-tab').forEach(function (btn) {
                btn.onclick = function () {
                    var tab = btn.getAttribute('data-tab');
                    document.querySelectorAll('.tpl-pro-tab').forEach(function (b) {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-selected', 'true');
                    var textContent = document.getElementById('textTemplatesContent');
                    var fileContent = document.getElementById('fileTemplatesContent');
                    if (textContent) {
                        textContent.classList.toggle('tpl-pro-panel--active', tab === 'text');
                        textContent.setAttribute('aria-hidden', tab !== 'text');
                    }
                    if (fileContent) {
                        fileContent.classList.toggle('tpl-pro-panel--active', tab === 'file');
                        fileContent.setAttribute('aria-hidden', tab !== 'file');
                    }
                    if (tab === 'file') loadFileTemplates();
                };
            });
            const fileSearch = document.getElementById('fileTemplatesSearch');
            if (fileSearch && !fileSearch._bound) {
                fileSearch._bound = true;
                fileSearch.addEventListener('input', function() {
                    clearTimeout(window._fileTplSearchT);
                    window._fileTplSearchT = setTimeout(function() { loadFileTemplates(); }, 350);
                });
            }
            const textSearch = document.getElementById('textTemplatesSearch');
            if (textSearch && !textSearch._bound) {
                textSearch._bound = true;
                textSearch.addEventListener('input', function() {
                    clearTimeout(window._textTplSearchT);
                    window._textTplSearchT = setTimeout(function() { renderMessageTemplates(); }, 250);
                });
            }
        }
        function renderMessageTemplates() {
            const list = document.getElementById('messageTemplatesList');
            if (!list) return;
            const search = ((document.getElementById('textTemplatesSearch') && document.getElementById('textTemplatesSearch').value) || '').trim().toLowerCase();
            const data = chatTemplatesCache || [];
            const filtered = data.filter(function(tpl) {
                const catMatch = _tplActiveCat === 'all' || (tpl.category || '') === _tplActiveCat;
                const searchMatch = !search || (tpl.name || '').toLowerCase().indexOf(search) !== -1 || (tpl.content || '').toLowerCase().indexOf(search) !== -1 || (tpl.category || '').toLowerCase().indexOf(search) !== -1;
                return catMatch && searchMatch;
            });
            if (filtered.length === 0) {
                list.innerHTML = '<div class="tpl-empty"><div class="tpl-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><h4>' + (LANG === 'fa' ? 'تمپلیتی وجود ندارد' : 'No templates found') + '</h4><p>' + (search || _tplActiveCat !== 'all' ? (LANG === 'fa' ? 'فیلتر را تغییر دهید یا جستجوی دیگری امتحان کنید.' : 'Try a different filter or search.') : (LANG === 'fa' ? 'افزودن تمپلیت را بزنید تا اولین تمپلیت را بسازید.' : 'Click Add template to create your first one.')) + '</p></div>';
                return;
            }
            list.innerHTML = filtered.map(function(tpl) {
                let preview = (tpl.content || '').slice(0, 120);
                if ((tpl.content || '').length > 120) preview += '…';
                const usage = (tpl.usageCount || 0) > 0 ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' + tpl.usageCount + (LANG === 'fa' ? ' بار' : ' uses') : '';
                const catBadge = tpl.category ? '<span class="tpl-card-cat">' + escapeHtml(tpl.category) + '</span>' : '';
                const inactiveBadge = tpl.isActive === false ? '<span class="tpl-card-inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>' : '';
                return '<div class="tpl-card" data-id="' + tpl.id + '">' +
                    '<div class="tpl-card-top"><div class="tpl-card-title-row"><span class="tpl-card-name" title="' + escapeHtml(tpl.name || '') + '">' + escapeHtml(tpl.name || '') + '</span>' + catBadge + inactiveBadge + '</div></div>' +
                    '<div class="tpl-card-body">' + escapeHtml(preview) + '</div>' +
                    '<div class="tpl-card-footer"><div class="tpl-card-meta">' + usage + '</div><div class="tpl-card-actions">' +
                    '<button type="button" class="tpl-btn-copy" data-content="' + escapeForDataAttr(tpl.content || '') + '" title="' + (LANG === 'fa' ? 'کپی' : 'Copy') + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' + (LANG === 'fa' ? 'کپی' : 'Copy') + '</button>' +
                    '<button type="button" class="btn-secondary btn-sm btn-tpl-edit" data-id="' + tpl.id + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button>' +
                    '<button type="button" class="btn-danger btn-sm btn-tpl-delete" data-id="' + tpl.id + '">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button>' +
                    '</div></div></div>';
            }).join('');
            list.querySelectorAll('.tpl-btn-copy').forEach(function(btn) {
                btn.onclick = function() {
                    const content = unescapeFromDataAttr(btn.getAttribute('data-content') || '');
                    if (navigator.clipboard) { navigator.clipboard.writeText(content).then(function() { btn.classList.add('copied'); btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' + (LANG === 'fa' ? 'کپی شد' : 'Copied'); setTimeout(function() { btn.classList.remove('copied'); btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' + (LANG === 'fa' ? 'کپی' : 'Copy'); }, 1800); }); }
                };
            });
        }
        function renderTextTemplatesCategoryFilter(data) {
            const bar = document.getElementById('textTemplatesCategoryFilter');
            if (!bar) return;
            const cats = [];
            data.forEach(function(tpl) { if (tpl.category && cats.indexOf(tpl.category) === -1) cats.push(tpl.category); });
            if (cats.length === 0) { bar.innerHTML = ''; return; }
            bar.innerHTML = '<button type="button" class="tpl-cat-chip' + (_tplActiveCat === 'all' ? ' active' : '') + '" data-cat="all">' + (LANG === 'fa' ? 'همه' : 'All') + '</button>' +
                cats.map(function(c) { return '<button type="button" class="tpl-cat-chip' + (_tplActiveCat === c ? ' active' : '') + '" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>'; }).join('');
            bar.querySelectorAll('.tpl-cat-chip').forEach(function(chip) {
                chip.onclick = function() {
                    _tplActiveCat = chip.getAttribute('data-cat');
                    bar.querySelectorAll('.tpl-cat-chip').forEach(function(c) { c.classList.remove('active'); });
                    chip.classList.add('active');
                    renderMessageTemplates();
                };
            });
        }
        function tplProSkeletonCells(n) {
            var sk = '';
            for (var i = 0; i < (n || 6); i++) sk += '<div class="tpl-pro-skel-card loading-skeleton"></div>';
            return sk;
        }
        async function loadMessageTemplates() {
            const list = document.getElementById('messageTemplatesList');
            if (!list) return;
            list.innerHTML = tplProSkeletonCells(6);
            const res = await apiFetch('/api/message-templates');
            if (res.needLogin || !res.ok) {
                list.innerHTML = '<div class="empty">' + escapeHtml((res.data && res.data.error) || t('err_generic')) + '</div>';
                return;
            }
            const data = (res.data && res.data.data) || [];
            chatTemplatesCache = data;
            var countEl = document.getElementById('textTemplatesCount');
            if (countEl) countEl.textContent = data.length ? String(data.length) : '';
            var statT = document.getElementById('tplStatTextCount');
            if (statT) statT.textContent = String(data.length);
            apiFetch('/api/file-templates').then(function (fr) {
                if (fr.ok && fr.data && fr.data.data) {
                    var statF = document.getElementById('tplStatFileCount');
                    if (statF) statF.textContent = String(fr.data.data.length);
                }
            }).catch(function () {});
            renderTextTemplatesCategoryFilter(data);
            renderMessageTemplates();
        }
        async function openTemplateModal(id) {
            document.getElementById('templateModalId').value = id || '';
            document.getElementById('templateModalTitle').textContent = id ? (LANG === 'fa' ? 'ویرایش تمپلیت' : 'Edit template') : t('template_add');
            document.getElementById('templateModalName').value = '';
            document.getElementById('templateModalCategory').value = '';
            document.getElementById('templateModalContent').value = '';
            document.getElementById('templateModalActive').checked = true;
            if (id) {
                let tplData = chatTemplatesCache.find(function(x) { return x.id === id; });
                if (!tplData) {
                    const res = await apiFetch('/api/message-templates/' + id);
                    if (res.ok && res.data) tplData = res.data;
                }
                if (tplData) {
                    document.getElementById('templateModalName').value = tplData.name || '';
                    document.getElementById('templateModalCategory').value = tplData.category || '';
                    document.getElementById('templateModalContent').value = tplData.content || '';
                    document.getElementById('templateModalActive').checked = tplData.isActive !== false;
                }
            }
            document.getElementById('templateModal').style.display = 'flex';
        }
        function closeTemplateModal() { document.getElementById('templateModal').style.display = 'none'; }
        function insertVar(v) {
            const ta = document.getElementById('templateModalContent');
            if (!ta) return;
            const start = ta.selectionStart, end = ta.selectionEnd;
            ta.value = ta.value.slice(0, start) + v + ta.value.slice(end);
            ta.selectionStart = ta.selectionEnd = start + v.length;
            ta.focus();
        }
        window.insertVar = insertVar;
        async function saveTemplate() {
            const id = document.getElementById('templateModalId').value.trim();
            const name = (document.getElementById('templateModalName').value || '').trim();
            const category = (document.getElementById('templateModalCategory').value || '').trim();
            const content = (document.getElementById('templateModalContent').value || '').trim();
            const isActive = document.getElementById('templateModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام الزامی است' : 'Name required', true); return; }
            if (!content) { toast(LANG === 'fa' ? 'محتوا الزامی است' : 'Content required', true); return; }
            const url = id ? '/api/message-templates/' + id : '/api/message-templates';
            const method = id ? 'PUT' : 'POST';
            const res = await apiFetch(url, { method: method, body: JSON.stringify({ name: name, category: category || null, content: content, isActive: isActive }) });
            if (res.needLogin) return;
            if (res.ok) { closeTemplateModal(); loadMessageTemplates(); chatTemplatesCache = (await apiFetch('/api/message-templates')).data?.data || chatTemplatesCache; toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function editTemplate(id) { openTemplateModal(id); }
        async function deleteTemplate(id) {
            if (!confirm(LANG === 'fa' ? 'حذف این تمپلیت؟' : 'Delete this template?')) return;
            const res = await apiFetch('/api/message-templates/' + id, { method: 'DELETE' });
            if (res.ok) { loadMessageTemplates(); chatTemplatesCache = chatTemplatesCache.filter(function(x) { return x.id !== id; }); toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        let fileTemplatesCache = [];
        function getFileIcon(mimetype) {
            if (!mimetype) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
            if (mimetype.indexOf('image') !== -1) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            if (mimetype.indexOf('pdf') !== -1) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
            if (mimetype.indexOf('spreadsheet') !== -1 || mimetype.indexOf('excel') !== -1 || mimetype.indexOf('csv') !== -1) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>';
            if (mimetype.indexOf('video') !== -1) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
            if (mimetype.indexOf('audio') !== -1) return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
        }
        async function loadFileTemplates() {
            const list = document.getElementById('fileTemplatesList');
            if (!list) return;
            list.innerHTML = tplProSkeletonCells(5);
            const search = (document.getElementById('fileTemplatesSearch') && document.getElementById('fileTemplatesSearch').value || '').trim();
            const q = search ? '?search=' + encodeURIComponent(search) : '';
            const res = await apiFetch('/api/file-templates' + q);
            if (res.needLogin || !res.ok) {
                list.innerHTML = '<div class="empty">' + escapeHtml((res.data && res.data.error) || t('err_generic')) + '</div>';
                return;
            }
            const data = (res.data && res.data.data) || [];
            fileTemplatesCache = data;
            const countEl = document.getElementById('fileTemplatesCount');
            if (countEl) countEl.textContent = data.length ? String(data.length) : '';
            var statF = document.getElementById('tplStatFileCount');
            if (statF && !search) statF.textContent = String(data.length);
            if (data.length === 0) {
                list.innerHTML = '<div class="tpl-empty"><div class="tpl-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></div><h4>' + (LANG === 'fa' ? 'فایلی وجود ندارد' : 'No files yet') + '</h4><p>' + (search ? (LANG === 'fa' ? 'جستجوی دیگری امتحان کنید.' : 'Try a different search.') : (LANG === 'fa' ? 'بارگذاری فایل را بزنید تا اولین فایل را اضافه کنید.' : 'Click Upload file to add your first file.')) + '</p></div>';
                return;
            }
            list.innerHTML = data.map(function(ft) {
                const tags = (ft.tags || []).slice(0, 4).map(function(tg){ return '<span class="ft-card-tag">' + escapeHtml(tg) + '</span>'; }).join('');
                const usage = (ft.usageCount || 0) > 0 ? (LANG === 'fa' ? ft.usageCount + ' بار استفاده' : ft.usageCount + ' uses') : '';
                const size = ft.filesize ? (ft.filesize < 1024 ? ft.filesize + ' B' : (ft.filesize < 1024*1024 ? Math.round(ft.filesize/1024) + ' KB' : (ft.filesize/1024/1024).toFixed(1) + ' MB')) : '';
                const catBadge = ft.category ? '<span class="ft-card-cat">' + escapeHtml(ft.category) + '</span>' : '';
                const inactiveBadge = ft.isActive === false ? '<span class="tpl-card-inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>' : '';
                const metaParts = [size, usage].filter(Boolean);
                return '<div class="ft-card" data-id="' + ft.id + '">' +
                    '<div class="ft-card-icon">' + getFileIcon(ft.mimetype) + '</div>' +
                    '<div class="ft-card-body">' +
                    '<div class="ft-card-top"><span class="ft-card-name" title="' + escapeHtml(ft.name || ft.filename || '') + '">' + escapeHtml(ft.name || ft.filename || '') + '</span>' +
                    '<div class="ft-card-actions"><button type="button" class="btn-secondary btn-sm btn-ft-edit" data-id="' + ft.id + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button><button type="button" class="btn-danger btn-sm btn-ft-delete" data-id="' + ft.id + '">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div>' +
                    '</div>' +
                    '<div class="ft-card-badges">' + catBadge + inactiveBadge + tags + '</div>' +
                    (ft.description ? '<div class="ft-card-desc">' + escapeHtml((ft.description || '').slice(0, 100)) + ((ft.description || '').length > 100 ? '…' : '') + '</div>' : '') +
                    (metaParts.length ? '<div class="ft-card-meta">' + metaParts.join('<span class="ft-card-meta-dot">·</span>') + '</div>' : '') +
                    '</div></div>';
            }).join('');
        }
        async function openFileTemplateModal(id) {
            document.getElementById('fileTemplateModalId').value = id || '';
            document.getElementById('fileTemplateModalTitle').textContent = id ? (LANG === 'fa' ? 'ویرایش فایل' : 'Edit file') : (LANG === 'fa' ? 'بارگذاری فایل پرکاربرد' : 'Upload file');
            document.getElementById('fileTemplateModalName').value = '';
            document.getElementById('fileTemplateModalCategory').value = '';
            document.getElementById('fileTemplateModalDescription').value = '';
            document.getElementById('fileTemplateModalTags').value = '';
            document.getElementById('fileTemplateModalActive').checked = true;
            document.getElementById('fileTemplateFile').value = '';
            document.getElementById('fileTemplateFileName').style.display = 'none';
            document.getElementById('fileTemplateUploadArea').style.display = id ? 'none' : 'block';
            document.getElementById('fileTemplateEditArea').style.display = id ? 'block' : 'none';
            if (id) {
                let ft = fileTemplatesCache.find(function(x) { return x.id === id; });
                if (!ft) {
                    const res = await apiFetch('/api/file-templates/' + id);
                    if (res.ok && res.data) ft = res.data;
                }
                if (!ft) return;
                document.getElementById('fileTemplateModalName').value = ft.name || '';
                document.getElementById('fileTemplateModalCategory').value = ft.category || '';
                document.getElementById('fileTemplateModalDescription').value = ft.description || '';
                document.getElementById('fileTemplateModalTags').value = (ft.tags || []).join(', ');
                document.getElementById('fileTemplateModalActive').checked = ft.isActive !== false;
                document.getElementById('fileTemplateCurrentFile').textContent = ft.filename || '';
            }
            document.getElementById('fileTemplateModal').style.display = 'flex';
            const fileInput = document.getElementById('fileTemplateFile');
            if (fileInput && !fileInput._bound) {
                fileInput._bound = true;
                fileInput.addEventListener('change', function() {
                    const fn = document.getElementById('fileTemplateFileName');
                    if (fn) { fn.style.display = this.files && this.files[0] ? 'block' : 'none'; fn.textContent = this.files && this.files[0] ? '📎 ' + this.files[0].name : ''; }
                });
            }
            const uploadBox = document.getElementById('tplUploadBox');
            if (uploadBox && !uploadBox._ddBound) {
                uploadBox._ddBound = true;
                uploadBox.addEventListener('dragover', function(e) { e.preventDefault(); uploadBox.style.borderColor = 'var(--accent)'; uploadBox.style.background = 'var(--accent-soft)'; });
                uploadBox.addEventListener('dragleave', function() { uploadBox.style.borderColor = ''; uploadBox.style.background = ''; });
                uploadBox.addEventListener('drop', function(e) {
                    e.preventDefault(); uploadBox.style.borderColor = ''; uploadBox.style.background = '';
                    const files = e.dataTransfer && e.dataTransfer.files;
                    if (files && files[0] && fileInput) {
                        const dt = new DataTransfer(); dt.items.add(files[0]); fileInput.files = dt.files;
                        const fn = document.getElementById('fileTemplateFileName');
                        if (fn) { fn.style.display = 'block'; fn.textContent = '📎 ' + files[0].name; }
                    }
                });
            }
        }
        function closeFileTemplateModal() { document.getElementById('fileTemplateModal').style.display = 'none'; }
        async function saveFileTemplate() {
            const id = document.getElementById('fileTemplateModalId').value.trim();
            const name = (document.getElementById('fileTemplateModalName').value || '').trim();
            if (!name) { toast(LANG === 'fa' ? 'نام الزامی است' : 'Name required', true); return; }
            if (!id) {
                const fileInput = document.getElementById('fileTemplateFile');
                if (!fileInput || !fileInput.files || !fileInput.files[0]) { toast(LANG === 'fa' ? 'فایل الزامی است' : 'File required', true); return; }
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                formData.append('name', name);
                formData.append('category', (document.getElementById('fileTemplateModalCategory').value || '').trim());
                formData.append('description', (document.getElementById('fileTemplateModalDescription').value || '').trim());
                const tagsStr = (document.getElementById('fileTemplateModalTags').value || '').trim();
                if (tagsStr) formData.append('tags', JSON.stringify(tagsStr.split(',').map(function(t){ return t.trim(); }).filter(Boolean)));
                var res = await apiFetch('/api/file-templates', { method: 'POST', body: formData });
                if (res.needLogin) return;
                if (res.ok) { closeFileTemplateModal(); loadFileTemplates(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            } else {
                const body = { name: name, category: (document.getElementById('fileTemplateModalCategory').value || '').trim(), description: (document.getElementById('fileTemplateModalDescription').value || '').trim(), tags: (document.getElementById('fileTemplateModalTags').value || '').split(',').map(function(t){ return t.trim(); }).filter(Boolean), isActive: document.getElementById('fileTemplateModalActive').checked };
                var res = await apiFetch('/api/file-templates/' + id, { method: 'PUT', body: JSON.stringify(body) });
                if (res.ok) { closeFileTemplateModal(); loadFileTemplates(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            }
        }
        function editFileTemplate(id) { openFileTemplateModal(id); }
        async function deleteFileTemplate(id) {
            if (!confirm(LANG === 'fa' ? 'حذف این فایل؟' : 'Delete this file?')) return;
            const res = await apiFetch('/api/file-templates/' + id, { method: 'DELETE' });
            if (res.ok) { loadFileTemplates(); fileTemplatesCache = fileTemplatesCache.filter(function(x) { return x.id !== id; }); toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        window.openTemplateModal = openTemplateModal;
        window.closeTemplateModal = closeTemplateModal;
        window.saveTemplate = saveTemplate;
        window.editTemplate = editTemplate;
        window.deleteTemplate = deleteTemplate;
        window.openFileTemplateModal = openFileTemplateModal;
        window.closeFileTemplateModal = closeFileTemplateModal;
        window.saveFileTemplate = saveFileTemplate;
        window.editFileTemplate = editFileTemplate;
        window.deleteFileTemplate = deleteFileTemplate;
        window.loadMessageTemplates = loadMessageTemplates;
        window.loadFileTemplates = loadFileTemplates;
        // بستن مودال با کلیک روی overlay
        (function() {
            const tm = document.getElementById('templateModal');
            const fm = document.getElementById('fileTemplateModal');
            if (tm) tm.addEventListener('click', function(e) { if (e.target === tm) closeTemplateModal(); });
            if (fm) fm.addEventListener('click', function(e) { if (e.target === fm) closeFileTemplateModal(); });
        })();
        function escapeForDataAttr(str) {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function unescapeFromDataAttr(str) {
            if (!str) return '';
            return String(str).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        }
        async function toggleTemplateDropdown() {
            const dd = document.getElementById('chatTemplateDropdown');
            const btn = document.getElementById('msgTemplateBtn');
            if (!dd || !btn) return;
            if (dd.style.display === 'block') { dd.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); return; }
            dd.innerHTML = '<div class="chat-template-dropdown-loading">' + (LANG === 'fa' ? 'در حال بارگذاری...' : 'Loading...') + '</div>';
            dd.style.display = 'block';
            btn.setAttribute('aria-expanded', 'true');
            if (chatTemplatesCache.length === 0) {
                const res = await apiFetch('/api/message-templates');
                if (res.ok && res.data && res.data.data) chatTemplatesCache = res.data.data;
            }
            const fileTplRes = await apiFetch('/api/file-templates');
            const activeFileTpl = (fileTplRes.ok && fileTplRes.data && fileTplRes.data.data) ? fileTplRes.data.data.filter(function(f) { return f.isActive !== false; }) : [];
            const activeTpl = chatTemplatesCache.filter(function(t) { return t.isActive !== false; });
            let html = '';
            if (activeTpl.length > 0) {
                html += '<div class="chat-tpl-dd-section-title">' + (LANG === 'fa' ? 'تمپلیت‌های متنی' : 'Text Templates') + '</div>';
                html += activeTpl.map(function(t) {
                    let preview = (t.content || '').slice(0, 55);
                    if ((t.content || '').length > 55) preview += '…';
                    const contentEsc = escapeForDataAttr(t.content || '');
                    return '<div class="chat-template-dropdown-item" data-id="' + escapeHtml(t.id) + '" data-content="' + contentEsc + '" role="button" tabindex="0"><div class="tpl-name">' + escapeHtml(t.name || (LANG === 'fa' ? 'بدون نام' : 'Untitled')) + '</div><div class="tpl-preview">' + escapeHtml(preview) + '</div></div>';
                }).join('');
            }
            if (activeFileTpl.length > 0) {
                html += '<div class="chat-tpl-dd-section-title">' + (LANG === 'fa' ? 'فایل‌های پرکاربرد' : 'File Templates') + '</div>';
                html += activeFileTpl.map(function(f) {
                    const ext = (f.filename || '').split('.').pop().toLowerCase();
                    const icon = f.mimetype && f.mimetype.indexOf('image') !== -1 ? '🖼' : f.mimetype && f.mimetype.indexOf('pdf') !== -1 ? '📄' : f.mimetype && f.mimetype.indexOf('audio') !== -1 ? '🎵' : f.mimetype && f.mimetype.indexOf('video') !== -1 ? '🎬' : '📎';
                    const size = f.filesize ? (f.filesize < 1024*1024 ? Math.round(f.filesize/1024) + ' KB' : (f.filesize/1024/1024).toFixed(1) + ' MB') : '';
                    const fUrl = f.url || (f.filepath ? '/uploads/file-templates/' + (f.filepath.split(/[\\/]/).pop()) : '');
                    return '<div class="chat-template-dropdown-item chat-file-tpl-item" data-file-id="' + escapeHtml(f.id) + '" data-file-name="' + escapeHtml(f.name || f.filename || '') + '" data-file-url="' + escapeHtml(fUrl) + '" data-mimetype="' + escapeHtml(f.mimetype || '') + '" data-filename="' + escapeHtml(f.filename || '') + '" role="button" tabindex="0"><div class="tpl-name">' + icon + ' ' + escapeHtml(f.name || f.filename || '') + '</div>' + (size ? '<div class="tpl-preview">' + size + (f.category ? ' · ' + escapeHtml(f.category) : '') + '</div>' : '') + '</div>';
                }).join('');
            }
            if (!html) html = '<div class="chat-template-dropdown-empty">' + (LANG === 'fa' ? 'تمپلیتی وجود ندارد. از بخش تمپلیت‌های پیام اضافه کنید.' : 'No templates. Add from Message Templates.') + '</div>';
            dd.innerHTML = html;
            document.addEventListener('click', function closeTemplateDd(e) {
                if (!dd.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { dd.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', closeTemplateDd); }
            });
        }
        function insertTemplateIntoChat(content, templateId) {
            if (!content) return;
            const cust = currentConvDetail && currentConvDetail.customer;
            const custName = (cust && (cust.name || cust.phone)) || '';
            const custPhone = (cust && cust.phone) || '';
            const custEmail = (cust && cust.email) || '';
            const today = new Date();
            const dateStr = today.getFullYear() + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0');
            const timeStr = String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
            const text = content.replace(/\{name\}/gi, custName).replace(/\{phone\}/gi, custPhone).replace(/\{email\}/gi, custEmail).replace(/\{date\}/g, dateStr).replace(/\{time\}/g, timeStr);
            const input = document.getElementById('msgInput');
            if (input) { input.value = text; input.focus(); }
            if (templateId) apiFetch('/api/message-templates/' + templateId + '/use', { method: 'POST' }).catch(function() {});
        }

        async function loadDepartments() {
            const list = document.getElementById('deptList');
            setLoading('deptList', 4);
            const canEdit = currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager' || (currentUser.permissions && currentUser.permissions.manage_users));
            const q = canEdit ? '?all=1' : '';
            const res = await apiFetch('/api/departments' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🏢</span><br>' + t('empty_dept') + '</div>'; return; }
            window._deptListData = data.data;
            list.innerHTML = data.data.map(function(d, idx) {
                const branchName = (d.branch && d.branch.name) ? d.branch.name : '';
                const color = (d.color || '#10b981').replace(/^#?/, '#');
                let kw = (d.keywords || '').trim();
                if (kw.length > 120) kw = kw.slice(0, 117) + '…';
                const meta = [d.description, branchName].filter(Boolean).join(' · ');
                const inactive = d.isActive === false;
                const defBadge = d.isDefault ? '<span class="dept-card-badge">' + (LANG === 'fa' ? 'پیش‌فرض' : 'Default') + '</span>' : '';
                const editBtn = canEdit ? '<button type="button" class="btn-secondary dept-edit-btn" onclick="editDepartment(' + idx + ')">' + t('edit') + '</button>' : '';
                const metaHtml = meta ? '<div class="dept-card-meta">' + escapeHtml(meta) + '</div>' : '';
                const kwHtml = kw ? '<div class="dept-card-keywords">' + escapeHtml(kw) + '</div>' : '';
                return '<div class="dept-card' + (inactive ? ' dept-inactive' : '') + '" data-id="' + d.id + '"><div class="dept-card-header"><div class="dept-card-title"><span class="dept-card-color" style="background:' + color + ';"></span><span class="dept-card-name">' + defBadge + escapeHtml(d.name || '') + '</span></div><div class="dept-card-actions">' + editBtn + '</div></div>' + metaHtml + kwHtml + '</div>';
            }).join('');
        }

        async function loadBranchesForSelect(selectIds) {
            const res = await apiFetch('/api/branches');
            if (res.needLogin || !res.ok) return;
            const arr = (res.data && res.data.data) || [];
            const opt = '<option value="">' + t('no_branch') + '</option>' + arr.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name + (b.city ? ' - ' + b.city : '') + (b.country ? ' (' + b.country + ')' : '')) + '</option>'; }).join('');
            const allBranchOpt = '<option value="">' + t('all_branches') + '</option>' + arr.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name + (b.city ? ' - ' + b.city : '')) + '</option>'; }).join('');
            (selectIds || ['userBranch', 'deptBranch', 'supBranch', 'supActBranch']).forEach(function(id) {
                const el = document.getElementById(id);
                if (el) { el.innerHTML = (id === 'supBranch' || id === 'supActBranch' || id === 'convFilterBranch') ? allBranchOpt : opt; }
            });
        }

        async function loadBranches() {
            const list = document.getElementById('branchList');
            if (!list) return;
            setLoading('branchList', 4);
            const res = await apiFetch('/api/branches');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🏢</span><br>' + t('empty_branches') + '</div>'; return; }
            const role = (currentUser && currentUser.role) || '';
            const canEdit = (role === 'owner' || role === 'admin');
            list.innerHTML = data.data.map(function(b) {
                const loc = [b.city, b.country].filter(Boolean).join(' — ');
                const name = (b.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                const city = (b.city || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                const country = (b.country || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                const editBtn = canEdit ? '<button type="button" class="btn-secondary branch-edit-btn" onclick="var c=this.closest(\'.branch-card\'); editBranch(c.getAttribute(\'data-id\'), c.getAttribute(\'data-name\')||\'\', c.getAttribute(\'data-city\')||\'\', c.getAttribute(\'data-country\')||\'\')">' + t('edit') + '</button>' : '';
                const iconHtml = '<span class="branch-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><use href="#icon-building-2"/></svg></span>';
                return '<div class="branch-card" data-id="' + b.id + '" data-name="' + name + '" data-city="' + city + '" data-country="' + country + '"><div class="branch-card-header"><div class="branch-card-title">' + iconHtml + '<span class="branch-card-name">' + escapeHtml(b.name) + '</span></div><div class="branch-card-actions">' + editBtn + '</div></div>' + (loc ? '<div class="branch-card-meta">' + escapeHtml(loc) + '</div>' : '') + '</div>';
            }).join('');
        }


        async function addBranch() {
            const id = window._editingBranchId;
            const name = document.getElementById('branchName').value.trim();
            if (!name) { toast(t('branch_name_required'), true); return; }
            const city = document.getElementById('branchCity').value.trim();
            const country = document.getElementById('branchCountry').value.trim();
            let res;
            if (id) {
                res = await apiFetch('/api/branches/' + id, { method: 'PUT', body: JSON.stringify({ name: name, city: city || null, country: country || null }) });
                window._editingBranchId = null;
            } else {
                res = await apiFetch('/api/branches', { method: 'POST', body: JSON.stringify({ name: name, city: city || null, country: country || null }) });
            }
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('branchName').value = '';
                document.getElementById('branchCity').value = '';
                document.getElementById('branchCountry').value = '';
                const btnSave = document.getElementById('btnBranchSave');
                const btnCancel = document.getElementById('btnBranchCancel');
                if (btnSave) btnSave.textContent = t('add_branch');
                if (btnCancel) btnCancel.style.display = 'none';
                toast(id ? t('toast_branch_updated') : t('toast_branch_added'));
                loadBranches();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function editBranch(id, name, city, country) {
            document.getElementById('branchName').value = (name || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            document.getElementById('branchCity').value = (city || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            document.getElementById('branchCountry').value = (country || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            window._editingBranchId = id;
            const btnSave = document.getElementById('btnBranchSave');
            const btnCancel = document.getElementById('btnBranchCancel');
            if (btnSave) btnSave.textContent = t('edit');
            if (btnCancel) btnCancel.style.display = 'inline-flex';
            toast(t('edit_branch_hint'), false);
        }

        function cancelBranchEdit() {
            window._editingBranchId = null;
            document.getElementById('branchName').value = '';
            document.getElementById('branchCity').value = '';
            document.getElementById('branchCountry').value = '';
            const btnSave = document.getElementById('btnBranchSave');
            const btnCancel = document.getElementById('btnBranchCancel');
            if (btnSave) btnSave.textContent = t('add_branch');
            if (btnCancel) btnCancel.style.display = 'none';
        }

        async function loadSupervisionFiltersInit() {
            await loadBranchesForSelect(['supBranch', 'supActBranch']);
            const deptRes = await apiFetch('/api/departments?all=1');
            if (deptRes.ok && deptRes.data && deptRes.data.data) {
                const sel = document.getElementById('supDept');
                if (sel) sel.innerHTML = '<option value="">' + t('all_departments') + '</option>' + deptRes.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
            }
            const userRes = await apiFetch('/api/users');
            if (userRes.ok && userRes.data && userRes.data.data) {
                const anyOpt = '<option value="">' + t('any_assignee') + '</option>' + userRes.data.data.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email || '') + '</option>'; }).join('');
                const allOpt = '<option value="">' + t('all_users') + '</option>' + userRes.data.data.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email || '') + '</option>'; }).join('');
                const u1 = document.getElementById('supUser'); if (u1) u1.innerHTML = anyOpt;
                const u2 = document.getElementById('supActUser'); if (u2) u2.innerHTML = allOpt;
                const u3 = document.getElementById('supIntChatUser'); if (u3) u3.innerHTML = allOpt;
            }
        }

        async function loadSupervisionPerformance() {
            const el = document.getElementById('supPerformanceContent');
            if (!el) return;
            el.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            el.className = 'empty';
            const res = await apiFetch('/api/supervision/performance');
            if (res.needLogin) return;
            if (!res.ok) { el.innerHTML = t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : ''); return; }
            const d = res.data;
            const summary = d.summary || {};
            let html = '<div class="sup-stat-cards stat-cards">';
            html += '<div class="stat-card"><div class="val">' + (summary.conversationCount || 0) + '</div><div class="label">' + t('total_conversations') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.messageCount || 0) + '</div><div class="label">' + t('outgoing_messages') + '</div></div>';
            html += '<div class="stat-card stat-card-accent"><div class="val">' + (summary.openCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'باز' : 'Open') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.pendingCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'در انتظار' : 'Pending') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.unassignedCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.todayMessageCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'پیام امروز' : 'Today') + '</div></div>';
            if (summary.avgResponseTimeMinutes != null) html += '<div class="stat-card"><div class="val">' + summary.avgResponseTimeMinutes + '</div><div class="label">' + (t('avg_response_time') || (LANG === 'fa' ? 'میانگین زمان پاسخ (دقیقه)' : 'Avg response (min)')) + '</div></div>';
            if (summary.avgRating != null) html += '<div class="stat-card"><div class="val">' + summary.avgRating + ' ★</div><div class="label">' + (t('avg_rating') || (LANG === 'fa' ? 'میانگین رضایت' : 'Avg rating')) + '</div></div>';
            if (summary.ratedConversationsCount != null && summary.ratedConversationsCount > 0) html += '<div class="stat-card"><div class="val">' + summary.ratedConversationsCount + '</div><div class="label">' + (t('rated_conversations') || (LANG === 'fa' ? 'مکالمات رتبه‌دار' : 'Rated')) + '</div></div>';
            html += '</div>';
            if (d.branches && d.branches.length) {
                html += '<h3 class="sup-section-title">' + t('sup_by_branch') + '</h3><div class="sup-branch-cards">';
                d.branches.forEach(function(b) {
                    const extra = (b.avgResponseTimeMinutes != null) ? '<div class="sup-branch-extra">' + (LANG === 'fa' ? 'زمان پاسخ: ' : 'Response: ') + b.avgResponseTimeMinutes + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min') + '</div>' : '';
                    html += '<div class="sup-branch-card"><div class="sup-branch-name">' + escapeHtml(b.name) + '</div><div class="sup-branch-meta">' + escapeHtml((b.city || '') + (b.city && b.country ? ' \u00B7 ' : '') + (b.country || '')) + '</div><div class="sup-branch-count">' + (b.conversationCount || 0) + '</div>' + extra + '</div>';
                });
                html += '</div>';
            }
            if (d.users && d.users.length) {
                html += '<h3 class="sup-section-title">' + t('sup_by_user') + '</h3><div class="sup-user-cards">';
                d.users.forEach(function(u) { const bn = (u.branch && u.branch.name) ? u.branch.name : ''; html += '<div class="sup-user-card" data-user-id="' + escapeHtml(u.id) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" title="' + (LANG === 'fa' ? 'جزئیات فعالیت' : 'Activity detail') + '"><div class="sup-user-name">' + escapeHtml(u.name || u.email || '') + '</div><div class="sup-user-meta">' + (u.branch && u.branch.name ? escapeHtml(u.branch.name) : '�') + '</div><div class="sup-user-count">' + (u.outgoingMessageCount || 0) + '</div>' + (function() { const u2 = u; const extras = []; if (u2.avgResponseTimeMinutes != null) extras.push((LANG === 'fa' ? 'زمان پاسخ: ' : 'Response: ') + u2.avgResponseTimeMinutes + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min')); if (u2.avgRating != null) extras.push((LANG === 'fa' ? 'رضایت: ' : 'Rating: ') + u2.avgRating + ' ★'); return extras.length ? '<div class="sup-user-extra">' + extras.join(' · ') + '</div>' : ''; })() + '</div>'; });
                html += '</div>';
            }
            el.className = '';
            el.innerHTML = html || '<div class="empty">' + t('no_data') + '</div>';
        }

        async function loadSupervisionConversations() {
            const list = document.getElementById('supConvList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const branchId = document.getElementById('supBranch') && document.getElementById('supBranch').value ? document.getElementById('supBranch').value : '';
            const deptId = document.getElementById('supDept') && document.getElementById('supDept').value ? document.getElementById('supDept').value : '';
            const userId = document.getElementById('supUser') && document.getElementById('supUser').value ? document.getElementById('supUser').value : '';
            const status = document.getElementById('supStatus') && document.getElementById('supStatus').value ? document.getElementById('supStatus').value : '';
            const unassigned = document.getElementById('supUnassigned') && document.getElementById('supUnassigned').checked;
            let q = '?limit=50';
            if (branchId) q += '&branchId=' + encodeURIComponent(branchId);
            if (deptId) q += '&departmentId=' + encodeURIComponent(deptId);
            if (userId) q += '&userId=' + encodeURIComponent(userId);
            if (status) q += '&status=' + encodeURIComponent(status);
            if (unassigned) q += '&unassigned=1';
            const res = await apiFetch('/api/supervision/conversations' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data.data || [];
            const total = res.data.total || data.length;
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('empty_conv') + '</div>'; return; }
            const dash = '\u2014';
            list.innerHTML = '<div class="sup-conv-count">' + total + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conversations') + '</div><table class="sup-table sup-responsive-table sup-conv-table"><thead><tr><th>' + t('th_customer') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_dept') + '</th><th>' + t('th_assignee') + '</th><th>' + t('th_status') + '</th><th>' + (LANG === 'fa' ? 'آخرین پیام' : 'Last') + '</th></tr></thead><tbody>' + data.map(function(c) {
                const cust = c.customer || {};
                const branch = c.branch ? c.branch.name : '\u2014';
                const dept = c.department ? c.department.name : '\u2014';
                const assignee = userDisplay(c.assignee) || '\u2014';
                const cl = [t('th_customer'),t('th_branch'),t('th_dept'),t('th_assignee'),t('th_status'),(LANG === 'fa' ? 'آخرین پیام' : 'Last')]; const lm = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'datetime') : dash; return '<tr><td data-label="'+cl[0]+'">' + escapeHtml(cust.name || cust.phone || '\u2014') + '</td><td data-label="'+cl[1]+'">' + escapeHtml(branch) + '</td><td data-label="'+cl[2]+'">' + escapeHtml(dept) + '</td><td data-label="'+cl[3]+'">' + escapeHtml(assignee) + '</td><td data-label="'+cl[4]+'">' + (c.status || '\u2014') + '</td><td data-label="'+cl[5]+'">' + lm + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        async function loadStaffActivity() {
            const onlineList = document.getElementById('onlineStaffList');
            const loginsList = document.getElementById('loginsList');
            const countEl = document.getElementById('onlineCount');
            const loginsTodayEl = document.getElementById('loginsTodayCount');
            const loginsTotalEl = document.getElementById('loginsTotalCount');
            
            const updatedEl = document.getElementById('staffActivityUpdated');
            if (onlineList) onlineList.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (loginsList) loginsList.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const onlineRes = await apiFetch('/api/supervision/online');
            if (onlineRes.needLogin) return;
            if (onlineRes.ok && onlineRes.data && onlineRes.data.data) {
                const users = onlineRes.data.data;
                if (countEl) countEl.textContent = users.length;
                if (onlineList) {
                    if (users.length === 0) onlineList.innerHTML = '<div class="empty">' + t('no_staff_online') + '</div>';
                    else onlineList.innerHTML = '<table class="sup-table staff-table"><thead><tr><th>' + t('label_name') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_status') + '</th><th>' + t('th_last_login') + '</th><th>' + t('th_ip') + '</th><th>' + t('th_country') + '</th></tr></thead><tbody>' + users.map(function(u) {
                        const statusClass = (u.status || 'offline').toLowerCase();
                        const statusLabel = { online: t('status_online'), away: t('status_away'), busy: t('status_busy'), offline: t('status_offline') }[statusClass] || u.status;
                        const lastLogin = u.lastLoginAt ? fmtTZ(u.lastLoginAt, 'datetime') : '�';
                        const branchName = (u.branch && u.branch.name) ? u.branch.name : '�';
                        const ip = u.lastLoginIp || '\u2014'; const country = u.lastLoginCountry || '\u2014';
                        const lbl = [t('label_name'),t('th_email'),t('th_branch'),t('th_status'),t('th_last_login'),t('th_ip'),t('th_country')]; return '<tr class="staff-row" data-user-id="' + escapeHtml(u.id || '') + '" onclick="var uid=this.getAttribute(\'data-user-id\');if(uid&&event.target.tagName!==\'A\')openStaffDetailModal(uid)" style="cursor:pointer"><td data-label="'+lbl[0]+'">' + escapeHtml(userDisplay(u)) + '</td><td data-label="'+lbl[1]+'">' + escapeHtml(u.email || '\u2014') + '</td><td data-label="'+lbl[2]+'">' + escapeHtml(branchName) + '</td><td data-label="'+lbl[3]+'"><span class="status-dot ' + statusClass + '"></span>' + statusLabel + '</td><td data-label="'+lbl[4]+'">' + lastLogin + '</td><td data-label="'+lbl[5]+'" dir="ltr">' + escapeHtml(ip) + '</td><td data-label="'+lbl[6]+'">' + escapeHtml(country) + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else { if (onlineList) onlineList.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; if (countEl) countEl.textContent = '0'; }
            const loginsRes = await apiFetch('/api/supervision/logins?limit=50');
            if (loginsRes.needLogin) return;
            if (loginsRes.ok && loginsRes.data && loginsRes.data.data) {
                const rows = loginsRes.data.data;
                const todayStr = fmtTZ(new Date(), 'date');
                function isToday(d) { try { return d && fmtTZ(d, 'date') === todayStr; } catch(e) { return false; } }
                const loginsToday = rows.filter(function(r) { return isToday(r.createdAt); }).length;
                if (loginsTodayEl) loginsTodayEl.textContent = loginsToday;
                if (loginsTotalEl) loginsTotalEl.textContent = rows.length;
                if (loginsList) {
                    if (rows.length === 0) loginsList.innerHTML = '<div class="empty">' + t('empty_no_logins') + '</div>';
                    else loginsList.innerHTML = '<table class="sup-table staff-table"><thead><tr><th>' + t('th_user') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_login_time') + '</th><th>' + t('th_ip') + '</th><th>' + t('th_country') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + rows.map(function(r) {
                        const user = r.user || {};
                        const branch = r.branch ? r.branch.name : '�';
                        const time = r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '';
                        const uid = r.userId || (user && user.id) || '';
                        const rowAttrs = uid ? ' class="staff-row" data-user-id="' + escapeHtml(uid) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" style="cursor:pointer"' : '';
                        const ip = r.ip || '\u2014'; const country = r.country || '\u2014';
                        const ll = [t('th_user'),t('th_email'),t('th_branch'),t('th_login_time'),t('th_ip'),t('th_country'),t('th_summary')]; return '<tr' + rowAttrs + '><td data-label="'+ll[0]+'">' + escapeHtml(userDisplay(user)) + '</td><td data-label="'+ll[1]+'">' + escapeHtml(user.email || '\u2014') + '</td><td data-label="'+ll[2]+'">' + escapeHtml(branch) + '</td><td data-label="'+ll[3]+'">' + time + '</td><td data-label="'+ll[4]+'" dir="ltr">' + escapeHtml(ip) + '</td><td data-label="'+ll[5]+'">' + escapeHtml(country) + '</td><td data-label="'+ll[6]+'">' + escapeHtml(r.summary || '') + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else { if (loginsList) loginsList.innerHTML = '<div class="empty">' + t('login_err_load') + '</div>'; if (loginsTodayEl) loginsTodayEl.textContent = '0'; if (loginsTotalEl) loginsTotalEl.textContent = '0'; }
            if (updatedEl) { updatedEl.style.display = 'block'; updatedEl.textContent = (LANG === 'fa' ? 'آخرین به\u200Cروزرسانی: ' : 'Last updated: ') + fmtTZ(new Date().toISOString(), 'datetime'); }
            loadAttendanceReportFilters().then(function() { loadAttendanceReport(); });
        }

        async function loadAttendanceReportFilters() {
            const branchSel = document.getElementById('attendanceBranch');
            const userSel = document.getElementById('attendanceUser');
            const fromInp = document.getElementById('attendanceFrom');
            const toInp = document.getElementById('attendanceTo');
            if (!branchSel && !userSel) return;
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            if (fromInp) fromInp.value = fmtTZ(firstDay, 'date');
            if (toInp) toInp.value = fmtTZ(today, 'date');
            const [branchRes, userRes] = await Promise.all([apiFetch('/api/branches'), apiFetch('/api/users')]);
            if (branchRes.ok && branchRes.data && branchRes.data.data && branchSel) {
                branchSel.innerHTML = '<option value="">' + (t('all_branches') || 'همه شعب') + '</option>' + branchRes.data.data.filter(function(b){ return b.isActive !== false; }).map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
            }
            if (userRes.ok && userRes.data && userRes.data.data && userSel) {
                userSel.innerHTML = '<option value="">' + (t('all_users') || 'همه کاربران') + '</option>' + userRes.data.data.filter(function(u){ return u.isActive !== false; }).map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(userDisplay(u)) + '</option>'; }).join('');
            }
        }

        async function loadAttendanceReport() {
            const el = document.getElementById('attendanceReportContent');
            if (!el) return;
            el.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const branchId = (document.getElementById('attendanceBranch') && document.getElementById('attendanceBranch').value) || '';
            const userId = (document.getElementById('attendanceUser') && document.getElementById('attendanceUser').value) || '';
            const from = (document.getElementById('attendanceFrom') && document.getElementById('attendanceFrom').value) || '';
            const to = (document.getElementById('attendanceTo') && document.getElementById('attendanceTo').value) || '';
            let q = '?';
            if (branchId) q += 'branchId=' + encodeURIComponent(branchId) + '&';
            if (userId) q += 'userId=' + encodeURIComponent(userId) + '&';
            if (from) q += 'from=' + encodeURIComponent(from) + '&';
            if (to) q += 'to=' + encodeURIComponent(to) + '&';
            const res = await apiFetch('/api/supervision/attendance-report' + q);
            if (res.needLogin) return;
            if (!res.ok) { el.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            const d = res.data;
            const summary = d.summary || [];
            const sessions = d.sessions || [];
            if (summary.length === 0 && sessions.length === 0) { el.innerHTML = '<div class="empty">' + (t('no_data') || 'داده‌ای یافت نشد') + '</div>'; return; }
            let html = '<div class="attendance-summary-table-wrap"><table class="sup-table attendance-summary-table"><thead><tr><th>' + (t('label_name') || 'نام') + '</th><th>' + (LANG === 'fa' ? 'جمع ساعات' : 'Total hours') + '</th><th>' + (LANG === 'fa' ? 'دقیقه' : 'Minutes') + '</th></tr></thead><tbody>';
            summary.forEach(function(s) { html += '<tr><td>' + escapeHtml(s.userName || '') + '</td><td>' + (s.totalHours || 0) + '</td><td>' + (s.totalMinutes || 0) + '</td></tr>'; });
            html += '</tbody></table></div>';
            if (sessions.length > 0 && sessions.length <= 100) {
                html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'جلسات (ورود/خروج)' : 'Sessions') + '</h4><table class="sup-table"><thead><tr><th>' + (t('label_name') || 'نام') + '</th><th>' + (LANG === 'fa' ? 'ورود' : 'Login') + '</th><th>' + (LANG === 'fa' ? 'خروج' : 'Logout') + '</th><th>' + (LANG === 'fa' ? 'دقیقه' : 'Min') + '</th></tr></thead><tbody>';
                const userMap = {};
                summary.forEach(function(s) { userMap[s.userId] = s.userName; });
                sessions.forEach(function(s) { const login = s.loginAt ? fmtTZ(s.loginAt, 'datetime') : '\u2014'; const logout = s.logoutAt ? fmtTZ(s.logoutAt, 'datetime') : (LANG === 'fa' ? 'در حال حاضر' : 'Now'); html += '<tr><td>' + escapeHtml(userMap[s.userId] || s.userId) + '</td><td>' + login + '</td><td>' + logout + '</td><td>' + (s.minutes || 0) + '</td></tr>'; });
                html += '</tbody></table>';
            }
            el.innerHTML = html;
        }

        function openStaffDetailModal(userId) {
            if (!userId) return;
            const modal = document.getElementById('staffDetailModal');
            const loading = document.getElementById('staffDetailLoading');
            const content = document.getElementById('staffDetailContent');
            if (!modal || !loading || !content) return;
            modal.style.display = 'flex';
            loading.style.display = 'block';
            content.style.display = 'none';
            content.innerHTML = '';
            loadStaffDetail(userId);
        }
        function closeStaffDetailModal() {
            const modal = document.getElementById('staffDetailModal');
            if (modal) modal.style.display = 'none';
        }
        async function loadStaffDetail(userId) {
            const loading = document.getElementById('staffDetailLoading');
            const content = document.getElementById('staffDetailContent');
            if (!userId || !loading || !content) return;
            try {
                const res = await apiFetch('/api/supervision/user/' + encodeURIComponent(userId) + '/detail');
                loading.style.display = 'none';
                content.style.display = 'block';
                if (res.needLogin || !res.ok) { content.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('loading_err')) + '</div>'; return; }
                const d = res.data;
                const u = d.user || {};
                const s = d.stats || {};
                const actLabels = { message_sent: t('action_message_sent'), conversation_assigned: t('action_conv_assigned'), customer_note_added: (LANG === 'fa' ? 'ثبت گزارش/یادداشت' : 'Customer note') };
                let html = '<div class="staff-detail-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px;">';
                html += '<div class="stat-card"><div class="val">' + (s.onlineHoursTotal || '0') + '</div><div class="label">' + (LANG === 'fa' ? 'ساعت آنلاین (کل)' : 'Hours online') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.sessionsCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'تعداد نشست' : 'Sessions') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.conversationsAssigned || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'مکالمه تخصیص‌یافته' : 'Conversations') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.messagesSent || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'پیام ارسالی' : 'Messages sent') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.ticketsCreated || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'تیکت ثبت‌شده' : 'Tickets created') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.ticketsReplied || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'پاسخ تیکت' : 'Ticket replies') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.tasksCompleted || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'تسک انجام‌شده' : 'Tasks completed') + '</div></div>';
                html += '</div>';
                if (d.sessions && d.sessions.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'ورود و خروج' : 'Login & Logout') + '</h4>';
                    html += '<table class="sup-table"><thead><tr><th>' + (LANG === 'fa' ? 'ورود' : 'Login') + '</th><th>' + (LANG === 'fa' ? 'خروج' : 'Logout') + '</th><th>' + (LANG === 'fa' ? 'دقایق' : 'Minutes') + '</th></tr></thead><tbody>';
                    d.sessions.forEach(function(s) {
                        const login = s.loginAt ? fmtTZ(s.loginAt, 'datetime') : '\u2014';
                        const logout = s.logoutAt ? fmtTZ(s.logoutAt, 'datetime') : (LANG === 'fa' ? 'در حال حاضر' : 'Now');
                        html += '<tr><td>' + login + '</td><td>' + logout + '</td><td>' + (s.minutes || 0) + '</td></tr>';
                    });
                    html += '</tbody></table>';
                }
                if (d.conversations && d.conversations.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'مکالمات تخصیص‌یافته (با چه کسانی صحبت کرده)' : 'Assigned conversations (who they talked to)') + '</h4>';
                    html += '<div class="staff-conv-list" style="max-height:200px;overflow-y:auto;">';
                    d.conversations.forEach(function(c) {
                        const custName = (c.customer && (c.customer.name || c.customer.phone)) ? (c.customer.name || c.customer.phone) : (LANG === 'fa' ? 'مشتری' : 'Customer');
                        const lastMsg = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'datetime') : '';
                        const safeName = (custName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        html += '<div class="staff-conv-item" data-convid="' + escapeHtml(c.id) + '" data-custname="' + escapeHtml(safeName) + '" onclick="var el=event.currentTarget;openChat(el.getAttribute(\'data-convid\'),el.getAttribute(\'data-custname\')||\'\',\'\');showPage(\'conversations\');closeStaffDetailModal();" style="padding:10px 12px;margin-bottom:6px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;transition:background 0.2s;"><div style="font-weight:600;">' + escapeHtml(custName) + '</div><div style="font-size:0.8rem;color:var(--text-muted);">' + lastMsg + '</div></div>';
                    });
                    html += '</div>';
                }
                if (d.recentActivities && d.recentActivities.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'آخرین فعالیت‌ها' : 'Recent activities') + '</h4>';
                    html += '<table class="sup-table"><thead><tr><th>' + t('th_time') + '</th><th>' + t('th_action') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>';
                    d.recentActivities.forEach(function(a) {
                        html += '<tr><td>' + (a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '') + '</td><td>' + escapeHtml(actLabels[a.action] || a.action || '') + '</td><td>' + escapeHtml(a.summary || '') + '</td></tr>';
                    });
                    html += '</tbody></table>';
                }
                if (!d.sessions || d.sessions.length === 0) { if (!d.recentActivities || d.recentActivities.length === 0) { if (!d.conversations || d.conversations.length === 0) html += '<p class="text-muted" style="font-size:0.9rem;">' + (LANG === 'fa' ? 'ورود/خروج ثبت‌شده‌ای یافت نشد. با خروج صحیح از سیستم، ساعات آنلاین دقیق‌تر محاسبه می‌شود.' : 'No login/logout records yet.') + '</p>'; } }
                content.innerHTML = html;
                const titleEl = document.getElementById('staffDetailTitle');
                if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'جزئیات فعالیت: ' : 'Activity: ') + (userDisplay(u) || u.email || userId);
            } catch (e) { loading.style.display = 'none'; content.style.display = 'block'; content.innerHTML = '<div class="empty">' + (e.message || t('loading_err')) + '</div>'; }
        }

        async function loadSupervisionActivity() {
            const list = document.getElementById('supActList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const branchId = document.getElementById('supActBranch') && document.getElementById('supActBranch').value ? document.getElementById('supActBranch').value : '';
            const userId = document.getElementById('supActUser') && document.getElementById('supActUser').value ? document.getElementById('supActUser').value : '';
            const action = document.getElementById('supActAction') && document.getElementById('supActAction').value ? document.getElementById('supActAction').value : '';
            let q = '?limit=100';
            if (branchId) q += '&branchId=' + encodeURIComponent(branchId);
            if (userId) q += '&userId=' + encodeURIComponent(userId);
            if (action) q += '&action=' + encodeURIComponent(action);
            const res = await apiFetch('/api/supervision/activity' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('no_data') + '</div>'; return; }
            list.innerHTML = '<table class="sup-table sup-responsive-table"><thead><tr><th>' + t('th_time') + '</th><th>' + t('th_user') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_action') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + data.map(function(a) {
                const time = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                const user = userDisplay(a.user) || '�';
                const branch = a.branch ? a.branch.name : '�';
                const al = [t('th_time'),t('th_user'),t('th_branch'),t('th_action'),t('th_summary')]; return '<tr><td data-label="'+al[0]+'">' + time + '</td><td data-label="'+al[1]+'">' + escapeHtml(user) + '</td><td data-label="'+al[2]+'">' + escapeHtml(branch) + '</td><td data-label="'+al[3]+'">' + escapeHtml(a.action || '') + '</td><td data-label="'+al[4]+'">' + escapeHtml(a.summary || '') + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        async function loadSupervisionInternalChats() {
            const list = document.getElementById('supIntChatList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const userId = document.getElementById('supIntChatUser') && document.getElementById('supIntChatUser').value ? document.getElementById('supIntChatUser').value : '';
            let q = '?limit=50&page=1';
            if (userId) q += '&userId=' + encodeURIComponent(userId);
            const res = await apiFetch('/api/supervision/internal-chats' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('loading_err')) + '</div>'; return; }
            const data = res.data.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'چت داخلی‌ای یافت نشد.' : 'No internal chats.') + '</div>'; return; }
            list.innerHTML = '<table class="sup-table sup-responsive-table"><thead><tr><th>' + (LANG === 'fa' ? 'شرکت‌کنندگان' : 'Participants') + '</th><th>' + (LANG === 'fa' ? 'آخرین پیام' : 'Last message') + '</th><th>' + (LANG === 'fa' ? 'عملیات' : 'Action') + '</th></tr></thead><tbody>' + data.map(function(t) {
                const names = (t.participants || []).map(function(p) { return p.name || p.email || ''; }).join(', ');
                const last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 60) + ((t.lastMessage.content || '').length > 60 ? '\u2026' : '') : '\u2014';
                const from = t.lastMessage && t.lastMessage.fromUser ? t.lastMessage.fromUser.name || '' : '';
                return '<tr><td data-label="' + (LANG === 'fa' ? 'شرکت\u200Cکنندگان' : 'Participants') + '">' + escapeHtml(names || '\u2014') + '</td><td data-label="' + (LANG === 'fa' ? 'آخرین پیام' : 'Last') + '">' + escapeHtml(last) + (from ? ' <span class="text-muted">(' + escapeHtml(from) + ')</span>' : '') + '</td><td data-label="' + (LANG === 'fa' ? 'عملیات' : 'Action') + '"><button type="button" class="btn-secondary btn-sm" onclick="openSupInternalChatDetail(\'' + escapeHtml(t.id) + '\')">' + (LANG === 'fa' ? 'مشاهده' : 'View') + '</button></td></tr>';
            }).join('') + '</tbody></table>';
        }
        function openSupInternalChatDetail(threadId) {
            const modal = document.getElementById('supInternalChatDetailModal');
            const content = document.getElementById('supIntChatModalContent');
            const titleEl = document.getElementById('supIntChatModalTitle');
            if (!modal || !content) return;
            modal.style.display = 'flex';
            content.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            (async function() {
                const res = await apiFetch('/api/supervision/internal-chats/' + encodeURIComponent(threadId) + '/messages');
                if (res.needLogin || !res.ok) { content.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error || t('loading_err')) + '</div>'; return; }
                const messages = res.data.data || [];
                const thread = res.data.thread || {};
                const partNames = (thread.participants || []).map(function(p) { return p.name || p.email; }).join(', ');
                if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'چت: ' : 'Chat: ') + (partNames || threadId);
                if (messages.length === 0) { content.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'پیامی در این گفتگو نیست.' : 'No messages.') + '</div>'; return; }
                let html = '<div class="sup-int-chat-messages" style="display:flex;flex-direction:column;gap:12px;">';
                messages.forEach(function(m) {
                    const fromName = (m.fromUser && m.fromUser.name) || (m.fromUser && m.fromUser.email) || '';
                    const att = (m.attachments && m.attachments.length) ? m.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent);">\uD83D\uDCCE ' + escapeHtml(a.name || '') + '</a>'; }).join(' ') : '';
                    html += '<div style="padding:12px 16px;background:var(--bg-secondary);border-radius:10px;border:1px solid var(--border);"><div style="font-weight:600;margin-bottom:6px;color:var(--accent);">' + escapeHtml(fromName) + '</div><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">' + (m.createdAt ? fmtTZ(m.createdAt, 'datetime') : '') + '</div></div>';
                });
                html += '</div>';
                content.innerHTML = html;
            })();
        }
        function closeSupInternalChatModal() {
            const modal = document.getElementById('supInternalChatDetailModal');
            if (modal) modal.style.display = 'none';
        }

        document.querySelectorAll('.sup-tab').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                document.querySelectorAll('.sup-tab').forEach(function(b) { b.classList.remove('active'); if (b.getAttribute('data-tab') === tab) b.classList.add('active'); });
                document.querySelectorAll('.sup-panel').forEach(function(p) { p.classList.remove('show'); if ((p.id === 'supPerformance' && tab === 'performance') || (p.id === 'supConversations' && tab === 'conversations') || (p.id === 'supInternalChats' && tab === 'internal-chats') || (p.id === 'supActivity' && tab === 'activity')) p.classList.add('show'); });
                if (tab === 'performance') loadSupervisionPerformance();
                if (tab === 'conversations') loadSupervisionConversations();
                if (tab === 'internal-chats') loadSupervisionInternalChats();
                if (tab === 'activity') loadSupervisionActivity();
            });
        });

        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showPage(this.getAttribute('data-page'));
            });
        });
        (function initNavSectionToggles() {
            document.querySelectorAll('.sidebar .nav-section-collapsible .nav-section-title').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (window.innerWidth > 900) return;
                    const section = this.closest('.nav-section-collapsible');
                    if (!section) return;
                    const collapsed = section.classList.toggle('collapsed');
                    this.setAttribute('aria-expanded', !collapsed);
                });
            });
        })();
        window.addEventListener('hashchange', function() { if (document.getElementById('app').classList.contains('show')) applyHashRoute(); });
        window.addEventListener('resize', function() {
            if (document.getElementById('app').classList.contains('show')) {
                updateBottomBarVisibility();
                const activePage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
                if (activePage && typeof updateMobileTabBar === 'function') updateMobileTabBar(activePage);
            }
        });

        (function initMobileTicker() {
            const btn = document.getElementById('tickerToggleMobile');
            const ticker = document.getElementById('priceTicker');
            if (!btn || !ticker) return;
            const isMobile = function() { return window.innerWidth <= 900; };
            if (isMobile()) ticker.classList.add('ticker-collapsed');
            window.addEventListener('resize', function() { if (!isMobile()) ticker.classList.remove('ticker-collapsed'); });
            btn.addEventListener('click', function() { ticker.classList.toggle('ticker-collapsed'); });
        })();
        (function initTickerTouchScroll() {
            const items = document.getElementById('tickerItems');
            if (!items) return;
            let touchEndTid = null;
            function addPause() {
                items.classList.add('ticker-touch-active');
                if (touchEndTid) clearTimeout(touchEndTid);
            }
            function removePauseLater() {
                touchEndTid = setTimeout(function() { items.classList.remove('ticker-touch-active'); touchEndTid = null; }, 400);
            }
            items.addEventListener('touchstart', addPause, { passive: true });
            items.addEventListener('touchend', removePauseLater, { passive: true });
            items.addEventListener('touchcancel', removePauseLater, { passive: true });
        })();
        (function initChatMediaLinks() {
            document.addEventListener('click', function(e) {
                const chatEl = document.getElementById('chatMessages');
                if (!chatEl || !chatEl.contains(e.target)) return;
                const a = e.target.closest && e.target.closest('.msg-media a[href], a.msg-media-link, a.msg-file-link');
                if (!a || !a.href) return;
                if (e.ctrlKey || e.metaKey || e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                window.open(a.href, '_blank', 'noopener,noreferrer');
            });
        })();
        (function initFooterYear() {
            const el = document.getElementById('appFooterYear');
            if (el) el.textContent = new Date().getFullYear();
        })();

        (function initLang() {
            const l = localStorage.getItem('crm_lang') || 'fa';
            setLang(l);
        })();

        (function exposeOnclickHandlers() {
            window.login = login;
            window.logout = logout;
            window.showPage = showPage;
            window.savePanelSettings = savePanelSettings;
            window.loadPanelSettings = loadPanelSettings;
            window.sendPanelTestEmail = sendPanelTestEmail;
            window.syncSmtpPortWithSecure = syncSmtpPortWithSecure;
            window.syncSmtpSecureWithPort = syncSmtpSecureWithPort;
            window.previewPanelLogo = previewPanelLogo;
            window.previewPanelFavicon = previewPanelFavicon;
            window.updatePanelLivePreview = updatePanelLivePreview;
            window.userPermsSelectAll = userPermsSelectAll;
            window.userPermsSelectGroup = userPermsSelectGroup;
            window.openUserEdit = openUserEdit;
            window.closeUserEditModal = closeUserEditModal;
            window.toggleUserForm = toggleUserForm;
            window.addUser = addUser;
            window.saveUserEdit = saveUserEdit;
            window.openDeleteUserModal = openDeleteUserModal;
            window.closeDeleteUserModal = closeDeleteUserModal;
            window.confirmDeleteUser = confirmDeleteUser;
            window.openStaffDetailModal = openStaffDetailModal;
            window.closeStaffDetailModal = closeStaffDetailModal;
            window.verifyTotpLogin = verifyTotpLogin;
            window.backToLoginStep1 = backToLoginStep1;
            window.closeSidebarMobile = closeSidebarMobile;
            window.toggleSidebarMobile = toggleSidebarMobile;
            window.toggleSidebarDesktop = toggleSidebarDesktop;
            window.doHeaderSearch = doHeaderSearch;
            let headerSearchModalEscHandler = null;
            window.openHeaderSearchPopup = function() {
                const m = document.getElementById('headerSearchModal');
                const inp = document.getElementById('headerSearchModalInput');
                if (m && inp) {
                    const mainInp = document.getElementById('headerSearch');
                    if (mainInp && mainInp.value) inp.value = mainInp.value;
                    m.style.display = 'flex';
                    m.setAttribute('aria-hidden', 'false');
                    setTimeout(function() { inp.focus(); }, 100);
                    if (headerSearchModalEscHandler) document.removeEventListener('keydown', headerSearchModalEscHandler);
                    headerSearchModalEscHandler = function(e) {
                        if (e.key === 'Escape') {
                            closeHeaderSearchPopup();
                        }
                    };
                    document.addEventListener('keydown', headerSearchModalEscHandler);
                }
            };
            window.closeHeaderSearchPopup = function() {
                const m = document.getElementById('headerSearchModal');
                if (m) {
                    m.style.display = 'none';
                    m.setAttribute('aria-hidden', 'true');
                    if (headerSearchModalEscHandler) {
                        document.removeEventListener('keydown', headerSearchModalEscHandler);
                        headerSearchModalEscHandler = null;
                    }
                }
            };
            window.doHeaderSearchFromModal = function() {
                const modalInp = document.getElementById('headerSearchModalInput');
                const mainInp = document.getElementById('headerSearch');
                if (modalInp && mainInp) {
                    mainInp.value = modalInp.value;
                    doHeaderSearch();
                    closeHeaderSearchPopup();
                }
            };
            window.toggleLangDropdown = function() {
                const btn = document.getElementById('langDropdownBtn');
                const wrap = btn ? btn.closest('.lang-dropdown-wrap') : null;
                if (!wrap) return;
                wrap.classList.toggle('open');
                const menu = document.getElementById('langDropdownMenu');
                if (menu && btn) {
                    const open = wrap.classList.contains('open');
                    menu.setAttribute('aria-hidden', !open);
                    btn.setAttribute('aria-expanded', open);
                    if (open) {
                        const closeOnOutside = function(e) {
                            if (!wrap.contains(e.target)) {
                                closeLangDropdown();
                                document.removeEventListener('click', closeOnOutside);
                            }
                        };
                        setTimeout(function() { document.addEventListener('click', closeOnOutside); }, 0);
                    }
                }
            };
            window.closeLangDropdown = function() {
                const wrap = document.querySelector('.lang-dropdown-wrap.open');
                if (wrap) {
                    wrap.classList.remove('open');
                    const menu = document.getElementById('langDropdownMenu');
                    const btn = document.getElementById('langDropdownBtn');
                    if (menu) menu.setAttribute('aria-hidden', 'true');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            };
            window.toggleUserDropdown = function(e) {
                if (e) e.stopPropagation();
                const header = document.querySelector('header.header');
                const menu = document.getElementById('userDropdownMenu');
                const trigger = document.getElementById('userDropdownTrigger');
                const triggerMobile = document.getElementById('userDropdownTriggerMobile');
                if (!header || !menu) return;
                const open = header.classList.toggle('user-dropdown-open');
                menu.setAttribute('aria-hidden', !open);
                if (trigger) trigger.setAttribute('aria-expanded', open);
                if (triggerMobile) triggerMobile.setAttribute('aria-expanded', open);
                if (open) {
                    closeLangDropdown();
                    const closeOnOutside = function(ev) {
                        if (!header.contains(ev.target)) {
                            closeUserDropdown();
                            document.removeEventListener('click', closeOnOutside);
                        }
                    };
                    setTimeout(function() { document.addEventListener('click', closeOnOutside); }, 0);
                }
            };
            window.closeUserDropdown = function() {
                const header = document.querySelector('header.header');
                const menu = document.getElementById('userDropdownMenu');
                const trigger = document.getElementById('userDropdownTrigger');
                const triggerMobile = document.getElementById('userDropdownTriggerMobile');
                if (header) header.classList.remove('user-dropdown-open');
                if (menu) menu.setAttribute('aria-hidden', 'true');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
                if (triggerMobile) triggerMobile.setAttribute('aria-expanded', 'false');
            };
            // event delegation برای notify dropdown و دکمه زنگوله - یک بار bind می‌شود
            (function() {
                // handler برای dropdown items
                const dropdown = document.getElementById('headerNotifyDropdown');
                if (dropdown) {
                    dropdown.addEventListener('click', function(e) {
                        const item = e.target.closest('[data-action]');
                        if (!item) return;
                        e.preventDefault();
                        const action = item.getAttribute('data-action');
                        const id = item.getAttribute('data-id');
                        if (action === 'open-ann' && id) {
                            closeNotifyDropdown();
                            if (typeof markAnnouncementReadAndShow === 'function') markAnnouncementReadAndShow(id);
                            showPage('announcements');
                            // کاهش فوری badge
                            if (window.navBadgeCounts.announcements > 0) {
                                window.navBadgeCounts.announcements = Math.max(0, (window.navBadgeCounts.announcements || 1) - 1);
                                if (typeof updateNavBadges === 'function') updateNavBadges();
                            }
                        } else if (action === 'open-ticket' && id) {
                            closeNotifyDropdown();
                            showPage('tickets');
                            setTimeout(function() {
                                if (typeof loadTicketDetail === 'function') loadTicketDetail(id);
                            }, 200);
                        } else if (action === 'close-notify') {
                            closeNotifyDropdown();
                        } else if (action === 'see-all-ann') {
                            closeNotifyDropdown();
                            showPage('announcements');
                        } else if (action === 'see-all-tickets') {
                            closeNotifyDropdown();
                            showPage('tickets');
                        }
                    });
                }
                // handler برای دکمه زنگوله (خارج از dropdown)
                const notifyBtn = document.getElementById('headerNotifyBtn');
                if (notifyBtn) {
                    notifyBtn.addEventListener('click', function(e) {
                        if (typeof toggleNotifyDropdown === 'function') toggleNotifyDropdown(e);
                    });
                }
                const notifyBtnMobile = document.getElementById('headerNotifyBtnMobile');
                if (notifyBtnMobile) {
                    notifyBtnMobile.addEventListener('click', function(e) {
                        if (typeof toggleNotifyDropdown === 'function') toggleNotifyDropdown(e);
                    });
                }
            })();

            let _notifyCloseOnOutside = null;
            window.toggleNotifyDropdown = function(e) {
                if (e) e.stopPropagation();
                const header = document.querySelector('header.header');
                const dropdown = document.getElementById('headerNotifyDropdown');
                const btn = document.getElementById('headerNotifyBtn');
                const btnMobile = document.getElementById('headerNotifyBtnMobile');
                if (!header || !dropdown) return;
                const open = header.classList.toggle('notify-dropdown-open');
                dropdown.setAttribute('aria-hidden', !open);
                if (btn) btn.setAttribute('aria-expanded', open);
                if (btnMobile) btnMobile.setAttribute('aria-expanded', open);
                if (open) {
                    closeUserDropdown();
                    closeLangDropdown();
                    if (dropdown) dropdown.style.display = '';
                    loadNotifyDropdownData();
                    if (_notifyCloseOnOutside) { document.removeEventListener('click', _notifyCloseOnOutside); _notifyCloseOnOutside = null; }
                    _notifyCloseOnOutside = function(ev) {
                        if (!header.contains(ev.target)) {
                            closeNotifyDropdown();
                        }
                    };
                    setTimeout(function() { document.addEventListener('click', _notifyCloseOnOutside); }, 0);
                } else {
                    closeNotifyDropdown();
                }
            };
            window.closeNotifyDropdown = function() {
                const header = document.querySelector('header.header');
                const dropdown = document.getElementById('headerNotifyDropdown');
                const btn = document.getElementById('headerNotifyBtn');
                const btnMobile = document.getElementById('headerNotifyBtnMobile');
                if (header) header.classList.remove('notify-dropdown-open');
                if (dropdown) { dropdown.setAttribute('aria-hidden', 'true'); dropdown.style.display = 'none'; }
                if (btn) btn.setAttribute('aria-expanded', 'false');
                if (btnMobile) btnMobile.setAttribute('aria-expanded', 'false');
                if (_notifyCloseOnOutside) { document.removeEventListener('click', _notifyCloseOnOutside); _notifyCloseOnOutside = null; }
                apiFetch('/api/analytics/dashboard').then(function(r) { if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data); }).catch(function(){});
            };
            window.loadNotifyDropdownData = async function() {
                const perms = (currentUser && currentUser.permissions) || {};
                const canAnn = perms.announcements !== false;
                const canTickets = perms.tickets !== false;
                const arrowSvg = '<span class="notify-item-arrow"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></span>';
                const emptyHtml = function(icon, msg) {
                    return '<div class="notify-empty"><div class="notify-empty-icon">' + icon + '</div><span class="notify-empty-text">' + msg + '</span></div>';
                };
                const annIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
                const ticketIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/></svg>';

                if (canAnn) {
                    const annList = document.getElementById('notifyAnnList');
                    const pendingBadge = document.getElementById('notifyAnnPending');
                    try {
                        const annRes = await apiFetch('/api/announcements/for-me');
                        if (annRes.ok && annRes.data && annRes.data.data) {
                            const anns = (annRes.data.data || []).slice(0, 5);
                            const unreadCount = anns.filter(function(a) { return !a.read; }).length;
                            if (pendingBadge) {
                                pendingBadge.style.display = unreadCount > 0 ? '' : 'none';
                                pendingBadge.innerHTML = '<span id="notifyAnnCount">' + unreadCount + '</span> <span>' + (LANG === 'fa' ? 'جدید' : 'New') + '</span>';
                            }
                            if (annList) {
                                if (anns.length === 0) {
                                    annList.innerHTML = emptyHtml(annIcon, LANG === 'fa' ? 'اعلانی وجود ندارد.' : 'No announcements.');
                                } else {
                                    annList.innerHTML = anns.map(function(a) {
                                        const title = (a.title || '').substring(0, 48) + ((a.title || '').length > 48 ? '…' : '');
                                        const timeStr = a.createdAt && typeof fmtTZ === 'function' ? fmtTZ(a.createdAt, 'datetime') : '';
                                        const unreadClass = !a.read ? ' notify-item-unread' : '';
                                        const dot = !a.read ? '<span class="notify-unread-dot"></span>' : '';
                                        const iconHtml = '<span class="notify-item-icon">' + annIcon + '</span>';
                                        return '<a href="#" class="notify-item' + unreadClass + '" data-action="open-ann" data-id="' + escapeHtml(a.id || '') + '">' + dot + iconHtml + '<div class="notify-item-body"><div class="notify-item-title">' + escapeHtml(title) + '</div>' + (timeStr ? '<div class="notify-item-meta">' + escapeHtml(timeStr) + '</div>' : '') + '</div>' + arrowSvg + '</a>';
                                    }).join('');
                                }
                            }
                        }
                    } catch (err) {
                        if (annList) annList.innerHTML = emptyHtml(annIcon, LANG === 'fa' ? 'خطا در بارگذاری' : 'Load error');
                    }
                }

                if (canTickets) {
                    const ticketsList = document.getElementById('notifyTicketsList');
                    const tkPendingBadge = document.getElementById('notifyTicketsPending');
                    try {
                        const tkRes = await apiFetch('/api/tickets?limit=5');
                        const tkStatsRes = await apiFetch('/api/tickets/stats');
                        let pendingCount = 0;
                        if (tkStatsRes.ok && tkStatsRes.data) {
                            const s = tkStatsRes.data;
                            pendingCount = (s.open || 0) + (s.in_progress || 0);
                        }
                        if (tkPendingBadge) {
                            tkPendingBadge.style.display = pendingCount > 0 ? '' : 'none';
                            tkPendingBadge.innerHTML = '<span id="notifyTicketsCount">' + pendingCount + '</span> <span>' + (LANG === 'fa' ? 'باز' : 'Open') + '</span>';
                        }
                        if (ticketsList && tkRes.ok && tkRes.data) {
                            const rows = Array.isArray(tkRes.data.data) ? tkRes.data.data : (Array.isArray(tkRes.data.rows) ? tkRes.data.rows : []);
                            if (rows.length === 0) {
                                ticketsList.innerHTML = emptyHtml(ticketIcon, LANG === 'fa' ? 'تیکتی وجود ندارد.' : 'No tickets.');
                            } else {
                                const statusMap = { open: LANG === 'fa' ? 'باز' : 'Open', in_progress: LANG === 'fa' ? 'در حال انجام' : 'In progress', closed: LANG === 'fa' ? 'بسته' : 'Closed', resolved: LANG === 'fa' ? 'حل‌شده' : 'Resolved', archived: LANG === 'fa' ? 'آرشیو' : 'Archived' };
                                ticketsList.innerHTML = rows.map(function(tk) {
                                    const title = (tk.title || '').substring(0, 45) + ((tk.title || '').length > 45 ? '…' : '');
                                    const statusLabel = statusMap[tk.status] || tk.status || '';
                                    const isOpen = tk.status === 'open' || tk.status === 'in_progress';
                                    const iconHtml = '<span class="notify-item-icon' + (isOpen ? ' warn' : '') + '">' + ticketIcon + '</span>';
                                    const statusBadge = '<span class="notify-item-status ' + (tk.status || '') + '">' + escapeHtml(statusLabel) + '</span>';
                                    const timeStr = tk.createdAt && typeof fmtTZ === 'function' ? fmtTZ(tk.createdAt, 'date') : '';
                                    return '<a href="#" class="notify-item" data-action="open-ticket" data-id="' + escapeHtml(tk.id || '') + '">' + iconHtml + '<div class="notify-item-body"><div class="notify-item-title">' + escapeHtml(title) + '</div><div class="notify-item-meta">' + statusBadge + (timeStr ? '<span>' + escapeHtml(timeStr) + '</span>' : '') + '</div></div>' + arrowSvg + '</a>';
                                }).join('');
                            }
                        }
                    } catch (err) {
                        if (ticketsList) ticketsList.innerHTML = emptyHtml(ticketIcon, LANG === 'fa' ? 'خطا در بارگذاری' : 'Load error');
                    }
                }
            };
            window.savePanelSettings = savePanelSettings;
            window.loadPanelSettings = loadPanelSettings;
            window.sendPanelTestEmail = sendPanelTestEmail;
            window.syncSmtpPortWithSecure = syncSmtpPortWithSecure;
            window.syncSmtpSecureWithPort = syncSmtpSecureWithPort;
            window.previewPanelLogo = previewPanelLogo;
            window.previewPanelFavicon = previewPanelFavicon;
            window.updatePanelLivePreview = updatePanelLivePreview;
            window.userPermsSelectAll = userPermsSelectAll;
            window.userPermsSelectGroup = userPermsSelectGroup;
            window.openSupInternalChatDetail = openSupInternalChatDetail;
            window.closeSupInternalChatModal = closeSupInternalChatModal;
            window.filterInternalThreads = filterInternalThreads;
            window.toggleInternalChatFloating = toggleInternalChatFloating;
            window.selectThreadInPopup = selectThreadInPopup;
            window.filterInternalThreads = filterInternalThreads;
            window.toggleInternalChatFloating = toggleInternalChatFloating;
        })();

        /** مقداردهی بعد از تأیید /api/auth/me — ناو، تنظیمات، رویدادها، سوکت، نرخ، حضور، TOTP. قابل استخراج به ماژول auth. */
        async function runAfterAuthReady() {
            applyNavByRole();
            await loadPanelSettingsAndApply();
            applyHashRoute();
            loadGeneralAnnouncementsMarquee();
            removeAllInlineHandlers();
            setupGlobalDelegatedHandlers();
            setupLoginEventHandlers();
            setupGlobalEventHandlers();
            checkAnnouncementMarqueeVisibility();
            startRatesInterval();
            startPresenceInterval();
            connectSocket();
            startNavBadgeRefresh();
            showTotpPromptIfNeeded();
        }

        if (token) {
            apiFetch('/api/auth/me').then(async function(res) {
                if (res.needLogin || !res.ok) { logout(); return; }
                const u = res.data;
                currentUser = u;
                if (u && u.email) {
                    setUserDisplay(u);
                    document.documentElement.classList.add('auth-has-token');
                    document.getElementById('loginBox').style.display = 'none';
                    document.getElementById('app').classList.add('show');
                    try {
                        await runAfterAuthReady();
                    } catch (e) { console.error('Post-me init:', e); }
                    const appEl = document.getElementById('app');
                    if (appEl) { appEl.classList.remove('app-loading'); appEl.classList.add('app-ready'); }
                } else { logout(); }
            }).catch(function() { logout(); });
        } else {
            fetch(API + '/api/panel-settings/public/branding').then(function(r) { return r.json(); }).then(function(data) { if (data && (data.siteName != null || data.logoUrl != null || data.faviconUrl != null || data.loginTitle != null || data.pageTitle != null)) applyBranding(data); }).catch(function() {});
        }
