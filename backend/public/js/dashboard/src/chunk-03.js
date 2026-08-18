        /* ========== Kaya CRM chunk-03 | مکالمات، مشتریان، setupGlobalEventHandlers | docs/CODEBASE-MAP.md ========== */
        /* ========== Global Event Handlers Setup ========== */
        function setupGlobalEventHandlers() {
            const bindOnce = function(el, key, handler) {
                if (!el || typeof handler !== 'function') return;
                if (el[key]) return;
                el[key] = true;
                el.addEventListener('click', handler);
            };
            const bindOnceKeyup = function(el, key, handler) {
                if (!el || typeof handler !== 'function') return;
                if (el[key]) return;
                el[key] = true;
                el.addEventListener('keyup', handler);
            };
            // Header menu button — remove inline onclick to avoid double-toggle (open then immediate close)
            const menuBtn = document.getElementById('headerMenuBtn');
            if (menuBtn) menuBtn.removeAttribute('onclick');
            bindOnce(menuBtn, '_crmBoundMenu', toggleSidebarMobile);
            
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            if (sidebarOverlay) sidebarOverlay.removeAttribute('onclick');
            bindOnce(sidebarOverlay, '_crmBoundOverlay', closeSidebarMobile);
            
            // Header announcement toggle button
            const annToggleBtn = document.getElementById('headerAnnToggleBtn');
            bindOnce(annToggleBtn, '_crmBoundAnnToggle', toggleAnnouncementMarquee);
            
            // Header search triggers
            const searchTrigger = document.getElementById('headerSearchTrigger');
            bindOnce(searchTrigger, '_crmBoundSearchTrigger', openHeaderSearchPopup);
            
            const searchTriggerDesktop = document.getElementById('headerSearchTriggerDesktop');
            bindOnce(searchTriggerDesktop, '_crmBoundSearchTriggerDesktop', openHeaderSearchPopup);
            
            const headerSearchModal = document.getElementById('headerSearchModal');
            if (headerSearchModal && !headerSearchModal._crmBoundSearchModal) {
                headerSearchModal._crmBoundSearchModal = true;
                headerSearchModal.addEventListener('click', function(e) {
                    if (e.target === headerSearchModal) closeHeaderSearchPopup();
                });
            }
            
            const headerSearchClose = document.querySelector('#headerSearchModal .modal-close');
            bindOnce(headerSearchClose, '_crmBoundSearchClose', closeHeaderSearchPopup);
            
            const headerSearchModalInput = document.getElementById('headerSearchModalInput');
            bindOnceKeyup(headerSearchModalInput, '_crmBoundSearchModalInput', function(e) {
                if (e.key === 'Enter') doHeaderSearchFromModal();
            });
            
            const userDropdownHandler = function(e) { toggleUserDropdown(e); };
            const userDropdownMobile = document.getElementById('userDropdownTriggerMobile');
            bindOnce(userDropdownMobile, '_crmBoundUserDropdown', userDropdownHandler);
            const userDropdownDesktop = document.getElementById('userDropdownTrigger');
            bindOnce(userDropdownDesktop, '_crmBoundUserDropdown', userDropdownHandler);
            
            const headerLogo = document.getElementById('headerLogo');
            bindOnce(headerLogo, '_crmBoundLogo', function(e) {
                e.preventDefault();
                showPage('dashboard');
                closeSidebarMobile();
            });
            
            const chatBackBtn = document.getElementById('chatBackBtn');
            if (chatBackBtn && typeof closeChatMobile === 'function') {
                bindOnce(chatBackBtn, '_crmBoundChatBack', closeChatMobile);
            }
            
            const headerSearch = document.getElementById('headerSearch');
            bindOnceKeyup(headerSearch, '_crmBoundHeaderSearch', function(e) {
                if (e.key === 'Enter') doHeaderSearch();
            });
            
            document.querySelectorAll('.header-quick-btn').forEach(function(btn) {
                if (btn._crmBoundQuick) return;
                btn._crmBoundQuick = true;
                btn.addEventListener('click', function(e) { handleHeaderQuickBtnClick(e, btn); });
            });
            
            document.querySelectorAll('.header-lang-btn').forEach(function(btn) {
                if (btn._crmBoundLang) return;
                btn._crmBoundLang = true;
                btn.addEventListener('click', function() {
                    const lang = btn.getAttribute('data-lang');
                    if (lang) window.setLang(lang);
                });
            });
            
            document.querySelectorAll('.language-dropdown button[data-lang]').forEach(function(btn) {
                if (btn._crmBoundLangDrop) return;
                btn._crmBoundLangDrop = true;
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const lang = btn.getAttribute('data-lang');
                    if (lang) window.setLang(lang);
                });
            });

            const annSort = document.getElementById('announcementSort');
            if (annSort && !annSort._crmBoundAnnSort) {
                annSort._crmBoundAnnSort = true;
                annSort.addEventListener('change', function() {
                    if (typeof setAnnouncementsSort === 'function') setAnnouncementsSort(annSort.value);
                });
            }
            const ratesPeriod = document.getElementById('ratesChartPeriod');
            if (ratesPeriod && !ratesPeriod._crmBoundRatesPeriod) {
                ratesPeriod._crmBoundRatesPeriod = true;
                ratesPeriod.addEventListener('change', function() {
                    if (typeof loadRatesCharts === 'function') loadRatesCharts();
                });
            }
            const ticketSearch = document.getElementById('ticketSearch');
            if (ticketSearch && !ticketSearch._crmBoundTicketSearch) {
                ticketSearch._crmBoundTicketSearch = true;
                ticketSearch.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && typeof loadTickets === 'function') loadTickets();
                });
            }
            const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
            if (sidebarToggleBtn) sidebarToggleBtn.removeAttribute('onclick');
            bindOnce(sidebarToggleBtn, '_crmBoundSidebarToggle', toggleSidebarDesktop);
            const dashRefreshBtn = document.getElementById('dashboardRefreshBtn');
            bindOnce(dashRefreshBtn, '_crmBoundDashRefresh', function() {
                if (typeof refreshDashboard === 'function') refreshDashboard();
            });
        }
        
        function handleHeaderQuickBtnClick(e, btn) {
            const onclick = btn.getAttribute('onclick') || btn.getAttribute('data-onclick-backup') || btn.getAttribute('data-onclick') || '';
            if (onclick === "showPage('conversations'); openNewConvModal();") {
                showPage('conversations');
                setTimeout(openNewConvModal, 100);
            } else if (onclick === "showPage('customers'); openCustomerModal();") {
                showPage('customers');
                setTimeout(openCustomerModal, 100);
            } else if (btn.getAttribute('data-quick-action') === 'ticket-new' || onclick.indexOf('toggleTicketForm') !== -1) {
                showPage('tickets');
                setTimeout(function() { toggleTicketForm(true); }, 350);
            }
        }
        
        /* ========== Conversation Event Handlers Setup ========== */
        let convListClickHandler = null;
        function handleConvLoadMoreClick() {
            convCurrentPage++;
            loadConversations(true);
        }
        function updateConvRating(convId, newRating) {
            if (!convId || !newRating) return;
            document.querySelectorAll('#convRatingStars .conv-rating-star').forEach(function(s) {
                var v = parseInt(s.getAttribute('data-rating'), 10);
                s.classList.toggle('active', v <= newRating);
            });
            apiFetch('/api/conversations/' + convId, { method: 'PATCH', body: JSON.stringify({ rating: newRating }) }).then(function(res) {
                if (res.ok && currentConvDetail) currentConvDetail.rating = newRating;
            });
        }

        var CONV_QUICK_TABS_COLLAPSE_LS = 'crm_conv_quick_tabs_collapsed';
        function updateConvAdvancedFiltersBadge() {
            var dot = document.getElementById('convFilterActiveDot');
            var btn = document.getElementById('convFilterToggle');
            if (!dot && !btn) return;
            var active = false;
            ['convFilterStatus', 'convFilterPriority', 'convFilterBranch', 'convFilterDept', 'convFilterAssignee'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.value) active = true;
            });
            if (dot) dot.hidden = !active;
            if (btn) btn.classList.toggle('has-active-filters', active);
        }
        function resetConvFilters() {
            ['convFilterStatus', 'convFilterPriority', 'convFilterBranch', 'convFilterDept', 'convFilterAssignee'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.value = '';
            });
            var searchEl = document.getElementById('convSearch');
            if (searchEl) searchEl.value = '';
            updateConvAdvancedFiltersBadge();
            applyConvFilters();
        }
        window.resetConvFilters = resetConvFilters;

        function updateConvQuickTabsToggleUi() {
            var bar = document.getElementById('convQuickTabsBar');
            var btn = document.getElementById('btnConvQuickTabsToggle');
            if (!bar || !btn) return;
            var collapsed = bar.classList.contains('is-collapsed');
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            var hideLbl = t('conv_quick_tabs_hide');
            var showLbl = t('conv_quick_tabs_show');
            btn.setAttribute('title', collapsed ? showLbl : hideLbl);
            btn.setAttribute('aria-label', collapsed ? showLbl : hideLbl);
            var textSpan = btn.querySelector('.conv-quick-tabs-toggle-text');
            if (textSpan) {
                textSpan.textContent = collapsed ? showLbl : hideLbl;
                textSpan.setAttribute('data-i18n', collapsed ? 'conv_quick_tabs_show' : 'conv_quick_tabs_hide');
            }
        }
        function applyConvQuickTabsCollapsedState(collapsed) {
            var bar = document.getElementById('convQuickTabsBar');
            if (!bar) return;
            bar.classList.toggle('is-collapsed', !!collapsed);
            try { localStorage.setItem(CONV_QUICK_TABS_COLLAPSE_LS, collapsed ? '1' : '0'); } catch (_e) { /* ignore */ }
            updateConvQuickTabsToggleUi();
        }
        function initConvQuickTabsCollapse() {
            var bar = document.getElementById('convQuickTabsBar');
            var btn = document.getElementById('btnConvQuickTabsToggle');
            if (!bar || !btn || btn._convQuickTabsBound) return;
            btn._convQuickTabsBound = true;
            var stored = '0';
            try { stored = localStorage.getItem(CONV_QUICK_TABS_COLLAPSE_LS) || '0'; } catch (_e) { /* ignore */ }
            if (stored === '1') bar.classList.add('is-collapsed');
            updateConvQuickTabsToggleUi();
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                applyConvQuickTabsCollapsedState(!bar.classList.contains('is-collapsed'));
            });
        }

        function setupConversationEventHandlers() {
            // Conversation list items - event delegation
            const convList = document.getElementById('convList');
            
            if (convList) {
                // Remove old handler
                if (convListClickHandler) {
                    convList.removeEventListener('click', convListClickHandler);
                }
                
                // Create new handler
                convListClickHandler = function(e) {
                    const item = e.target.closest('.conv-list-item');
                    if (!item) return;
                    
                    const id = item.getAttribute('data-id');
                    const name = item.getAttribute('data-name');
                    const phone = item.getAttribute('data-phone');
                    const profilePic = item.getAttribute('data-profile-pic');
                    const customerId = item.getAttribute('data-customer-id');
                    const isGroup = item.getAttribute('data-is-group') === '1';
                    
                    if (id) {
                        openChat(id, name || '', phone || '', profilePic || '', isGroup, customerId || '');
                    }
                };
                
                convList.addEventListener('click', convListClickHandler);
            }
            // Close button handlers
            const annCloseBtn = document.getElementById('annMarqueeCloseBtn');
            if (annCloseBtn) {
                annCloseBtn.removeEventListener('click', closeAnnouncementMarquee);
                annCloseBtn.addEventListener('click', closeAnnouncementMarquee);
            }
            
            const annMoreBtn = document.getElementById('annMarqueeMoreBtn');
            if (annMoreBtn) {
                annMoreBtn.removeEventListener('click', handleAnnMoreClick);
                annMoreBtn.addEventListener('click', handleAnnMoreClick);
            }
            
            const annTrack = document.getElementById('annMarqueeTrack');
            if (annTrack) {
                annTrack.removeEventListener('mouseenter', pauseAnnouncementMarquee);
                annTrack.removeEventListener('mouseleave', resumeAnnouncementMarquee);
                annTrack.addEventListener('mouseenter', pauseAnnouncementMarquee);
                annTrack.addEventListener('mouseleave', resumeAnnouncementMarquee);
            }
            const annImportantEl = document.getElementById('annImportant');
            if (annImportantEl && !annImportantEl._hintBound) {
                annImportantEl._hintBound = true;
                annImportantEl.addEventListener('change', toggleAnnImportantHint);
            }
            
            // Marquee items delegation
            const marqueeInner = document.querySelector('.announcement-marquee-inner');
            if (marqueeInner) {
                marqueeInner.removeEventListener('click', handleMarqueeItemClick);
                marqueeInner.addEventListener('click', handleMarqueeItemClick);
            }
            
            // Sync groups button
            const syncBtn = document.getElementById('btnSyncGroups');
            if (syncBtn) {
                syncBtn.removeEventListener('click', syncWhatsAppGroups);
                syncBtn.addEventListener('click', syncWhatsAppGroups);
            }
            
            // New conversation button
            const newConvBtn = document.getElementById('btnNewConv');
            if (newConvBtn) {
                newConvBtn.removeEventListener('click', openNewConvModal);
                newConvBtn.addEventListener('click', openNewConvModal);
            }
            
            initConvQuickTabsCollapse();

            // Quick tab buttons
            document.querySelectorAll('.conv-quick-tabs .conv-tab').forEach(function(btn) {
                btn.removeEventListener('click', handleQuickTabClick);
                btn.addEventListener('click', handleQuickTabClick);
            });
            
            // Search input
            const searchInput = document.getElementById('convSearch');
            if (searchInput) {
                searchInput.removeEventListener('keypress', handleSearchKeyPress);
                searchInput.addEventListener('keypress', handleSearchKeyPress);
            }
            
            // Filter toggle
            const filterToggle = document.getElementById('convFilterToggle');
            if (filterToggle) {
                filterToggle.removeEventListener('click', toggleConvAdvancedFilters);
                filterToggle.addEventListener('click', toggleConvAdvancedFilters);
            }
            
            // Apply filters button
            const applyBtn = document.getElementById('btnApplyConvFilters');
            if (applyBtn) {
                applyBtn.removeEventListener('click', applyConvFilters);
                applyBtn.addEventListener('click', applyConvFilters);
            }
            const resetBtn = document.getElementById('btnResetConvFilters');
            if (resetBtn) {
                resetBtn.removeEventListener('click', resetConvFilters);
                resetBtn.addEventListener('click', resetConvFilters);
            }
            
            updateConvAdvancedFiltersBadge();
            // Filter selects - change events
            ['convFilterStatus', 'convFilterPriority', 'convFilterBranch', 'convFilterDept', 'convFilterAssignee'].forEach(function(id) {
                const select = document.getElementById(id);
                if (select) {
                    select.removeEventListener('change', applyConvFilters);
                    select.addEventListener('change', applyConvFilters);
                }
            });
            
            // Chat detail toggle
            const detailToggle = document.getElementById('chatDetailToggle');
            if (detailToggle) {
                detailToggle.removeEventListener('click', toggleChatDetailBar);
                detailToggle.addEventListener('click', toggleChatDetailBar);
            }
            const convMgmtClose = document.getElementById('convMgmtClose');
            if (convMgmtClose) {
                convMgmtClose.removeEventListener('click', closeConvMgmtPanel);
                convMgmtClose.addEventListener('click', closeConvMgmtPanel);
            }
            const convMgmtBackdrop = document.getElementById('convMgmtBackdrop');
            if (convMgmtBackdrop) {
                convMgmtBackdrop.removeEventListener('click', closeConvMgmtPanel);
                convMgmtBackdrop.addEventListener('click', closeConvMgmtPanel);
            }
            const chatHeaderSummary = document.getElementById('chatHeaderSummary');
            if (chatHeaderSummary) {
                chatHeaderSummary.removeEventListener('click', openConvMgmtPanel);
                chatHeaderSummary.addEventListener('click', openConvMgmtPanel);
            }
            
            // New conversation modal close button
            const newConvModalClose = document.querySelector('#newConvModal .modal-close');
            if (newConvModalClose) {
                newConvModalClose.removeEventListener('click', closeNewConvModal);
                newConvModalClose.addEventListener('click', closeNewConvModal);
            }

            const forwardModalClose = document.querySelector('#forwardMsgModal .modal-close');
            if (forwardModalClose) {
                forwardModalClose.removeEventListener('click', closeForwardMsgModal);
                forwardModalClose.addEventListener('click', closeForwardMsgModal);
            }
            const forwardSearch = document.getElementById('forwardMsgCustomerSearch');
            if (forwardSearch) {
                forwardSearch.removeEventListener('input', onForwardCustomerSearchInput);
                forwardSearch.addEventListener('input', onForwardCustomerSearchInput);
            }
            
            // Conversation detail delete/archive buttons
            const convDeleteBtn = document.getElementById('btnConvDelete');
            if (convDeleteBtn) {
                convDeleteBtn.removeEventListener('click', deleteConversation);
                convDeleteBtn.addEventListener('click', deleteConversation);
            }
            
            const convArchiveBtn = document.getElementById('btnConvArchive');
            if (convArchiveBtn) {
                convArchiveBtn.removeEventListener('click', archiveConversation);
                convArchiveBtn.addEventListener('click', archiveConversation);
            }

            const convHideBtn = document.getElementById('btnConvHide');
            if (convHideBtn) {
                convHideBtn.removeEventListener('click', toggleConvHidden);
                convHideBtn.addEventListener('click', toggleConvHidden);
            }
            const convGrantBtn = document.getElementById('btnConvGrantAccess');
            if (convGrantBtn) {
                convGrantBtn.removeEventListener('click', openConvGrantAccess);
                convGrantBtn.addEventListener('click', openConvGrantAccess);
            }
            
            const assignBtn = document.getElementById('btnAssignToMe');
            if (assignBtn) {
                assignBtn.removeEventListener('click', assignConvToMe);
                assignBtn.addEventListener('click', assignConvToMe);
            }

            // نوار جزئیات مکالمه + پیوست/ویس/تمپلیت — باید با ورود به صفحه مکالمات بایند شود (نه فقط staff-activity)
            let updateConvBtn = document.getElementById('convDetailApplyBtn');
            if (!updateConvBtn) {
                updateConvBtn = document.querySelector('[onclick*="updateConvFromDetail"], [data-onclick-backup*="updateConvFromDetail"]');
            }
            if (!updateConvBtn) {
                updateConvBtn = document.querySelector('.conv-detail-bar button[data-i18n="btn_apply"]');
            }
            if (updateConvBtn) {
                updateConvBtn.removeEventListener('click', updateConvFromDetail);
                updateConvBtn.addEventListener('click', updateConvFromDetail);
            }
            const msgFileInput = document.getElementById('msgFileInput');
            if (msgFileInput) {
                const _prevFileHandler = msgFileInput._previewHandler;
                if (_prevFileHandler) msgFileInput.removeEventListener('change', _prevFileHandler);
                msgFileInput._previewHandler = function() {
                    const f = this.files && this.files[0];
                    if (f) showFilePreview(f);
                    else clearFilePreview();
                    updateWaComposerState();
                };
                msgFileInput.addEventListener('change', msgFileInput._previewHandler);
            }
            const msgInput = document.getElementById('msgInput');
            if (msgInput) {
                if (msgInput._waInputHandler) msgInput.removeEventListener('input', msgInput._waInputHandler);
                if (msgInput._waKeydownHandler) msgInput.removeEventListener('keydown', msgInput._waKeydownHandler);
                msgInput._waInputHandler = function() { updateWaComposerState(); };
                msgInput._waKeydownHandler = function(e) {
                    if (e.key !== 'Enter') return;
                    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || (e.isComposing === true)) return;
                    e.preventDefault();
                    sendMsg();
                };
                msgInput.addEventListener('input', msgInput._waInputHandler);
                msgInput.addEventListener('keydown', msgInput._waKeydownHandler);
            }
            const filePreviewRemove = document.getElementById('chatFilePreviewRemove');
            if (filePreviewRemove) {
                filePreviewRemove.onclick = function() { clearFilePreview(); };
            }
            // دکمه‌های ویس از onclick در HTML استفاده می‌کنند — addEventListener دوباره همان handler را صدا می‌زند
            const chatReplyCancelBtn = document.querySelector('.chat-reply-cancel');
            if (chatReplyCancelBtn) {
                chatReplyCancelBtn.removeEventListener('click', cancelReply);
                chatReplyCancelBtn.addEventListener('click', cancelReply);
            }
            document.querySelectorAll('#convRatingStars .conv-rating-star').forEach(function(star) {
                if (star._crmRatingClick) star.removeEventListener('click', star._crmRatingClick);
                star._crmRatingClick = function() {
                    updateConvRating(currentConvId, parseInt(this.getAttribute('data-rating'), 10));
                };
                star.addEventListener('click', star._crmRatingClick);
            });
            updateWaComposerState();
            initConversationsMobileEnhancements();
        }

        /** موبایل / iOS: فاصلهٔ کیبورد مجازی (visualViewport) + اسکرول هنگام فوکوس روی ورودی پیام */
        function initConversationsMobileEnhancements() {
            if (window._crmConvMobileInit) return;
            window._crmConvMobileInit = true;
            function isConvNarrow() {
                return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
            }
            function applyKbInset() {
                if (!isConvNarrow()) {
                    document.documentElement.style.setProperty('--crm-ios-kb', '0px');
                    return;
                }
                var vv = window.visualViewport;
                if (!vv) {
                    document.documentElement.style.setProperty('--crm-ios-kb', '0px');
                    return;
                }
                var inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
                document.documentElement.style.setProperty('--crm-ios-kb', inset + 'px');
            }
            window.applyCrmConvKbInset = applyKbInset;
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', applyKbInset);
                window.visualViewport.addEventListener('scroll', applyKbInset);
            }
            window.addEventListener('orientationchange', function() { setTimeout(applyKbInset, 400); });
            var msgInput = document.getElementById('msgInput');
            if (msgInput && !msgInput._crmIosFocusBound) {
                msgInput._crmIosFocusBound = true;
                msgInput.addEventListener('focus', function() {
                    if (!isConvNarrow()) return;
                    setTimeout(function() {
                        applyKbInset();
                        try {
                            msgInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        } catch (e1) { try { msgInput.scrollIntoView(false); } catch (e2) {} }
                        var pane = document.getElementById('chatMessages');
                        if (pane) {
                            try {
                                pane.scrollTop = pane.scrollHeight;
                            } catch (e3) {}
                        }
                    }, 300);
                });
                msgInput.addEventListener('blur', function() { setTimeout(applyKbInset, 120); });
            }
            applyKbInset();
        }
        
        // Setup Profile page event handlers
        function setupProfileEventHandlers() {
            // Save profile button
            const saveBtn = document.getElementById('profileSaveBtn');
            if (saveBtn) {
                saveBtn.removeEventListener('click', saveProfile);
                saveBtn.addEventListener('click', saveProfile);
            }
            
            // TOTP setup button (dynamically created)
            const totpSetupBtn = document.getElementById('totpSetupBtnDynamic');
            if (totpSetupBtn) {
                totpSetupBtn.removeEventListener('click', openTotpSetup);
                totpSetupBtn.addEventListener('click', openTotpSetup);
            }
            
            // TOTP disable button (dynamically created)
            const totpDisableBtn = document.getElementById('totpDisableBtnDynamic');
            if (totpDisableBtn) {
                totpDisableBtn.removeEventListener('click', openTotpDisableModal);
                totpDisableBtn.addEventListener('click', openTotpDisableModal);
            }

            const tgGen = document.getElementById('btnGenerateTelegramToken');
            if (tgGen) {
                tgGen.removeEventListener('click', generateTelegramLinkToken);
                tgGen.addEventListener('click', generateTelegramLinkToken);
            }
            const tgUn = document.getElementById('btnUnlinkTelegram');
            if (tgUn) {
                tgUn.removeEventListener('click', unlinkTelegram);
                tgUn.addEventListener('click', unlinkTelegram);
            }
            const tgCopy = document.getElementById('btnCopyTelegramToken');
            if (tgCopy) {
                tgCopy.removeEventListener('click', copyTelegramToken);
                tgCopy.addEventListener('click', copyTelegramToken);
            }
        }
        
        // Setup Staff Activity event handlers (staff-activity page only)
        function setupStaffActivityEventHandlers() {
            const bindOnceClick = function(el, key, fn) {
                if (!el || typeof fn !== 'function' || el[key]) return;
                el[key] = true;
                el.addEventListener('click', fn);
            };
            bindOnceClick(document.getElementById('staffActivityRefresh'), '_crmStaffRefresh', function() {
                loadStaffActivity({ refreshAttendance: true });
            });
            bindOnceClick(document.getElementById('attendanceApplyBtn'), '_crmAttendanceApply', loadAttendanceReport);
            document.querySelectorAll('.staff-activity-tab').forEach(function(btn) {
                if (btn._crmStaffTabBound) return;
                btn._crmStaffTabBound = true;
                btn.addEventListener('click', function() {
                    switchStaffActivityTab(btn.getAttribute('data-staff-tab'));
                });
            });
            document.querySelectorAll('.staff-stat-card-btn').forEach(function(btn) {
                if (btn._crmStaffStatBound) return;
                btn._crmStaffStatBound = true;
                btn.addEventListener('click', function() {
                    switchStaffActivityTab(btn.getAttribute('data-staff-tab'));
                });
            });
            document.querySelectorAll('.staff-status-chip').forEach(function(chip) {
                if (chip._crmStaffStatusBound) return;
                chip._crmStaffStatusBound = true;
                chip.addEventListener('click', function() {
                    staffActivityStatusFilter = chip.getAttribute('data-status') || 'all';
                    document.querySelectorAll('.staff-status-chip').forEach(function(c) {
                        c.classList.toggle('active', c === chip);
                    });
                    renderOnlineStaffList();
                });
            });
            const onlineFilter = document.getElementById('staffOnlineFilter');
            if (onlineFilter && !onlineFilter._crmStaffOnlineFilter) {
                onlineFilter._crmStaffOnlineFilter = true;
                onlineFilter.addEventListener('input', renderOnlineStaffList);
            }
            const loginsFilter = document.getElementById('staffLoginsFilter');
            if (loginsFilter && !loginsFilter._crmStaffLoginsFilter) {
                loginsFilter._crmStaffLoginsFilter = true;
                loginsFilter.addEventListener('input', renderLoginsList);
            }
            const userSearch = document.getElementById('staffActivityUserSearch');
            if (userSearch && !userSearch._crmStaffUserSearch) {
                userSearch._crmStaffUserSearch = true;
                userSearch.addEventListener('input', function() { renderStaffActivityQuickFind(userSearch.value); });
                userSearch.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        userSearch.value = '';
                        renderStaffActivityQuickFind('');
                    }
                });
            }
            bindOnceClick(document.getElementById('staffActivitySearchClear'), '_crmStaffSearchClear', function() {
                const inp = document.getElementById('staffActivityUserSearch');
                if (inp) inp.value = '';
                renderStaffActivityQuickFind('');
            });
            document.querySelectorAll('.attendance-preset').forEach(function(btn) {
                if (btn._crmAttPresetBound) return;
                btn._crmAttPresetBound = true;
                btn.addEventListener('click', function() {
                    applyAttendanceDatePreset(btn.getAttribute('data-preset'));
                });
            });
        }
        
        function handleQuickTabClick(e) {
            if (e && e.target && e.target.getAttribute) {
                const tab = e.target.getAttribute('data-tab');
                if (tab) setConvQuickTab(tab);
            }
        }
        
        function handleSearchKeyPress(e) {
            if (e && e.key === 'Enter') {
                applyConvFilters();
            }
        }
        
        const convPageSize = 50;
        function applyPendingConvQuickTab(tab) {
            convQuickTab = tab || 'all';
            convCurrentPage = 1;
            document.querySelectorAll('#convQuickTabsBar .conv-tab, #convQuickTabsPanel .conv-tab').forEach(function(b){
                b.classList.toggle('active', b.getAttribute('data-tab') === convQuickTab);
            });
        }
        window.applyPendingConvQuickTab = applyPendingConvQuickTab;
        function setConvQuickTab(tab) {
            applyPendingConvQuickTab(tab);
            applyConvFilters();
        }
        function toggleConvAdvancedFilters() {
            const el = document.getElementById('convAdvancedFilters');
            const btn = document.getElementById('convFilterToggle');
            if (el && btn) { el.classList.toggle('show'); btn.setAttribute('aria-expanded', el.classList.contains('show')); }
        }
        function canViewArchivedConversations() { const r = (currentUser && currentUser.role) || ''; return ['owner','admin','manager'].indexOf(r) >= 0; }
        function canViewHiddenConversations() {
            const r = (currentUser && currentUser.role) || '';
            if (r === 'owner' || r === 'admin') return true;
            if (currentUser && currentUser.isMainAdmin) return true;
            return false;
        }
        function canManageConversations() {
            if (currentUser && currentUser.canManageConversations) return true;
            const r = (currentUser && currentUser.role) || '';
            return r === 'owner' || !!(currentUser && currentUser.isProtectedAdmin);
        }
        /** نمایش تب آرشیو / محدود — فقط ادمین سطح بالا؛ از صفحه مکالمات صدا زده می‌شود */
        function refreshConvAdminTabs() {
            const show = canViewHiddenConversations();
            const tabArchived = document.getElementById('convTabArchived');
            const tabRestricted = document.getElementById('convTabRestricted');
            if (tabArchived) {
                tabArchived.style.display = show ? 'inline-flex' : 'none';
                tabArchived.textContent = t('filter_archived') || (LANG === 'fa' ? 'آرشیو (شماره قبلی)' : 'Archive');
            }
            if (tabRestricted) {
                tabRestricted.style.display = show ? 'inline-flex' : 'none';
                tabRestricted.textContent = t('filter_restricted') || (LANG === 'fa' ? 'محدود / قفل‌شده' : 'Restricted');
            }
            if (typeof refreshCustomerAdminTabs === 'function') refreshCustomerAdminTabs();
            if (show) {
                const bar = document.getElementById('convQuickTabsBar');
                if (bar && bar.classList.contains('is-collapsed')) {
                    bar.classList.remove('is-collapsed');
                    try { localStorage.setItem(CONV_QUICK_TABS_COLLAPSE_LS, '0'); } catch (_e) { /* ignore */ }
                    if (typeof updateConvQuickTabsToggleUi === 'function') updateConvQuickTabsToggleUi();
                }
                const panel = document.getElementById('convQuickTabsPanel');
                const toggle = document.getElementById('btnConvQuickTabsToggle');
                if (panel && panel.hidden) {
                    panel.hidden = false;
                    if (toggle) toggle.setAttribute('aria-expanded', 'true');
                }
            }
        }

        var customerQuickTab = 'active';
        function refreshCustomerAdminTabs() {
            const show = canViewHiddenConversations();
            const tabArchive = document.getElementById('custTabArchive');
            const tabsWrap = document.getElementById('customerViewTabs');
            const hint = document.getElementById('customerArchiveHint');
            if (tabsWrap) tabsWrap.style.display = show ? 'flex' : 'none';
            if (tabArchive) {
                tabArchive.style.display = show ? 'inline-flex' : 'none';
                tabArchive.textContent = t('customers_tab_archive') || t('filter_archived') || (LANG === 'fa' ? 'آرشیو (شماره قبلی)' : 'Archive');
            }
            const tabActive = document.getElementById('custTabActive');
            if (tabActive) {
                tabActive.textContent = t('customers_tab_active') || (LANG === 'fa' ? 'مشتریان فعال' : 'Active customers');
            }
            if (!show && customerQuickTab === 'archive') {
                customerQuickTab = 'active';
                document.querySelectorAll('#customerViewTabs .conv-tab').forEach(function(b) {
                    const on = b.getAttribute('data-cust-tab') === 'active';
                    b.classList.toggle('active', on);
                    b.setAttribute('aria-selected', on ? 'true' : 'false');
                });
            }
            if (hint) {
                hint.style.display = show && customerQuickTab === 'archive' ? 'block' : 'none';
            }
        }
        function setCustomerQuickTab(tab) {
            if (tab !== 'active' && tab !== 'archive') return;
            if (tab === 'archive' && !canViewHiddenConversations()) return;
            customerQuickTab = tab;
            document.querySelectorAll('#customerViewTabs .conv-tab').forEach(function(b) {
                const on = b.getAttribute('data-cust-tab') === tab;
                b.classList.toggle('active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            const hint = document.getElementById('customerArchiveHint');
            if (hint) hint.style.display = tab === 'archive' ? 'block' : 'none';
            const title = document.getElementById('customerListTitle');
            if (title) {
                title.textContent = tab === 'archive'
                    ? (t('customers_tab_archive') || t('filter_archived') || 'Archive')
                    : (t('nav_customers') || 'Customers');
            }
            loadCustomers();
        }
        async function loadConvFiltersInit() {
            await loadConvAssignees();
            loadBranchesForSelect(['convFilterBranch']);
            const res = await apiFetch('/api/departments');
            if (res.ok && res.data && res.data.data) {
                const sel = document.getElementById('convFilterDept');
                if (sel) {
                    var opt = '<option value="" data-i18n="all_depts">' + escapeHtml(t('all_depts')) + '</option>' + res.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
                    sel.innerHTML = opt;
                }
            }
            refreshConvAdminTabs();
            const statusFilter = document.getElementById('convFilterStatus');
            if (statusFilter && canViewHiddenConversations()) {
                const hasArchived = Array.from(statusFilter.options).some(function(o){ return o.value === 'archived'; });
                if (!hasArchived) { var opt = document.createElement('option'); opt.value = 'archived'; opt.setAttribute('data-i18n', 'status_archived'); opt.textContent = t('filter_archived') || t('status_archived') || 'Archived'; statusFilter.appendChild(opt); }
            }
        }
        async function syncWhatsAppGroups() {
            const btn = document.getElementById('btnSyncGroups');
            const textSpan = btn && btn.querySelector('.conv-sync-text');
            const syncText = t('conv_sync_groups') || (LANG === 'fa' ? 'همگام‌سازی چت‌ها و گروه‌ها' : 'Sync chats & groups');
            if (btn) {
                btn.disabled = true;
                btn.classList.add('is-syncing');
                if (textSpan) textSpan.textContent = (LANG === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...');
                else btn.textContent = (LANG === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...');
            }
            try {
                const res = await apiFetch('/api/conversations/sync-groups', { method: 'POST', timeoutMs: 180000 });
                if (res.needLogin) return;
                if (res.ok) {
                    toast((res.data && res.data.message) || (LANG === 'fa' ? 'چت‌ها و گروه‌ها همگام شدند' : 'Chats & groups synced'));
                    setConvQuickTab('all');
                    loadConversations();
                } else {
                    let errMsg = (typeof getApiError === 'function' ? getApiError(res) : null)
                        || (res.data && res.data.error)
                        || res.error
                        || (LANG === 'fa' ? 'خطا در همگام‌سازی' : 'Sync failed');
                    // پیام قدیمی «تب Gateway را وصل کنید» را نشان نده — متن سرور یا راهنمای کوتاه
                    if (/تب Gateway را وصل کنید|Gateway را وصل کنید \(QR\)/i.test(String(errMsg))) {
                        errMsg = LANG === 'fa'
                            ? 'همگام‌سازی الان کامل نشد. چند ثانیه صبر کنید و دوباره بزنید.'
                            : 'Sync did not finish. Wait a few seconds and try again.';
                    }
                    const generic =
                        !errMsg ||
                        /sunucu hatas[iı]|server error|خطای سرور|html\b/i.test(String(errMsg));
                    if (generic && (res.status === 503 || res.status === 502)) {
                        errMsg = LANG === 'fa'
                            ? 'همگام‌سازی طول کشید یا موقتاً قطع شد. چند ثانیه بعد دوباره بزنید.'
                            : 'Sync timed out or was interrupted. Try again shortly.';
                    }
                    toast(errMsg, true);
                }
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('is-syncing');
                    if (textSpan) textSpan.textContent = syncText;
                    else btn.textContent = syncText;
                }
            }
        }
        function letterAvatarVars(seed) {
            var s = String(seed || '');
            var h = 0;
            for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
            var hue = Math.abs(h) % 360;
            return '--av-bg:hsla(' + hue + ',42%,22%,1);--av-fg:hsla(' + hue + ',48%,84%,1);';
        }
        function convStatusLabelUi(status) {
            var map = { open: 'status_open', pending: 'status_pending', closed: 'status_closed', resolved: 'status_resolved', archived: 'status_archived' };
            var key = map[status];
            return key ? t(key) : (status || '');
        }
        function convPriorityLabelUi(priority) {
            if (!priority) return '';
            var key = 'priority_' + priority;
            return t(key) || priority;
        }
        function renderConvDetailBadges(d) {
            if (!d) return;
            var badgesEl = document.getElementById('convDetailBadges');
            if (!badgesEl) return;
            var assigneeName = userDisplay(d.assignee) || t('no_assignee');
            var deptName = (d.department && d.department.name) ? d.department.name : '';
            var statusLabel = convStatusLabelUi(d.status);
            var prioLabel = convPriorityLabelUi(d.priority);
            badgesEl.innerHTML = '<span role="listitem" class="conv-detail-badge"><span class="conv-badge-label">' + escapeHtml(t('conv_form_status')) + '</span>' + escapeHtml(statusLabel) + '</span><span role="listitem" class="conv-detail-badge"><span class="conv-badge-label">' + escapeHtml(t('conv_form_priority')) + '</span>' + escapeHtml(prioLabel) + '</span><span role="listitem" class="conv-detail-badge conv-badge-assignee"><span class="conv-badge-label">' + escapeHtml(t('conv_form_assignee')) + '</span><span class="conv-badge-assignee-wrap">' + (d.assignee ? internalMsgAvatarHtml(d.assignee, 'conv-badge-assignee-avatar') : '') + '<span class="conv-badge-assignee-name">' + escapeHtml(assigneeName) + '</span></span></span>' + (deptName ? '<span role="listitem" class="conv-detail-badge conv-badge-dept"><span class="conv-badge-label">' + escapeHtml(t('label_dept')) + '</span>' + escapeHtml(deptName) + '</span>' : '') + (d.isHiddenFromStaff ? '<span role="listitem" class="conv-detail-badge conv-badge-hidden"><span class="conv-badge-label">' + escapeHtml(t('conv_hidden_badge')) + '</span>' + escapeHtml(t('conv_hidden_yes')) + '</span>' : '');
            renderChatHeaderSummary(d);
        }
        function renderChatHeaderSummary(d) {
            var el = document.getElementById('chatHeaderSummary');
            if (!el || !d) return;
            var assigneeName = userDisplay(d.assignee) || t('no_assignee');
            var deptName = (d.department && d.department.name) ? d.department.name : (t('no_dept') || '');
            var statusLabel = convStatusLabelUi(d.status);
            var prioLabel = convPriorityLabelUi(d.priority);
            var chips = '<span class="chat-hdr-chip">' + escapeHtml(statusLabel) + '</span>';
            if (d.priority && d.priority !== 'normal' && prioLabel) {
                chips += '<span class="chat-hdr-chip chat-hdr-chip--prio">' + escapeHtml(prioLabel) + '</span>';
            }
            if (deptName) chips += '<span class="chat-hdr-chip">' + escapeHtml(deptName) + '</span>';
            chips += '<span class="chat-hdr-chip chat-hdr-chip--assignee">' + escapeHtml(assigneeName) + '</span>';
            el.innerHTML = chips;
            el.removeAttribute('hidden');
            el.classList.add('visible');
        }
        function isConvMgmtMobile() {
            return window.matchMedia('(max-width: 900px)').matches;
        }
        function closeConvMgmtPanel() {
            var panel = document.getElementById('convMgmtPanel');
            var backdrop = document.getElementById('convMgmtBackdrop');
            var btn = document.getElementById('chatDetailToggle');
            var layout = document.querySelector('#pageConversations .conv-layout');
            if (panel) {
                panel.classList.remove('open');
                panel.setAttribute('hidden', '');
                panel.setAttribute('aria-hidden', 'true');
            }
            if (backdrop) {
                backdrop.hidden = true;
                backdrop.setAttribute('aria-hidden', 'true');
            }
            if (btn) btn.classList.remove('active');
            if (layout) layout.classList.remove('mgmt-open');
        }
        function openConvMgmtPanel() {
            var panel = document.getElementById('convMgmtPanel');
            var bar = document.getElementById('convDetailBar');
            var backdrop = document.getElementById('convMgmtBackdrop');
            var btn = document.getElementById('chatDetailToggle');
            var layout = document.querySelector('#pageConversations .conv-layout');
            if (!panel || !bar) return;
            bar.style.display = '';
            bar.removeAttribute('hidden');
            panel.removeAttribute('hidden');
            panel.setAttribute('aria-hidden', 'false');
            panel.classList.add('open');
            if (layout) layout.classList.add('mgmt-open');
            if (isConvMgmtMobile() && backdrop) {
                backdrop.hidden = false;
                backdrop.setAttribute('aria-hidden', 'false');
            }
            if (btn) btn.classList.add('active');
        }
        window.refreshConversationDetailBadges = function() {
            if (currentConvDetail) renderConvDetailBadges(currentConvDetail);
        };
        window.refreshConversationUiAfterLang = function() {
            try {
                if (typeof window.refreshConversationDetailBadges === 'function') window.refreshConversationDetailBadges();
                var fa = document.getElementById('convFilterAssignee');
                var va = fa ? fa.value : '';
                var da = document.getElementById('convDetailAssignee');
                var vd = da ? da.value : '';
                var dd = document.getElementById('convDetailDept');
                var vdd = dd ? dd.value : '';
                if (typeof loadConvAssignees === 'function') {
                    loadConvAssignees().then(function() {
                        try {
                            if (fa && fa.options && va !== undefined) fa.value = va;
                            if (da && da.options && vd !== undefined) da.value = vd;
                            if (dd && dd.options && vdd !== undefined) dd.value = vdd;
                        } catch (_e) { /* ignore */ }
                    });
                }
                var fd = document.getElementById('convFilterDept');
                if (fd && fd.options && fd.options.length && fd.options[0].value === '') {
                    fd.options[0].setAttribute('data-i18n', 'all_depts');
                    fd.options[0].textContent = t('all_depts');
                }
                updateConvQuickTabsToggleUi();
            } catch (e) { /* ignore */ }
        };

        let _loadConversationsInFlight = false;
        let _loadConversationsSeq = 0;
        let _convListRateLimitedUntil = 0;
        async function loadConversations(appendMode) {
            const list = document.getElementById('convList');
            const statsEl = document.getElementById('convStats');
            ensureMobileWaSender(false);
            if (!list) return;
            const seq = ++_loadConversationsSeq;
            if (Date.now() < _convListRateLimitedUntil) {
                if (!appendMode) {
                    list.innerHTML = '<div class="empty"><span class="empty-icon">💬</span><br>' + escapeHtml(t('loading_err') || '') + ' ' + escapeHtml(LANG === 'fa' ? 'تعداد درخواست‌ها زیاد است. کمی صبر کنید.' : 'Too many requests. Please wait.') + '<br><button type="button" class="btn-primary" id="convListRetryBtn" style="margin-top:12px;">' + escapeHtml(LANG === 'fa' ? 'تلاش مجدد' : 'Retry') + '</button></div>';
                    setTimeout(function() {
                        var btn = document.getElementById('convListRetryBtn');
                        if (btn) btn.onclick = function() { _convListRateLimitedUntil = 0; loadConversations(); };
                    }, 0);
                }
                return;
            }
            if (!appendMode) setLoading('convList', 4);
            _loadConversationsInFlight = true;
            let q = '?limit=' + convPageSize + '&page=' + convCurrentPage;
            const statusEl = document.getElementById('convFilterStatus');
            const priorityEl = document.getElementById('convFilterPriority');
            const branchEl = document.getElementById('convFilterBranch');
            const deptEl = document.getElementById('convFilterDept');
            const assigneeEl = document.getElementById('convFilterAssignee');
            const searchEl = document.getElementById('convSearch');
            if (convQuickTab === 'unread') q += '&unread=true';
            else if (convQuickTab === 'unanswered') q += '&unanswered=true';
            else if (convQuickTab === 'unassigned') q += '&unassigned=true';
            else if (convQuickTab === 'open') q += '&status=open';
            else if (convQuickTab === 'archived') q += '&status=archived';
            else if (convQuickTab === 'groups') q += '&isGroup=true';
            else if (convQuickTab === 'restricted') q += '&hiddenOnly=true';
            else if (convQuickTab === 'mine' && currentUser && currentUser.id) q += '&assignedTo=' + encodeURIComponent(currentUser.id);
            if (convQuickTab === 'all' || convQuickTab === 'unread' || convQuickTab === 'archived' || convQuickTab === 'groups' || convQuickTab === 'restricted') { if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value); }
            if (priorityEl && priorityEl.value) q += '&priority=' + encodeURIComponent(priorityEl.value);
            if (branchEl && branchEl.value) q += '&branchId=' + encodeURIComponent(branchEl.value);
            if (deptEl && deptEl.value) q += '&departmentId=' + encodeURIComponent(deptEl.value);
            if ((convQuickTab === 'all' || convQuickTab === 'unread' || convQuickTab === 'unanswered' || convQuickTab === 'open' || convQuickTab === 'archived' || convQuickTab === 'groups' || convQuickTab === 'restricted') && assigneeEl && assigneeEl.value) q += '&assignedTo=' + encodeURIComponent(assigneeEl.value);
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            let res;
            try {
                res = await apiFetch('/api/conversations' + q);
            } finally {
                if (seq === _loadConversationsSeq) _loadConversationsInFlight = false;
            }
            if (seq !== _loadConversationsSeq) return;
            if (res.needLogin) return;
            if (!res.ok) {
                const ce = document.getElementById('convListCount');
                if (ce) ce.textContent = '';
                const is429 = res.status === 429 || (res.error && String(res.error).indexOf('تعداد درخواست') !== -1) || (res.data && res.data.error && String(res.data.error).indexOf('تعداد درخواست') !== -1);
                if (is429) _convListRateLimitedUntil = Date.now() + 45000;
                const errText = escapeHtml(res.data && res.data.error ? res.data.error : res.error || '');
                list.innerHTML = '<div class="empty"><span class="empty-icon">💬</span><br>' + t('loading_err') + ' ' + errText + (is429 ? '<br><button type="button" class="btn-primary" id="convListRetryBtn" style="margin-top:12px;">' + escapeHtml(LANG === 'fa' ? 'تلاش مجدد' : 'Retry') + '</button>' : '') + '</div>';
                if (is429) {
                    setTimeout(function() {
                        var btn = document.getElementById('convListRetryBtn');
                        if (btn) btn.onclick = function() { _convListRateLimitedUntil = 0; loadConversations(); };
                    }, 0);
                }
                return;
            }
            _convListRateLimitedUntil = 0;
            const data = res.data;
            const totalCount = data.total != null ? data.total : (data.data || []).length;
            // آمار از total واقعی سرور گرفته می‌شه نه فقط صفحه جاری
            if (statsEl && data.total != null) {
                const openCount = data.openCount != null ? data.openCount : (data.data || []).filter(function(c){ return c.status === 'open'; }).length;
                const unreadCount = data.unreadCount != null ? data.unreadCount : (data.data || []).reduce(function(s,c){ return s + (c.unreadCount || 0); }, 0);
                statsEl.innerHTML = '<span class="conv-stat"><strong>' + (data.total || 0) + '</strong> ' + t('nav_conversations') + '</span><span class="conv-stat"><strong>' + openCount + '</strong> ' + t('status_open') + '</span><span class="conv-stat"><strong>' + unreadCount + '</strong> ' + t('filter_unread') + '</span>';
                statsEl.style.display = 'flex';
            }
            const countEl = document.getElementById('convListCount');
            if (countEl) countEl.textContent = totalCount > 0 ? '(' + totalCount + ')' : '';
            if (!data.data || data.data.length === 0) {
                if (!appendMode) list.innerHTML = '<div class="empty conv-empty"><span class="empty-icon">💬</span><p>' + t('empty_conv') + '</p><button type="button" class="btn-primary" id="emptyConvNewBtn">' + (t('conv_new') || (LANG === 'fa' ? 'مکالمه جدید' : 'New conversation')) + '</button></div>';
                // دکمه load more رو مخفی کن
                var lmBtn = document.getElementById('convLoadMoreBtn');
                if (lmBtn) lmBtn.style.display = 'none';
                // Bind empty state button
                setTimeout(function() {
                    const emptyBtn = document.getElementById('emptyConvNewBtn');
                    if (emptyBtn) {
                        emptyBtn.removeEventListener('click', openNewConvModal);
                        emptyBtn.addEventListener('click', openNewConvModal);
                    }
                }, 50);
                return;
            }
            const visibleRows = (data.data || []).filter(function(c) {
                // قفل‌شده فقط در تب آرشیو یا «محدود» — حتی برای ادمین در «همه» دیده نشود
                if (c.isHiddenFromStaff && convQuickTab !== 'restricted' && convQuickTab !== 'archived') {
                    return false;
                }
                return true;
            });
            if (visibleRows.length === 0) {
                if (!appendMode) list.innerHTML = '<div class="empty conv-empty"><span class="empty-icon">💬</span><p>' + t('empty_conv') + '</p><button type="button" class="btn-primary" id="emptyConvNewBtn">' + (t('conv_new') || (LANG === 'fa' ? 'مکالمه جدید' : 'New conversation')) + '</button></div>';
                var lmBtnEmpty = document.getElementById('convLoadMoreBtn');
                if (lmBtnEmpty) lmBtnEmpty.style.display = 'none';
                setTimeout(function() {
                    const emptyBtn = document.getElementById('emptyConvNewBtn');
                    if (emptyBtn) {
                        emptyBtn.removeEventListener('click', openNewConvModal);
                        emptyBtn.addEventListener('click', openNewConvModal);
                    }
                }, 50);
                return;
            }
            const newItems = visibleRows.map(function(c) {
                const cust = c.customer || {};
                const isGroup = !!(c.metadata && c.metadata.isGroup) || /@g\.us$/i.test(cust.phone || '');
                const phone = customerUiPhone(cust);
                let metaObj = c.metadata;
                if (typeof metaObj === 'string') {
                    try { metaObj = JSON.parse(metaObj); } catch (e) { metaObj = {}; }
                }
                metaObj = metaObj || {};
                const looksLikeJid = function(s) {
                    return !s || /@g\.us$/i.test(s) || /^گروه\s+\d/i.test(s) || /^\d{10,}@/.test(s);
                };
                const groupName = String(metaObj.groupName || metaObj.name || metaObj.subject || metaObj.formattedTitle || '').trim();
                const custName = String(cust.name || '').trim();
                let name = '';
                if (isGroup) {
                    if (groupName && !looksLikeJid(groupName)) name = groupName;
                    else if (custName && !looksLikeJid(custName)) name = custName;
                    else name = (LANG === 'fa' ? 'گروه واتساپ' : 'WhatsApp group');
                } else {
                    name = customerUiName(cust);
                }
                const metaPhone = isGroup ? (LANG === 'fa' ? 'گروه واتساپ' : 'WhatsApp Group') : phone;
                const initial = isGroup ? '👥' : ((name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?');
                const rawPic = (cust.profilePic && String(cust.profilePic).trim()) ? cust.profilePic : '';
                let profilePic = rawPic ? normalizeProfilePicUrl(rawPic) : '';
                const picSrc = customerAvatarDisplaySrc(cust);
                const canShowImg = customerAvatarShowsImage(cust);
                const avatarHtml = '<span class="avatar-fallback' + (isGroup ? ' conv-group-avatar' : '') + '">' + escapeHtml(initial) + '</span>' + (canShowImg && picSrc ? '<img src="' + escapeHtml(picSrc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">' : '');
                const convAvatarClass = 'conv-item-avatar' + (!canShowImg ? ' conv-avatar-wa-default' : '');
                const assigneeName = (c.lastOutgoingIsAutoReply) ? (t('ai_assistant') || 'AI assistant') : userDisplay(c.assignee);
                let assigneeMetaSuffix = '';
                if (assigneeName) {
                    if (c.lastOutgoingIsAutoReply) assigneeMetaSuffix = ' · ' + escapeHtml(assigneeName);
                    else if (c.assignee) assigneeMetaSuffix = ' · <span class="conv-item-assignee-inline">' + internalMsgAvatarHtml(c.assignee, 'conv-item-assignee-avatar') + '<span class="conv-item-assignee-name">' + escapeHtml(assigneeName) + '</span></span>';
                    else assigneeMetaSuffix = ' · ' + escapeHtml(assigneeName);
                }
                const statusBadge = '<span class="badge ' + (c.status || 'open') + '">' + escapeHtml(convStatusLabelUi(c.status)) + '</span>';
                const priorityBadge = c.priority && c.priority !== 'normal' ? '<span class="badge ' + c.priority + '">' + (t('priority_' + c.priority) || c.priority) + '</span>' : '';
                const unreadPill = (c.unreadCount > 0) ? '<span class="conv-unread-pill">' + (c.unreadCount > 99 ? '99+' : c.unreadCount) + '</span>' : '';
                const preview = (c.lastMessagePreview || '').trim();
                const timeStr = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'time') : '';
                let unansweredBadge = '';
                if (c.lastIncomingMessageAt && (!c.lastOutgoingMessageAt || new Date(c.lastIncomingMessageAt) > new Date(c.lastOutgoingMessageAt))) {
                    const mins = Math.floor((Date.now() - new Date(c.lastIncomingMessageAt).getTime()) / 60000);
                    const waitStr = mins < 60 ? (mins + (LANG === 'fa' ? ' دقیقه' : ' min')) : (mins < 1440 ? (Math.floor(mins / 60) + (LANG === 'fa' ? ' ساعت' : ' hr')) : (Math.floor(mins / 1440) + (LANG === 'fa' ? ' روز' : ' days')));
                    unansweredBadge = '<span class="badge urgent" title="' + (LANG === 'fa' ? 'منتظر پاسخ' : 'Awaiting reply') + '">' + waitStr + '</span>';
                }
                const hiddenBadge = c.isHiddenFromStaff ? '<span class="badge conv-hidden-badge" title="' + escapeHtml(t('conv_hidden_badge')) + '">🔒</span>' : '';
                const activeClass = (c.id === currentConvId) ? ' active' : '';
                const previewLine = preview || metaPhone || '';
                const namePrefix = (isGroup ? '<span class="conv-group-badge" title="' + (LANG === 'fa' ? 'گروه' : 'Group') + '">👥</span> ' : '') + (c.isHiddenFromStaff ? '<span class="conv-hidden-inline" title="' + escapeHtml(t('conv_hidden_badge')) + '">🔒</span> ' : '');
                return '<div class="conv-list-item' + activeClass + (isGroup ? ' conv-is-group' : '') + (c.isHiddenFromStaff ? ' conv-is-hidden' : '') + '" data-id="' + c.id + '" data-customer-id="' + escapeHtml(cust.id || '') + '" data-name="' + escapeHtml(name || '') + '" data-phone="' + escapeHtml(phone || '') + '" data-profile-pic="' + escapeHtml(profilePic || '') + '" data-is-group="' + (isGroup ? '1' : '0') + '" style="cursor:pointer;"><div class="' + convAvatarClass + '">' + avatarHtml + '</div><div class="conv-item-body"><div class="conv-item-top"><span class="name" title="' + escapeHtml(name) + '">' + namePrefix + escapeHtml(name) + '</span><span class="conv-item-top-end"><span class="conv-item-time">' + timeStr + '</span>' + unreadPill + '</span></div>' + (previewLine ? '<div class="conv-item-preview" title="' + escapeHtml(previewLine) + '">' + escapeHtml(previewLine) + '</div>' : '') + '<div class="conv-item-meta" title="' + escapeHtml(metaPhone + (assigneeName ? ' · ' + assigneeName : '')) + '">' + escapeHtml(metaPhone) + assigneeMetaSuffix + '</div></div><div class="conv-item-badges">' + hiddenBadge + unansweredBadge + priorityBadge + statusBadge + '</div></div>';
            }).join('');
            if (appendMode) {
                // آیتم‌های جدید به انتهای لیست اضافه می‌شن
                var lmBtn = document.getElementById('convLoadMoreBtn');
                if (lmBtn) lmBtn.insertAdjacentHTML('beforebegin', newItems);
                else list.insertAdjacentHTML('beforeend', newItems);
            } else {
                list.innerHTML = newItems;
            }
            // نمایش/مخفی کردن دکمه load more
            const loadedSoFar = convCurrentPage * convPageSize;
            var lmBtn = document.getElementById('convLoadMoreBtn');
            if (!lmBtn) {
                lmBtn = document.createElement('div');
                lmBtn.id = 'convLoadMoreBtn';
                lmBtn.style.cssText = 'text-align:center;padding:10px;';
                lmBtn.innerHTML = '<button type="button" class="btn-secondary" id="convLoadMoreBtnInner">' + (LANG === 'fa' ? 'بارگذاری بیشتر' : 'Load more') + '</button>';
                setTimeout(function() {
                    const loadBtn = document.getElementById('convLoadMoreBtnInner');
                    if (loadBtn) {
                        loadBtn.removeEventListener('click', handleConvLoadMoreClick);
                        loadBtn.addEventListener('click', handleConvLoadMoreClick);
                    }
                }, 50);
                list.appendChild(lmBtn);
            }
            lmBtn.style.display = loadedSoFar < totalCount ? '' : 'none';
        }

        let currentConvDetail = null;
        /** تا قبل از رسیدن پاسخ GET مکالمه، برای آواتار ویس ورودی از همین دادهٔ هدر/لیست استفاده می‌شود */
        let openChatCustomerPreview = null;
        function toggleChatDetailBar() {
            var panel = document.getElementById('convMgmtPanel');
            if (panel && panel.classList.contains('open')) closeConvMgmtPanel();
            else openConvMgmtPanel();
        }
        function closeChatMobile() {
            closeConvMgmtPanel();
            const chatArea = document.getElementById('chatArea');
            const layout = chatArea && chatArea.closest('.conv-layout');
            if (chatArea) chatArea.classList.remove('show');
            if (layout) layout.classList.remove('chat-open');
            const btn = document.querySelector('.chat-back-btn');
            if (btn) btn.style.display = 'none';
            const pm = document.getElementById('headerMobileTitle');
            if (pm && window.matchMedia('(max-width: 900px)').matches) pm.textContent = t('nav_conversations');
            if (typeof window.applyCrmConvKbInset === 'function') setTimeout(function() { window.applyCrmConvKbInset(); }, 200);
        }
        function updateChatBackBtn() {
            const btn = document.querySelector('.chat-back-btn');
            const chatArea = document.getElementById('chatArea');
            if (btn && chatArea && chatArea.classList.contains('show')) {
                btn.style.display = window.matchMedia('(max-width: 900px)').matches ? 'flex' : 'none';
            }
        }
        if (typeof window !== 'undefined') window.addEventListener('resize', updateChatBackBtn);
        let currentConvIsGroup = false;
        function canViewCustomerPhoneUi() {
            if (!currentUser) return false;
            if (currentUser.canViewCustomerPhone) return true;
            if (currentUser.role === 'owner') return true;
            return !!(currentUser.permissions && currentUser.permissions.view_customer_phone);
        }
        function customerUiName(cust, extraName) {
            const fallback = typeof t === 'function' ? t('customer') : (LANG === 'fa' ? 'مشتری' : 'Customer');
            const c = cust || {};
            const merged = { name: extraName != null && extraName !== '' ? extraName : c.name, phone: c.phone };
            if (window.CRM && CRM.Utils && typeof CRM.Utils.customerDisplayName === 'function') {
                return CRM.Utils.customerDisplayName(merged, { seePhone: canViewCustomerPhoneUi(), fallback: fallback });
            }
            const see = canViewCustomerPhoneUi();
            const rawName = String(merged.name || '').trim();
            if (rawName && (see || !(window.CRM && CRM.Utils && CRM.Utils.looksLikePhone && CRM.Utils.looksLikePhone(rawName)))) return rawName;
            if (see && merged.phone) return String(merged.phone);
            return fallback;
        }
        function customerUiPhone(cust) {
            if (window.CRM && CRM.Utils && typeof CRM.Utils.visibleCustomerPhone === 'function') {
                return CRM.Utils.visibleCustomerPhone(cust, canViewCustomerPhoneUi());
            }
            if (!canViewCustomerPhoneUi()) return '';
            const p = String((cust && cust.phone) || '').trim();
            return /@g\.us$/i.test(p) ? '' : p;
        }
        function applyPhoneSearchPlaceholders() {
            const see = canViewCustomerPhoneUi();
            const conv = document.getElementById('convSearch');
            const cust = document.getElementById('customerSearch');
            if (conv) {
                conv.placeholder = see
                    ? (t('conv_search_ph') || conv.placeholder)
                    : (t('conv_search_ph_no_phone') || (LANG === 'fa' ? 'جستجو نام مشتری...' : 'Search name...'));
            }
            if (cust) {
                cust.placeholder = see
                    ? (t('customer_search_ph') || cust.placeholder)
                    : (t('customer_search_ph_no_phone') || (LANG === 'fa' ? 'جستجو نام یا ایمیل...' : 'Search name or email...'));
            }
        }
        function openChat(id, name, phone, profilePic, isGroup, customerId) {
            currentConvId = id;
            currentConvDetail = null;
            currentConvIsGroup = !!isGroup;
            var visiblePhone = customerUiPhone({ phone: phone });
            if (!currentConvIsGroup && name && window.CRM && CRM.Utils && CRM.Utils.looksLikePhone && CRM.Utils.looksLikePhone(name) && !canViewCustomerPhoneUi()) {
                name = t('customer');
            }
            openChatCustomerPreview = !currentConvIsGroup
                ? { id: String(customerId || '').trim(), name: String(name || '').trim(), phone: visiblePhone, profilePic: String(profilePic || '').trim() }
                : null;
            cancelReply();
            if (chatTemplatesCache.length === 0) { apiFetch('/api/message-templates').then(function(res) { if (res.ok && res.data && res.data.data) chatTemplatesCache = res.data.data; }).catch(function(){}); }
            const headerEl = document.getElementById('chatHeader');
            const avatarEl = document.getElementById('chatHeaderAvatar');
            const barEl = document.getElementById('convDetailBar');
            const badgesEl = document.getElementById('convDetailBadges');
            const actionsEl = document.getElementById('convDetailActions');
            const supPanel = document.getElementById('convSupervisionPanel');
            const supStats = document.getElementById('convSupervisionStats');
            if (headerEl) {
                headerEl.innerHTML = (currentConvIsGroup ? '<span class="chat-header-group-badge" title="' + (LANG === 'fa' ? 'گروه' : 'Group') + '">👥</span> ' : '') + escapeHtml(name || visiblePhone || t('customer'));
            }
            var summaryElEarly = document.getElementById('chatHeaderSummary');
            if (summaryElEarly) {
                summaryElEarly.innerHTML = '';
                summaryElEarly.classList.remove('visible');
                summaryElEarly.setAttribute('hidden', '');
            }
            var headerSubEl = document.getElementById('chatHeaderSub');
            if (headerSubEl) {
                if (currentConvIsGroup) {
                    headerSubEl.textContent = (LANG === 'fa' ? 'گروه · واتساپ' : LANG === 'tr' ? 'Grup · WhatsApp' : 'Group · WhatsApp');
                } else if (visiblePhone) {
                    headerSubEl.textContent = visiblePhone;
                } else {
                    headerSubEl.textContent = typeof t === 'function' ? (t('wa_subtitle') || 'WhatsApp') : 'WhatsApp';
                }
            }
            if (avatarEl) {
                const rawOpenPic = (profilePic || '').trim();
                const custForAv = customerId ? { id: customerId, profilePic: rawOpenPic } : { profilePic: rawOpenPic };
                let pic = customerAvatarDisplaySrc(custForAv);
                const initial = currentConvIsGroup ? '👥' : ((name && name[0]) ? name[0].toUpperCase() : (visiblePhone && visiblePhone[0]) ? visiblePhone[0] : '?');
                avatarEl.classList.toggle('is-group-avatar', !!currentConvIsGroup);
                avatarEl.classList.remove('avatar-img-failed', 'conv-avatar-wa-default');
                if (pic && customerAvatarShowsImage(custForAv)) {
                    avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">';
                } else {
                    avatarEl.classList.add('conv-avatar-wa-default');
                    avatarEl.innerHTML = '<span class="avatar-fallback' + (currentConvIsGroup ? ' conv-group-avatar' : '') + '">' + escapeHtml(initial) + '</span>';
                }
            }
            const chatArea = document.getElementById('chatArea');
            const layout = chatArea && chatArea.closest('.conv-layout');
            if (chatArea) chatArea.classList.add('show');
            if (layout) layout.classList.add('chat-open');
            if (typeof window.applyCrmConvKbInset === 'function') setTimeout(function() { window.applyCrmConvKbInset(); }, 120);
            const backBtn = document.querySelector('.chat-back-btn');
            if (backBtn) backBtn.style.display = window.matchMedia('(max-width: 900px)').matches ? 'flex' : 'none';
            const pm = document.getElementById('headerMobileTitle');
            if (pm && window.matchMedia('(max-width: 900px)').matches) pm.textContent = name || visiblePhone || t('customer');
            phone = visiblePhone;
            if (barEl) {
                barEl.style.display = 'none';
                barEl.setAttribute('hidden', '');
            }
            apiFetch('/api/conversations/' + id + '/read', { method: 'POST' }).then(function() { loadConversations(); fetchDashboardStats({ force: true }).then(function(r) { if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data); }).catch(function(){}); });
            updateWaCallButtonsState();
            loadMessages(id);
            const canViewSupervision = currentUser && ['owner', 'admin', 'manager', 'supervisor'].indexOf(currentUser.role) !== -1;
            if (canViewSupervision && supPanel && supStats) {
                loadConvStats(id, supStats);
                supPanel.style.display = 'block';
                supPanel.removeAttribute('hidden');
            } else if (supPanel) {
                supPanel.style.display = 'none';
                supPanel.setAttribute('hidden', '');
            }
            apiFetch('/api/conversations/' + id).then(function(res) {
                if (!res.ok || !res.data) return;
                currentConvDetail = res.data;
                const d = res.data;
                if (!currentConvIsGroup && d.customer) {
                    var ck = d.customer;
                    var detailPhone = canViewCustomerPhoneUi() ? String((ck.phone || '') || '').trim() : '';
                    openChatCustomerPreview = {
                        id: String((ck.id || customerId || '') || '').trim(),
                        name: String((ck.name || '') || '').trim(),
                        phone: detailPhone,
                        profilePic: String((ck.profilePic || '') || '').trim()
                    };
                    if (headerSubEl && !currentConvIsGroup) {
                        headerSubEl.textContent = detailPhone || (typeof t === 'function' ? (t('wa_subtitle') || 'WhatsApp') : 'WhatsApp');
                    }
                }
                if (avatarEl && d.customer) {
                    const picDisp = customerAvatarDisplaySrc(d.customer);
                    const initialH = currentConvIsGroup ? '👥' : ((name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?');
                    avatarEl.classList.toggle('is-group-avatar', !!currentConvIsGroup);
                    avatarEl.classList.remove('avatar-img-failed', 'conv-avatar-wa-default');
                    if (picDisp && customerAvatarShowsImage(d.customer)) {
                        avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initialH) + '</span><img src="' + escapeHtml(picDisp) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">';
                    } else {
                        avatarEl.classList.add('conv-avatar-wa-default');
                        avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initialH) + '</span>';
                    }
                }
                if (!barEl || !badgesEl) {
                    try { loadConversations(); } catch (_) {}
                    return;
                }
                renderConvDetailBadges(d);
                barEl.style.display = '';
                barEl.removeAttribute('hidden');
                closeConvMgmtPanel();
                const toggleBtn = document.getElementById('chatDetailToggle');
                if (toggleBtn) { toggleBtn.style.display = 'flex'; toggleBtn.classList.remove('active'); }
                const canManage = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager'));
                const isAssignedToMe = d.assignedTo === (currentUser && currentUser.id);
                if (actionsEl) {
                    actionsEl.removeAttribute('hidden');
                    const assignBtn = document.getElementById('btnAssignToMe');
                    const gridEl = actionsEl.querySelector('.conv-detail-fields-grid');
                    const topRowEl = actionsEl.querySelector('.conv-detail-actions-top');
                    const footerEl = actionsEl.querySelector('.conv-detail-actions-footer');
                    if (assignBtn) assignBtn.style.display = (canManage || !isAssignedToMe) ? '' : 'none';
                    if (topRowEl) topRowEl.style.display = (assignBtn && assignBtn.style.display !== 'none') ? '' : 'none';
                    if (gridEl) gridEl.style.display = canManage ? 'grid' : 'none';
                    actionsEl.querySelectorAll('.conv-detail-select').forEach(function(el) { el.style.display = canManage ? '' : 'none'; });
                    const applyBtn = document.getElementById('convDetailApplyBtn');
                    if (applyBtn) applyBtn.style.display = canManage ? '' : 'none';
                }
                if (canManage) {
                    const statusSel = document.getElementById('convDetailStatus');
                    const prioritySel = document.getElementById('convDetailPriority');
                    const assigneeSel = document.getElementById('convDetailAssignee');
                    var deptSel = document.getElementById('convDetailDept');
                    if (statusSel) {
                        const hasArchivedOpt = Array.from(statusSel.options).some(function(o){ return o.value === 'archived'; });
                        if (canManageConversations() && !hasArchivedOpt) { const o = document.createElement('option'); o.value = 'archived'; o.setAttribute('data-i18n', 'status_archived'); o.textContent = t('status_archived') || 'Archived'; statusSel.appendChild(o); }
                        statusSel.value = d.status || 'open';
                    }
                    if (prioritySel) prioritySel.value = d.priority || 'normal';
                    loadConvAssignees().then(function() {
                        if (assigneeSel) assigneeSel.value = d.assignedTo || '';
                        if (deptSel) deptSel.value = d.departmentId || '';
                    });
                }
                const archBtn = document.getElementById('btnConvArchive');
                const delBtn = document.getElementById('btnConvDelete');
                const hideBtn = document.getElementById('btnConvHide');
                const grantBtn = document.getElementById('btnConvGrantAccess');
                if (hideBtn) {
                    hideBtn.style.display = canViewHiddenConversations() ? '' : 'none';
                    hideBtn.textContent = d.isHiddenFromStaff ? (t('btn_conv_unhide') || 'Show to staff') : (t('btn_conv_hide') || 'Hide from staff');
                    hideBtn.setAttribute('data-i18n', d.isHiddenFromStaff ? 'btn_conv_unhide' : 'btn_conv_hide');
                }
                if (grantBtn) {
                    grantBtn.style.display = canViewHiddenConversations() ? '' : 'none';
                }
                if (archBtn) archBtn.style.display = (canManageConversations() && d.status !== 'archived') ? '' : 'none';
                if (delBtn) delBtn.style.display = canManageConversations() ? '' : 'none';
                if (actionsEl) {
                    const footerEl2 = actionsEl.querySelector('.conv-detail-actions-footer');
                    const applyBtn2 = document.getElementById('convDetailApplyBtn');
                    var footVis = false;
                    if (footerEl2) {
                        var fApply = applyBtn2 && applyBtn2.style.display !== 'none';
                        var fArch = archBtn && archBtn.style.display !== 'none';
                        var fDel = delBtn && delBtn.style.display !== 'none';
                        var fHide = hideBtn && hideBtn.style.display !== 'none';
                        var fGrant = grantBtn && grantBtn.style.display !== 'none';
                        footerEl2.style.display = (fApply || fArch || fDel || fHide || fGrant) ? '' : 'none';
                        footVis = footerEl2.style.display !== 'none';
                    }
                    var gridVis = actionsEl.querySelector('.conv-detail-fields-grid');
                    var topVis = actionsEl.querySelector('.conv-detail-actions-top');
                    var anyAct = (topVis && topVis.style.display !== 'none') || (gridVis && gridVis.style.display !== 'none') || footVis;
                    actionsEl.style.display = anyAct ? 'flex' : 'none';
                    if (!anyAct) actionsEl.setAttribute('hidden', '');
                }
                const chatSend = document.querySelector('.chat-send');
                if (chatSend) chatSend.style.display = '';
                const ratingSection = document.getElementById('convRatingSection');
                if (ratingSection) {
                    ratingSection.style.display = 'block';
                    ratingSection.removeAttribute('hidden');
                    const stars = ratingSection.querySelectorAll('.conv-rating-star');
                    const r = d.rating || 0;
                    stars.forEach(function(s) {
                        const v = parseInt(s.getAttribute('data-rating'), 10);
                        s.classList.toggle('active', v <= r);
                    });
                    const feedbackEl = document.getElementById('convFeedback');
                    if (feedbackEl) {
                        feedbackEl.value = d.feedback || '';
                        feedbackEl.onblur = function() {
                            const v = (feedbackEl.value || '').trim();
                            if (v !== (d.feedback || '')) apiFetch('/api/conversations/' + id, { method: 'PATCH', body: JSON.stringify({ feedback: v }) }).then(function(res) { if (res.ok && currentConvDetail) currentConvDetail.feedback = v; });
                        };
                    }
                }
                try { loadConversations(); } catch (_) {}
            });
        }
        async function loadConvAssignees() {
            const selFilter = document.getElementById('convFilterAssignee');
            const selDetail = document.getElementById('convDetailAssignee');
            const selDetailDept = document.getElementById('convDetailDept');
            if (!selFilter && !selDetail && !selDetailDept) return;
            const res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            const users = res.data.data;
            const opt = '<option value="">' + escapeHtml(t('filter_any_assignee') || t('any_assignee')) + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            if (selFilter) selFilter.innerHTML = opt;
            const optDetail = '<option value="">' + escapeHtml(t('no_assignee')) + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            if (selDetail) selDetail.innerHTML = optDetail;
            if (selDetailDept) {
                const deptRes = await apiFetch('/api/departments');
                if (deptRes.ok && deptRes.data && deptRes.data.data) {
                    const depts = deptRes.data.data;
                    selDetailDept.innerHTML = '<option value="">' + escapeHtml(t('no_dept')) + '</option>' + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
                }
            }
        }
        function applyConvFilters() { updateConvAdvancedFiltersBadge(); convCurrentPage = 1; loadConversations(); }
        function escapeAttr(s) {
            if (s == null || s === '') return '';
            return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function openNewConvModal() {
            const modal = document.getElementById('newConvModal');
            if (!modal) return;
            modal.style.display = 'flex';
            const search = document.getElementById('newConvCustomerSearch');
            if (search) search.value = '';
            loadNewConvCustomers();
        }
        function closeNewConvModal() { document.getElementById('newConvModal').style.display = 'none'; }
        window._forwardingMessage = null;
        function onForwardCustomerSearchInput() {
            var v = this.value;
            clearTimeout(window._forwardConvSearchT);
            window._forwardConvSearchT = setTimeout(function() { loadForwardCustomers(v); }, 300);
        }
        function openForwardMsgModal(messageId, preview) {
            if (!messageId) return;
            window._forwardingMessage = { id: messageId, preview: preview || '' };
            var modal = document.getElementById('forwardMsgModal');
            var previewEl = document.getElementById('forwardMsgPreview');
            var searchEl = document.getElementById('forwardMsgCustomerSearch');
            if (previewEl) previewEl.textContent = (preview || '').slice(0, 160) + ((preview || '').length > 160 ? '…' : '');
            if (searchEl) searchEl.value = '';
            if (modal) modal.style.display = 'flex';
            loadForwardCustomers();
        }
        function closeForwardMsgModal() {
            window._forwardingMessage = null;
            var modal = document.getElementById('forwardMsgModal');
            if (modal) modal.style.display = 'none';
        }
        window.openForwardMsgModal = openForwardMsgModal;
        window.closeForwardMsgModal = closeForwardMsgModal;
        async function loadForwardCustomers(search) {
            const list = document.getElementById('forwardMsgCustomerList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            let q = '?limit=30';
            if (search && String(search).trim()) q += '&search=' + encodeURIComponent(String(search).trim());
            const res = await apiFetch('/api/customers' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty">' + escapeHtml(t('empty_customers') || '') + '</div>'; return; }
            const currentCustId = currentConvDetail && currentConvDetail.customerId;
            list.innerHTML = data.data.map(function(c) {
                const phoneRaw = customerUiPhone(c);
                const isGroup = /@g\.us$/i.test(String(c.phone || '')) || !!(c.metadata && c.metadata.isGroup);
                const name = customerUiName(c) || (isGroup ? (t('group_chat') || 'Group') : t('customer'));
                const initial = isGroup ? '👥' : ((name && name[0]) ? name[0].toUpperCase() : '?');
                const picSrcNc = customerAvatarDisplaySrc(c);
                const avatarHtml = !isGroup && customerAvatarShowsImage(c) && picSrcNc
                    ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(picSrcNc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">'
                    : '<span class="avatar-fallback">' + (isGroup ? initial : escapeHtml(initial)) + '</span>';
                const isCurrent = !!(currentCustId && c.id === currentCustId);
                const badges = [];
                if (isCurrent) badges.push('<span class="forward-item-badge">' + escapeHtml(t('conv_forward_this_chat') || (LANG === 'fa' ? 'همین چت' : 'This chat')) + '</span>');
                if (isGroup) badges.push('<span class="forward-item-badge forward-item-badge--group">' + escapeHtml(t('group_chat') || (LANG === 'fa' ? 'گروه' : 'Group')) + '</span>');
                let metaText = '';
                if (isGroup) {
                    metaText = t('conv_forward_group_meta') || (LANG === 'fa' ? 'گروه واتساپ' : 'WhatsApp group');
                } else if (phoneRaw) {
                    metaText = phoneRaw;
                }
                return '<div class="new-conv-customer-item forward-customer-item' + (isCurrent ? ' is-current' : '') + '" role="button" tabindex="0" data-forward-customer-id="' + escapeAttr(String(c.id)) + '" data-forward-customer-name="' + escapeAttr(String(name || '')) + '">' +
                    '<span class="conv-item-avatar' + (isGroup ? ' forward-avatar-group' : '') + '" style="width:40px;height:40px;font-size:0.95rem;">' + avatarHtml + '</span>' +
                    '<span class="forward-item-body">' +
                        '<span class="forward-item-title"><span class="name">' + escapeHtml(name) + '</span>' + badges.join('') + '</span>' +
                        (metaText ? '<span class="forward-item-meta">' + escapeHtml(metaText) + '</span>' : '') +
                    '</span>' +
                '</div>';
            }).join('');
        }
        async function forwardMessageToCustomer(customerId, customerName) {
            if (!window._forwardingMessage || !window._forwardingMessage.id) return;
            const res = await apiFetch('/api/conversations/forward', {
                method: 'POST',
                body: JSON.stringify({ messageId: window._forwardingMessage.id, customerId: customerId })
            });
            if (res.needLogin) return;
            if (res.ok) {
                closeForwardMsgModal();
                toast(t('toast_forward_sent') || (LANG === 'fa' ? 'پیام فوروارد شد' : 'Message forwarded'));
                loadConversations();
                if (res.data && res.data.conversation && res.data.conversation.id) {
                    const convId = res.data.conversation.id;
                    const cust = res.data.message && res.data.message.customer;
                    setTimeout(function() {
                        openChat(convId, customerName || (cust && cust.name) || '', (cust && cust.phone) || '', (cust && cust.profilePic) || '', false);
                        loadMessages(convId);
                    }, 150);
                }
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }
        window.forwardMessageToCustomer = forwardMessageToCustomer;
        async function loadNewConvCustomers(search) {
            const list = document.getElementById('newConvCustomerList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            let q = '?limit=30';
            if (search && String(search).trim()) q += '&search=' + encodeURIComponent(String(search).trim());
            const res = await apiFetch('/api/customers' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty">' + t('empty_customers') + '</div>'; return; }
            list.innerHTML = data.data.map(function(c) {
                const name = customerUiName(c);
                const initial = (name && name[0]) ? name[0].toUpperCase() : '?';
                const rawPicNc = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
                const picSrcNc = customerAvatarDisplaySrc(c);
                const avatarHtml = customerAvatarShowsImage(c) && picSrcNc ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(picSrcNc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">' : '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>';
                return '<div class="new-conv-customer-item" role="button" tabindex="0" data-start-conv-id="' + escapeAttr(String(c.id)) + '" data-start-conv-name="' + escapeAttr(String(name || '')) + '"><span class="conv-item-avatar" style="width:36px;height:36px;font-size:0.9rem;">' + avatarHtml + '</span><span class="name">' + escapeHtml(name) + '</span><span class="meta">' + escapeHtml(customerUiPhone(c)) + '</span></div>';
            }).join('');
        }
        async function startNewConversation(customerId, name) {
            closeNewConvModal();
            const res = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ customerId: customerId }) });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            const conv = res.data;
            const phone = (conv.customer && conv.customer.phone) || '';
            const pic = (conv.customer && conv.customer.profilePic) || '';
            openChat(conv.id, name || (conv.customer && conv.customer.name) || phone, phone, pic);
            loadConversations();
        }

        // باز کردن مکالمه خصوصی با عضو گروه از طریق شماره تلفن
        window.openPrivateChatFromGroup = async function(phone, name) {
            if (!phone) return;
            // نرمال‌سازی شماره: اگر با 0 شروع شد → 98 اضافه کن
            let normalized = String(phone).replace(/\D/g, '');
            if (normalized.startsWith('0')) normalized = '98' + normalized.slice(1);
            // جستجوی مشتری با این شماره
            const searchRes = await apiFetch('/api/customers?search=' + encodeURIComponent(normalized) + '&limit=5');
            let customer = null;
            if (searchRes.ok && searchRes.data) {
                const rows = searchRes.data.data || searchRes.data.rows || [];
                customer = rows.find(function(c) {
                    const cp = String(c.phone || '').replace(/\D/g, '');
                    return cp === normalized || cp === phone.replace(/\D/g, '');
                }) || null;
            }
            if (!customer) {
                // ساخت مشتری جدید
                const createRes = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify({ name: name || phone, phone: normalized }) });
                if (!createRes.ok) { toast((createRes.data && createRes.data.error) || t('err_generic'), true); return; }
                customer = createRes.data;
            }
            // باز کردن مکالمه
            const convRes = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ customerId: customer.id }) });
            if (!convRes.ok) { toast((convRes.data && convRes.data.error) || t('err_generic'), true); return; }
            const conv = convRes.data;
            const cPhone = (conv.customer && conv.customer.phone) || normalized;
            const cPic = (conv.customer && conv.customer.profilePic) || '';
            openChat(conv.id, name || (conv.customer && conv.customer.name) || cPhone, cPhone, cPic, false);
            loadConversations();
            toast(LANG === 'fa' ? 'مکالمه خصوصی باز شد' : 'Private chat opened');
        };
        async function assignConvToMe() {
            if (!currentConvId || !currentUser) return;
            const assigneeSel = document.getElementById('convDetailAssignee');
            if (assigneeSel) assigneeSel.value = currentUser.id;
            await updateConvFromDetail();
        }
        async function updateConvFromDetail() {
            if (!currentConvId) return;
            const statusSel = document.getElementById('convDetailStatus');
            const prioritySel = document.getElementById('convDetailPriority');
            const assigneeSel = document.getElementById('convDetailAssignee');
            const deptSel = document.getElementById('convDetailDept');
            const body = {};
            if (statusSel) body.status = statusSel.value;
            if (prioritySel) body.priority = prioritySel.value;
            if (assigneeSel) body.assignedTo = assigneeSel.value || null;
            if (deptSel) body.departmentId = deptSel.value || null;
            const ratingStars = document.querySelectorAll('#convRatingSection .conv-rating-star.active');
            const lastActive = ratingStars.length > 0 ? Math.max.apply(null, Array.from(ratingStars).map(function(s) { return parseInt(s.getAttribute('data-rating'), 10); })) : null;
            if (lastActive) body.rating = lastActive;
            const feedbackEl = document.getElementById('convFeedback');
            if (feedbackEl) body.feedback = (feedbackEl.value || '').trim() || null;
            const res = await apiFetch('/api/conversations/' + currentConvId, { method: 'PATCH', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('btn_save') || 'Saved'); if (currentConvDetail) currentConvDetail = res.data; const h = document.getElementById('chatHeader'); const activeItem = document.querySelector('.conv-list-item.active[data-id="' + currentConvId + '"]'); const pic = (activeItem && activeItem.getAttribute('data-profile-pic')) || (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.profilePic) || ''; const ig = (activeItem && activeItem.getAttribute('data-is-group') === '1') || (res.data && res.data.metadata && res.data.metadata.isGroup); openChat(currentConvId, (currentConvDetail && (currentConvDetail.customer && currentConvDetail.customer.name)) || (h ? h.textContent.replace(/^👥\s*/, '') : ''), (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.phone) || '', pic, ig); loadConversations(); } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        async function toggleConvHidden() {
            if (!currentConvId || !canViewHiddenConversations()) {
                toast(LANG === 'fa' ? 'فقط مالک یا ادمین می‌تواند مکالمه را مخفی کند' : 'Only owner or admin can hide conversations', true);
                return;
            }
            const isHidden = !!(currentConvDetail && currentConvDetail.isHiddenFromStaff);
            const msg = isHidden
                ? (LANG === 'fa' ? 'این مکالمه برای همه کارکنان نمایش داده شود؟' : 'Show this conversation to all staff?')
                : (LANG === 'fa' ? 'این مکالمه از دید همه کارکنان (به‌جز مالک و ادمین) مخفی شود؟' : 'Hide this conversation from all staff except owner and admin?');
            if (!confirm(msg)) return;
            const res = await apiFetch('/api/conversations/' + currentConvId, { method: 'PATCH', body: JSON.stringify({ isHiddenFromStaff: !isHidden }) });
            if (res.needLogin) return;
            if (res.ok) {
                toast(isHidden ? (t('conv_unhidden_toast') || 'Conversation visible to staff') : (t('conv_hidden_toast') || 'Conversation hidden from staff'));
                currentConvDetail = res.data;
                openChat(currentConvId, (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.name) || '', (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.phone) || '', (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.profilePic) || '', currentConvDetail && currentConvDetail.metadata && currentConvDetail.metadata.isGroup);
                loadConversations();
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }

        var _staffAccessGrantCtx = null;
        async function openStaffAccessGrantModal(opts) {
            if (!canViewHiddenConversations()) {
                toast(t('no_access') || 'دسترسی ندارید', true);
                return;
            }
            const customerId = opts && opts.customerId;
            const conversationId = opts && opts.conversationId;
            if (!customerId && !conversationId) return;
            _staffAccessGrantCtx = { customerId: customerId || null, conversationId: conversationId || null };
            const modal = document.getElementById('modalStaffAccessGrant');
            if (!modal) return;
            modal.style.display = 'flex';
            const sel = document.getElementById('staffAccessGrantUserSel');
            const listEl = document.getElementById('staffAccessGrantList');
            if (listEl) listEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const usersRes = await apiFetch('/api/users');
            if (usersRes.ok && usersRes.data) {
                const users = usersRes.data.data || usersRes.data || [];
                const optsHtml = '<option value="">' + escapeHtml(t('access_grant_user') || 'User') + '</option>' +
                    users.filter(function(u) { return u.isActive !== false; }).map(function(u) {
                        return '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.name || u.username || u.email || '') + '</option>';
                    }).join('');
                if (sel) sel.innerHTML = optsHtml;
            }
            await refreshStaffAccessGrantList();
        }
        function closeStaffAccessGrantModal() {
            const modal = document.getElementById('modalStaffAccessGrant');
            if (modal) modal.style.display = 'none';
            _staffAccessGrantCtx = null;
        }
        async function refreshStaffAccessGrantList() {
            const listEl = document.getElementById('staffAccessGrantList');
            if (!listEl || !_staffAccessGrantCtx) return;
            let url = null;
            if (_staffAccessGrantCtx.customerId) url = '/api/access-grants/customers/' + _staffAccessGrantCtx.customerId;
            else if (_staffAccessGrantCtx.conversationId) url = '/api/access-grants/conversations/' + _staffAccessGrantCtx.conversationId;
            if (!url) return;
            const res = await apiFetch(url);
            if (!res.ok) {
                listEl.innerHTML = '<div class="empty">' + escapeHtml((res.data && res.data.error) || t('err_generic')) + '</div>';
                return;
            }
            if (res.data && res.data.customerId && !_staffAccessGrantCtx.customerId) {
                _staffAccessGrantCtx.customerId = res.data.customerId;
            }
            const grants = (res.data && (res.data.grants || res.data.customerGrants)) || [];
            const allGrants = res.data && res.data.customerGrants
                ? [].concat(res.data.grants || [], res.data.customerGrants || [])
                : grants;
            const seen = {};
            const unique = allGrants.filter(function(g) {
                if (!g.userId || seen[g.userId]) return false;
                seen[g.userId] = true;
                return true;
            });
            if (unique.length === 0) {
                listEl.innerHTML = '<div class="empty">' + escapeHtml(t('access_grant_empty') || 'No grants') + '</div>';
                return;
            }
            listEl.innerHTML = unique.map(function(g) {
                const name = (g.user && (g.user.name || g.user.username || g.user.email)) || g.userId;
                return '<div class="staff-access-grant-row" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border, #e5e7eb);">' +
                    '<span>' + escapeHtml(name) + '</span>' +
                    '<button type="button" class="btn-secondary btn-sm" data-revoke-user="' + escapeHtml(g.userId) + '">' + escapeHtml(t('access_grant_revoke') || 'Revoke') + '</button></div>';
            }).join('');
            listEl.querySelectorAll('[data-revoke-user]').forEach(function(btn) {
                btn.addEventListener('click', async function() {
                    const uid = btn.getAttribute('data-revoke-user');
                    const cid = _staffAccessGrantCtx && _staffAccessGrantCtx.customerId;
                    if (!cid || !uid) return;
                    const r = await apiFetch('/api/access-grants/customers/' + cid + '/users/' + uid, { method: 'DELETE' });
                    if (r.ok) {
                        toast(t('access_grant_revoked') || 'Revoked');
                        refreshStaffAccessGrantList();
                    } else toast((r.data && r.data.error) || t('err_generic'), true);
                });
            });
        }
        async function submitStaffAccessGrant() {
            if (!_staffAccessGrantCtx) return;
            const sel = document.getElementById('staffAccessGrantUserSel');
            const userId = sel && sel.value;
            if (!userId) {
                toast(LANG === 'fa' ? 'کاربر را انتخاب کنید' : 'Select a user', true);
                return;
            }
            let res;
            if (_staffAccessGrantCtx.customerId) {
                res = await apiFetch('/api/access-grants/customers/' + _staffAccessGrantCtx.customerId, {
                    method: 'POST',
                    body: JSON.stringify({ userId: userId })
                });
            } else if (_staffAccessGrantCtx.conversationId) {
                res = await apiFetch('/api/access-grants/conversations/' + _staffAccessGrantCtx.conversationId, {
                    method: 'POST',
                    body: JSON.stringify({ userId: userId })
                });
            }
            if (!res) return;
            if (res.ok) {
                toast(t('access_grant_done') || 'Granted');
                if (res.data && res.data.grant && res.data.grant.resourceId) {
                    _staffAccessGrantCtx.customerId = res.data.grant.resourceId;
                }
                refreshStaffAccessGrantList();
            } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        function openConvGrantAccess() {
            if (!currentConvId) return;
            const custId = currentConvDetail && currentConvDetail.customerId
                ? currentConvDetail.customerId
                : (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.id);
            openStaffAccessGrantModal({ conversationId: currentConvId, customerId: custId || null });
        }
        function openCustomerGrantAccess(customerId) {
            if (!customerId) return;
            openStaffAccessGrantModal({ customerId: customerId });
        }
        async function archiveConversation() {
            if (!currentConvId || !canManageConversations()) { toast(LANG === 'fa' ? 'فقط مالک یا ادمین اصلی می‌تواند مکالمه را آرشیو کند' : 'Only owner/main admin can archive', true); return; }
            if (!confirm(LANG === 'fa' ? 'مکالمه آرشیو شود؟ پیام‌ها حذف نمی‌شوند و در سیستم می‌مانند.' : 'Archive this conversation? Messages will be preserved.')) return;
            const res = await apiFetch('/api/conversations/' + currentConvId, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) });
            if (res.needLogin) return;
            if (res.ok) {
                toast(LANG === 'fa' ? 'مکالمه به آرشیو ارسال شد؛ پیام‌ها حفظ شدند' : 'Conversation archived; messages preserved');
                closeChatMobile();
                loadConversations();
                currentConvId = null;
            } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        async function deleteConversation() {
            if (!currentConvId || !canManageConversations()) { toast(LANG === 'fa' ? 'فقط مالک یا ادمین اصلی می‌تواند مکالمه را از لیست خارج کند' : 'Only owner/main admin can remove', true); return; }
            if (!confirm(LANG === 'fa' ? 'مکالمه از لیست فعال خارج و آرشیو شود؟ پیام‌ها هرگز از سیستم پاک نمی‌شوند.' : 'Remove from active list and archive? Messages are never permanently deleted.')) return;
            const res = await apiFetch('/api/conversations/' + currentConvId, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) {
                toast((res.data && res.data.message) || (LANG === 'fa' ? 'آرشیو شد؛ پیام‌ها حفظ شدند' : 'Archived; messages preserved'));
                closeChatMobile();
                loadConversations();
                currentConvId = null;
            } else toast((res.data && res.data.error) || t('err_generic'), true);
        }

        function openChatFromHistory(el) {
            const convId = el.getAttribute('data-convid');
            const name = el.getAttribute('data-customername') || '';
            const isGrp = el.getAttribute('data-is-group') === '1';
            if (!convId) return;
            if (typeof showPage === 'function') showPage('conversations');
            apiFetch('/api/conversations/' + convId).then(function(res) {
                if (res.needLogin) return;
                const convData = (res.ok && res.data) ? res.data : null;
                const finalName = (convData && convData.customer && convData.customer.name) ? convData.customer.name : name;
                const finalPhone = (convData && convData.customer && convData.customer.phone) ? convData.customer.phone : '';
                const finalPic = (convData && convData.customer && convData.customer.profilePic) ? convData.customer.profilePic : '';
                const finalIsGrp = convData ? !!(convData.metadata && convData.metadata.isGroup) : isGrp;
                // اگر لیست مکالمات هنوز بارگذاری نشده، بارگذاری کن
                const convList = document.getElementById('convList');
                const needsLoad = !convList || convList.children.length === 0;
                if (needsLoad) {
                    loadConvFiltersInit();
                    loadConversations();
                }
                removeAllInlineHandlers();
                setupConversationEventHandlers();
                openChat(convId, finalName, finalPhone, finalPic, finalIsGrp);
            }).catch(function() {
                // در صورت خطا با اطلاعات موجود باز کن
                const convList = document.getElementById('convList');
                const needsLoad = !convList || convList.children.length === 0;
                if (needsLoad) {
                    loadConvFiltersInit();
                    loadConversations();
                }
                removeAllInlineHandlers();
                setupConversationEventHandlers();
                openChat(convId, name, '', '', isGrp);
            });
        }

        let _loadMessagesController = null;
        let _currentMsgConvId = null;
        let _currentMsgOldestId = null;
        /** مالک خط واتساپ موبایل — همهٔ پیام‌های غیر CRM به این کاربر نسبت داده می‌شوند */
        var _mobileWaSender = null;
        async function ensureMobileWaSender(force) {
            if (_mobileWaSender && !force) return _mobileWaSender;
            try {
                var res = await apiFetch('/api/conversations/mobile-wa-sender');
                if (res.ok && res.data && res.data.user) {
                    _mobileWaSender = res.data.user;
                }
            } catch (_) {}
            return _mobileWaSender;
        }
        /** کاربر نمایشی برای پیام خروجی — پنل CRM = فرستنده واقعی؛ موبایل = مالک خط */
        function outgoingMsgStaffUser(m) {
            if (!m || m.direction !== 'outgoing' || m.isAutoReply) return null;
            if (isCrmPanelSend(m)) return m.user || null;
            if (isMobileWhatsappSend(m) || isExternalWhatsappOutgoing(m)) {
                return _mobileWaSender || m.user || null;
            }
            return m.user || null;
        }
        var _crmActiveChatVoiceAudio = null;
        function formatMsgVoiceTime(sec) {
            if (!isFinite(sec) || sec < 0) return '0:00';
            var m = Math.floor(sec / 60);
            var s = Math.floor(sec % 60);
            return m + ':' + String(s).padStart(2, '0');
        }
        function voicePlaybackAltUrl(src) {
            if (!src || typeof src !== 'string') return null;
            var q = src.indexOf('?') >= 0 ? src.slice(src.indexOf('?')) : '';
            var bare = src.split('?')[0];
            if (/_voice\.ogg$/i.test(bare)) return null;
            var m = bare.match(/^(.*\/uploads\/\d+-[^/]+?)(\.(webm|ogg|oga|opus|m4a|mp3|wav|aac))?$/i);
            if (!m) return null;
            return m[1] + '_voice.ogg' + q;
        }
        function preferVoicePlaybackUrl(url, isOut) {
            if (!isOut || !url) return url;
            return voicePlaybackAltUrl(url) || url;
        }
        function crmVoiceAudioErr(audioEl) {
            var wrap = audioEl && audioEl.closest ? audioEl.closest('.msg-media') : null;
            if (wrap) wrap.classList.add('msg-media-error');
            try {
                if (audioEl && !audioEl.dataset.retryVoiceAlt) {
                    audioEl.dataset.retryVoiceAlt = '1';
                    var alt = voicePlaybackAltUrl(audioEl.src || audioEl.getAttribute('src') || '');
                    if (alt && alt !== audioEl.src) {
                        audioEl.src = alt;
                        audioEl.load();
                        return;
                    }
                }
                if (audioEl && !audioEl.dataset.retryBlob) {
                    audioEl.dataset.retryBlob = '1';
                    var el = audioEl;
                    fetch(el.src, { credentials: 'include' }).then(function(r) {
                        if (!r.ok) throw new Error('http ' + r.status);
                        return r.blob();
                    }).then(function(b) {
                        if (!b || !b.size) throw new Error('empty');
                        var mime = (b.type || '').split(';')[0].trim() || 'audio/ogg';
                        var bu = URL.createObjectURL(b.type ? b : new Blob([b], { type: mime }));
                        el.src = bu;
                        el.load();
                        var ww = el.closest('.msg-media');
                        if (ww) ww.classList.remove('msg-media-error');
                    }).catch(function() {});
                }
            } catch (_e) {}
        }
        window.crmVoiceAudioErr = crmVoiceAudioErr;
        function coerceMediaData(raw) {
            if (!raw) return null;
            if (typeof raw === 'string') {
                var t = raw.trim();
                if (!t) return null;
                if (t.charAt(0) === '{' || t.charAt(0) === '[') {
                    try { return JSON.parse(t); } catch (_e) { return { filename: t }; }
                }
                return { filename: t };
            }
            return raw;
        }
        function formatMsgFileSize(n) {
            var sz = Number(n);
            if (!sz || sz < 1) return '';
            if (sz < 1024) return sz + ' B';
            if (sz < 1024 * 1024) return (sz / 1024).toFixed(sz < 10 * 1024 ? 1 : 0) + ' KB';
            return (sz / (1024 * 1024)).toFixed(sz < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
        }
        function buildMsgFileCardHtml(fileUrl, filename, kind, sizeBytes) {
            var name = String(filename || '').trim() || (LANG === 'fa' ? 'فایل' : 'File');
            var icon = '📎';
            var k = String(kind || '').toLowerCase();
            if (k === 'image' || k === 'sticker') icon = '🖼';
            else if (k === 'video') icon = '🎬';
            else if (k === 'audio' || k === 'ptt') icon = '🎵';
            else if (/\.pdf$/i.test(name)) icon = '📄';
            else if (/\.apk$/i.test(name)) icon = '📦';
            var sizeStr = formatMsgFileSize(sizeBytes);
            var openLbl = LANG === 'fa' ? 'باز کردن' : (LANG === 'tr' ? 'Aç' : 'Open');
            var saveLbl = LANG === 'fa' ? 'ذخیره' : (LANG === 'tr' ? 'Farklı kaydet' : 'Save as...');
            var missing = LANG === 'fa' ? 'فایل در دسترس نیست' : 'File unavailable';
            var safeUrl = fileUrl ? escapeHtml(fileUrl) : '';
            var safeName = escapeHtml(name);
            var actions = fileUrl
                ? ('<span class="msg-file-card-actions">' +
                    '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="msg-file-card-btn" data-open="1">' + escapeHtml(openLbl) + '</a>' +
                    '<a href="' + safeUrl + '" download="' + safeName + '" class="msg-file-card-btn" rel="noopener noreferrer">' + escapeHtml(saveLbl) + '</a>' +
                    '</span>')
                : ('<span class="msg-file-card-action">' + escapeHtml(missing) + '</span>');
            return '<div class="msg-file-card">' +
                '<span class="msg-file-card-icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="msg-file-card-body"><span class="msg-file-card-name">' + safeName + '</span>' +
                (sizeStr ? '<span class="msg-file-card-size">' + escapeHtml(sizeStr) + '</span>' : '') +
                actions + '</span></div>';
        }
        function crmMsgMediaImgErr(img) {
            if (!img) return;
            function showFallback() {
                img.onerror = null;
                img.style.display = 'none';
                var wrap = img.closest ? img.closest('.msg-media-image') : null;
                if (wrap) {
                    wrap.classList.add('msg-media-image-failed');
                    var fb = wrap.querySelector('.msg-media-image-fallback');
                    if (fb) {
                        fb.hidden = false;
                        fb.style.display = 'block';
                    }
                }
            }
            if (img.dataset.retryBlob === '1') {
                showFallback();
                return;
            }
            img.dataset.retryBlob = '1';
            var src = img.getAttribute('src') || img.currentSrc || img.src || '';
            if (!src || src.indexOf('blob:') === 0 || src.indexOf('data:') === 0) {
                showFallback();
                return;
            }
            fetch(src, { credentials: 'include' }).then(function(r) {
                if (!r.ok) throw new Error('http ' + r.status);
                return r.blob();
            }).then(function(b) {
                if (!b || !b.size) throw new Error('empty');
                img.src = URL.createObjectURL(b);
            }).catch(function() {
                showFallback();
            });
        }
        window.crmMsgMediaImgErr = crmMsgMediaImgErr;
        function initChatMessageVoicePlayers(root) {
            if (!root || !root.querySelectorAll) return;
            root.querySelectorAll('.msg-voice-player').forEach(function(wrap) {
                if (wrap.dataset.voiceBound === '1') return;
                wrap.dataset.voiceBound = '1';
                var audio = wrap.querySelector('.msg-audio-el');
                var btn = wrap.querySelector('.msg-voice-play');
                var wavePlayed = wrap.querySelector('.msg-voice-wave-played');
                var playhead = wrap.querySelector('.msg-voice-playhead');
                var curEl = wrap.querySelector('.msg-voice-curr');
                var durEl = wrap.querySelector('.msg-voice-dur');
                var waveArea = wrap.querySelector('.msg-voice-wave-area');
                var speedBtn = wrap.querySelector('.msg-voice-speed');
                if (!audio || !btn || !curEl) return;
                try { audio.removeAttribute('controls'); } catch (_c0) {}
                var speedRates = [1, 1.5, 2];
                var speedIdx = 0;
                function applyProgress(pct) {
                    pct = Math.max(0, Math.min(100, pct));
                    if (wavePlayed) wavePlayed.style.width = pct + '%';
                    if (playhead) playhead.style.left = pct + '%';
                    if (waveArea) waveArea.setAttribute('aria-valuenow', String(Math.round(pct)));
                }
                function setUiPlaying(p) {
                    wrap.classList.toggle('msg-voice-player--playing', !!p);
                    btn.setAttribute('aria-pressed', p ? 'true' : 'false');
                }
                function pauseOthers() {
                    if (_crmActiveChatVoiceAudio && _crmActiveChatVoiceAudio !== audio) {
                        try { _crmActiveChatVoiceAudio.pause(); } catch (_e) {}
                    }
                }
                function updateCurrLabel() {
                    var d = audio.duration;
                    var c = audio.currentTime;
                    if (d && isFinite(d) && isFinite(c)) {
                        curEl.textContent = formatMsgVoiceTime(c);
                        if (durEl) durEl.textContent = ' / ' + formatMsgVoiceTime(d);
                    } else if (d && isFinite(d)) {
                        curEl.textContent = formatMsgVoiceTime(c || 0);
                        if (durEl) durEl.textContent = ' / ' + formatMsgVoiceTime(d);
                    } else {
                        curEl.textContent = '0:00';
                        if (durEl) durEl.textContent = '';
                    }
                }
                if (speedBtn) {
                    speedBtn.addEventListener('click', function(ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        speedIdx = (speedIdx + 1) % speedRates.length;
                        var r = speedRates[speedIdx];
                        try { audio.playbackRate = r; } catch (_s) {}
                        speedBtn.textContent = (r === 1 ? '1x' : r === 1.5 ? '1.5x' : '2x');
                    });
                }
                btn.addEventListener('click', function(ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (audio.paused) {
                        pauseOthers();
                        var p = audio.play();
                        if (p && typeof p.then === 'function') {
                            p.then(function() { _crmActiveChatVoiceAudio = audio; }).catch(function() {
                                var mr = wrap.closest('.msg-media');
                                if (mr) mr.classList.add('msg-media-error');
                            });
                        } else {
                            _crmActiveChatVoiceAudio = audio;
                        }
                    } else {
                        audio.pause();
                        if (_crmActiveChatVoiceAudio === audio) _crmActiveChatVoiceAudio = null;
                    }
                });
                audio.addEventListener('play', function() { setUiPlaying(true); });
                audio.addEventListener('pause', function() { setUiPlaying(false); });
                audio.addEventListener('ended', function() {
                    setUiPlaying(false);
                    applyProgress(0);
                    audio.currentTime = 0;
                    updateCurrLabel();
                    if (_crmActiveChatVoiceAudio === audio) _crmActiveChatVoiceAudio = null;
                });
                audio.addEventListener('timeupdate', function() {
                    var d = audio.duration;
                    if (!d || !isFinite(d)) return;
                    var pct = (audio.currentTime / d) * 100;
                    applyProgress(pct);
                    updateCurrLabel();
                });
                audio.addEventListener('loadedmetadata', function() {
                    updateCurrLabel();
                    applyProgress(0);
                });
                if (waveArea) {
                    waveArea.addEventListener('click', function(ev) {
                        if (ev.target.closest('.msg-voice-speed')) return;
                        var d = audio.duration;
                        if (!d || !isFinite(d)) return;
                        var rect = waveArea.getBoundingClientRect();
                        var ratio = (ev.clientX - rect.left) / (rect.width || 1);
                        ratio = Math.max(0, Math.min(1, ratio));
                        try { audio.currentTime = ratio * d; } catch (_e2) {}
                    });
                    waveArea.addEventListener('keydown', function(ev) {
                        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
                        var d = audio.duration;
                        if (!d || !isFinite(d)) return;
                        ev.preventDefault();
                        var step = Math.max(1, d * 0.06);
                        if (ev.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - step);
                        else audio.currentTime = Math.min(d, audio.currentTime + step);
                    });
                }
            });
        }
        function buildMessageContextBanner(m, isOut) {
            var meta = (m && m.metadata) || {};
            var parts = [];
            if (meta.forwardedFrom) {
                var fromName = String(meta.forwardedFrom.customerName || '').trim();
                var byName = (meta.forwardedBy && meta.forwardedBy.name) ? String(meta.forwardedBy.name).trim() : '';
                if (!byName && isOut && m.user) byName = staffDisplayName(m.user);
                var toName = (meta.forwardedTo && meta.forwardedTo.customerName) ? String(meta.forwardedTo.customerName).trim() : '';
                var label;
                if (LANG === 'fa') {
                    label = '↪️ فوروارد';
                    if (fromName) label += ' از «' + fromName + '»';
                    if (byName) label += ' · توسط ' + byName;
                    if (toName) label += ' → «' + toName + '»';
                } else if (LANG === 'tr') {
                    label = '↪️ İletildi';
                    if (fromName) label += ' · ' + fromName;
                    if (byName) label += ' · ' + byName;
                    if (toName) label += ' → ' + toName;
                } else {
                    label = '↪️ Forwarded';
                    if (fromName) label += ' from ' + fromName;
                    if (byName) label += ' · by ' + byName;
                    if (toName) label += ' → ' + toName;
                }
                parts.push('<div class="msg-context-banner msg-context-forward">' + escapeHtml(label) + '</div>');
            }
            if (isOut && meta.staffVoiceIntro && !meta.forwardedFrom) {
                var vi = String(meta.staffVoiceIntro).trim();
                if (vi) {
                    parts.push('<div class="msg-context-banner msg-context-voice-intro">' + escapeHtml(vi) + '</div>');
                }
            }
            return parts.join('');
        }
        function buildWaCallMessageHtml(m, isOut, time) {
            var meta = (m && m.metadata) || {};
            var isVideo = meta.callType === 'video';
            var title = isVideo
                ? ((typeof t === 'function' && t('video_call')) || (LANG === 'fa' ? 'تماس تصویری' : 'Video call'))
                : ((typeof t === 'function' && t('voice_call')) || (LANG === 'fa' ? 'تماس صوتی' : 'Voice call'));
            var staff = String(meta.staffName || (m.user && staffDisplayName(m.user)) || '').trim();
            var dept = String(meta.departmentName || '').trim();
            var methodLabel = meta.method === 'link'
                ? (LANG === 'fa' ? 'ارسال لینک تماس' : LANG === 'tr' ? 'Arama bağlantısı' : 'Call link sent')
                : (LANG === 'fa' ? 'برقراری از Gateway' : LANG === 'tr' ? 'Gateway araması' : 'Placed via Gateway');
            var metaLine = methodLabel;
            if (staff) metaLine += (LANG === 'fa' ? ' · توسط ' : ' · by ') + staff;
            if (dept) metaLine += ' (' + dept + ')';
            var intro = String(meta.introText || '').trim();
            var introHtml = intro
                ? '<div class="msg-wa-call-intro">' + escapeHtml(intro.length > 160 ? intro.slice(0, 160) + '…' : intro) + '</div>'
                : '';
            return '<div class="msg-wa-call-card" role="group" aria-label="' + escapeAttr(title) + '">' +
                '<div class="msg-wa-call-title"><span aria-hidden="true">📞</span><span>' + escapeHtml(title) + '</span></div>' +
                '<div class="msg-wa-call-meta">' + escapeHtml(metaLine) + '</div>' +
                introHtml +
                '<div class="msg-wa-call-meta"><span class="time">' + escapeHtml(time) + '</span></div>' +
                '</div>';
        }
        /** منبع ارسال پیام خروجی — پنل CRM یا اپ واتساپ موبایل */
        function msgSendSource(m) {
            return (m && m.metadata && m.metadata.sendSource) ? String(m.metadata.sendSource) : '';
        }
        function isMobileWhatsappSend(m) {
            return msgSendSource(m) === 'whatsapp_mobile';
        }
        function isCrmPanelSend(m) {
            return msgSendSource(m) === 'crm_panel';
        }
        /** پیام خروجی غیر پنل = واتساپ موبایل (یا رکورد قدیمی بدون sendSource) */
        function isExternalWhatsappOutgoing(m) {
            return !!(m && m.direction === 'outgoing' && !m.isAutoReply && !isCrmPanelSend(m));
        }
        /** نام نمایشی کارمند در چت (همان اولویت پیام واتساپ) */
        function staffDisplayName(um) {
            if (!um) return '';
            var dedicated = (um.whatsappSenderName || '').trim();
            if (dedicated) return dedicated;
            var parts = [um.firstName, um.lastName].filter(Boolean).join(' ').trim();
            if (parts) return parts;
            return (um.name || um.username || '').trim();
        }
        function buildOutgoingSenderLabel(m) {
            if (m.isAutoReply) {
                return '<div class="msg-sender">' + escapeHtml(t('ai_assistant') || 'AI assistant') + '</div>';
            }
            if (isMobileWhatsappSend(m) || isExternalWhatsappOutgoing(m)) {
                var um = outgoingMsgStaffUser(m) || {};
                var staffName = staffDisplayName(um);
                var mobileBadge = escapeHtml(t('msg_from_whatsapp_mobile') || (LANG === 'fa' ? 'واتساپ موبایل' : 'WhatsApp mobile'));
                var av = staffName && typeof internalMsgAvatarHtml === 'function' ? internalMsgAvatarHtml(um) : '';
                var namePart = staffName ? '<span class="msg-sender-staff-name">' + escapeHtml(staffName) + '</span>' : '';
                return '<div class="msg-sender msg-sender-mobile">' + av + '<span class="msg-sender-mobile-badge">' + mobileBadge + '</span>' + namePart + '</div>';
            }
            if (m.user && staffDisplayName(m.user)) {
                var staffNamePanel = escapeHtml(staffDisplayName(m.user));
                var panelBadge = msgSendSource(m) === 'crm_panel'
                    ? '<span class="msg-sender-panel-badge">' + escapeHtml(t('msg_from_crm_panel') || (LANG === 'fa' ? 'پنل CRM' : 'CRM panel')) + '</span>'
                    : '';
                return '<div class="msg-sender msg-sender-staff">' + internalMsgAvatarHtml(m.user) + '<span class="msg-sender-staff-name">' + staffNamePanel + '</span>' + panelBadge + '</div>';
            }
            return '<div class="msg-sender msg-sender-mobile"><span class="msg-sender-mobile-badge">' + escapeHtml(t('msg_from_whatsapp_mobile') || (LANG === 'fa' ? 'واتساپ موبایل' : 'WhatsApp mobile')) + '</span></div>';
        }
        /** آواتار کنار پلیر ویس — شبیه واتساپ وب (کارمند / مشتری / حرف گروه) */
        function buildVoiceWaAvatarCol(isOut, m) {
            if (isOut) {
                var externalMobile = isMobileWhatsappSend(m) || isExternalWhatsappOutgoing(m);
                var um = externalMobile ? (outgoingMsgStaffUser(m) || {}) : (m.user || {});
                var hasStaff = staffDisplayName(um);
                // assignee فقط برای پیام واقعاً ارسال‌شده از پنل CRM
                if (!hasStaff && !externalMobile && isCrmPanelSend(m) && currentConvDetail && currentConvDetail.assignee) {
                    var asn = currentConvDetail.assignee;
                    um = { name: asn.name || '', username: asn.username || '', email: asn.email || '', avatar: asn.avatar, firstName: asn.firstName, lastName: asn.lastName, whatsappSenderName: asn.whatsappSenderName };
                    hasStaff = staffDisplayName(um);
                }
                if (!hasStaff && externalMobile) {
                    return '<div class="msg-voice-wa-avatar-col"><div class="msg-voice-wa-avatar-wrap msg-voice-wa-avatar-wrap--mobile"><span class="avatar-fallback msg-voice-wa-mobile-icon" aria-hidden="true">📱</span><span class="msg-voice-wa-mic-badge" aria-hidden="true"></span></div></div>';
                }
                var av = typeof internalMsgAvatarHtml === 'function' ? internalMsgAvatarHtml(um, 'msg-voice-wa-avatar') : '<span class="msg-voice-wa-avatar-fb">?</span>';
                return '<div class="msg-voice-wa-avatar-col"><div class="msg-voice-wa-avatar-wrap">' + av + '<span class="msg-voice-wa-mic-badge" aria-hidden="true"></span></div></div>';
            }
            if (currentConvIsGroup) {
                var sn = (m.metadata && m.metadata.senderName) ? String(m.metadata.senderName).trim() : '';
                var ch = sn ? sn.charAt(0).toUpperCase() : '?';
                return '<div class="msg-voice-wa-avatar-col"><div class="msg-voice-wa-avatar-wrap msg-voice-wa-avatar-wrap--letter"><span class="avatar-fallback">' + escapeHtml(ch) + '</span><span class="msg-voice-wa-mic-badge" aria-hidden="true"></span></div></div>';
            }
            var cust = (currentConvDetail && currentConvDetail.customer) ? currentConvDetail.customer : null;
            if (!cust && openChatCustomerPreview) {
                cust = {
                    name: openChatCustomerPreview.name,
                    phone: openChatCustomerPreview.phone,
                    profilePic: openChatCustomerPreview.profilePic
                };
            }
            var name = cust ? (typeof customerUiName === 'function' ? customerUiName(cust) : String(cust.name || '').trim()) : '';
            var initial = name ? name.charAt(0).toUpperCase() : '?';
            var rawPic = cust && cust.profilePic ? String(cust.profilePic).trim() : '';
            var picSrc = cust && cust.id ? customerAvatarDisplaySrc(cust) : (rawPic && typeof profilePicDisplaySrc === 'function' ? profilePicDisplaySrc(rawPic) : '');
            var canImg = !!(cust && cust.id ? customerAvatarShowsImage(cust) : (rawPic && typeof profilePicShowsImage === 'function' && profilePicShowsImage(rawPic) && picSrc));
            var img = canImg ? '<img src="' + escapeHtml(picSrc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">' : '';
            var waNoPic = !canImg ? ' msg-voice-wa-no-photo' : '';
            return '<div class="msg-voice-wa-avatar-col"><div class="msg-voice-wa-avatar-wrap' + waNoPic + '">' + '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>' + img + '<span class="msg-voice-wa-mic-badge" aria-hidden="true"></span></div></div>';
        }
        async function loadMessages(id, loadOlder) {
            // لغو درخواست قبلی در صورت تغییر مکالمه
            if (_loadMessagesController) { _loadMessagesController.abort(); _loadMessagesController = null; }
            if (!loadOlder) {
                _currentMsgConvId = id;
                _currentMsgOldestId = null;
            }
            // اگر مکالمه عوض شده باشه، نتیجه قدیمی رو نشون نده
            const thisConvId = id;
            _loadMessagesController = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const el = document.getElementById('chatMessages');
            if (!loadOlder) {
                el.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            }
            let url = '/api/conversations/' + id + '/messages';
            if (loadOlder && _currentMsgOldestId) url += '?before=' + encodeURIComponent(_currentMsgOldestId);
            const fetchOpts = _loadMessagesController ? { signal: _loadMessagesController.signal } : {};
            const res = await apiFetch(url, fetchOpts);
            // اگر مکالمه عوض شده بود نتیجه رو نادیده بگیر
            if (_currentMsgConvId !== thisConvId) return;
            if (res.needLogin) return;
            if (!res.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            if (data.mobileWhatsappSender) _mobileWaSender = data.mobileWhatsappSender;
            else await ensureMobileWaSender(false);
            if (!data.data || data.data.length === 0) { if (!loadOlder) el.innerHTML = '<div class="empty"><span class="empty-icon">\uD83D\uDCAC</span><br>' + t('empty_internal_msgs') + '</div>'; return; }
            // ذخیره قدیمی‌ترین id برای load older
            if (data.oldestId) _currentMsgOldestId = data.oldestId;
            const list = data.data.filter(function(m) {
                if (m.direction === 'outgoing') return true;
                if (m.hasMedia) return true;
                const md = coerceMediaData(m.mediaData);
                const hasContent = (m.content && String(m.content).trim()) || (md && (md.url || md.filename));
                return !!hasContent;
            });
            const newMsgs = list.map(function(m) {
                if (m.mediaData) m.mediaData = coerceMediaData(m.mediaData) || m.mediaData;
                const isOut = m.direction === 'outgoing';
                const time = m.timestamp ? fmtTZ(m.timestamp, 'time') : '';
                let senderLabel = '';
                if (isOut) {
                    senderLabel = buildOutgoingSenderLabel(m);
                } else if (!isOut && currentConvIsGroup) {
                    const sn = (m.metadata && m.metadata.senderName) || null;
                    const sid = (m.metadata && m.metadata.senderId) || null;
                    let displayName = sn;
                    let senderPhone = null;
                    if (sid && canViewCustomerPhoneUi()) {
                        const rawPhone = String(sid).replace(/@[a-z0-9.]+$/i, '').replace(/\D/g, '');
                        if (rawPhone) senderPhone = rawPhone;
                        if (!displayName) displayName = rawPhone ? (rawPhone.replace(/^98/, '0') || rawPhone) : null;
                    }
                    if (displayName && window.CRM && CRM.Utils && CRM.Utils.looksLikePhone && CRM.Utils.looksLikePhone(displayName) && !canViewCustomerPhoneUi()) {
                        displayName = null;
                    }
                    if (!displayName) displayName = LANG === 'fa' ? 'عضو گروه' : 'Group member';
                    const senderPhoneAttr = senderPhone ? ' data-sender-phone="' + escapeHtml(senderPhone) + '"' : '';
                    const senderNameAttr = ' data-sender-name="' + escapeHtml(displayName) + '"';
                    senderLabel = '<div class="msg-sender msg-sender-group msg-sender-clickable"' + senderPhoneAttr + senderNameAttr + ' title="' + (LANG === 'fa' ? 'کلیک برای پیام خصوصی' : 'Click to send private message') + '">' + escapeHtml(displayName) + '</div>';
                }
                let mediaHtml = '';
                const baseUrl = (API && String(API).length) ? String(API).replace(/\/$/, '') : (typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '');
                function inferMediaType(msg) {
                    const t = (msg.type || 'document').toLowerCase();
                    const md = msg.mediaData || {};
                    const mime = (md.mimetype || '').toLowerCase();
                    const name = (md.filename || msg.content || '').toLowerCase();
                    if (t === 'sticker' || md.isSticker || name === 'sticker.webp' || /(?:^|[_-])sticker\.webp$/i.test(name)) return 'sticker';
                    if (t === 'image' || t === 'video' || t === 'audio' || t === 'ptt') return (t === 'ptt' ? 'audio' : t);
                    var urlTail = '';
                    if (md.url && typeof md.url === 'string') {
                        const ru = md.url.trim();
                        if (ru.indexOf('data:') !== 0 && ru.indexOf('blob:') !== 0) {
                            urlTail = ru.split('?')[0].toLowerCase();
                        }
                    }
                    const extHaystack = name + ' ' + urlTail;
                    if (mime.indexOf('image/') === 0 || /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(extHaystack)) return 'image';
                    if (mime.indexOf('video/') === 0 || /\.(mp4|webm|mov|avi)(\?|$)/i.test(extHaystack)) return 'video';
                    if (mime.indexOf('audio/') === 0 || /\.(mp3|ogg|wav|m4a|opus|oga|webm)(\?|$)/i.test(extHaystack)) return 'audio';
                    return 'document';
                }
                let mediaUrl = '';
                if (m.hasMedia && m.mediaData) {
                    const md = m.mediaData;
                    if (md.url && String(md.url).trim()) {
                        const rawUrl = String(md.url).trim();
                        if (rawUrl.indexOf('data:') === 0 || rawUrl.indexOf('blob:') === 0) {
                            mediaUrl = rawUrl;
                        } else if (rawUrl.indexOf('//') === 0) {
                            mediaUrl = ensureHttpsUrl('https:' + rawUrl);
                        } else if (/^https?:\/\//i.test(rawUrl)) {
                            mediaUrl = ensureHttpsUrl(rawUrl);
                        } else {
                            const slashIdx = rawUrl.indexOf('/');
                            const hostPart = slashIdx >= 0 ? rawUrl.slice(0, slashIdx) : rawUrl;
                            if (typeof looksLikeSchemelessHttpHost === 'function' && hostPart && looksLikeSchemelessHttpHost(hostPart)) {
                                mediaUrl = ensureHttpsUrl('https://' + rawUrl.replace(/^\/+/, ''));
                            } else {
                                const mediaBase = window.location.origin || baseUrl;
                                mediaUrl = mediaBase + (rawUrl.startsWith('/') ? '' : '/') + rawUrl;
                                mediaUrl = ensureHttpsUrl(mediaUrl);
                            }
                        }
                    } else if (md.data && (inferMediaType(m) === 'image' || (md.mimetype || '').toLowerCase().indexOf('image/') === 0)) {
                        const mime = (md.mimetype || 'image/jpeg').split(';')[0].trim();
                        mediaUrl = 'data:' + mime + ';base64,' + md.data;
                    } else if (md.data && (inferMediaType(m) === 'audio' || (md.mimetype || '').toLowerCase().indexOf('audio/') === 0)) {
                        const mimeAudio = (md.mimetype || 'audio/ogg').split(';')[0].trim();
                        mediaUrl = 'data:' + mimeAudio + ';base64,' + md.data;
                    }
                }
                if (mediaUrl && m.hasMedia && m.mediaData) {
                    const mediaType = inferMediaType(m);
                    const mdMime = ((m.mediaData && m.mediaData.mimetype) || '').split(';')[0].trim();
                    const fileSizeBytes = m.mediaData && (m.mediaData.size || m.mediaData.filesize);
                    if (mediaType === 'sticker') {
                        mediaHtml = '<div class="msg-media msg-media-sticker"><img src="' + escapeHtml(mediaUrl) + '" alt="" loading="lazy" onerror="crmMsgMediaImgErr(this)"></div>';
                    } else if (mediaType === 'image') {
                        const imgAlt = escapeHtml(m.mediaData.filename || (LANG === 'fa' ? 'تصویر' : 'Image'));
                        const fnRaw = (m.mediaData.filename || m.content || (LANG === 'fa' ? 'تصویر' : 'Image'));
                        mediaHtml = '<div class="msg-media msg-media-image">' +
                            '<a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link msg-media-image-link" data-open="1">' +
                            '<img src="' + escapeHtml(mediaUrl) + '" alt="' + imgAlt + '" loading="lazy" onerror="crmMsgMediaImgErr(this)">' +
                            '</a>' +
                            '<div class="msg-media-image-fallback" hidden>' + buildMsgFileCardHtml(mediaUrl, fnRaw, 'image', fileSizeBytes) + '</div>' +
                            '</div>';
                    } else if (mediaType === 'video') {
                        mediaHtml = '<div class="msg-media msg-media-video"><video src="' + escapeHtml(mediaUrl) + '" controls preload="metadata" playsinline></video><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link" data-open="1">' + (LANG === 'fa' ? 'پخش ویدیو' : 'Play video') + '</a></div>';
                    } else if (mediaType === 'audio') {
                        const fnameRaw = ((m.mediaData && m.mediaData.filename) || m.content || '').trim();
                        const fnameLo = fnameRaw.toLowerCase();
                        const urlLo = (mediaUrl || '').split('?')[0].toLowerCase();
                        const mimeLo = ((m.mediaData && m.mediaData.mimetype) || '').split(';')[0].trim().toLowerCase();
                        const isPtt = (m.type || '').toLowerCase() === 'ptt'
                            || /^audio\/(ogg|opus|webm)/i.test(mimeLo)
                            || /voice|پیام صوتی|ptt|_ptt\.|\.ogg|\.opus|\.oga|\.webm/i.test(fnameLo + ' ' + urlLo);
                        const voiceClass = isPtt ? ' msg-media-voice' : ' msg-media-audio';
                        const errHint = LANG === 'fa' ? 'پخش در مرورگر ممکن نیست — از دانلود استفاده کنید.' : 'Playback failed — try download.';
                        const playAria = LANG === 'fa' ? 'پخش یا توقف' : 'Play or pause';
                        var groupAria = LANG === 'fa' ? 'پیام صوتی' : 'Voice message';
                        if (!isPtt) {
                            const nice = fnameRaw && fnameLo !== 'file' ? fnameRaw : '';
                            groupAria = nice
                                ? (LANG === 'fa' ? ('فایل صوتی: ' + nice) : ('Audio: ' + nice))
                                : (LANG === 'fa' ? 'فایل صوتی' : 'Audio message');
                        }
                        const speedAria = LANG === 'fa' ? 'سرعت پخش' : 'Playback speed';
                        var voiceBars = '';
                        for (var vb = 0; vb < 36; vb++) voiceBars += '<span class="msg-voice-bar"></span>';
                        var dcVoice = (m.content || '').trim();
                        if (isOut && dcVoice.indexOf('🤖 ') === 0) dcVoice = dcVoice.slice(2).trim();
                        else if (isOut && dcVoice.indexOf('AI KAYA: ') === 0) dcVoice = dcVoice.slice(9).trim();
                        var fnCapVoice = ((m.mediaData && m.mediaData.filename) || '').trim();
                        var dcLoV = dcVoice.toLowerCase();
                        var fnLoV = fnCapVoice.toLowerCase();
                        if (fnCapVoice && (dcVoice === fnCapVoice || dcLoV === fnLoV)) dcVoice = '';
                        else if (/^voice\.(webm|ogg|m4a|mp3|wav)$/i.test(dcVoice)) dcVoice = '';
                        else if (dcVoice === 'file' || dcVoice === '📎 فایل') dcVoice = '';
                        var voiceBubbleCompact = !dcVoice;
                        if (isPtt && isOut) mediaUrl = preferVoicePlaybackUrl(mediaUrl, true);
                        var voiceWaStatus = '';
                        if (voiceBubbleCompact && isOut && m.status && m.status !== 'pending') {
                            var voiceStsTit = (m.status === 'read' ? (LANG === 'fa' ? 'خوانده شده' : 'Read') : m.status === 'delivered' ? (LANG === 'fa' ? 'تحویل' : 'Delivered') : m.status === 'sent' ? (LANG === 'fa' ? 'ارسال' : 'Sent') : m.status === 'failed' ? (LANG === 'fa' ? 'ارسال نشد' : 'Failed to send') : '');
                            voiceWaStatus = '<span class="msg-voice-wa-inline-status msg-status msg-status-' + m.status + '" title="' + escapeAttr(voiceStsTit) + '">' + waMsgStatusTicks(m.status) + '</span>';
                        }
                        var voiceMetaSent = voiceBubbleCompact
                            ? '<span class="msg-voice-sent-wrap"><span class="msg-voice-sent-time">' + escapeHtml(time) + '</span>' + voiceWaStatus + '</span>'
                            : '<span class="msg-voice-sent-time">' + escapeHtml(time) + '</span>';
                        var waShellCls = 'msg-voice-wa-shell' + (isOut ? ' msg-voice-wa-shell--out' : ' msg-voice-wa-shell--in');
                        var waRowCls = 'msg-voice-wa-row' + (isOut ? ' msg-voice-wa-row--out' : ' msg-voice-wa-row--in');
                        var voiceFwdLabel = LANG === 'fa' ? '🎤 پیام صوتی' : (LANG === 'tr' ? '🎤 Sesli mesaj' : '🎤 Voice message');
                        var voiceFwdTitle = escapeAttr((typeof t === 'function' && t('msg_forward_short')) || (LANG === 'fa' ? 'فوروارد' : LANG === 'tr' ? 'İlet' : 'Forward'));
                        var voiceDlTitle = escapeAttr(LANG === 'fa' ? 'دانلود' : (LANG === 'tr' ? 'İndir' : 'Download'));
                        var voiceToolbar = m.id
                            ? ('<div class="msg-voice-wa-toolbar" role="toolbar" aria-label="' + escapeAttr(LANG === 'fa' ? 'عملیات پیام صوتی' : 'Voice actions') + '">' +
                                '<button type="button" class="msg-voice-toolbar-btn msg-forward-btn" data-msg-id="' + escapeAttr(m.id) + '" data-preview="' + escapeAttr(voiceFwdLabel) + '" title="' + voiceFwdTitle + '" aria-label="' + voiceFwdTitle + '">' +
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>' +
                                '</button>' +
                                '<a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-voice-toolbar-btn msg-voice-toolbar-dl" data-open="1" title="' + voiceDlTitle + '" aria-label="' + voiceDlTitle + '">' +
                                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                                '</a></div>')
                            : '';
                        var voicePlayerCore =
                            '<div class="msg-voice-player msg-voice-player--telegram" role="group" aria-label="' + escapeAttr(groupAria) + '" dir="ltr">' +
                            '<div class="msg-voice-tg-row">' +
                            '<button type="button" class="msg-voice-play" aria-label="' + escapeAttr(playAria) + '" aria-pressed="false">' +
                            '<svg class="msg-voice-icon msg-voice-icon--play" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.5v13l11-6.5-11-6.5z"/></svg>' +
                            '<svg class="msg-voice-icon msg-voice-icon--pause" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>' +
                            '</button>' +
                            '<div class="msg-voice-wave-area" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="' + escapeAttr(groupAria) + '" tabindex="0">' +
                            '<div class="msg-voice-wave-bars" aria-hidden="true">' + voiceBars + '</div>' +
                            '<div class="msg-voice-wave-played" aria-hidden="true"></div>' +
                            '<div class="msg-voice-playhead" aria-hidden="true"></div>' +
                            '</div>' +
                            '<button type="button" class="msg-voice-speed" aria-label="' + escapeAttr(speedAria) + '">1×</button>' +
                            '</div>' +
                            '<div class="msg-voice-tg-meta">' +
                            '<span class="msg-voice-tg-time"><span class="msg-voice-curr">0:00</span><span class="msg-voice-dur"></span></span>' +
                            voiceMetaSent +
                            '</div>' +
                            '<audio class="msg-audio-el" src="' + escapeHtml(mediaUrl) + '" preload="metadata" playsinline onerror="crmVoiceAudioErr(this)"></audio>' +
                            '</div>';
                        var voiceTail = '<p class="msg-media-audio-err" role="alert">' + escapeHtml(errHint) + '</p>';
                        if (voiceBubbleCompact) {
                            mediaHtml =
                                '<div class="msg-media msg-media-voice-tg msg-media-voice-wa-compact' + voiceClass + '">' +
                                '<div class="' + waShellCls + '">' +
                                voiceToolbar +
                                '<div class="' + waRowCls + '">' +
                                buildVoiceWaAvatarCol(isOut, m) +
                                voicePlayerCore +
                                '</div></div>' +
                                voiceTail +
                                '</div>';
                        } else {
                            mediaHtml =
                                '<div class="msg-media msg-media-voice-tg' + voiceClass + '">' +
                                voicePlayerCore +
                                voiceToolbar +
                                voiceTail +
                                '<a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link msg-media-dl msg-voice-dl-subtle" data-open="1">' + (LANG === 'fa' ? 'دانلود فایل صوتی' : 'Download audio') + '</a>' +
                                '</div>';
                        }
                    } else {
                        mediaHtml = '<div class="msg-media msg-media-file">' + buildMsgFileCardHtml(mediaUrl, m.mediaData.filename || m.content, mediaType, fileSizeBytes) + '</div>';
                    }
                } else if (m.hasMedia && (m.content || (m.mediaData && (m.mediaData.filename || m.mediaData.url)))) {
                    const fileName = (m.mediaData && m.mediaData.filename) || m.content || (LANG === 'fa' ? 'فایل' : 'File');
                    const isImageName = /\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName);
                    mediaHtml = '<div class="msg-media msg-media-file">' + buildMsgFileCardHtml('', fileName, isImageName ? 'image' : 'document', m.mediaData && m.mediaData.size) + '</div>';
                }
                var resolvedMediaType = (mediaUrl && m.hasMedia && m.mediaData) ? inferMediaType(m) : '';
                let contentHtml = '';
                var isWaCallMsg = !!(m.metadata && m.metadata.waCall);
                if (isWaCallMsg && isOut) {
                    contentHtml = buildWaCallMessageHtml(m, isOut, time);
                }
                let displayContent = (m.content || '').trim();
                if (isOut && (displayContent.indexOf('🤖 ') === 0)) displayContent = displayContent.slice(2).trim();
                else if (isOut && displayContent.indexOf('AI KAYA: ') === 0) displayContent = displayContent.slice(9).trim();
                var fnCaption = (m.mediaData && m.mediaData.filename) ? String(m.mediaData.filename).trim() : '';
                if (resolvedMediaType === 'sticker' && (/sticker\.webp/i.test(displayContent) || displayContent === '🌟 استیکر')) displayContent = '';
                if (resolvedMediaType === 'audio' && displayContent) {
                    var dcLo = displayContent.toLowerCase();
                    var fnLo = fnCaption.toLowerCase();
                    if (fnCaption && (displayContent === fnCaption || dcLo === fnLo)) displayContent = '';
                    else if (/^voice\.(webm|ogg|m4a|mp3|wav)$/i.test(displayContent)) displayContent = '';
                    else if (displayContent === 'file' || displayContent === '📎 فایل') displayContent = '';
                }
                if (m.hasMedia && m.mediaData && m.mediaData.url && m.content && displayContent) contentHtml = '<div class="msg-caption">' + linkifyMessageContent(displayContent) + '</div>';
                else if (displayContent && !(m.hasMedia && !(m.mediaData && m.mediaData.url)) && !isWaCallMsg) contentHtml = '<div>' + linkifyMessageContent(displayContent) + '</div>';
                let preview = (m.content || '').slice(0, 50) || (m.hasMedia ? '📎' : '');
                if ((m.content || '').length > 50) preview += '…';
                if (resolvedMediaType === 'audio') {
                    preview = LANG === 'fa' ? '🎤 پیام صوتی' : (LANG === 'tr' ? '🎤 Sesli mesaj' : '🎤 Voice message');
                } else if (resolvedMediaType === 'sticker') {
                    preview = LANG === 'fa' ? 'استیکر' : 'Sticker';
                }
                // اضافه کردن اسم فرستنده به preview برای گروه
                let replyPreviewSender = '';
                if (!isOut && currentConvIsGroup) {
                    let rSn = (m.metadata && m.metadata.senderName) || null;
                    const rSid = (m.metadata && m.metadata.senderId) || null;
                    if (!rSn && rSid) { const rRaw = String(rSid).replace(/@[a-z0-9.]+$/i, '').replace(/\D/g, ''); rSn = rRaw ? rRaw.replace(/^98/, '0') : null; }
                    if (rSn) replyPreviewSender = rSn + ': ';
                }
                const replyTitle = escapeAttr((typeof t === 'function' && t('msg_reply_short')) || (LANG === 'fa' ? 'پاسخ' : LANG === 'tr' ? 'Yanıtla' : 'Reply'));
                const forwardTitle = escapeAttr((typeof t === 'function' && t('msg_forward_short')) || (LANG === 'fa' ? 'فوروارد' : LANG === 'tr' ? 'İlet' : 'Forward'));
                const replyBtn = m.whatsappId ? '<button type="button" class="msg-reply-btn" data-wa-id="' + escapeAttr(m.whatsappId) + '" data-preview="' + escapeAttr(replyPreviewSender + preview) + '" title="' + replyTitle + '">↩</button>' : '';
                const voiceTgHideFooterTime = (resolvedMediaType === 'audio' && !displayContent);
                // فوروارد ویس روی خود حباب است؛ در فوتر تکرار نشود
                const forwardBtn = (m.id && !voiceTgHideFooterTime) ? '<button type="button" class="msg-forward-btn" data-msg-id="' + escapeAttr(m.id) + '" data-preview="' + escapeAttr(replyPreviewSender + preview) + '" title="' + forwardTitle + '">➦</button>' : '';
                const statusHtml = (!voiceTgHideFooterTime && isOut && m.status && m.status !== 'pending') ? '<span class="msg-status msg-status-' + m.status + '" title="' + (m.status === 'read' ? (LANG === 'fa' ? 'خوانده شده' : 'Read') : m.status === 'delivered' ? (LANG === 'fa' ? 'تحویل' : 'Delivered') : m.status === 'sent' ? (LANG === 'fa' ? 'ارسال' : 'Sent') : m.status === 'failed' ? (LANG === 'fa' ? 'ارسال نشد' : 'Failed to send') : '') + '">' + waMsgStatusTicks(m.status) + '</span>' : '';
                const msgWaExtra = voiceTgHideFooterTime ? ' msg-voice-footer-hide-time msg-voice-wa-msg' : '';
                var contextBanner = buildMessageContextBanner(m, isOut);
                return '<div class="msg ' + (isOut ? 'out' : 'in') + msgWaExtra + '" data-msg-id="' + (m.id || '') + '" data-whatsapp-id="' + (m.whatsappId || '') + '">' + senderLabel + contextBanner + mediaHtml + contentHtml + '<div class="msg-footer">' + forwardBtn + replyBtn + '<span class="time">' + time + '</span>' + statusHtml + '</div></div>';
            }).join('');
            if (loadOlder) {
                // اضافه کردن پیام‌های قدیمی‌تر به ابتدای لیست با حفظ scroll position
                const prevScrollHeight = el.scrollHeight;
                const loadOlderBtn = el.querySelector('.load-older-btn');
                if (loadOlderBtn) loadOlderBtn.insertAdjacentHTML('afterend', newMsgs);
                else el.insertAdjacentHTML('afterbegin', newMsgs);
                el.scrollTop = el.scrollHeight - prevScrollHeight;
            } else {
                el.innerHTML = newMsgs;
                scrollChatToEnd(el);
            }
            initChatMessageVoicePlayers(el);
            // نمایش/مخفی کردن دکمه بارگذاری پیام‌های قدیمی‌تر
            const existingBtn = el.querySelector('.load-older-btn');
            if (data.hasMore) {
                if (!existingBtn) {
                    const olderBtn = document.createElement('div');
                    olderBtn.className = 'load-older-btn';
                    olderBtn.style.cssText = 'text-align:center;padding:8px;';
                    olderBtn.innerHTML = '<button type="button" class="btn-secondary" style="font-size:0.8rem;" id="loadOlderBtn_' + id + '" data-msg-id="' + id + '">' + (LANG === 'fa' ? 'پیام‌های قدیمی‌تر' : 'Load older messages') + '</button>';
                    setTimeout(function() {
                        const btn = document.getElementById('loadOlderBtn_' + id);
                        if (btn) {
                            btn.removeEventListener('click', function() { loadMessages(id, true); });
                            btn.addEventListener('click', function() { loadMessages(id, true); });
                        }
                    }, 50);
                    el.insertBefore(olderBtn, el.firstChild);
                }
            } else if (existingBtn) {
                existingBtn.remove();
            }
        }
        function scrollChatToEnd(el) {
            if (!el) return;
            function doScroll() {
                el.scrollTop = el.scrollHeight;
                const last = el.lastElementChild;
                if (last && last.scrollIntoView) last.scrollIntoView({ block: 'end' });
            }
            doScroll();
            requestAnimationFrame(doScroll);
            setTimeout(doScroll, 50);
            setTimeout(doScroll, 200);
        }
        async function loadConvStats(convId, el) {
            if (!el) return;
            el.innerHTML = '<span class="loading-skeleton" style="display:inline-block;width:120px;height:20px;border-radius:4px;"></span>';
            const res = await apiFetch('/api/conversations/' + convId + '/stats');
            if (res.needLogin || !res.ok) { el.innerHTML = ''; return; }
            const s = res.data;
            const parts = [];
            if (s.firstResponseTimeMin != null) {
                const timeLabel = s.firstResponseTimeMin < 60 ? (s.firstResponseTimeMin + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min')) : (Math.floor(s.firstResponseTimeMin / 60) + ' ' + (LANG === 'fa' ? 'ساعت' : 'hr'));
                parts.push('<span class="conv-stat-item"><span class="conv-stat-label">' + (LANG === 'fa' ? 'اولین پاسخ' : 'First response') + '</span>' + timeLabel + '</span>');
            }
            if (s.responders && s.responders.length > 0) {
                parts.push('<span class="conv-stat-item"><span class="conv-stat-label">' + (LANG === 'fa' ? 'پاسخ‌دهندگان' : 'Responders') + '</span>' + s.responders.map(function(r){ return escapeHtml(r.name); }).join(', ') + '</span>');
            }
            if (s.unreadCount > 0) {
                parts.push('<span class="conv-stat-item conv-stat-unread"><span class="conv-stat-label">' + (LANG === 'fa' ? 'خوانده‌نشده' : 'Unread') + '</span>' + s.unreadCount + '</span>');
            }
            parts.push('<span class="conv-stat-item"><span class="conv-stat-label">' + (LANG === 'fa' ? 'پیام‌ها' : 'Messages') + '</span>' + (s.messageCount || 0) + '</span>');
            el.innerHTML = parts.length ? parts.join('') : (LANG === 'fa' ? '—' : '—');
        }

        window._replyingTo = null;
        function setReplyTo(whatsappId, preview) {
            window._replyingTo = { whatsappId: whatsappId, preview: preview || '' };
            const el = document.getElementById('chatReplyPreview');
            const textEl = document.getElementById('chatReplyText');
            if (el && textEl) { textEl.textContent = (preview || '').slice(0, 60) + (preview && preview.length > 60 ? '…' : ''); el.style.display = 'flex'; }
        }
        function cancelReply() {
            window._replyingTo = null;
            const el = document.getElementById('chatReplyPreview');
            if (el) el.style.display = 'none';
        }

        var _waPickerOpen = null;
        var _waPickerDocBound = false;
        var _waAttachMenuDocListener = null;
        function closeWaTemplateDropdown() {
            if (typeof setChatTemplateDropdownOpen === 'function') {
                setChatTemplateDropdownOpen(false);
                return;
            }
            var dd = document.getElementById('chatTemplateDropdown');
            var tplBtn = document.getElementById('waAttachTemplateBtn');
            var area = document.getElementById('chatArea') || document.querySelector('.chat-area');
            if (dd) {
                dd.hidden = true;
                dd.style.display = 'none';
            }
            if (tplBtn) tplBtn.setAttribute('aria-expanded', 'false');
            if (area) area.classList.remove('wa-template-dd-open');
        }
        function closeWaAttachMenu() {
            var m = document.getElementById('waAttachMenu');
            var b = document.getElementById('waAttachMenuBtn');
            var area = document.getElementById('chatArea') || document.querySelector('.chat-area');
            if (m) m.hidden = true;
            if (b) b.setAttribute('aria-expanded', 'false');
            if (area) area.classList.remove('wa-attach-menu-open');
            if (_waAttachMenuDocListener) {
                document.removeEventListener('click', _waAttachMenuDocListener, true);
                _waAttachMenuDocListener = null;
            }
        }
        function toggleWaAttachMenu(ev) {
            if (ev) ev.stopPropagation();
            var m = document.getElementById('waAttachMenu');
            var b = document.getElementById('waAttachMenuBtn');
            var area = document.getElementById('chatArea') || document.querySelector('.chat-area');
            if (!m || !b) return;
            if (!m.hidden) {
                closeWaAttachMenu();
                return;
            }
            closeWaTemplateDropdown();
            closeWaPickers();
            m.hidden = false;
            b.setAttribute('aria-expanded', 'true');
            if (area) area.classList.add('wa-attach-menu-open');
            _waAttachMenuDocListener = function(e) {
                var t = e.target;
                if (t && t.closest && (t.closest('#waAttachMenu') || t.closest('#waAttachMenuBtn'))) return;
                closeWaAttachMenu();
            };
            setTimeout(function() {
                document.addEventListener('click', _waAttachMenuDocListener, true);
            }, 0);
        }
        function waAttachPickFile(ev) {
            if (ev) { ev.stopPropagation(); ev.preventDefault(); }
            closeWaAttachMenu();
            var fi = document.getElementById('msgFileInput');
            if (fi) fi.click();
        }
        function waOpenTemplatesFromAttachMenu(ev) {
            if (ev) ev.stopPropagation();
            closeWaAttachMenu();
            if (typeof toggleTemplateDropdown === 'function') toggleTemplateDropdown();
        }
        window.toggleWaAttachMenu = toggleWaAttachMenu;
        window.waAttachPickFile = waAttachPickFile;
        window.waOpenTemplatesFromAttachMenu = waOpenTemplatesFromAttachMenu;
        var _waPickerEmojiCat = 'all';
        var _waPickerData = {
            emoji: Array.from('😀😃😄😁😅😂🤣😊😇🙂😉😍🥰😘🥲😋😛🤪😎😢😭😤😡🤬🤔😴🙄👍👎👏🙌🙏🤝💪✌️🤞✋👌🤌💬❤️🧡💛💚💙💔✨🔥⭐🎉💯✅❌❓☕🍕🎂🎁🏠✈️📱💼📎🖼🎵🎶🌙☀️🌟🌈⚽🎮🔔📌'),
            sticker: Array.from('❤️😂🔥😍🥰👏😊🎉🤔😭🙏✨🌟💯🎂🍕🐱🐶🌹🥳😎🤗💪👍🙌🤩😇🥺🦄🌸🍀🌻🎈🎀🏆🍉🥑🍓💖💝👻🎃🎄🧸'),
            gif: [
                { label: 'Funny', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
                { label: 'Wow', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif' },
                { label: 'Happy', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
                { label: 'Love', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif' },
                { label: 'Thanks', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
                { label: 'Hi', url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif' }
            ]
        };
        function getWaEmojiCategoryMap() {
            var all = _waPickerData.emoji || [];
            return {
                all: all,
                smileys: all.slice(0, 34),
                people: all.slice(34, 52),
                symbols: all.slice(52, 65),
                objects: all.slice(65)
            };
        }
        function waPickerText(kfa, ken, ktr) { return LANG === 'fa' ? kfa : (LANG === 'tr' ? ktr : ken); }
        function getWaPickerHostMount() {
            var e = document.getElementById('waEmojiPickerMount');
            var s = document.getElementById('waStickerPickerMount');
            return e || s || null;
        }
        function closeWaPickers() {
            var e = document.getElementById('waEmojiPickerMount');
            var s = document.getElementById('waStickerPickerMount');
            if (e) { e.hidden = true; e.innerHTML = ''; }
            if (s) { s.hidden = true; s.innerHTML = ''; }
            var eb = document.getElementById('waEmojiBtn');
            if (eb) eb.setAttribute('aria-expanded', 'false');
            _waPickerOpen = null;
        }
        function ensureWaPickerGlobalClose() {
            if (_waPickerDocBound) return;
            _waPickerDocBound = true;
            document.addEventListener('click', function(ev) {
                if (!_waPickerOpen) return;
                var target = ev && ev.target;
                if (!target) return;
                if (target.closest && (target.closest('#waEmojiPickerMount') || target.closest('#waStickerPickerMount') || target.closest('#waEmojiBtn') || target.closest('#waAttachMenu') || target.closest('#waAttachMenuBtn'))) return;
                closeWaPickers();
            });
        }
        function waInsertIntoMsgInput(ch) {
            var input = document.getElementById('msgInput');
            if (!input || !ch) return;
            var start = typeof input.selectionStart === 'number' ? input.selectionStart : (input.value || '').length;
            var end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
            var v = input.value || '';
            input.value = v.slice(0, start) + ch + v.slice(end);
            try {
                input.focus();
                var pos = start + ch.length;
                input.setSelectionRange(pos, pos);
            } catch (err) { /* ignore */ }
            updateWaComposerState();
        }
        function buildWaPickerTabs(activeTab, onTab) {
            var tabs = document.createElement('div');
            tabs.className = 'wa-picker-tabs wa-picker-tabs-footer';
            var tabDefs = [
                { key: 'emoji', label: waPickerText('ایموجی', 'Emoji', 'Emoji'), icon: '😊' },
                { key: 'gif', label: 'GIF', icon: 'GIF' },
                { key: 'sticker', label: waPickerText('استیکر', 'Stickers', 'Sticker'), icon: '◌' }
            ];
            tabDefs.forEach(function(td) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'wa-picker-tab' + (td.key === activeTab ? ' active' : '');
                b.innerHTML = '<span class="wa-picker-tab-icon">' + td.icon + '</span><span class="wa-picker-tab-label">' + td.label + '</span>';
                b.onclick = function(e) { e.stopPropagation(); onTab(td.key); };
                tabs.appendChild(b);
            });
            return tabs;
        }
        function renderWaPickerBody(tab, query, body, categoryWrap) {
            body.innerHTML = '';
            if (categoryWrap) categoryWrap.innerHTML = '';
            var q = (query || '').trim().toLowerCase();
            if (tab === 'emoji' && categoryWrap) {
                var catDefs = [
                    { key: 'all', icon: '🕘', title: waPickerText('اخیر', 'Recent', 'Son Kullanilan') },
                    { key: 'smileys', icon: '😀', title: waPickerText('صورتک', 'Smileys', 'Yuzler') },
                    { key: 'people', icon: '👍', title: waPickerText('افراد', 'People', 'Kisiler') },
                    { key: 'symbols', icon: '❤️', title: waPickerText('نمادها', 'Symbols', 'Semboller') },
                    { key: 'objects', icon: '🎉', title: waPickerText('اشیا', 'Objects', 'Nesneler') }
                ];
                categoryWrap.className = 'wa-picker-cats';
                catDefs.forEach(function(c) {
                    var cb = document.createElement('button');
                    cb.type = 'button';
                    cb.className = 'wa-picker-cat-btn' + (_waPickerEmojiCat === c.key ? ' active' : '');
                    cb.title = c.title;
                    cb.textContent = c.icon;
                    cb.onclick = function(e) {
                        e.stopPropagation();
                        _waPickerEmojiCat = c.key;
                        renderWaPickerBody(tab, query, body, categoryWrap);
                    };
                    categoryWrap.appendChild(cb);
                });
            }
            if (tab === 'gif') {
                var gWrap = document.createElement('div');
                gWrap.className = 'wa-gif-grid';
                _waPickerData.gif.filter(function(g) { return !q || g.label.toLowerCase().indexOf(q) >= 0; }).forEach(function(g) {
                    var item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'wa-gif-item';
                    item.innerHTML = '<img loading="lazy" alt="' + escapeHtml(g.label) + '" src="' + escapeHtml(g.url) + '"><span>' + escapeHtml(g.label) + '</span>';
                    item.onclick = function(e) { e.stopPropagation(); sendWaGifFromPicker(g.url); };
                    gWrap.appendChild(item);
                });
                if (!gWrap.children.length) {
                    gWrap.innerHTML = '<div class="wa-picker-empty">' + waPickerText('نتیجه‌ای پیدا نشد', 'No results', 'Sonuc bulunamadi') + '</div>';
                }
                body.appendChild(gWrap);
                return;
            }
            var list = _waPickerData[tab] || [];
            if (tab === 'emoji') {
                var cmap = getWaEmojiCategoryMap();
                list = cmap[_waPickerEmojiCat] || cmap.all;
                var sec = document.createElement('div');
                sec.className = 'wa-picker-section-title';
                sec.textContent = waPickerText('یوز و شکلک‌ها', 'Smileys & people', 'Yuz ifadeleri ve insanlar');
                body.appendChild(sec);
            }
            if (q) list = list.filter(function(ch) { return String(ch).indexOf(q) >= 0; });
            var grid = document.createElement('div');
            grid.className = tab === 'emoji' ? 'wa-emoji-grid' : 'wa-sticker-grid';
            list.forEach(function(ch) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = ch;
                b.onclick = function(e) { e.stopPropagation(); waInsertIntoMsgInput(ch); closeWaPickers(); };
                grid.appendChild(b);
            });
            if (!grid.children.length) {
                grid.innerHTML = '<div class="wa-picker-empty">' + waPickerText('نتیجه‌ای پیدا نشد', 'No results', 'Sonuc bulunamadi') + '</div>';
            }
            body.appendChild(grid);
        }
        function openWaUnifiedPicker(tab) {
            ensureWaPickerGlobalClose();
            closeWaAttachMenu();
            var mount = getWaPickerHostMount();
            if (!mount) return;
            if (_waPickerOpen === tab) { closeWaPickers(); return; }
            closeWaPickers();
            _waPickerOpen = tab;
            var shell = document.createElement('div');
            shell.className = 'wa-picker-shell';
            var header = document.createElement('div');
            header.className = 'wa-picker-header';
            var title = document.createElement('div');
            title.className = 'wa-picker-title';
            title.textContent = tab === 'emoji' ? waPickerText('ایموجی', 'Emoji', 'Emoji') : tab === 'gif' ? 'GIF' : waPickerText('استیکر', 'Stickers', 'Sticker');
            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'wa-picker-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = function(e) { e.stopPropagation(); closeWaPickers(); };
            header.appendChild(title);
            header.appendChild(closeBtn);
            var tabs = buildWaPickerTabs(tab, function(nextTab) { openWaUnifiedPicker(nextTab); });
            var catWrap = document.createElement('div');
            catWrap.className = 'wa-picker-cats';
            var searchWrap = document.createElement('div');
            searchWrap.className = 'wa-picker-search-wrap';
            var search = document.createElement('input');
            search.type = 'text';
            search.className = 'wa-picker-search';
            search.placeholder = waPickerText('جستجو...', 'Search...', 'Ara...');
            searchWrap.appendChild(search);
            var body = document.createElement('div');
            body.className = 'wa-picker-body';
            shell.appendChild(header);
            shell.appendChild(catWrap);
            shell.appendChild(searchWrap);
            shell.appendChild(body);
            shell.appendChild(tabs);
            mount.innerHTML = '';
            mount.appendChild(shell);
            mount.hidden = false;
            if (tab !== 'emoji') _waPickerEmojiCat = 'all';
            renderWaPickerBody(tab, '', body, catWrap);
            search.addEventListener('input', function() { renderWaPickerBody(tab, search.value || '', body, catWrap); });
            var eb = document.getElementById('waEmojiBtn');
            if (eb) eb.setAttribute('aria-expanded', tab === 'emoji' ? 'true' : 'false');
            setTimeout(function() { try { search.focus(); } catch (_) {} }, 0);
        }
        async function sendWaGifFromPicker(url) {
            if (!currentConvId || !url) return;
            closeWaPickers();
            const media = { url: url, filename: 'gif.gif', mimetype: 'image/gif' };
            const res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: '', media: media }) });
            if (res.needLogin) return;
            if (res.ok) loadMessages(currentConvId);
            else {
                    var sendErr = (res.data && res.data.error) || res.error || (typeof getApiError === 'function' ? getApiError(res) : null);
                    toast(sendErr || (LANG === 'tr' ? 'Gönderilemedi' : LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
                }
        }
        function toggleWaEmojiPanel(ev) {
            if (ev) ev.stopPropagation();
            openWaUnifiedPicker('emoji');
        }
        function toggleWaStickerPanel(ev) {
            if (ev) ev.stopPropagation();
            openWaUnifiedPicker('sticker');
        }
        function waConvGifAttach(ev) {
            if (ev) ev.stopPropagation();
            openWaUnifiedPicker('gif');
        }
        function waConvVoiceCall() {
            waConvStartCall('voice');
        }
        function waConvVideoCall() {
            waConvStartCall('video');
        }
        function waAttachStartCall(ev, callType) {
            if (ev) { ev.preventDefault(); ev.stopPropagation(); }
            var menu = document.getElementById('waAttachMenu');
            if (menu) menu.hidden = true;
            var btn = document.getElementById('waAttachMenuBtn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            waConvStartCall(callType);
        }
        var _waCallsGatewayEnabled = null;
        function updateWaCallButtonsState() {
            var voiceBtn = document.getElementById('waChatVoiceBtn');
            var videoBtn = document.getElementById('waChatVideoBtn');
            var attachVoice = document.getElementById('waAttachVoiceCallBtn');
            var attachVideo = document.getElementById('waAttachVideoCallBtn');
            var btns = [voiceBtn, videoBtn, attachVoice, attachVideo].filter(Boolean);
            if (!btns.length) return;
            function apply(enabled, titleOff) {
                btns.forEach(function(b) {
                    b.disabled = !enabled;
                    b.classList.toggle('is-disabled', !enabled);
                    if (!enabled && titleOff) b.setAttribute('title', titleOff);
                });
            }
            if (_waCallsGatewayEnabled === false) {
                var offTitle = typeof t === 'function' ? t('wa_calls_gateway_required') : '';
                if (!offTitle || offTitle === 'wa_calls_gateway_required') {
                    offTitle = LANG === 'fa'
                        ? 'تماس واتساپ فقط با Gateway فعال است'
                        : 'WhatsApp calls require Gateway connection';
                }
                apply(false, offTitle);
                return;
            }
            apply(true);
            apiFetch('/api/whatsapp/connection').then(function(res) {
                if (!res.ok || !res.data) return;
                _waCallsGatewayEnabled = res.data.gatewayEnabled !== false;
                var mode = res.data.connectionMode || 'cloud_first';
                var gwOk = _waCallsGatewayEnabled && mode !== 'cloud';
                if (!gwOk) _waCallsGatewayEnabled = false;
                updateWaCallButtonsState();
            }).catch(function() {});
        }
        async function waConvStartCall(callType) {
            if (!currentConvId) return;
            var btnId = callType === 'video' ? 'waChatVideoBtn' : 'waChatVoiceBtn';
            var btn = document.getElementById(btnId);
            if (btn) btn.disabled = true;
            try {
                var res = await apiFetch('/api/conversations/' + currentConvId + '/call', { method: 'POST', body: JSON.stringify({ type: callType }) });
                if (res.needLogin) return;
                if (!res.ok) {
                    var errMsg = (res.data && res.data.error) || (typeof t === 'function' ? t('err_generic') : 'Error');
                    if (typeof toast === 'function') toast(errMsg, true);
                    return;
                }
                var data = res.data || {};
                var isGrp = !!(data.isGroup || currentConvIsGroup);
                if (data.method === 'link' && data.callLink) {
                    try { window.open(data.callLink, '_blank', 'noopener,noreferrer'); } catch (_) {}
                    var linkMsg = typeof t === 'function' ? (isGrp ? t('wa_call_group_link_sent') : t('wa_call_link_sent')) : '';
                    if (!linkMsg || linkMsg === 'wa_call_group_link_sent' || linkMsg === 'wa_call_link_sent') {
                        linkMsg = isGrp
                            ? (LANG === 'fa' ? 'لینک تماس گروهی در چت ارسال شد. پنجره تماس باز شد (تا ۱۰ نفر).' : LANG === 'tr' ? 'Grup arama bağlantısı gönderildi.' : 'Group call link sent to the chat.')
                            : (LANG === 'fa' ? 'لینک تماس برای مشتری ارسال شد. پنجره تماس باز شد.' : LANG === 'tr' ? 'Arama bağlantısı müşteriye gönderildi.' : 'Call link sent to customer.');
                    }
                    if (typeof toast === 'function') toast(linkMsg, false);
                } else {
                    var startMsg = typeof t === 'function' ? (isGrp ? t('wa_call_group_started') : t('wa_call_started')) : '';
                    if (!startMsg || startMsg === 'wa_call_group_started' || startMsg === 'wa_call_started') {
                        startMsg = isGrp
                            ? (LANG === 'fa' ? 'تماس گروهی در حال برقراری است. در واتساپ وب تا ۱۰ نفر می‌توانند بپیوندند.' : LANG === 'tr' ? 'Grup araması başlatılıyor.' : 'Group call is being placed (up to 10 participants on WhatsApp Pro).')
                            : (LANG === 'fa' ? 'تماس در حال برقراری است. در صورت نیاز در واتساپ وب پاسخ دهید.' : LANG === 'tr' ? 'Arama başlatılıyor.' : 'Call is being placed. Answer in WhatsApp Web if prompted.');
                    }
                    if (typeof toast === 'function') toast(startMsg, false);
                }
                if (data.introText && typeof toast === 'function') {
                    var introToast = typeof t === 'function' ? t('wa_call_intro_sent') : '';
                    if (!introToast || introToast === 'wa_call_intro_sent') {
                        introToast = LANG === 'fa' ? 'معرفی تماس برای مشتری ارسال شد.' : 'Call introduction sent to customer.';
                    }
                    toast(introToast, false);
                }
                if (typeof loadMessages === 'function' && currentConvId) loadMessages(currentConvId);
            } catch (e) {
                if (typeof toast === 'function') toast((typeof t === 'function' ? t('err_generic') : 'Error'), true);
            } finally {
                if (btn) btn.disabled = false;
            }
        }

        function clearFilePreview() {
            const bar = document.getElementById('chatFilePreview');
            const thumb = document.getElementById('chatFilePreviewThumb');
            const nameEl = document.getElementById('chatFilePreviewName');
            const sizeEl = document.getElementById('chatFilePreviewSize');
            if (bar) bar.style.display = 'none';
            if (thumb) thumb.innerHTML = '';
            if (nameEl) nameEl.textContent = '';
            if (sizeEl) sizeEl.textContent = '';
            const fi = document.getElementById('msgFileInput');
            if (fi) fi.value = '';
            const sendWrap = document.querySelector('#pageConversations .chat-send');
            if (sendWrap) sendWrap.classList.remove('chat-send--has-attachment');
            const attachBtn = document.getElementById('waAttachMenuBtn');
            if (attachBtn) attachBtn.classList.remove('chat-attach-has-file');
            updateWaComposerState();
        }

        function showFilePreview(file) {
            if (!file) { clearFilePreview(); return; }
            const bar = document.getElementById('chatFilePreview');
            const thumb = document.getElementById('chatFilePreviewThumb');
            const nameEl = document.getElementById('chatFilePreviewName');
            const sizeEl = document.getElementById('chatFilePreviewSize');
            if (!bar) return;

            const badgeEl = bar.querySelector('.chat-file-preview-badge');
            if (badgeEl && typeof t === 'function') badgeEl.textContent = t('chat_attachment_ready');

            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) {
                const sz = file.size;
                const sizeStr = sz < 1024 ? sz + ' B' : sz < 1024*1024 ? (sz/1024).toFixed(1) + ' KB' : (sz/(1024*1024)).toFixed(1) + ' MB';
                sizeEl.textContent = sizeStr;
            }
            if (thumb) {
                thumb.innerHTML = '';
                const mime = file.type || '';
                if (mime.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.alt = file.name;
                    const reader = new FileReader();
                    reader.onload = function(e) { img.src = e.target.result; };
                    reader.readAsDataURL(file);
                    thumb.appendChild(img);
                } else if (mime.startsWith('video/')) {
                    const vid = document.createElement('video');
                    vid.muted = true;
                    const reader2 = new FileReader();
                    reader2.onload = function(e) { vid.src = e.target.result; };
                    reader2.readAsDataURL(file);
                    thumb.appendChild(vid);
                } else {
                    const iconMap = { 'application/pdf': '📄', 'audio/': '🎵', 'text/': '📝', 'application/zip': '🗜️', 'application/x-rar': '🗜️', 'application/msword': '📝', 'application/vnd.openxmlformats': '📝', 'application/vnd.ms-excel': '📊' };
                    let icon = '📎';
                    for (const k in iconMap) { if (mime.startsWith(k)) { icon = iconMap[k]; break; } }
                    const span = document.createElement('span');
                    span.className = 'file-icon';
                    span.textContent = icon;
                    thumb.appendChild(span);
                }
            }
            bar.style.display = 'block';
            const sendWrap = document.querySelector('#pageConversations .chat-send');
            if (sendWrap) sendWrap.classList.add('chat-send--has-attachment');
            const attachBtn = document.getElementById('waAttachMenuBtn');
            if (attachBtn) attachBtn.classList.add('chat-attach-has-file');
            updateWaComposerState();
            try {
                bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (_) {}
        }

        function updateWaComposerState() {
            const input = document.getElementById('msgInput');
            const fileInput = document.getElementById('msgFileInput');
            const row = document.querySelector('#pageConversations .wa-compose-row');
            const sendBtn = document.querySelector('#pageConversations .wa-send-circle');
            const voiceBtn = document.getElementById('msgVoiceBtn');
            if (!row || !sendBtn || !voiceBtn) return;
            const hasText = !!(input && (input.value || '').trim().length > 0);
            const hasFile = !!(fileInput && fileInput.files && fileInput.files[0]);
            const hasContent = hasText || hasFile;
            const isRecording = !!(voiceRecorderState && voiceRecorderState.active);
            const showSend = hasContent && !isRecording;
            row.classList.toggle('wa-has-content', showSend);
            sendBtn.setAttribute('aria-hidden', showSend ? 'false' : 'true');
            voiceBtn.setAttribute('aria-hidden', showSend ? 'true' : 'false');
        }

        var _convSendInFlight = false;
        async function sendMsg() {
            const input = document.getElementById('msgInput');
            const fileInput = document.getElementById('msgFileInput');
            const content = (input.value || '').trim();
            const file = fileInput && fileInput.files && fileInput.files[0];
            if ((!content && !file) || !currentConvId || _convSendInFlight) return;
            _convSendInFlight = true;
            try {
                let media = null;
                if (file) {
                    const fd = new FormData();
                    fd.append('file', file);
                    const uploadRes = await fetch(API + '/api/upload', { method: 'POST', credentials: 'include', body: fd });
                    const uploadData = await uploadRes.json().catch(function() { return {}; });
                    if (!uploadRes.ok || !uploadData.url) { toast((uploadData.error || (LANG === 'en' ? 'Upload failed' : 'خطا در آپلود')), true); return; }
                    media = { url: uploadData.url, filename: uploadData.name || file.name, mimetype: file.type };
                    fileInput.value = '';
                    clearFilePreview();
                }
                input.value = '';
                const body = { content: content || '', media: media };
                if (window._replyingTo && window._replyingTo.whatsappId) { body.replyTo = window._replyingTo.whatsappId; cancelReply(); }
                const res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify(body) });
                if (res.needLogin) return;
                if (res.ok) {
                    const liveId = res.data && res.data.conversationId;
                    if (liveId && liveId !== currentConvId && typeof openChat === 'function') {
                        const item = document.querySelector('.conv-list-item.active');
                        const name = (item && item.getAttribute('data-name')) || '';
                        const phone = (item && item.getAttribute('data-phone')) || '';
                        const pic = (item && item.getAttribute('data-profile-pic')) || '';
                        const ig = item && item.getAttribute('data-is-group') === '1';
                        currentConvId = liveId;
                        openChat(liveId, name, phone, pic, ig);
                    } else {
                        loadMessages(currentConvId);
                    }
                    if (typeof loadConversations === 'function') loadConversations();
                } else {
                    var sendErr = (res.data && res.data.error) || res.error || (typeof getApiError === 'function' ? getApiError(res) : null);
                    toast(sendErr || (LANG === 'tr' ? 'Gönderilemedi' : LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
                }
            } finally {
                _convSendInFlight = false;
                updateWaComposerState();
            }
        }

        const voiceRecorderState = {
            active: false,
            starting: false,
            recorder: null,
            chunks: [],
            stream: null,
            paused: false,
            shouldSend: false,
            timerId: null,
            startAt: 0,
            elapsedBeforePauseMs: 0,
            supportsRecorderPause: false,
            voiceMeterRaf: null,
            audioContext: null,
            analyser: null,
            voiceSourceNode: null
        };
        var VOICE_MIN_MS = 450;
        function pickVoiceMimeType() {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
            return '';
        }
        function safeStopMediaRecorder(rec) {
            if (!rec || typeof rec.stop !== 'function') return;
            try {
                if (rec.state === 'inactive') return;
                if (typeof rec.requestData === 'function') rec.requestData();
                rec.stop();
            } catch (_) {
                try { if (rec.state !== 'inactive') rec.stop(); } catch (_2) {}
            }
        }
        function setVoiceBarBusy(busy) {
            ['chatVoiceSendBtn', 'chatVoiceDeleteBtn', 'chatVoicePauseBtn'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) {
                    el.disabled = !!busy;
                    el.setAttribute('aria-busy', busy ? 'true' : 'false');
                }
            });
        }
        function stopVoiceMeterAnimation() {
            if (voiceRecorderState.voiceMeterRaf) {
                cancelAnimationFrame(voiceRecorderState.voiceMeterRaf);
                voiceRecorderState.voiceMeterRaf = null;
            }
            try {
                if (voiceRecorderState.voiceSourceNode) {
                    voiceRecorderState.voiceSourceNode.disconnect();
                    voiceRecorderState.voiceSourceNode = null;
                }
                if (voiceRecorderState.audioContext && voiceRecorderState.audioContext.state !== 'closed') {
                    voiceRecorderState.audioContext.close();
                }
            } catch (_) {}
            voiceRecorderState.audioContext = null;
            voiceRecorderState.analyser = null;
            var wave = document.getElementById('chatVoiceWave');
            if (wave) {
                wave.classList.remove('chat-voice-wave--meter');
                wave.querySelectorAll('span').forEach(function(el) {
                    el.style.height = '';
                    el.style.opacity = '';
                });
            }
        }
        function startVoiceMeter(stream) {
            stopVoiceMeterAnimation();
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            try {
                var ctx = new AC();
                voiceRecorderState.audioContext = ctx;
                if (ctx.state === 'suspended') ctx.resume().catch(function() {});
                var src = ctx.createMediaStreamSource(stream);
                voiceRecorderState.voiceSourceNode = src;
                var an = ctx.createAnalyser();
                an.fftSize = 256;
                an.smoothingTimeConstant = 0.62;
                src.connect(an);
                voiceRecorderState.analyser = an;
                var waveEl = document.getElementById('chatVoiceWave');
                if (waveEl) waveEl.classList.add('chat-voice-wave--meter');
                var freq = new Uint8Array(an.frequencyBinCount);
                function tick() {
                    if (!voiceRecorderState.active) return;
                    voiceRecorderState.voiceMeterRaf = requestAnimationFrame(tick);
                    if (voiceRecorderState.paused) return;
                    an.getByteFrequencyData(freq);
                    var sum = 0;
                    for (var i = 0; i < 20; i++) sum += freq[i];
                    var level = Math.min(1, (sum / (20 * 255)) * 2);
                    var spans = waveEl && waveEl.querySelectorAll('span');
                    if (!spans || !spans.length) return;
                    var now = performance.now() / 180;
                    for (var j = 0; j < spans.length; j++) {
                        var w = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(now + j * 0.52));
                        var h = 3 + level * 18 * w;
                        h = Math.max(3, Math.min(22, h));
                        spans[j].style.height = h + 'px';
                        spans[j].style.opacity = String(0.32 + level * 0.65);
                    }
                }
                voiceRecorderState.voiceMeterRaf = requestAnimationFrame(tick);
            } catch (_) {
                stopVoiceMeterAnimation();
            }
        }
        function syncVoiceHintI18n() {
            var hint = document.getElementById('chatVoiceHint');
            if (hint && typeof t === 'function') hint.textContent = t('voice_recording_status') || '';
        }
        function formatVoiceDuration(ms) {
            const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
            const mm = Math.floor(totalSec / 60);
            const ss = totalSec % 60;
            return mm + ':' + String(ss).padStart(2, '0');
        }
        function getVoiceElapsedMs() {
            if (!voiceRecorderState.active) return voiceRecorderState.elapsedBeforePauseMs || 0;
            if (voiceRecorderState.paused) return voiceRecorderState.elapsedBeforePauseMs || 0;
            return (voiceRecorderState.elapsedBeforePauseMs || 0) + Math.max(0, Date.now() - (voiceRecorderState.startAt || Date.now()));
        }
        function updateVoiceTimerUI() {
            const timeEl = document.getElementById('chatVoiceRecTime');
            if (timeEl) timeEl.textContent = formatVoiceDuration(getVoiceElapsedMs());
        }
        function startVoiceTimer() {
            stopVoiceTimer();
            updateVoiceTimerUI();
            voiceRecorderState.timerId = setInterval(updateVoiceTimerUI, 250);
        }
        function stopVoiceTimer() {
            if (!voiceRecorderState.timerId) return;
            clearInterval(voiceRecorderState.timerId);
            voiceRecorderState.timerId = null;
        }
        function stopVoiceStreamTracks() {
            if (voiceRecorderState.stream) {
                try { voiceRecorderState.stream.getTracks().forEach(function(tk) { tk.stop(); }); } catch (_) {}
            }
            voiceRecorderState.stream = null;
        }
        function resetVoiceRecordState() {
            stopVoiceTimer();
            stopVoiceMeterAnimation();
            stopVoiceStreamTracks();
            voiceRecorderState.active = false;
            voiceRecorderState.starting = false;
            voiceRecorderState.paused = false;
            voiceRecorderState.shouldSend = false;
            voiceRecorderState.recorder = null;
            voiceRecorderState.chunks = [];
            voiceRecorderState.startAt = 0;
            voiceRecorderState.elapsedBeforePauseMs = 0;
            voiceRecorderState.supportsRecorderPause = false;
            setVoiceBarBusy(false);
            updateVoiceTimerUI();
        }
        function updateVoiceBtn() {
            const btn = document.getElementById('msgVoiceBtn');
            const bar = document.getElementById('chatVoiceRecordingBar');
            const sendWrap = document.querySelector('#pageConversations .chat-send');
            const pauseBtn = document.getElementById('chatVoicePauseBtn');
            const pauseIcon = pauseBtn && pauseBtn.querySelector('.icon-pause');
            const playIcon = pauseBtn && pauseBtn.querySelector('.icon-play');
            if (bar) {
                bar.style.display = voiceRecorderState.active ? 'flex' : 'none';
                bar.hidden = !voiceRecorderState.active;
                bar.classList.toggle('is-paused', !!voiceRecorderState.paused);
            }
            if (sendWrap) sendWrap.classList.toggle('chat-send-recording', !!voiceRecorderState.active);
            if (pauseBtn) {
                var showPause = !!(voiceRecorderState.active && voiceRecorderState.supportsRecorderPause);
                pauseBtn.style.display = showPause ? '' : 'none';
                pauseBtn.setAttribute('aria-hidden', showPause ? 'false' : 'true');
            }
            if (pauseBtn) pauseBtn.setAttribute('aria-label', voiceRecorderState.paused ? (LANG === 'fa' ? 'ادامه' : 'Resume') : (LANG === 'fa' ? 'مکث' : 'Pause'));
            if (pauseBtn) pauseBtn.setAttribute('title', pauseBtn.getAttribute('aria-label'));
            if (pauseIcon) pauseIcon.style.display = voiceRecorderState.paused ? 'none' : '';
            if (playIcon) playIcon.style.display = voiceRecorderState.paused ? '' : 'none';
            if (!btn) return;
            btn.classList.toggle('recording', voiceRecorderState.active);
            btn.setAttribute('title', voiceRecorderState.active ? (t('voice_use_bar_hint') || (LANG === 'fa' ? 'از نوار ضبط ارسال یا حذف' : 'Use the bar to send or discard')) : (t('voice_record') || (LANG === 'fa' ? 'ضبط پیام صوتی' : 'Voice message')));
            btn.setAttribute('aria-label', btn.getAttribute('title'));
            if (voiceRecorderState.active) syncVoiceHintI18n();
            updateWaComposerState();
        }
        function cancelVoiceRecord() {
            if (!voiceRecorderState.active || !voiceRecorderState.recorder) return;
            voiceRecorderState.shouldSend = false;
            setVoiceBarBusy(true);
            safeStopMediaRecorder(voiceRecorderState.recorder);
        }
        function finalizeVoiceRecordAndSend() {
            if (!voiceRecorderState.active || !voiceRecorderState.recorder) return;
            var elapsed = getVoiceElapsedMs();
            if (elapsed < VOICE_MIN_MS) {
                toast(t('voice_too_short') || (LANG === 'fa' ? 'صدا خیلی کوتاه بود' : 'Recording too short'), true);
                return;
            }
            if (voiceRecorderState.paused) {
                try { voiceRecorderState.recorder.resume(); } catch (_) {}
                voiceRecorderState.paused = false;
            }
            voiceRecorderState.shouldSend = true;
            setVoiceBarBusy(true);
            safeStopMediaRecorder(voiceRecorderState.recorder);
        }
        function toggleVoicePause() {
            if (!voiceRecorderState.active || !voiceRecorderState.recorder) return;
            if (!voiceRecorderState.supportsRecorderPause) {
                toast(t('voice_pause_unsupported') || (LANG === 'fa' ? 'مکث در این مرورگر نیست' : 'Pause not supported'), true);
                return;
            }
            if (voiceRecorderState.paused) {
                try { voiceRecorderState.recorder.resume(); } catch (_) {}
                voiceRecorderState.paused = false;
                voiceRecorderState.startAt = Date.now();
                if (voiceRecorderState.audioContext && voiceRecorderState.audioContext.state === 'suspended') {
                    voiceRecorderState.audioContext.resume().catch(function() {});
                }
                startVoiceTimer();
            } else {
                try { voiceRecorderState.recorder.pause(); } catch (_) {}
                voiceRecorderState.elapsedBeforePauseMs = getVoiceElapsedMs();
                voiceRecorderState.paused = true;
                stopVoiceTimer();
            }
            updateVoiceBtn();
        }
        function startVoiceRecord() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast(t('voice_no_support') || (LANG === 'fa' ? 'ضبط صدا در این مرورگر پشتیبانی نمی‌شود' : 'Voice recording not supported'), true);
                return;
            }
            if (voiceRecorderState.active || voiceRecorderState.starting) return;
            voiceRecorderState.starting = true;
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                var mime = pickVoiceMimeType();
                var recorder;
                try {
                    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
                } catch (e) {
                    try {
                        recorder = new MediaRecorder(stream);
                    } catch (e2) {
                        voiceRecorderState.starting = false;
                        try { stream.getTracks().forEach(function(tk) { tk.stop(); }); } catch (_) {}
                        toast(t('voice_no_support') || (LANG === 'fa' ? 'ضبط صدا پشتیبانی نمی‌شود' : 'Recording not supported'), true);
                        return;
                    }
                }
                voiceRecorderState.chunks = [];
                voiceRecorderState.stream = stream;
                voiceRecorderState.paused = false;
                voiceRecorderState.shouldSend = false;
                voiceRecorderState.elapsedBeforePauseMs = 0;
                voiceRecorderState.startAt = Date.now();
                voiceRecorderState.supportsRecorderPause = typeof recorder.pause === 'function';
                recorder.ondataavailable = function(e) { if (e.data && e.data.size) voiceRecorderState.chunks.push(e.data); };
                recorder.onstop = function() {
                    var shouldSend = !!voiceRecorderState.shouldSend;
                    var durationMs = getVoiceElapsedMs();
                    var chunks = voiceRecorderState.chunks.slice();
                    var mimeType = (recorder.mimeType || '').split(';')[0].trim() || 'audio/webm';
                    resetVoiceRecordState();
                    updateVoiceBtn();
                    if (!shouldSend) return;
                    var blob = new Blob(chunks, { type: mimeType });
                    if (blob.size < 256) {
                        toast(t('voice_too_short') || (LANG === 'fa' ? 'صدا خیلی کوتاه بود' : 'Recording too short'), true);
                        return;
                    }
                    if (durationMs < VOICE_MIN_MS) {
                        toast(t('voice_too_short') || (LANG === 'fa' ? 'صدا خیلی کوتاه بود' : 'Recording too short'), true);
                        return;
                    }
                    sendVoiceMessage(blob);
                };
                try {
                    recorder.start(250);
                } catch (e3) {
                    voiceRecorderState.starting = false;
                    stopVoiceStreamTracks();
                    toast(t('voice_err_open') || (LANG === 'fa' ? 'ضبط شروع نشد' : 'Could not start recording'), true);
                    return;
                }
                voiceRecorderState.recorder = recorder;
                voiceRecorderState.active = true;
                voiceRecorderState.starting = false;
                startVoiceTimer();
                updateVoiceTimerUI();
                startVoiceMeter(stream);
                updateVoiceBtn();
                syncVoiceHintI18n();
            }).catch(function(err) {
                voiceRecorderState.starting = false;
                var name = err && err.name;
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    toast(t('voice_no_permission') || (LANG === 'fa' ? 'دسترسی به میکروفون داده نشد' : 'Microphone access denied'), true);
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                    toast(t('voice_no_mic') || (LANG === 'fa' ? 'میکروفونی پیدا نشد' : 'No microphone'), true);
                } else {
                    toast(t('voice_err_open') || (LANG === 'fa' ? 'میکروفون باز نشد' : 'Could not open microphone'), true);
                }
            });
        }
        function toggleVoiceRecord() {
            if (!currentConvId) { toast(LANG === 'fa' ? 'ابتدا یک مکالمه باز کنید' : 'Open a conversation first', true); return; }
            if (voiceRecorderState.active) {
                toast(t('voice_use_bar_hint') || (LANG === 'fa' ? 'از نوار ضبط ارسال یا حذف را بزنید' : 'Use the recording bar to send or discard'), false);
                return;
            }
            startVoiceRecord();
        }
        async function sendVoiceMessage(blob) {
            if (!currentConvId || !blob || blob.size === 0 || _convSendInFlight) return;
            _convSendInFlight = true;
            try {
                const fd = new FormData();
                const rawType = blob.type || '';
                const baseMime = rawType.split(';')[0].trim() || 'audio/webm';
                const ext = baseMime.indexOf('ogg') >= 0 ? '.ogg' : (baseMime.indexOf('mp4') >= 0 || baseMime.indexOf('aac') >= 0) ? '.m4a' : '.webm';
                // Create new blob with clean MIME type so server accepts it
                const cleanBlob = new Blob([blob], { type: baseMime });
                fd.append('file', cleanBlob, 'voice' + ext);
                const uploadRes = await fetch(API + '/api/upload', { method: 'POST', credentials: 'include', body: fd });
                const uploadData = await uploadRes.json().catch(function() { return {}; });
                if (!uploadRes.ok || !uploadData.url) {
                    toast((uploadData.error || (LANG === 'en' ? 'Upload failed' : 'خطا در آپلود')), true);
                    return;
                }
                const media = {
                    url: uploadData.url,
                    filename: uploadData.name || 'voice' + ext,
                    mimetype: baseMime,
                    type: 'audio',
                    sendAsVoice: true,
                };
                const res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: '', media: media }) });
                if (res.needLogin) return;
                if (res.ok) loadMessages(currentConvId);
                else {
                    var sendErr = (res.data && res.data.error) || res.error || (typeof getApiError === 'function' ? getApiError(res) : null);
                    toast(sendErr || (LANG === 'tr' ? 'Gönderilemedi' : LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
                }
            } finally {
                _convSendInFlight = false;
            }
        }

        function sortCustomerList(arr, sortBy) {
            if (!arr || !arr.length) return arr;
            const key = sortBy || 'newest';
            return arr.slice().sort(function(a, b) {
                if (key === 'newest' || key === 'last_contact') {
                    var ta = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
                    var tb = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
                    return tb - ta;
                }
                if (key === 'oldest') {
                    var ta = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
                    var tb = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
                    return ta - tb;
                }
                if (key === 'name') {
                    const na = (a.name || a.phone || '').toLowerCase();
                    const nb = (b.name || b.phone || '').toLowerCase();
                    return na.localeCompare(nb, 'fa');
                }
                return 0;
            });
        }
        window._custListRateLimitedUntil = window._custListRateLimitedUntil || 0;
        function renderCustomerRateLimitState(list) {
            if (!list) return;
            list.innerHTML = '<div class="empty customer-empty-state"><span class="empty-icon">&#128101;</span><p>' + escapeHtml(LANG === 'fa' ? 'تعداد درخواست‌ها زیاد است. چند دقیقه صبر کنید.' : 'Too many requests. Please wait a few minutes.') + '</p><button type="button" class="btn-primary" id="customerRetryBtn">' + escapeHtml(LANG === 'fa' ? 'تلاش مجدد' : 'Retry') + '</button></div>';
        }
        async function loadCustomers() {
            const list = document.getElementById('customerList');
            const statsEl = document.getElementById('customerStats');
            const countEl = document.getElementById('customerListCount');
            if (!list) return;
            if (Date.now() < (window._custListRateLimitedUntil || 0)) {
                renderCustomerRateLimitState(list);
                return;
            }
            setLoading('customerList', 5);
            let q = '?limit=200';
            const searchEl = document.getElementById('customerSearch');
            const statusEl = document.getElementById('customerFilterStatus');
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value);
            if (customerQuickTab === 'archive') q += '&restrictedOnly=true';
            const res = await apiFetch('/api/customers' + q);
            if (res.needLogin) { list.innerHTML = '<div class="empty"><span class="empty-icon">&#128101;</span><p>' + (LANG === 'fa' ? 'لطفاً دوباره وارد شوید' : 'Please log in again') + '</p></div>'; return; }
            if (!res.ok) {
                const is429 = res.status === 429 || (res.error && String(res.error).indexOf('تعداد درخواست') !== -1) || (res.data && res.data.error && String(res.data.error).indexOf('تعداد درخواست') !== -1);
                if (is429) window._custListRateLimitedUntil = Date.now() + 45000;
                else window._custListRateLimitedUntil = 0;
                list.innerHTML = '<div class="empty customer-empty-state"><span class="empty-icon">&#128101;</span><p>' + (res.data && res.data.error ? escapeHtml(res.data.error) : (LANG === 'fa' ? 'خطا در بارگذاری' : 'Load failed')) + '</p><button type="button" class="btn-primary" id="customerRetryBtn">' + (LANG === 'fa' ? 'تلاش مجدد' : 'Retry') + '</button></div>';
                return;
            }
            window._custListRateLimitedUntil = 0;
            const data = res.data;
            if (statsEl && data.stats) { statsEl.style.display = 'flex'; statsEl.innerHTML = '<span class="customer-stat"><strong>' + data.stats.total + '</strong> ' + (LANG === 'fa' ? 'مشتری' : 'customers') + '</span><span class="customer-stat"><strong>' + data.stats.active + '</strong> ' + (LANG === 'fa' ? 'فعال' : 'active') + '</span><span class="customer-stat"><strong>' + data.stats.inactive + '</strong> ' + (LANG === 'fa' ? 'غیرفعال' : 'inactive') + '</span><span class="customer-stat"><strong>' + data.stats.blocked + '</strong> ' + (LANG === 'fa' ? 'مسدود' : 'blocked') + '</span>'; }
            if (countEl) countEl.textContent = (data.total || 0) + ' ' + (LANG === 'fa' ? 'مشتری' : '');
            if (!data.data || data.data.length === 0) {
                window._currentCustomerListData = [];
                const emptyMsg = customerQuickTab === 'archive'
                    ? (t('empty_customers_archive') || (LANG === 'fa' ? 'مشتری قفل‌شده‌ای از شماره قبلی نیست.' : 'No locked customers from a previous number.'))
                    : t('empty_customers');
                const emptyBtn = customerQuickTab === 'archive'
                    ? ''
                    : '<button type="button" class="btn-primary" id="emptyCustomerAddBtn">' + escapeHtml(t('customer_add')) + '</button>';
                list.innerHTML = '<div class="empty customer-empty-state"><span class="empty-icon">&#128100;</span><p>' + escapeHtml(emptyMsg) + '</p>' + emptyBtn + '</div>';
                updateBulkSelectedCount();
                return;
            }
            const sortEl = document.getElementById('customerSort');
            const sortVal = sortEl ? sortEl.value : 'newest';
            const sorted = sortCustomerList(data.data, sortVal);
            window._currentCustomerListData = sorted;
            const bulkIds = (window._bulkSelectedIds || []).map(String);
            list.innerHTML = sorted.map(function(c) {
                const name = customerUiName(c);
                const initial = (name && name[0]) ? name[0].toUpperCase() : '?';
                const rawPicCust = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
                const picSrcCust = customerAvatarDisplaySrc(c);
                const hasCustPic = customerAvatarShowsImage(c) && picSrcCust;
                const avStyle = hasCustPic ? '' : (' style="' + letterAvatarVars(name) + '"');
                const avClass = 'customer-card-avatar' + (hasCustPic ? '' : ' customer-card-avatar--letter');
                const avatarInner = hasCustPic
                    ? '<span class="customer-card-avatar-fallback">' + escapeHtml(initial) + '</span><img class="customer-card-avatar-img" src="' + escapeHtml(picSrcCust) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)" onload="crmAvatarImgLoaded(this)">'
                    : '<span class="customer-card-avatar-letter">' + escapeHtml(initial) + '</span>';
                const avatarHtml = '<div class="' + avClass + '"' + avStyle + '>' + avatarInner + '</div>';
                const statusClass = (c.status === 'blocked' ? 'blocked' : c.status === 'inactive' ? 'inactive' : 'active');
                const statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
                const lastContact = c.lastContactAt ? timeAgo(c.lastContactAt) : '—';
                const loc = c.lastOpenConv;
                const assigneeDept = loc && (loc.assignee || (loc.department && loc.department.name)) ? [loc.assignee && loc.assignee.name, loc.department && loc.department.name].filter(Boolean).join(' · ') : '';
                const safeName = (name || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                const checked = bulkIds.indexOf(String(c.id)) >= 0 ? ' checked' : '';
                const phoneShown = customerUiPhone(c);
                const restrictedBadge = c.isRestrictedFromStaff
                    ? '<span class="badge customer-badge-restricted">' + escapeHtml(t('customer_restricted_badge') || (LANG === 'fa' ? 'آرشیو شماره قبلی' : 'Previous number')) + '</span>'
                    : '';
                return '<div class="customer-card' + (c.isRestrictedFromStaff ? ' customer-card--restricted' : '') + '" data-customer-id="' + c.id + '" data-customer-name="' + escapeHtml(name) + '" data-customer-phone="' + escapeHtml(phoneShown) + '" role="button" tabindex="0"><input type="checkbox" class="bulk-customer-check" data-customer-id="' + c.id + '"' + checked + '><div class="customer-card-main">' + avatarHtml + '<div class="customer-card-body"><span class="customer-card-name">' + escapeHtml(name) + restrictedBadge + '</span><div class="customer-card-meta">' + escapeHtml(phoneShown) + (c.email ? (phoneShown ? ' · ' : '') + escapeHtml(c.email) : '') + '</div><div class="customer-card-meta">' + lastContact + ' · ' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + (assigneeDept ? ' · ' + escapeHtml(assigneeDept) : '') + '</div></div><span class="badge ' + statusClass + '">' + statusLabel + '</span></div><button type="button" class="btn-primary customer-send-btn" data-customer-id="' + c.id + '" data-customer-name="' + escapeHtml(name) + '" data-customer-phone="' + escapeHtml(phoneShown) + '">' + escapeHtml(t('btn_send') || 'Send') + '</button></div>';
            }).join('');
            updateBulkSelectedCount();
        }
        async function startCustomerChat(customerId, name, phone) {
            const res = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ customerId: customerId }) });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            const conv = res.data;
            const pic = (conv.customer && conv.customer.profilePic) || '';
            showPage('conversations');
            setTimeout(function() { openChat(conv.id, name || (conv.customer && conv.customer.name) || phone, phone || '', pic); loadConversations(); }, 100);
        }

        function applyCustomerFilters() { loadCustomers(); }
        function initCustomerFilters() {
            if (window._customerFiltersInited) return;
            window._customerFiltersInited = true;
            const searchEl = document.getElementById('customerSearch');
            const clearBtn = document.getElementById('customerSearchClear');
            const statusEl = document.getElementById('customerFilterStatus');
            const sortEl = document.getElementById('customerSort');
            try {
                const saved = localStorage.getItem('crm_customer_filters');
                if (saved) {
                    const o = JSON.parse(saved);
                    if (searchEl && o.search != null) searchEl.value = o.search;
                    if (statusEl && o.status != null) statusEl.value = o.status;
                    if (sortEl && o.sort != null) sortEl.value = o.sort;
                }
            } catch (_) {}
            function saveFilters() {
                try {
                    localStorage.setItem('crm_customer_filters', JSON.stringify({
                        search: searchEl ? searchEl.value : '',
                        status: statusEl ? statusEl.value : '',
                        sort: sortEl ? sortEl.value : 'newest'
                    }));
                } catch (_) {}
            }
            function updateClearBtn() {
                if (clearBtn) clearBtn.style.display = (searchEl && searchEl.value.trim()) ? 'flex' : 'none';
            }
            if (searchEl) {
                searchEl.addEventListener('input', function() {
                    clearTimeout(window._custSearchT);
                    window._custSearchT = setTimeout(function() { applyCustomerFilters(); saveFilters(); updateClearBtn(); }, 400);
                    updateClearBtn();
                });
                searchEl.addEventListener('keypress', function(e) { if (e.key === 'Enter') { applyCustomerFilters(); saveFilters(); } });
            }
            if (clearBtn) clearBtn.addEventListener('click', function() {
                if (searchEl) { searchEl.value = ''; searchEl.focus(); applyCustomerFilters(); saveFilters(); updateClearBtn(); }
            });
            if (statusEl) statusEl.addEventListener('change', function() { applyCustomerFilters(); saveFilters(); });
            if (sortEl) sortEl.addEventListener('change', function() { applyCustomerFilters(); saveFilters(); });
            const tabsWrap = document.getElementById('customerViewTabs');
            if (tabsWrap && !tabsWrap._custTabsBound) {
                tabsWrap._custTabsBound = true;
                tabsWrap.addEventListener('click', function(e) {
                    const btn = e.target && e.target.closest && e.target.closest('[data-cust-tab]');
                    if (!btn || !tabsWrap.contains(btn)) return;
                    e.preventDefault();
                    setCustomerQuickTab(btn.getAttribute('data-cust-tab'));
                });
            }
            if (typeof refreshCustomerAdminTabs === 'function') refreshCustomerAdminTabs();
            updateClearBtn();
        }

        window._bulkSelectedIds = window._bulkSelectedIds || [];
        window._bulkMaxRecipients = window._bulkMaxRecipients || 100;
        window._bulkSendInFlight = false;
        window._bulkActiveJobId = null;
        window._bulkJobPollTimer = null;

        function bulkId(value) { return String(value || ''); }
        function bulkFmt(key, fallback, vars) {
            var s = (typeof t === 'function' && t(key)) || fallback || key;
            if (vars) Object.keys(vars).forEach(function(k) { s = s.split('{' + k + '}').join(String(vars[k])); });
            return s;
        }
        function getBulkMaxRecipients() {
            var n = parseInt(window._bulkMaxRecipients, 10);
            return Number.isFinite(n) && n > 0 ? n : 100;
        }
        function syncBulkCheckboxes() {
            var selected = {};
            (window._bulkSelectedIds || []).forEach(function(id) { selected[bulkId(id)] = true; });
            document.querySelectorAll('.bulk-customer-check').forEach(function(cb) {
                cb.checked = !!selected[bulkId(cb.getAttribute('data-customer-id'))];
            });
        }
        function setBulkSubmitState() {
            var submitBtn = document.getElementById('bulkSendSubmitBtn');
            if (!submitBtn) return;
            var n = (window._bulkSelectedIds || []).length;
            var busy = !!window._bulkSendInFlight;
            submitBtn.disabled = busy || n === 0;
            submitBtn.textContent = busy
                ? bulkFmt('bulk_sending', LANG === 'fa' ? 'در حال ارسال...' : 'Sending...')
                : (typeof t === 'function' ? t('bulk_send_submit') : (LANG === 'fa' ? 'شروع ارسال' : 'Start sending'));
            submitBtn.title = n === 0 ? bulkFmt('bulk_err_select', LANG === 'fa' ? 'حداقل یک مشتری انتخاب کنید' : 'Select at least one customer') : '';
        }
        function toggleBulkSelect(el) {
            const id = bulkId(el && el.getAttribute('data-customer-id'));
            if (!id) return;
            const arr = window._bulkSelectedIds;
            const idx = arr.indexOf(id);
            if (idx >= 0) arr.splice(idx, 1);
            else {
                if (arr.length >= getBulkMaxRecipients()) {
                    toast(bulkFmt('bulk_selected_capped', '', { n: arr.length, max: getBulkMaxRecipients() }), true);
                    if (el) el.checked = false;
                    return;
                }
                arr.push(id);
            }
            updateBulkSelectedCount();
        }
        function updateBulkSelectedCount() {
            const n = (window._bulkSelectedIds || []).length;
            const el = document.getElementById('bulkSelectedCount');
            if (el) el.textContent = bulkFmt('bulk_selected_count', '{n}', { n: n });
            const bar = document.getElementById('customerBulkBar');
            const barCount = document.getElementById('customerBulkBarCount');
            if (bar) bar.style.display = n > 0 ? 'flex' : 'none';
            if (barCount) barCount.textContent = bulkFmt('bulk_selected_count', '{n}', { n: n });
            setBulkSubmitState();
        }
        function bulkSelectFiltered() {
            const data = window._currentCustomerListData || [];
            const max = getBulkMaxRecipients();
            const ids = [];
            const seen = {};
            data.forEach(function(c) {
                const id = bulkId(c && c.id);
                if (!id || seen[id] || ids.length >= max) return;
                seen[id] = true;
                ids.push(id);
            });
            window._bulkSelectedIds = ids;
            syncBulkCheckboxes();
            updateBulkSelectedCount();
            if (data.length > max) toast(bulkFmt('bulk_selected_capped', '', { n: ids.length, max: max }), false);
            else toast(bulkFmt('bulk_selected_count', '', { n: ids.length }));
        }
        function bulkClearSelection() {
            window._bulkSelectedIds = [];
            document.querySelectorAll('.bulk-customer-check').forEach(function(cb) { cb.checked = false; });
            updateBulkSelectedCount();
        }
        function syncBulkSendMode() {
            var useTpl = document.getElementById('bulkUseCloudTemplate');
            var templateOn = !!(useTpl && useTpl.checked);
            var tplFields = document.getElementById('bulkTemplateFields');
            var textFields = document.getElementById('bulkFreeTextFields');
            if (tplFields) tplFields.hidden = !templateOn;
            if (textFields) textFields.hidden = templateOn;
        }
        function resetBulkJobProgress() {
            var wrap = document.getElementById('bulkJobProgress');
            var fill = document.getElementById('bulkJobProgressFill');
            var text = document.getElementById('bulkJobProgressText');
            if (wrap) wrap.hidden = true;
            if (fill) fill.style.width = '0%';
            if (text) text.textContent = '';
        }
        function renderBulkJobProgress(job) {
            if (!job) return;
            var wrap = document.getElementById('bulkJobProgress');
            var fill = document.getElementById('bulkJobProgressFill');
            var text = document.getElementById('bulkJobProgressText');
            if (wrap) wrap.hidden = false;
            var total = job.total || 0;
            var done = (job.sent || 0) + (job.failed || 0);
            var pct = total ? Math.round((done / total) * 100) : 0;
            if (fill) fill.style.width = pct + '%';
            var line = bulkFmt('bulk_job_progress', '{sent}/{total} · {failed}', { sent: job.sent || 0, total: total, failed: job.failed || 0 });
            var skippedN = job.skipped && job.skipped.total ? job.skipped.total : 0;
            if (skippedN) line += ' · ' + bulkFmt('bulk_job_skipped', '{n}', { n: skippedN });
            if (text) text.textContent = line;
        }
        function stopBulkJobPoll() {
            if (window._bulkJobPollTimer) {
                clearInterval(window._bulkJobPollTimer);
                window._bulkJobPollTimer = null;
            }
        }
        function finishBulkJob(job) {
            stopBulkJobPoll();
            window._bulkSendInFlight = false;
            window._bulkActiveJobId = null;
            setBulkSubmitState();
            if (!job) return;
            renderBulkJobProgress(job);
            var msg = bulkFmt('bulk_job_done', '', { sent: job.sent || 0, failed: job.failed || 0 });
            var skippedN = job.skipped && job.skipped.total ? job.skipped.total : 0;
            if (skippedN) msg += ' ' + bulkFmt('bulk_job_skipped', '', { n: skippedN });
            toast(msg, job.status === 'error' || (job.failed || 0) > 0);
            if (typeof loadCustomers === 'function') loadCustomers();
        }
        function startBulkJobPoll(jobId) {
            stopBulkJobPoll();
            window._bulkActiveJobId = jobId;
            async function tick() {
                var res = await apiFetch('/api/bulk/status/' + encodeURIComponent(jobId));
                if (!res.ok || !res.data) return;
                renderBulkJobProgress(res.data);
                if (res.data.status === 'done' || res.data.status === 'error') finishBulkJob(res.data);
            }
            tick();
            window._bulkJobPollTimer = setInterval(tick, 1500);
        }
        function bindBulkSendModalChrome() {
            var overlay = document.getElementById('modalBulkSend');
            if (!overlay || overlay._bulkChromeBound) return;
            overlay._bulkChromeBound = true;
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) closeBulkSendModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key !== 'Escape') return;
                if (overlay.style.display === 'flex') closeBulkSendModal();
            });
            var useTpl = document.getElementById('bulkUseCloudTemplate');
            if (useTpl) useTpl.addEventListener('change', syncBulkSendMode);
        }
        function openBulkSendModal() {
            if (typeof canAccessSection === 'function' ? !canAccessSection('bulk_messaging') : !((currentUser && currentUser.permissions && currentUser.permissions.bulk_messaging))) {
                toast(t('no_access') || 'دسترسی ندارید', true);
                return;
            }
            bindBulkSendModalChrome();
            var modal = document.getElementById('modalBulkSend');
            if (modal) modal.style.display = 'flex';
            if (!window._bulkSendInFlight) {
                var msgEl = document.getElementById('bulkMessageContent');
                var delayEl = document.getElementById('bulkDelaySec');
                var paramEl = document.getElementById('bulkTemplateParam');
                var useTpl = document.getElementById('bulkUseCloudTemplate');
                if (msgEl) msgEl.value = '';
                if (paramEl) paramEl.value = '';
                if (delayEl) delayEl.value = 5;
                if (useTpl) useTpl.checked = true;
                resetBulkJobProgress();
            }
            syncBulkSendMode();
            updateBulkSelectedCount();
            apiFetch('/api/bulk/limits').then(function(res) {
                if (res.ok && res.data && res.data.maxRecipients) window._bulkMaxRecipients = res.data.maxRecipients;
            });
            if (!window._bulkSendInFlight) {
                apiFetch('/api/whatsapp/connection').then(function(res) {
                    if (!res.ok || !res.data) return;
                    var tplName = document.getElementById('bulkTemplateName');
                    var tplLang = document.getElementById('bulkTemplateLanguage');
                    if (tplName && res.data.cloudBulkTemplateName) tplName.value = res.data.cloudBulkTemplateName;
                    if (tplLang && res.data.cloudBulkTemplateLanguage) tplLang.value = res.data.cloudBulkTemplateLanguage;
                });
            }
            if ((window._bulkSelectedIds || []).length === 0) toast(bulkFmt('bulk_select_none', LANG === 'fa' ? 'ابتدا مشتریان را از لیست انتخاب کنید' : 'Select customers from the list first'), false);
        }
        function closeBulkSendModal() {
            var modal = document.getElementById('modalBulkSend');
            if (modal) modal.style.display = 'none';
        }
        async function submitBulkSend() {
            if (window._bulkSendInFlight) return;
            const ids = (window._bulkSelectedIds || []).map(bulkId).filter(Boolean);
            if (ids.length === 0) { toast(bulkFmt('bulk_err_select', ''), true); return; }
            const max = getBulkMaxRecipients();
            if (ids.length > max) { toast(bulkFmt('bulk_selected_capped', '', { n: ids.length, max: max }), true); return; }
            const useCloudTemplate = !!(document.getElementById('bulkUseCloudTemplate') && document.getElementById('bulkUseCloudTemplate').checked);
            const templateName = (document.getElementById('bulkTemplateName') && document.getElementById('bulkTemplateName').value || '').trim();
            const templateLanguage = (document.getElementById('bulkTemplateLanguage') && document.getElementById('bulkTemplateLanguage').value || 'fa').trim();
            const templateParam = (document.getElementById('bulkTemplateParam') && document.getElementById('bulkTemplateParam').value || '').trim();
            const content = (document.getElementById('bulkMessageContent') && document.getElementById('bulkMessageContent').value || '').trim();
            if (useCloudTemplate && !templateName) { toast(bulkFmt('bulk_err_template_name', ''), true); return; }
            if (!useCloudTemplate && !content) { toast(bulkFmt('bulk_err_message', ''), true); return; }
            if (!confirm(bulkFmt('bulk_confirm', '', { n: ids.length }))) return;
            const delaySec = parseInt(document.getElementById('bulkDelaySec').value, 10) || 5;
            const delayMs = Math.min(60, Math.max(2, delaySec)) * 1000;
            const body = { customerIds: ids, delayMs: delayMs, useCloudTemplate: useCloudTemplate };
            if (useCloudTemplate) {
                body.templateName = templateName;
                body.templateLanguage = templateLanguage;
                if (templateParam) body.templateBodyParams = [templateParam];
            } else {
                body.message = content;
            }
            window._bulkSendInFlight = true;
            setBulkSubmitState();
            const res = await apiFetch('/api/bulk/send', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) { window._bulkSendInFlight = false; setBulkSubmitState(); return; }
            if (res.ok) {
                toast((res.data && res.data.message) || bulkFmt('bulk_sending', ''), false);
                if (res.data && res.data.skipped) renderBulkJobProgress({ total: res.data.total || ids.length, sent: 0, failed: 0, skipped: res.data.skipped });
                if (res.data && res.data.jobId) startBulkJobPoll(res.data.jobId);
                else { window._bulkSendInFlight = false; setBulkSubmitState(); }
            } else {
                window._bulkSendInFlight = false;
                setBulkSubmitState();
                toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }

        window._importFileRows = null;
        function openImportCustomersModal() {
            document.getElementById('modalImportCustomers').style.display = 'flex';
            document.getElementById('importExcelFile').value = '';
            document.getElementById('importPreview').style.display = 'none';
            document.getElementById('btnImportSubmit').disabled = true;
            window._importFileRows = null;
        }
        function closeImportCustomersModal() { document.getElementById('modalImportCustomers').style.display = 'none'; }
        (function bindImportFileInput() {
            const inp = document.getElementById('importExcelFile');
            if (inp && !inp._importBound) {
                inp._importBound = true;
                inp.addEventListener('change', async function() {
                const file = this.files && this.files[0];
                if (!file) return;
                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch(API + '/api/customers/import/upload', { method: 'POST', credentials: 'include', body: fd });
                const data = await res.json().catch(function() { return {}; });
                if (data.rows && data.rows.length > 0) {
                    window._importFileRows = data.rows;
                    document.getElementById('importPreview').style.display = 'block';
                    document.getElementById('importPreview').innerHTML = (LANG === 'fa' ? 'پیش‌نمایش: ' : 'Preview: ') + data.rows.length + ' ' + (LANG === 'fa' ? 'ردیف آماده ورود' : 'rows ready');
                    document.getElementById('btnImportSubmit').disabled = false;
                } else { toast((data.error || (LANG === 'fa' ? 'فایل نامعتبر یا خالی است' : 'Invalid or empty file')), true); }
                });
            }
        })();
        async function submitImportCustomers() {
            const rows = window._importFileRows;
            if (!rows || rows.length === 0) { toast(LANG === 'fa' ? 'ابتدا فایل را انتخاب کنید' : 'Select file first', true); return; }
            const res = await apiFetch('/api/customers/import/import', { method: 'POST', body: JSON.stringify({ rows: rows }) });
            if (res.needLogin) return;
            if (res.ok) { toast((LANG === 'fa' ? 'ورود انجام شد: ' : 'Import done: ') + (res.data.created || 0) + ' ' + (LANG === 'fa' ? 'ایجاد' : 'created') + ', ' + (res.data.updated || 0) + ' ' + (LANG === 'fa' ? 'بروزرسانی' : 'updated')); closeImportCustomersModal(); loadCustomers(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var currentCustomerId = null;
        let currentCustomerData = null;
        async function showCustomerHistory(custId, fallbackName) {
            currentCustomerId = custId;
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.removeProperty('display'); });
            const detailPage = document.getElementById('pageCustomerDetail');
            if (detailPage) detailPage.classList.add('show');
            document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(function(l) { l.classList.remove('active'); });
            const custLink = document.querySelector('.sidebar .nav-link[data-page="customers"]');
            if (custLink) custLink.classList.add('active');
            const cardEl = document.getElementById('customerDetailCard');
            const list = document.getElementById('customerHistoryList');
            const timelineEl = document.getElementById('customerTimelineList');
            const quickActionsEl = document.getElementById('customerDetailQuickActions');
            if (quickActionsEl) quickActionsEl.innerHTML = '';
            if (cardEl) cardEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (list) list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (timelineEl) timelineEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            document.querySelectorAll('.customer-detail-panel').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            const tlPanel = document.getElementById('customerTimelinePanel');
            if (tlPanel) { tlPanel.style.display = 'block'; tlPanel.classList.add('show'); }
            document.querySelectorAll('.customer-detail-tab').forEach(function(b) { b.classList.remove('active'); });
            const tlTab = document.querySelector('.customer-detail-tab[data-tab="timeline"]');
            if (tlTab) tlTab.classList.add('active');
            const resDetail = await apiFetch('/api/customers/' + custId);
            if (resDetail.needLogin) return;
            if (!resDetail.ok) { if (cardEl) cardEl.innerHTML = '<div class="empty">' + escapeHtml(resDetail.data && resDetail.data.error ? resDetail.data.error : '') + '</div>'; list.innerHTML = ''; return; }
            currentCustomerData = resDetail.data;
            const c = currentCustomerData;
            const name = typeof customerUiName === 'function' ? customerUiName(c) : (c.name || fallbackName || t('customer'));
            const initial = (name && name[0]) ? name[0].toUpperCase() : '?';
            const statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
            const firstContact = c.firstContactAt ? fmtTZ(c.firstContactAt, 'date') : '—';
            const lastContact = c.lastContactAt ? fmtTZ(c.lastContactAt, 'datetime') : '—';
            if (quickActionsEl) {
                const qName = (name || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                const qPhone = ((typeof customerUiPhone === 'function' ? customerUiPhone(c) : '') || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                const delBtn = (currentUser && currentUser.canDeleteCustomer) ? '<button type="button" class="btn-danger btn-danger-outline customer-detail-action-btn" id="custDeleteBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('customer_delete') || (LANG === 'fa' ? 'حذف مشتری' : 'Delete customer')) + '</button>' : '';
                const grantBtn = canViewHiddenConversations() ? '<button type="button" class="btn-secondary customer-detail-action-btn" id="custGrantAccessBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('access_grant_btn') || 'Grant access') + '</button>' : '';
                const restrictedBadge = c.isRestrictedFromStaff ? '<span class="badge" style="margin-inline-start:8px;">' + escapeHtml(t('customer_restricted_badge') || 'Restricted') + '</span>' : '';
                quickActionsEl.innerHTML = '<button type="button" class="btn-primary customer-detail-action-btn" id="custChatBtn" data-cust-id="' + c.id + '" data-cust-name="' + qName + '" data-cust-phone="' + qPhone + '">' + escapeHtml(t('customer_quick_chat')) + '</button><button type="button" class="btn-secondary customer-detail-action-btn" id="custEditBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('customer_quick_edit')) + '</button><button type="button" class="btn-secondary customer-detail-action-btn" id="custTransBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('transaction_add')) + '</button>' + grantBtn + delBtn + restrictedBadge;
                setTimeout(function() {
                    const chatBtn = document.getElementById('custChatBtn');
                    const editBtn = document.getElementById('custEditBtn');
                    const transBtn = document.getElementById('custTransBtn');
                    const delBtnEl = document.getElementById('custDeleteBtn');
                    const grantBtnEl = document.getElementById('custGrantAccessBtn');
                    if (grantBtnEl) {
                        grantBtnEl.addEventListener('click', function() {
                            openCustomerGrantAccess(c.id);
                        });
                    }
                    if (chatBtn) {
                        chatBtn.removeEventListener('click', function() {});
