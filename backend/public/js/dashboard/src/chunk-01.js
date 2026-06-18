/**
 * Kaya CRM — Dashboard SPA (chunk 01/06)
 * @file    public/js/dashboard/src/chunk-01.js
 * @layer   frontend/dashboard
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * محتوا: state سراسری (token, currentUser)، نرخ ارز/تیکر، صرافی و خدمات،
 *        پایهٔ Socket.IO، ناو badge، persistAuthToken / restoreSession helpers.
 */
        const API = '';
        let token = null;
        function persistAuthToken(t) {
            token = t || null;
            try {
                if (t) sessionStorage.setItem('crm_token', t);
                else sessionStorage.removeItem('crm_token');
            } catch (_) {}
        }
        function loadStoredAuthToken() {
            try {
                const t = sessionStorage.getItem('crm_token');
                if (t) token = t;
            } catch (_) {}
        }
        function redirectToLoginPage() {
            const qs = window.location.search || '';
            if (qs.indexOf('reset=1') >= 0 && qs.indexOf('token=') >= 0) return false;
            const dest =
                '/login?return=' +
                encodeURIComponent((window.location.pathname || '/dashboard') + qs + (window.location.hash || ''));
            window.location.replace(dest);
            return true;
        }
        loadStoredAuthToken();
        let currentConvId = null;
        let currentUser = null;
        let ratesInterval = null;
        let tickerTimeInterval = null;
        let presenceInterval = null;
        let staffActivityInterval = null;
        let staffActivityAttendanceInitDone = false;
        let socket = null;
        let loadConversationsDebounceTimer = null;
        function debouncedLoadConversations(ms) {
            ms = ms || 400;
            if (loadConversationsDebounceTimer) clearTimeout(loadConversationsDebounceTimer);
            loadConversationsDebounceTimer = setTimeout(function() {
                loadConversationsDebounceTimer = null;
                loadConversations();
            }, ms);
        }
        function waMsgStatusTicks(st) {
            if (st === 'read' || st === 'delivered') return '\u2713\u2713';
            if (st === 'sent') return '\u2713';
            if (st === 'failed') return '!';
            return '';
        }
        window.APP_TIMEZONE = 'Europe/Istanbul';
        window.navBadgeCounts = {};
        window.hasNewInternalChat = false;
        function applyLoginBootstrapData(data) {
            if (data && data.languages && data.languages.supportedLanguages && window.applySupportedLanguages) {
                window.applySupportedLanguages(data.languages.supportedLanguages, data.languages.defaultLanguage);
            } else if (typeof setLang === 'function') setLang(LANG);
            if (data && data.branding && typeof applyBranding === 'function') applyBranding(data.branding, { full: true });
            else if (window.LoginBootstrap && typeof window.LoginBootstrap.markReady === 'function') window.LoginBootstrap.markReady();
        }
        if (window.LoginBootstrap && window.LoginBootstrap.readyPromise) {
            window.LoginBootstrap.readyPromise.then(applyLoginBootstrapData).catch(function () {
                if (typeof setLang === 'function') setLang(LANG);
                if (window.LoginBootstrap && typeof window.LoginBootstrap.markReady === 'function') window.LoginBootstrap.markReady();
            });
        } else {
            fetch((API || '') + '/api/panel-settings/public/languages')
                .then(function (r) {
                    return r.json();
                })
                .then(function (data) {
                    if (data && data.supportedLanguages) window.applySupportedLanguages(data.supportedLanguages, data.defaultLanguage);
                    else if (typeof setLang === 'function') setLang(LANG);
                })
                .catch(function () {
                    if (typeof setLang === 'function') setLang(LANG);
                });
        }
        fetch((API || '') + '/api/config').then(function(r){ return r.json(); }).then(function(c){
            if (c && c.timezone) window.APP_TIMEZONE = c.timezone;
            if (c && c.supportUrl) {
                window.SUPPORT_URL = c.supportUrl;
                const setSupportLink = function(wrapId, linkId) {
                    const wrap = document.getElementById(wrapId);
                    const link = document.getElementById(linkId);
                    if (wrap && link) {
                        link.href = c.supportUrl;
                        link.target = c.supportUrl.startsWith('mailto:') ? '_self' : '_blank';
                        link.rel = c.supportUrl.startsWith('mailto:') ? '' : 'noopener';
                    }
                };
                setSupportLink('loginSupportWrap', 'loginSupportLink');
                setSupportLink('loginSupportWrapTotp', 'loginSupportLinkTotp');
            }
        }).catch(function(){});
        function updateNavBadges(stats) {
            if (stats) {
                window.navBadgeCounts.conversations = (stats.unreadConversations || 0);
                window.navBadgeCounts.tickets = (stats.ticketsOpen || 0);
                window.navBadgeCounts.tasks = (stats.tasksPending || 0);
                window.navBadgeCounts.announcements = (stats.unreadAnnouncements || 0);
            }
            if (window.hasNewInternalChat) window.navBadgeCounts['internal-chat'] = 1;
            const notifyBadge = document.getElementById('headerNotifyBadge');
            const notifyBadgeMobile = document.getElementById('headerNotifyBadgeMobile');
            const n = (window.navBadgeCounts.announcements || 0);
            if (notifyBadge) { notifyBadge.style.display = n > 0 ? '' : 'none'; notifyBadge.textContent = n > 99 ? '99+' : String(n); }
            if (notifyBadgeMobile) { notifyBadgeMobile.style.display = n > 0 ? '' : 'none'; notifyBadgeMobile.textContent = n > 99 ? '99+' : String(n); }
            document.querySelectorAll('.nav-link[data-page]').forEach(function(link) {
                const page = link.getAttribute('data-page');
                const oldBadge = link.querySelector('.nav-badge, .nav-badge-dot');
                if (oldBadge) oldBadge.remove();
                const n = window.navBadgeCounts[page] || 0;
                if (n > 0) {
                    const badge = document.createElement('span');
                    badge.className = n > 99 ? 'nav-badge-dot' : 'nav-badge';
                    badge.textContent = n > 99 ? '' : n;
                    link.appendChild(badge);
                }
            });
            const convBadge = document.getElementById('mobileTabConvBadge');
            if (convBadge) { const nc = window.navBadgeCounts.conversations || 0; convBadge.style.display = nc > 0 ? '' : 'none'; convBadge.textContent = nc > 99 ? '99+' : String(nc); }
            const annBadge = document.getElementById('mobileTabAnnBadge');
            if (annBadge) { const na = window.navBadgeCounts.announcements || 0; annBadge.style.display = na > 0 ? '' : 'none'; annBadge.textContent = na > 99 ? '99+' : String(na); }
        }
        var MOBILE_MORE_PAGES = ['profile','tickets','tasks','processes','departments','users','branches','whatsapp','message-templates','rates','rates-charts','services','internal-chat','panel-settings','supervision','staff-activity'];
        function mobileCanAccessSection(sec) {
            if (typeof canAccessSection === 'function') return canAccessSection(sec);
            if (sec === 'profile' || sec === 'dashboard') return true;
            const key = sec === 'rates_charts' ? 'rates' : sec;
            const perms = (currentUser && currentUser.permissions) || {};
            return perms[key] === true;
        }
        function updateMobileTabBar(page) {
            const tabBar = document.getElementById('mobileTabBar');
            const bottomBar = document.getElementById('bottomBar');
            if (!tabBar || !bottomBar) return;
            const isMobile = window.innerWidth <= 900;
            bottomBar.classList.toggle('has-mobile-tab', isMobile);
            if (!isMobile) return;
            document.querySelectorAll('.mobile-tab-bar .mobile-tab-item').forEach(function(item) {
                const p = item.getAttribute('data-page');
                const active = (p === page) || (p === 'more' && MOBILE_MORE_PAGES.indexOf(page) >= 0);
                item.classList.toggle('active', active);
                item.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            const hidden = HIDDEN_SECTIONS || [];
            document.querySelectorAll('.mobile-tab-bar .mobile-tab-item[data-section]').forEach(function(item) {
                const sec = item.getAttribute('data-section');
                const pageId = item.getAttribute('data-page');
                const hiddenPage = pageId && hidden.indexOf(pageId) >= 0;
                const hiddenSec = sec && (hidden.indexOf(sec) >= 0 || (sec === 'rates_charts' && hidden.indexOf('rates') >= 0));
                const visible = !hiddenPage && !hiddenSec && mobileCanAccessSection(sec || 'dashboard');
                item.style.display = visible ? '' : 'none';
            });
        }

        function headers() {
            return { 'Content-Type': 'application/json' };
        }
        if (window.CRM && window.CRM.Api) {
            window.CRM_API_BASE = API || '';
            window.CRM.Api.init({
                getHeaders: headers,
                getLang: function () { return LANG; },
                on401: function () {
                    if (typeof teardownActiveSession === 'function') {
                        teardownActiveSession(true);
                    } else {
                        persistAuthToken(null);
                        document.documentElement.classList.remove('auth-has-token', 'auth-verifying');
                        const loginBox = document.getElementById('loginBox');
                        if (loginBox) loginBox.style.display = 'flex';
                        const appEl = document.getElementById('app');
                        if (appEl) appEl.classList.remove('show');
                    }
                    const errEl = document.getElementById('loginErr');
                    if (errEl) errEl.textContent = (LANG === 'fa' ? 'نشست منقضی شده. لطفاً دوباره وارد شوید.' : 'Session expired. Please sign in again.');
                }
            });
        }
        function timeAgo(d) {
            if (!d) return '';
            const date = d instanceof Date ? d : new Date(d);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const sec = Math.floor((now - date) / 1000);
            if (sec < 60) return (LANG === 'fa' ? 'همین الان' : LANG === 'tr' ? 'Az önce' : 'Just now');
            const min = Math.floor(sec / 60);
            if (min < 60) return min + ' ' + (LANG === 'fa' ? 'دقیقه پیش' : LANG === 'tr' ? 'dk önce' : 'min ago');
            const hr = Math.floor(min / 60);
            if (hr < 24) return hr + ' ' + (LANG === 'fa' ? 'ساعت پیش' : LANG === 'tr' ? 'saat önce' : 'hr ago');
            const day = Math.floor(hr / 24);
            if (day < 7) return day + ' ' + (LANG === 'fa' ? 'روز پیش' : LANG === 'tr' ? 'gün önce' : 'days ago');
            return fmtTZ(d, 'date');
        }
        // فارسی: وقت تهران ایران و تاریخ شمسی. انگلیسی: وقت امارات و تقویم میلادی. ترکی: وقت استانبول ترکیه و تقویم میلادی.
        function fmtTZ(d, opts) {
            if (!d) return '';
            const date = d instanceof Date ? d : new Date(d);
            if (isNaN(date.getTime())) return '';
            const tz = (LANG === 'fa' ? 'Asia/Tehran' : LANG === 'tr' ? 'Europe/Istanbul' : 'Asia/Dubai');
            const locale = (LANG === 'fa' ? 'fa-IR' : LANG === 'tr' ? 'tr-TR' : 'en-GB');
            const base = { timeZone: tz };
            if (typeof opts === 'string') {
                if (opts === 'time') return new Intl.DateTimeFormat(locale, Object.assign({}, base, { hour: '2-digit', minute: '2-digit' })).format(date);
                if (opts === 'date') return new Intl.DateTimeFormat(locale, Object.assign({}, base, { dateStyle: 'short' })).format(date);
                if (opts === 'datetime') return new Intl.DateTimeFormat(locale, Object.assign({}, base, { dateStyle: 'short', timeStyle: 'short' })).format(date);
            }
            return new Intl.DateTimeFormat(locale, Object.assign({}, base, opts || {})).format(date);
        }

        function formatPrice(val) {
            if (window.CRM && window.CRM.Utils && typeof window.CRM.Utils.formatPrice === 'function') return window.CRM.Utils.formatPrice(val);
            if (val == null || val === '' || val === '\u2014' || (typeof val === 'string' && val.trim() === '')) return '\u2014';
            const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
            if (isNaN(num)) return '\u2014';
            if (LANG !== 'fa') {
                return Math.round(num).toLocaleString('en-US');
            }
            const n = String(Math.round(num)).replace(/[^\d]/g, '');
            if (n.length > 3) {
                let out = ''; for (let i = n.length - 1, c = 0; i >= 0; i--, c++) { if (c && c % 3 === 0) out = ',' + out; out = n[i] + out; }
                return out.replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
            }
            return n.replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
        }

        /** نوار نرخ دمو: جفت‌ارز متقاطع با ارقام لاتین (پاسخ API با tickerDisplay === 'fx_cross') */
        function formatFxCrossTickerValue(val) {
            if (val == null || val === '' || val === '\u2014' || (typeof val === 'string' && val.trim() === '')) return '\u2014';
            const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
            if (isNaN(num)) return '\u2014';
            const abs = Math.abs(num);
            let minF = 4;
            let maxF = 6;
            if (abs >= 100) { minF = 2; maxF = 3; }
            else if (abs >= 10) { minF = 3; maxF = 4; }
            else if (abs >= 1) { minF = 4; maxF = 5; }
            return num.toLocaleString('en-US', { minimumFractionDigits: minF, maximumFractionDigits: maxF });
        }

        function formatChange(ch) {
            if (window.CRM && window.CRM.Utils && typeof window.CRM.Utils.formatChange === 'function') return window.CRM.Utils.formatChange(ch);
            if (ch == null || ch === '') return '';
            const num = typeof ch === 'number' ? ch : parseFloat(String(ch));
            if (isNaN(num) || num === 0) return '';
            const abs = Math.abs(num);
            const s = abs >= 1000 ? abs.toLocaleString('en-US') : String(abs);
            if (LANG !== 'fa') {
                return (num > 0 ? '+' : '−') + s;
            }
            const fa = '۰۱۲۳۴۵۶۷۸۹';
            const out = s.replace(/\d/g, function(d) { return fa[d]; });
            return (num > 0 ? '+' : '−') + out;
        }
        function formatTickerDateTime(_updatedAtStr, _timestampSec) {
            const d = new Date();
            const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
            const iran = new Intl.DateTimeFormat('en-GB', Object.assign({}, opts, { timeZone: 'Asia/Tehran' })).format(d);
            const turkey = new Intl.DateTimeFormat('en-GB', Object.assign({}, opts, { timeZone: 'Europe/Istanbul' })).format(d);
            const uae = new Intl.DateTimeFormat('en-GB', Object.assign({}, opts, { timeZone: 'Asia/Dubai' })).format(d);
            let shamsi = '';
            try {
                const pf = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', calendar: 'persian', year: 'numeric', month: '2-digit', day: '2-digit' });
                const parts = pf.formatToParts(d);
                const y = (parts.find(function(p){ return p.type === 'year'; }) || {}).value || '';
                const m = (parts.find(function(p){ return p.type === 'month'; }) || {}).value || '';
                const day = (parts.find(function(p){ return p.type === 'day'; }) || {}).value || '';
                const yearNum = parseInt(y, 10);
                if (yearNum >= 1300 && yearNum <= 1500) shamsi = y + '/' + m + '/' + day;
                else shamsi = pf.format(d);
            } catch (e) {
                shamsi = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', calendar: 'persian', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            }
            let miladi = '';
            try {
                miladi = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            } catch (e) {
                miladi = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            }
            let hijri = '';
            try {
                const hf = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' });
                const hParts = hf.formatToParts(d);
                const hy = (hParts.find(function(p){ return p.type === 'year'; }) || {}).value || '';
                const hm = (hParts.find(function(p){ return p.type === 'month'; }) || {}).value || '';
                const hd = (hParts.find(function(p){ return p.type === 'day'; }) || {}).value || '';
                const hYearNum = parseInt(hy, 10);
                if (hYearNum >= 1400 && hYearNum <= 1500) hijri = hm + '/' + hd + '/' + hy + ' AH';
                else hijri = hf.format(d) + ' AH';
            } catch (e) {
                try {
                    const hf2 = new Intl.DateTimeFormat('en-u-ca-islamic', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' });
                    hijri = hf2.format(d) + ' AH';
                } catch (e2) { hijri = '—'; }
            }
            return {
                iran: iran,
                turkey: turkey,
                uae: uae,
                shamsi: shamsi,
                miladi: miladi,
                hijri: hijri,
                label: t('ticker_current_time') || 'ساعت فعلی',
                iranLabel: t('ticker_iran') || 'ایران',
                turkeyLabel: t('ticker_turkey') || 'ترکیه',
                uaeLabel: t('ticker_uae') || 'امارات'
            };
        }
        function formatRatesLastUpdated(updatedAtStr, timestampSec) {
            const d = updatedAtStr ? new Date(updatedAtStr) : (timestampSec ? new Date(timestampSec * 1000) : new Date());
            if (isNaN(d.getTime())) return '';
            const locale = LANG === 'fa' ? 'fa-IR' : LANG === 'tr' ? 'tr-TR' : 'en-GB';
            const tz = LANG === 'fa' ? 'Asia/Tehran' : LANG === 'tr' ? 'Europe/Istanbul' : 'Asia/Dubai';
            return new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: 'short', timeStyle: 'short' }).format(d);
        }
        async function fetchRates(showRefreshSpinner) {
            if (!token) return;
            const tickerEl = document.getElementById('priceTicker');
            if (HIDDEN_SECTIONS && HIDDEN_SECTIONS.indexOf('rates') >= 0) {
                if (tickerEl) tickerEl.style.display = 'none';
                return;
            }
            const innerEl = document.getElementById('ratesMarqueeInner');
            const trackEl = document.getElementById('ratesMarqueeTrack');
            const trackWrap = document.getElementById('ratesMarqueeTrackWrap');
            const refreshBtn = document.getElementById('ratesMarqueeRefresh');
            if (showRefreshSpinner && refreshBtn) refreshBtn.classList.add('loading');
            const res = await apiFetch('/api/rates');
            if (showRefreshSpinner && refreshBtn) refreshBtn.classList.remove('loading');
            if (res.needLogin || !res.ok) return;
            const data = res.data;
            const items = (data && data.items) || [];
            const tickerDisplay = (data && data.tickerDisplay) || 'toman';
            const lastUpdated = formatRatesLastUpdated(data.updatedAt, data.updatedAtTimestamp);
            if (tickerEl) {
                tickerEl.setAttribute('dir', tickerDisplay === 'fx_cross' || LANG !== 'fa' ? 'ltr' : 'rtl');
            }
            if (trackWrap) {
                trackWrap.title = lastUpdated ? ((t('ticker_last_updated') || 'آخرین بروزرسانی') + ': ' + lastUpdated) : '';
            }
            if (tickerEl) tickerEl.style.display = '';
            if (innerEl) {
                const wasEmpty = innerEl.querySelector('.ticker-empty') || innerEl.querySelector('.ticker-item') === null;
                const isEmpty = items.length === 0;
                const emptyMsg = isEmpty && res.ok ? (t('ticker_empty') || 'هنوز نرخ ارزی تنظیم نشده') : (t('ticker_loading') || 'در حال بارگذاری قیمت‌ها...');
                const itemsHtml = isEmpty
                    ? '<span class="ticker-item ticker-empty">' + escapeHtml(emptyMsg) + '</span>'
                    : items.map(function(it) {
                    const ch = it.change;
                    const chClass = ch > 0 ? ' up' : ch < 0 ? ' down' : ' neutral';
                    const chText = tickerDisplay === 'fx_cross' ? '' : formatChange(ch);
                    const valStr = tickerDisplay === 'fx_cross' ? formatFxCrossTickerValue(it.value) : formatPrice(it.value);
                    const changePart = chText ? ' <span class="ticker-change' + chClass + '" aria-label="تغییر">(' + escapeHtml(chText) + ')</span>' : '';
                    return '<span class="ticker-item"><span class="ticker-label">' + escapeHtml(it.label || rateLabel(it.key)) + '</span><span class="ticker-value">' + escapeHtml(valStr) + '</span>' + changePart + '</span>';
                }).join('');
                innerEl.innerHTML = itemsHtml;
                delete innerEl.dataset.marqueeDuplicated;
                if (!isEmpty && (wasEmpty || innerEl._lastItemsCount !== items.length)) {
                    innerEl.classList.add('ticker-updated');
                    setTimeout(function() { if (innerEl) innerEl.classList.remove('ticker-updated'); }, 600);
                }
                innerEl._lastItemsCount = items.length;
                innerEl.classList.remove('centered', 'scrolling');
                function updateRatesMarqueeMode() {
                    if (!trackEl || !innerEl) return;
                    const fits = innerEl.scrollWidth <= trackEl.clientWidth;
                    if (!fits && !innerEl.dataset.marqueeDuplicated && !innerEl.querySelector('.ticker-empty')) {
                        innerEl.innerHTML = innerEl.innerHTML + innerEl.innerHTML;
                        innerEl.dataset.marqueeDuplicated = '1';
                    }
                    innerEl.classList.toggle('centered', fits);
                    innerEl.classList.toggle('scrolling', !fits);
                    trackEl.classList.toggle('rates-centered', fits);
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !fits) {
                        trackEl.scrollLeft = 0;
                    }
                }
                if (trackEl) {
                    requestAnimationFrame(function() {
                        requestAnimationFrame(updateRatesMarqueeMode);
                    });
                    if (typeof ResizeObserver !== 'undefined') {
                        if (trackEl._ratesMarqueeRo) trackEl._ratesMarqueeRo.disconnect();
                        trackEl._ratesMarqueeRo = new ResizeObserver(function() {
                            requestAnimationFrame(updateRatesMarqueeMode);
                        });
                        trackEl._ratesMarqueeRo.observe(trackEl);
                    }
                }
            }
        }
        function refreshRatesTicker() {
            fetchRates(true);
        }
        window.refreshRatesTicker = refreshRatesTicker;
        let ratesChartInstance = null;
        let ratesChartCurrentCurrency = 'usd';
        let ratesChartsCurrentDays = 30;
        let ratesChartsLastExport = null;
        let ratesChartsCurrenciesLoaded = false;
        const RATES_CHART_ICONS = { usd: '$', eur: '€', gbp: '£', aed: 'د.إ', try: '₺', gold: 'Au', chf: 'Fr', cad: 'C$', aud: 'A$', jpy: '¥', sar: '﷼', kwd: 'KD', rub: '₽', cny: '¥', inr: '₹' };
        function ratesChartsCurrencyIcon(key) {
            return RATES_CHART_ICONS[key] || (String(key || '').slice(0, 2).toUpperCase() || '¤');
        }
        function ratesChartsCurrencyLabel(key, fallbackLabel) {
            const i18nKey = 'currency_' + key;
            const fromI18n = t(i18nKey);
            if (fromI18n && fromI18n !== i18nKey) return fromI18n;
            return fallbackLabel || rateLabel(key);
        }
        function setRatesChartCurrency(key) {
            ratesChartCurrentCurrency = key;
            document.querySelectorAll('.rates-chart-tab').forEach(function(b) {
                b.classList.toggle('active', b.getAttribute('data-currency') === key);
            });
            document.querySelectorAll('.rates-charts-overview-card').forEach(function(c) {
                c.classList.toggle('active', c.getAttribute('data-currency') === key);
            });
            loadRatesCharts();
        }
        window.setRatesChartCurrency = setRatesChartCurrency;
        function setRatesChartPeriod(days) {
            ratesChartsCurrentDays = days;
            document.querySelectorAll('.rates-chart-period-pill').forEach(function(b) {
                b.classList.toggle('active', parseInt(b.getAttribute('data-days'), 10) === days);
            });
            const periodSel = document.getElementById('ratesChartPeriod');
            if (periodSel) periodSel.value = String(days);
            loadRatesCharts();
        }
        window.setRatesChartPeriod = setRatesChartPeriod;
        let ratesChartsLoadSeq = 0;
        function ratesChartsYAxisLocale() {
            if (LANG === 'fa') return 'fa-IR';
            if (LANG === 'tr') return 'tr-TR';
            return 'en-US';
        }
        function ratesChartsShowEmpty(summaryEl, statsRow, message, withRetry) {
            if (statsRow) statsRow.innerHTML = '';
            const tableSection = document.getElementById('ratesChartsTableSection');
            if (tableSection) tableSection.hidden = true;
            const exportBtn = document.getElementById('ratesChartsExportBtn');
            if (exportBtn) exportBtn.hidden = true;
            if (!summaryEl) return;
            const retry = withRetry
                ? '<button type="button" class="btn-secondary rates-charts-retry-btn" onclick="loadRatesCharts()">' + escapeHtml(t('rates_charts_retry')) + '</button>'
                : '';
            summaryEl.innerHTML = '<div class="rates-charts-empty">' +
                '<p class="rates-charts-empty-text">' + escapeHtml(message) + '</p>' + retry + '</div>';
        }
        function ratesChartsUpdateMeta(payload) {
            const metaEl = document.getElementById('ratesChartsMeta');
            if (!metaEl) return;
            const parts = [];
            if (payload && payload.cachedAt) {
                parts.push('<span class="rates-charts-meta-item">' + escapeHtml(t('rates_charts_last_updated')) + ': ' + escapeHtml(fmtTZ(payload.cachedAt, 'datetime')) + '</span>');
            }
            if (payload && payload.source) {
                const srcLabel = payload.source === 'ohlc' ? 'Navasan OHLC' : 'Navasan Daily';
                parts.push('<span class="rates-charts-meta-item">' + escapeHtml(t('rates_charts_data_source')) + ': ' + escapeHtml(srcLabel) + '</span>');
            }
            if (parts.length) {
                metaEl.innerHTML = parts.join('<span class="rates-charts-meta-sep">·</span>');
                metaEl.hidden = false;
            } else {
                metaEl.hidden = true;
            }
        }
        function ratesChartsRenderTable(points) {
            const section = document.getElementById('ratesChartsTableSection');
            const tbody = document.getElementById('ratesChartsTableBody');
            const exportBtn = document.getElementById('ratesChartsExportBtn');
            if (!section || !tbody || !points || !points.length) {
                if (section) section.hidden = true;
                if (exportBtn) exportBtn.hidden = true;
                ratesChartsLastExport = null;
                return;
            }
            ratesChartsLastExport = points.slice();
            if (exportBtn) exportBtn.hidden = false;
            const rows = points.slice().reverse();
            let html = '';
            rows.forEach(function(p, idx) {
                const prev = rows[idx + 1];
                let dayChange = '';
                let dayClass = 'neutral';
                if (prev && prev.value && p.value) {
                    const ch = ((p.value - prev.value) / prev.value) * 100;
                    dayClass = ch > 0 ? 'up' : ch < 0 ? 'down' : 'neutral';
                    dayChange = (ch > 0 ? '+' : '') + ch.toFixed(2) + '%';
                } else {
                    dayChange = '—';
                }
                html += '<tr><td>' + escapeHtml(p.date || '') + '</td><td><strong>' + escapeHtml(formatPrice(p.value)) + '</strong></td><td class="rates-charts-day-change ' + dayClass + '">' + escapeHtml(dayChange) + '</td></tr>';
            });
            tbody.innerHTML = html;
            section.hidden = false;
        }
        function exportRatesChartCsv() {
            if (!ratesChartsLastExport || !ratesChartsLastExport.length) return;
            const label = ratesChartsCurrencyLabel(ratesChartCurrentCurrency);
            const header = [t('rates_charts_table_date'), t('rates_charts_table_rate'), label].join(',');
            const lines = ratesChartsLastExport.map(function(p) {
                return '"' + String(p.date || '').replace(/"/g, '""') + '",' + (p.value != null ? p.value : '');
            });
            const csv = '\uFEFF' + header + '\n' + lines.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rates-' + ratesChartCurrentCurrency + '-' + ratesChartsCurrentDays + 'd.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        window.exportRatesChartCsv = exportRatesChartCsv;
        async function ratesChartsBuildCurrencyTabs() {
            const tabsEl = document.getElementById('ratesChartsCurrencyTabs');
            if (!tabsEl || ratesChartsCurrenciesLoaded) return;
            const res = await apiFetch('/api/rates/ticker-config');
            if (res.needLogin || !res.ok) return;
            const available = res.data.availableKeys || [];
            const visible = res.data.visibleKeys || available.map(function(a) { return a.key; });
            if (!visible.length) return;
            let html = '';
            visible.forEach(function(key) {
                const info = available.find(function(a) { return a.key === key; }) || { key: key, label: key };
                const active = key === ratesChartCurrentCurrency ? ' active' : '';
                html += '<button type="button" class="rates-chart-tab' + active + '" data-currency="' + escapeHtml(key) + '" onclick="setRatesChartCurrency(\'' + escapeAttr(key) + '\')" role="tab">' +
                    '<span class="tab-icon">' + escapeHtml(ratesChartsCurrencyIcon(key)) + '</span> ' + escapeHtml(ratesChartsCurrencyLabel(key, info.label)) + '</button>';
            });
            tabsEl.innerHTML = html;
            if (visible.indexOf(ratesChartCurrentCurrency) < 0) {
                ratesChartCurrentCurrency = visible[0];
            }
            ratesChartsCurrenciesLoaded = true;
        }
        async function loadRatesChartsOverview() {
            const grid = document.getElementById('ratesChartsOverviewGrid');
            if (!grid) return;
            const res = await apiFetch('/api/rates');
            if (res.needLogin || !res.ok || !res.data || !res.data.items) {
                grid.innerHTML = '<p class="rates-charts-overview-empty text-muted">' + escapeHtml(t('rates_charts_empty')) + '</p>';
                return;
            }
            let html = '';
            res.data.items.forEach(function(it) {
                if (!it || !it.key) return;
                const ch = it.change != null && !isNaN(Number(it.change)) ? Number(it.change) : null;
                const chClass = ch == null ? 'neutral' : ch > 0 ? 'up' : ch < 0 ? 'down' : 'neutral';
                const chStr = ch != null ? ((ch > 0 ? '+' : '') + ch.toFixed(1) + '%') : '';
                const active = it.key === ratesChartCurrentCurrency ? ' active' : '';
                const valStr = (it.value != null && it.value !== '' && it.value !== '—') ? formatPrice(it.value) : '—';
                html += '<button type="button" class="rates-charts-overview-card' + active + '" data-currency="' + escapeHtml(it.key) + '" onclick="setRatesChartCurrency(\'' + escapeAttr(it.key) + '\')">' +
                    '<span class="overview-card-icon">' + escapeHtml(ratesChartsCurrencyIcon(it.key)) + '</span>' +
                    '<span class="overview-card-label">' + escapeHtml(it.label || ratesChartsCurrencyLabel(it.key)) + '</span>' +
                    '<span class="overview-card-value">' + escapeHtml(valStr) + '</span>' +
                    (chStr ? '<span class="overview-card-change ' + chClass + '">' + escapeHtml(chStr) + '</span>' : '') +
                    '</button>';
            });
            grid.innerHTML = html || '<p class="rates-charts-overview-empty text-muted">' + escapeHtml(t('rates_charts_empty')) + '</p>';
        }
        async function initRatesChartsPage() {
            await ratesChartsBuildCurrencyTabs();
            loadRatesChartsOverview();
            loadRatesCharts();
        }
        window.initRatesChartsPage = initRatesChartsPage;
        async function loadRatesCharts(forceRefresh) {
            const canvas = document.getElementById('ratesChartCanvas');
            const summaryEl = document.getElementById('ratesChartsSummary');
            const statsRow = document.getElementById('ratesChartsStatsRow');
            const loadingOverlay = document.getElementById('ratesChartsLoadingOverlay');
            const refreshBtn = document.querySelector('.rates-charts-refresh-btn');
            const canvasTitle = document.getElementById('ratesChartsCanvasTitle');
            const adjustedBadge = document.getElementById('ratesChartsAdjustedBadge');
            if (!canvas) return;
            if (!ratesChartsCurrenciesLoaded) await ratesChartsBuildCurrencyTabs();
            const loadId = ++ratesChartsLoadSeq;
            const periodSel = document.getElementById('ratesChartPeriod');
            const days = ratesChartsCurrentDays || (periodSel ? parseInt(periodSel.value, 10) || 30 : 30);
            if (loadingOverlay) loadingOverlay.classList.add('visible');
            if (refreshBtn) refreshBtn.classList.add('loading');
            if (statsRow) statsRow.innerHTML = '';
            if (summaryEl) summaryEl.innerHTML = '';
            const historyUrl = '/api/rates/history?key=' + encodeURIComponent(ratesChartCurrentCurrency) + '&days=' + days + (forceRefresh ? '&refresh=1' : '');
            try {
                const res = await apiFetch(historyUrl);
                if (loadId !== ratesChartsLoadSeq) return;
                if (loadingOverlay) loadingOverlay.classList.remove('visible');
                if (refreshBtn) refreshBtn.classList.remove('loading');
                if (res.needLogin) return;
                const labels = [];
                const values = [];
                const payload = res.data || {};
                const points = (res.ok && payload.points && payload.points.length) ? payload.points : [];
                points.forEach(function(p) { labels.push(p.date); values.push(p.value); });
                const label = ratesChartsCurrencyLabel(ratesChartCurrentCurrency);
                const unitLabel = t('currency_unit_toman') || 'تومان';
                if (canvasTitle) canvasTitle.textContent = label + ' — ' + days + ' ' + (LANG === 'fa' ? 'روز' : LANG === 'tr' ? 'gün' : 'days');
                if (adjustedBadge) adjustedBadge.hidden = !payload.adjustmentApplied;
                ratesChartsUpdateMeta(payload);
                if (ratesChartInstance) { ratesChartInstance.destroy(); ratesChartInstance = null; }
                if (values.length > 0) {
                    const ctx = canvas.getContext('2d');
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
                    gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
                    const yLoc = ratesChartsYAxisLocale();
                    const lastVal = values[values.length - 1];
                    const firstVal = values[0];
                    const minVal = Math.min.apply(null, values);
                    const maxVal = Math.max.apply(null, values);
                    const avgVal = values.reduce(function(a, b) { return a + b; }, 0) / values.length;
                    const prevDayVal = values.length > 1 ? values[values.length - 2] : null;
                    ratesChartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: label + ' (' + unitLabel + ')',
                                data: values,
                                borderColor: '#10b981',
                                borderWidth: 2.5,
                                backgroundColor: gradient,
                                fill: true,
                                tension: 0.35,
                                pointRadius: values.length <= 14 ? 3 : 0,
                                pointHoverRadius: 6,
                                pointHoverBackgroundColor: '#10b981',
                                pointHoverBorderColor: '#fff',
                                pointHoverBorderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2.4,
                            animation: { duration: 600 },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    titleFont: { size: 12, weight: '600' },
                                    bodyFont: { size: 13, weight: '700' },
                                    padding: { top: 10, bottom: 10, left: 14, right: 14 },
                                    cornerRadius: 10,
                                    displayColors: false,
                                    borderColor: 'rgba(16, 185, 129, 0.3)',
                                    borderWidth: 1,
                                    callbacks: {
                                        title: function(items) { return items[0] ? items[0].label : ''; },
                                        label: function(item) { return formatPrice(item.raw) + ' ' + unitLabel; }
                                    }
                                }
                            },
                            interaction: { intersect: false, mode: 'index' },
                            scales: {
                                x: {
                                    display: true,
                                    ticks: { maxRotation: 45, maxTicksLimit: days <= 14 ? 14 : 10, font: { size: 11 }, color: 'rgba(139, 157, 195, 0.8)' },
                                    grid: { display: false },
                                    border: { display: false }
                                },
                                y: {
                                    display: true,
                                    suggestedMin: minVal * 0.998,
                                    suggestedMax: maxVal * 1.002,
                                    ticks: {
                                        callback: function(v) {
                                            if (typeof v !== 'number') return v;
                                            return v.toLocaleString(yLoc);
                                        },
                                        font: { size: 11 },
                                        color: 'rgba(139, 157, 195, 0.8)',
                                        maxTicksLimit: 8
                                    },
                                    grid: { color: 'rgba(45, 63, 95, 0.5)', drawTicks: false },
                                    border: { display: false }
                                }
                            }
                        }
                    });
                    const changeNum = firstVal && lastVal ? (lastVal - firstVal) / firstVal * 100 : null;
                    const changeStr = changeNum != null ? changeNum.toFixed(1) : null;
                    const changeClass = changeNum > 0 ? 'up' : changeNum < 0 ? 'down' : 'neutral';
                    const dayChangeNum = prevDayVal && lastVal ? (lastVal - prevDayVal) / prevDayVal * 100 : null;
                    const dayChangeStr = dayChangeNum != null ? dayChangeNum.toFixed(2) : null;
                    const dayChangeClass = dayChangeNum > 0 ? 'up' : dayChangeNum < 0 ? 'down' : 'neutral';
                    if (statsRow) {
                        statsRow.innerHTML =
                            '<div class="rates-charts-stat-card stat-current"><span class="stat-label">' + t('rates_charts_stat_current') + '</span><span class="stat-value">' + formatPrice(lastVal) + ' <span class="rates-charts-unit">' + unitLabel + '</span></span></div>' +
                            '<div class="rates-charts-stat-card stat-change ' + dayChangeClass + '"><span class="stat-label">' + t('rates_charts_stat_day_change') + '</span><span class="stat-value">' + (dayChangeStr != null ? ((dayChangeNum > 0 ? '+' : '') + dayChangeStr + '%') : '—') + '</span></div>' +
                            '<div class="rates-charts-stat-card"><span class="stat-label">' + t('rates_charts_stat_avg') + '</span><span class="stat-value">' + formatPrice(Math.round(avgVal)) + '</span></div>' +
                            '<div class="rates-charts-stat-card"><span class="stat-label">' + t('rates_charts_stat_min') + '</span><span class="stat-value">' + formatPrice(minVal) + '</span></div>' +
                            '<div class="rates-charts-stat-card"><span class="stat-label">' + t('rates_charts_stat_max') + '</span><span class="stat-value">' + formatPrice(maxVal) + '</span></div>' +
                            (changeStr != null ? '<div class="rates-charts-stat-card stat-change ' + changeClass + '"><span class="stat-label">' + t('rates_charts_stat_change') + '</span><span class="stat-value">' + (changeNum > 0 ? '+' : '') + changeStr + '% ' + t('rates_charts_in_period') + '</span></div>' : '');
                    }
                    ratesChartsRenderTable(points);
                    if (summaryEl) summaryEl.innerHTML = '';
                } else {
                    if (res.ok && payload.externalConfigured === false) {
                        ratesChartsShowEmpty(summaryEl, statsRow, t('rates_charts_api_not_configured'), false);
                    } else if (!res.ok) {
                        const errMsg = typeof getApiError === 'function' ? getApiError(res) : (res.error || t('rates_charts_error_load'));
                        ratesChartsShowEmpty(summaryEl, statsRow, errMsg, true);
                    } else {
                        ratesChartsShowEmpty(summaryEl, statsRow, t('rates_charts_empty'), true);
                    }
                }
            } catch (err) {
                if (loadId !== ratesChartsLoadSeq) return;
                if (loadingOverlay) loadingOverlay.classList.remove('visible');
                if (refreshBtn) refreshBtn.classList.remove('loading');
                ratesChartsShowEmpty(summaryEl, statsRow, t('rates_charts_error_load'), true);
                console.error('loadRatesCharts error:', err);
            }
        }
        window.loadRatesCharts = loadRatesCharts;

        function updateTickerTimeOnly() {
            const timesEl = document.getElementById('tickerTimes');
            if (!timesEl || timesEl.style.display === 'none') return;
            const fmt = formatTickerDateTime();
            timesEl.innerHTML = '<span class="ticker-dt-label">' + escapeHtml(fmt.label) + '</span>' +
                '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.iranLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.iran) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.shamsi) + '</span></span>' +
                '<span class="ticker-sep">·</span>' +
                '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.turkeyLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.turkey) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.miladi) + '</span></span>' +
                '<span class="ticker-sep">·</span>' +
                '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.uaeLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.uae) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.hijri) + '</span></span>';
        }
        function startRatesInterval() {
            if (ratesInterval) clearInterval(ratesInterval);
            if (tickerTimeInterval) clearInterval(tickerTimeInterval);
            ratesInterval = null;
            tickerTimeInterval = null;
            if (HIDDEN_SECTIONS && HIDDEN_SECTIONS.indexOf('rates') >= 0) return;
            fetchRates();
            ratesInterval = setInterval(fetchRates, 10 * 60 * 1000);
        }
        function rateLabel(key) { return t(key) || key; }
        async function loadRatesAdjustments() {
            const el = document.getElementById('ratesAdjustmentsTable');
            if (!el) return;
            el.innerHTML = t('loading');
            const canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { el.innerHTML = '<div class="empty">' + t('rates_no_access') + '</div>'; return; }
            const ratesRes = await apiFetch('/api/rates');
            const adjRes = await apiFetch('/api/rates/adjustments');
            if (ratesRes.needLogin || adjRes.needLogin) return;
            if (!adjRes.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(adjRes.data && adjRes.data.error ? adjRes.data.error : '') + '</div>'; return; }
            const items = (ratesRes.ok && ratesRes.data && (ratesRes.data.allItems || ratesRes.data.items)) ? (ratesRes.data.allItems || ratesRes.data.items) : [];
            const adjList = (adjRes.data && adjRes.data.data) || [];
            const adjMap = {};
            adjList.forEach(function(a) { adjMap[a.currencyKey] = a; });
            function getRatePlaceholder(type) { return type === 'percent' ? t('rates_ph_percent') : type === 'delta_toman' ? t('rates_ph_delta') : t('rates_ph_fixed'); }
            let tableHtml = '<table class="sup-table" style="margin-top:0;"><thead><tr><th>' + t('rates_currency') + '</th><th>' + t('rates_current') + '</th><th>' + t('rates_adjust_type') + '</th><th>' + t('rates_value') + '</th></tr></thead><tbody>';
            let cardsHtml = '';
            items.forEach(function(it) {
                const adj = adjMap[it.key] || { adjustmentType: 'none', value: null };
                const type = adj.adjustmentType || 'none';
                const val = adj.value != null ? adj.value : '';
                const typeOpts = '<option value="none"' + (type === 'none' ? ' selected' : '') + '>' + t('rates_none') + '</option><option value="fixed"' + (type === 'fixed' ? ' selected' : '') + '>' + t('rates_fixed') + '</option><option value="delta_toman"' + (type === 'delta_toman' ? ' selected' : '') + '>' + t('rates_delta') + '</option><option value="percent"' + (type === 'percent' ? ' selected' : '') + '>' + t('rates_percent') + '</option>';
                const disp = (it.value != null && it.value !== '' && !isNaN(parseFloat(it.value))) ? formatPrice(it.value) : '—';
                const ph = getRatePlaceholder(type);
                tableHtml += '<tr><td>' + escapeHtml(rateLabel(it.key)) + '</td><td><strong>' + disp + '</strong></td><td><select data-rate-key="' + escapeHtml(it.key) + '" data-rate-type="type">' + typeOpts + '</select></td><td><input type="number" step="any" data-rate-key="' + escapeHtml(it.key) + '" data-rate-value="value" value="' + (val !== '' ? escapeHtml(String(val)) : '') + '" placeholder="' + escapeHtml(ph) + '"></td></tr>';
                cardsHtml += '<div class="rate-card" data-rate-key="' + escapeHtml(it.key) + '"><div class="rate-card-currency">' + escapeHtml(rateLabel(it.key)) + '</div><div class="rate-card-price">' + disp + '</div><div class="rate-card-type"><label>' + t('rates_adjust_type') + '</label><select data-rate-key="' + escapeHtml(it.key) + '" data-rate-type="type">' + typeOpts + '</select></div><div class="rate-card-value"><label>' + t('rates_value') + '</label><input type="number" step="any" data-rate-key="' + escapeHtml(it.key) + '" data-rate-value="value" value="' + (val !== '' ? escapeHtml(String(val)) : '') + '" placeholder="' + escapeHtml(ph) + '"></div></div>';
            });
            tableHtml += '</tbody></table>';
            el.innerHTML = '<div class="rates-table-wrap">' + tableHtml + '</div><div class="rates-cards-wrap">' + cardsHtml + '</div>';
            el.querySelectorAll('select[data-rate-key]').forEach(function(sel) {
                sel.addEventListener('change', function() {
                    const key = this.getAttribute('data-rate-key');
                    const inps = document.querySelectorAll('input[data-rate-key="' + key.replace(/"/g, '\\"') + '"]');
                    const ph = getRatePlaceholder(this.value);
                    inps.forEach(function(inp) { inp.placeholder = ph; });
                });
            });
        }
        async function saveRatesAdjustments() {
            const container = document.getElementById('ratesAdjustmentsTable');
            if (!container) return;
            const isMobile = window.matchMedia('(max-width: 900px)').matches;
            const items = isMobile ? container.querySelectorAll('.rate-card') : container.querySelectorAll('tbody tr');
            const adjustments = [];
            items.forEach(function(el) {
                const typeSel = el.querySelector('select[data-rate-key]');
                const valInp = el.querySelector('input[data-rate-key]');
                if (!typeSel || !valInp) return;
                const key = typeSel.getAttribute('data-rate-key');
                const type = typeSel.value || 'none';
                const val = valInp.value.trim();
                adjustments.push({ currencyKey: key, adjustmentType: type, value: (type !== 'none' && val !== '') ? parseFloat(val) : null });
            });
            const res = await apiFetch('/api/rates/adjustments', { method: 'PUT', body: JSON.stringify({ adjustments: adjustments }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved')); fetchRates(); loadRatesAdjustments(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        let tickerConfigVisibleKeys = [];
        async function loadTickerConfig() {
            const box = document.getElementById('ratesTickerConfigBox');
            const listEl = document.getElementById('ratesTickerConfigList');
            const availEl = document.getElementById('ratesTickerConfigAvailable');
            if (!box || !listEl || !availEl) return;
            const canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            const res = await apiFetch('/api/rates/ticker-config');
            if (res.needLogin || !res.ok) return;
            const visibleKeys = (res.data && res.data.visibleKeys) || [];
            const available = (res.data && res.data.availableKeys) || [];
            tickerConfigVisibleKeys = visibleKeys.slice();
            listEl.innerHTML = tickerConfigVisibleKeys.map(function(k) {
                const lab = (available.find(function(a) { return a.key === k; }) || {}).label || rateLabel(k);
                return '<span class="ticker-config-chip" data-key="' + escapeHtml(k) + '">' + escapeHtml(lab) + ' <span class="chip-remove" data-remove-key="' + escapeHtml(k) + '">×</span></span>';
            }).join('');
            listEl.querySelectorAll('.chip-remove').forEach(function(btn) {
                btn.onclick = function() { removeTickerCurrency(this.getAttribute('data-remove-key')); };
            });
            const remaining = available.filter(function(a) { return tickerConfigVisibleKeys.indexOf(a.key) === -1; });
            availEl.innerHTML = remaining.length ? remaining.map(function(a) {
                return '<span class="ticker-config-add" data-add-key="' + escapeHtml(a.key) + '">+ ' + escapeHtml(a.label) + '</span>';
            }).join('') : '';
            availEl.querySelectorAll('.ticker-config-add').forEach(function(btn) {
                btn.onclick = function() { addTickerCurrency(this.getAttribute('data-add-key')); };
            });
        }
        function addTickerCurrency(key) {
            if (tickerConfigVisibleKeys.indexOf(key) === -1) { tickerConfigVisibleKeys.push(key); loadTickerConfig(); }
        }
        function removeTickerCurrency(key) {
            tickerConfigVisibleKeys = tickerConfigVisibleKeys.filter(function(k) { return k !== key; });
            loadTickerConfig();
        }
        async function saveTickerConfig() {
            const res = await apiFetch('/api/rates/ticker-config', { method: 'PUT', body: JSON.stringify({ visibleKeys: tickerConfigVisibleKeys }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved')); fetchRates(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadCurrencies() {
            const box = document.getElementById('ratesCurrenciesBox');
            const listEl = document.getElementById('ratesCurrenciesList');
            if (!box || !listEl) return;
            const canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            listEl.innerHTML = t('loading');
            listEl.classList.add('empty');
            const res = await apiFetch('/api/rates/currencies');
            if (res.needLogin) return;
            if (!res.ok) { listEl.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            if (data.length === 0) { listEl.innerHTML = '<div class="empty">' + (t('rates_no_currencies') || 'هنوز ارزی تعریف نشده. با «افزودن ارز» یکی اضافه کنید.') + '</div>'; return; }
            listEl.classList.remove('empty');
            listEl.innerHTML = data.map(function(c) {
                const apiStr = (c.apiKeys && c.apiKeys.length) ? c.apiKeys.join(', ') : '—';
                const apiDataAttr = (c.apiKeys && c.apiKeys.length) ? escapeHtml(apiStr.replace(/"/g, '&quot;')) : '';
                const labelAttr = escapeHtml((c.label || c.key).replace(/"/g, '&quot;'));
                return '<div class="rates-currency-row" data-key="' + escapeHtml(c.key) + '" data-label="' + labelAttr + '" data-apikeys="' + apiDataAttr + '"><span class="currency-key">' + escapeHtml(c.key) + '</span><span class="currency-label">' + escapeHtml(c.label || c.key) + '</span><span class="currency-apikeys">' + escapeHtml(apiStr) + '</span><div class="currency-actions"><button type="button" class="edit" onclick="openCurrencyModal(\'' + escapeHtml(c.key).replace(/'/g, "\\'") + '\')">' + (t('btn_edit') || t('edit') || 'ویرایش') + '</button><button type="button" class="delete" onclick="deleteCurrency(\'' + escapeHtml(c.key).replace(/'/g, "\\'") + '\')">' + (t('btn_delete') || 'حذف') + '</button></div></div>';
            }).join('');
        }
        async function checkRatesApiKeyStatus() {
            const header = document.querySelector('#pageRates .rates-page-header');
            if (!header) return;
            const existingAlert = document.getElementById('ratesApiKeyAlert');
            if (existingAlert) existingAlert.remove();
            const res = await apiFetch('/api/rates/config-status');
            if (res.needLogin || !res.ok) return;
            if (res.data && res.data.hasApiKey === false) {
                const alert = document.createElement('div');
                alert.id = 'ratesApiKeyAlert';
                alert.className = 'rates-apikey-alert';
                alert.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                    + ' <span>کلید API ناواسان (<code>NAVASAN_API_KEY</code>) در فایل <code>.env</code> سرور تنظیم نشده. نرخ‌های لحظه‌ای دریافت نمی‌شوند.'
                    + ' برای دریافت کلید رایگان به <a href="https://navasan.tech" target="_blank" rel="noopener">navasan.tech</a> مراجعه کنید.'
                    + ' تا آن زمان می‌توانید نرخ <strong>ثابت (fixed)</strong> دستی برای هر ارز تنظیم کنید.</span>';
                header.appendChild(alert);
            }
        }

        function openCurrencyModal(existingKey) {
            const modal = document.getElementById('currencyModal');
            const titleEl = document.getElementById('currencyModalTitle');
            const keyInp = document.getElementById('currencyModalKey');
            const keyOriginal = document.getElementById('currencyModalKeyOriginal');
            const labelInp = document.getElementById('currencyModalLabel');
            const apiKeysInp = document.getElementById('currencyModalApiKeys');
            if (!modal || !keyInp) return;
            keyOriginal.value = existingKey || '';
            if (existingKey) {
                if (titleEl) titleEl.textContent = t('rates_edit_currency') || 'ویرایش ارز';
                keyInp.value = existingKey;
                keyInp.readOnly = true;
                keyInp.style.opacity = '0.8';
                const row = document.querySelector('.rates-currency-row[data-key="' + existingKey.replace(/"/g, '\\"') + '"]');
                if (row) {
                    labelInp.value = row.getAttribute('data-label') || existingKey;
                    apiKeysInp.value = row.getAttribute('data-apikeys') || '';
                } else { labelInp.value = existingKey; apiKeysInp.value = ''; }
            } else {
                if (titleEl) titleEl.textContent = t('rates_add_currency') || 'افزودن ارز';
                keyInp.value = '';
                keyInp.readOnly = false;
                keyInp.style.opacity = '1';
                labelInp.value = '';
                apiKeysInp.value = '';
            }
            modal.style.display = 'flex';
        }
        function closeCurrencyModal() {
            const modal = document.getElementById('currencyModal');
            if (modal) modal.style.display = 'none';
        }
        async function saveCurrencyFromModal() {
            const keyOriginal = (document.getElementById('currencyModalKeyOriginal') || {}).value;
            const key = (document.getElementById('currencyModalKey') || {}).value.trim().toLowerCase();
            const label = (document.getElementById('currencyModalLabel') || {}).value.trim() || key;
            const apiKeysStr = (document.getElementById('currencyModalApiKeys') || {}).value.trim();
            if (!key) { toast(t('rates_currency_key_required') || 'کلید ارز الزامی است', true); return; }
            const apiKeys = apiKeysStr ? apiKeysStr.split(/[\s,،]+/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
            let res;
            if (keyOriginal) {
                res = await apiFetch('/api/rates/currencies/' + encodeURIComponent(keyOriginal), { method: 'PUT', body: JSON.stringify({ label: label, apiKeys: apiKeys }) });
            } else {
                res = await apiFetch('/api/rates/currencies', { method: 'POST', body: JSON.stringify({ key: key, label: label, apiKeys: apiKeys }) });
            }
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved')); closeCurrencyModal(); loadCurrencies(); loadRatesAdjustments(); loadTickerConfig(); fetchRates(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteCurrency(key) {
            if (!confirm((t('rates_delete_currency_confirm') || 'حذف این ارز؟ تعدیلات و نمایش در نوار قیمت آن هم حذف می‌شود.'))) return;
            const res = await apiFetch('/api/rates/currencies/' + encodeURIComponent(key), { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved') || 'ذخیره شد'); loadCurrencies(); loadRatesAdjustments(); loadTickerConfig(); fetchRates(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function initServicesTabs() {
            const tabs = document.querySelectorAll('.services-tab');
            const panels = document.querySelectorAll('.services-panel');
            const tabMap = { summary: 'Summary', statement: 'Statement', services: 'Services', cashboxes: 'Cashboxes', bankaccounts: 'Bankaccounts', transactions: 'Transactions', reports: 'Reports' };
            tabs.forEach(function(tab) {
                tab.onclick = function() {
                    const t = tab.getAttribute('data-tab');
                    tabs.forEach(function(x) { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
                    panels.forEach(function(p) { p.classList.remove('show'); });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    const panel = document.getElementById('services' + (tabMap[t] || 'Summary') + 'Panel');
                    if (panel) { panel.classList.add('show'); }
                    if (t === 'summary') loadServicesSummary();
                    else if (t === 'statement') loadStatement();
                    else if (t === 'services') loadServices();
                    else if (t === 'cashboxes') loadCashBoxes();
                    else if (t === 'bankaccounts') loadBankAccounts();
                    else if (t === 'transactions') { loadCustomerFilterForTransactions(); loadTransactions(); }
                    else if (t === 'reports') { loadCurrentReport(); }
                };
            });
        }
        async function loadCustomerFilterForTransactions() {
            const sel = document.getElementById('txCustomerFilter');
            if (!sel) return;
            const res = await apiFetch('/api/customers?limit=500');
            const list = (res.data && res.data.data) || [];
            const curVal = sel.value;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'همه مشتریان' : 'All customers') + '</option>' + list.map(function(c) { return '<option value="' + c.id + '">' + escapeHtml(c.name || c.phone || '') + '</option>'; }).join('');
            if (curVal) sel.value = curVal;
        }
        function loadServicesPage() {
            const active = document.querySelector('.services-tab.active');
            const t = active ? active.getAttribute('data-tab') : 'summary';
            if (t === 'summary') loadServicesSummary();
            else if (t === 'statement') loadStatement();
            else if (t === 'services') loadServices();
            else if (t === 'cashboxes') loadCashBoxes();
            else if (t === 'bankaccounts') loadBankAccounts();
            else if (t === 'transactions') { loadCustomerFilterForTransactions(); loadTransactions(); }
            else if (t === 'reports') { loadCurrentReport(); }
        }
        const currencySymbols = { USD: '$', EUR: '€', GBP: '£', DHS: 'د.إ', TRY: '₺', RUB: '₽', USDT: '₮', IRR: 'تومان', TMN: 'تومان' };
        function formatMoney(n, curr) { const x = parseFloat(n) || 0; const sym = currencySymbols[curr] || curr || 'تومان'; return x.toLocaleString('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + sym; }
        function formatMoneyEn(n) { const x = parseFloat(n) || 0; return x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
        async function loadServicesSummary() {
            const [sumRes, cpRes] = await Promise.all([
                apiFetch('/api/exchange/summary'),
                apiFetch('/api/exchange/currency-position')
            ]);
            if (sumRes.needLogin || !sumRes.ok) return;
            const d = sumRes.data || {};
            const totalCashEl = document.getElementById('summaryTotalCash');
            const totalBankEl = document.getElementById('summaryTotalBank');
            const totalEl = document.getElementById('summaryTotal');
            if (totalCashEl) totalCashEl.textContent = formatMoney(d.totalCash, 'IRR');
            if (totalBankEl) totalBankEl.textContent = formatMoney(d.totalBank, 'IRR');
            if (totalEl) totalEl.textContent = formatMoney(d.total, 'IRR');
            const cb = document.getElementById('summaryCashBoxes');
            const ba = document.getElementById('summaryBankAccounts');
            if (cb) cb.innerHTML = (d.cashBoxes || []).map(function(b) { return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(b.name) + (b.branch && b.branch.name ? ' (' + escapeHtml(b.branch.name) + ')' : '') + '</span><span class="balance">' + formatMoney(b.balance, b.currency) + '</span></div>'; }).join('') || '<div class="empty">' + (LANG === 'fa' ? 'صندوقی تعریف نشده' : 'No cash boxes') + '</div>';
            if (ba) ba.innerHTML = (d.bankAccounts || []).map(function(b) { return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(b.name) + (b.branch && b.branch.name ? ' (' + escapeHtml(b.branch.name) + ')' : '') + '</span><span class="balance">' + formatMoney(b.balance, b.currency) + '</span></div>'; }).join('') || '<div class="empty">' + (LANG === 'fa' ? 'حساب بانکی تعریف نشده' : 'No bank accounts') + '</div>';

            if (cpRes.ok && cpRes.data) {
                const cp = cpRes.data;
                const cpEl = document.getElementById('summaryCurrencyPosition');
                if (cpEl) {
                    const posEntries = Object.entries(cp.currencyPosition || {});
                    cpEl.innerHTML = posEntries.length ? posEntries.map(function(e) {
                        return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(e[0]) + '</span><span class="balance">' + formatMoneyEn(e[1].total) + '</span></div>';
                    }).join('') : '<div class="empty">' + (LANG === 'fa' ? 'داده‌ای نیست' : 'No data') + '</div>';
                }
                const obEl = document.getElementById('summaryOutstandingBalance');
                if (obEl) {
                    const obs = cp.outstandingBalance || [];
                    const totalOB = obs.reduce(function(s, o) { return s + o.balance; }, 0);
                    obEl.innerHTML = obs.length ? obs.map(function(o) {
                        return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(o.account) + ' <small style="color:var(--text-muted)">' + escapeHtml(o.currency) + '</small></span><span class="balance">' + formatMoneyEn(o.balance) + '</span></div>';
                    }).join('') + '<div class="exchange-summary-item" style="border-color:var(--accent);"><span class="name" style="font-weight:700;">' + (LANG === 'fa' ? 'مجموع' : 'Total') + '</span><span class="balance" style="font-weight:700;">' + formatMoneyEn(totalOB) + '</span></div>' : '<div class="empty">' + (LANG === 'fa' ? 'داده‌ای نیست' : 'No data') + '</div>';
                }
                const piEl = document.getElementById('summaryPendingInward');
                if (piEl) {
                    const piEntries = Object.entries(cp.pendingInward || {});
                    piEl.innerHTML = piEntries.length ? piEntries.map(function(e) {
                        return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(e[0]) + '</span><span class="balance" style="color:var(--accent);">' + formatMoneyEn(e[1]) + '</span></div>';
                    }).join('') : '<div class="empty">' + (LANG === 'fa' ? 'دریافتی در انتظار نیست' : 'No pending inward') + '</div>';
                }
                const poEl = document.getElementById('summaryPendingOutward');
                if (poEl) {
                    const poEntries = Object.entries(cp.pendingOutward || {});
                    poEl.innerHTML = poEntries.length ? poEntries.map(function(e) {
                        return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(e[0]) + '</span><span class="balance" style="color:var(--danger);">' + formatMoneyEn(e[1]) + '</span></div>';
                    }).join('') : '<div class="empty">' + (LANG === 'fa' ? 'پرداختی در انتظار نیست' : 'No pending outward') + '</div>';
                }
                renderCommitmentTable(cp);
                renderBankPositionTable(cp);
            }
        }
        async function loadCashBoxes() {
            const list = document.getElementById('cashBoxList');
            if (!list) return;
            list.innerHTML = t('loading');
            const res = await apiFetch('/api/exchange/cash-boxes');
            if (res.needLogin || !res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error || t('err_generic')) + '</div>'; return; }
            const data = res.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'صندوقی تعریف نشده. افزودن صندوق کنید.' : 'No cash boxes. Add one.') + '</div>'; return; }
            list.innerHTML = data.map(function(b) {
                const badge = b.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(b.name) + '</span><div class="meta">' + (b.branch ? escapeHtml(b.branch.name) : '') + ' · ' + formatMoney(b.balance, b.currency) + '</div></div>' + badge + '<div><button type="button" class="btn-secondary btn-sm" onclick="openCashBoxModal(\'' + b.id + '\')">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> <button type="button" class="btn-secondary btn-sm" onclick="deleteCashBox(\'' + b.id + '\')">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div></div>';
            }).join('');
        }
        async function loadBankAccounts() {
            const list = document.getElementById('bankAccountList');
            if (!list) return;
            list.innerHTML = t('loading');
            const res = await apiFetch('/api/exchange/bank-accounts');
            if (res.needLogin || !res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error || t('err_generic')) + '</div>'; return; }
            const data = res.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'حساب بانکی تعریف نشده. افزودن حساب کنید.' : 'No bank accounts. Add one.') + '</div>'; return; }
            list.innerHTML = data.map(function(b) {
                const badge = b.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(b.name) + '</span><div class="meta">' + (b.bankName ? escapeHtml(b.bankName) + ' · ' : '') + formatMoney(b.balance, b.currency) + '</div></div>' + badge + '<div><button type="button" class="btn-secondary btn-sm" onclick="openBankAccountModal(\'' + b.id + '\')">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> <button type="button" class="btn-secondary btn-sm" onclick="deleteBankAccount(\'' + b.id + '\')">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div></div>';
            }).join('');
        }
        async function loadTransactions() {
            const list = document.getElementById('transactionList');
            if (!list) return;
            list.innerHTML = t('loading');
            const params = [];
            const from = document.getElementById('txFromDate'); if (from && from.value) params.push('fromDate=' + encodeURIComponent(from.value));
            const to = document.getElementById('txToDate'); if (to && to.value) params.push('toDate=' + encodeURIComponent(to.value));
            const typ = document.getElementById('txTypeFilter'); if (typ && typ.value) params.push('type=' + encodeURIComponent(typ.value));
            const st = document.getElementById('txStatusFilter'); if (st && st.value) params.push('status=' + encodeURIComponent(st.value));
            const cust = document.getElementById('txCustomerFilter'); if (cust && cust.value) params.push('customerId=' + encodeURIComponent(cust.value));
            const res = await apiFetch('/api/exchange/transactions?' + params.join('&'));
            if (res.needLogin || !res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error || t('err_generic')) + '</div>'; return; }
            const rows = (res.data && res.data.rows) || [];
            if (rows.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'تراکنشی یافت نشد' : 'No transactions') + '</div>'; return; }
            const typeLabels = { cash_in: 'ورود به صندوق', cash_out: 'خروج از صندوق', transfer_box: 'انتقال صندوق', bank_deposit: 'واریز بانک', bank_withdraw: 'برداشت بانک', transfer_account: 'انتقال حساب', income: 'درآمد', expense: 'هزینه', buy: 'خرید', sell: 'فروش' };
            const statusLabels = { pending: 'در انتظار تأیید', approved: 'تأیید شده', rejected: 'رد شده' };
            const statusClasses = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
            const canApprove = currentUser && ['owner', 'admin', 'manager'].indexOf(currentUser.role) >= 0;
            list.innerHTML = rows.map(function(tx) {
                const isIn = ['cash_in','transfer_box','bank_withdraw','income'].indexOf(tx.type) >= 0;
                const amt = parseFloat(tx.amount) || 0;
                const desc = (tx.description || '').slice(0, 60) + (tx.description && tx.description.length > 60 ? '…' : '');
                const ref = tx.reference ? ' · ' + escapeHtml(tx.reference) : '';
                const custName = (tx.customer && (tx.customer.name || tx.customer.phone)) ? escapeHtml(tx.customer.name || tx.customer.phone) : '';
                const custLink = tx.customerId ? '<a href="#" onclick="showPage(\'customers\'); showCustomerHistory(\'' + tx.customerId + '\'); return false;" class="tx-customer-link">' + custName + '</a>' : '';
                const statusBadge = '<span class="badge ' + (statusClasses[tx.status] || '') + '">' + (statusLabels[tx.status] || tx.status || 'pending') + '</span>';
                let actions = '<div class="tx-row-actions">';
                actions += '<button type="button" class="btn-secondary btn-sm" onclick="openTransactionModalForEdit(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button>';
                if (tx.status === 'pending' && canApprove) {
                    actions += ' <button type="button" class="btn-primary btn-sm" onclick="approveTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '">' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '</button>';
                    actions += ' <button type="button" class="btn-secondary btn-sm" onclick="rejectTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'رد' : 'Reject') + '">' + (LANG === 'fa' ? 'رد' : 'Reject') + '</button>';
                }
                actions += '</div>';
                return '<div class="transaction-row" data-tx-id="' + tx.id + '"><div><span class="tx-type">' + (typeLabels[tx.type] || tx.type) + '</span> ' + statusBadge + (custLink ? ' <span class="tx-cust">' + custLink + '</span>' : '') + '<div class="meta" style="margin-top:4px;">' + escapeHtml(desc) + ref + '</div><div class="meta">' + (tx.transactionDate || '') + '</div></div><div class="tx-row-right"><span class="tx-amount ' + (isIn ? 'positive' : 'negative') + '">' + (isIn ? '+' : '-') + formatMoney(amt, tx.currency) + '</span>' + actions + '</div></div>';
            }).join('');
        }
        function openCashBoxModal(id) {
            const m = document.getElementById('cashBoxModal'); if (!m) return;
            m.style.display = 'flex';
            document.getElementById('cashBoxModalId').value = id || '';
            document.getElementById('cashBoxModalTitle').textContent = id ? (LANG === 'fa' ? 'ویرایش صندوق' : 'Edit cash box') : t('cashbox_add');
            document.getElementById('cashBoxModalName').value = '';
            document.getElementById('cashBoxModalBranch').value = '';
            document.getElementById('cashBoxModalCurrency').value = 'IRR';
            document.getElementById('cashBoxModalBalance').value = '0';
            document.getElementById('cashBoxModalDescription').value = '';
            document.getElementById('cashBoxModalActive').checked = true;
            loadBranchesForSelect(['cashBoxModalBranch']);
            if (id) apiFetch('/api/exchange/cash-boxes').then(function(r) { const b = (r.data || []).find(function(x) { return x.id === id; }); if (b) { document.getElementById('cashBoxModalName').value = b.name || ''; document.getElementById('cashBoxModalBranch').value = b.branchId || ''; document.getElementById('cashBoxModalCurrency').value = b.currency || 'IRR'; document.getElementById('cashBoxModalBalance').value = b.balance || 0; document.getElementById('cashBoxModalDescription').value = b.description || ''; document.getElementById('cashBoxModalActive').checked = b.isActive !== false; } });
        }
        function closeCashBoxModal() { const m = document.getElementById('cashBoxModal'); if (m) m.style.display = 'none'; }
        async function saveCashBoxFromModal() {
            const id = document.getElementById('cashBoxModalId').value.trim();
            const name = document.getElementById('cashBoxModalName').value.trim();
            const branchId = document.getElementById('cashBoxModalBranch').value || null;
            const currency = document.getElementById('cashBoxModalCurrency').value;
            const balance = parseFloat(document.getElementById('cashBoxModalBalance').value) || 0;
            const description = document.getElementById('cashBoxModalDescription').value.trim() || null;
            const isActive = document.getElementById('cashBoxModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام صندوق الزامی است' : 'Name required', true); return; }
            const body = { name, branchId, currency, balance, description, isActive };
            const res = id ? await apiFetch('/api/exchange/cash-boxes/' + id, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/api/exchange/cash-boxes', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeCashBoxModal(); toast(t('btn_save')); loadCashBoxes(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteCashBox(id) { if (!confirm(LANG === 'fa' ? 'حذف این صندوق؟' : 'Delete this cash box?')) return; const res = await apiFetch('/api/exchange/cash-boxes/' + id, { method: 'DELETE' }); if (res.needLogin) return; if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadCashBoxes(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); } }
        function openBankAccountModal(id) {
            const m = document.getElementById('bankAccountModal'); if (!m) return;
            m.style.display = 'flex';
            document.getElementById('bankAccountModalId').value = id || '';
            document.getElementById('bankAccountModalTitle').textContent = id ? (LANG === 'fa' ? 'ویرایش حساب بانکی' : 'Edit bank account') : t('bankaccount_add');
            document.getElementById('bankAccountModalName').value = '';
            document.getElementById('bankAccountModalBankName').value = '';
            document.getElementById('bankAccountModalAccountNumber').value = '';
            document.getElementById('bankAccountModalIban').value = '';
            document.getElementById('bankAccountModalBranch').value = '';
            document.getElementById('bankAccountModalCurrency').value = 'IRR';
            document.getElementById('bankAccountModalBalance').value = '0';
            document.getElementById('bankAccountModalDescription').value = '';
            document.getElementById('bankAccountModalActive').checked = true;
            loadBranchesForSelect(['bankAccountModalBranch']);
            if (id) apiFetch('/api/exchange/bank-accounts').then(function(r) { const b = (r.data || []).find(function(x) { return x.id === id; }); if (b) { document.getElementById('bankAccountModalName').value = b.name || ''; document.getElementById('bankAccountModalBankName').value = b.bankName || ''; document.getElementById('bankAccountModalAccountNumber').value = b.accountNumber || ''; document.getElementById('bankAccountModalIban').value = b.iban || ''; document.getElementById('bankAccountModalBranch').value = b.branchId || ''; document.getElementById('bankAccountModalCurrency').value = b.currency || 'IRR'; document.getElementById('bankAccountModalBalance').value = b.balance || 0; document.getElementById('bankAccountModalDescription').value = b.description || ''; document.getElementById('bankAccountModalActive').checked = b.isActive !== false; } });
        }
        function closeBankAccountModal() { const m = document.getElementById('bankAccountModal'); if (m) m.style.display = 'none'; }
        async function saveBankAccountFromModal() {
            const id = document.getElementById('bankAccountModalId').value.trim();
            const name = document.getElementById('bankAccountModalName').value.trim();
            const bankName = document.getElementById('bankAccountModalBankName').value.trim() || null;
            const accountNumber = document.getElementById('bankAccountModalAccountNumber').value.trim() || null;
            const iban = document.getElementById('bankAccountModalIban').value.trim() || null;
            const branchId = document.getElementById('bankAccountModalBranch').value || null;
            const currency = document.getElementById('bankAccountModalCurrency').value;
            const balance = parseFloat(document.getElementById('bankAccountModalBalance').value) || 0;
            const description = document.getElementById('bankAccountModalDescription').value.trim() || null;
            const isActive = document.getElementById('bankAccountModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام حساب الزامی است' : 'Name required', true); return; }
            const body = { name, bankName, accountNumber, iban, branchId, currency, balance, description, isActive };
            const res = id ? await apiFetch('/api/exchange/bank-accounts/' + id, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/api/exchange/bank-accounts', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeBankAccountModal(); toast(t('btn_save')); loadBankAccounts(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteBankAccount(id) { if (!confirm(LANG === 'fa' ? 'حذف این حساب بانکی؟' : 'Delete this bank account?')) return; const res = await apiFetch('/api/exchange/bank-accounts/' + id, { method: 'DELETE' }); if (res.needLogin) return; if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadBankAccounts(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); } }
        function openTransactionModal(prefillCustomerId) {
            const m = document.getElementById('transactionModal'); if (!m) return;
            document.getElementById('txModalId').value = '';
            const titleEl = document.getElementById('txModalTitle'); if (titleEl) titleEl.textContent = LANG === 'fa' ? 'ثبت تراکنش' : 'Add transaction';
            const subEl = document.querySelector('.tx-modal-subtitle'); if (subEl) subEl.textContent = LANG === 'fa' ? 'اطلاعات تراکنش مالی را وارد کنید' : 'Enter financial transaction details';
            m.style.display = 'flex';
            document.getElementById('txModalType').value = 'cash_in';
            document.getElementById('txModalAmount').value = '';
            document.getElementById('txModalCurrency').value = 'IRR';
            document.getElementById('txModalFromCashBox').value = '';
            document.getElementById('txModalToCashBox').value = '';
            document.getElementById('txModalFromBankAccount').value = '';
            document.getElementById('txModalToBankAccount').value = '';
            document.getElementById('txModalCustomer').value = prefillCustomerId || '';
            document.getElementById('txModalDescription').value = '';
            document.getElementById('txModalReference').value = '';
            document.getElementById('txModalDate').value = new Date().toISOString().slice(0, 10);
            txModalUpdateFields();
            loadCashBoxesForTxSelect();
            loadBankAccountsForTxSelect();
            loadCustomersForTxSelect(prefillCustomerId);
        }
        async function openTransactionModalForEdit(txId) {
            const m = document.getElementById('transactionModal'); if (!m) return;
            const res = await apiFetch('/api/exchange/transactions/' + txId);
            if (!res.ok || !res.data) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            const tx = res.data;
            document.getElementById('txModalId').value = tx.id;
            const titleEl = document.getElementById('txModalTitle'); if (titleEl) titleEl.textContent = LANG === 'fa' ? 'ویرایش تراکنش' : 'Edit transaction';
            const subEl = document.querySelector('.tx-modal-subtitle'); if (subEl) subEl.textContent = LANG === 'fa' ? 'اطلاعات تراکنش را ویرایش کنید' : 'Edit transaction details';
            m.style.display = 'flex';
            document.getElementById('txModalType').value = tx.type || 'cash_in';
            document.getElementById('txModalAmount').value = tx.amount || '';
            document.getElementById('txModalCurrency').value = tx.currency || 'IRR';
            document.getElementById('txModalFromCashBox').value = tx.fromCashBoxId || '';
            document.getElementById('txModalToCashBox').value = tx.toCashBoxId || '';
            document.getElementById('txModalFromBankAccount').value = tx.fromBankAccountId || '';
            document.getElementById('txModalToBankAccount').value = tx.toBankAccountId || '';
            document.getElementById('txModalCustomer').value = tx.customerId || '';
            document.getElementById('txModalDescription').value = tx.description || '';
            document.getElementById('txModalReference').value = tx.reference || '';
            document.getElementById('txModalDate').value = (tx.transactionDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
            txModalUpdateFields();
            loadCashBoxesForTxSelect();
            loadBankAccountsForTxSelect();
            loadCustomersForTxSelect(tx.customerId);
        }
        async function approveTransaction(txId) {
            const res = await apiFetch('/api/exchange/transactions/' + txId + '/approve', { method: 'POST' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تراکنش تأیید شد' : 'Transaction approved'); loadTransactions(); loadServicesSummary(); if (currentCustomerId) loadCustomerTransactions(currentCustomerId); loadCustomerTimeline(currentCustomerId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function rejectTransaction(txId) {
            if (!confirm(LANG === 'fa' ? 'آیا از رد این تراکنش مطمئن هستید؟' : 'Reject this transaction?')) return;
            const res = await apiFetch('/api/exchange/transactions/' + txId + '/reject', { method: 'POST' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تراکنش رد شد' : 'Transaction rejected'); loadTransactions(); loadServicesSummary(); if (currentCustomerId) loadCustomerTransactions(currentCustomerId); loadCustomerTimeline(currentCustomerId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function txModalUpdateFields() {
            const t = document.getElementById('txModalType').value;
            const fromBox = document.getElementById('txModalFromBoxWrap'); const toBox = document.getElementById('txModalToBoxWrap');
            const fromBank = document.getElementById('txModalFromBankWrap'); const toBank = document.getElementById('txModalToBankWrap');
            const showFrom = ['cash_out','transfer_box','bank_deposit','expense','buy'].indexOf(t) >= 0;
            const showTo = ['cash_in','transfer_box','bank_withdraw','income','sell'].indexOf(t) >= 0;
            const showFromBank = ['bank_withdraw','transfer_account'].indexOf(t) >= 0;
            const showToBank = ['bank_deposit','transfer_account'].indexOf(t) >= 0;
            if (fromBox) fromBox.style.display = showFrom ? 'block' : 'none';
            if (toBox) toBox.style.display = showTo ? 'block' : 'none';
            if (fromBank) fromBank.style.display = showFromBank ? 'block' : 'none';
            if (toBank) toBank.style.display = showToBank ? 'block' : 'none';
            const dynSection = document.querySelector('.tx-modal-section-dynamic');
            if (dynSection) {
                if (showFrom || showTo || showFromBank || showToBank) { dynSection.classList.remove('tx-dynamic-hidden'); } else { dynSection.classList.add('tx-dynamic-hidden'); }
            }
        }
        async function loadCashBoxesForTxSelect() {
            const res = await apiFetch('/api/exchange/cash-boxes');
            const list = (res.data || []).filter(function(b) { return b.isActive; });
            const from = document.getElementById('txModalFromCashBox'); const to = document.getElementById('txModalToCashBox');
            if (from) { from.innerHTML = '<option value="">انتخاب صندوق</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
            if (to) { to.innerHTML = '<option value="">انتخاب صندوق</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
        }
        async function loadBankAccountsForTxSelect() {
            const res = await apiFetch('/api/exchange/bank-accounts');
            const list = (res.data || []).filter(function(b) { return b.isActive; });
            const from = document.getElementById('txModalFromBankAccount'); const to = document.getElementById('txModalToBankAccount');
            if (from) { from.innerHTML = '<option value="">انتخاب حساب</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
            if (to) { to.innerHTML = '<option value="">انتخاب حساب</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
        }
        async function loadCustomersForTxSelect(selectedId) {
            const res = await apiFetch('/api/customers?limit=500');
            const list = (res.data && res.data.data) || [];
            const sel = document.getElementById('txModalCustomer');
            if (!sel) return;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'بدون مشتری' : 'No customer') + '</option>' + list.map(function(c) { return '<option value="' + c.id + '"' + (c.id === selectedId ? ' selected' : '') + '>' + escapeHtml(c.name || c.phone || '') + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</option>'; }).join('');
        }
        (function(){ const el = document.getElementById('txModalType'); if (el) el.addEventListener('change', txModalUpdateFields); })();
        (function(){ const m = document.getElementById('transactionModal'); if (m) m.addEventListener('click', function(e) { if (e.target === m) closeTransactionModal(); }); })();
        function closeTransactionModal() { const m = document.getElementById('transactionModal'); if (m) m.style.display = 'none'; }
        async function saveTransactionFromModal() {
            const txId = (document.getElementById('txModalId') && document.getElementById('txModalId').value) || '';
            const type = document.getElementById('txModalType').value;
            const amount = parseFloat(document.getElementById('txModalAmount').value);
            const currency = document.getElementById('txModalCurrency').value;
            const fromBox = document.getElementById('txModalFromCashBox').value || null;
            const toBox = document.getElementById('txModalToCashBox').value || null;
            const fromBank = document.getElementById('txModalFromBankAccount').value || null;
            const toBank = document.getElementById('txModalToBankAccount').value || null;
            const customerId = document.getElementById('txModalCustomer').value || null;
            const description = document.getElementById('txModalDescription').value.trim() || null;
            const reference = document.getElementById('txModalReference').value.trim() || null;
            const date = document.getElementById('txModalDate').value || new Date().toISOString().slice(0, 10);
            if (!amount || amount <= 0) { toast(LANG === 'fa' ? 'مبلغ معتبر وارد کنید' : 'Enter valid amount', true); return; }
            const body = { type, amount, currency, fromCashBoxId: fromBox, toCashBoxId: toBox, fromBankAccountId: fromBank, toBankAccountId: toBank, customerId, description, reference, transactionDate: date };
            const res = txId ? await apiFetch('/api/exchange/transactions/' + txId, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/api/exchange/transactions', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeTransactionModal(); toast(LANG === 'fa' ? 'ذخیره شد' : 'Saved'); loadTransactions(); loadServicesSummary(); if (currentCustomerId) loadCustomerTransactions(currentCustomerId); loadCustomerTimeline(currentCustomerId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadServices() {
            const list = document.getElementById('serviceList');
            if (!list) return;
            list.innerHTML = t('loading');
            const res = await apiFetch('/api/services');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'هنوز سرویسی تعریف نشده. با دکمه افزودن سرویس اضافه کنید.' : 'No services yet. Add one with the button above.') + '</div>'; return; }
            list.innerHTML = data.map(function(s) {
                const badge = s.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(s.name) + '</span>' + (s.code ? '<div class="meta">' + escapeHtml(s.code) + '</div>' : '') + (s.category ? '<div class="meta">' + escapeHtml(s.category) + '</div>' : '') + (s.description ? '<div class="meta">' + escapeHtml((s.description || '').slice(0, 80)) + (s.description.length > 80 ? '…' : '') + '</div>' : '') + '</div>' + badge + '<div><button type="button" class="btn-secondary btn-sm" onclick="openServiceModal(\'' + s.id + '\')">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> <button type="button" class="btn-secondary btn-sm" onclick="deleteService(\'' + s.id + '\')">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div></div>';
            }).join('');
        }
        function openServiceModal(serviceId) {
            const modal = document.getElementById('serviceModal');
            if (!modal) return;
            modal.style.display = 'flex';
            document.getElementById('serviceModalId').value = serviceId || '';
            document.getElementById('serviceModalTitle').textContent = serviceId ? (LANG === 'fa' ? 'ویرایش سرویس' : 'Edit service') : t('service_add');
            document.getElementById('serviceModalName').value = '';
            document.getElementById('serviceModalCode').value = '';
            document.getElementById('serviceModalCategory').value = '';
            document.getElementById('serviceModalDescription').value = '';
            document.getElementById('serviceModalActive').checked = true;
            if (serviceId) {
                apiFetch('/api/services/' + serviceId).then(function(r) {
                    if (r.ok && r.data) {
                        const s = r.data;
                        document.getElementById('serviceModalName').value = s.name || '';
                        document.getElementById('serviceModalCode').value = s.code || '';
                        document.getElementById('serviceModalCategory').value = s.category || '';
                        document.getElementById('serviceModalDescription').value = s.description || '';
                        document.getElementById('serviceModalActive').checked = s.isActive !== false;
                    }
                });
            }
        }
        function closeServiceModal() { const m = document.getElementById('serviceModal'); if (m) m.style.display = 'none'; }
        async function saveServiceFromModal() {
            const id = document.getElementById('serviceModalId').value.trim();
            const name = document.getElementById('serviceModalName').value.trim();
            const code = document.getElementById('serviceModalCode').value.trim();
            const category = document.getElementById('serviceModalCategory').value.trim();
            const description = document.getElementById('serviceModalDescription').value.trim();
            const isActive = document.getElementById('serviceModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام سرویس الزامی است' : 'Service name required', true); return; }
            if (id) {
                var res = await apiFetch('/api/services/' + id, { method: 'PUT', body: JSON.stringify({ name: name, code: code || null, category: category || null, description: description || null, isActive: isActive }) });
                if (res.needLogin) return;
                if (res.ok) { closeServiceModal(); toast(t('btn_save')); loadServices(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            } else {
                var res = await apiFetch('/api/services', { method: 'POST', body: JSON.stringify({ name: name, code: code || null, category: category || null, description: description || null, isActive: isActive }) });
                if (res.needLogin) return;
                if (res.ok) { closeServiceModal(); toast(t('btn_save')); loadServices(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            }
        }
        async function deleteService(id) {
            if (!confirm(LANG === 'fa' ? 'حذف این سرویس؟' : 'Delete this service?')) return;
            const res = await apiFetch('/api/services/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadServices(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        // ========== Statement of Account (صورت حساب) ==========
        const stmtFilters = { customerId: '', fromDate: '', toDate: '', currency: '', narration: '', amount: '', debitCredit: '', type: '', userId: '', groupByCurrency: false };
        let stmtData = null;
        let stmtMarkedRows = {};

        async function loadStatement() {
            const body = document.getElementById('statementBody');
            const empty = document.getElementById('statementEmpty');
            const title = document.getElementById('statementCustomerTitle');
            if (!body) return;
            body.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:24px;">' + t('loading') + '</td></tr>';
            if (empty) empty.style.display = 'none';
            const params = [];
            if (stmtFilters.customerId) params.push('customerId=' + encodeURIComponent(stmtFilters.customerId));
            if (stmtFilters.fromDate) params.push('fromDate=' + encodeURIComponent(stmtFilters.fromDate));
            if (stmtFilters.toDate) params.push('toDate=' + encodeURIComponent(stmtFilters.toDate));
            if (stmtFilters.currency) params.push('currency=' + encodeURIComponent(stmtFilters.currency));
            if (stmtFilters.narration) params.push('narration=' + encodeURIComponent(stmtFilters.narration));
            if (stmtFilters.amount) params.push('amount=' + encodeURIComponent(stmtFilters.amount));
            if (stmtFilters.debitCredit) params.push('debitCredit=' + encodeURIComponent(stmtFilters.debitCredit));
            if (stmtFilters.type) params.push('type=' + encodeURIComponent(stmtFilters.type));
            if (stmtFilters.userId) params.push('userId=' + encodeURIComponent(stmtFilters.userId));
            if (stmtFilters.groupByCurrency) params.push('groupByCurrency=true');
            const res = await apiFetch('/api/exchange/statement?' + params.join('&'));
            if (res.needLogin || !res.ok) { body.innerHTML = ''; if (empty) { empty.style.display = 'block'; empty.textContent = (res.data && res.data.error) || t('err_generic'); } return; }
            stmtData = res.data;
            if (title) {
                if (stmtData.customerName) { title.style.display = 'block'; title.innerHTML = '<strong>' + (LANG === 'fa' ? 'صورت حساب — ' : 'Statement Of Account — ') + escapeHtml(stmtData.customerName) + '</strong>'; }
                else { title.style.display = 'none'; }
            }
            renderStatement();
        }

        function renderStatement() {
            const body = document.getElementById('statementBody');
            const empty = document.getElementById('statementEmpty');
            if (!body || !stmtData) return;
            let html = '';
            if (stmtData.grouped) {
                const currencies = Object.keys(stmtData.statement);
                if (currencies.length === 0) { body.innerHTML = ''; if (empty) { empty.style.display = 'block'; empty.textContent = LANG === 'fa' ? 'تراکنشی یافت نشد' : 'No transactions found'; } return; }
                currencies.forEach(function(curr) {
                    const grp = stmtData.statement[curr];
                    html += '<tr class="stmt-row-bf"><td></td><td></td><td></td><td></td><td></td><td><strong>BALANCE B/F</strong></td><td>' + escapeHtml(curr) + '</td><td></td><td></td><td class="stmt-num">0.00</td><td></td></tr>';
                    grp.items.forEach(function(item) {
                        html += buildStmtRow(item);
                    });
                    html += '<tr class="stmt-row-total"><td></td><td></td><td></td><td></td><td></td><td><strong>TOTAL</strong></td><td>' + escapeHtml(curr) + '</td><td class="stmt-num">' + formatMoneyEn(grp.totalDebit) + '</td><td class="stmt-num">' + formatMoneyEn(grp.totalCredit) + '</td><td></td><td></td></tr>';
                    html += '<tr class="stmt-row-cf"><td></td><td></td><td></td><td></td><td></td><td><strong>BALANCE C/F</strong></td><td>' + escapeHtml(curr) + '</td><td></td><td></td><td class="stmt-num stmt-cf-val">' + formatMoneyEn(Math.abs(grp.balanceCF)) + '</td><td class="stmt-cf-sign">' + grp.balanceCFSign + '</td></tr>';
                });
            } else {
                const st = stmtData.statement;
                if (!st || !st.items || st.items.length === 0) { body.innerHTML = ''; if (empty) { empty.style.display = 'block'; empty.textContent = LANG === 'fa' ? 'تراکنشی یافت نشد' : 'No transactions found'; } return; }
                html += '<tr class="stmt-row-bf"><td></td><td></td><td></td><td></td><td></td><td><strong>BALANCE B/F</strong></td><td></td><td></td><td></td><td class="stmt-num">0.00</td><td></td></tr>';
                st.items.forEach(function(item) { html += buildStmtRow(item); });
                html += '<tr class="stmt-row-total"><td></td><td></td><td></td><td></td><td></td><td><strong>TOTAL</strong></td><td></td><td class="stmt-num">' + formatMoneyEn(st.totalDebit) + '</td><td class="stmt-num">' + formatMoneyEn(st.totalCredit) + '</td><td></td><td></td></tr>';
                html += '<tr class="stmt-row-cf"><td></td><td></td><td></td><td></td><td></td><td><strong>BALANCE C/F</strong></td><td></td><td></td><td></td><td class="stmt-num stmt-cf-val">' + formatMoneyEn(Math.abs(st.balanceCF)) + '</td><td class="stmt-cf-sign">' + st.balanceCFSign + '</td></tr>';
            }
            if (empty) empty.style.display = 'none';
            body.innerHTML = html;
            Object.keys(stmtMarkedRows).forEach(function(id) {
                const row = body.querySelector('tr[data-id="' + id + '"]');
                if (row) row.style.backgroundColor = stmtMarkedRows[id];
            });
        }

        function buildStmtRow(item) {
            const isMarked = stmtMarkedRows[item.id];
            const bg = isMarked ? ' style="background:' + isMarked + ';"' : '';
            const checkAttr = isMarked ? ' checked' : '';
            return '<tr class="stmt-row-data" data-id="' + item.id + '"' + bg + '>' +
                '<td class="stmt-col-sel"><input type="checkbox" class="stmt-check"' + checkAttr + ' onchange="toggleStmtMark(this,\'' + item.id + '\')"></td>' +
                '<td class="stmt-col-act"><button type="button" class="btn-icon-sm stmt-act-view" onclick="viewTransactionDetail(\'' + item.id + '\')" title="' + (LANG === 'fa' ? 'مشاهده' : 'View') + '"><svg viewBox="0 0 24 24" width="18" height="18"><use href="#icon-eye"/></svg></button><button type="button" class="btn-icon-sm stmt-act-edit" onclick="openTransactionModalForEdit(\'' + item.id + '\')" title="' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '"><svg viewBox="0 0 24 24" width="18" height="18"><use href="#icon-edit"/></svg></button></td>' +
                '<td>' + escapeHtml(item.date || '') + '</td>' +
                '<td><span class="stmt-type-badge stmt-type-' + item.typeRaw + '">' + escapeHtml(item.type) + '</span></td>' +
                '<td>' + escapeHtml(item.number) + '</td>' +
                '<td class="stmt-narration" title="' + escapeHtml(item.narration) + '">' + escapeHtml(item.narration) + '</td>' +
                '<td>' + escapeHtml(item.currency) + '</td>' +
                '<td class="stmt-num stmt-debit">' + (item.debit > 0 ? formatMoneyEn(item.debit) : '') + '</td>' +
                '<td class="stmt-num stmt-credit">' + (item.credit > 0 ? formatMoneyEn(item.credit) : '') + '</td>' +
                '<td class="stmt-num stmt-balance">' + formatMoneyEn(Math.abs(item.balance)) + '</td>' +
                '<td class="stmt-sign ' + (item.sign === 'Cr' ? 'stmt-sign-cr' : 'stmt-sign-dr') + '">' + item.sign + '</td>' +
                '</tr>';
        }

        async function viewTransactionDetail(txId) {
            const res = await apiFetch('/api/exchange/transactions/' + txId);
            if (!res.ok || !res.data) { toast(t('err_generic'), true); return; }
            const tx = res.data;
            const typeLabels = { cash_in: LANG === 'fa' ? 'ورود به صندوق' : 'Cash In', cash_out: LANG === 'fa' ? 'خروج از صندوق' : 'Cash Out', transfer_box: LANG === 'fa' ? 'انتقال صندوق' : 'Transfer Box', bank_deposit: LANG === 'fa' ? 'واریز بانک' : 'Bank Deposit', bank_withdraw: LANG === 'fa' ? 'برداشت بانک' : 'Bank Withdraw', transfer_account: LANG === 'fa' ? 'انتقال حساب' : 'Transfer Account', income: LANG === 'fa' ? 'درآمد' : 'Income', expense: LANG === 'fa' ? 'هزینه' : 'Expense', buy: LANG === 'fa' ? 'خرید' : 'Buy', sell: LANG === 'fa' ? 'فروش' : 'Sell' };
            const statusLabels = { pending: LANG === 'fa' ? 'در انتظار' : 'Pending', approved: LANG === 'fa' ? 'تایید شده' : 'Approved', rejected: LANG === 'fa' ? 'رد شده' : 'Rejected' };
            const info = '<div class="tx-detail-grid">' +
                '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'نوع' : 'Type') + '</span><span class="tx-detail-value"><span class="stmt-type-badge">' + (typeLabels[tx.type] || tx.type) + '</span></span></div>' +
                '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'مبلغ' : 'Amount') + '</span><span class="tx-detail-value" style="font-weight:700;font-size:1.1rem;">' + formatMoneyEn(tx.amount) + ' ' + (tx.currency || '') + '</span></div>' +
                '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'تاریخ' : 'Date') + '</span><span class="tx-detail-value">' + escapeHtml(tx.transactionDate || '') + '</span></div>' +
                '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'وضعیت' : 'Status') + '</span><span class="tx-detail-value"><span class="badge badge-' + tx.status + '">' + (statusLabels[tx.status] || tx.status) + '</span></span></div>' +
                (tx.description ? '<div class="tx-detail-item full"><span class="tx-detail-label">' + (LANG === 'fa' ? 'شرح' : 'Description') + '</span><span class="tx-detail-value">' + escapeHtml(tx.description) + '</span></div>' : '') +
                (tx.reference ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'مرجع' : 'Reference') + '</span><span class="tx-detail-value">' + escapeHtml(tx.reference) + '</span></div>' : '') +
                (tx.fromCashBox ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'از صندوق' : 'From Cash Box') + '</span><span class="tx-detail-value">' + escapeHtml(tx.fromCashBox.name) + '</span></div>' : '') +
                (tx.toCashBox ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'به صندوق' : 'To Cash Box') + '</span><span class="tx-detail-value">' + escapeHtml(tx.toCashBox.name) + '</span></div>' : '') +
                (tx.fromBankAccount ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'از بانک' : 'From Bank') + '</span><span class="tx-detail-value">' + escapeHtml(tx.fromBankAccount.name) + '</span></div>' : '') +
                (tx.toBankAccount ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'به بانک' : 'To Bank') + '</span><span class="tx-detail-value">' + escapeHtml(tx.toBankAccount.name) + '</span></div>' : '') +
                (tx.customer ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'مشتری' : 'Customer') + '</span><span class="tx-detail-value">' + escapeHtml(tx.customer.name || tx.customer.phone || '') + '</span></div>' : '') +
                (tx.user ? '<div class="tx-detail-item"><span class="tx-detail-label">' + (LANG === 'fa' ? 'ثبت‌کننده' : 'Created by') + '</span><span class="tx-detail-value">' + escapeHtml(tx.user.name) + '</span></div>' : '') +
                '</div>';
            const m = document.getElementById('accountBalanceModal');
            const content = document.getElementById('accountBalanceContent');
            const title = m ? m.querySelector('.modal-header h3') : null;
            if (title) title.textContent = LANG === 'fa' ? 'جزئیات تراکنش' : 'Transaction Detail';
            if (content) content.innerHTML = info;
            if (m) m.style.display = 'flex';
        }

        function toggleStmtMark(checkbox, id) {
            const row = checkbox.closest('tr');
            if (checkbox.checked) {
                const color = document.getElementById('stmtChooseColor').value || '#ffeb3b';
                stmtMarkedRows[id] = color;
                if (row) row.style.backgroundColor = color;
            } else {
                delete stmtMarkedRows[id];
                if (row) row.style.backgroundColor = '';
            }
        }

        function stmtUnmarkAll() {
            stmtMarkedRows = {};
            const checks = document.querySelectorAll('.stmt-check');
            checks.forEach(function(c) { c.checked = false; });
            const rows = document.querySelectorAll('.stmt-row-data');
            rows.forEach(function(r) { r.style.backgroundColor = ''; });
        }

        function openStatementFilters() {
            const m = document.getElementById('statementFiltersModal');
            if (!m) return;
            m.style.display = 'flex';
            document.getElementById('stmtFilterCustomer').value = stmtFilters.customerId;
            document.getElementById('stmtFilterFromDate').value = stmtFilters.fromDate;
            document.getElementById('stmtFilterToDate').value = stmtFilters.toDate;
            document.getElementById('stmtFilterCurrency').value = stmtFilters.currency;
            document.getElementById('stmtFilterNarration').value = stmtFilters.narration;
            document.getElementById('stmtFilterAmount').value = stmtFilters.amount;
            document.getElementById('stmtFilterDebitCredit').value = stmtFilters.debitCredit;
            document.getElementById('stmtFilterType').value = stmtFilters.type;
            document.getElementById('stmtFilterUser').value = stmtFilters.userId;
            document.getElementById('stmtFilterGroupCurrency').checked = stmtFilters.groupByCurrency;
            loadCustomersForStmtFilter();
            loadUsersForStmtFilter();
        }

        function closeStatementFilters() {
            const m = document.getElementById('statementFiltersModal'); if (m) m.style.display = 'none';
        }

        function applyStatementFilters() {
            stmtFilters.customerId = document.getElementById('stmtFilterCustomer').value;
            stmtFilters.fromDate = document.getElementById('stmtFilterFromDate').value;
            stmtFilters.toDate = document.getElementById('stmtFilterToDate').value;
            stmtFilters.currency = document.getElementById('stmtFilterCurrency').value;
            stmtFilters.narration = document.getElementById('stmtFilterNarration').value;
            stmtFilters.amount = document.getElementById('stmtFilterAmount').value;
            stmtFilters.debitCredit = document.getElementById('stmtFilterDebitCredit').value;
            stmtFilters.type = document.getElementById('stmtFilterType').value;
            stmtFilters.userId = document.getElementById('stmtFilterUser').value;
            stmtFilters.groupByCurrency = document.getElementById('stmtFilterGroupCurrency').checked;
            closeStatementFilters();
            loadStatement();
        }

        async function loadCustomersForStmtFilter() {
            const sel = document.getElementById('stmtFilterCustomer');
            if (!sel) return;
            const res = await apiFetch('/api/customers?limit=500');
            const list = (res.data && res.data.data) || [];
            const curVal = sel.value;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'همه' : 'All') + '</option>' + list.map(function(c) { return '<option value="' + c.id + '">' + escapeHtml(c.name || c.phone || '') + '</option>'; }).join('');
            if (curVal) sel.value = curVal;
        }

        async function loadUsersForStmtFilter() {
            const sel = document.getElementById('stmtFilterUser');
            if (!sel) return;
            const res = await apiFetch('/api/users');
            const list = (res.data && Array.isArray(res.data)) ? res.data : (res.data && res.data.data) || [];
            const curVal = sel.value;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'همه' : 'All') + '</option>' + list.map(function(u) { return '<option value="' + u.id + '">' + escapeHtml(u.name || u.email || '') + '</option>'; }).join('');
            if (curVal) sel.value = curVal;
        }

        async function showAccountBalance() {
            const custId = stmtFilters.customerId;
            if (!custId) { toast(LANG === 'fa' ? 'ابتدا یک مشتری/حساب از فیلترها انتخاب کنید' : 'Select a customer first', true); return; }
            const m = document.getElementById('accountBalanceModal');
            const content = document.getElementById('accountBalanceContent');
            if (!m || !content) return;
            m.style.display = 'flex';
            content.innerHTML = '<div style="text-align:center;padding:20px;">' + t('loading') + '</div>';
            const res = await apiFetch('/api/exchange/account-balance?customerId=' + encodeURIComponent(custId));
            if (!res.ok || !res.data) { content.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'خطا در بارگذاری' : 'Error loading') + '</div>'; return; }
            const entries = Object.entries(res.data);
            if (entries.length === 0) { content.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'تراکنشی ثبت نشده' : 'No transactions') + '</div>'; return; }
            content.innerHTML = '<table class="account-balance-table"><thead><tr><th>' + (LANG === 'fa' ? 'ارز' : 'Currency') + '</th><th>' + (LANG === 'fa' ? 'بدهکار' : 'Debit') + '</th><th>' + (LANG === 'fa' ? 'بستانکار' : 'Credit') + '</th><th>' + (LANG === 'fa' ? 'مانده' : 'Balance') + '</th></tr></thead><tbody>' +
                entries.map(function(e) {
                    const b = e[1];
                    return '<tr><td>' + escapeHtml(e[0]) + '</td><td class="stmt-num">' + formatMoneyEn(b.totalDebit) + '</td><td class="stmt-num">' + formatMoneyEn(b.totalCredit) + '</td><td class="stmt-num" style="font-weight:700;">' + formatMoneyEn(Math.abs(b.balance)) + ' <span class="' + (b.balance >= 0 ? 'stmt-sign-cr' : 'stmt-sign-dr') + '">' + (b.balance >= 0 ? 'Cr' : 'Dr') + '</span></td></tr>';
                }).join('') + '</tbody></table>';
        }

        function closeAccountBalance() {
            const m = document.getElementById('accountBalanceModal'); if (m) m.style.display = 'none';
        }

        function exportStatementPDF() {
            if (!stmtData) { toast(LANG === 'fa' ? 'ابتدا گزارش تولید کنید' : 'Generate report first', true); return; }
            const table = document.getElementById('statementTable');
            if (!table) return;
            const title = stmtData.customerName ? (LANG === 'fa' ? 'صورت حساب — ' : 'Statement Of Account — ') + stmtData.customerName : (LANG === 'fa' ? 'صورت حساب' : 'Statement Of Account');
            const printWin = window.open('', '_blank');
            printWin.document.write('<!DOCTYPE html><html dir="' + (LANG === 'fa' ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:20px;direction:' + (LANG === 'fa' ? 'rtl' : 'ltr') + ';}h2{color:#6b21a8;margin-bottom:16px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right;}th{background:#6b21a8;color:#fff;}.stmt-num{text-align:left;font-variant-numeric:tabular-nums;}.stmt-row-bf td,.stmt-row-cf td{background:#f3f0ff;font-weight:bold;}.stmt-row-total td{background:#ede9fe;font-weight:bold;}.stmt-sign-cr{color:#16a34a;}.stmt-sign-dr{color:#dc2626;}</style></head><body><h2>' + escapeHtml(title) + '</h2>' + table.outerHTML + '</body></html>');
            printWin.document.close();
            setTimeout(function() { printWin.print(); }, 500);
        }

        function exportStatementExcel() {
            if (!stmtData) { toast(LANG === 'fa' ? 'ابتدا گزارش تولید کنید' : 'Generate report first', true); return; }
            const items = [];
            if (stmtData.grouped) {
                Object.keys(stmtData.statement).forEach(function(curr) {
                    const grp = stmtData.statement[curr];
                    items.push({ date: '', type: '', number: '', narration: 'BALANCE B/F', currency: curr, debit: '', credit: '', balance: '0.00', sign: '' });
                    grp.items.forEach(function(i) { items.push(i); });
                    items.push({ date: '', type: '', number: '', narration: 'TOTAL', currency: curr, debit: grp.totalDebit, credit: grp.totalCredit, balance: '', sign: '' });
                    items.push({ date: '', type: '', number: '', narration: 'BALANCE C/F', currency: curr, debit: '', credit: '', balance: Math.abs(grp.balanceCF), sign: grp.balanceCFSign });
                });
            } else {
                const st = stmtData.statement;
                items.push({ date: '', type: '', number: '', narration: 'BALANCE B/F', currency: '', debit: '', credit: '', balance: '0.00', sign: '' });
                (st.items || []).forEach(function(i) { items.push(i); });
                items.push({ date: '', type: '', number: '', narration: 'TOTAL', currency: '', debit: st.totalDebit, credit: st.totalCredit, balance: '', sign: '' });
                items.push({ date: '', type: '', number: '', narration: 'BALANCE C/F', currency: '', debit: '', credit: '', balance: Math.abs(st.balanceCF), sign: st.balanceCFSign });
            }
            const headers = ['Date', 'Type', 'Number', 'Narration', 'Currency', 'Debit', 'Credit', 'Balance Amt.', 'Sign'];
            const csv = '\ufeff' + headers.join(',') + '\n' + items.map(function(r) {
                return [r.date || '', r.type || '', r.number || '', '"' + (r.narration || '').replace(/"/g, '""') + '"', r.currency || '', r.debit || '', r.credit || '', r.balance !== undefined && r.balance !== '' ? r.balance : '', r.sign || ''].join(',');
            }).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'statement-of-account-' + new Date().toISOString().slice(0, 10) + '.csv';
            link.click();
        }

        // ========== Commitment Summary & Bank Position (خلاصه تعهدات) ==========
        function renderCommitmentTable(cpData) {
            const body = document.getElementById('commitmentBody');
            if (!body || !cpData) return;
            const cp = cpData.currencyPosition || {};
            const entries = Object.entries(cp);
            if (entries.length === 0) { body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">' + (LANG === 'fa' ? 'داده‌ای نیست' : 'No data') + '</td></tr>'; return; }
            body.innerHTML = entries.map(function(e) {
                const curr = e[0], d = e[1];
                const diff = d.total;
                return '<tr><td><strong>' + escapeHtml(curr) + '</strong></td>' +
                    '<td class="stmt-num">' + formatMoneyEn(d.cashBoxes) + '</td>' +
                    '<td class="stmt-num">' + formatMoneyEn(d.bankAccounts) + '</td>' +
                    '<td class="stmt-num" style="font-weight:700;color:' + (diff >= 0 ? 'var(--accent)' : 'var(--danger)') + ';">' + formatMoneyEn(d.total) + '</td></tr>';
            }).join('');
        }

        function renderBankPositionTable(cpData) {
            const body = document.getElementById('bankPositionBody');
            if (!body || !cpData) return;
            const banks = cpData.bankAccounts || [];
            if (banks.length === 0) { body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:16px;">' + (LANG === 'fa' ? 'حساب بانکی ندارید' : 'No bank accounts') + '</td></tr>'; return; }
            body.innerHTML = banks.map(function(b) {
                return '<tr><td>' + escapeHtml(b.name) + (b.bankName ? ' <small style="color:var(--text-muted);">(' + escapeHtml(b.bankName) + ')</small>' : '') + '</td>' +
                    '<td>' + escapeHtml(b.currency) + '</td>' +
                    '<td class="stmt-num" style="font-weight:600;color:' + (b.balance >= 0 ? 'var(--accent)' : 'var(--danger)') + ';">' + formatMoneyEn(b.balance) + '</td></tr>';
            }).join('');
        }

        // ========== Reports Page (گزارش‌ها) ==========
        let currentReportType = 'turnover';

        function showReport(type) {
            currentReportType = type;
            const btns = document.querySelectorAll('.report-nav-btn');
            btns.forEach(function(b) { b.classList.remove('active'); });
            const activeBtn = document.querySelector('.report-nav-btn[data-report="' + type + '"]');
            if (activeBtn) activeBtn.classList.add('active');
            const panels = document.querySelectorAll('.report-content');
            panels.forEach(function(p) { p.classList.remove('show'); });
            const rptMap = { turnover: 'reportTurnover', 'profit-loss': 'reportProfitLoss', 'expense-journal': 'reportExpenseJournal', 'cash-bank': 'reportCashBank' };
            const panel = document.getElementById(rptMap[type]);
            if (panel) panel.classList.add('show');
            loadCurrentReport();
        }

        function switchToReport(type) {
            const tab = document.querySelector('.services-tab[data-tab="reports"]');
            if (tab) tab.click();
            setTimeout(function() { showReport(type === 'statement' ? 'turnover' : type); }, 100);
        }

        function loadCurrentReport() {
            if (currentReportType === 'turnover') loadTurnoverReport();
            else if (currentReportType === 'profit-loss') loadProfitLossReport();
            else if (currentReportType === 'expense-journal') loadExpenseJournalReport();
            else if (currentReportType === 'cash-bank') loadCashBankReport();
        }

        async function loadTurnoverReport() {
            const el = document.getElementById('turnoverContent');
            if (!el) return;
            el.innerHTML = '<div style="padding:24px;text-align:center;">' + t('loading') + '</div>';
            const params = [];
            const fd = document.getElementById('reportFromDate'); if (fd && fd.value) params.push('fromDate=' + fd.value);
            const td = document.getElementById('reportToDate'); if (td && td.value) params.push('toDate=' + td.value);
            const cr = document.getElementById('reportCurrency'); if (cr && cr.value) params.push('currency=' + cr.value);
            const res = await apiFetch('/api/exchange/account-turnover?' + params.join('&'));
            if (!res.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const data = res.data || [];
            if (data.length === 0) { el.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'حسابی یافت نشد' : 'No accounts found') + '</div>'; return; }
            let totalDebit = 0, totalCredit = 0, totalTurnover = 0;
            data.forEach(function(a) { totalDebit += a.debit; totalCredit += a.credit; totalTurnover += a.turnover; });
            el.innerHTML = '<table class="report-table"><thead><tr>' +
                '<th>' + (LANG === 'fa' ? 'حساب' : 'Account') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'نوع' : 'Type') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'ارز' : 'Currency') + '</th>' +
                '<th class="stmt-num">' + (LANG === 'fa' ? 'بدهکار' : 'Debit') + '</th>' +
                '<th class="stmt-num">' + (LANG === 'fa' ? 'بستانکار' : 'Credit') + '</th>' +
                '<th class="stmt-num">' + (LANG === 'fa' ? 'گردش' : 'Turnover') + '</th>' +
                '<th class="stmt-num">' + (LANG === 'fa' ? 'خالص' : 'Net') + '</th>' +
                '<th class="stmt-num">' + (LANG === 'fa' ? 'موجودی' : 'Balance') + '</th>' +
                '</tr></thead><tbody>' +
                data.map(function(a) {
                    const typeLabel = a.type === 'cashbox' ? (LANG === 'fa' ? 'صندوق' : 'Cash Box') : (LANG === 'fa' ? 'بانک' : 'Bank');
                    return '<tr><td>' + escapeHtml(a.name) + '</td>' +
                        '<td><span class="stmt-type-badge">' + typeLabel + '</span></td>' +
                        '<td>' + escapeHtml(a.currency) + '</td>' +
                        '<td class="stmt-num">' + formatMoneyEn(a.debit) + '</td>' +
                        '<td class="stmt-num">' + formatMoneyEn(a.credit) + '</td>' +
                        '<td class="stmt-num" style="font-weight:600;">' + formatMoneyEn(a.turnover) + '</td>' +
                        '<td class="stmt-num" style="color:' + (a.net >= 0 ? 'var(--accent)' : 'var(--danger)') + ';font-weight:600;">' + formatMoneyEn(a.net) + '</td>' +
                        '<td class="stmt-num" style="font-weight:700;">' + formatMoneyEn(a.balance) + '</td></tr>';
                }).join('') +
                '<tr class="stmt-row-total"><td colspan="3"><strong>' + (LANG === 'fa' ? 'مجموع' : 'Total') + '</strong></td>' +
                '<td class="stmt-num"><strong>' + formatMoneyEn(totalDebit) + '</strong></td>' +
                '<td class="stmt-num"><strong>' + formatMoneyEn(totalCredit) + '</strong></td>' +
                '<td class="stmt-num"><strong>' + formatMoneyEn(totalTurnover) + '</strong></td>' +
                '<td></td><td></td></tr>' +
                '</tbody></table>';
        }

        async function loadProfitLossReport() {
            const el = document.getElementById('profitLossContent');
            if (!el) return;
            el.innerHTML = '<div style="padding:24px;text-align:center;">' + t('loading') + '</div>';
            const params = [];
            const fd = document.getElementById('reportFromDate'); if (fd && fd.value) params.push('fromDate=' + fd.value);
            const td = document.getElementById('reportToDate'); if (td && td.value) params.push('toDate=' + td.value);
            const res = await apiFetch('/api/exchange/profit-loss?' + params.join('&'));
            if (!res.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const d = res.data || {};
            const currEntries = Object.entries(d.byCurrency || {});
            el.innerHTML = '<div class="pl-summary-cards">' +
                '<div class="pl-card pl-income"><div class="pl-label">' + (LANG === 'fa' ? 'مجموع درآمد' : 'Total Income') + '</div><div class="pl-value">' + formatMoneyEn(d.totalIncome) + '</div></div>' +
                '<div class="pl-card pl-expense"><div class="pl-label">' + (LANG === 'fa' ? 'مجموع هزینه' : 'Total Expense') + '</div><div class="pl-value">' + formatMoneyEn(d.totalExpense) + '</div></div>' +
                '<div class="pl-card pl-buy"><div class="pl-label">' + (LANG === 'fa' ? 'مجموع خرید' : 'Total Buy') + '</div><div class="pl-value">' + formatMoneyEn(d.totalBuy) + '</div></div>' +
                '<div class="pl-card pl-sell"><div class="pl-label">' + (LANG === 'fa' ? 'مجموع فروش' : 'Total Sell') + '</div><div class="pl-value">' + formatMoneyEn(d.totalSell) + '</div></div>' +
                '<div class="pl-card ' + (d.grossProfit >= 0 ? 'pl-profit' : 'pl-loss') + '"><div class="pl-label">' + (LANG === 'fa' ? 'سود / زیان ناخالص' : 'Gross Profit / Loss') + '</div><div class="pl-value">' + formatMoneyEn(d.grossProfit) + '</div></div>' +
                '</div>' +
                (currEntries.length > 0 ? '<h4 style="margin-top:24px;">' + (LANG === 'fa' ? 'به تفکیک ارز' : 'By Currency') + '</h4>' +
                '<table class="report-table"><thead><tr><th>' + (LANG === 'fa' ? 'ارز' : 'Currency') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'درآمد' : 'Income') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'هزینه' : 'Expense') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'خرید' : 'Buy') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'فروش' : 'Sell') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'سود/زیان' : 'P/L') + '</th></tr></thead><tbody>' +
                currEntries.map(function(e) {
                    return '<tr><td><strong>' + escapeHtml(e[0]) + '</strong></td>' +
                        '<td class="stmt-num">' + formatMoneyEn(e[1].income) + '</td>' +
                        '<td class="stmt-num">' + formatMoneyEn(e[1].expense) + '</td>' +
                        '<td class="stmt-num">' + formatMoneyEn(e[1].buy) + '</td>' +
                        '<td class="stmt-num">' + formatMoneyEn(e[1].sell) + '</td>' +
                        '<td class="stmt-num" style="font-weight:700;color:' + (e[1].profit >= 0 ? 'var(--accent)' : 'var(--danger)') + ';">' + formatMoneyEn(e[1].profit) + '</td></tr>';
                }).join('') + '</tbody></table>' : '');
        }

        async function loadExpenseJournalReport() {
            const el = document.getElementById('expenseJournalContent');
            if (!el) return;
            el.innerHTML = '<div style="padding:24px;text-align:center;">' + t('loading') + '</div>';
            const params = [];
            const fd = document.getElementById('reportFromDate'); if (fd && fd.value) params.push('fromDate=' + fd.value);
            const td = document.getElementById('reportToDate'); if (td && td.value) params.push('toDate=' + td.value);
            const cr = document.getElementById('reportCurrency'); if (cr && cr.value) params.push('currency=' + cr.value);
            const res = await apiFetch('/api/exchange/expense-journal?' + params.join('&'));
            if (!res.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const d = res.data || {};
            const rows = d.rows || [];
            if (rows.length === 0) { el.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'هزینه‌ای ثبت نشده' : 'No expenses recorded') + '</div>'; return; }
            el.innerHTML = '<div class="report-summary-badge">' + (LANG === 'fa' ? 'تعداد: ' : 'Count: ') + d.count + ' | ' + (LANG === 'fa' ? 'مجموع: ' : 'Total: ') + formatMoneyEn(d.totalAmount) + '</div>' +
                '<table class="report-table"><thead><tr>' +
                '<th>' + (LANG === 'fa' ? 'تاریخ' : 'Date') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'نوع' : 'Type') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'شرح' : 'Description') + '</th>' +
                '<th class="stmt-num">' + (LANG === 'fa' ? 'مبلغ' : 'Amount') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'ارز' : 'Currency') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'صندوق' : 'Cash Box') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'مرجع' : 'Reference') + '</th>' +
                '<th>' + (LANG === 'fa' ? 'کاربر' : 'User') + '</th>' +
                '</tr></thead><tbody>' +
                rows.map(function(r) {
                    return '<tr><td>' + escapeHtml(r.date || '') + '</td>' +
                        '<td><span class="stmt-type-badge">' + (r.type === 'expense' ? (LANG === 'fa' ? 'هزینه' : 'Expense') : (LANG === 'fa' ? 'خرید' : 'Buy')) + '</span></td>' +
                        '<td>' + escapeHtml(r.description || '') + '</td>' +
                        '<td class="stmt-num" style="color:var(--danger);font-weight:600;">' + formatMoneyEn(r.amount) + '</td>' +
                        '<td>' + escapeHtml(r.currency) + '</td>' +
                        '<td>' + (r.fromCashBox ? escapeHtml(r.fromCashBox.name) : '-') + '</td>' +
                        '<td>' + escapeHtml(r.reference || '') + '</td>' +
                        '<td>' + (r.user ? escapeHtml(r.user.name) : '-') + '</td></tr>';
                }).join('') +
                '<tr class="stmt-row-total"><td colspan="3"><strong>' + (LANG === 'fa' ? 'مجموع' : 'Total') + '</strong></td>' +
                '<td class="stmt-num"><strong style="color:var(--danger);">' + formatMoneyEn(d.totalAmount) + '</strong></td>' +
                '<td colspan="4"></td></tr></tbody></table>';
        }

        async function loadCashBankReport() {
            const el = document.getElementById('cashBankContent');
            if (!el) return;
            el.innerHTML = '<div style="padding:24px;text-align:center;">' + t('loading') + '</div>';
            const res = await apiFetch('/api/exchange/cash-bank-status');
            if (!res.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const data = res.data || {};
            const currencies = Object.keys(data);
            if (currencies.length === 0) { el.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'حسابی تعریف نشده' : 'No accounts defined') + '</div>'; return; }
            let html = '';
            currencies.forEach(function(curr) {
                const grp = data[curr];
                html += '<div class="cash-bank-currency-group"><h4 class="cash-bank-currency-title">' + escapeHtml(curr) + '</h4>';
                if (grp.cashBoxes.length > 0) {
                    html += '<h5>' + (LANG === 'fa' ? 'صندوق‌ها' : 'Cash Boxes') + '</h5><table class="report-table"><thead><tr><th>' + (LANG === 'fa' ? 'نام' : 'Name') + '</th><th>' + (LANG === 'fa' ? 'شعبه' : 'Branch') + '</th><th>' + (LANG === 'fa' ? 'وضعیت' : 'Status') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'موجودی' : 'Balance') + '</th></tr></thead><tbody>';
                    grp.cashBoxes.forEach(function(cb) {
                        html += '<tr><td>' + escapeHtml(cb.name) + '</td><td>' + escapeHtml(cb.branch || '-') + '</td><td>' + (cb.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>') + '</td><td class="stmt-num" style="font-weight:600;">' + formatMoneyEn(cb.balance) + '</td></tr>';
                    });
                    html += '<tr class="stmt-row-total"><td colspan="3"><strong>' + (LANG === 'fa' ? 'مجموع صندوق‌ها' : 'Cash Total') + '</strong></td><td class="stmt-num"><strong>' + formatMoneyEn(grp.totalCash) + '</strong></td></tr></tbody></table>';
                }
                if (grp.bankAccounts.length > 0) {
                    html += '<h5 style="margin-top:12px;">' + (LANG === 'fa' ? 'حساب‌های بانکی' : 'Bank Accounts') + '</h5><table class="report-table"><thead><tr><th>' + (LANG === 'fa' ? 'نام' : 'Name') + '</th><th>' + (LANG === 'fa' ? 'بانک' : 'Bank') + '</th><th>' + (LANG === 'fa' ? 'شعبه' : 'Branch') + '</th><th>' + (LANG === 'fa' ? 'وضعیت' : 'Status') + '</th><th class="stmt-num">' + (LANG === 'fa' ? 'موجودی' : 'Balance') + '</th></tr></thead><tbody>';
                    grp.bankAccounts.forEach(function(ba) {
                        html += '<tr><td>' + escapeHtml(ba.name) + '</td><td>' + escapeHtml(ba.bankName || '-') + '</td><td>' + escapeHtml(ba.branch || '-') + '</td><td>' + (ba.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>') + '</td><td class="stmt-num" style="font-weight:600;">' + formatMoneyEn(ba.balance) + '</td></tr>';
                    });
                    html += '<tr class="stmt-row-total"><td colspan="4"><strong>' + (LANG === 'fa' ? 'مجموع بانک' : 'Bank Total') + '</strong></td><td class="stmt-num"><strong>' + formatMoneyEn(grp.totalBank) + '</strong></td></tr></tbody></table>';
                }
                html += '<div class="cash-bank-total"><strong>' + (LANG === 'fa' ? 'مجموع کل ' + curr + ':' : 'Grand Total ' + curr + ':') + '</strong> <span style="font-weight:700;color:var(--accent);font-size:1.1rem;">' + formatMoneyEn(grp.total) + '</span></div></div>';
            });
            el.innerHTML = html;
        }

        function exportCurrentReportExcel() {
            const panel = document.querySelector('.report-content.show');
            if (!panel) return;
            const table = panel.querySelector('.report-table');
            if (!table) { toast(LANG === 'fa' ? 'ابتدا گزارش تولید کنید' : 'Generate report first', true); return; }
            const rows = table.querySelectorAll('tr');
            let csv = '\ufeff';
            rows.forEach(function(row) {
                const cells = row.querySelectorAll('th, td');
                const line = [];
                cells.forEach(function(cell) { line.push('"' + cell.textContent.replace(/"/g, '""').trim() + '"'); });
                csv += line.join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'report-' + currentReportType + '-' + new Date().toISOString().slice(0, 10) + '.csv';
            link.click();
        }

        function startPresenceInterval() {
            if (presenceInterval) clearInterval(presenceInterval);
            apiFetch('/api/auth/me/presence', { method: 'PATCH', body: JSON.stringify({ status: 'online' }) }).catch(function(){});
            presenceInterval = setInterval(function() {
                apiFetch('/api/auth/me/presence', { method: 'PATCH', body: JSON.stringify({ status: 'online' }) }).catch(function(){});
            }, 30000);
        }
        var _staffPresenceToastAt = {};
        function formatStaffPresenceToast(data) {
            if (!data || !data.user) return '';
            var name = userDisplay(data.user) || data.user.email || '';
            var ev = data.event || 'status';
            var st = data.status || 'offline';
            if (ev === 'login') return (t('staff_presence_login') || (LANG === 'fa' ? '{name} وارد سیستم شد' : '{name} logged in')).replace('{name}', name);
            if (ev === 'logout') return (t('staff_presence_logout') || (LANG === 'fa' ? '{name} از سیستم خارج شد' : '{name} logged out')).replace('{name}', name);
            if (ev === 'online' || st === 'online') return (t('staff_presence_online') || (LANG === 'fa' ? '{name} آنلاین شد' : '{name} is online')).replace('{name}', name);
            if (st === 'away') return (t('staff_presence_away') || (LANG === 'fa' ? '{name} — دور' : '{name} — away')).replace('{name}', name);
            if (st === 'busy') return (t('staff_presence_busy') || (LANG === 'fa' ? '{name} — مشغول' : '{name} — busy')).replace('{name}', name);
            if (st === 'offline') return (t('staff_presence_offline') || (LANG === 'fa' ? '{name} آفلاین شد' : '{name} went offline')).replace('{name}', name);
            return (t('staff_presence_status') || (LANG === 'fa' ? 'وضعیت {name} تغییر کرد' : '{name} status changed')).replace('{name}', name);
        }
        function handleStaffPresence(data) {
            if (!data || !data.userId) return;
            if (!currentUser || data.userId === currentUser.id) return;
            if (typeof can !== 'function' || !can('staff_activity')) return;
            var dedupeKey = data.userId + ':' + (data.event || '') + ':' + (data.status || '');
            var now = Date.now();
            if (_staffPresenceToastAt[dedupeKey] && now - _staffPresenceToastAt[dedupeKey] < 4000) return;
            _staffPresenceToastAt[dedupeKey] = now;
            var active = document.querySelector('.nav-link.active');
            if (active && active.getAttribute('data-page') === 'staff-activity' && typeof loadStaffActivity === 'function') {
                loadStaffActivity();
            }
            if (typeof updateNavBadges === 'function') {
                apiFetch('/api/analytics/dashboard').then(function(r) {
                    if (r.ok && r.data) updateNavBadges(r.data);
                }).catch(function(){});
            }
            var msg = formatStaffPresenceToast(data);
            if (msg && typeof toast === 'function') toast(msg, false);
        }
        function connectSocket() {
            if (!token) return;
            if (socket) {
                try { socket.disconnect(); } catch (_e) {}
                socket = null;
            }
            try {
                if (typeof io !== 'undefined') {
                    socket = io({ auth: { token: token } });
                    socket.on('staff_presence', handleStaffPresence);
                    socket.on('user_status', function() {
                        const active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'staff-activity' && typeof loadStaffActivity === 'function') loadStaffActivity();
                    });
                    socket.on('message_status_updated', function(data) {
                        if (data.conversationId === currentConvId) {
                            const msgEl = document.querySelector('.msg[data-msg-id="' + data.messageId + '"]');
                            if (msgEl) {
                                const statusEl = msgEl.querySelector('.msg-status');
                                const tick = waMsgStatusTicks(data.status);
                                if (statusEl) {
                                    statusEl.className = 'msg-status msg-status-' + (data.status || '');
                                    statusEl.textContent = tick;
                                } else if (data.status) {
                                    const footer = msgEl.querySelector('.msg-footer');
                                    if (footer) footer.insertAdjacentHTML('beforeend', '<span class="msg-status msg-status-' + data.status + '">' + tick + '</span>');
                                }
                            }
                        }
                    });
                    socket.on('new_message', function(data) {
                        if (data.isHiddenFromStaff && typeof canViewHiddenConversations === 'function' && !canViewHiddenConversations()) return;
                        const active = document.querySelector('.nav-link.active');
                        const onConv = active && active.getAttribute('data-page') === 'conversations';
                        const convId = data.conversationId || (data.conversation && data.conversation.id);
                        const viewingConv = onConv && currentConvId === convId;
                        if (onConv) { debouncedLoadConversations(400); updateNavBadges(); }
                        if (viewingConv && convId) loadMessages(convId);
                        else if (data.customer && !viewingConv) toast((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + (data.customer.name || data.customer.phone || ''), false);
                        if (document.hidden && data.customer && typeof showDesktopNotification === 'function') showDesktopNotification(data);
                    });
                    socket.on('user_login', function(data) {
                        if (data && typeof handleStaffPresence === 'function') {
                            handleStaffPresence({ event: 'login', userId: data.userId, status: 'online', user: data.user || { id: data.userId } });
                        }
                        const active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'staff-activity' && typeof loadStaffActivity === 'function') loadStaffActivity();
                    });
                    socket.on('internal_message', function(data) {
                        playInternalChatSound();
                        const fromName = (data.fromUser && data.fromUser.name) || (LANG === 'fa' ? 'کاربر' : 'User');
                        let preview = (data.message && data.message.content) ? String(data.message.content).slice(0, 50) : '';
                        if (preview.length > 50) preview += '…';
                        const active = document.querySelector('.nav-link.active');
                        const onInternalPage = active && active.getAttribute('data-page') === 'internal-chat';
                        const viewingThread = currentInternalThreadId === data.threadId;
                        const popup = document.getElementById('internalChatPopup');
                        const popupOpen = popup && popup.style.display !== 'none';
                        const popupViewingThread = popupOpen && currentInternalThreadId === data.threadId;
                        if (onInternalPage && viewingThread) {
                            appendInternalMessage(data.message);
                            loadInternalThreads();
                        } else if (popupViewingThread) {
                            appendInternalMessageToPopup(data.message);
                            loadInternalThreads();
                        } else if (!onInternalPage) {
                            window.hasNewInternalChat = true; updateNavBadges();
                            loadInternalThreads();
                            toast((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + fromName + (preview ? ': ' + preview : ''), false);
                            showInternalChatPopup(data.threadId, fromName);
                        } else if (!viewingThread) {
                            openInternalThread(data.threadId);
                        } else {
                            loadInternalThreads();
                        }
                    });
                    socket.on('ticket_reply', function(data) {
                        playInternalChatSound();
                        const fromName = (data.fromUser && data.fromUser.name) || (LANG === 'fa' ? 'کاربر' : 'User');
                        let preview = (data.reply && data.reply.content) ? String(data.reply.content).slice(0, 40) : '';
                        if (preview.length > 40) preview += '…';
                        const active = document.querySelector('.nav-link.active');
                        const onTicketsPage = active && active.getAttribute('data-page') === 'tickets';
                        const viewingTicket = currentTicketId === data.ticketId;
                        if (onTicketsPage && viewingTicket) {
                            appendTicketReply(data.reply);
                        } else {
                            if (!onTicketsPage) { window.navBadgeCounts.tickets = (window.navBadgeCounts.tickets || 0) + 1; updateNavBadges(); }
                            loadTickets();
                            toast((LANG === 'fa' ? 'پاسخ جدید به تیکت «' : 'New reply to ticket "') + (data.ticketTitle || '') + (LANG === 'fa' ? '» از ' : '" from ') + fromName + (preview ? ': ' + preview : ''), false);
                            if (!onTicketsPage) { showPage('tickets'); setTimeout(function(){ loadTicketDetail(data.ticketId); }, 150); }
                            else if (!viewingTicket) loadTicketDetail(data.ticketId);
                        }
                    });
                    socket.on('call_offer', function(data) {
                        if (internalCallIsJoining) {
                            handleCallOfferAsJoiner(data);
                            return;
                        }
                        if (internalCallPendingInvite) return;
                        internalCallPendingOffer = data;
                        internalCallIsIncoming = true;
                        playCallRingtone();
                        showInternalCallModal(data.type === 'video' ? t('incoming_video_call') : t('incoming_voice_call'), true);
                    });
                    socket.on('call_answer', function(data) {
                        if (data.threadId !== currentInternalThreadId) return;
                        const pc = internalCallPeers[data.fromUserId];
                        if (pc) {
                            pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(function() {
                                const queue = internalCallIceQueue[data.fromUserId] || [];
                                internalCallIceQueue[data.fromUserId] = [];
                                queue.forEach(function(c) {
                                    if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(function(e) { console.warn('addIce:', e); });
                                });
                            }).catch(function(e) { console.warn('setRemoteDesc:', e); });
                        }
                    });
                    socket.on('call_ice', function(data) {
                        if (data.threadId !== currentInternalThreadId) return;
                        if (!data.candidate) return;
                        const pc = internalCallPeers[data.fromUserId];
                        if (pc) {
                            if (pc.remoteDescription) {
                                pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(function(e) { console.warn('addIce:', e); });
                            } else {
                                if (!internalCallIceQueue[data.fromUserId]) internalCallIceQueue[data.fromUserId] = [];
                                internalCallIceQueue[data.fromUserId].push(data.candidate);
                            }
                        }
                    });
                    socket.on('call_participant_joined', function(data) {
                        if (data.threadId !== currentInternalThreadId || !internalCallLocalStream) return;
                        const newUserId = data.userId;
                        if (internalCallPeers[newUserId]) return;
                        const pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                        internalCallPeers[newUserId] = pc;
                        attachPeerConnectionStateHandlers(pc, newUserId);
                        internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                        pc.onicecandidate = function(e) { const sk = getSocket(); if (e.candidate && sk) sk.emit('call_ice', { toUserId: newUserId, threadId: currentInternalThreadId, candidate: e.candidate }); };
                        pc.ontrack = function(e) { const rv = getOrCreateRemoteVideoEl(newUserId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                        pc.createOffer().then(function(offer) { return pc.setLocalDescription(offer).then(function() { return offer; }); }).then(function(offer) {
                            const sk = getSocket(); if (sk) sk.emit('call_offer', { toUserId: newUserId, threadId: currentInternalThreadId, type: internalCallType, sdp: offer });
                        }).catch(function(err) { console.warn('createOffer for new participant:', err); });
                    });
                    socket.on('call_participant_left', function(data) {
                        if (data.threadId !== currentInternalThreadId) return;
                        const pc = internalCallPeers[data.userId];
                        if (pc) { pc.close(); delete internalCallPeers[data.userId]; }
                        removeRemoteVideoEl(data.userId);
                        const addBtn = document.getElementById('internalCallAddBtn');
                        if (addBtn) addBtn.style.display = (Object.keys(internalCallPeers).length > 0) ? 'flex' : 'none';
                        if (Object.keys(internalCallPeers).length === 0) hideInternalCallModal();
                    });
                    socket.on('call_invite', function(data) {
                        internalCallPendingInvite = data;
                        currentInternalThreadId = data.threadId;
                        const fromName = (data.fromUserName || '').trim() || (LANG === 'fa' ? 'کاربر' : 'User');
                        const txt = document.getElementById('internalCallInviteText');
                        if (txt) txt.textContent = (LANG === 'fa' ? fromName + ' شما را به تماس دعوت کرده' : fromName + ' invites you to the call');
                        const mod = document.getElementById('internalCallInviteModal');
                        if (mod) mod.style.display = 'flex';
                        playCallRingtone();
                    });
                    socket.on('call_room_info', function(data) {
                        if (!internalCallPendingInvite) return;
                        internalCallPendingInvite.participantIds = data.participantIds || [];
                        internalCallPendingInvite.type = data.type || 'voice';
                    });
                    socket.on('call_invite_reject', function(data) {
