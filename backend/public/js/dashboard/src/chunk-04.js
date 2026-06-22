                        chatBtn.addEventListener('click', function(e) {
                            const cid = chatBtn.getAttribute('data-cust-id');
                            const cn = chatBtn.getAttribute('data-cust-name');
                            const cp = chatBtn.getAttribute('data-cust-phone');
                            startCustomerChat(cid, cn, cp);
                        });
                    }
                    if (editBtn) {
                        editBtn.removeEventListener('click', function() {});
                        editBtn.addEventListener('click', function() { openCustomerModal(c.id); });
                    }
                    if (transBtn) {
                        transBtn.removeEventListener('click', function() {});
                        transBtn.addEventListener('click', function() { openTransactionModal(c.id); });
                    }
                    if (delBtnEl) {
                        delBtnEl.removeEventListener('click', function() {});
                        delBtnEl.addEventListener('click', function() { deleteCustomer(c.id); });
                    }
                }, 50);
            }
            const detailRawPic = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
            const detailPicSrc = customerAvatarDisplaySrc(c);
            const avatarClickable = customerAvatarShowsImage(c);
            const detailAvatarHtml = avatarClickable ? '<span class="customer-detail-avatar-fallback">' + escapeHtml(initial) + '</span><img class="customer-detail-avatar-img" src="' + escapeHtml(detailPicSrc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">' : initial;
            const avatarWrapperClass = 'customer-avatar' + (avatarClickable ? ' customer-avatar-clickable' : '');
            if (cardEl) cardEl.innerHTML = '<div class="' + avatarWrapperClass + '"' + (avatarClickable ? ' data-profile-pic="' + escapeHtml(detailPicSrc) + '" role="button" tabindex="0" title="' + (LANG === 'fa' ? 'کلیک برای بزرگنمایی' : 'Click to enlarge') + '"' : '') + '>' + detailAvatarHtml + '</div><div class="customer-info"><h3>' + escapeHtml(c.name || c.phone) + '</h3><div class="customer-meta">' + (LANG === 'fa' ? 'تلفن: ' : 'Phone: ') + escapeHtml(c.phone || '—') + '</div>' + (c.email ? '<div class="customer-meta">' + (LANG === 'fa' ? 'ایمیل: ' : 'Email: ') + escapeHtml(c.email) + '</div>' : '') + '<div class="customer-meta">' + (LANG === 'fa' ? 'وضعیت: ' : 'Status: ') + '<span class="badge ' + (c.status || 'active') + '">' + statusLabel + '</span> · ' + (LANG === 'fa' ? 'اولین تماس: ' : 'First: ') + firstContact + ' · ' + (LANG === 'fa' ? 'آخرین تماس: ' : 'Last: ') + lastContact + '</div><div class="customer-meta">' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + ' · ' + (c.totalMessages || 0) + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs') + '</div>' + (c.notes ? '<div class="customer-notes">' + escapeHtml(c.notes) + '</div>' : '') + '</div>';
            const res = await apiFetch('/api/customers/' + custId + '/conversations');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            if (!data.data || data.data.length === 0) {
                list.innerHTML = '<div class="cust-hist-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>' + (t('no_conv_history') || (LANG === 'fa' ? 'هیچ مکالمه‌ای ثبت نشده است.' : 'No conversation history.')) + '</p></div>';
            } else {
                const safeName = (c.name || c.phone || name || '').replace(/'/g, '&#39;');
                const statusColors = { open: 'var(--accent)', waiting: '#f59e0b', closed: 'var(--text-muted)', resolved: '#22c55e', archived: 'var(--text-muted)' };
                const statusLabels = { open: LANG === 'fa' ? 'باز' : 'Open', waiting: LANG === 'fa' ? 'در انتظار' : 'Waiting', closed: LANG === 'fa' ? 'بسته' : 'Closed', resolved: LANG === 'fa' ? 'حل‌شده' : 'Resolved', archived: LANG === 'fa' ? 'آرشیو' : 'Archived' };
                list.innerHTML = data.data.map(function(conv) {
                    const date = conv.lastMessageAt ? fmtTZ(conv.lastMessageAt, 'datetime') : (conv.createdAt ? fmtTZ(conv.createdAt, 'datetime') : '');
                    const assignee = conv.assignee && conv.assignee.name ? escapeHtml(conv.assignee.name) : '';
                    const dept = conv.department && conv.department.name ? escapeHtml(conv.department.name) : '';
                    const isGrp = !!(conv.metadata && conv.metadata.isGroup);
                    const st = conv.status || 'open';
                    const stColor = statusColors[st] || 'var(--text-muted)';
                    const stLabel = statusLabels[st] || st;
                    const msgCount = conv.messageCount || 0;
                    const metaParts = [];
                    if (msgCount) metaParts.push(msgCount + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs'));
                    if (assignee) metaParts.push((LANG === 'fa' ? 'مسئول: ' : 'By: ') + assignee);
                    if (dept) metaParts.push(dept);
                    if (date) metaParts.push(date);
                    return '<div class="cust-hist-item" data-convid="' + conv.id + '" data-customername="' + safeName + '" data-is-group="' + (isGrp ? '1' : '0') + '" onclick="openChatFromHistory(this)" role="button" tabindex="0">' +
                        '<div class="cust-hist-icon">' + (isGrp ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>') + '</div>' +
                        '<div class="cust-hist-body">' +
                            '<div class="cust-hist-top"><span class="cust-hist-title">' + (isGrp ? (LANG === 'fa' ? 'گفتگوی گروهی' : 'Group Chat') : (LANG === 'fa' ? 'مکالمه' : 'Conversation')) + '</span>' +
                            '<span class="cust-hist-status" style="color:' + stColor + '">' + stLabel + '</span></div>' +
                            '<div class="cust-hist-meta">' + metaParts.join(' · ') + '</div>' +
                        '</div>' +
                        '<div class="cust-hist-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></div>' +
                    '</div>';
                }).join('');
            }
            loadCustomerTimeline(custId);
            initCustomerDetailTabs();
            const noteContentEl = document.getElementById('customerNoteContent');
            const noteAddBtn = document.getElementById('customerNoteAddBtn');
            if (noteContentEl) noteContentEl.placeholder = t('customer_note_ph') || (LANG === 'fa' ? 'متن گزارش یا یادداشت...' : 'Note or report text...');
            if (noteAddBtn && !noteAddBtn._bound) { noteAddBtn._bound = true; noteAddBtn.addEventListener('click', function() { addCustomerNote(custId); }); }
            const btnTx = document.getElementById('btnCustomerAddTransaction');
            if (btnTx && !btnTx._bound) { btnTx._bound = true; btnTx.onclick = function() { openTransactionModal(currentCustomerId); }; }
            const btnRefreshTx = document.getElementById('btnRefreshCustomerTransactions');
            if (btnRefreshTx && !btnRefreshTx._bound) { btnRefreshTx._bound = true; btnRefreshTx.onclick = function() { if (currentCustomerId) loadCustomerTransactions(currentCustomerId); }; }
            loadCustomerNotes(custId);
        }
        window.showCustomerHistory = showCustomerHistory;
        window.openChatFromHistory = openChatFromHistory;
        window.toggleWaEmojiPanel = toggleWaEmojiPanel;
        window.toggleWaStickerPanel = toggleWaStickerPanel;
        window.waConvGifAttach = waConvGifAttach;
        window.waConvVoiceCall = waConvVoiceCall;
        window.waConvVideoCall = waConvVideoCall;
        window.waAttachStartCall = waAttachStartCall;
        document.addEventListener('click', function(ev) {
            if (!ev || !ev.target) return;
            var el = ev.target;
            if (el.closest && (el.closest('#waEmojiPickerMount') || el.closest('#waStickerPickerMount') || el.closest('#waEmojiBtn') || el.closest('#waAttachMenuBtn'))) return;
            closeWaPickers();
        }, false);
        function openImagePreviewModal(imgSrc) {
            const modal = document.getElementById('imagePreviewModal');
            const img = document.getElementById('imagePreviewImg');
            if (modal && img && imgSrc) { img.src = imgSrc; modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
        }
        function closeImagePreviewModal() {
            const modal = document.getElementById('imagePreviewModal');
            const img = document.getElementById('imagePreviewImg');
            if (modal) modal.style.display = 'none';
            if (img) img.src = '';
            document.body.style.overflow = '';
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('imagePreviewModal');
                if (modal && modal.style.display === 'flex') closeImagePreviewModal();
            }
        });
        function goToServicesWithCustomerFilter() {
            if (!currentCustomerId) return;
            showPage('services');
            document.querySelectorAll('.services-tab').forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            document.querySelectorAll('.services-panel').forEach(function(p) { p.classList.remove('show'); });
            const txTab = document.querySelector('.services-tab[data-tab="transactions"]');
            const txPanel = document.getElementById('servicesTransactionsPanel');
            if (txTab) { txTab.classList.add('active'); txTab.setAttribute('aria-selected', 'true'); }
            if (txPanel) { txPanel.classList.add('show'); }
            loadCustomerFilterForTransactions().then(function() {
                const custSel = document.getElementById('txCustomerFilter');
                if (custSel) custSel.value = currentCustomerId;
                loadTransactions();
            });
        }
        function initCustomerDetailTabs() {
            document.querySelectorAll('.customer-detail-tab').forEach(function(btn) {
                btn.onclick = function() {
                    const tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.customer-detail-tab').forEach(function(b) { b.classList.remove('active'); });
                    document.querySelectorAll('.customer-detail-panel').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
                    this.classList.add('active');
                    const pid = tab === 'timeline' ? 'customerTimelinePanel' : tab === 'conversations' ? 'customerConversationsPanel' : tab === 'transactions' ? 'customerTransactionsPanel' : tab === 'documents' ? 'customerDocumentsPanel' : 'customerNotesPanel';
                    const panel = document.getElementById(pid);
                    if (panel) { panel.style.display = 'block'; panel.classList.add('show'); }
                    if (tab === 'notes' && currentCustomerId) loadCustomerNotes(currentCustomerId);
                    if (tab === 'transactions' && currentCustomerId) loadCustomerTransactions(currentCustomerId);
                    if (tab === 'documents' && currentCustomerId) loadCustomerDocuments(currentCustomerId);
                };
            });
        }
        const activityLabels = { message_sent: LANG === 'fa' ? 'ارسال پیام' : 'Message sent', conversation_assigned: LANG === 'fa' ? 'تخصیص مکالمه' : 'Conversation assigned', conversation_department_changed: LANG === 'fa' ? 'تغییر دپارتمان مکالمه' : 'Department changed', customer_note_added: LANG === 'fa' ? 'ثبت گزارش/یادداشت' : 'Note added' };
        async function loadCustomerTimeline(custId) {
            const list = document.getElementById('customerTimelineList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/customers/' + custId + '/timeline');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            const items = (res.data && res.data.data) || [];
            if (items.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">📋</span><br>' + (LANG === 'fa' ? 'هنوز فعالیتی ثبت نشده.' : 'No activity yet.') + '</div>'; return; }
            const safeName = (currentCustomerData && currentCustomerData.name) ? (currentCustomerData.name || '').replace(/'/g, '&#39;') : '';
            list.innerHTML = items.map(function(item) {
                const date = item.date ? fmtTZ(item.date, 'datetime') : '';
                if (item.type === 'conversation') {
                    const d = item.data;
                    const who = [d.assignee && d.assignee.name].filter(Boolean).join(', ');
                    const isGrp = !!(d.metadata && d.metadata.isGroup);
                    return '<div class="customer-timeline-item customer-timeline-conv" data-convid="' + d.id + '" data-customername="' + safeName + '" data-is-group="' + (isGrp ? '1' : '0') + '" onclick="openChatFromHistory(this)"><div class="customer-timeline-icon">' + (isGrp ? '👥' : '💬') + '</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + (LANG === 'fa' ? 'مکالمه' : 'Conversation') + ' ' + (d.status || '') + '</div><div class="customer-timeline-meta">' + (d.messageCount || 0) + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs') + (who ? ' · ' + (LANG === 'fa' ? 'مسئول: ' : 'Assignee: ') + escapeHtml(who) : '') + ' · ' + date + '</div></div></div>';
                }
                if (item.type === 'note') {
                    const n = item.data;
                    var un = userDisplay(n.user);
                    return '<div class="customer-timeline-item customer-timeline-note"><div class="customer-timeline-icon">📝</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + (LANG === 'fa' ? 'گزارش/یادداشت' : 'Note') + ' · ' + escapeHtml(un) + '</div><div class="customer-timeline-content">' + escapeHtml((n.content || '').slice(0, 300)) + (n.content && n.content.length > 300 ? '…' : '') + '</div><div class="customer-timeline-meta">' + date + '</div></div></div>';
                }
                if (item.type === 'activity') {
                    const a = item.data;
                    var un = userDisplay(a.user);
                    const label = (LANG === 'fa' ? activityLabels[a.action] : null) || a.action || '';
                    return '<div class="customer-timeline-item customer-timeline-activity"><div class="customer-timeline-icon">⚡</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + escapeHtml(label) + ' · ' + escapeHtml(un) + '</div><div class="customer-timeline-meta">' + escapeHtml(a.summary || '') + ' · ' + date + '</div></div></div>';
                }
                if (item.type === 'transaction') {
                    const tx = item.data;
                    const txLabels = { cash_in: 'ورود به صندوق', cash_out: 'خروج از صندوق', transfer_box: 'انتقال صندوق', bank_deposit: 'واریز بانک', bank_withdraw: 'برداشت بانک', transfer_account: 'انتقال حساب', income: 'درآمد', expense: 'هزینه' };
                    const isIn = ['cash_in','transfer_box','bank_withdraw','income'].indexOf(tx.type) >= 0;
                    const amt = parseFloat(tx.amount) || 0;
                    const desc = (tx.description || '').slice(0, 80) + (tx.description && tx.description.length > 80 ? '…' : '');
                    return '<div class="customer-timeline-item customer-timeline-transaction"><div class="customer-timeline-icon">💰</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + (txLabels[tx.type] || tx.type) + '</div><div class="customer-timeline-content">' + escapeHtml(desc) + '</div><div class="customer-timeline-meta">' + date + ' · <span class="tx-amount ' + (isIn ? 'positive' : 'negative') + '">' + (isIn ? '+' : '-') + formatMoney(amt, tx.currency) + '</span></div></div></div>';
                }
                return '';
            }).join('');
        }
        // ——— فایل‌ها و پیوست‌های مشتری
        let _docUploadBound = false;
        function _customerDocCategoryLabel(cat) {
            const c = (cat && String(cat)) || 'other';
            const k = 'customer_docs_cat_' + c;
            const tx = t(k);
            return tx === k ? c : tx;
        }
        function _customerDocFileTypeLabel(ft) {
            const allowed = { image: 1, video: 1, audio: 1, document: 1, other: 1 };
            const f = allowed[ft] ? ft : 'other';
            const k = 'customer_docs_type_' + f;
            const tx = t(k);
            return tx === k ? f : tx;
        }
        async function loadCustomerDocuments(custId) {
            const list = document.getElementById('customerDocsList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const cat = (document.getElementById('customerDocsFilterCat') || {}).value || '';
            const ftype = (document.getElementById('customerDocsFilterType') || {}).value || '';
            let url = '/api/customers/' + custId + '/documents';
            const params = [];
            if (cat) params.push('category=' + encodeURIComponent(cat));
            if (ftype) params.push('fileType=' + encodeURIComponent(ftype));
            if (params.length) url += '?' + params.join('&');
            const res = await apiFetch(url);
            if (res.needLogin) return;
            if (!res.ok) {
                list.innerHTML = '<div class="customer-docs-empty customer-docs-empty--error" role="alert"><span class="customer-docs-empty-icon">⚠️</span><p class="customer-docs-empty-text">' + escapeHtml((res.data && res.data.error) || t('customer_docs_error_load')) + '</p></div>';
                return;
            }
            const docs = (res.data && res.data.data) || [];
            if (docs.length === 0) {
                list.innerHTML = '<div class="customer-docs-empty"><span class="customer-docs-empty-icon">📁</span><p class="customer-docs-empty-text">' + escapeHtml(t('customer_docs_empty')) + '</p></div>';
            } else {
                list.innerHTML = docs.map(function(d) {
                    const icon = d.fileType === 'image' ? '🖼️' : d.fileType === 'video' ? '🎬' : d.fileType === 'audio' ? '🎵' : d.fileType === 'document' ? '📄' : '📎';
                    const typePill = _customerDocFileTypeLabel(d.fileType);
                    const size = d.fileSize ? (d.fileSize > 1048576 ? (d.fileSize / 1048576).toFixed(1) + ' MB' : (d.fileSize / 1024).toFixed(0) + ' KB') : '';
                    const expiryRaw = d.expiresAt ? String(d.expiresAt) : '';
                    const expiry = expiryRaw
                        ? '<span class="doc-expiry' + (new Date(d.expiresAt) < new Date() ? ' doc-expiry-expired' : '') + '">' + escapeHtml(t('customer_docs_expires')) + ' ' + escapeHtml(expiryRaw) + '</span>'
                        : '';
                    const src = d.filePath && d.filePath.startsWith('http') ? d.filePath : (d.filePath ? (window.location.origin + d.filePath) : '');
                    const previewBtn = src ? '<a href="' + escapeHtml(src) + '" target="_blank" rel="noopener noreferrer" class="btn btn-doc-action">' + escapeHtml(t('customer_docs_view')) + '</a>' : '';
                    const dlBtn = src ? '<a href="' + escapeHtml(src) + '" download class="btn btn-doc-action">' + escapeHtml(t('customer_docs_download')) + '</a>' : '';
                    const metaParts = [escapeHtml(_customerDocCategoryLabel(d.category))];
                    if (size) metaParts.push(escapeHtml(size));
                    if (d.source === 'conversation') metaParts.push(escapeHtml(t('customer_docs_from_chat')));
                    if (d.uploader && d.uploader.name) metaParts.push(escapeHtml(d.uploader.name));
                    metaParts.push(escapeHtml(fmtTZ(d.createdAt, 'datetime')));
                    return (
                        '<article class="customer-doc-card" data-docid="' + escapeHtml(d.id) + '">' +
                        '<div class="customer-doc-card-head">' +
                        '<span class="customer-doc-card-icon" aria-hidden="true">' + icon + '</span>' +
                        '<div class="customer-doc-card-titles">' +
                        '<h4 class="customer-doc-card-title">' + escapeHtml(d.title || d.fileName || '—') + '</h4>' +
                        '<span class="customer-doc-type-pill">' + escapeHtml(typePill) + '</span>' +
                        '</div></div>' +
                        '<p class="customer-doc-card-meta">' + metaParts.join(' · ') + '</p>' +
                        (d.description ? '<p class="customer-doc-card-desc">' + escapeHtml(d.description) + '</p>' : '') +
                        (expiry ? '<div class="customer-doc-card-expiry">' + expiry + '</div>' : '') +
                        '<div class="customer-doc-card-actions">' +
                        previewBtn + dlBtn +
                        '<button type="button" class="btn-doc-delete" onclick="deleteCustomerDoc(\'' + d.id + '\',\'' + custId + '\')" title="' + escapeHtml(t('customer_docs_delete_title')) + '"><span aria-hidden="true">🗑</span></button>' +
                        '</div></article>'
                    );
                }).join('');
            }
            // bind filters
            const catSel = document.getElementById('customerDocsFilterCat');
            const typeSel = document.getElementById('customerDocsFilterType');
            if (catSel && !catSel._docBound) { catSel._docBound = true; catSel.onchange = function() { loadCustomerDocuments(custId); }; }
            if (typeSel && !typeSel._docBound) { typeSel._docBound = true; typeSel.onchange = function() { loadCustomerDocuments(custId); }; }
            // bind upload button
            if (!_docUploadBound) {
                _docUploadBound = true;
                const uploadBtn = document.getElementById('btnCustomerUploadDoc');
                if (uploadBtn) uploadBtn.onclick = function() {
                    const form = document.getElementById('customerDocUploadForm');
                    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
                };
                const cancelBtn = document.getElementById('btnDocUploadCancel');
                if (cancelBtn) cancelBtn.onclick = function() {
                    const form = document.getElementById('customerDocUploadForm');
                    if (form) form.style.display = 'none';
                };
                const saveBtn = document.getElementById('btnDocUploadSave');
                if (saveBtn) saveBtn.onclick = function() { uploadCustomerDoc(custId); };
            }
        }
        async function uploadCustomerDoc(custId) {
            const fileInput = document.getElementById('docUploadFile');
            if (!fileInput || !fileInput.files || !fileInput.files[0]) { toast(t('customer_docs_no_file'), true); return; }
            const title = (document.getElementById('docUploadTitle').value || '').trim() || fileInput.files[0].name;
            const category = document.getElementById('docUploadCategory').value || 'other';
            const desc = (document.getElementById('docUploadDesc').value || '').trim();
            const expiry = (document.getElementById('docUploadExpiry').value || '').trim();
            const fd = new FormData();
            fd.append('file', fileInput.files[0]);
            fd.append('title', title);
            fd.append('category', category);
            if (desc) fd.append('description', desc);
            if (expiry) fd.append('expiresAt', expiry);
            const saveBtn = document.getElementById('btnDocUploadSave');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = t('customer_docs_uploading'); }
            try {
                const res = await apiFetch('/api/customers/' + custId + '/documents', { method: 'POST', body: fd });
                if (res.needLogin) return;
                if (res.ok) {
                    toast(t('customer_docs_saved'));
                    const form = document.getElementById('customerDocUploadForm');
                    if (form) form.style.display = 'none';
                    fileInput.value = '';
                    document.getElementById('docUploadTitle').value = '';
                    document.getElementById('docUploadDesc').value = '';
                    document.getElementById('docUploadExpiry').value = '';
                    loadCustomerDocuments(custId);
                } else { toast((res.data && res.data.error) || t('customer_docs_upload_error'), true); }
            } finally {
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = t('btn_save'); }
            }
        }
        async function deleteCustomerDoc(docId, custId) {
            if (!confirm(t('customer_docs_confirm_delete'))) return;
            const res = await apiFetch('/api/customers/' + custId + '/documents/' + docId, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(t('customer_docs_deleted')); loadCustomerDocuments(custId); }
            else toast((res.data && res.data.error) || t('customer_docs_delete_error'), true);
        }

        async function loadCustomerTransactions(custId) {
            const list = document.getElementById('customerTransactionsList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/customers/' + custId + '/transactions');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            const rows = (res.data && res.data.data) || [];
            if (rows.length === 0) {
                list.innerHTML = '<div class="customer-transactions-empty"><div class="customer-transactions-empty-icon">\uD83D\uDCB0</div><p class="customer-transactions-empty-text">' + (LANG === 'fa' ? 'تراکنشی برای این مشتری ثبت نشده.' : 'No transactions for this customer.') + '</p><p class="customer-transactions-empty-hint">' + (LANG === 'fa' ? 'با دکمه\u200Cی «ثبت تراکنش» اولین تراکنش را ثبت کنید.' : 'Use «Register transaction» to add the first one.') + '</p></div>';
                return;
            }
            const typeLabels = { cash_in: LANG === 'fa' ? 'ورود به صندوق' : 'Cash in', cash_out: LANG === 'fa' ? 'خروج از صندوق' : 'Cash out', transfer_box: LANG === 'fa' ? 'انتقال صندوق' : 'Transfer', bank_deposit: LANG === 'fa' ? 'واریز بانک' : 'Bank deposit', bank_withdraw: LANG === 'fa' ? 'برداشت بانک' : 'Bank withdraw', transfer_account: LANG === 'fa' ? 'انتقال حساب' : 'Transfer account', income: LANG === 'fa' ? 'درآمد' : 'Income', expense: LANG === 'fa' ? 'هزینه' : 'Expense', buy: LANG === 'fa' ? 'خرید' : 'Buy', sell: LANG === 'fa' ? 'فروش' : 'Sell' };
            const statusLabels = { pending: LANG === 'fa' ? 'در انتظار تأیید' : 'Pending', approved: LANG === 'fa' ? 'تأیید شده' : 'Approved', rejected: LANG === 'fa' ? 'رد شده' : 'Rejected' };
            const statusClasses = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
            const canApprove = currentUser && ['owner', 'admin', 'manager'].indexOf(currentUser.role) >= 0;
            const inTypes = ['cash_in','transfer_box','bank_withdraw','income','sell','buy'];
            let totalIn = 0; let totalOut = 0;
            rows.forEach(function(tx) {
                const amt = parseFloat(tx.amount) || 0;
                if (inTypes.indexOf(tx.type) >= 0) totalIn += amt; else totalOut += amt;
            });
            const summaryHtml = '<div class="customer-transactions-summary"><span class="customer-transactions-summary-count">' + (LANG === 'fa' ? 'تعداد: ' : 'Count: ') + rows.length + '</span><span class="customer-transactions-summary-in">' + (LANG === 'fa' ? 'جمع ورودی: ' : 'Total in: ') + '<strong class="tx-amount positive">' + formatMoney(totalIn, 'IRR') + '</strong></span><span class="customer-transactions-summary-out">' + (LANG === 'fa' ? 'جمع خروجی: ' : 'Total out: ') + '<strong class="tx-amount negative">' + formatMoney(totalOut, 'IRR') + '</strong></span></div>';
            list.innerHTML = summaryHtml + rows.map(function(tx) {
                const isIn = inTypes.indexOf(tx.type) >= 0;
                const amt = parseFloat(tx.amount) || 0;
                const desc = (tx.description || '').slice(0, 60) + (tx.description && tx.description.length > 60 ? '\u2026' : '');
                const ref = tx.reference ? ' \u00B7 ' + escapeHtml(tx.reference) : '';
                const statusBadge = '<span class="badge ' + (statusClasses[tx.status] || '') + '">' + (statusLabels[tx.status] || tx.status || 'pending') + '</span>';
                let actions = '<div class="tx-row-actions">';
                actions += '<button type="button" class="btn-secondary btn-sm" onclick="openTransactionModalForEdit(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button>';
                if (tx.status === 'pending' && canApprove) {
                    actions += ' <button type="button" class="btn-primary btn-sm" onclick="approveTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '">' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '</button>';
                    actions += ' <button type="button" class="btn-secondary btn-sm" onclick="rejectTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'رد' : 'Reject') + '">' + (LANG === 'fa' ? 'رد' : 'Reject') + '</button>';
                }
                actions += '</div>';
                const dateStr = tx.transactionDate || (tx.createdAt ? tx.createdAt.toString().slice(0, 10) : '');
                return '<div class="transaction-row customer-transaction-row"><div><span class="tx-type">' + (typeLabels[tx.type] || tx.type) + '</span> ' + statusBadge + '<div class="meta" style="margin-top:4px;">' + escapeHtml(desc) + ref + '</div><div class="meta">' + dateStr + '</div></div><div class="tx-row-right"><span class="tx-amount ' + (isIn ? 'positive' : 'negative') + '">' + (isIn ? '+' : '-') + formatMoney(amt, tx.currency) + '</span>' + actions + '</div></div>';
            }).join('');
        }
        async function loadCustomerNotes(custId) {
            const list = document.getElementById('customerNotesList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/customers/' + custId + '/notes');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            const data = res.data;
            const notes = (data && data.data) ? data.data : [];
            if (notes.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'هنوز یادداشتی ثبت نشده.' : 'No notes yet.') + '</div>'; return; }
            list.innerHTML = notes.map(function(n) {
                const userName = userDisplay(n.user);
                const date = n.createdAt ? fmtTZ(n.createdAt, 'datetime') : '';
                return '<div class="customer-note-item"><div class="customer-note-meta">' + escapeHtml(userName) + ' \u00B7 ' + date + '</div><div class="customer-note-content">' + escapeHtml((n.content || '').slice(0, 500)) + (n.content && n.content.length > 500 ? '\u2026' : '') + '</div></div>';
            }).join('');
        }
        async function addCustomerNote(custId) {
            const textarea = document.getElementById('customerNoteContent');
            const content = (textarea && textarea.value || '').trim();
            if (!content) { toast(LANG === 'fa' ? 'متن یادداشت الزامی است' : 'Note text required', true); return; }
            const btn = document.getElementById('customerNoteAddBtn');
            if (btn) btn.disabled = true;
            const res = await apiFetch('/api/customers/' + custId + '/notes', { method: 'POST', body: JSON.stringify({ content: content }) });
            if (btn) btn.disabled = false;
            if (res.needLogin) return;
            if (res.ok) { if (textarea) textarea.value = ''; toast(t('saved') || (LANG === 'fa' ? 'ذخیره شد' : 'Saved')); loadCustomerNotes(custId); loadCustomerTimeline(custId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let customerModalSelectedTags = [];
        let allTagsCache = [];
        function openCustomerModal(customerId) {
            const modal = document.getElementById('customerModal');
            if (!modal) return;
            modal.style.display = 'flex';
            document.getElementById('customerModalId').value = customerId || '';
            document.getElementById('customerModalTitle').textContent = customerId ? (LANG === 'fa' ? 'ویرایش مشتری' : 'Edit customer') : t('customer_add');
            document.getElementById('customerModalName').value = '';
            document.getElementById('customerModalPhone').value = '';
            document.getElementById('customerModalEmail').value = '';
            document.getElementById('customerModalStatus').value = 'active';
            document.getElementById('customerModalNotes').value = '';
            document.getElementById('customerModalProfilePic').value = '';
            customerModalSelectedTags = [];
            updateCustomerModalAvatarPreview('');
            // پاک کردن فیلدهای جدید
            const _newFields = ['customerModalBirthDate','customerModalNationalId','customerModalNationality','customerModalGender','customerModalOccupation','customerModalCompanyName','customerModalAddress','customerModalCity','customerModalCountry','customerModalPostalCode','customerModalInstagram','customerModalTelegram','customerModalWebsite'];
            _newFields.forEach(function(fid) { const el = document.getElementById(fid); if (el) el.value = ''; });
            if (customerId) {
                (async function() {
                    const res = await apiFetch('/api/customers/' + customerId);
                    if (res.ok && res.data) {
                        const c = res.data;
                        document.getElementById('customerModalName').value = c.name || '';
                        document.getElementById('customerModalPhone').value = c.phone || '';
                        document.getElementById('customerModalEmail').value = c.email || '';
                        document.getElementById('customerModalStatus').value = c.status || 'active';
                        document.getElementById('customerModalNotes').value = c.notes || '';
                        document.getElementById('customerModalProfilePic').value = c.profilePic || '';
                        updateCustomerModalAvatarPreview(c.profilePic || '');
                        customerModalSelectedTags = (c.tags || []).map(function(t) { return t.id; });
                        renderCustomerModalCustomFields(c.customFields || {});
                        if (currentCustomerId === customerId) currentCustomerData = c;
                        // لود فیلدهای جدید
                        const _map = { customerModalBirthDate: 'birthDate', customerModalNationalId: 'nationalId', customerModalNationality: 'nationality', customerModalGender: 'gender', customerModalOccupation: 'occupation', customerModalCompanyName: 'companyName', customerModalAddress: 'address', customerModalCity: 'city', customerModalCountry: 'country', customerModalPostalCode: 'postalCode', customerModalInstagram: 'instagram', customerModalTelegram: 'telegram', customerModalWebsite: 'website' };
                        Object.keys(_map).forEach(function(fid) { const el = document.getElementById(fid); if (el) el.value = c[_map[fid]] || ''; });
                    }
                    renderCustomerModalTags();
                })();
            } else {
                renderCustomerModalCustomFields({});
            }
            renderCustomerModalTags();
            loadAllTagsForModal();
            bindCustomerModalAvatarUpload();
            bindCustomerModalAddTag();
            bindCustomerModalAddCustomField();
            const delWrap = document.getElementById('customerModalDeleteWrap');
            const delBtn = document.getElementById('btnCustomerModalDelete');
            if (delWrap && delBtn) {
                if (customerId && currentUser && currentUser.canDeleteCustomer) {
                    delWrap.style.display = '';
                    delBtn.onclick = function() { deleteCustomer(customerId); };
                } else {
                    delWrap.style.display = 'none';
                }
            }
        }
        function updateCustomerModalAvatarPreview(url) {
            const el = document.getElementById('customerModalAvatarPreview');
            if (!el) return;
            const raw = (url || '').trim();
            const disp = raw ? profilePicDisplaySrc(raw) : '';
            if (disp && profilePicShowsImage(raw)) {
                const img = new Image();
                img.referrerPolicy = 'no-referrer';
                img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
                img.onload = function() { el.innerHTML = ''; el.appendChild(img); };
                img.onerror = function() { el.textContent = '?'; };
                img.src = disp;
            } else {
                el.innerHTML = ''; el.textContent = '?';
            }
        }
        async function loadAllTagsForModal() {
            const res = await apiFetch('/api/tags');
            if (res.ok && res.data && res.data.data) { allTagsCache = res.data.data; renderCustomerModalTagSelect(); }
        }
        function renderCustomerModalTagSelect() {
            const sel = document.getElementById('customerModalTagSelect');
            if (!sel) return;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? '— افزودن تگ —' : '— Add tag —') + '</option>';
            allTagsCache.forEach(function(t) {
                if (customerModalSelectedTags.indexOf(t.id) >= 0) return;
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                opt.style.backgroundColor = t.color || '#95a5a6';
                sel.appendChild(opt);
            });
        }
        function renderCustomerModalTags() {
            const list = document.getElementById('customerModalTagsList');
            if (!list) return;
            const tags = allTagsCache.filter(function(t) { return customerModalSelectedTags.indexOf(t.id) >= 0; });
            list.innerHTML = tags.map(function(t) {
                return '<span class="customer-modal-tag-chip" data-tag-id="' + escapeHtml(t.id) + '"><span class="tag-dot" style="background:' + escapeHtml(t.color || '#95a5a6') + '"></span>' + escapeHtml(t.name) + '<span class="tag-remove" onclick="removeCustomerModalTag(\'' + escapeHtml(t.id) + '\')">&times;</span></span>';
            }).join('');
        }
        function removeCustomerModalTag(tagId) {
            customerModalSelectedTags = customerModalSelectedTags.filter(function(id) { return id !== tagId; });
            renderCustomerModalTags();
            renderCustomerModalTagSelect();
        }
        function addCustomerModalTag(tagId) {
            if (!tagId || customerModalSelectedTags.indexOf(tagId) >= 0) return;
            customerModalSelectedTags.push(tagId);
            renderCustomerModalTags();
            renderCustomerModalTagSelect();
        }
        function bindCustomerModalAddTag() {
            const btn = document.getElementById('btnCustomerModalAddTag');
            const sel = document.getElementById('customerModalTagSelect');
            const newBtn = document.getElementById('btnCustomerModalNewTag');
            if (btn && sel) {
                btn.onclick = function() {
                    const v = sel.value;
                    if (v) { addCustomerModalTag(v); sel.value = ''; }
                };
            }
            if (newBtn) {
                newBtn.onclick = async function() {
                    const name = prompt(LANG === 'fa' ? 'نام تگ جدید:' : 'New tag name:');
                    if (!name || !name.trim()) return;
                    const res = await apiFetch('/api/tags', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
                    if (res.needLogin) return;
                    if (res.ok) { allTagsCache.push(res.data); addCustomerModalTag(res.data.id); renderCustomerModalTagSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
                };
            }
        }
        function renderCustomerModalCustomFields(cf) {
            const container = document.getElementById('customerModalCustomFields');
            if (!container) return;
            const keys = Object.keys(cf || {});
            container.innerHTML = keys.map(function(k) {
                return '<div class="customer-modal-custom-field-row"><input type="text" class="cf-key" value="' + escapeHtml(k) + '" placeholder="' + (LANG === 'fa' ? 'کلید' : 'Key') + '"><input type="text" class="cf-val" value="' + escapeHtml(String(cf[k] || '')) + '" placeholder="' + (LANG === 'fa' ? 'مقدار' : 'Value') + '"><button type="button" class="btn-remove-field">×</button></div>';
            }).join('');
            // Bind remove buttons for all custom field rows
            setTimeout(function() {
                const removeButtons = container.querySelectorAll('.btn-remove-field');
                removeButtons.forEach(function(btn) {
                    btn.removeEventListener('click', function handleRemove(e) { btn.parentNode.remove(); });
                    btn.addEventListener('click', function handleRemove(e) { btn.parentNode.remove(); });
                });
            }, 50);
        }
        function bindCustomerModalAddCustomField() {
            const btn = document.getElementById('btnCustomerModalAddCustomField');
            const container = document.getElementById('customerModalCustomFields');
            if (btn && container) {
                btn.onclick = function() {
                    const row = document.createElement('div');
                    row.className = 'customer-modal-custom-field-row';
                    row.innerHTML = '<input type="text" class="cf-key" placeholder="' + (LANG === 'fa' ? 'کلید' : 'Key') + '"><input type="text" class="cf-val" placeholder="' + (LANG === 'fa' ? 'مقدار' : 'Value') + '"><button type="button" class="btn-remove-field">×</button>';
                const removeBtn = row.querySelector('.btn-remove-field');
                if (removeBtn) {
                    removeBtn.removeEventListener('click', function(e) { row.remove(); });
                    removeBtn.addEventListener('click', function(e) { row.remove(); });
                }
                    container.appendChild(row);
                };
            }
        }
        function getCustomerModalCustomFields() {
            const container = document.getElementById('customerModalCustomFields');
            if (!container) return {};
            const out = {};
            container.querySelectorAll('.customer-modal-custom-field-row').forEach(function(row) {
                const k = (row.querySelector('.cf-key') && row.querySelector('.cf-key').value || '').trim();
                const v = (row.querySelector('.cf-val') && row.querySelector('.cf-val').value || '').trim();
                if (k) out[k] = v;
            });
            return out;
        }
        function bindCustomerModalAvatarUpload() {
            const fileInput = document.getElementById('customerModalAvatarFile');
            const btn = document.getElementById('btnCustomerModalAvatarUpload');
            if (btn && fileInput) {
                btn.onclick = function() { fileInput.click(); };
                fileInput.onchange = async function() {
                    if (!fileInput.files || !fileInput.files[0]) return;
                    const formData = new FormData();
                    formData.append('file', fileInput.files[0]);
                    const r = await fetch((API || '') + '/api/upload', { method: 'POST', credentials: 'include', body: formData });
                    const data = await r.json().catch(function() { return {}; });
                    if (data.url) {
                        document.getElementById('customerModalProfilePic').value = data.url;
                        updateCustomerModalAvatarPreview(data.url);
                        toast(LANG === 'fa' ? 'تصویر بارگذاری شد' : 'Image uploaded');
                    } else { toast((data.error) || t('err_generic'), true); }
                    fileInput.value = '';
                };
            }
        }
        function closeCustomerModal() { const m = document.getElementById('customerModal'); if (m) m.style.display = 'none'; }
        async function deleteCustomer(custId) {
            if (!currentUser || !currentUser.canDeleteCustomer) { toast(LANG === 'fa' ? 'شما اجازه حذف مشتری را ندارید' : 'You cannot delete customers', true); return; }
            const name = (currentCustomerData && currentCustomerData.id === custId) ? (currentCustomerData.name || currentCustomerData.phone) : (document.getElementById('customerModalName') && document.getElementById('customerModalName').value) || (document.getElementById('customerModalPhone') && document.getElementById('customerModalPhone').value) || custId;
            const msg = (LANG === 'fa' ? 'آیا از حذف مشتری «' : 'Delete customer "') + (name || custId) + (LANG === 'fa' ? '» مطمئن هستید؟ مکالمات، یادداشت‌ها و تراکنش‌ها هم حذف می‌شوند.' : '"? Conversations, notes and transactions will be removed.');
            if (!confirm(msg)) return;
            const res = await apiFetch('/api/customers/' + custId, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'مشتری حذف شد' : 'Customer deleted'); closeCustomerModal(); showPage('customers'); loadCustomers(); currentCustomerId = null; currentCustomerData = null; } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function saveCustomerFromModal() {
            const id = document.getElementById('customerModalId').value.trim();
            const name = document.getElementById('customerModalName').value.trim();
            const phone = (document.getElementById('customerModalPhone').value || '').trim().replace(/\s/g, '');
            const email = (document.getElementById('customerModalEmail').value || '').trim();
            const status = document.getElementById('customerModalStatus').value || 'active';
            const notes = (document.getElementById('customerModalNotes').value || '').trim();
            const profilePic = (document.getElementById('customerModalProfilePic') && document.getElementById('customerModalProfilePic').value || '').trim();
            const customFields = getCustomerModalCustomFields();
            // فیلدهای جدید
            const _getVal = function(fid) { const el = document.getElementById(fid); return el ? (el.value || '').trim() : ''; };
            const extraFields = {
                birthDate: _getVal('customerModalBirthDate') || undefined,
                nationalId: _getVal('customerModalNationalId') || undefined,
                nationality: _getVal('customerModalNationality') || undefined,
                gender: _getVal('customerModalGender') || undefined,
                occupation: _getVal('customerModalOccupation') || undefined,
                companyName: _getVal('customerModalCompanyName') || undefined,
                address: _getVal('customerModalAddress') || undefined,
                city: _getVal('customerModalCity') || undefined,
                country: _getVal('customerModalCountry') || undefined,
                postalCode: _getVal('customerModalPostalCode') || undefined,
                instagram: _getVal('customerModalInstagram') || undefined,
                telegram: _getVal('customerModalTelegram') || undefined,
                website: _getVal('customerModalWebsite') || undefined
            };
            if (!name) { toast(LANG === 'fa' ? 'نام الزامی است' : 'Name required', true); return; }
            if (!id && !phone) { toast(LANG === 'fa' ? 'تلفن برای مشتری جدید الزامی است' : 'Phone required', true); return; }
            if (id) {
                const body = Object.assign({ name: name || undefined, phone: phone || undefined, email: email || undefined, status: status, notes: notes || undefined, customFields: customFields, profilePic: profilePic || undefined }, extraFields);
                var res = await apiFetch('/api/customers/' + id, { method: 'PUT', body: JSON.stringify(body) });
                if (res.needLogin) return;
                if (res.ok) {
                    const tagRes = await apiFetch('/api/customers/' + id + '/tags', { method: 'PUT', body: JSON.stringify({ tagIds: customerModalSelectedTags }) });
                    if (tagRes.ok && currentCustomerId === id) currentCustomerData = res.data;
                    closeCustomerModal(); toast(t('btn_save')); if (currentCustomerId === id) showCustomerHistory(id, res.data.name || res.data.phone); loadCustomers();
                } else toast((res.data && res.data.error) || t('err_generic'), true);
            } else {
                const body2 = Object.assign({ name: name, phone: phone, email: email || undefined, status: status, notes: notes || undefined, customFields: customFields, profilePic: profilePic || undefined }, extraFields);
                var res = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(body2) });
                if (res.needLogin) return;
                if (res.ok) {
                    const newId = res.data && res.data.id;
                    if (newId && customerModalSelectedTags.length) await apiFetch('/api/customers/' + newId + '/tags', { method: 'PUT', body: JSON.stringify({ tagIds: customerModalSelectedTags }) });
                    closeCustomerModal(); toast(t('btn_save')); loadCustomers();
                } else toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }

        function setUserDisplay(u) {
            if (!u) return;
            const emailEl = document.getElementById('userEmail');
            const avatarEl = document.getElementById('userAvatar');
            const avatarMobile = document.getElementById('userAvatarMobile');
            if (emailEl) emailEl.textContent = u.username || u.email || u.name || '';
            const setAvatar = function(el) {
                if (!el) return;
                el.classList.remove('avatar-img-failed');
                var rawAv = (u.avatar || '').trim();
                var avatarUrl = rawAv ? profilePicDisplaySrc(rawAv) : '';
                if (avatarUrl && profilePicShowsImage(rawAv)) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.alt = '';
                    img.referrerPolicy = 'no-referrer';
                    img.loading = 'lazy';
                    img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; img.style.borderRadius = 'inherit';
                    img.onerror = function() { el.classList.add('avatar-img-failed'); el.innerHTML = ''; el.textContent = (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?'); };
                    el.innerHTML = '';
                    el.appendChild(img);
                } else {
                    el.innerHTML = '';
                    el.textContent = (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?');
                }
            };
            setAvatar(avatarEl);
            setAvatar(avatarMobile);
        }
        function canAccessSection(section) {
            if (section === 'profile' || section === 'dashboard') return true;
            const key = section === 'rates_charts' ? 'rates' : section;
            const perms = (currentUser && currentUser.permissions) || {};
            return perms[key] === true;
        }
        function applyNavByRole() {
            const can = canAccessSection;
            document.querySelectorAll('.nav-link[data-section]').forEach(function(link) {
                const section = link.getAttribute('data-section');
                link.style.display = can(section) ? '' : 'none';
            });
            document.querySelectorAll('.header-quick-btn[data-perm]').forEach(function(btn) {
                const perm = btn.getAttribute('data-perm');
                btn.style.display = (typeof can === 'function' && can(perm)) ? '' : 'none';
            });
            document.querySelectorAll('.header-status-wrap [data-perm]').forEach(function(el) {
                const perm = el.getAttribute('data-perm');
                el.style.display = (typeof can === 'function' && can(perm)) ? '' : 'none';
            });
            document.querySelectorAll('#headerNotifyBtn, #headerNotifyBtnMobile').forEach(function(el) {
                el.style.display = (can('announcements') || can('tickets')) ? '' : 'none';
            });
            document.querySelectorAll('.user-dropdown-menu .user-dropdown-item[data-perm]').forEach(function(el) {
                const perm = el.getAttribute('data-perm');
                el.style.display = (typeof can === 'function' && can(perm)) ? '' : 'none';
            });
            document.querySelectorAll('.notify-section[data-perm]').forEach(function(el) {
                const perm = el.getAttribute('data-perm');
                el.style.display = (typeof can === 'function' && can(perm)) ? '' : 'none';
            });
            document.querySelectorAll('[data-perm]').forEach(function(el) {
                if (el.closest('.nav-link') || el.closest('.header-quick-btn') || el.closest('.user-dropdown-menu') || el.closest('.notify-section') || el.closest('.header-status-wrap')) return;
                const perm = el.getAttribute('data-perm');
                el.style.display = can(perm) ? '' : 'none';
            });
            document.querySelectorAll('.nav-section').forEach(function(section) {
                const body = section.querySelector('.nav-section-body');
                if (!body) return;
                const links = body.querySelectorAll('.nav-link[data-section]');
                let hasVisible = false;
                links.forEach(function(l) { if (l.style.display !== 'none') hasVisible = true; });
                section.style.display = hasVisible ? '' : 'none';
            });
            document.querySelectorAll('.nav-subsection').forEach(function(sub) {
                const links = sub.querySelectorAll('.nav-link[data-section]');
                let hasVisible = false;
                links.forEach(function(l) { if (l.style.display !== 'none') hasVisible = true; });
                sub.style.display = hasVisible ? '' : 'none';
            });
            const activePage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
            if (activePage && typeof updateMobileTabBar === 'function') updateMobileTabBar(activePage);
            if (activePage === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
        }
        function updateBottomBarVisibility() {
            const bottomBar = document.getElementById('bottomBar');
            const tickerEl = document.getElementById('priceTicker');
            const appFooter = document.getElementById('appFooter');
            const mobileTabBar = document.getElementById('mobileTabBar');
            if (!bottomBar) return;
            const tickerHidden = !tickerEl || tickerEl.style.display === 'none';
            const footerHidden = !appFooter || appFooter.style.display === 'none';
            const bothHidden = tickerHidden && footerHidden;
            const isMobile = window.innerWidth <= 900;
            if (isMobile && mobileTabBar) {
                bottomBar.style.display = '';
                document.body.classList.remove('bottom-bar-hidden');
                bottomBar.classList.add('has-mobile-tab');
            } else {
                bottomBar.style.display = bothHidden ? 'none' : '';
                document.body.classList.toggle('bottom-bar-hidden', bothHidden);
                bottomBar.classList.remove('has-mobile-tab');
            }
        }
        /** فاویکون تب: تنظیمات وبسایت — اول faviconUrl سپس logoUrl سپس پیش‌فرض */
        function resolvePanelFaviconHref(b) {
            if (!b) return '/favicon-kaya.svg';
            const fav = b.faviconUrl && String(b.faviconUrl).trim();
            if (fav) return fav;
            const logo = b.logoUrl && String(b.logoUrl).trim();
            if (logo) return logo;
            return '/favicon-kaya.svg';
        }
        /** آیکن هدر: لوگوی پنل، در نبود لوگو از favicon تنظیمات */
        function resolvePanelHeaderLogoSrc(b) {
            if (!b) return '';
            const logo = b.logoUrl && String(b.logoUrl).trim();
            if (logo) return logo;
            const fav = b.faviconUrl && String(b.faviconUrl).trim();
            return fav || '';
        }
        /** لوگوی کارت ورود داخل داشبورد: ورود اختصاصی → لوگو پنل → فاویکون */
        function resolvePanelLoginLogoSrc(b) {
            if (!b) return '';
            const login = b.loginLogoUrl && String(b.loginLogoUrl).trim();
            if (login) return login;
            const logo = b.logoUrl && String(b.logoUrl).trim();
            if (logo) return logo;
            return (b.faviconUrl && String(b.faviconUrl).trim()) || '';
        }
        var PANEL_BRANDING_STATE = {};
        function applyBranding(s, brandingOpts) {
            if (!s) return;
            brandingOpts = brandingOpts || {};
            if (brandingOpts.full) {
                PANEL_BRANDING_STATE = Object.assign({}, s);
            } else {
                PANEL_BRANDING_STATE = Object.assign({}, PANEL_BRANDING_STATE, s);
            }
            const b = PANEL_BRANDING_STATE;
            const defTitle = (LANG === 'fa' ? 'پورتال کارکنان کایا | صرافی کایا' : 'Kaya Exchange | Staff Portal');
            const defSite = (LANG === 'fa' ? 'صرافی کایا' : 'Kaya Exchange');
            const defFooter = (LANG === 'fa' ? 'صرافی کایا — پورتال کارکنان' : 'Kaya Exchange — Staff Portal');
            if (b.pageTitle) document.title = b.pageTitle; else document.title = defTitle;
            const fav = document.getElementById('favicon');
            if (fav) fav.href = resolvePanelFaviconHref(b);
            const ath = document.getElementById('appleTouchIcon');
            if (ath) ath.href = resolvePanelFaviconHref(b);
            const logoText = b.siteName || defSite;
            const panelLogoSrc = resolvePanelHeaderLogoSrc(b);
            const loginLogoSrc = resolvePanelLoginLogoSrc(b);
            const headerIcon = document.getElementById('headerLogoIcon');
            if (headerIcon) {
                if (panelLogoSrc) {
                    headerIcon.classList.add('logo-icon--custom');
                    headerIcon.innerHTML = '<img src="' + escapeHtml(panelLogoSrc) + '" alt="" style="width:28px;height:28px;object-fit:contain">';
                } else {
                    headerIcon.classList.remove('logo-icon--custom');
                    headerIcon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-logo"/></svg>';
                }
            }
            const headerLogoText = document.getElementById('headerLogoText');
            if (headerLogoText) headerLogoText.textContent = logoText;
            const amTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
            if (amTitle && logoText) amTitle.setAttribute('content', logoText);
            const headerLogo = document.getElementById('headerLogo');
            if (headerLogo) headerLogo.setAttribute('aria-label', logoText + (LANG === 'fa' ? ' — بازگشت به داشبورد' : ' — Back to dashboard'));
            const footerBrand = document.getElementById('appFooterBrand');
            if (footerBrand) footerBrand.textContent = (b.footerText && String(b.footerText).trim()) ? b.footerText : defFooter;
            const appFooter = document.getElementById('appFooter');
            if (appFooter) {
                appFooter.style.display = (b.showFooter === false) ? 'none' : '';
                const style = (b.footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(b.footerStyle) >= 0) ? b.footerStyle : 'accent';
                appFooter.classList.remove('app-footer--accent', 'app-footer--minimal', 'app-footer--compact', 'app-footer--line');
                appFooter.classList.add('app-footer--' + style);
            }
            updateBottomBarVisibility();
            const loginTitleEl = document.getElementById('loginTitle');
            if (loginTitleEl) loginTitleEl.textContent = (b.loginTitle && String(b.loginTitle).trim()) ? b.loginTitle : (LANG === 'fa' ? 'پورتال کارکنان کایا' : 'Kaya Staff Portal');
            const setLoginLogo = function(containerId, size) {
                const c = document.getElementById(containerId);
                if (!c) return;
                if (loginLogoSrc) {
                    c.innerHTML = '<img src="' + escapeHtml(loginLogoSrc) + '" alt="" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain">';
                } else {
                    c.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-logo"/></svg>';
                }
            };
            setLoginLogo('loginLogo', 48);
            setLoginLogo('loginLogoTotp', 40);
            const root = document.documentElement;
            const target = document.body;
            if (b.primaryColor && /^#[0-9a-fA-F]{6}$/.test(b.primaryColor)) {
                const r = parseInt(b.primaryColor.slice(1, 3), 16); const g = parseInt(b.primaryColor.slice(3, 5), 16); const bl = parseInt(b.primaryColor.slice(5, 7), 16);
                const hoverHex = '#' + [r, g, bl].map(function(x) { return Math.max(0, Math.min(255, x - 20)).toString(16).padStart(2, '0'); }).join('');
                [root, target].forEach(function(el) {
                    if (el) { el.style.setProperty('--accent', b.primaryColor); el.style.setProperty('--accent-hover', hoverHex); el.style.setProperty('--accent-soft', 'rgba(' + r + ',' + g + ',' + bl + ',0.15)'); }
                });
            } else {
                [root, target].forEach(function(el) {
                    if (el) { el.style.removeProperty('--accent'); el.style.removeProperty('--accent-hover'); el.style.removeProperty('--accent-soft'); }
                });
            }
            const themeClass = (b.uiTheme && b.uiTheme !== 'default') ? 'theme-' + b.uiTheme : '';
            document.body.classList.remove('theme-minimal', 'theme-dark', 'theme-light', 'theme-ocean', 'theme-warm');
            if (themeClass) document.body.classList.add(themeClass);
            const fontSizeClass = (b.fontSize && ['small', 'medium', 'large'].indexOf(b.fontSize) >= 0) ? 'font-size-' + b.fontSize : 'font-size-medium';
            document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
            document.body.classList.add(fontSizeClass);
            if (b.fontFamily && String(b.fontFamily).trim()) {
                root.style.setProperty('--font', String(b.fontFamily).trim());
                root.style.setProperty('--font-ltr', String(b.fontFamily).trim());
            } else { root.style.removeProperty('--font'); root.style.removeProperty('--font-ltr'); }
            const fw = (b.fontWeight && ['normal', 'medium', 'bold'].indexOf(b.fontWeight) >= 0) ? b.fontWeight : 'normal';
            document.body.style.fontWeight = fw;
            if (Array.isArray(b.sidebarOrder) && b.sidebarOrder.length > 0) applySidebarOrder(b.sidebarOrder);
            if (window.LoginBootstrap && typeof window.LoginBootstrap.cachePanelBranding === 'function') {
                window.LoginBootstrap.cachePanelBranding(b);
            }
        }
        function applySidebarOrder(order) {
            const inner = document.querySelector('.sidebar .sidebar-inner');
            if (!inner) return;
            const sections = order.map(function(id) { return inner.querySelector('.nav-section[data-section="' + id + '"]'); }).filter(Boolean);
            if (sections.length === 0) return;
            sections.forEach(function(el) { inner.appendChild(el); });
        }
        var HIDDEN_SECTIONS = [];
        function applyHiddenSections(hidden) {
            HIDDEN_SECTIONS = Array.isArray(hidden) ? hidden : [];
            const can = canAccessSection;
            const pageToSection = { 'panel-settings': 'panel_settings', 'whatsapp': 'whatsapp', 'tickets': 'tickets', 'internal-chat': 'internal_chat', 'tasks': 'tasks', 'supervision': 'supervision', 'staff-activity': 'staff_activity', 'branches': 'branches', 'departments': 'departments', 'users': 'users', 'rates': 'rates', 'rates-charts': 'rates', 'services': 'services', 'conversations': 'conversations', 'customers': 'customers', 'processes': 'processes', 'announcements': 'announcements', 'message-templates': 'conversations' };
            document.querySelectorAll('.nav-link[data-page]').forEach(function(link) {
                const page = link.getAttribute('data-page');
                const section = link.getAttribute('data-section') || pageToSection[page];
                const inHidden = HIDDEN_SECTIONS.indexOf(page) >= 0 || (page === 'rates-charts' && HIDDEN_SECTIONS.indexOf('rates') >= 0);
                const noPerm = section && !can(section);
                link.style.display = (inHidden || noPerm) ? 'none' : '';
            });
            const annBanner = document.getElementById('announcementMarquee');
            if (annBanner) {
                if (HIDDEN_SECTIONS.indexOf('announcements') >= 0) annBanner.style.display = 'none';
                else if (typeof loadGeneralAnnouncementsMarquee === 'function') loadGeneralAnnouncementsMarquee();
            }
            const tickerEl = document.getElementById('priceTicker');
            if (tickerEl) tickerEl.style.display = HIDDEN_SECTIONS.indexOf('rates') >= 0 ? 'none' : '';
            updateBottomBarVisibility();
            const activePage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
            if (activePage && typeof updateMobileTabBar === 'function') updateMobileTabBar(activePage);
            if (ratesInterval) clearInterval(ratesInterval);
            if (tickerTimeInterval) clearInterval(tickerTimeInterval);
            ratesInterval = null;
            tickerTimeInterval = null;
            if (HIDDEN_SECTIONS.indexOf('rates') < 0 && typeof startRatesInterval === 'function') startRatesInterval();
            document.querySelectorAll('.nav-section').forEach(function(section) {
                const body = section.querySelector('.nav-section-body');
                if (!body) return;
                const links = body.querySelectorAll('.nav-link[data-section]');
                let hasVisible = false;
                links.forEach(function(l) { if (l.style.display !== 'none') hasVisible = true; });
                section.style.display = hasVisible ? '' : 'none';
            });
            document.querySelectorAll('.nav-subsection').forEach(function(sub) {
                const links = sub.querySelectorAll('.nav-link[data-section]');
                let hasVisible = false;
                links.forEach(function(l) { if (l.style.display !== 'none') hasVisible = true; });
                sub.style.display = hasVisible ? '' : 'none';
            });
            if (activePage === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
        }
        async function loadPanelSettingsAndApply() {
            const res = await apiFetch('/api/panel-settings', { timeoutMs: 10000 });
            if (res.ok && res.data) {
                applyBranding(res.data, { full: true });
                if (res.data.hiddenSections) applyHiddenSections(res.data.hiddenSections);
                if (res.data.supportedLanguages && window.applySupportedLanguages) window.applySupportedLanguages(res.data.supportedLanguages, res.data.defaultLanguage);
                return;
            }
            const pubFetchOpts = { credentials: 'include', headers: headers() };
            const safeJson = function(p) {
                return p.then(function(r) { return r.json(); }).catch(function() { return null; });
            };
            try {
                const [brandingRes, visRes, langRes] = await Promise.all([
                    safeJson(fetch(API + '/api/panel-settings/public/branding')),
                    safeJson(fetch(API + '/api/panel-settings/public/visibility', pubFetchOpts)),
                    safeJson(fetch(API + '/api/panel-settings/public/languages'))
                ]);
                if (brandingRes) applyBranding(brandingRes, { full: true });
                if (visRes && visRes.hiddenSections) applyHiddenSections(visRes.hiddenSections);
                if (langRes && langRes.supportedLanguages && window.applySupportedLanguages) {
                    window.applySupportedLanguages(langRes.supportedLanguages, langRes.defaultLanguage);
                }
            } catch (_) {}
        }
        const SECTIONS_FOR_VISIBILITY = [
            { page: 'dashboard', labelKey: 'nav_dashboard' },
            { page: 'conversations', labelKey: 'nav_conversations' },
            { page: 'customers', labelKey: 'nav_customers' },
            { page: 'tickets', labelKey: 'nav_tickets' },
            { page: 'tasks', labelKey: 'nav_tasks' },
            { page: 'processes', labelKey: 'nav_processes' },
            { page: 'departments', labelKey: 'nav_departments' },
            { page: 'users', labelKey: 'nav_users' },
            { page: 'branches', labelKey: 'nav_branches' },
            { page: 'supervision', labelKey: 'nav_supervision' },
            { page: 'staff-activity', labelKey: 'nav_staff_activity' },
            { page: 'profile', labelKey: 'nav_profile' },
            { page: 'internal-chat', labelKey: 'nav_internal_chat' },
            { page: 'announcements', labelKey: 'nav_announcements' },
            { page: 'whatsapp', labelKey: 'nav_whatsapp' },
            { page: 'message-templates', labelKey: 'nav_message_templates' },
            { page: 'rates', labelKey: 'nav_rates' },
            { page: 'rates-charts', labelKey: 'nav_rates_charts' },
            { page: 'services', labelKey: 'nav_services' },
            { page: 'panel-settings', labelKey: 'nav_panel_settings' }
        ];
        let panelSettingsTabsInited = false;
        let panelSettingsCollapseInited = false;
        let panelSettingsVisibilitySearchInited = false;
        async function loadPanelSettings() {
            const loadingEl = document.getElementById('panelSettingsLoading');
            const contentEl = document.getElementById('panelSettingsContent');
            if (loadingEl) loadingEl.style.display = 'flex';
            if (contentEl) contentEl.style.display = 'none';
            const res = await apiFetch('/api/panel-settings');
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'block';
            if (!res.ok) { toast(res.data && res.data.error ? res.data.error : t('err_generic'), true); return; }
            const d = res.data || {};
            const set = function(id, v) { const el = document.getElementById(id); if (el) el.value = v != null ? v : ''; };
            set('panelSettingSiteName', d.siteName);
            set('panelSettingLogoUrl', d.logoUrl);
            set('panelSettingFaviconUrl', d.faviconUrl);
            set('panelSettingLoginLogoUrl', d.loginLogoUrl);
            set('panelSettingLoginTitle', d.loginTitle);
            set('panelSettingPageTitle', d.pageTitle);
            set('panelSettingFooterText', d.footerText);
            set('panelSettingIosAppUrl', d.iosAppUrl);
            set('panelSettingAndroidAppUrl', d.androidAppUrl);
            const footerStyleEl = document.getElementById('panelSettingFooterStyle');
            if (footerStyleEl) footerStyleEl.value = (d.footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(d.footerStyle) >= 0) ? d.footerStyle : 'accent';
            const hideFooterEl = document.getElementById('panelSettingHideFooter');
            if (hideFooterEl) hideFooterEl.checked = d.showFooter === false;
            const langModeEl = document.getElementById('panelSettingLanguageMode');
            const validModes = ['single', 'single_en', 'single_tr', 'bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'];
            if (langModeEl) langModeEl.value = validModes.indexOf(d.languageMode) >= 0 ? d.languageMode : 'trilingual';
            const supLangs = Array.isArray(d.supportedLanguages) && d.supportedLanguages.length ? d.supportedLanguages : ['fa', 'en', 'tr'];
            const defCand = d.defaultLanguage === 'fa' || d.defaultLanguage === 'en' || d.defaultLanguage === 'tr' ? d.defaultLanguage : 'fa';
            set('panelSettingDefaultLanguage', supLangs.indexOf(defCand) >= 0 ? defCand : (supLangs[0] || 'fa'));
            const colorVal = (d.primaryColor && /^#[0-9a-fA-F]{6}$/.test(d.primaryColor)) ? d.primaryColor : '#10b981';
            const colorEl = document.getElementById('panelSettingPrimaryColor');
            const colorTextEl = document.getElementById('panelSettingPrimaryColorText');
            if (colorEl) colorEl.value = colorVal;
            if (colorTextEl) colorTextEl.value = colorVal;
            const fontFamilyEl = document.getElementById('panelSettingFontFamily');
            if (fontFamilyEl) fontFamilyEl.value = d.fontFamily || '';
            const fontSizeEl = document.getElementById('panelSettingFontSize');
            if (fontSizeEl) fontSizeEl.value = (d.fontSize && ['small', 'medium', 'large'].indexOf(d.fontSize) >= 0) ? d.fontSize : 'medium';
            const fontWeightEl = document.getElementById('panelSettingFontWeight');
            if (fontWeightEl) fontWeightEl.value = (d.fontWeight && ['normal', 'medium', 'bold'].indexOf(d.fontWeight) >= 0) ? d.fontWeight : 'normal';
            const uiThemeEl = document.getElementById('panelSettingUiTheme');
            if (uiThemeEl) uiThemeEl.value = (d.uiTheme && ['default', 'minimal', 'dark', 'light', 'ocean', 'warm'].indexOf(d.uiTheme) >= 0) ? d.uiTheme : 'default';
            if (typeof updatePanelLanguageHint === 'function') updatePanelLanguageHint();
            if (typeof toggleDefaultLanguageVisibility === 'function') toggleDefaultLanguageVisibility();
            set('panelSettingSmtpHost', d.smtpHost);
            set('panelSettingSmtpPort', d.smtpPort);
            set('panelSettingSmtpUser', d.smtpUser);
            set('panelSettingSmtpPass', d.smtpPass != null ? d.smtpPass : '');
            set('panelSettingSmtpFrom', d.smtpFrom);
            set('panelSettingSmtpFromName', d.smtpFromName);
            const smtpSecureEl = document.getElementById('panelSettingSmtpSecure');
            if (smtpSecureEl) smtpSecureEl.checked = !!d.smtpSecure;
            const loginNotifEl = document.getElementById('panelSettingEmailLoginNotification');
            if (loginNotifEl) loginNotifEl.checked = !!d.emailLoginNotification;
            set('panelSettingAdminAlertEmails', d.adminAlertEmails);
            set('panelSettingTelegramChatIds', d.telegramChatIds);
            set('panelSettingTelegramTimeoutMs', d.telegramTimeoutMs != null ? String(d.telegramTimeoutMs) : '');
            const adminAlertsEl = document.getElementById('panelSettingAdminAlertsEnabled');
            if (adminAlertsEl) adminAlertsEl.checked = d.adminAlertsEnabled !== false;
            const clientErrEl = document.getElementById('panelSettingClientErrorReportingEnabled');
            if (clientErrEl) clientErrEl.checked = d.clientErrorReportingEnabled !== false;
            const tgAllEl = document.getElementById('panelSettingTelegramNotifyAllEvents');
            if (tgAllEl) tgAllEl.checked = d.telegramNotifyAllEvents === true;
            const tgApiEl = document.getElementById('panelSettingTelegramNotifyApiRequests');
            if (tgApiEl) tgApiEl.checked = d.telegramNotifyApiRequests === true;
            const tgAuthEl = document.getElementById('panelSettingTelegramNotifyAuthEvents');
            if (tgAuthEl) tgAuthEl.checked = d.telegramNotifyAuthEvents !== false;
            const tgSocketEl = document.getElementById('panelSettingTelegramNotifySocketEvents');
            if (tgSocketEl) tgSocketEl.checked = d.telegramNotifySocketEvents === true;
            const tgMsgEl = document.getElementById('panelSettingTelegramNotifyIncomingMessages');
            if (tgMsgEl) tgMsgEl.checked = d.telegramNotifyIncomingMessages === true;
            const tgSysEl = document.getElementById('panelSettingTelegramNotifySystemEvents');
            if (tgSysEl) tgSysEl.checked = d.telegramNotifySystemEvents !== false;
            const tgErrEl = document.getElementById('panelSettingTelegramNotifyErrorEvents');
            if (tgErrEl) tgErrEl.checked = d.telegramNotifyErrorEvents !== false;
            const tgTokenEl = document.getElementById('panelSettingTelegramBotToken');
            if (tgTokenEl) tgTokenEl.value = '';
            const tgTokenHint = document.getElementById('panelTelegramTokenHint');
            if (tgTokenHint) {
                tgTokenHint.textContent = d.telegramBotTokenSet ? t('panel_telegram_token_saved_hint') : t('panel_telegram_token_none_hint');
            }
            const hidden = Array.isArray(d.hiddenSections) ? d.hiddenSections : [];
            const container = document.getElementById('panelVisibilityToggles');
            if (container) {
                container.innerHTML = '';
                SECTIONS_FOR_VISIBILITY.forEach(function(s) {
                    const labelText = (t(s.labelKey) || s.page);
                    const item = document.createElement('div');
                    item.className = 'panel-visibility-item';
                    item.dataset.searchText = (labelText + ' ' + s.page).toLowerCase();
                    const label = document.createElement('label');
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.dataset.page = s.page;
                    cb.checked = hidden.indexOf(s.page) < 0;
                    cb.id = 'panelVisible_' + s.page;
                    cb.onchange = markPanelSettingsChanged;
                    label.setAttribute('for', cb.id);
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(' ' + labelText));
                    item.appendChild(label);
                    container.appendChild(item);
                });
            }
            previewPanelLogo(d.logoUrl || '');
            previewPanelFavicon(d.faviconUrl || '');
            previewPanelLoginLogo(d.loginLogoUrl || '');
            updatePanelSettingsHeaderBranding(d.logoUrl || '', d.faviconUrl || '');
            updatePanelLivePreview();
            initPanelBrandingFileUploads();
            loadCompanyEmails();
            loadCompanyEmailUserSelect();
            if (typeof initCompanyEmailsHandlers === 'function') initCompanyEmailsHandlers();
            initPanelSettingsTabs();
            initPanelSettingsCollapse();
            initPanelVisibilitySearch();
            initSidebarOrderList(d.sidebarOrder);
            clearPanelSettingsChanged();
            if (typeof window.applyTranslations === 'function') window.applyTranslations();
        }
        const SIDEBAR_SECTIONS = [
            { section: 'dashboard', labelKey: 'nav_dashboard' },
            { section: 'communications', labelKey: 'nav_communications' },
            { section: 'organization', labelKey: 'nav_organization' },
            { section: 'settings', labelKey: 'nav_settings' }
        ];
        function initSidebarOrderList(savedOrder) {
            const container = document.getElementById('panelSidebarOrderList');
            if (!container) return;
            const order = Array.isArray(savedOrder) && savedOrder.length > 0 ? savedOrder : SIDEBAR_SECTIONS.map(function(s) { return s.section; });
            container.innerHTML = '';
            order.forEach(function(sectionId, idx) {
                const info = SIDEBAR_SECTIONS.find(function(s) { return s.section === sectionId; });
                if (!info) return;
                const item = document.createElement('div');
                item.className = 'sidebar-order-item';
                item.dataset.section = sectionId;
                const label = document.createElement('label');
                label.textContent = (typeof t === 'function' ? t(info.labelKey) : info.labelKey) || sectionId;
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.value = idx + 1;
                input.onchange = markPanelSettingsChanged;
                item.appendChild(label);
                item.appendChild(input);
                container.appendChild(item);
            });
            SIDEBAR_SECTIONS.forEach(function(info) {
                if (order.indexOf(info.section) < 0) {
                    const item = document.createElement('div');
                    item.className = 'sidebar-order-item';
                    item.dataset.section = info.section;
                    const label = document.createElement('label');
                    label.textContent = (typeof t === 'function' ? t(info.labelKey) : info.labelKey) || info.section;
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.min = '1';
                    input.value = order.length + 1;
                    input.onchange = markPanelSettingsChanged;
                    item.appendChild(label);
                    item.appendChild(input);
                    container.appendChild(item);
                }
            });
        }
        function getSidebarOrderFromForm() {
            const container = document.getElementById('panelSidebarOrderList');
            if (!container) return null;
            const items = [].slice.call(container.querySelectorAll('.sidebar-order-item'));
            items.sort(function(a, b) {
                const ia = a.querySelector('input');
                const ib = b.querySelector('input');
                const ra = ia && ia.value != null ? parseInt(ia.value, 10) || 999 : 999;
                const rb = ib && ib.value != null ? parseInt(ib.value, 10) || 999 : 999;
                return ra - rb;
            });
            return items.map(function(el) { return el.dataset.section; }).filter(Boolean);
        }
        function syncPanelColorInput() {
            const colorEl = document.getElementById('panelSettingPrimaryColor');
            const textEl = document.getElementById('panelSettingPrimaryColorText');
            if (colorEl && textEl) textEl.value = colorEl.value;
        }
        function syncPanelColorFromText() {
            const textEl = document.getElementById('panelSettingPrimaryColorText');
            const colorEl = document.getElementById('panelSettingPrimaryColor');
            if (!textEl || !colorEl) return;
            const v = String(textEl.value || '').trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) colorEl.value = v;
        }
        function syncSmtpPortWithSecure() {
            const portEl = document.getElementById('panelSettingSmtpPort');
            const secureEl = document.getElementById('panelSettingSmtpSecure');
            if (!portEl || !secureEl) return;
            const port = String(portEl.value || '').trim();
            if (port === '465') secureEl.checked = true;
            else if (port === '587') secureEl.checked = false;
        }
        function syncSmtpSecureWithPort() {
            const portEl = document.getElementById('panelSettingSmtpPort');
            const secureEl = document.getElementById('panelSettingSmtpSecure');
            if (!portEl || !secureEl) return;
            if (secureEl.checked && (!portEl.value || portEl.value === '587')) portEl.value = '465';
            else if (!secureEl.checked && (!portEl.value || portEl.value === '465')) portEl.value = '587';
        }
        function markPanelSettingsChanged() {
            const badge = document.getElementById('panelSettingsUnsavedBadge');
            if (badge) badge.style.display = 'inline';
        }
        function clearPanelSettingsChanged() {
            const badge = document.getElementById('panelSettingsUnsavedBadge');
            if (badge) badge.style.display = 'none';
        }
        function initPanelSettingsTabs() {
            if (panelSettingsTabsInited) return;
            panelSettingsTabsInited = true;
            const tabs = document.querySelectorAll('.panel-settings-tab');
            const panels = document.querySelectorAll('.panel-settings-tab-panel');
            tabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    const targetTab = tab.getAttribute('data-tab');
                    tabs.forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                    panels.forEach(function(p) { p.classList.remove('active'); p.hidden = true; });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    const panelId = 'panelTab' + (targetTab.charAt(0).toUpperCase() + targetTab.slice(1));
                    const panel = document.getElementById(panelId);
                    if (panel) { panel.classList.add('active'); panel.hidden = false; }
                });
            });
        }
        function initPanelSettingsCollapse() {
            if (panelSettingsCollapseInited) return;
            panelSettingsCollapseInited = true;
            const EXPANDED_MAX = 1200;
            document.querySelectorAll('.panel-settings-section-collapsible').forEach(function(section) {
                const toggle = section.querySelector('.panel-settings-section-toggle');
                const body = section.querySelector('.panel-settings-section-body');
                if (!toggle || !body) return;
                const startCollapsed = section.classList.contains('panel-settings-section-collapsed-default');
                if (startCollapsed) {
                    section.classList.add('collapsed');
                    toggle.setAttribute('aria-expanded', 'false');
                    body.style.maxHeight = '0';
                } else {
                    body.style.maxHeight = EXPANDED_MAX + 'px';
                }
                toggle.addEventListener('click', function() {
                    const collapsed = section.classList.toggle('collapsed');
                    toggle.setAttribute('aria-expanded', !collapsed);
                    body.style.maxHeight = collapsed ? '0' : EXPANDED_MAX + 'px';
                });
            });
        }
        function initPanelVisibilitySearch() {
            if (panelSettingsVisibilitySearchInited) return;
            const searchEl = document.getElementById('panelVisibilitySearch');
            const container = document.getElementById('panelVisibilityToggles');
            if (!searchEl || !container) return;
            panelSettingsVisibilitySearchInited = true;
            let visSearchTimer = null;
            searchEl.addEventListener('input', function() {
                if (visSearchTimer) clearTimeout(visSearchTimer);
                visSearchTimer = setTimeout(function() {
                    visSearchTimer = null;
                    const q = (searchEl.value || '').trim().toLowerCase();
                    container.querySelectorAll('.panel-visibility-item').forEach(function(item) {
                        const text = item.dataset.searchText || '';
                        item.classList.toggle('hidden-by-search', q && text.indexOf(q) < 0);
                    });
                }, 120);
            });
        }
        async function loadCompanyEmailUserSelect() {
            const sel = document.getElementById('companyEmailAssignedUser');
            if (!sel) return;
            const first = sel.options[0];
            sel.innerHTML = '';
            if (first) sel.appendChild(first);
            const res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            res.data.data.forEach(function(u) {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = (u.name || u.username || u.email || u.id).trim() || ('User ' + u.id);
                sel.appendChild(opt);
            });
        }
        async function loadCompanyEmails() {
            const tbody = document.getElementById('companyEmailsTableBody');
            const emptyEl = document.getElementById('companyEmailsEmpty');
            if (!tbody) return;
            const res = await apiFetch('/api/company-emails');
            if (!res.ok) { if (emptyEl) emptyEl.style.display = 'block'; tbody.innerHTML = ''; return; }
            const list = (res.data && res.data.data) || [];
            if (list.length === 0) {
                tbody.innerHTML = '';
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }
            if (emptyEl) emptyEl.style.display = 'none';
            function escapeHtml(s) { if (window.CRM && window.CRM.Utils && typeof window.CRM.Utils.escapeHtml === 'function') return window.CRM.Utils.escapeHtml(s); if (s == null) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
            tbody.innerHTML = list.map(function(item) {
                const assigned = (item.assignedUser && (item.assignedUser.name || item.assignedUser.email)) || '—';
                const passBadge = item.hasPassword ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-muted">—</span>';
                const statusBadge = item.isActive ? '<span class="badge badge-success">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge badge-muted">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                const sendCredsBtn = item.assignedUser && item.hasPassword ? '<button type="button" class="btn-sm btn-secondary company-email-send-creds" data-id="' + item.id + '" title="' + (t('panel_company_email_send_creds') || '') + '">' + (LANG === 'fa' ? 'ارسال ورود' : 'Send') + '</button>' : '';
                return '<tr data-id="' + item.id + '"><td>' + escapeHtml(item.email) + '</td><td>' + escapeHtml(item.label || '') + '</td><td>' + escapeHtml(assigned) + '</td><td>' + passBadge + '</td><td>' + statusBadge + '</td><td class="company-email-actions"><button type="button" class="btn-sm btn-secondary company-email-edit" data-id="' + item.id + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> ' + sendCredsBtn + ' <button type="button" class="btn-sm btn-danger company-email-delete" data-id="' + item.id + '">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></td></tr>';
            }).join('');
        }
        function openCompanyEmailForm(item) {
            const box = document.getElementById('companyEmailFormBox');
            const idEl = document.getElementById('companyEmailId');
            if (!box || !idEl) return;
            if (item) {
                idEl.value = item.id;
                document.getElementById('companyEmailAddress').value = item.email || '';
                document.getElementById('companyEmailLabel').value = item.label || '';
                document.getElementById('companyEmailAssignedUser').value = item.assignedUserId || '';
                document.getElementById('companyEmailPassword').value = '';
                document.getElementById('companyEmailNotes').value = item.notes || '';
                document.getElementById('companyEmailActive').checked = item.isActive !== false;
            } else {
                idEl.value = '';
                document.getElementById('companyEmailAddress').value = '';
                document.getElementById('companyEmailLabel').value = '';
                document.getElementById('companyEmailAssignedUser').value = '';
                document.getElementById('companyEmailPassword').value = '';
                document.getElementById('companyEmailNotes').value = '';
                document.getElementById('companyEmailActive').checked = true;
            }
            box.style.display = 'block';
        }
        function closeCompanyEmailForm() {
            const box = document.getElementById('companyEmailFormBox');
            if (box) box.style.display = 'none';
        }
        async function saveCompanyEmail() {
            const idEl = document.getElementById('companyEmailId');
            const email = (document.getElementById('companyEmailAddress') && document.getElementById('companyEmailAddress').value || '').trim();
            const label = (document.getElementById('companyEmailLabel') && document.getElementById('companyEmailLabel').value || '').trim();
            const assignedUserId = (document.getElementById('companyEmailAssignedUser') && document.getElementById('companyEmailAssignedUser').value || '') || null;
            const password = (document.getElementById('companyEmailPassword') && document.getElementById('companyEmailPassword').value || '').trim();
            const notes = (document.getElementById('companyEmailNotes') && document.getElementById('companyEmailNotes').value || '').trim();
            const isActive = document.getElementById('companyEmailActive') && document.getElementById('companyEmailActive').checked;
            if (!email) { toast(LANG === 'fa' ? 'آدرس ایمیل را وارد کنید.' : 'Enter email address.', true); return; }
            const payload = { email: email, label: label || null, assignedUserId: assignedUserId, notes: notes || null, isActive: isActive };
            if (password) payload.password = password;
            let url = '/api/company-emails';
            let method = 'POST';
            if (idEl && idEl.value) { url = '/api/company-emails/' + idEl.value; method = 'PUT'; }
            const res = await apiFetch(url, { method: method, body: JSON.stringify(payload) });
            if (res.ok) { toast(t('btn_save')); closeCompanyEmailForm(); loadCompanyEmails(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteCompanyEmail(id) {
            if (!confirm(LANG === 'fa' ? 'این ایمیل شرکتی حذف شود؟' : 'Delete this company email?')) return;
            const res = await apiFetch('/api/company-emails/' + id, { method: 'DELETE' });
            if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadCompanyEmails(); closeCompanyEmailForm(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function sendCompanyEmailCredentials(id) {
            const res = await apiFetch('/api/company-emails/' + id + '/send-credentials', { method: 'POST', body: JSON.stringify({}) });
            if (res.ok) toast((res.data && res.data.message) || (LANG === 'fa' ? 'ارسال شد' : 'Sent')); else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        let companyEmailsHandlersInited = false;
        function initCompanyEmailsHandlers() {
            if (companyEmailsHandlersInited) return;
            companyEmailsHandlersInited = true;
            const addBtn = document.getElementById('btnAddCompanyEmail');
            if (addBtn) addBtn.addEventListener('click', function() { openCompanyEmailForm(null); });
            const cancelBtn = document.getElementById('companyEmailCancelBtn');
            if (cancelBtn) cancelBtn.addEventListener('click', closeCompanyEmailForm);
            const saveBtn = document.getElementById('companyEmailSaveBtn');
            if (saveBtn) saveBtn.addEventListener('click', function() { saveCompanyEmail(); });
            const tbody = document.getElementById('companyEmailsTableBody');
            if (tbody) tbody.addEventListener('click', function(e) {
                const target = e.target;
                if (!target || !target.classList) return;
                const id = target.getAttribute('data-id');
                if (!id) return;
                if (target.classList.contains('company-email-edit')) {
                    apiFetch('/api/company-emails/' + id).then(function(res) { if (res.ok && res.data) openCompanyEmailForm(res.data); });
                } else if (target.classList.contains('company-email-delete')) deleteCompanyEmail(id);
                else if (target.classList.contains('company-email-send-creds')) sendCompanyEmailCredentials(id);
            });
        }
        function applyThemeFromForm() {
            const colorEl = document.getElementById('panelSettingPrimaryColor');
            const colorVal = colorEl && /^#[0-9a-fA-F]{6}$/.test(colorEl.value) ? colorEl.value : null;
            const themeEl = document.getElementById('panelSettingUiTheme');
            const themeVal = (themeEl && themeEl.value && themeEl.value !== 'default') ? themeEl.value : '';
            const fontSizeEl = document.getElementById('panelSettingFontSize');
            const fontSizeVal = (fontSizeEl && ['small', 'medium', 'large'].indexOf(fontSizeEl.value) >= 0) ? fontSizeEl.value : 'medium';
            const fontFamilyEl = document.getElementById('panelSettingFontFamily');
            const fontFamilyVal = fontFamilyEl && fontFamilyEl.value.trim() ? fontFamilyEl.value.trim() : null;
            const fontWeightEl = document.getElementById('panelSettingFontWeight');
            const fontWeightVal = (fontWeightEl && ['normal', 'medium', 'bold'].indexOf(fontWeightEl.value) >= 0) ? fontWeightEl.value : 'normal';
            applyBranding({
                primaryColor: colorVal,
                uiTheme: themeVal || 'default',
                fontSize: fontSizeVal,
                fontFamily: fontFamilyVal,
                fontWeight: fontWeightVal
            });
        }
        function updatePanelLivePreview() {
            applyThemeFromForm();
            const siteName = (document.getElementById('panelSettingSiteName') && document.getElementById('panelSettingSiteName').value.trim()) || (LANG === 'fa' ? 'صرافی کایا' : 'Kaya Exchange');
            const pageTitle = (document.getElementById('panelSettingPageTitle') && document.getElementById('panelSettingPageTitle').value.trim()) || (LANG === 'fa' ? 'پورتال کارکنان | صرافی کایا' : 'Staff Portal | Kaya Exchange');
            const footerText = (document.getElementById('panelSettingFooterText') && document.getElementById('panelSettingFooterText').value.trim()) || (LANG === 'fa' ? 'صرافی کایا — پورتال کارکنان' : 'Kaya Exchange — Staff Portal');
            const hideFooter = document.getElementById('panelSettingHideFooter') && document.getElementById('panelSettingHideFooter').checked;
            const logoUrl = (document.getElementById('panelSettingLogoUrl') && document.getElementById('panelSettingLogoUrl').value.trim()) || '';
            const faviconUrl = (document.getElementById('panelSettingFaviconUrl') && document.getElementById('panelSettingFaviconUrl').value.trim()) || '';
            const loginLogoOnly = (document.getElementById('panelSettingLoginLogoUrl') && document.getElementById('panelSettingLoginLogoUrl').value.trim()) || '';
            const loginPreviewSrc = loginLogoOnly || logoUrl || faviconUrl;
            const effectiveFaviconPreview = faviconUrl || logoUrl;
            const titleEl = document.getElementById('panelPreviewPageTitle');
            const siteNameEl = document.getElementById('panelPreviewSiteName');
            const logoEl = document.getElementById('panelPreviewLogo');
            const logoPlaceholder = document.getElementById('panelPreviewLogoPlaceholder');
            const faviconEl = document.getElementById('panelPreviewFavicon');
            const footerEl = document.getElementById('panelPreviewFooter');
            const footerTextEl = document.getElementById('panelPreviewFooterText');
            if (titleEl) titleEl.textContent = pageTitle;
            if (siteNameEl) siteNameEl.textContent = siteName;
            if (footerTextEl) footerTextEl.textContent = footerText;
            if (footerEl) footerEl.classList.toggle('hidden', !!hideFooter);
            if (logoEl) { if (logoUrl) { logoEl.src = logoUrl; logoEl.style.display = ''; if (logoPlaceholder) logoPlaceholder.style.display = 'none'; } else { logoEl.removeAttribute('src'); logoEl.style.display = 'none'; if (logoPlaceholder) logoPlaceholder.style.display = ''; } }
            if (faviconEl) { if (effectiveFaviconPreview) { faviconEl.src = effectiveFaviconPreview; faviconEl.style.display = ''; } else { faviconEl.removeAttribute('src'); faviconEl.style.display = 'none'; } }
            const loginLogoEl = document.getElementById('panelPreviewLoginLogo');
            const loginLogoPh = document.getElementById('panelPreviewLoginLogoPlaceholder');
            if (loginLogoEl) {
                if (loginPreviewSrc) {
                    loginLogoEl.src = loginPreviewSrc;
                    loginLogoEl.style.display = '';
                    if (loginLogoPh) loginLogoPh.style.display = 'none';
                } else {
                    loginLogoEl.removeAttribute('src');
                    loginLogoEl.style.display = 'none';
                    if (loginLogoPh) loginLogoPh.style.display = '';
                }
            }
            updatePanelSettingsHeaderBranding(logoUrl, faviconUrl);
        }
        function updatePanelSettingsHeaderBranding(logoUrl, faviconUrl) {
            const logoEl = document.getElementById('panelSettingsHeaderLogo');
            const faviconEl = document.getElementById('panelSettingsHeaderFavicon');
            const fallbackEl = document.getElementById('panelSettingsHeaderIconFallback');
            if (!logoEl || !faviconEl || !fallbackEl) return;
            logoUrl = (logoUrl || '').trim();
            faviconUrl = (faviconUrl || '').trim();
            if (logoUrl) {
                logoEl.src = logoUrl;
                logoEl.style.display = '';
                logoEl.onerror = function() { logoEl.style.display = 'none'; if (faviconUrl) { faviconEl.src = faviconUrl; faviconEl.style.display = ''; faviconEl.classList.add('favicon-only'); fallbackEl.style.display = 'none'; } else fallbackEl.style.display = 'block'; };
                fallbackEl.style.display = 'none';
                if (faviconUrl) { faviconEl.src = faviconUrl; faviconEl.style.display = ''; } else faviconEl.style.display = 'none';
            } else if (faviconUrl) {
                logoEl.style.display = 'none';
                fallbackEl.style.display = 'none';
                faviconEl.src = faviconUrl;
                faviconEl.style.display = '';
                faviconEl.classList.add('favicon-only');
            } else {
                logoEl.style.display = 'none';
                faviconEl.style.display = 'none';
                faviconEl.classList.remove('favicon-only');
                fallbackEl.style.display = 'block';
            }
        }
        function updatePanelLanguageHint() {
            const sel = document.getElementById('panelSettingLanguageMode');
            const hint = document.getElementById('panelLanguageModeDesc');
            if (!sel || !hint) return;
            const mode = sel.value;
            const hints = { single: 'panel_language_hint_single', single_en: 'panel_language_hint_single_en', single_tr: 'panel_language_hint_single_tr', bilingual: 'panel_language_hint_bilingual', bilingual_fa_tr: 'panel_language_hint_bilingual_fa_tr', bilingual_en_tr: 'panel_language_hint_bilingual_en_tr', trilingual: 'panel_language_hint_trilingual' };
            hint.textContent = t(hints[mode] || 'panel_language_hint_trilingual');
        }
        function toggleDefaultLanguageVisibility() {
            const wrap = document.getElementById('panelDefaultLanguageWrap');
            const sel = document.getElementById('panelSettingLanguageMode');
            if (!wrap || !sel) return;
            const multi = ['bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'].indexOf(sel.value) >= 0;
            wrap.style.display = multi ? 'block' : 'none';
        }
        function previewPanelLogo(url) {
            const wrap = document.getElementById('panelLogoPreview');
            const img = document.getElementById('panelLogoPreviewImg');
            if (!wrap || !img) return;
            url = (url || '').trim();
            if (url) { wrap.style.display = 'block'; img.src = url; img.style.display = ''; img.onerror = function() { img.style.display = 'none'; }; } else { wrap.style.display = 'none'; }
        }
        function previewPanelFavicon(url) {
            const wrap = document.getElementById('panelFaviconPreview');
            const img = document.getElementById('panelFaviconPreviewImg');
            if (!wrap || !img) return;
            url = (url || '').trim();
            if (url) { wrap.style.display = 'block'; img.src = url; img.style.display = ''; img.onerror = function() { img.style.display = 'none'; }; } else { wrap.style.display = 'none'; }
        }
        function previewPanelLoginLogo(url) {
            const wrap = document.getElementById('panelLoginLogoPreview');
            const img = document.getElementById('panelLoginLogoPreviewImg');
            if (!wrap || !img) return;
            url = (url || '').trim();
            if (url) { wrap.style.display = 'block'; img.src = url; img.style.display = ''; img.onerror = function() { img.style.display = 'none'; }; } else { wrap.style.display = 'none'; }
        }
        function panelPickBrandingUpload(kind) {
            const el = document.getElementById('panelBrandingFile' + kind);
            if (el) el.click();
        }
        let panelBrandingUploadBound = false;
        function initPanelBrandingFileUploads() {
            if (panelBrandingUploadBound) return;
            const pairs = [
                { fileId: 'panelBrandingFileLogo', urlId: 'panelSettingLogoUrl', preview: function(u) { previewPanelLogo(u); } },
                { fileId: 'panelBrandingFileFavicon', urlId: 'panelSettingFaviconUrl', preview: function(u) { previewPanelFavicon(u); } },
                { fileId: 'panelBrandingFileLoginLogo', urlId: 'panelSettingLoginLogoUrl', preview: function(u) { previewPanelLoginLogo(u); } }
            ];
            pairs.forEach(function(p) {
                const fi = document.getElementById(p.fileId);
                if (!fi) return;
                fi.addEventListener('change', async function() {
                    if (!fi.files || !fi.files[0]) return;
                    const formData = new FormData();
                    formData.append('file', fi.files[0]);
                    const r = await fetch((API || '') + '/api/upload', { method: 'POST', credentials: 'include', body: formData });
                    const data = await r.json().catch(function() { return {}; });
                    if (data.url) {
                        const urlEl = document.getElementById(p.urlId);
                        if (urlEl) urlEl.value = data.url;
                        p.preview(data.url);
                        updatePanelLivePreview();
                        markPanelSettingsChanged();
                        toast(LANG === 'fa' ? 'فایل بارگذاری شد — در صورت نیاز «ذخیره» را بزنید.' : 'Uploaded — save settings if needed.');
                    } else toast((data.error) || t('err_generic'), true);
                    fi.value = '';
                });
            });
            panelBrandingUploadBound = true;
        }
        async function savePanelSettings() {
            const btn = document.getElementById('panelSettingsSaveBtn');
            const btnFooter = document.getElementById('panelSettingsSaveBtnFooter');
            const statusEl = document.getElementById('panelSettingsSaveStatus');
            const savingText = (LANG === 'fa' ? 'در حال ذخیره...' : LANG === 'tr' ? 'Kaydediliyor...' : 'Saving...');
            const saveText = t('btn_save');
            if (btn) { btn.disabled = true; btn.textContent = savingText; }
            if (btnFooter) { btnFooter.disabled = true; btnFooter.textContent = savingText; }
            if (statusEl) { statusEl.style.display = 'none'; statusEl.className = 'panel-settings-save-status'; }
            const get = function(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            let payload;
            try {
            const hiddenSections = [];
            document.querySelectorAll('#panelVisibilityToggles input[type="checkbox"][data-page]').forEach(function(cb) {
                if (!cb.checked) hiddenSections.push(cb.dataset.page);
            });
            payload = {
                siteName: get('panelSettingSiteName'),
                logoUrl: get('panelSettingLogoUrl'),
                faviconUrl: get('panelSettingFaviconUrl'),
                loginLogoUrl: get('panelSettingLoginLogoUrl'),
                loginTitle: get('panelSettingLoginTitle'),
                pageTitle: get('panelSettingPageTitle'),
                footerText: get('panelSettingFooterText'),
                showFooter: !(document.getElementById('panelSettingHideFooter') && document.getElementById('panelSettingHideFooter').checked),
                footerStyle: (function() { const el = document.getElementById('panelSettingFooterStyle'); const v = el ? el.value : 'accent'; return (v && ['accent', 'minimal', 'compact', 'line'].indexOf(v) >= 0) ? v : 'accent'; })(),
                primaryColor: (function() { const el = document.getElementById('panelSettingPrimaryColor'); const v = el ? el.value : ''; return /^#[0-9a-fA-F]{6}$/.test(v) ? v : null; })(),
                fontFamily: get('panelSettingFontFamily') || null,
                fontSize: (function() { const el = document.getElementById('panelSettingFontSize'); const v = el ? el.value : 'medium'; return ['small', 'medium', 'large'].indexOf(v) >= 0 ? v : 'medium'; })(),
                fontWeight: (function() { const el = document.getElementById('panelSettingFontWeight'); const v = el ? el.value : 'normal'; return ['normal', 'medium', 'bold'].indexOf(v) >= 0 ? v : 'normal'; })(),
                uiTheme: (function() { const el = document.getElementById('panelSettingUiTheme'); const v = el ? el.value : 'default'; return ['default', 'minimal', 'dark', 'light', 'ocean', 'warm'].indexOf(v) >= 0 ? v : 'default'; })(),
                sidebarOrder: getSidebarOrderFromForm(),
                smtpHost: get('panelSettingSmtpHost'),
                smtpPort: get('panelSettingSmtpPort'),
                smtpUser: get('panelSettingSmtpUser'),
                smtpPass: get('panelSettingSmtpPass'),
                smtpFrom: get('panelSettingSmtpFrom'),
                smtpFromName: get('panelSettingSmtpFromName'),
                smtpSecure: !!(document.getElementById('panelSettingSmtpSecure') && document.getElementById('panelSettingSmtpSecure').checked),
                emailLoginNotification: !!(document.getElementById('panelSettingEmailLoginNotification') && document.getElementById('panelSettingEmailLoginNotification').checked),
                adminAlertsEnabled: !!(document.getElementById('panelSettingAdminAlertsEnabled') && document.getElementById('panelSettingAdminAlertsEnabled').checked),
                adminAlertEmails: get('panelSettingAdminAlertEmails'),
                telegramChatIds: get('panelSettingTelegramChatIds'),
                telegramTimeoutMs: get('panelSettingTelegramTimeoutMs'),
                clientErrorReportingEnabled: !!(document.getElementById('panelSettingClientErrorReportingEnabled') && document.getElementById('panelSettingClientErrorReportingEnabled').checked),
                telegramNotifyAllEvents: !!(document.getElementById('panelSettingTelegramNotifyAllEvents') && document.getElementById('panelSettingTelegramNotifyAllEvents').checked),
                telegramNotifyApiRequests: !!(document.getElementById('panelSettingTelegramNotifyApiRequests') && document.getElementById('panelSettingTelegramNotifyApiRequests').checked),
                telegramNotifyAuthEvents: !!(document.getElementById('panelSettingTelegramNotifyAuthEvents') && document.getElementById('panelSettingTelegramNotifyAuthEvents').checked),
                telegramNotifySocketEvents: !!(document.getElementById('panelSettingTelegramNotifySocketEvents') && document.getElementById('panelSettingTelegramNotifySocketEvents').checked),
                telegramNotifyIncomingMessages: !!(document.getElementById('panelSettingTelegramNotifyIncomingMessages') && document.getElementById('panelSettingTelegramNotifyIncomingMessages').checked),
                telegramNotifySystemEvents: !!(document.getElementById('panelSettingTelegramNotifySystemEvents') && document.getElementById('panelSettingTelegramNotifySystemEvents').checked),
                telegramNotifyErrorEvents: !!(document.getElementById('panelSettingTelegramNotifyErrorEvents') && document.getElementById('panelSettingTelegramNotifyErrorEvents').checked),
                hiddenSections: hiddenSections
            };
            } catch (buildErr) {
                toast((LANG === 'fa' ? 'خطا در آماده‌سازی فرم: ' : LANG === 'tr' ? 'Form hazırlanamadı: ' : 'Could not build form: ') + (buildErr && buildErr.message ? buildErr.message : String(buildErr)), true);
                if (statusEl) {
                    statusEl.textContent = (buildErr && buildErr.message) || '';
                    statusEl.className = 'panel-settings-save-status error';
                    statusEl.style.display = 'inline';
                }
                if (btn) { btn.disabled = false; btn.textContent = saveText; }
                if (btnFooter) { btnFooter.disabled = false; btnFooter.textContent = saveText; }
                return;
            }
            const langModeEl = document.getElementById('panelSettingLanguageMode');
            const validModes = ['single', 'single_en', 'single_tr', 'bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'];
            payload.languageMode = (langModeEl && validModes.indexOf(langModeEl.value) >= 0) ? langModeEl.value : 'trilingual';
            const defaultLangEl = document.getElementById('panelSettingDefaultLanguage');
            if (defaultLangEl && (defaultLangEl.value === 'fa' || defaultLangEl.value === 'en' || defaultLangEl.value === 'tr')) payload.defaultLanguage = defaultLangEl.value;
            payload.iosAppUrl = get('panelSettingIosAppUrl');
            payload.androidAppUrl = get('panelSettingAndroidAppUrl');
            const tgNewToken = get('panelSettingTelegramBotToken');
            if (tgNewToken) payload.telegramBotToken = tgNewToken;
            let res;
            try {
                res = await apiFetch('/api/panel-settings', { method: 'PUT', body: JSON.stringify(payload) });
            } catch (netErr) {
                toast((netErr && netErr.message) || t('err_generic'), true);
                if (statusEl) {
                    statusEl.textContent = (netErr && netErr.message) || t('err_generic');
                    statusEl.className = 'panel-settings-save-status error';
                    statusEl.style.display = 'inline';
                }
                if (btn) { btn.disabled = false; btn.textContent = saveText; }
                if (btnFooter) { btnFooter.disabled = false; btnFooter.textContent = saveText; }
                return;
            }
            if (btn) { btn.disabled = false; btn.textContent = saveText; }
            if (btnFooter) { btnFooter.disabled = false; btnFooter.textContent = saveText; }
            if (res.ok && res.data) {
                const savedFooterStyle = (function() { const el = document.getElementById('panelSettingFooterStyle'); const v = el ? el.value : ''; return (v && ['accent', 'minimal', 'compact', 'line'].indexOf(v) >= 0) ? v : null; })();
                if (savedFooterStyle != null) res.data.footerStyle = savedFooterStyle;
                applyBranding(res.data, { full: true });
                if (res.data.hiddenSections) applyHiddenSections(res.data.hiddenSections);
                if (res.data.supportedLanguages && window.applySupportedLanguages) {
                    window.applySupportedLanguages(res.data.supportedLanguages, res.data.defaultLanguage);
                }
                toast(t('saved'));
                clearPanelSettingsChanged();
                if (statusEl) { statusEl.textContent = (LANG === 'fa' ? 'ذخیره شد' : LANG === 'tr' ? 'Kaydedildi' : 'Saved'); statusEl.className = 'panel-settings-save-status saved'; statusEl.style.display = 'inline'; setTimeout(function() { statusEl.style.display = 'none'; }, 3000); }
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
                if (statusEl) { statusEl.textContent = (res.data && res.data.error) || t('err_generic'); statusEl.className = 'panel-settings-save-status error'; statusEl.style.display = 'inline'; }
            }
        }
        async function sendPanelTestEmail() {
            const toEl = document.getElementById('panelTestEmailTo');
            const btn = document.getElementById('panelTestEmailBtn');
            const statusEl = document.getElementById('panelTestEmailStatus');
            const to = (toEl && toEl.value || '').trim();
            if (!to) { toast(LANG === 'fa' ? 'آدرس ایمیل را وارد کنید.' : 'Enter email address.', true); return; }
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال ارسال...' : 'Sending...'); }
            if (statusEl) { statusEl.style.display = 'none'; }
            const get = function(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            const payload = { to: to };
            const host = get('panelSettingSmtpHost');
            const port = get('panelSettingSmtpPort');
            if (host && port) {
                payload.smtpHost = host;
                payload.smtpPort = port;
                payload.smtpUser = get('panelSettingSmtpUser');
                payload.smtpPass = get('panelSettingSmtpPass');
                payload.smtpFrom = get('panelSettingSmtpFrom');
                payload.smtpFromName = get('panelSettingSmtpFromName');
                payload.smtpSecure = !!(document.getElementById('panelSettingSmtpSecure') && document.getElementById('panelSettingSmtpSecure').checked);
            }
            try {
                const ctrl = new AbortController();
                const timeoutId = setTimeout(function() { ctrl.abort(); }, 35000);
                const res = await apiFetch('/api/panel-settings/test-email', { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal });
                clearTimeout(timeoutId);
                if (res.ok && res.data && res.data.ok) {
                    toast(res.data.message || (LANG === 'fa' ? 'ایمیل تست ارسال شد.' : 'Test email sent.'));
                    if (statusEl) { statusEl.textContent = (LANG === 'fa' ? 'ارسال شد' : 'Sent'); statusEl.className = 'panel-test-email-status success'; statusEl.style.display = 'inline'; }
                    if (res.data.usedFallback) {
                        const hostEl = document.getElementById('panelSettingSmtpHost');
                        if (hostEl) { hostEl.value = res.data.usedFallback; markPanelSettingsChanged(); }
                    }
                } else {
                    toast((res.data && res.data.error) || (LANG === 'fa' ? 'ارسال ناموفق' : 'Send failed'), true);
                    if (statusEl) { statusEl.textContent = (res.data && res.data.error) || ''; statusEl.className = 'panel-test-email-status error'; statusEl.style.display = 'inline'; }
                }
            } catch (e) {
                const errMsg = (e && e.name === 'AbortError') ? (LANG === 'fa' ? 'زمان اتصال به پایان رسید. Host یا پورت را بررسی کنید.' : 'Connection timed out. Check Host and Port.') : (e && e.message) || (LANG === 'fa' ? 'خطا در ارسال' : 'Send error');
                toast(errMsg, true);
                if (statusEl) { statusEl.textContent = errMsg; statusEl.className = 'panel-test-email-status error'; statusEl.style.display = 'inline'; }
            }
            if (btn) { btn.disabled = false; btn.textContent = t('panel_test_email_btn'); }
        }
        async function sendPanelTestTelegram() {
            const btn = document.getElementById('panelTestTelegramBtn');
            const statusEl = document.getElementById('panelTestTelegramStatus');
            const get = function(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            const payload = {
                telegramBotToken: get('panelSettingTelegramBotToken'),
                telegramChatIds: get('panelSettingTelegramChatIds'),
                telegramTimeoutMs: get('panelSettingTelegramTimeoutMs'),
                text: get('panelTestTelegramText')
            };
            if (btn) { btn.disabled = true; btn.textContent = t('panel_test_telegram_sending'); }
            if (statusEl) statusEl.style.display = 'none';
            const res = await apiFetch('/api/panel-settings/test-telegram', { method: 'POST', body: JSON.stringify(payload) });
            if (res.ok && res.data && res.data.ok) {
                toast(res.data.message || t('panel_test_telegram_ok'));
                if (statusEl) {
                    statusEl.textContent = t('panel_test_telegram_sent');
                    statusEl.className = 'panel-test-email-status success';
                    statusEl.style.display = 'inline';
                }
            } else {
                const err = (res.data && res.data.error) || res.error || t('panel_test_telegram_fail');
                toast(err, true);
                if (statusEl) {
                    statusEl.textContent = err;
                    statusEl.className = 'panel-test-email-status error';
                    statusEl.style.display = 'inline';
                }
            }
            if (btn) btn.disabled = false;
            if (btn) btn.textContent = t('panel_test_telegram_btn');
        }
        const VALID_PAGES = (window.CRM && window.CRM.Constants) ? window.CRM.Constants.VALID_PAGES : ['dashboard','conversations','customers','departments','users','tickets','tasks','processes','whatsapp','message-templates','branches','supervision','staff-activity','profile','announcements','internal-chat','rates','rates-charts','services','panel-settings'];
        function applyHashRoute() {
            initSidebarCollapsedState();
            const hash = (location.hash || '').replace(/^#/, '');
            const page = VALID_PAGES.indexOf(hash) >= 0 ? hash : (function() { try { const last = sessionStorage.getItem('crm_last_page'); return last && VALID_PAGES.indexOf(last) >= 0 ? last : 'dashboard'; } catch (_) { return 'dashboard'; } })();
            showPage(page);
        }
        function toggleSidebarMobile() { const s = document.getElementById('sidebar'); const o = document.getElementById('sidebarOverlay'); const btn = document.getElementById('headerMenuBtn'); if (s && s.classList.contains('sidebar-open')) { closeSidebarMobile(); } else { if (s) s.classList.add('sidebar-open'); if (o) { o.classList.add('show'); o.style.display = 'block'; document.body.style.overflow = 'hidden'; } if (btn) btn.setAttribute('aria-expanded', 'true'); } }
        function closeSidebarMobile() { const s = document.getElementById('sidebar'); const o = document.getElementById('sidebarOverlay'); const btn = document.getElementById('headerMenuBtn'); if (s) s.classList.remove('sidebar-open'); if (o) { o.classList.remove('show'); o.style.display = 'none'; document.body.style.overflow = ''; } if (btn) btn.setAttribute('aria-expanded', 'false'); }
        function toggleSidebarDesktop() { const s = document.getElementById('sidebar'); const btn = document.getElementById('sidebarToggleBtn'); if (!s || !btn) return; if (!window.matchMedia || !window.matchMedia('(min-width: 901px)').matches) return; const collapsed = s.classList.toggle('sidebar-collapsed'); try { localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0'); } catch (_) {} btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true'); btn.setAttribute('aria-label', collapsed ? (typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو') : (typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو')); btn.setAttribute('title', collapsed ? (typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو') : (typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو')); const txt = btn.querySelector('.sidebar-toggle-text'); if (txt && typeof t === 'function') txt.textContent = collapsed ? t('sidebar_toggle_expand') : t('sidebar_toggle_collapse'); }
        function initSidebarCollapsedState() { const s = document.getElementById('sidebar'); const btn = document.getElementById('sidebarToggleBtn'); if (!s || !btn) return; let collapsed = false; try { collapsed = localStorage.getItem('sidebar_collapsed') === '1'; } catch (_) {} if (!window.matchMedia || !window.matchMedia('(min-width: 901px)').matches) { s.classList.remove('sidebar-collapsed'); btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو'); btn.setAttribute('title', typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو'); var txt0 = btn.querySelector('.sidebar-toggle-text'); if (txt0 && typeof t === 'function') txt0.textContent = t('sidebar_toggle_collapse'); return; } if (collapsed) { s.classList.add('sidebar-collapsed'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو'); btn.setAttribute('title', typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو'); var txt = btn.querySelector('.sidebar-toggle-text'); if (txt && typeof t === 'function') txt.textContent = t('sidebar_toggle_expand'); } else { s.classList.remove('sidebar-collapsed'); btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو'); btn.setAttribute('title', typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو'); var txt = btn.querySelector('.sidebar-toggle-text'); if (txt && typeof t === 'function') txt.textContent = t('sidebar_toggle_collapse'); } }
        /* ========== Kaya CRM chunk-04 | showPage، تنظیمات پنل، تسک/فرایند | docs/CODEBASE-MAP.md ========== */
        function showPage(page) {
            const perms = (currentUser && currentUser.permissions) || {};
            const pageToSection = (window.CRM && window.CRM.Constants) ? window.CRM.Constants.PAGE_TO_SECTION : {};
            const section = pageToSection[page];
            if (section && page !== 'profile' && page !== 'dashboard' && !canAccessSection(section)) { page = 'dashboard'; var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#dashboard'); } catch (e) {} }
            if (HIDDEN_SECTIONS && (HIDDEN_SECTIONS.indexOf(page) >= 0 || (page === 'rates-charts' && HIDDEN_SECTIONS.indexOf('rates') >= 0))) { page = 'dashboard'; var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#dashboard'); } catch (e) {} }
            var prevPage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
            closeSidebarMobile();
            if (qrRefreshInterval && page !== 'whatsapp') { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            if (page && window.location.hash !== '#' + page) { var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#' + page); } catch (e) {} }
            try { sessionStorage.setItem('crm_last_page', page); } catch (_) {}
            const navLinks = document.querySelectorAll('.sidebar .nav-link[data-page]');
            navLinks.forEach(function(l) { l.classList.remove('active'); });
            navLinks.forEach(function(l) { if (l.getAttribute('data-page') === page) l.classList.add('active'); });
            updateMobileTabBar(page);
            const pageTitles = (window.CRM && window.CRM.Constants) ? window.CRM.Constants.PAGE_TITLES : {};
            const titleKey = pageTitles[page] || 'nav_dashboard';
            const titleText = t(titleKey);
            const pt = document.getElementById('headerPageTitle');
            const pb = document.getElementById('headerBreadcrumb');
            const pm = document.getElementById('headerMobileTitle');
            if (pt) { pt.textContent = titleText; pt.setAttribute('data-i18n', titleKey); }
            if (pb) pb.textContent = titleText;
            if (pm) pm.textContent = titleText;
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.removeProperty('display'); });
            const ids = (window.CRM && window.CRM.Constants) ? window.CRM.Constants.PAGE_IDS : {};
            if (ids[page]) {
                const el = document.getElementById(ids[page]);
                if (el) el.classList.add('show');
            }
            const content = document.querySelector('.content');
            if (content) { content.classList.toggle('page-conversations', page === 'conversations'); }
            if (page === 'dashboard') loadDashboard();
            if (page === 'conversations') { 
                loadConvFiltersInit(); 
                loadConversations(); 
                setTimeout(function() { 
                    removeAllInlineHandlers(); 
                    setupConversationEventHandlers(); 
                }, 250);
            }
            if (page === 'customers') { initCustomerFilters(); loadCustomers(); }
            if (page === 'departments') { loadDepartments(); loadBranchesForSelect(['deptBranch']); }
            if (page === 'users') { document.getElementById('userFormBox').style.display = 'none'; document.getElementById('btnAddUser').style.display = (currentUser && currentUser.permissions && currentUser.permissions.manage_users) ? '' : 'none'; document.getElementById('btnCancelUserForm').style.display = 'none'; loadUsers(); loadDeptsForUser(); loadBranchesForSelect(['userBranch','userEditBranch']); initUserAddPerms(); initUserFilters(); initUserEditTabs(); }
            if (page === 'tickets') { loadTicketFiltersInit(); loadTickets(); }
            if (page === 'tasks') { loadTasksFilters(); loadTasks(); loadTasksSummary(); initTaskSearchDebounce(); const ta = document.getElementById('taskAssignType'); if (ta && !ta._bound) { ta._bound = true; ta.addEventListener('change', toggleTaskAssignTarget); } }
            if (page === 'processes') { initProcessTabs(); loadProcessTemplates(); loadProcessInstances(); loadProcessTemplateSelect(); }
            if (page === 'whatsapp') {
                initWhatsappProTabs();
                switchWhatsappMainTab(_whatsappActiveTab || 'channels', true);
                loadWhatsappStatus();
                loadWhatsappConnectionSettings();
                loadWhatsappWelcomeConfig();
                loadWhatsappStats();
                loadWhatsappOverview();
            }
            if (page === 'message-templates') { initMessageTemplatesTabs(); initTplVarPills(); loadMessageTemplates(); }
            if (page === 'rates') { loadRatesAdjustments(); loadTickerConfig(); loadCurrencies(); checkRatesApiKeyStatus(); }
            if (page === 'rates-charts') initRatesChartsPage();
            if (page === 'services') { initServicesTabs(); loadServicesPage(); }
            if (page === 'branches') { loadBranches(); }
            if (page === 'staff-activity') { 
                loadStaffActivity(); 
                startStaffActivityLive(); 
                setTimeout(function() { 
                    removeAllInlineHandlers(); 
                    setupStaffActivityEventHandlers(); 
                }, 100);
            } else { 
                stopStaffActivityLive(); 
            }
            if (page === 'profile') {
                loadProfile();
                setTimeout(function() {
                    removeAllInlineHandlers();
                }, 100);
            }
            if (page === 'announcements') { loadAnnouncements(); if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager')) { document.getElementById('announcementSendBox').style.display = 'block'; loadAnnouncementTargets(); } else document.getElementById('announcementSendBox').style.display = 'none'; }
            if (page === 'internal-chat') { window.hasNewInternalChat = false; updateNavBadges(); const popupTid = currentInternalThreadId; closeInternalChatPopup(); var wrap = document.getElementById('internalChatLayoutWrap'); if (wrap) wrap.classList.remove('internal-chat-mobile-chat-open'); loadInternalThreads(); loadInternalUsers(); if (popupTid) setTimeout(function(){ openInternalThread(popupTid); }, 150); }
            if (page === 'supervision') { loadSupervisionFiltersInit(); loadSupervisionPerformance(); document.querySelectorAll('.sup-tab').forEach(function(b){ b.classList.remove('active'); if(b.getAttribute('data-tab')==='performance') b.classList.add('active'); }); document.querySelectorAll('.sup-panel').forEach(function(p){ p.classList.remove('show'); if(p.id==='supPerformance') p.classList.add('show'); }); }
            if (page === 'panel-settings') loadPanelSettings();
            if (prevPage === 'internal-chat' && page !== 'internal-chat' && currentInternalThreadId) {
                const headerEl = document.getElementById('internalChatHeader');
                const name = (headerEl && headerEl.textContent) ? headerEl.textContent.trim() : (LANG === 'fa' ? 'چت' : 'Chat');
                showInternalChatPopup(currentInternalThreadId, name);
                const pane = document.getElementById('internalChatPane');
                if (pane) pane.style.display = 'none';
                var wrap = document.getElementById('internalChatLayoutWrap');
                if (wrap) wrap.classList.remove('internal-chat-has-chat', 'internal-chat-mobile-chat-open');
            }
            updateInternalChatFloatingBtn();
        }

        function toggleTicketForm() {
            const box = document.getElementById('ticketFormBox');
            if (box.style.display === 'none') { box.style.display = 'block'; loadTicketFormSelects(); } else { box.style.display = 'none'; }
        }
        async function loadTicketFiltersInit() {
            await loadTicketFormSelects();
            const res = await apiFetch('/api/departments');
            if (res.ok && res.data && res.data.data) {
                const sel = document.getElementById('ticketFilterDept');
                if (sel) sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'همه دپارتمان‌ها' : 'All depts') + '</option>' + res.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
            }
        }
        async function loadTicketFormSelects() {
            const res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            const users = res.data.data;
            const unassOpt = '<option value="">' + (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            const anyOpt = '<option value="">' + (LANG === 'fa' ? 'هر مسئول' : 'Any') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            const a1 = document.getElementById('ticketAssignee'); if (a1) a1.innerHTML = unassOpt;
            const a2 = document.getElementById('ticketFilterAssignee'); if (a2) a2.innerHTML = anyOpt;
            const a3 = document.getElementById('ticketDetailAssignee'); if (a3) a3.innerHTML = unassOpt;
            const deptRes = await apiFetch('/api/departments');
            if (deptRes.ok && deptRes.data && deptRes.data.data) {
                const deptOpt = '<option value="">' + (LANG === 'fa' ? 'بدون دپارتمان' : 'No dept') + '</option>' + deptRes.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
                const td = document.getElementById('ticketDept'); if (td) td.innerHTML = deptOpt;
            }
        }
        function applyTicketFilters() { loadTickets(); }
        async function loadTickets() {
            const list = document.getElementById('ticketList');
            const statsEl = document.getElementById('ticketStats');
            if (!list) return;
            setLoading('ticketList', 4);
            let q = '?limit=50';
            const s = document.getElementById('ticketFilterStatus'); if (s && s.value) q += '&status=' + encodeURIComponent(s.value);
            const p = document.getElementById('ticketFilterPriority'); if (p && p.value) q += '&priority=' + encodeURIComponent(p.value);
            const a = document.getElementById('ticketFilterAssignee'); if (a && a.value) q += '&assignedTo=' + encodeURIComponent(a.value);
            const d = document.getElementById('ticketFilterDept'); if (d && d.value) q += '&departmentId=' + encodeURIComponent(d.value);
            const search = document.getElementById('ticketSearch'); if (search && search.value.trim()) q += '&search=' + encodeURIComponent(search.value.trim());
            const sortEl = document.getElementById('ticketFilterSort'); if (sortEl && sortEl.value) q += '&sort=' + encodeURIComponent(sortEl.value);
            try {
                const res = await apiFetch('/api/tickets' + q);
                const statsRes = await apiFetch('/api/tickets/stats');
                if (res.needLogin) return;
                if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
                const data = res.data;
                if (!data) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
                const rows = Array.isArray(data.data) ? data.data : (Array.isArray(data.rows) ? data.rows : []);
                let stats;
                if (statsRes.ok && statsRes.data) { stats = statsRes.data; } else { stats = { total: data.total || rows.length || 0, open: 0, in_progress: 0, resolved: 0, closed: 0 }; rows.forEach(function(x){ if (stats[x.status] !== undefined) stats[x.status]++; }); }
                if (statsEl) {
                    const archCount = stats.archived || 0;
                    statsEl.innerHTML = '<div class="ticket-stat-card"><div class="ticket-stat-val">' + (stats.total || 0) + '</div><div class="ticket-stat-label">' + (LANG === 'fa' ? 'کل' : 'Total') + '</div></div><div class="ticket-stat-card ticket-stat-open"><div class="ticket-stat-val">' + (stats.open || 0) + '</div><div class="ticket-stat-label">' + t('status_open') + '</div></div><div class="ticket-stat-card ticket-stat-progress"><div class="ticket-stat-val">' + (stats.in_progress || 0) + '</div><div class="ticket-stat-label">' + t('status_in_progress') + '</div></div><div class="ticket-stat-card ticket-stat-resolved"><div class="ticket-stat-val">' + (stats.resolved || 0) + '</div><div class="ticket-stat-label">' + t('status_resolved') + '</div></div><div class="ticket-stat-card ticket-stat-closed"><div class="ticket-stat-val">' + (stats.closed || 0) + '</div><div class="ticket-stat-label">' + t('status_closed') + '</div></div><div class="ticket-stat-card ticket-stat-archived"><div class="ticket-stat-val">' + archCount + '</div><div class="ticket-stat-label">' + t('status_archived') + '</div></div>';
                    statsEl.style.display = 'grid';
                }
                if (rows.length === 0) { list.innerHTML = '<div class="empty ticket-list-empty"><span class="empty-icon">🎫</span><p>' + t('empty_tickets') + '</p><button type="button" class="btn-primary" id="emptyTicketCreateBtn" style="margin-top:12px;">' + t('create_ticket') + '</button></div>'; 
                    setTimeout(function() {
                        const emptyBtn = document.getElementById('emptyTicketCreateBtn');
                        if (emptyBtn) {
                            emptyBtn.removeEventListener('click', toggleTicketForm);
                            emptyBtn.addEventListener('click', toggleTicketForm);
                        }
                    }, 50);
                    return; 
                }
                list.innerHTML = rows.map(function(tk) {
                    const statusLabel = tk.status === 'open' ? t('status_open') : tk.status === 'in_progress' ? t('status_in_progress') : tk.status === 'resolved' ? t('status_resolved') : tk.status === 'closed' ? t('status_closed') : tk.status === 'archived' ? t('status_archived') : tk.status || '';
                    const prioLabel = { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[tk.priority] || tk.priority || '';
                    const assign = userDisplay(tk.assignee);
                    const dept = (tk.department && tk.department.name) ? tk.department.name : '';
                    const createdStr = tk.createdAt ? (fmtTZ ? fmtTZ(tk.createdAt, 'datetime') : tk.createdAt) : '';
                    const meta = [createdStr, userDisplay(tk.creator), assign, dept].filter(Boolean).join(' · ');
                    const num = (tk.ticketNumber || '').trim();
                    const numHtml = num ? '<span class="ticket-number">' + escapeHtml(num) + '</span> ' : '';
                    return '<div class="ticket-card" onclick="loadTicketDetail(\'' + (tk.id || '').replace(/'/g, "\\'") + '\')"><div class="ticket-card-body">' + numHtml + '<span class="ticket-card-title">' + escapeHtml(tk.title || '') + '</span><div class="ticket-card-meta">' + escapeHtml(meta) + '</div></div><div class="ticket-card-badges"><span class="ticket-badge ticket-badge-prio ' + (tk.priority || '') + '">' + escapeHtml(prioLabel) + '</span><span class="ticket-badge ticket-badge-status ' + (tk.status || '') + '">' + escapeHtml(statusLabel) + '</span></div></div>';
                }).join('');
            } catch (e) {
                list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (e && e.message ? escapeHtml(e.message) : '') + '</div>';
            }
        }
        var currentTicketId = null;
        function showTicketList() {
            document.getElementById('ticketDetail').style.display = 'none';
            document.getElementById('ticketList').style.display = 'block';
            currentTicketId = null;
            document.getElementById('ticketReplyContent').value = '';
            document.getElementById('ticketReplyFile').value = '';
            document.getElementById('ticketReplyAttachments').textContent = '';
            loadTickets();
        }
        function canManageTickets() { return !!(currentUser && (currentUser.canManageTickets === true || (currentUser.permissions && currentUser.permissions.manage_tickets === true))); }
        let ticketEditMode = false;
        function toggleTicketEditMode() {
            ticketEditMode = !ticketEditMode;
            const titleEl = document.getElementById('ticketDetailTitle');
            const titleEdit = document.getElementById('ticketDetailTitleEdit');
            const titleInput = document.getElementById('ticketDetailTitleInput');
            const descEl = document.getElementById('ticketDetailDesc');
            const descEdit = document.getElementById('ticketDetailDescEdit');
            const descInput = document.getElementById('ticketDetailDescInput');
            const editBtn = document.getElementById('ticketEditBtn');
            if (ticketEditMode) {
                if (titleEl) titleEl.style.display = 'none';
                if (titleEdit) titleEdit.style.display = 'block';
                if (titleInput) { titleInput.value = titleEl ? titleEl.textContent : ''; titleInput.focus(); }
                if (descEl) descEl.style.display = 'none';
                if (descEdit) descEdit.style.display = 'block';
                if (descInput) descInput.value = descEl ? descEl.textContent : '';
                if (editBtn) editBtn.textContent = t('cancel') || (LANG === 'fa' ? 'انصراف' : 'Cancel');
            } else {
                if (titleEl) titleEl.style.display = '';
                if (titleEdit) titleEdit.style.display = 'none';
                if (descEl) descEl.style.display = (descEl && descEl.textContent.trim()) ? '' : 'none';
                if (descEdit) descEdit.style.display = 'none';
                if (editBtn) editBtn.textContent = t('btn_edit') || (LANG === 'fa' ? 'ویرایش' : 'Edit');
            }
        }
        async function updateTicketFromDetail() {
            if (!currentTicketId) return;
            const statusSel = document.getElementById('ticketDetailStatus');
            const assigneeSel = document.getElementById('ticketDetailAssignee');
            const prioritySel = document.getElementById('ticketDetailPriority');
            const dueInp = document.getElementById('ticketDetailDueDate');
            const titleInput = document.getElementById('ticketDetailTitleInput');
            const descInput = document.getElementById('ticketDetailDescInput');
            const body = {};
            if (statusSel) body.status = statusSel.value;
            if (assigneeSel) body.assignedTo = assigneeSel.value || null;
            if (prioritySel) body.priority = prioritySel.value;
            if (dueInp) body.dueDate = dueInp.value ? dueInp.value : null;
            if (ticketEditMode && titleInput) { body.title = titleInput.value.trim(); if (!body.title) { toast(t('ticket_title_required') || (LANG === 'fa' ? 'عنوان الزامی است' : 'Title required'), true); return; } }
            if (ticketEditMode && descInput !== undefined) body.description = descInput.value || '';
            const res = await apiFetch('/api/tickets/' + currentTicketId, { method: 'PUT', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { if (ticketEditMode) { ticketEditMode = false; toggleTicketEditMode(); } toast(t('btn_save')); loadTicketDetail(currentTicketId); loadTickets(); } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        function archiveTicket() {
            if (!currentTicketId) return;
            updateTicketStatus(currentTicketId, 'archived');
        }
        function deleteTicketConfirm() {
            if (!currentTicketId) return;
            if (!confirm(LANG === 'fa' ? 'آیا از حذف این تیکت مطمئن هستید؟ این عمل قابل بازگشت نیست.' : 'Delete this ticket? This cannot be undone.')) return;
            deleteTicket(currentTicketId);
        }
        async function updateTicketStatus(id, status) {
            const res = await apiFetch('/api/tickets/' + id, { method: 'PUT', body: JSON.stringify({ status: status }) });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تیکت به آرشیو ارسال شد' : 'Ticket archived'); loadTicketDetail(currentTicketId); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteTicket(id) {
            const res = await apiFetch('/api/tickets/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تیکت حذف شد' : 'Ticket deleted'); showTicketList(); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadTicketDetail(id) {
            currentTicketId = id;
            ticketEditMode = false;
            document.getElementById('ticketList').style.display = 'none';
            document.getElementById('ticketDetail').style.display = 'block';
            const titleEdit = document.getElementById('ticketDetailTitleEdit');
            const descEdit = document.getElementById('ticketDetailDescEdit');
            if (titleEdit) titleEdit.style.display = 'none';
            if (descEdit) descEdit.style.display = 'none';
            const titleEl = document.getElementById('ticketDetailTitle');
            if (titleEl) titleEl.style.display = '';
            const editBtn = document.getElementById('ticketEditBtn');
            if (editBtn) { editBtn.textContent = t('btn_edit') || (LANG === 'fa' ? 'ویرایش' : 'Edit'); editBtn.style.display = canManageTickets() ? '' : 'none'; }
            const delBtn = document.getElementById('ticketDeleteBtn');
            const archBtn = document.getElementById('ticketArchiveBtn');
            if (delBtn) delBtn.style.display = canManageTickets() ? '' : 'none';
            if (archBtn) archBtn.style.display = canManageTickets() ? '' : 'none';
            const res = await apiFetch('/api/tickets/' + id);
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); showTicketList(); return; }
            const ticket = res.data;
            const numEl = document.getElementById('ticketDetailNumber');
            if (numEl) numEl.textContent = (ticket.ticketNumber || '').trim() || '';
            document.getElementById('ticketDetailTitle').textContent = ticket.title || '';
            const statusLabel = ticket.status === 'open' ? t('status_open') : ticket.status === 'in_progress' ? t('status_in_progress') : ticket.status === 'resolved' ? t('status_resolved') : ticket.status === 'closed' ? t('status_closed') : ticket.status === 'archived' ? t('status_archived') : ticket.status || '';
            const prioLabel = { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[ticket.priority] || ticket.priority || '';
            const createdStr = ticket.createdAt ? (fmtTZ ? fmtTZ(ticket.createdAt, 'datetime') : ticket.createdAt) : '';
            const metaParts = [(LANG === 'fa' ? 'تاریخ ثبت: ' : 'Created: ') + createdStr, t('creator_label') + ' ' + userDisplay(ticket.creator), t('assignee_label') + ' ' + userDisplay(ticket.assignee), t('th_status') + ': ' + statusLabel, t('ticket_priority') + ': ' + prioLabel];
            if (ticket.department && ticket.department.name) metaParts.push((t('label_dept') || 'دپارتمان') + ': ' + ticket.department.name);
            if (ticket.dueDate) metaParts.push(t('due_label') + ' ' + (fmtTZ ? fmtTZ(ticket.dueDate, 'date') : ticket.dueDate));
            document.getElementById('ticketDetailMeta').textContent = metaParts.join(' | ');
            const descEl = document.getElementById('ticketDetailDesc');
            if (descEl) { descEl.textContent = (ticket.description || '').trim(); descEl.style.display = (ticket.description || '').trim() ? '' : 'none'; }
            const overdueEl = document.getElementById('ticketDetailOverdue');
            if (overdueEl) {
                const due = ticket.dueDate;
                const isOverdue = due && ['open','in_progress'].indexOf(ticket.status) >= 0 && new Date(due) < new Date();
                overdueEl.style.display = isOverdue ? '' : 'none';
            }
            const statusSel = document.getElementById('ticketDetailStatus');
            const assigneeSel = document.getElementById('ticketDetailAssignee');
            const prioritySel = document.getElementById('ticketDetailPriority');
            const dueInp = document.getElementById('ticketDetailDueDate');
            if (statusSel) statusSel.value = ticket.status || 'open';
            if (assigneeSel) { await loadTicketFormSelects(); assigneeSel.value = ticket.assignedTo || ''; }
            if (prioritySel) prioritySel.value = ticket.priority || 'normal';
            if (dueInp && ticket.dueDate) { const d = new Date(ticket.dueDate); dueInp.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } else if (dueInp) dueInp.value = '';
            const repliesHtml = (ticket.replies || []).map(function(r) {
                const att = (r.attachments && r.attachments.length) ? r.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent); margin-left:8px;">📎 ' + escapeHtml(a.name || t('file')) + '</a>'; }).join('') : '';
                return '<div class="ticket-reply-msg ' + (String(r.userId) === String(currentUser && currentUser.id) ? 'out' : 'in') + '"><div class="ticket-reply-content">' + linkifyMessageContent(r.content || '') + '</div>' + att + '<div class="ticket-reply-meta">' + userDisplay(r.user) + ' · ' + (r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('ticketReplies').innerHTML = repliesHtml || '<p class="ticket-no-replies text-muted">' + t('no_reply') + '</p>';
            document.getElementById('ticketReplyContent').value = '';
            document.getElementById('ticketReplyFile').value = '';
            document.getElementById('ticketReplyAttachments').textContent = '';
        }
        async function submitTicketReply() {
            if (!currentTicketId) return;
            const content = (document.getElementById('ticketReplyContent') && document.getElementById('ticketReplyContent').value) || '';
            const fileInput = document.getElementById('ticketReplyFile');
            const attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                const up = await fetch((API || '') + '/api/upload', { method: 'POST', credentials: 'include', body: formData });
                const upData = await up.json().catch(function() { return {}; });
                if (!up.ok || !upData.url) { toast((upData.error || (LANG === 'fa' ? 'خطا در آپلود فایل' : 'Upload failed')), true); return; }
                attachments.push({ url: upData.url, name: upData.name || (t('file') || 'فایل'), size: upData.size });
            }
            if (!content.trim() && attachments.length === 0) { toast(t('reply_or_file_required'), true); return; }
            const res = await apiFetch('/api/tickets/' + currentTicketId + '/replies', { method: 'POST', body: JSON.stringify({ content: content.trim() || (LANG === 'fa' ? '(پیوست)' : '(Attachment)'), attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_reply_sent')); loadTicketDetail(currentTicketId); if (fileInput) fileInput.value = ''; const attEl = document.getElementById('ticketReplyAttachments'); if (attEl) attEl.textContent = ''; } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let currentTaskId = null;
        let taskQuickTab = 'all';
        function setTaskQuickTab(tab) {
            taskQuickTab = tab || 'all';
            const tabs = document.querySelectorAll('.task-quick-tabs .task-tab');
            if (tabs) tabs.forEach(function(btn) { btn.classList.toggle('active', (btn.getAttribute('data-tab') || '') === taskQuickTab); });
            const statusSel = document.getElementById('taskFilterStatus');
            if (statusSel) statusSel.value = (tab === 'all' ? '' : tab);
