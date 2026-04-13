/**
 * Dashboard SPA — پنل اصلی CRM (ورود، ناو، مکالمات، …).
 * زبان و t() در js/modules/dashboard-i18n.js (قبل از این فایل).
 * وابستگی‌ها: CRM.Constants, CRM.Utils, CRM.Api — backend/docs/FRONTEND-ARCHITECTURE.md
 *
 * منبع: public/js/dashboard/src/chunk-NN.js — بعد از ویرایش: npm run build:dashboard
 */
        const API = '';
        let token = localStorage.getItem('crm_token');
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
        fetch((API || '') + '/api/panel-settings/public/languages').then(function(r){ return r.json(); }).then(function(data){
            if (data && data.supportedLanguages) window.applySupportedLanguages(data.supportedLanguages, data.defaultLanguage);
            else if (typeof setLang === 'function') setLang(LANG);
        }).catch(function(){
            if (typeof setLang === 'function') setLang(LANG);
        });
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
        function updateMobileTabBar(page) {
            const tabBar = document.getElementById('mobileTabBar');
            const bottomBar = document.getElementById('bottomBar');
            if (!tabBar || !bottomBar) return;
            const isMobile = window.innerWidth <= 900;
            bottomBar.classList.toggle('has-mobile-tab', isMobile);
            if (!isMobile) return;
            document.querySelectorAll('.mobile-tab-bar .mobile-tab-item').forEach(function(item) {
                const p = item.getAttribute('data-page');
                const active = (p === page) || (p === 'more' && ['profile','tickets','tasks','processes','departments','users','branches','whatsapp','rates','services','internal-chat','panel-settings','supervision','staff-activity'].indexOf(page) >= 0);
                item.classList.toggle('active', active);
                item.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            const perms = (currentUser && currentUser.permissions) || {};
            const hidden = HIDDEN_SECTIONS || [];
            document.querySelectorAll('.mobile-tab-bar .mobile-tab-item[data-section]').forEach(function(item) {
                const sec = item.getAttribute('data-section');
                const visible = (sec === 'dashboard' || sec === 'profile') ? (hidden.indexOf(sec) < 0) : (perms[sec] === true && hidden.indexOf(sec) < 0);
                item.style.display = visible ? '' : 'none';
            });
        }

        function headers() {
            const h = { 'Content-Type': 'application/json' };
            if (token) h['Authorization'] = 'Bearer ' + token;
            return h;
        }
        if (window.CRM && window.CRM.Api) {
            window.CRM_API_BASE = API || '';
            window.CRM.Api.init({
                getHeaders: headers,
                getLang: function () { return LANG; },
                on401: function () {
                    token = null;
                    localStorage.removeItem('crm_token');
                    document.documentElement.classList.remove('auth-has-token');
                    document.getElementById('loginBox').style.display = 'flex';
                    document.getElementById('app').classList.remove('show');
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
        function setRatesChartCurrency(key) {
            ratesChartCurrentCurrency = key;
            document.querySelectorAll('.rates-chart-tab').forEach(function(b) { b.classList.remove('active'); if (b.getAttribute('data-currency') === key) b.classList.add('active'); });
            loadRatesCharts();
        }
        window.setRatesChartCurrency = setRatesChartCurrency;
        let ratesChartsLoadSeq = 0;
        function ratesChartsYAxisLocale() {
            if (LANG === 'fa') return 'fa-IR';
            if (LANG === 'tr') return 'tr-TR';
            return 'en-US';
        }
        function ratesChartsShowEmpty(summaryEl, statsRow, message, withRetry) {
            if (statsRow) statsRow.innerHTML = '';
            if (!summaryEl) return;
            const retry = withRetry
                ? '<button type="button" class="btn-secondary rates-charts-retry-btn" onclick="loadRatesCharts()">' + escapeHtml(t('rates_charts_retry')) + '</button>'
                : '';
            summaryEl.innerHTML = '<div class="rates-charts-empty">' +
                '<p class="rates-charts-empty-text">' + escapeHtml(message) + '</p>' + retry + '</div>';
        }
        async function loadRatesCharts() {
            const canvas = document.getElementById('ratesChartCanvas');
            const summaryEl = document.getElementById('ratesChartsSummary');
            const statsRow = document.getElementById('ratesChartsStatsRow');
            const loadingOverlay = document.getElementById('ratesChartsLoadingOverlay');
            const refreshBtn = document.querySelector('.rates-charts-refresh-btn');
            if (!canvas) return;
            const loadId = ++ratesChartsLoadSeq;
            const periodSel = document.getElementById('ratesChartPeriod');
            const days = periodSel ? parseInt(periodSel.value, 10) || 30 : 30;
            if (loadingOverlay) loadingOverlay.classList.add('visible');
            if (refreshBtn) refreshBtn.classList.add('loading');
            if (statsRow) statsRow.innerHTML = '';
            if (summaryEl) summaryEl.innerHTML = '';
            try {
            const res = await apiFetch('/api/rates/history?key=' + encodeURIComponent(ratesChartCurrentCurrency) + '&days=' + days);
            if (loadId !== ratesChartsLoadSeq) return;
            if (loadingOverlay) loadingOverlay.classList.remove('visible');
            if (refreshBtn) refreshBtn.classList.remove('loading');
            if (res.needLogin) return;
            const labels = [];
            const values = [];
            const payload = res.data || {};
            if (res.ok && payload.points && payload.points.length > 0) {
                payload.points.forEach(function(p) { labels.push(p.date); values.push(p.value); });
            }
            const currencyLabels = { usd: 'دلار', eur: 'یورو', gbp: 'پوند', aed: 'درهم', try: 'لیر', gold: 'طلا' };
            const label = currencyLabels[ratesChartCurrentCurrency] || rateLabel(ratesChartCurrentCurrency);
            const unitLabel = t('currency_unit_toman') || 'تومان';
            if (ratesChartInstance) { ratesChartInstance.destroy(); ratesChartInstance = null; }
            if (values.length > 0) {
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
                gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)');
                gradient.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
                const yLoc = ratesChartsYAxisLocale();
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
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#10b981',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 2.2,
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
                                ticks: { maxRotation: 40, maxTicksLimit: 10, font: { size: 11 }, color: 'rgba(139, 157, 195, 0.8)' },
                                grid: { display: false },
                                border: { display: false }
                            },
                            y: {
                                display: true,
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
                const lastVal = values[values.length - 1];
                const firstVal = values[0];
                const minVal = Math.min.apply(null, values);
                const maxVal = Math.max.apply(null, values);
                const changeNum = firstVal && lastVal ? (lastVal - firstVal) / firstVal * 100 : null;
                const changeStr = changeNum != null ? changeNum.toFixed(1) : null;
                const changeClass = changeNum > 0 ? 'up' : changeNum < 0 ? 'down' : 'neutral';
                if (statsRow) {
                    statsRow.innerHTML =
                        '<div class="rates-charts-stat-card stat-current"><span class="stat-label">' + t('rates_charts_stat_current') + '</span><span class="stat-value">' + formatPrice(lastVal) + ' <span class="rates-charts-unit">' + unitLabel + '</span></span></div>' +
                        '<div class="rates-charts-stat-card"><span class="stat-label">' + t('rates_charts_stat_min') + '</span><span class="stat-value">' + formatPrice(minVal) + '</span></div>' +
                        '<div class="rates-charts-stat-card"><span class="stat-label">' + t('rates_charts_stat_max') + '</span><span class="stat-value">' + formatPrice(maxVal) + '</span></div>' +
                        (changeStr != null ? '<div class="rates-charts-stat-card stat-change ' + changeClass + '"><span class="stat-label">' + t('rates_charts_stat_change') + '</span><span class="stat-value">' + (changeNum > 0 ? '+' : '') + changeStr + '% ' + t('rates_charts_in_period') + '</span></div>' : '');
                }
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
            document.getElementById('summaryTotalCash').textContent = formatMoney(d.totalCash, 'IRR');
            document.getElementById('summaryTotalBank').textContent = formatMoney(d.totalBank, 'IRR');
            document.getElementById('summaryTotal').textContent = formatMoney(d.total, 'IRR');
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
        function connectSocket() {
            if (!token || socket) return;
            try {
                if (typeof io !== 'undefined') {
                    socket = io({ auth: { token: token } });
                    socket.on('user_status', function() {
                        const active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'staff-activity') loadStaffActivity();
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
                        const active = document.querySelector('.nav-link.active');
                        const onConv = active && active.getAttribute('data-page') === 'conversations';
                        const convId = data.conversationId || (data.conversation && data.conversation.id);
                        const viewingConv = onConv && currentConvId === convId;
                        if (onConv) { debouncedLoadConversations(400); updateNavBadges(); }
                        if (viewingConv && convId) loadMessages(convId);
                        else if (data.customer && !viewingConv) toast((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + (data.customer.name || data.customer.phone || ''), false);
                        if (document.hidden && data.customer && typeof showDesktopNotification === 'function') showDesktopNotification(data);
                    });
                    socket.on('user_login', function() {
                        const active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'staff-activity') loadStaffActivity();
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
                const notifIcon = typeof resolvePanelFaviconHref === 'function' ? resolvePanelFaviconHref(PANEL_BRANDING_STATE || {}) : '/favicon-kaya.svg';
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
            if (page === 'conversations') { showPage('conversations'); toast(LANG === 'en' ? 'Search in conversations is supported via API filter.' : 'جستج�� در ��Rست �&کا��&ات از ف�R�تر API پشت�Rبا� �R �&�R�Rش��د.'); }
            else if (page === 'customers') { showPage('customers'); toast(LANG === 'en' ? 'Search in customers is supported via API filter.' : 'جستج�� در �&شتر�Rا�  از ف�R�تر API پشت�Rبا� �R �&�R�Rش��د.'); }
            else toast(LANG === 'en' ? 'Search in this section coming soon.' : 'جستج�� در ا�R�  بخش ب�! ز��د�R.'); 
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
            const ac = new AbortController();
            const tid = setTimeout(function() { ac.abort(); }, 32000);
            try {
                const r = await fetch(API + '/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email }),
                    signal: ac.signal
                });
                const data = await r.json().catch(function() { return {}; });
                if (!r.ok) {
                    if (successEl) successEl.style.display = 'none';
                    if (errEl) errEl.textContent = data.error || t('forgot_send_fail');
                    return;
                }
                if (successEl) { successEl.textContent = (data.message || t('forgot_success_msg')); successEl.style.display = 'block'; }
            } catch (e) {
                if (errEl) errEl.textContent = (e && e.name === 'AbortError') ? t('forgot_send_fail') : t('login_err_connect');
            } finally {
                clearTimeout(tid);
                if (btn) btn.disabled = false;
            }
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
            if (newPass.length < 8) { if (errEl) errEl.textContent = t('reset_err_length'); return; }
            if (!/[a-zA-Z]/.test(newPass)) { if (errEl) errEl.textContent = t('reset_err_letter'); return; }
            if (!/[0-9]/.test(newPass)) { if (errEl) errEl.textContent = t('reset_err_digit'); return; }
            if (!window._resetToken) { if (errEl) errEl.textContent = t('reset_link_expired'); return; }
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
                    if (btn) btn.disabled = false;
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
            }
            setupProfileEventHandlers();
            await refreshTelegramProfileSection();
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
        function profilePicShowsImage(url) {
            if (!url || typeof url !== 'string') return false;
            var n = normalizeProfilePicUrl(url);
            return !!n && (/^https?:\/\//i.test(n) || n.indexOf('data:') === 0);
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
                btnForgotSubmit.removeEventListener('click', window.submitForgotPassword);
                btnForgotSubmit.addEventListener('click', window.submitForgotPassword);
            }
            
            // Back to login from forgot
            const btnBackFromForgot = document.getElementById('btnBackToLoginFromForgot');
            if (btnBackFromForgot) {
                bindTapSafe(btnBackFromForgot, window.backToLoginFromForgot);
            }
            
            // Reset password submit button
            const btnResetSubmit = document.getElementById('btnResetSubmit');
            if (btnResetSubmit) {
                btnResetSubmit.removeEventListener('click', window.submitResetPassword);
                btnResetSubmit.addEventListener('click', window.submitResetPassword);
            }
            
            // Back to login from reset
            const btnBackFromReset = document.getElementById('btnBackToLoginFromReset');
            if (btnBackFromReset) {
                bindTapSafe(btnBackFromReset, function(e) { if (e && e.preventDefault) e.preventDefault(); window.backToLoginFromReset(); });
            }
            
            // Language buttons in forgot/reset modal
            const forgotLangButtons = document.querySelectorAll('.login-lang button[data-lang]');
            if (forgotLangButtons) {
                forgotLangButtons.forEach(function(btn) {
                    bindTapSafe(btn, function() {
                        const lang = btn.getAttribute('data-lang');
                        if (lang) window.setLang(lang);
                    });
                });
            }
            
            // Skip to content link
            const skipLink = document.getElementById('skipLink');
            if (skipLink) {
                skipLink.removeEventListener('click', function(e) { 
                    e.preventDefault(); 
                    const m = document.getElementById('mainContent');
                    if (m) m.focus(); 
                });
                skipLink.addEventListener('click', function(e) { 
                    e.preventDefault(); 
                    const m = document.getElementById('mainContent');
                    if (m) m.focus(); 
                });
            }
        }

        /* ========== Global Event Handlers Setup ========== */
        function setupGlobalEventHandlers() {
            // Header menu button
            const menuBtn = document.getElementById('headerMenuBtn');
            if (menuBtn) {
                menuBtn.removeEventListener('click', toggleSidebarMobile);
                menuBtn.addEventListener('click', toggleSidebarMobile);
            }
            
            // Sidebar overlay
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            if (sidebarOverlay) {
                sidebarOverlay.removeEventListener('click', closeSidebarMobile);
                sidebarOverlay.addEventListener('click', closeSidebarMobile);
            }
            
            // Header announcement toggle button
            const annToggleBtn = document.getElementById('headerAnnToggleBtn');
            if (annToggleBtn) {
                annToggleBtn.removeEventListener('click', toggleAnnouncementMarquee);
                annToggleBtn.addEventListener('click', toggleAnnouncementMarquee);
            }
            
            // Header notify buttons — use onclick from HTML only (avoid duplicate handlers)
            
            // Header search triggers
            const searchTrigger = document.getElementById('headerSearchTrigger');
            if (searchTrigger) {
                searchTrigger.removeEventListener('click', openHeaderSearchPopup);
                searchTrigger.addEventListener('click', openHeaderSearchPopup);
            }
            
            const searchTriggerDesktop = document.getElementById('headerSearchTriggerDesktop');
            if (searchTriggerDesktop) {
                searchTriggerDesktop.removeEventListener('click', openHeaderSearchPopup);
                searchTriggerDesktop.addEventListener('click', openHeaderSearchPopup);
            }
            
            // Header search modal overlay - close on background click
            const headerSearchModal = document.getElementById('headerSearchModal');
            if (headerSearchModal) {
                const searchModalCloseHandler = function(e) {
                    if (e.target === headerSearchModal) closeHeaderSearchPopup();
                };
                headerSearchModal.removeEventListener('click', searchModalCloseHandler);
                headerSearchModal.addEventListener('click', searchModalCloseHandler);
            }
            
            // Header search modal close button
            const headerSearchClose = document.querySelector('#headerSearchModal .modal-close');
            if (headerSearchClose) {
                headerSearchClose.removeEventListener('click', closeHeaderSearchPopup);
                headerSearchClose.addEventListener('click', closeHeaderSearchPopup);
            }
            
            // Header search modal input - Enter key
            const headerSearchModalInput = document.getElementById('headerSearchModalInput');
            if (headerSearchModalInput) {
                const searchInputHandler = function(e) {
                    if (e.key === 'Enter') doHeaderSearchFromModal();
                };
                headerSearchModalInput.removeEventListener('keyup', searchInputHandler);
                headerSearchModalInput.addEventListener('keyup', searchInputHandler);
            }
            
            // Header user dropdown triggers (mobile + desktop)
            const userDropdownHandler = function(e) { toggleUserDropdown(e); };
            const userDropdownMobile = document.getElementById('userDropdownTriggerMobile');
            if (userDropdownMobile) {
                userDropdownMobile.removeEventListener('click', userDropdownHandler);
                userDropdownMobile.addEventListener('click', userDropdownHandler);
            }
            const userDropdownDesktop = document.getElementById('userDropdownTrigger');
            if (userDropdownDesktop) {
                userDropdownDesktop.removeEventListener('click', userDropdownHandler);
                userDropdownDesktop.addEventListener('click', userDropdownHandler);
            }
            
            // Header logo
            const headerLogo = document.getElementById('headerLogo');
            if (headerLogo) {
                const logoHandler = function(e) {
                    e.preventDefault();
                    showPage('dashboard');
                    closeSidebarMobile();
                    return false;
                };
                headerLogo.removeEventListener('click', logoHandler);
                headerLogo.addEventListener('click', logoHandler);
            }
            // Chat back button (mobile) — bind globally so it works when chat is open
            const chatBackBtn = document.getElementById('chatBackBtn');
            if (chatBackBtn && typeof closeChatMobile === 'function') {
                chatBackBtn.removeEventListener('click', closeChatMobile);
                chatBackBtn.addEventListener('click', closeChatMobile);
            }
            
            // Header search input - Enter key
            const headerSearch = document.getElementById('headerSearch');
            if (headerSearch) {
                const searchHandler = function(e) {
                    if (e.key === 'Enter') doHeaderSearch();
                };
                headerSearch.removeEventListener('keyup', searchHandler);
                headerSearch.addEventListener('keyup', searchHandler);
            }
            
            // Header quick action buttons (Show conversations, add customer, add ticket)
            const headerQuickBtns = document.querySelectorAll('.header-quick-btn');
            if (headerQuickBtns) {
                headerQuickBtns.forEach(function(btn) {
                    btn.removeEventListener('click', function handleQuickBtnClick(e) { handleHeaderQuickBtnClick(e, btn); });
                    btn.addEventListener('click', function handleQuickBtnClick(e) { handleHeaderQuickBtnClick(e, btn); });
                });
            }
            
            // Header notification button (desktop) — use onclick from HTML only
            
            // Header language buttons
            const headerLangBtns = document.querySelectorAll('.header-lang-btn');
            if (headerLangBtns) {
                headerLangBtns.forEach(function(btn) {
                    btn.removeEventListener('click', function handleLangClick(e) { 
                        const lang = btn.getAttribute('data-lang');
                        if (lang) window.setLang(lang); 
                    });
                    btn.addEventListener('click', function handleLangClick(e) { 
                        const lang = btn.getAttribute('data-lang');
                        if (lang) window.setLang(lang); 
                    });
                });
            }
            
            // Header language dropdown items (in languageDropdown)
            const langDropdownItems = document.querySelectorAll('.language-dropdown button[data-lang]');
            if (langDropdownItems) {
                langDropdownItems.forEach(function(btn) {
                    btn.removeEventListener('click', function handleLangDropdownClick(e) {
                        e.preventDefault();
                        const lang = btn.getAttribute('data-lang');
                        if (lang) window.setLang(lang);
                    });
                    btn.addEventListener('click', function handleLangDropdownClick(e) {
                        e.preventDefault();
                        const lang = btn.getAttribute('data-lang');
                        if (lang) window.setLang(lang);
                    });
                });
            }
            
            // User dropdown items
            const userDropdownItems = document.querySelectorAll('.user-dropdown a, .user-dropdown button');
            if (userDropdownItems) {
                userDropdownItems.forEach(function(item) {
                    const dataset = item.getAttribute('data-action');
                    if (dataset === 'logout') {
                        item.removeEventListener('click', function handleLogout(e) { 
                            e.preventDefault(); 
                            logout(); 
                        });
                        item.addEventListener('click', function handleLogout(e) { 
                            e.preventDefault(); 
                            logout(); 
                        });
                    } else if (dataset === 'profile') {
                        item.removeEventListener('click', function handleProfile(e) { 
                            e.preventDefault(); 
                            showPage('profile'); 
                        });
                        item.addEventListener('click', function handleProfile(e) { 
                            e.preventDefault(); 
                            showPage('profile'); 
                        });
                    }
                });
            }
        }
        
        function handleHeaderQuickBtnClick(e, btn) {
            const onclick = btn.getAttribute('onclick') || btn.getAttribute('data-onclick-backup') || btn.getAttribute('data-onclick') || '';
            if (onclick === "showPage('conversations'); openNewConvModal();") {
                showPage('conversations');
                setTimeout(openNewConvModal, 100);
            } else if (onclick === "showPage('customers'); openCustomerModal();") {
                showPage('customers');
                setTimeout(openCustomerModal, 100);
            } else if (onclick === "showPage('tickets'); setTimeout(function(){ toggleTicketForm(); }, 350);") {
                showPage('tickets');
                setTimeout(toggleTicketForm, 350);
            }
        }
        
        /* ========== Conversation Event Handlers Setup ========== */
        let convListClickHandler = null;

        var CONV_QUICK_TABS_COLLAPSE_LS = 'crm_conv_quick_tabs_collapsed';
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
                    const isGroup = item.getAttribute('data-is-group') === '1';
                    
                    if (id) {
                        openChat(id, name || '', phone || '', profilePic || '', isGroup);
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
            
            // Filter selects - change events
            ['convFilterStatus', 'convFilterPriority', 'convFilterBranch', 'convFilterDept', 'convFilterAssignee'].forEach(function(id) {
                const select = document.getElementById(id);
                if (select) {
                    select.removeEventListener('change', applyConvFilters);
                    select.addEventListener('change', applyConvFilters);
                }
            });
            
            // Chat back button
            const backBtn = document.getElementById('chatBackBtn');
            if (backBtn) {
                backBtn.removeEventListener('click', closeChatMobile);
                backBtn.addEventListener('click', closeChatMobile);
            }
            
            // Chat detail toggle
            const detailToggle = document.getElementById('chatDetailToggle');
            if (detailToggle) {
                detailToggle.removeEventListener('click', toggleChatDetailBar);
                detailToggle.addEventListener('click', toggleChatDetailBar);
            }
            
            // New conversation modal close button
            const newConvModalClose = document.querySelector('#newConvModal .modal-close');
            if (newConvModalClose) {
                newConvModalClose.removeEventListener('click', closeNewConvModal);
                newConvModalClose.addEventListener('click', closeNewConvModal);
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
            ['convDetailStatus', 'convDetailPriority', 'convDetailAssignee', 'convDetailDept'].forEach(function(id) {
                const select = document.getElementById(id);
                if (select) {
                    select.removeEventListener('change', function() {});
                    select.addEventListener('change', function() {});
                }
            });
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
            const voiceDeleteBtn = document.getElementById('chatVoiceDeleteBtn');
            if (voiceDeleteBtn) {
                voiceDeleteBtn.removeEventListener('click', cancelVoiceRecord);
                voiceDeleteBtn.addEventListener('click', cancelVoiceRecord);
            }
            const voicePauseBtn = document.getElementById('chatVoicePauseBtn');
            if (voicePauseBtn) {
                voicePauseBtn.removeEventListener('click', toggleVoicePause);
                voicePauseBtn.addEventListener('click', toggleVoicePause);
            }
            const voiceSendBtn = document.getElementById('chatVoiceSendBtn');
            if (voiceSendBtn) {
                voiceSendBtn.removeEventListener('click', finalizeVoiceRecordAndSend);
                voiceSendBtn.addEventListener('click', finalizeVoiceRecordAndSend);
            }
            const chatReplyCancelBtn = document.querySelector('.chat-reply-cancel');
            if (chatReplyCancelBtn) {
                chatReplyCancelBtn.removeEventListener('click', cancelReply);
                chatReplyCancelBtn.addEventListener('click', cancelReply);
            }
            document.querySelectorAll('.conv-rating-star').forEach(function(star) {
                if (star._crmRatingClick) star.removeEventListener('click', star._crmRatingClick);
                star._crmRatingClick = function() {
                    const newRating = parseInt(this.getAttribute('data-rating'), 10);
                    updateConvRating(currentConvId, newRating);
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
        
        // Setup Staff Activity event handlers
        function setupStaffActivityEventHandlers() {
            // Refresh button
            const refreshBtn = document.getElementById('staffActivityRefresh');
            if (refreshBtn) {
                const staffRefreshHandler = function() { loadStaffActivity({ refreshAttendance: true }); };
                refreshBtn.removeEventListener('click', staffRefreshHandler);
                refreshBtn.addEventListener('click', staffRefreshHandler);
            }
            
            // Attendance apply button
            const applyBtn = document.getElementById('attendanceApplyBtn');
            if (applyBtn) {
                applyBtn.removeEventListener('click', loadAttendanceReport);
                applyBtn.addEventListener('click', loadAttendanceReport);
            }
            
            // Dashboard refresh button
            const dashRefreshBtn = document.getElementById('dashboardRefreshBtn');
            if (dashRefreshBtn) {
                dashRefreshBtn.removeEventListener('click', refreshDashboard);
                dashRefreshBtn.addEventListener('click', refreshDashboard);
            }
            
            // Sidebar toggle (desktop)
            const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
            if (sidebarToggleBtn) {
                sidebarToggleBtn.removeEventListener('click', toggleSidebarDesktop);
                sidebarToggleBtn.addEventListener('click', toggleSidebarDesktop);
            }
            
            // Language buttons - all instances
            document.querySelectorAll('[data-lang]').forEach(function(btn) {
                // Skip the sidebar and dropdown buttons since they have other logic
                if (btn.classList.contains('lang-switch')) return;
                btn.removeEventListener('click', function() {
                    const lang = this.getAttribute('data-lang');
                    if (lang) setLang(lang);
                });
                btn.addEventListener('click', function() {
                    const lang = this.getAttribute('data-lang');
                    if (lang) setLang(lang);
                });
            });
            
            // Language dropdown
            const langDropdownBtn = document.getElementById('langDropdownBtn');
            if (langDropdownBtn) {
                langDropdownBtn.removeEventListener('click', toggleLangDropdown);
                langDropdownBtn.addEventListener('click', toggleLangDropdown);
            }
            
            // Language dropdown menu items
            document.querySelectorAll('.lang-dropdown-menu button').forEach(function(btn) {
                const langHandler = function() {
                    const lang = this.getAttribute('data-lang');
                    if (lang) {
                        setLang(lang);
                        if (typeof closeLangDropdown === 'function') closeLangDropdown();
                    }
                };
                btn.removeEventListener('click', langHandler);
                btn.addEventListener('click', langHandler);
            });
            
            // Mobile footer navigation
            document.querySelectorAll('.mobile-tab-item').forEach(function(tab) {
                tab.removeEventListener('click', function(e) {
                    e.preventDefault();
                    const page = this.getAttribute('data-page');
                    if (page) {
                        showPage(page);
                        closeSidebarMobile();
                    }
                    return false;
                });
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    const page = this.getAttribute('data-page');
                    if (page) {
                        showPage(page);
                        closeSidebarMobile();
                    }
                    return false;
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
        function setConvQuickTab(tab) {
            convQuickTab = tab || 'all';
            convCurrentPage = 1;
            document.querySelectorAll('.conv-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === convQuickTab); });
            applyConvFilters();
        }
        function toggleConvAdvancedFilters() {
            const el = document.getElementById('convAdvancedFilters');
            const btn = document.getElementById('convFilterToggle');
            if (el && btn) { el.classList.toggle('show'); btn.setAttribute('aria-expanded', el.classList.contains('show')); }
        }
        function canViewArchivedConversations() { const r = (currentUser && currentUser.role) || ''; return ['owner','admin','manager'].indexOf(r) >= 0; }
        function canManageConversations() { const r = (currentUser && currentUser.role) || ''; return r === 'owner'; }
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
            const tabArchived = document.getElementById('convTabArchived');
            if (tabArchived) tabArchived.style.display = canViewArchivedConversations() ? '' : 'none';
            const statusFilter = document.getElementById('convFilterStatus');
            if (statusFilter && canViewArchivedConversations()) {
                const hasArchived = Array.from(statusFilter.options).some(function(o){ return o.value === 'archived'; });
                if (!hasArchived) { var opt = document.createElement('option'); opt.value = 'archived'; opt.setAttribute('data-i18n', 'status_archived'); opt.textContent = t('filter_archived') || t('status_archived') || 'Archived'; statusFilter.appendChild(opt); }
            }
        }
        async function syncWhatsAppGroups() {
            const btn = document.getElementById('btnSyncGroups');
            const textSpan = btn && btn.querySelector('.conv-sync-text');
            const syncText = t('conv_sync_groups') || (LANG === 'fa' ? 'همگام‌سازی گروه‌ها' : 'Sync groups');
            if (btn) { btn.disabled = true; if (textSpan) textSpan.textContent = (LANG === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...'); else btn.textContent = (LANG === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...'); }
            try {
                const res = await apiFetch('/api/conversations/sync-groups', { method: 'POST' });
                if (res.needLogin) return;
                if (res.ok) {
                    toast((res.data && res.data.message) || (LANG === 'fa' ? 'گروه‌ها همگام شدند' : 'Groups synced'));
                    setConvQuickTab('groups');
                    loadConversations();
                } else {
                    let errMsg = (res.data && res.data.error) || (LANG === 'fa' ? 'خطا در همگام‌سازی' : 'Sync failed');
                    if (errMsg.indexOf('503') !== -1 || errMsg.indexOf('not ready') !== -1) {
                        errMsg = LANG === 'fa' ? 'واتساپ متصل نیست. ابتدا اتصال را برقرار کنید.' : 'WhatsApp not connected. Connect first.';
                    }
                    toast(errMsg, true);
                }
            } finally {
                if (btn) { btn.disabled = false; if (textSpan) textSpan.textContent = syncText; else btn.textContent = syncText; }
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
            badgesEl.innerHTML = '<span role="listitem" class="conv-detail-badge"><span class="conv-badge-label">' + escapeHtml(t('conv_form_status')) + '</span>' + escapeHtml(statusLabel) + '</span><span role="listitem" class="conv-detail-badge"><span class="conv-badge-label">' + escapeHtml(t('conv_form_priority')) + '</span>' + escapeHtml(prioLabel) + '</span><span role="listitem" class="conv-detail-badge conv-badge-assignee"><span class="conv-badge-label">' + escapeHtml(t('conv_form_assignee')) + '</span><span class="conv-badge-assignee-wrap">' + (d.assignee ? internalMsgAvatarHtml(d.assignee, 'conv-badge-assignee-avatar') : '') + '<span class="conv-badge-assignee-name">' + escapeHtml(assigneeName) + '</span></span></span>' + (deptName ? '<span role="listitem" class="conv-detail-badge conv-badge-dept"><span class="conv-badge-label">' + escapeHtml(t('label_dept')) + '</span>' + escapeHtml(deptName) + '</span>' : '');
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

        async function loadConversations(appendMode) {
            const list = document.getElementById('convList');
            const statsEl = document.getElementById('convStats');
            if (!appendMode) setLoading('convList', 4);
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
            else if (convQuickTab === 'mine' && currentUser && currentUser.id) q += '&assignedTo=' + encodeURIComponent(currentUser.id);
            if (convQuickTab === 'all' || convQuickTab === 'unread' || convQuickTab === 'archived' || convQuickTab === 'groups') { if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value); }
            if (priorityEl && priorityEl.value) q += '&priority=' + encodeURIComponent(priorityEl.value);
            if (branchEl && branchEl.value) q += '&branchId=' + encodeURIComponent(branchEl.value);
            if (deptEl && deptEl.value) q += '&departmentId=' + encodeURIComponent(deptEl.value);
            if ((convQuickTab === 'all' || convQuickTab === 'unread' || convQuickTab === 'unanswered' || convQuickTab === 'open' || convQuickTab === 'archived' || convQuickTab === 'groups') && assigneeEl && assigneeEl.value) q += '&assignedTo=' + encodeURIComponent(assigneeEl.value);
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            const res = await apiFetch('/api/conversations' + q);
            if (res.needLogin) return;
            if (!res.ok) { const ce = document.getElementById('convListCount'); if (ce) ce.textContent = ''; list.innerHTML = '<div class="empty"><span class="empty-icon">💬</span><br>' + t('loading_err') + ' ' + escapeHtml(res.data && res.data.error ? res.data.error : res.error || '') + '</div>'; return; }
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
            const newItems = data.data.map(function(c) {
                const cust = c.customer || {};
                const isGroup = !!(c.metadata && c.metadata.isGroup);
                const name = (isGroup && (c.metadata && (c.metadata.groupName || c.metadata.name))) || cust.name || cust.phone || (isGroup ? (LANG === 'fa' ? 'گروه' : 'Group') : t('customer'));
                const phone = cust.phone || '';
                const metaPhone = isGroup ? (LANG === 'fa' ? 'گروه واتساپ' : 'WhatsApp Group') : phone;
                const initial = isGroup ? '👥' : ((name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?');
                const rawPic = (cust.profilePic && String(cust.profilePic).trim()) ? cust.profilePic : '';
                let profilePic = rawPic ? normalizeProfilePicUrl(rawPic) : '';
                const picSrc = rawPic ? profilePicDisplaySrc(rawPic) : '';
                const canShowImg = !isGroup && rawPic && profilePicShowsImage(rawPic);
                const avatarHtml = '<span class="avatar-fallback' + (isGroup ? ' conv-group-avatar' : '') + '">' + escapeHtml(initial) + '</span>' + (canShowImg && picSrc ? '<img src="' + escapeHtml(picSrc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)">' : '');
                const assigneeName = (c.lastOutgoingIsAutoReply) ? (t('ai_assistant') || 'AI assistant') : userDisplay(c.assignee);
                let assigneeMetaSuffix = '';
                if (assigneeName) {
                    if (c.lastOutgoingIsAutoReply) assigneeMetaSuffix = ' · ' + escapeHtml(assigneeName);
                    else if (c.assignee) assigneeMetaSuffix = ' · <span class="conv-item-assignee-inline">' + internalMsgAvatarHtml(c.assignee, 'conv-item-assignee-avatar') + '<span class="conv-item-assignee-name">' + escapeHtml(assigneeName) + '</span></span>';
                    else assigneeMetaSuffix = ' · ' + escapeHtml(assigneeName);
                }
                const statusBadge = '<span class="badge ' + (c.status || 'open') + '">' + escapeHtml(convStatusLabelUi(c.status)) + '</span>';
                const priorityBadge = c.priority && c.priority !== 'normal' ? '<span class="badge ' + c.priority + '">' + (t('priority_' + c.priority) || c.priority) + '</span>' : '';
                const unreadBadge = (c.unreadCount > 0) ? '<span class="badge unread">' + c.unreadCount + '</span>' : '';
                const preview = (c.lastMessagePreview || '').trim();
                const timeStr = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'time') : '';
                let unansweredBadge = '';
                if (c.lastIncomingMessageAt && (!c.lastOutgoingMessageAt || new Date(c.lastIncomingMessageAt) > new Date(c.lastOutgoingMessageAt))) {
                    const mins = Math.floor((Date.now() - new Date(c.lastIncomingMessageAt).getTime()) / 60000);
                    const waitStr = mins < 60 ? (mins + (LANG === 'fa' ? ' دقیقه' : ' min')) : (mins < 1440 ? (Math.floor(mins / 60) + (LANG === 'fa' ? ' ساعت' : ' hr')) : (Math.floor(mins / 1440) + (LANG === 'fa' ? ' روز' : ' days')));
                    unansweredBadge = '<span class="badge urgent" title="' + (LANG === 'fa' ? 'منتظر پاسخ' : 'Awaiting reply') + '">' + waitStr + '</span>';
                }
                const activeClass = (c.id === currentConvId) ? ' active' : '';
                // نام و شماره در data-* ذخیره می‌شن — event handler میتواند کلیک رو handle کند
                return '<div class="conv-list-item' + activeClass + (isGroup ? ' conv-is-group' : '') + '" data-id="' + c.id + '" data-name="' + escapeHtml(name || '') + '" data-phone="' + escapeHtml(phone || '') + '" data-profile-pic="' + escapeHtml(profilePic || '') + '" data-is-group="' + (isGroup ? '1' : '0') + '" style="cursor:pointer;"><div class="conv-item-avatar">' + avatarHtml + '</div><div class="conv-item-body"><div class="conv-item-top"><span class="name" title="' + escapeHtml(name) + '">' + unreadBadge + (isGroup ? '<span class="conv-group-badge" title="' + (LANG === 'fa' ? 'گروه' : 'Group') + '">👥</span> ' : '') + escapeHtml(name) + '</span><span class="conv-item-time">' + timeStr + '</span></div><div class="conv-item-meta" title="' + escapeHtml(metaPhone + (assigneeName ? ' · ' + assigneeName : '')) + '">' + escapeHtml(metaPhone) + assigneeMetaSuffix + '</div>' + (preview ? '<div class="conv-item-preview" title="' + escapeHtml(preview) + '">' + escapeHtml(preview) + '</div>' : '') + '</div><div class="conv-item-badges">' + unansweredBadge + priorityBadge + statusBadge + '</div></div>';
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
                        loadBtn.removeEventListener('click', function() { convCurrentPage++; loadConversations(true); });
                        loadBtn.addEventListener('click', function() { convCurrentPage++; loadConversations(true); });
                    }
                }, 50);
                list.appendChild(lmBtn);
            }
            lmBtn.style.display = loadedSoFar < totalCount ? '' : 'none';
        }

        let currentConvDetail = null;
        function toggleChatDetailBar() {
            const bar = document.getElementById('convDetailBar');
            const btn = document.getElementById('chatDetailToggle');
            if (bar && btn) {
                const isCollapsed = bar.classList.contains('collapsed');
                if (isCollapsed) {
                    bar.style.display = '';
                    bar.removeAttribute('hidden');
                    bar.classList.remove('collapsed');
                    btn.classList.add('active');
                } else {
                    bar.classList.add('collapsed');
                    btn.classList.remove('active');
                }
            }
        }
        function closeChatMobile() {
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
        function openChat(id, name, phone, profilePic, isGroup) {
            currentConvId = id;
            currentConvDetail = null;
            currentConvIsGroup = !!isGroup;
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
                headerEl.innerHTML = (currentConvIsGroup ? '<span class="chat-header-group-badge" title="' + (LANG === 'fa' ? 'گروه' : 'Group') + '">👥</span> ' : '') + escapeHtml(name || phone || t('customer'));
            }
            var headerSubEl = document.getElementById('chatHeaderSub');
            if (headerSubEl) {
                if (currentConvIsGroup) {
                    headerSubEl.textContent = (LANG === 'fa' ? 'گروه · واتساپ' : LANG === 'tr' ? 'Grup · WhatsApp' : 'Group · WhatsApp');
                } else if (phone) {
                    headerSubEl.textContent = phone;
                } else {
                    headerSubEl.textContent = typeof t === 'function' ? (t('wa_subtitle') || 'WhatsApp') : 'WhatsApp';
                }
            }
            if (avatarEl) {
                const rawOpenPic = (profilePic || '').trim();
                let pic = rawOpenPic ? profilePicDisplaySrc(rawOpenPic) : '';
                const initial = (name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?';
                if (pic && profilePicShowsImage(rawOpenPic)) {
                    avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)">';
                } else {
                    avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>';
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
            if (pm && window.matchMedia('(max-width: 900px)').matches) pm.textContent = name || phone || t('customer');
            if (barEl) {
                barEl.style.display = 'none';
                barEl.setAttribute('hidden', '');
            }
            apiFetch('/api/conversations/' + id + '/read', { method: 'POST' }).then(function() { loadConversations(); apiFetch('/api/analytics/dashboard').then(function(r) { if (r.ok && r.data && typeof updateNavBadges === 'function') updateNavBadges(r.data); }).catch(function(){}); });
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
                const custPicRaw = d.customer && d.customer.profilePic ? String(d.customer.profilePic).trim() : '';
                if (avatarEl && custPicRaw && !currentConvIsGroup) {
                    const picDisp = profilePicDisplaySrc(custPicRaw);
                    if (picDisp && profilePicShowsImage(custPicRaw)) {
                        const initialH = (name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?';
                        avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initialH) + '</span><img src="' + escapeHtml(picDisp) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)">';
                    }
                }
                if (!barEl || !badgesEl) {
                    try { loadConversations(); } catch (_) {}
                    return;
                }
                renderConvDetailBadges(d);
                barEl.style.display = '';
                barEl.removeAttribute('hidden');
                barEl.classList.add('collapsed');
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
                        footerEl2.style.display = (fApply || fArch || fDel) ? '' : 'none';
                        footVis = footerEl2.style.display !== 'none';
                    }
                    var gridVis = actionsEl.querySelector('.conv-detail-fields-grid');
                    var topVis = actionsEl.querySelector('.conv-detail-actions-top');
                    var anyAct = (topVis && topVis.style.display !== 'none') || (gridVis && gridVis.style.display !== 'none') || footVis;
                    actionsEl.style.display = anyAct ? 'flex' : 'none';
                    if (!anyAct) actionsEl.setAttribute('hidden', '');
                }
                const chatSend = document.querySelector('.chat-send');
                if (chatSend) chatSend.style.display = (d.status === 'archived') ? 'none' : '';
                const ratingSection = document.getElementById('convRatingSection');
                if (ratingSection) {
                    ratingSection.style.display = 'block';
                    ratingSection.removeAttribute('hidden');
                    const stars = ratingSection.querySelectorAll('.conv-rating-star');
                    const r = d.rating || 0;
                    stars.forEach(function(s) {
                        const v = parseInt(s.getAttribute('data-rating'), 10);
                        s.classList.toggle('active', v <= r);
                        s.onclick = function() {
                            const newR = parseInt(this.getAttribute('data-rating'), 10);
                            stars.forEach(function(x) { x.classList.toggle('active', parseInt(x.getAttribute('data-rating'), 10) <= newR); });
                            apiFetch('/api/conversations/' + id, { method: 'PATCH', body: JSON.stringify({ rating: newR }) }).then(function(res) { if (res.ok && currentConvDetail) currentConvDetail.rating = newR; });
                        };
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
        function applyConvFilters() { convCurrentPage = 1; loadConversations(); }
        function escapeAttr(s) {
            if (s == null || s === '') return '';
            return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function openNewConvModal() {
            document.getElementById('newConvModal').style.display = 'flex';
            document.getElementById('newConvCustomerSearch').value = '';
            loadNewConvCustomers();
        }
        function closeNewConvModal() { document.getElementById('newConvModal').style.display = 'none'; }
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
                const name = c.name || c.phone || t('customer');
                const initial = (name && name[0]) ? name[0].toUpperCase() : '?';
                const rawPicNc = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
                let profilePic = rawPicNc ? normalizeProfilePicUrl(rawPicNc) : '';
                const picSrcNc = rawPicNc ? profilePicDisplaySrc(rawPicNc) : '';
                const avatarHtml = rawPicNc && profilePicShowsImage(rawPicNc) && picSrcNc ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(picSrcNc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)">' : '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>';
                return '<div class="new-conv-customer-item" role="button" tabindex="0" data-start-conv-id="' + escapeAttr(String(c.id)) + '" data-start-conv-name="' + escapeAttr(String(name || '')) + '"><span class="conv-item-avatar" style="width:36px;height:36px;font-size:0.9rem;">' + avatarHtml + '</span><span class="name">' + escapeHtml(name) + '</span><span class="meta">' + escapeHtml(c.phone || '') + '</span></div>';
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
        async function archiveConversation() {
            if (!currentConvId || !canManageConversations()) { toast(LANG === 'fa' ? 'فقط مالک می‌تواند مکالمه را آرشیو کند' : 'Only owner can archive', true); return; }
            if (!confirm(LANG === 'fa' ? 'آیا از آرشیو کردن این مکالمه مطمئن هستید؟' : 'Archive this conversation?')) return;
            const res = await apiFetch('/api/conversations/' + currentConvId, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'مکالمه به آرشیو ارسال شد' : 'Conversation archived'); closeChatMobile(); loadConversations(); currentConvId = null; } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        async function deleteConversation() {
            if (!currentConvId || !canManageConversations()) { toast(LANG === 'fa' ? 'فقط مالک می‌تواند مکالمه را حذف کند' : 'Only owner can delete', true); return; }
            if (!confirm(LANG === 'fa' ? 'آیا از حذف دائمی این مکالمه و تمام پیام‌های آن مطمئن هستید؟ این عمل قابل بازگشت نیست.' : 'Permanently delete this conversation and all messages? This cannot be undone.')) return;
            const res = await apiFetch('/api/conversations/' + currentConvId, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'مکالمه حذف شد' : 'Conversation deleted'); closeChatMobile(); loadConversations(); currentConvId = null; } else toast((res.data && res.data.error) || t('err_generic'), true);
        }

        function openChatFromHistory(el) {
            const convId = el.getAttribute('data-convid');
            const name = el.getAttribute('data-customername') || '';
            const isGrp = el.getAttribute('data-is-group') === '1';
            if (!convId) return;
            // نمایش صفحه مکالمات
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            const convPage = document.getElementById('pageConversations');
            if (convPage) { convPage.style.display = 'flex'; convPage.classList.add('show'); }
            const content = document.querySelector('.content');
            if (content) content.classList.add('page-conversations');
            // آپدیت sidebar active link
            document.querySelectorAll('.sidebar .nav-link[data-page]').forEach(function(l) { l.classList.remove('active'); });
            const convLink = document.querySelector('.sidebar .nav-link[data-page="conversations"]');
            if (convLink) convLink.classList.add('active');
            // اطلاعات مکالمه را مستقیم از API بگیر و باز کن
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
            if (!data.data || data.data.length === 0) { if (!loadOlder) el.innerHTML = '<div class="empty"><span class="empty-icon">\uD83D\uDCAC</span><br>' + t('empty_internal_msgs') + '</div>'; return; }
            // ذخیره قدیمی‌ترین id برای load older
            if (data.oldestId) _currentMsgOldestId = data.oldestId;
            const list = data.data.filter(function(m) {
                if (m.direction === 'outgoing') return true;
                const hasContent = (m.content && String(m.content).trim()) || (m.hasMedia && m.mediaData && (m.mediaData.url || m.mediaData.filename));
                return !!hasContent;
            });
            const newMsgs = list.map(function(m) {
                const isOut = m.direction === 'outgoing';
                const time = m.timestamp ? fmtTZ(m.timestamp, 'time') : '';
                let senderLabel = '';
                if (isOut && m.isAutoReply) {
                    senderLabel = '<div class="msg-sender">' + escapeHtml(t('ai_assistant') || 'AI assistant') + '</div>';
                } else if (isOut && m.user && (m.user.name || m.user.username)) {
                    const staffName = escapeHtml(m.user.name || m.user.username);
                    senderLabel = '<div class="msg-sender msg-sender-staff">' + internalMsgAvatarHtml(m.user) + '<span class="msg-sender-staff-name">' + staffName + '</span></div>';
                } else if (!isOut && currentConvIsGroup) {
                    const sn = (m.metadata && m.metadata.senderName) || null;
                    const sid = (m.metadata && m.metadata.senderId) || null;
                    let displayName = sn;
                    // استخراج شماره تلفن از senderId (مثلاً 989123456789@c.us)
                    let senderPhone = null;
                    if (sid) {
                        const rawPhone = String(sid).replace(/@[a-z0-9.]+$/i, '').replace(/\D/g, '');
                        if (rawPhone) senderPhone = rawPhone;
                        if (!displayName) displayName = rawPhone ? (rawPhone.replace(/^98/, '0') || rawPhone) : null;
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
                    if (t === 'image' || t === 'video' || t === 'audio' || t === 'ptt') return (t === 'ptt' ? 'audio' : t);
                    const md = msg.mediaData || {};
                    const mime = (md.mimetype || '').toLowerCase();
                    const name = (md.filename || msg.content || '').toLowerCase();
                    if (mime.indexOf('image/') === 0 || /\.(jpe?g|png|gif|webp|bmp)$/.test(name)) return 'image';
                    if (mime.indexOf('video/') === 0 || /\.(mp4|webm|mov|avi)$/.test(name)) return 'video';
                    if (mime.indexOf('audio/') === 0 || /\.(mp3|ogg|wav|m4a|opus|oga)$/.test(name)) return 'audio';
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
                    if (mediaType === 'image') {
                        const imgAlt = escapeHtml(m.mediaData.filename || (LANG === 'fa' ? 'تصویر' : 'Image'));
                        const fn = escapeHtml(m.mediaData.filename || m.content || (LANG === 'fa' ? 'تصویر' : 'Image'));
                        mediaHtml = '<div class="msg-media msg-media-image"><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link" data-open="1"><img src="' + escapeHtml(mediaUrl) + '" alt="' + imgAlt + '" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\';var s=this.parentNode.querySelector(\'.msg-media-filename\');if(s)s.style.display=\'inline\';">' + '<span class="msg-media-filename" style="display:none;">📎 ' + fn + '</span></a></div>';
                    } else if (mediaType === 'video') {
                        mediaHtml = '<div class="msg-media msg-media-video"><video src="' + escapeHtml(mediaUrl) + '" controls preload="metadata" playsinline></video><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link" data-open="1">' + (LANG === 'fa' ? 'پخش ویدیو' : 'Play video') + '</a></div>';
                    } else if (mediaType === 'audio') {
                        const isPtt = (m.type || '').toLowerCase() === 'ptt' || /voice|\.ogg|\.webm|پیام صوتی|ptt/i.test(m.mediaData.filename || m.content || '');
                        const voiceClass = isPtt ? ' msg-media-voice' : ' msg-media-audio';
                        const typeAttr = mdMime ? ' type="' + escapeHtml(mdMime) + '"' : '';
                        const errHint = LANG === 'fa' ? 'پخش در مرورگر ممکن نیست — از دانلود استفاده کنید.' : 'Playback failed — try download.';
                        const voiceLabel = isPtt
                            ? ('<div class="msg-voice-meta"><span class="msg-voice-ic" aria-hidden="true">🎙</span><span>' + (LANG === 'fa' ? 'پیام صوتی' : 'Voice message') + '</span></div>')
                            : ('<div class="msg-voice-meta msg-voice-meta--file"><span class="msg-voice-ic" aria-hidden="true">🎵</span><span>' + escapeHtml(m.mediaData.filename || (LANG === 'fa' ? 'فایل صوتی' : 'Audio')) + '</span></div>');
                        mediaHtml =
                            '<div class="msg-media' + voiceClass + '">' +
                            voiceLabel +
                            '<div class="msg-audio-shell">' +
                            '<audio class="msg-audio-el" controls preload="auto" playsinline onerror="var w=this.closest(\'.msg-media\');if(w){w.classList.add(\'msg-media-error\');}">' +
                            '<source src="' + escapeHtml(mediaUrl) + '"' + typeAttr + '>' +
                            '</audio></div>' +
                            '<p class="msg-media-audio-err" role="alert">' + escapeHtml(errHint) + '</p>' +
                            '<a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link msg-media-dl" data-open="1">' + (LANG === 'fa' ? 'دانلود فایل صوتی' : 'Download audio') + '</a>' +
                            '</div>';
                    } else {
                        mediaHtml = '<div class="msg-media"><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-file-link msg-media-link" data-open="1">📎 ' + escapeHtml(m.mediaData.filename || m.content || (LANG === 'fa' ? 'فایل' : 'File')) + '</a></div>';
                    }
                } else if (m.hasMedia && (m.content || (m.mediaData && m.mediaData.filename))) {
                    const fileName = (m.mediaData && m.mediaData.filename) || m.content || (LANG === 'fa' ? 'فایل' : 'File');
                    const isImageName = /\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName);
                    mediaHtml = '<div class="msg-media msg-media-placeholder">' + (isImageName ? '🖼 ' : '📎 ') + escapeHtml(fileName) + '</div>';
                }
                var resolvedMediaType = (mediaUrl && m.hasMedia && m.mediaData) ? inferMediaType(m) : '';
                let contentHtml = '';
                let displayContent = (m.content || '').trim();
                if (isOut && (displayContent.indexOf('🤖 ') === 0)) displayContent = displayContent.slice(2).trim();
                else if (isOut && displayContent.indexOf('AI KAYA: ') === 0) displayContent = displayContent.slice(9).trim();
                var fnCaption = (m.mediaData && m.mediaData.filename) ? String(m.mediaData.filename).trim() : '';
                if (resolvedMediaType === 'audio' && displayContent) {
                    var dcLo = displayContent.toLowerCase();
                    var fnLo = fnCaption.toLowerCase();
                    if (fnCaption && (displayContent === fnCaption || dcLo === fnLo)) displayContent = '';
                    else if (/^voice\.(webm|ogg|m4a|mp3|wav)$/i.test(displayContent)) displayContent = '';
                    else if (displayContent === 'file' || displayContent === '📎 فایل') displayContent = '';
                }
                if (m.hasMedia && m.mediaData && m.mediaData.url && m.content && displayContent) contentHtml = '<div class="msg-caption">' + linkifyMessageContent(displayContent) + '</div>';
                else if (displayContent && !(m.hasMedia && !(m.mediaData && m.mediaData.url))) contentHtml = '<div>' + linkifyMessageContent(displayContent) + '</div>';
                let preview = (m.content || '').slice(0, 50) || (m.hasMedia ? '📎' : '');
                if ((m.content || '').length > 50) preview += '…';
                // اضافه کردن اسم فرستنده به preview برای گروه
                let replyPreviewSender = '';
                if (!isOut && currentConvIsGroup) {
                    let rSn = (m.metadata && m.metadata.senderName) || null;
                    const rSid = (m.metadata && m.metadata.senderId) || null;
                    if (!rSn && rSid) { const rRaw = String(rSid).replace(/@[a-z0-9.]+$/i, '').replace(/\D/g, ''); rSn = rRaw ? rRaw.replace(/^98/, '0') : null; }
                    if (rSn) replyPreviewSender = rSn + ': ';
                }
                const replyTitle = escapeAttr((typeof t === 'function' && t('msg_reply_short')) || (LANG === 'fa' ? 'پاسخ' : LANG === 'tr' ? 'Yanıtla' : 'Reply'));
                const replyBtn = m.whatsappId ? '<button type="button" class="msg-reply-btn" data-wa-id="' + escapeAttr(m.whatsappId) + '" data-preview="' + escapeAttr(replyPreviewSender + preview) + '" title="' + replyTitle + '">↩</button>' : '';
                const statusHtml = (isOut && m.status && m.status !== 'pending') ? '<span class="msg-status msg-status-' + m.status + '" title="' + (m.status === 'read' ? (LANG === 'fa' ? 'خوانده شده' : 'Read') : m.status === 'delivered' ? (LANG === 'fa' ? 'تحویل' : 'Delivered') : m.status === 'sent' ? (LANG === 'fa' ? 'ارسال' : 'Sent') : m.status === 'failed' ? (LANG === 'fa' ? 'ارسال نشد' : 'Failed to send') : '') + '">' + waMsgStatusTicks(m.status) + '</span>' : '';
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '" data-msg-id="' + (m.id || '') + '" data-whatsapp-id="' + (m.whatsappId || '') + '">' + senderLabel + mediaHtml + contentHtml + '<div class="msg-footer">' + replyBtn + '<span class="time">' + time + '</span>' + statusHtml + '</div></div>';
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
        function closeWaAttachMenu() {
            var m = document.getElementById('waAttachMenu');
            var b = document.getElementById('waAttachMenuBtn');
            if (m) m.hidden = true;
            if (b) b.setAttribute('aria-expanded', 'false');
            if (_waAttachMenuDocListener) {
                document.removeEventListener('click', _waAttachMenuDocListener, true);
                _waAttachMenuDocListener = null;
            }
        }
        function toggleWaAttachMenu(ev) {
            if (ev) ev.stopPropagation();
            var m = document.getElementById('waAttachMenu');
            var b = document.getElementById('waAttachMenuBtn');
            if (!m || !b) return;
            if (!m.hidden) {
                closeWaAttachMenu();
                return;
            }
            closeWaPickers();
            m.hidden = false;
            b.setAttribute('aria-expanded', 'true');
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
            else toast((res.data && res.data.error) || (LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
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
            var msg = typeof t === 'function' ? t('wa_calls_not_in_panel') : '';
            if (!msg || msg === 'wa_calls_not_in_panel') msg = LANG === 'fa' ? 'تماس صوتی مشتری از این پنل برقرار نمی‌شود؛ از اپ واتساپ استفاده کنید.' : LANG === 'tr' ? 'Sesli arama bu panelden yapılmaz; WhatsApp uygulamasını kullanın.' : 'Voice calls are not started from this CRM panel.';
            if (typeof toast === 'function') toast(msg, false);
        }
        function waConvVideoCall() {
            var msg = typeof t === 'function' ? t('wa_calls_not_in_panel_video') : '';
            if (!msg || msg === 'wa_calls_not_in_panel_video') msg = LANG === 'fa' ? 'تماس تصویری از این پنل برقرار نمی‌شود؛ از اپ واتساپ استفاده کنید.' : LANG === 'tr' ? 'Görüntülü arama bu panelden yapılmaz; WhatsApp uygulamasını kullanın.' : 'Video calls are not started from this CRM panel.';
            if (typeof toast === 'function') toast(msg, false);
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

        async function sendMsg() {
            const input = document.getElementById('msgInput');
            const fileInput = document.getElementById('msgFileInput');
            const content = (input.value || '').trim();
            const file = fileInput && fileInput.files && fileInput.files[0];
            if ((!content && !file) || !currentConvId) return;
            let media = null;
            if (file) {
                const fd = new FormData();
                fd.append('file', file);
                const uploadRes = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
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
            if (res.ok) loadMessages(currentConvId);
            else toast((res.data && res.data.error) || (LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
            updateWaComposerState();
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
            if (!currentConvId || !blob || blob.size === 0) return;
            const fd = new FormData();
            const rawType = blob.type || '';
            const baseMime = rawType.split(';')[0].trim() || 'audio/webm';
            const ext = baseMime.indexOf('ogg') >= 0 ? '.ogg' : (baseMime.indexOf('mp4') >= 0 || baseMime.indexOf('aac') >= 0) ? '.m4a' : '.webm';
            // Create new blob with clean MIME type so server accepts it
            const cleanBlob = new Blob([blob], { type: baseMime });
            fd.append('file', cleanBlob, 'voice' + ext);
            const uploadRes = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            const uploadData = await uploadRes.json().catch(function() { return {}; });
            if (!uploadRes.ok || !uploadData.url) { toast((uploadData.error || (LANG === 'en' ? 'Upload failed' : 'خطا در آپلود')), true); return; }
            const media = { url: uploadData.url, filename: uploadData.name || 'voice' + ext, mimetype: baseMime };
            const res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: '', media: media }) });
            if (res.needLogin) return;
            if (res.ok) loadMessages(currentConvId);
            else toast((res.data && res.data.error) || (LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
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
        async function loadCustomers() {
            const list = document.getElementById('customerList');
            const statsEl = document.getElementById('customerStats');
            const countEl = document.getElementById('customerListCount');
            if (!list) return;
            setLoading('customerList', 5);
            let q = '?limit=200';
            const searchEl = document.getElementById('customerSearch');
            const statusEl = document.getElementById('customerFilterStatus');
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value);
            const res = await apiFetch('/api/customers' + q);
            if (res.needLogin) { list.innerHTML = '<div class="empty"><span class="empty-icon">&#128101;</span><p>' + (LANG === 'fa' ? 'لطفاً دوباره وارد شوید' : 'Please log in again') + '</p></div>'; return; }
            if (!res.ok) { list.innerHTML = '<div class="empty customer-empty-state"><span class="empty-icon">&#128101;</span><p>' + (res.data && res.data.error ? escapeHtml(res.data.error) : (LANG === 'fa' ? 'خطا در بارگذاری' : 'Load failed')) + '</p><button type="button" class="btn-primary" id="customerRetryBtn">' + (LANG === 'fa' ? 'تلاش مجدد' : 'Retry') + '</button></div>'; return; }
            const data = res.data;
            if (statsEl && data.stats) { statsEl.style.display = 'flex'; statsEl.innerHTML = '<span class="customer-stat"><strong>' + data.stats.total + '</strong> ' + (LANG === 'fa' ? 'مشتری' : 'customers') + '</span><span class="customer-stat"><strong>' + data.stats.active + '</strong> ' + (LANG === 'fa' ? 'فعال' : 'active') + '</span><span class="customer-stat"><strong>' + data.stats.inactive + '</strong> ' + (LANG === 'fa' ? 'غیرفعال' : 'inactive') + '</span><span class="customer-stat"><strong>' + data.stats.blocked + '</strong> ' + (LANG === 'fa' ? 'مسدود' : 'blocked') + '</span>'; }
            if (countEl) countEl.textContent = (data.total || 0) + ' ' + (LANG === 'fa' ? 'مشتری' : '');
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty customer-empty-state"><span class="empty-icon">&#128100;</span><p>' + t('empty_customers') + '</p><button type="button" class="btn-primary" id="emptyCustomerAddBtn">' + escapeHtml(t('customer_add')) + '</button></div>'; return; }
            const sortEl = document.getElementById('customerSort');
            const sortVal = sortEl ? sortEl.value : 'newest';
            const sorted = sortCustomerList(data.data, sortVal);
            window._currentCustomerListData = sorted;
            const bulkIds = window._bulkSelectedIds || [];
            list.innerHTML = sorted.map(function(c) {
                const name = c.name || c.phone || t('customer');
                const initial = (name && name[0]) ? name[0].toUpperCase() : (c.phone && c.phone[0]) ? c.phone[0] : '?';
                const rawPicCust = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
                let profilePic = rawPicCust ? normalizeProfilePicUrl(rawPicCust) : '';
                const picSrcCust = rawPicCust ? profilePicDisplaySrc(rawPicCust) : '';
                const hasCustPic = !!(rawPicCust && profilePicShowsImage(rawPicCust) && picSrcCust);
                const avStyle = hasCustPic ? '' : (' style="' + letterAvatarVars(name + '|' + (c.phone || '')) + '"');
                const avClass = 'customer-card-avatar' + (hasCustPic ? '' : ' customer-card-avatar--letter');
                const avatarInner = hasCustPic
                    ? '<span class="customer-card-avatar-fallback">' + escapeHtml(initial) + '</span><img class="customer-card-avatar-img" src="' + escapeHtml(picSrcCust) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="crmAvatarImgErr(this)">'
                    : '<span class="customer-card-avatar-letter">' + escapeHtml(initial) + '</span>';
                const avatarHtml = '<div class="' + avClass + '"' + avStyle + '>' + avatarInner + '</div>';
                const statusClass = (c.status === 'blocked' ? 'blocked' : c.status === 'inactive' ? 'inactive' : 'active');
                const statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
                const lastContact = c.lastContactAt ? timeAgo(c.lastContactAt) : '—';
                const loc = c.lastOpenConv;
                const assigneeDept = loc && (loc.assignee || (loc.department && loc.department.name)) ? [loc.assignee && loc.assignee.name, loc.department && loc.department.name].filter(Boolean).join(' · ') : '';
                const safeName = (c.name || c.phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                const checked = bulkIds.indexOf(c.id) >= 0 ? ' checked' : '';
                return '<div class="customer-card" data-customer-id="' + c.id + '" data-customer-name="' + escapeHtml(c.name || c.phone) + '" data-customer-phone="' + escapeHtml(c.phone || '') + '" role="button" tabindex="0"><input type="checkbox" class="bulk-customer-check" data-customer-id="' + c.id + '"><div class="customer-card-main">' + avatarHtml + '<div class="customer-card-body"><span class="customer-card-name">' + escapeHtml(c.name || c.phone) + '</span><div class="customer-card-meta">' + escapeHtml(c.phone || '') + (c.email ? ' · ' + escapeHtml(c.email) : '') + '</div><div class="customer-card-meta">' + lastContact + ' · ' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + (assigneeDept ? ' · ' + escapeHtml(assigneeDept) : '') + '</div></div><span class="badge ' + statusClass + '">' + statusLabel + '</span></div><button type="button" class="btn-primary customer-send-btn" data-customer-id="' + c.id + '" data-customer-name="' + escapeHtml(c.name || c.phone) + '" data-customer-phone="' + escapeHtml(c.phone || '') + '" data-i18n="btn_send">ارسال</button></div>';
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
            updateClearBtn();
        }

        window._bulkSelectedIds = window._bulkSelectedIds || [];
        function toggleBulkSelect(el) {
            const id = el && el.getAttribute('data-customer-id');
            if (!id) return;
            const arr = window._bulkSelectedIds;
            const idx = arr.indexOf(id);
            if (idx >= 0) arr.splice(idx, 1); else arr.push(id);
            updateBulkSelectedCount();
        }
        function updateBulkSelectedCount() {
            const n = window._bulkSelectedIds.length || 0;
            const el = document.getElementById('bulkSelectedCount');
            if (el) el.textContent = n + ' ' + (LANG === 'fa' ? 'مشتری انتخاب شده' : 'customers selected');
            const bar = document.getElementById('customerBulkBar');
            const barCount = document.getElementById('customerBulkBarCount');
            if (bar) bar.style.display = n > 0 ? 'flex' : 'none';
            if (barCount) barCount.textContent = n + ' ' + (LANG === 'fa' ? 'انتخاب شده' : 'selected');
            const submitBtn = document.getElementById('bulkSendSubmitBtn');
            if (submitBtn) { submitBtn.disabled = n === 0; submitBtn.title = n === 0 ? (LANG === 'fa' ? 'حداقل یک مشتری انتخاب کنید' : 'Select at least one customer') : ''; }
        }
        function bulkSelectFiltered() {
            const data = window._currentCustomerListData || [];
            window._bulkSelectedIds = data.map(function(c) { return c.id; });
            document.querySelectorAll('.bulk-customer-check').forEach(function(cb) { cb.checked = true; });
            updateBulkSelectedCount();
            toast((LANG === 'fa' ? 'همه مشتریان فیلترشده انتخاب شدند' : 'All filtered customers selected'));
        }
        function bulkClearSelection() {
            window._bulkSelectedIds = [];
            document.querySelectorAll('.bulk-customer-check').forEach(function(cb) { cb.checked = false; });
            updateBulkSelectedCount();
        }
        function openBulkSendModal() {
            if (!can('conversations')) { toast(t('no_access') || 'دسترسی ندارید', true); return; }
            document.getElementById('modalBulkSend').style.display = 'flex';
            document.getElementById('bulkMessageContent').value = '';
            document.getElementById('bulkDelaySec').value = 5;
            updateBulkSelectedCount();
            if ((window._bulkSelectedIds || []).length === 0) toast(LANG === 'fa' ? 'ابتدا مشتریان را از لیست انتخاب کنید' : 'Select customers from the list first', false);
        }
        function closeBulkSendModal() { document.getElementById('modalBulkSend').style.display = 'none'; }
        async function submitBulkSend() {
            const ids = window._bulkSelectedIds || [];
            if (ids.length === 0) { toast(LANG === 'fa' ? 'حداقل یک مشتری انتخاب کنید' : 'Select at least one customer', true); return; }
            const content = (document.getElementById('bulkMessageContent') && document.getElementById('bulkMessageContent').value || '').trim();
            if (!content) { toast(LANG === 'fa' ? 'متن پیام الزامی است' : 'Message text required', true); return; }
            const delaySec = parseInt(document.getElementById('bulkDelaySec').value, 10) || 5;
            const delayMs = Math.min(60, Math.max(2, delaySec)) * 1000;
            const res = await apiFetch('/api/bulk/send', { method: 'POST', body: JSON.stringify({ customerIds: ids, message: content, delayMs: delayMs }) });
            if (res.needLogin) return;
            if (res.ok) { toast((LANG === 'fa' ? 'ارسال شروع شد. ' : 'Sending started. ') + (res.data && res.data.message ? res.data.message : '')); closeBulkSendModal(); bulkClearSelection(); loadCustomers(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
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
                const res = await fetch(API + '/api/customers/import/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('crm_token') || '') }, body: fd });
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
        async function showCustomerHistory(custId, name) {
            currentCustomerId = custId;
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            document.getElementById('pageCustomerDetail').style.display = 'block';
            document.getElementById('pageCustomerDetail').classList.add('show');
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
            const initial = (c.name && c.name[0]) ? c.name[0].toUpperCase() : (c.phone && c.phone[0]) ? c.phone[0] : '?';
            const statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
            const firstContact = c.firstContactAt ? fmtTZ(c.firstContactAt, 'date') : '—';
            const lastContact = c.lastContactAt ? fmtTZ(c.lastContactAt, 'datetime') : '—';
            if (quickActionsEl) {
                const qName = (c.name || c.phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                const qPhone = (c.phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                const delBtn = (currentUser && currentUser.canDeleteCustomer) ? '<button type="button" class="btn-danger btn-danger-outline customer-detail-action-btn" id="custDeleteBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('customer_delete') || (LANG === 'fa' ? 'حذف مشتری' : 'Delete customer')) + '</button>' : '';
                quickActionsEl.innerHTML = '<button type="button" class="btn-primary customer-detail-action-btn" id="custChatBtn" data-cust-id="' + c.id + '" data-cust-name="' + qName + '" data-cust-phone="' + qPhone + '">' + escapeHtml(t('customer_quick_chat')) + '</button><button type="button" class="btn-secondary customer-detail-action-btn" id="custEditBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('customer_quick_edit')) + '</button><button type="button" class="btn-secondary customer-detail-action-btn" id="custTransBtn" data-cust-id="' + c.id + '">' + escapeHtml(t('transaction_add')) + '</button>' + delBtn;
                setTimeout(function() {
                    const chatBtn = document.getElementById('custChatBtn');
                    const editBtn = document.getElementById('custEditBtn');
                    const transBtn = document.getElementById('custTransBtn');
                    const delBtnEl = document.getElementById('custDeleteBtn');
                    if (chatBtn) {
                        chatBtn.removeEventListener('click', function() {});
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
            const detailPicSrc = detailRawPic ? profilePicDisplaySrc(detailRawPic) : '';
            const avatarClickable = !!(detailPicSrc && profilePicShowsImage(detailRawPic));
            const detailAvatarHtml = avatarClickable ? '<span class="customer-detail-avatar-fallback">' + escapeHtml(initial) + '</span><img class="customer-detail-avatar-img" src="' + escapeHtml(detailPicSrc) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display=\'none\';var f=this.parentNode.querySelector(\'.customer-detail-avatar-fallback\');if(f)f.style.display=\'flex\'">' : initial;
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
                    const r = await fetch((API || '') + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
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
        function applyNavByRole() {
            const perms = (currentUser && currentUser.permissions) || {};
            const role = (currentUser && currentUser.role) || '';
            const isOwnerOrAdmin = (role === 'owner' || role === 'admin');
            const can = function(section) { return isOwnerOrAdmin || section === 'profile' || section === 'dashboard' || perms[section] === true || (section === 'rates_charts' && perms.rates === true); };
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
            const perms = (currentUser && currentUser.permissions) || {};
            const can = function(section) { return section === 'profile' || section === 'dashboard' || perms[section] === true || (section === 'rates_charts' && perms.rates === true); };
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
        }
        async function loadPanelSettingsAndApply() {
            const res = await apiFetch('/api/panel-settings');
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
                body.style.maxHeight = EXPANDED_MAX + 'px';
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
                    const r = await fetch((API || '') + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
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
        function toggleSidebarDesktop() { const s = document.getElementById('sidebar'); const btn = document.getElementById('sidebarToggleBtn'); if (!s || !btn) return; const collapsed = s.classList.toggle('sidebar-collapsed'); try { localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0'); } catch (_) {} btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true'); btn.setAttribute('aria-label', collapsed ? (typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو') : (typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو')); btn.setAttribute('title', collapsed ? (typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو') : (typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو')); const txt = btn.querySelector('.sidebar-toggle-text'); if (txt && typeof t === 'function') txt.textContent = collapsed ? t('sidebar_toggle_expand') : t('sidebar_toggle_collapse'); }
        function initSidebarCollapsedState() { const s = document.getElementById('sidebar'); const btn = document.getElementById('sidebarToggleBtn'); if (!s || !btn) return; let collapsed = false; try { collapsed = localStorage.getItem('sidebar_collapsed') === '1'; } catch (_) {} if (!window.matchMedia || !window.matchMedia('(min-width: 901px)').matches) return; if (collapsed) { s.classList.add('sidebar-collapsed'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو'); btn.setAttribute('title', typeof t === 'function' ? t('sidebar_toggle_expand') : 'باز کردن منو'); var txt = btn.querySelector('.sidebar-toggle-text'); if (txt && typeof t === 'function') txt.textContent = t('sidebar_toggle_expand'); } else { s.classList.remove('sidebar-collapsed'); btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو'); btn.setAttribute('title', typeof t === 'function' ? t('sidebar_toggle_collapse') : 'جمع کردن منو'); var txt = btn.querySelector('.sidebar-toggle-text'); if (txt && typeof t === 'function') txt.textContent = t('sidebar_toggle_collapse'); } }
        function showPage(page) {
            const perms = (currentUser && currentUser.permissions) || {};
            const pageToSection = (window.CRM && window.CRM.Constants) ? window.CRM.Constants.PAGE_TO_SECTION : {};
            const section = pageToSection[page];
            if (section && page !== 'profile' && page !== 'dashboard' && perms[section] !== true) { page = 'dashboard'; var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#dashboard'); } catch (e) {} }
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
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            const ids = (window.CRM && window.CRM.Constants) ? window.CRM.Constants.PAGE_IDS : {};
            if (ids[page]) { const el = document.getElementById(ids[page]); if (el) { el.style.display = (page === 'conversations' || page === 'internal-chat') ? 'flex' : 'block'; el.classList.add('show'); } }
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
            }
            if (page === 'message-templates') { initMessageTemplatesTabs(); initTplVarPills(); loadMessageTemplates(); }
            if (page === 'rates') { loadRatesAdjustments(); loadTickerConfig(); loadCurrencies(); checkRatesApiKeyStatus(); }
            if (page === 'rates-charts') loadRatesCharts();
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
            var prevPage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
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
            var t = res.data;
            const numEl = document.getElementById('ticketDetailNumber');
            if (numEl) numEl.textContent = (t.ticketNumber || '').trim() || '';
            document.getElementById('ticketDetailTitle').textContent = t.title || '';
            const statusLabel = t.status === 'open' ? t('status_open') : t.status === 'in_progress' ? t('status_in_progress') : t.status === 'resolved' ? t('status_resolved') : t.status === 'closed' ? t('status_closed') : t.status === 'archived' ? t('status_archived') : t.status || '';
            const prioLabel = { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[t.priority] || t.priority || '';
            const createdStr = t.createdAt ? (fmtTZ ? fmtTZ(t.createdAt, 'datetime') : t.createdAt) : '';
            const metaParts = [(LANG === 'fa' ? 'تاریخ ثبت: ' : 'Created: ') + createdStr, t('creator_label') + ' ' + userDisplay(t.creator), t('assignee_label') + ' ' + userDisplay(t.assignee), t('th_status') + ': ' + statusLabel, t('ticket_priority') + ': ' + prioLabel];
            if (t.department && t.department.name) metaParts.push((t('label_dept') || 'دپارتمان') + ': ' + t.department.name);
            if (t.dueDate) metaParts.push(t('due_label') + ' ' + (fmtTZ ? fmtTZ(t.dueDate, 'date') : t.dueDate));
            document.getElementById('ticketDetailMeta').textContent = metaParts.join(' | ');
            const descEl = document.getElementById('ticketDetailDesc');
            if (descEl) { descEl.textContent = (t.description || '').trim(); descEl.style.display = (t.description || '').trim() ? '' : 'none'; }
            const overdueEl = document.getElementById('ticketDetailOverdue');
            if (overdueEl) {
                const due = t.dueDate;
                const isOverdue = due && ['open','in_progress'].indexOf(t.status) >= 0 && new Date(due) < new Date();
                overdueEl.style.display = isOverdue ? '' : 'none';
            }
            const statusSel = document.getElementById('ticketDetailStatus');
            const assigneeSel = document.getElementById('ticketDetailAssignee');
            const prioritySel = document.getElementById('ticketDetailPriority');
            const dueInp = document.getElementById('ticketDetailDueDate');
            if (statusSel) statusSel.value = t.status || 'open';
            if (assigneeSel) { await loadTicketFormSelects(); assigneeSel.value = t.assignedTo || ''; }
            if (prioritySel) prioritySel.value = t.priority || 'normal';
            if (dueInp && t.dueDate) { const d = new Date(t.dueDate); dueInp.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } else if (dueInp) dueInp.value = '';
            const repliesHtml = (t.replies || []).map(function(r) {
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
                const up = await fetch((API || '') + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
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
            loadTasks();
        }
        function taskStatusLabel(s) { return { pending: t('status_pending'), in_progress: t('status_in_progress'), done: t('status_done'), cancelled: t('status_cancelled') }[s] || s; }
        function taskPriorityLabel(s) { return { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[s] || s; }
        function toggleTaskForm() {
            const box = document.getElementById('taskFormBox');
            const btn = document.getElementById('btnTaskCreate');
            if (box && btn) {
                const show = box.style.display !== 'block';
                box.style.display = show ? 'block' : 'none';
                btn.textContent = show ? (t('cancel') || (LANG === 'fa' ? 'انصراف' : 'Cancel')) : (t('new_task') || (LANG === 'fa' ? 'تسک جدید' : 'New task'));
                if (show) { toggleTaskAssignTarget(); }
            }
        }
        function toggleTaskAssignTarget() {
            const typeSel = document.getElementById('taskAssignType');
            const userSel = document.getElementById('taskAssignUser');
            const deptSel = document.getElementById('taskAssignDept');
            const isUser = typeSel && typeSel.value === 'user';
            if (userSel) userSel.style.display = isUser ? '' : 'none';
            if (deptSel) deptSel.style.display = isUser ? 'none' : '';
        }
        function loadTasksFilters() {
            const userSel = document.getElementById('taskAssignUser');
            const deptSel = document.getElementById('taskAssignDept');
            const branchSel = document.getElementById('taskBranch');
            Promise.all([apiFetch('/api/users'), apiFetch('/api/departments'), apiFetch('/api/branches')]).then(function(ress) {
                const users = (ress[0].data && ress[0].data.data) || [];
                const depts = (ress[1].data && ress[1].data.data) || [];
                const branches = (ress[2].data && ress[2].data.data) || [];
                const activeUsers = users.filter(function(u){ return u.isActive !== false; });
                if (userSel) userSel.innerHTML = '<option value="">' + t('select_user_task') + '</option>' + activeUsers.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
                if (deptSel) deptSel.innerHTML = '<option value="">' + t('select_dept') + '</option>' + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
                if (branchSel) branchSel.innerHTML = '<option value="">' + t('no_branch') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
                const filterDept = document.getElementById('taskFilterDept');
                const filterUser = document.getElementById('taskFilterUser');
                const myDeptOpt = (currentUser && currentUser.departmentId) ? '<option value="__my_dept__">' + (LANG === 'fa' ? 'دپارتمان من' : 'My department') + '</option>' : '';
                if (filterDept) filterDept.innerHTML = '<option value="">' + t('all_depts') + '</option>' + myDeptOpt + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
                if (filterUser) filterUser.innerHTML = '<option value="">' + t('filter_all_users') + '</option>' + activeUsers.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
                const filterBranch = document.getElementById('taskFilterBranch');
                if (filterBranch) filterBranch.innerHTML = '<option value="">' + t('all_branches') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
            });
        }
        function initTaskSearchDebounce() {
            const inp = document.getElementById('taskSearch');
            if (inp && !inp._taskSearchBound) {
                inp._taskSearchBound = true;
                inp.addEventListener('input', function() {
                    clearTimeout(window._taskSearchT);
                    window._taskSearchT = setTimeout(function() { loadTasks(); }, 400);
                });
            }
        }
        let taskListPage = 1;
        let taskListTotal = 0;
        function renderTaskItem(task) {
            const assign = task.assignedToDepartmentId && task.department ? (LANG === 'fa' ? 'دپارتمان ' : 'Dept ') + escapeHtml(task.department.name) + (LANG === 'fa' ? ' (همه اعضا)' : ' (all)') : userDisplay(task.assignee) || '\u2014';
            const due = task.dueDate ? fmtTZ(task.dueDate, 'date') : '';
            const isOverdue = task.dueDate && (task.status === 'pending' || task.status === 'in_progress') && new Date(task.dueDate) < new Date();
            const overdueBadge = isOverdue ? '<span class="badge overdue" title="' + (t('overdue') || 'مهلت گذشته') + '">' + (t('overdue') || 'مهلت گذشته') + '</span>' : '';
            const prioBadge = task.priority && task.priority !== 'normal' ? '<span class="badge ' + task.priority + '">' + escapeHtml(taskPriorityLabel(task.priority)) + '</span>' : '';
            const dueLabel = t('due_label') || (LANG === 'fa' ? 'مهلت: ' : 'Due: ');
            return '<div class="task-list-item' + (isOverdue ? ' task-overdue' : '') + '" data-task-id="' + escapeHtml(task.id) + '" role="button" tabindex="0"><div class="task-item-body"><span class="name">' + escapeHtml(task.title) + '</span><div class="meta">' + assign + ' \u00B7 ' + taskStatusLabel(task.status) + (due ? ' \u00B7 ' + dueLabel + ' ' + due : '') + '</div></div><div class="task-item-badges">' + overdueBadge + prioBadge + '<span class="badge ' + (task.status || '') + '">' + taskStatusLabel(task.status) + '</span></div></div>';
        }
        async function loadTasks(append) {
            const list = document.getElementById('taskList');
            if (!list) return;
            if (!append) { taskListPage = 1; setLoading('taskList', 4); }
            const statusSel = document.getElementById('taskFilterStatus');
            const status = (statusSel && statusSel.value) || '';
            if (!append && statusSel) { taskQuickTab = status || 'all'; const tabs = document.querySelectorAll('.task-quick-tabs .task-tab'); if (tabs) tabs.forEach(function(btn) { btn.classList.toggle('active', (btn.getAttribute('data-tab') || '') === taskQuickTab); }); }
            const deptEl = document.getElementById('taskFilterDept');
            let dept = deptEl ? deptEl.value : '';
            if (dept === '__my_dept__' && currentUser && currentUser.departmentId) dept = currentUser.departmentId;
            const user = (document.getElementById('taskFilterUser') && document.getElementById('taskFilterUser').value) || '';
            const branch = (document.getElementById('taskFilterBranch') && document.getElementById('taskFilterBranch').value) || '';
            const search = (document.getElementById('taskSearch') && document.getElementById('taskSearch').value || '').trim();
            let q = '?limit=50&page=' + (append ? taskListPage : 1);
            if (status) q += '&status=' + encodeURIComponent(status);
            if (dept && dept !== '__my_dept__') q += '&assignedToDepartmentId=' + encodeURIComponent(dept);
            if (user) q += '&assignedTo=' + encodeURIComponent(user);
            if (branch) q += '&branchId=' + encodeURIComponent(branch);
            if (search) q += '&search=' + encodeURIComponent(search);
            const res = await apiFetch('/api/tasks' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            taskListTotal = data.total || 0;
            const countEl = document.getElementById('taskListCount');
            const loadMoreEl = document.getElementById('taskListLoadMore');
            if (!data.data || data.data.length === 0) {
                if (!append) {
                    list.innerHTML = '<div class="empty task-list-empty"><span class="empty-icon">📋</span><p>' + t('empty_tasks') + '</p><button type="button" class="btn-primary" id="emptyTaskFormBtn" style="margin-top:12px;">' + t('new_task') + '</button></div>';
                    setTimeout(function() {
                        const emptyBtn = document.getElementById('emptyTaskFormBtn');
                        if (emptyBtn) {
                            emptyBtn.removeEventListener('click', toggleTaskForm);
                            emptyBtn.addEventListener('click', toggleTaskForm);
                        }
                    }, 50);
                }
                if (countEl) countEl.style.display = 'none';
                if (loadMoreEl) loadMoreEl.style.display = 'none';
                return;
            }
            const html = data.data.map(renderTaskItem).join('');
            if (append) list.innerHTML += html; else list.innerHTML = html;
            list.classList.remove('empty');
            const loadedCount = append ? (taskListPage * 50) : data.data.length;
            if (countEl) { countEl.textContent = loadedCount + (LANG === 'fa' ? ' از ' : ' of ') + taskListTotal + (LANG === 'fa' ? ' تسک' : ' tasks'); countEl.style.display = ''; }
            if (loadMoreEl) { loadMoreEl.style.display = (taskListTotal > loadedCount) ? 'block' : 'none'; }
            taskListPage = append ? taskListPage + 1 : 2;
        }
        function loadMoreTasks() {
            const btn = document.getElementById('btnLoadMoreTasks') || document.querySelector('#taskListLoadMore button');
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال بارگذاری...' : 'Loading...'); }
            loadTasks(true).finally(function() {
                if (btn) { btn.disabled = false; btn.textContent = t('load_more'); }
            });
        }
        async function loadTasksSummary() {
            const box = document.getElementById('tasksSummaryBox');
            if (!box) return;
            const role = (currentUser && currentUser.role) || '';
            if (role !== 'owner' && role !== 'admin' && role !== 'manager' && role !== 'supervisor') { box.style.display = 'none'; return; }
            const res = await apiFetch('/api/tasks/summary');
            if (res.needLogin || !res.ok) { box.style.display = 'none'; return; }
            const d = res.data;
            let html = '';
            if (d.byDepartment && d.byDepartment.length) {
                html += '<div class="stat-card" style="min-width:220px;"><div class="label" style="margin-bottom:12px;">' + t('by_dept') + '</div>';
                d.byDepartment.forEach(function(x) {
                    const sep = LANG === 'fa' ? '، ' : ', ';
                    html += '<div class="task-summary-row" style="margin-top:8px; font-size:0.9rem; padding:6px 0; border-bottom:1px solid var(--border);">' + escapeHtml(x.department && x.department.name ? x.department.name : '') + ': ' + t('status_pending') + ' ' + (x.pending||0) + sep + t('status_in_progress') + ' ' + (x.in_progress||0) + sep + t('status_done') + ' ' + (x.done||0) + '</div>';
                });
                html += '</div>';
            }
            if (d.byUser && d.byUser.length) {
                html += '<div class="stat-card" style="min-width:220px;"><div class="label" style="margin-bottom:12px;">' + t('by_user') + '</div>';
                d.byUser.forEach(function(x) {
                    const sep = LANG === 'fa' ? '، ' : ', ';
                    html += '<div class="task-summary-row" style="margin-top:8px; font-size:0.9rem; padding:6px 0; border-bottom:1px solid var(--border);">' + escapeHtml(userDisplay(x.user)) + ': ' + t('status_pending') + ' ' + (x.pending||0) + sep + t('status_in_progress') + ' ' + (x.in_progress||0) + sep + t('status_done') + ' ' + (x.done||0) + '</div>';
                });
                html += '</div>';
            }
            box.innerHTML = html || '';
            box.style.display = (html ? 'flex' : 'none');
        }
        async function addTask() {
            const title = (document.getElementById('taskTitle') && document.getElementById('taskTitle').value) || '';
            if (!title.trim()) { toast(t('task_title_required'), true); return; }
            const type = (document.getElementById('taskAssignType') && document.getElementById('taskAssignType').value) || 'user';
            const userId = type === 'user' ? (document.getElementById('taskAssignUser') && document.getElementById('taskAssignUser').value) : null;
            const deptId = type === 'department' ? (document.getElementById('taskAssignDept') && document.getElementById('taskAssignDept').value) : null;
            if (!userId && !deptId) { toast(t('select_assignee'), true); return; }
            const body = { title: title.trim(), description: (document.getElementById('taskDesc') && document.getElementById('taskDesc').value) || '', assignedTo: userId || undefined, assignedToDepartmentId: deptId || undefined, priority: (document.getElementById('taskPriority') && document.getElementById('taskPriority').value) || 'normal' };
            const due = document.getElementById('taskDueDate') && document.getElementById('taskDueDate').value;
            if (due) body.dueDate = new Date(due).toISOString();
            const branchId = document.getElementById('taskBranch') && document.getElementById('taskBranch').value;
            if (branchId) body.branchId = branchId;
            const res = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) {
                if (document.getElementById('taskTitle')) document.getElementById('taskTitle').value = '';
                if (document.getElementById('taskDesc')) document.getElementById('taskDesc').value = '';
                if (document.getElementById('taskBranch')) document.getElementById('taskBranch').value = '';
                if (document.getElementById('taskDueDate')) document.getElementById('taskDueDate').value = '';
                if (document.getElementById('taskAssignUser')) document.getElementById('taskAssignUser').value = '';
                if (document.getElementById('taskAssignDept')) document.getElementById('taskAssignDept').value = '';
                toggleTaskForm();
                toast(t('toast_task_created'));
                loadTasks();
                loadTasksSummary();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showTaskList() {
            document.getElementById('taskDetailBox').style.display = 'none';
            document.getElementById('taskList').style.display = 'block';
            currentTaskId = null;
            loadTasks();
        }
        function toggleTaskDetailAssign() {
            const typeSel = document.getElementById('taskDetailAssignType');
            const userSel = document.getElementById('taskDetailAssignUser');
            const deptSel = document.getElementById('taskDetailAssignDept');
            const isUser = typeSel && typeSel.value === 'user';
            if (userSel) userSel.style.display = isUser ? '' : 'none';
            if (deptSel) deptSel.style.display = isUser ? 'none' : '';
        }
        async function updateTaskFromDetail() {
            if (!currentTaskId) return;
            const typeSel = document.getElementById('taskDetailAssignType');
            const userSel = document.getElementById('taskDetailAssignUser');
            const deptSel = document.getElementById('taskDetailAssignDept');
            const type = typeSel ? typeSel.value : 'user';
            const userId = type === 'user' && userSel ? userSel.value : null;
            const deptId = type === 'department' && deptSel ? deptSel.value : null;
            if (!userId && !deptId) { toast(t('select_assignee'), true); return; }
            const body = { assignedTo: type === 'user' ? userId : null, assignedToDepartmentId: type === 'department' ? deptId : null };
            const statusSel = document.getElementById('taskDetailStatus');
            if (statusSel && statusSel.value) body.status = statusSel.value;
            const dueEl = document.getElementById('taskDetailDueDate');
            if (dueEl) body.dueDate = dueEl.value ? new Date(dueEl.value).toISOString() : null;
            const prioEl = document.getElementById('taskDetailPriority');
            if (prioEl && prioEl.value) body.priority = prioEl.value;
            const branchEl = document.getElementById('taskDetailBranch');
            if (branchEl) body.branchId = branchEl.value || null;
            const res = await apiFetch('/api/tasks/' + currentTaskId, { method: 'PUT', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadTaskDetail(id) {
            currentTaskId = id;
            document.getElementById('taskList').style.display = 'none';
            document.getElementById('taskDetailBox').style.display = 'block';
            const ress = await Promise.all([apiFetch('/api/tasks/' + id), apiFetch('/api/users'), apiFetch('/api/departments'), apiFetch('/api/branches')]);
            const taskRes = ress[0];
            if (taskRes.needLogin) return;
            if (!taskRes.ok) { toast((taskRes.data && taskRes.data.error) || t('err_generic'), true); showTaskList(); return; }
            const taskData = taskRes.data;
            const users = (ress[1].data && ress[1].data.data) || [];
            const depts = (ress[2].data && ress[2].data.data) || [];
            const branches = (ress[3].data && ress[3].data.data) || [];
            const assign = taskData.assignedToDepartmentId && taskData.department ? (LANG === 'fa' ? 'دپارتمان ' : 'Dept ') + escapeHtml(taskData.department.name) + (LANG === 'fa' ? ' (همه اعضا)' : ' (all)') : userDisplay(taskData.assignee) || '\u2014';
            const creator = userDisplay(taskData.creator) || '\u2014';
            const due = taskData.dueDate ? fmtTZ(taskData.dueDate, 'datetime') : '\u2014';
            const statusOpts = ['pending','in_progress','done','cancelled'].map(function(s){ return '<option value="' + s + '"' + (taskData.status === s ? ' selected' : '') + '>' + taskStatusLabel(s) + '</option>'; }).join('');
            const prioOpts = ['low','normal','high','urgent'].map(function(p){ return '<option value="' + p + '"' + ((taskData.priority || 'normal') === p ? ' selected' : '') + '>' + taskPriorityLabel(p) + '</option>'; }).join('');
            const userOpts = users.map(function(u){ return '<option value="' + u.id + '"' + (taskData.assignedTo === u.id ? ' selected' : '') + '>' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            const deptOpts = depts.map(function(d){ return '<option value="' + d.id + '"' + (taskData.assignedToDepartmentId === d.id ? ' selected' : '') + '>' + escapeHtml(d.name) + '</option>'; }).join('');
            const branchOpts = '<option value="">' + t('no_branch') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '"' + (taskData.branchId === b.id ? ' selected' : '') + '>' + escapeHtml(b.name || '') + '</option>'; }).join('');
            const isDept = !!taskData.assignedToDepartmentId;
            const dueVal = taskData.dueDate ? (function(){ const d=new Date(taskData.dueDate); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); })() : '';
            const branchName = taskData.branch && taskData.branch.name ? escapeHtml(taskData.branch.name) : '\u2014';
            const editHtml = '<div class="task-detail-edit" style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">' +
                '<label>' + t('assign_to') + '</label><div class="task-assign-row"><select id="taskDetailAssignType" onchange="toggleTaskDetailAssign()"><option value="user"' + (!isDept?' selected':'') + '>' + t('assign_user') + '</option><option value="department"' + (isDept?' selected':'') + '>' + t('assign_dept') + '</option></select>' +
                '<select id="taskDetailAssignUser" style="min-width:180px;' + (isDept?' display:none':'') + '"><option value="">' + t('select_user_task') + '</option>' + userOpts + '</select>' +
                '<select id="taskDetailAssignDept" style="min-width:180px;' + (!isDept?' display:none':'') + '"><option value="">' + t('select_dept') + '</option>' + deptOpts + '</select></div>' +
                '<label>' + t('th_branch') + '</label><select id="taskDetailBranch">' + branchOpts + '</select>' +
                '<div class="task-form-row"><div><label>' + t('due_date') + '</label><input id="taskDetailDueDate" type="datetime-local" value="' + dueVal + '"></div>' +
                '<div><label>' + t('ticket_priority') + '</label><select id="taskDetailPriority">' + prioOpts + '</select></div></div>' +
                '<label>' + t('change_status') + '</label><select id="taskDetailStatus">' + statusOpts + '</select>' +
                ' <button type="button" class="btn-primary" id="btnTaskDetailUpdate">' + t('btn_apply') + '</button></div>';
            document.getElementById('taskDetailContent').innerHTML =
                '<div class="form-box" style="max-width:100%;"><h3 style="margin:0 0 8px;">' + escapeHtml(taskData.title) + '</h3>' +
                (taskData.description ? '<p style="color:var(--text-secondary); margin:8px 0;">' + escapeHtml(taskData.description) + '</p>' : '') +
                '<p style="font-size:0.9rem; color:var(--text-muted);">' + t('creator_label') + ' ' + escapeHtml(creator) + ' | ' + t('assignee_label') + ' ' + escapeHtml(assign) + ' | ' + t('due_label') + ' ' + due + ' | ' + t('th_branch') + ': ' + branchName + ' | ' + t('ticket_priority') + ': ' + taskPriorityLabel(taskData.priority) + '</p>' + editHtml;
            const updates = (taskData.updates || []).map(function(u) {
                return '<div class="msg in" style="margin:8px 0;"><div>' + linkifyMessageContent(u.content || '') + '</div><div class="time">' + userDisplay(u.user) + ' \u00B7 ' + (u.createdAt ? fmtTZ(u.createdAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('taskUpdatesList').innerHTML = updates ? '<h4 style="font-size:1rem; margin:12px 0;">' + t('updates') + '</h4>' + updates : '<p class="text-muted" style="color:var(--text-muted);">' + t('no_updates') + '</p>';
            document.getElementById('taskUpdateContent').value = '';
            const detailAssignType = document.getElementById('taskDetailAssignType');
            if (detailAssignType) { detailAssignType.onchange = null; detailAssignType.addEventListener('change', toggleTaskDetailAssign); }
        }
        async function updateTaskStatus() {
            if (!currentTaskId) return;
            const sel = document.getElementById('taskDetailStatus');
            const status = sel ? sel.value : '';
            if (!status) return;
            const res = await apiFetch('/api/tasks/' + currentTaskId, { method: 'PUT', body: JSON.stringify({ status: status }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function addTaskUpdate() {
            if (!currentTaskId) return;
            const content = (document.getElementById('taskUpdateContent') && document.getElementById('taskUpdateContent').value) || '';
            const statusChange = document.getElementById('taskUpdateStatusChange') && document.getElementById('taskUpdateStatusChange').value;
            if (!content.trim() && !statusChange) { toast(t('task_update_required'), true); return; }
            const body = { content: content.trim() };
            if (statusChange) body.statusChange = statusChange;
            const res = await apiFetch('/api/tasks/' + currentTaskId + '/updates', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('taskUpdateContent').value = ''; const sc=document.getElementById('taskUpdateStatusChange'); if(sc)sc.value=''; toast(t('toast_update_added')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function initProcessTabs() {
            document.querySelectorAll('.process-tab').forEach(function(btn) {
                btn.onclick = function() {
                    const tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.process-tab').forEach(function(b){ b.classList.remove('active'); });
                    this.classList.add('active');
                    document.querySelectorAll('.process-panel').forEach(function(p){ p.classList.remove('show'); p.style.display = 'none'; });
                    if (tab === 'templates') { document.getElementById('processTemplatesPanel').style.display = 'block'; document.getElementById('processTemplatesPanel').classList.add('show'); loadProcessTemplates(); }
                    else { document.getElementById('processInstancesPanel').style.display = 'block'; document.getElementById('processInstancesPanel').classList.add('show'); loadProcessInstances(); }
                };
            });
        }
        async function loadProcessTemplateSelect() {
            const sel = document.getElementById('processInstanceTemplate');
            const res = await apiFetch('/api/processes/templates');
            if (!res.ok || !res.data || !res.data.data) return;
            const opts = '<option value="">' + t('all_templates') + '</option>' + res.data.data.filter(function(t){ return t.isActive; }).map(function(t){ return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
            if (sel) sel.innerHTML = opts;
        }
        async function loadProcessTemplates() {
            const list = document.getElementById('processTemplatesList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/processes/templates');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">📋</span><br>' + t('empty_process_templates') + '</div>'; return; }
            list.innerHTML = data.map(function(t) {
                const stages = (t.stages || []).map(function(s){ return s.name; }).join(' \u2192 ');
                const cnt = (t.instanceCount || 0);
                return '<div class="list-item" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div><span class="name">' + escapeHtml(t.name) + '</span><div class="meta">' + (stages || '—') + ' | ' + (t('process_instances_count') || 'Instances: ') + cnt + '</div></div>' +
                    '<div style="display:flex; gap:6px;"><button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="openProcessStartInstanceModal(\'' + t.id + '\')">' + t('process_start_instance') + '</button>' +
                    '<button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="openProcessTemplateModal(\'' + t.id + '\')">' + t('edit') + '</button>' +
                    '<button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="deleteProcessTemplate(\'' + t.id + '\')">' + (t('btn_delete') || '\u00D7') + '</button></div></div>';
            }).join('');
        }
        async function loadProcessInstances() {
            const list = document.getElementById('processInstancesList');
            const box = document.getElementById('processInstanceDetailBox');
            if (!list) return;
            if (box && box.style.display !== 'none') return;
            list.style.display = 'block';
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const status = (document.getElementById('processInstanceStatus') && document.getElementById('processInstanceStatus').value) || '';
            const templateId = (document.getElementById('processInstanceTemplate') && document.getElementById('processInstanceTemplate').value) || '';
            let q = '?limit=50';
            if (status) q += '&status=' + encodeURIComponent(status);
            if (templateId) q += '&templateId=' + encodeURIComponent(templateId);
            const res = await apiFetch('/api/processes/instances' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🔄</span><br>' + t('empty_process_instances') + '</div>'; return; }
            list.innerHTML = data.map(function(i) {
                const statusLabel = i.status === 'active' ? t('status_active') : i.status === 'completed' ? t('status_done') : t('status_cancelled');
                const templateName = (i.template && i.template.name) ? i.template.name : '�';
                const assignee = userDisplay(i.assignee) || '\u2014';
                return '<div class="list-item" onclick="loadProcessInstanceDetail(\'' + i.id + '\')" style="cursor:pointer;"><div><span class="name">' + escapeHtml(i.title) + '</span><div class="meta">' + escapeHtml(templateName) + ' ⬢ ' + assignee + ' ⬢ ' + statusLabel + '</div></div><span class="badge ' + (i.status || '') + '">' + statusLabel + '</span></div>';
            }).join('');
        }
        let currentProcessInstanceId = null;
        function showProcessInstancesList() {
            document.getElementById('processInstanceDetailBox').style.display = 'none';
            document.getElementById('processInstancesList').style.display = 'block';
            currentProcessInstanceId = null;
            loadProcessInstances();
        }
        async function loadProcessInstanceDetail(id) {
            currentProcessInstanceId = id;
            document.getElementById('processInstancesList').style.display = 'none';
            document.getElementById('processInstanceDetailBox').style.display = 'block';
            const res = await apiFetch('/api/processes/instances/' + id);
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); showProcessInstancesList(); return; }
            const i = (res.data && res.data.data) || res.data;
            const template = i.template || {};
            const stages = template.stages || [];
            const currentIdx = i.currentStageIndex != null ? i.currentStageIndex : 0;
            const currentStageName = (stages[currentIdx] && stages[currentIdx].name) ? stages[currentIdx].name : t('process_current_stage');
            const assignee = userDisplay(i.assignee) || '\u2014';
            const creator = userDisplay(i.creator) || '\u2014';
            const stepsHtml = (i.steps || []).map(function(s) {
                const done = s.completedAt ? '\u2713 ' : '';
                return '<div class="msg in" style="margin:6px 0;"><div>' + done + escapeHtml(s.stageName) + (s.notes ? ' \u2014 ' + escapeHtml(s.notes) : '') + '</div><div class="time">' + userDisplay(s.assignee) + ' \u22C6 ' + (s.startedAt ? fmtTZ(s.startedAt, 'datetime') : '') + (s.completedAt ? ' \u2014 ' + fmtTZ(s.completedAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('processInstanceDetailContent').innerHTML =
                '<div class="form-box" style="max-width:100%;"><h3 style="margin:0 0 8px;">' + escapeHtml(i.title) + '</h3>' +
                '<p style="font-size:0.9rem; color:var(--text-muted);">' + t('creator_label') + ' ' + escapeHtml(creator) + ' | ' + t('assignee_label') + ' ' + assignee + ' | ' + t('process_current_stage') + ': ' + escapeHtml(currentStageName) + '</p>' +
                '<h4 style="font-size:1rem; margin:12px 0;">' + t('history') + '</h4>' + (stepsHtml || '<p class="text-muted">' + (t('no_updates') || '') + '</p>') + '</div>';
            const advanceBox = document.getElementById('processInstanceAdvanceBox');
            if (i.status !== 'active') { advanceBox.innerHTML = ''; return; }
            const isLast = currentIdx >= stages.length - 1;
            advanceBox.innerHTML = '<label>' + t('process_notes') + '</label><textarea id="processAdvanceNotes" rows="2" style="width:100%; margin-bottom:8px;"></textarea>' +
                (isLast ? '<button type="button" class="btn-primary" onclick="advanceProcessInstance(true)">' + t('process_complete') + '</button>' : '<button type="button" class="btn-primary" onclick="advanceProcessInstance(false)">' + t('process_advance') + '</button>');
        }
        async function advanceProcessInstance(complete) {
            if (!currentProcessInstanceId) return;
            const notes = (document.getElementById('processAdvanceNotes') && document.getElementById('processAdvanceNotes').value) || '';
            const res = await apiFetch('/api/processes/instances/' + currentProcessInstanceId + '/advance', { method: 'POST', body: JSON.stringify({ notes: notes }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadProcessInstanceDetail(currentProcessInstanceId); loadProcessInstances(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function openProcessTemplateModal(id) {
            document.getElementById('processTemplateId').value = id || '';
            document.getElementById('processTemplateName').value = '';
            document.getElementById('processTemplateDesc').value = '';
            document.getElementById('processTemplateStagesContainer').innerHTML = '';
            document.getElementById('processTemplateModalTitle').textContent = id ? t('edit') : t('process_add_template');
            if (id) {
                apiFetch('/api/processes/templates/' + id).then(function(res) {
                    if (res.ok && res.data) {
                        const t = (res.data.data) ? res.data.data : res.data;
                        document.getElementById('processTemplateName').value = t.name || '';
                        document.getElementById('processTemplateDesc').value = t.description || '';
                        const stages = t.stages || [];
                        stages.forEach(function(s) { addProcessTemplateStageRow(s.name); });
                    }
                });
            } else { addProcessTemplateStageRow(); }
            document.getElementById('modalProcessTemplate').style.display = 'flex';
        }
        function addProcessTemplateStageRow(name) {
            var name = (typeof name === 'string') ? name : '';
            const container = document.getElementById('processTemplateStagesContainer');
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
            div.innerHTML = '<input type="text" class="process-stage-name" data-i18n-ph="process_stage_name" placeholder="' + (t('process_stage_name') || 'نام مرحله') + '" value="' + escapeHtml(name) + '" style="flex:1;"><button type="button" class="btn-secondary" style="padding:4px 10px;" class="process-stage-remove">×</button>';
            const removeStageBtn = div.querySelector('.process-stage-remove');
            if (removeStageBtn) {
                removeStageBtn.removeEventListener('click', function(e) { div.remove(); });
                removeStageBtn.addEventListener('click', function(e) { div.remove(); });
            }
            container.appendChild(div);
        }
        function closeProcessTemplateModal() { document.getElementById('modalProcessTemplate').style.display = 'none'; }
        async function saveProcessTemplate() {
            const id = document.getElementById('processTemplateId').value;
            const name = (document.getElementById('processTemplateName') && document.getElementById('processTemplateName').value) || '';
            if (!name.trim()) { toast(t('dept_name_required'), true); return; }
            const desc = (document.getElementById('processTemplateDesc') && document.getElementById('processTemplateDesc').value) || '';
            const inputs = document.querySelectorAll('#processTemplateStagesContainer .process-stage-name');
            const stages = [];
            inputs.forEach(function(inp, i) { const v = (inp.value || '').trim(); if (v) stages.push({ name: v, order: i }); });
            if (stages.length === 0) { toast(t('process_min_one_stage'), true); return; }
            const body = { name: name.trim(), description: desc, stages: stages };
            const url = id ? '/api/processes/templates/' + id : '/api/processes/templates';
            const method = id ? 'PUT' : 'POST';
            const res = await apiFetch(url, { method: method, body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeProcessTemplateModal(); loadProcessTemplates(); loadProcessTemplateSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteProcessTemplate(id) {
            if (!confirm(t('process_delete_template_confirm') || (LANG === 'en' ? 'Delete this template?' : 'این قالب حذف شود؟'))) return;
            const res = await apiFetch('/api/processes/templates/' + id, { method: 'DELETE' });
            if (res.ok) { loadProcessTemplates(); loadProcessTemplateSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function openProcessStartInstanceModal(templateId, refType, refId, suggestedTitle) {
            document.getElementById('processStartRefType').value = refType || '';
            document.getElementById('processStartRefId').value = refId || '';
            document.getElementById('processStartTitle').value = (suggestedTitle && suggestedTitle.trim()) ? suggestedTitle.trim() : '';
            document.getElementById('processStartAssignedTo').value = '';
            apiFetch('/api/processes/templates').then(function(res) {
                const sel = document.getElementById('processStartTemplateSel');
                if (!sel) return;
                const list = (res.data && res.data.data) || [];
                const active = list.filter(function(t){ return t.isActive !== false; });
                sel.innerHTML = '<option value="">' + (t('process_select_template') || t('all_templates')) + '</option>' + active.map(function(t){ return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
                if (templateId) sel.value = templateId;
            });
            apiFetch('/api/users').then(function(res) {
                const sel = document.getElementById('processStartAssignedTo');
                if (!sel) return;
                const users = (res.data && res.data.data) || [];
                sel.innerHTML = '<option value="">' + t('no_user') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.name) + '</option>'; }).join('');
            });
            document.getElementById('modalProcessStartInstance').style.display = 'flex';
        }
        function closeProcessStartInstanceModal() { document.getElementById('modalProcessStartInstance').style.display = 'none'; }
        async function startProcessInstance() {
            const templateId = (document.getElementById('processStartTemplateSel') && document.getElementById('processStartTemplateSel').value) || '';
            const title = (document.getElementById('processStartTitle') && document.getElementById('processStartTitle').value) || '';
            if (!templateId || !title.trim()) { toast(t('ticket_title_required'), true); return; }
            const assignedTo = (document.getElementById('processStartAssignedTo') && document.getElementById('processStartAssignedTo').value) || null;
            const refType = (document.getElementById('processStartRefType') && document.getElementById('processStartRefType').value) || null;
            const refId = (document.getElementById('processStartRefId') && document.getElementById('processStartRefId').value) || null;
            const body = { templateId: templateId, title: title.trim(), assignedTo: assignedTo || undefined };
            if (refType && refId) { body.referenceType = refType; body.referenceId = refId; }
            const res = await apiFetch('/api/processes/instances', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeProcessStartInstanceModal(); loadProcessInstances(); loadProcessTemplates(); toast(t('toast_task_created')); document.querySelectorAll('.process-tab').forEach(function(b){ if(b.getAttribute('data-tab')==='instances') b.click(); }); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function startProcessFromTicket() {
            if (!currentTicketId) return;
            const titleEl = document.getElementById('ticketDetailTitle');
            const suggestedTitle = titleEl ? titleEl.textContent : '';
            showPage('processes');
            setTimeout(function() {
                loadProcessTemplateSelect();
                openProcessStartInstanceModal(null, 'ticket', currentTicketId, suggestedTitle);
            }, 400);
        }

        async function addTicket() {
            const title = document.getElementById('ticketTitle').value.trim();
            if (!title) { toast(t('ticket_title_required'), true); return; }
            const assigneeEl = document.getElementById('ticketAssignee');
            const deptEl = document.getElementById('ticketDept');
            const dueEl = document.getElementById('ticketDueDate');
            const body = { title: title, description: (document.getElementById('ticketDesc').value || '').trim(), priority: (document.getElementById('ticketPriority').value || 'normal') };
            if (assigneeEl && assigneeEl.value) body.assignedTo = assigneeEl.value;
            if (deptEl && deptEl.value) body.departmentId = deptEl.value;
            if (dueEl && dueEl.value) body.dueDate = dueEl.value;
            const res = await apiFetch('/api/tickets', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('ticketTitle').value = ''; document.getElementById('ticketDesc').value = ''; const dueInp = document.getElementById('ticketDueDate'); if (dueInp) dueInp.value = ''; document.getElementById('ticketFormBox').style.display = 'none'; toast(t('toast_ticket_created')); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let _editingDeptId = null;
        function cancelDeptEdit() {
            _editingDeptId = null;
            document.getElementById('deptName').value = '';
            document.getElementById('deptDesc').value = '';
            document.getElementById('deptKeywords').value = '';
            const colorEl = document.getElementById('deptColor'); if (colorEl) colorEl.value = '#10b981';
            const defEl = document.getElementById('deptIsDefault'); if (defEl) defEl.checked = false;
            const actEl = document.getElementById('deptIsActive'); if (actEl) actEl.checked = true;
            const branchEl = document.getElementById('deptBranch'); if (branchEl) branchEl.value = '';
            const btn = document.getElementById('btnDeptSave'); if (btn) { btn.textContent = t('add_dept'); btn.setAttribute('data-i18n', 'add_dept'); }
            const cancelBtn = document.getElementById('btnDeptCancel'); if (cancelBtn) cancelBtn.style.display = 'none';
        }
        function editDepartment(idx) {
            const list = window._deptListData;
            if (!list || !list[idx]) return;
            const d = list[idx];
            _editingDeptId = d.id;
            document.getElementById('deptName').value = d.name || '';
            document.getElementById('deptDesc').value = d.description || '';
            document.getElementById('deptKeywords').value = d.keywords || '';
            const colorEl = document.getElementById('deptColor'); if (colorEl) colorEl.value = (d.color || '#10b981').replace(/^#?/, '#');
            const defEl = document.getElementById('deptIsDefault'); if (defEl) defEl.checked = !!d.isDefault;
            const actEl = document.getElementById('deptIsActive'); if (actEl) actEl.checked = d.isActive !== false;
            const branchEl = document.getElementById('deptBranch'); if (branchEl) branchEl.value = d.branchId || '';
            const btn = document.getElementById('btnDeptSave'); if (btn) { btn.textContent = t('save_changes'); btn.setAttribute('data-i18n', 'save_changes'); }
            const cancelBtn = document.getElementById('btnDeptCancel'); if (cancelBtn) cancelBtn.style.display = '';
            toast(t('dept_edit_hint'), false);
        }
        function normalizeKeywordsInput(raw) {
            if (!raw || !raw.trim()) return '';
            const parts = raw.split(/[,،;\s]+/).map(function(p) { return p.trim(); }).filter(Boolean);
            const seen = {};
            return parts.filter(function(p) { const k = p.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; }).join(', ');
        }
        function formatDeptKeywords() {
            const el = document.getElementById('deptKeywords');
            if (!el) return;
            el.value = normalizeKeywordsInput(el.value);
            toast(LANG === 'fa' ? 'کلمات کلیدی مرتب شد' : 'Keywords formatted');
        }
        async function saveDepartment() {
            const name = document.getElementById('deptName').value.trim();
            if (!name) { toast(t('dept_name_required'), true); return; }
            const branchId = document.getElementById('deptBranch').value || null;
            const colorEl = document.getElementById('deptColor');
            const defEl = document.getElementById('deptIsDefault');
            const actEl = document.getElementById('deptIsActive');
            const keywordsRaw = document.getElementById('deptKeywords').value;
            const body = { name: name, description: document.getElementById('deptDesc').value.trim(), keywords: normalizeKeywordsInput(keywordsRaw), branchId: branchId };
            if (colorEl) body.color = colorEl.value || '#10b981';
            if (defEl) body.isDefault = defEl.checked;
            if (actEl) body.isActive = actEl.checked;
            let res;
            if (_editingDeptId) {
                res = await apiFetch('/api/departments/' + _editingDeptId, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                res = await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(body) });
            }
            if (res.needLogin) return;
            if (res.ok) {
                cancelDeptEdit();
                toast(_editingDeptId ? t('toast_dept_updated') : t('toast_dept_added'));
                loadDepartments();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        let userListData = [];
        function initUserFilters() {
            const searchEl = document.getElementById('userSearchInput');
            const roleEl = document.getElementById('userFilterRole');
            const statusEl = document.getElementById('userFilterStatus');
            if (searchEl) searchEl.oninput = searchEl.onkeyup = function() { filterAndRenderUsers(); };
            if (statusEl) statusEl.onchange = function() { filterAndRenderUsers(); };
            if (roleEl) roleEl.onchange = function() {
                document.querySelectorAll('#userRolePills .pill').forEach(function(x) { x.classList.remove('active'); });
                const p = document.querySelector('#userRolePills .pill[data-role="' + (roleEl.value || '') + '"]');
                if (p) p.classList.add('active');
                filterAndRenderUsers();
            };
            document.querySelectorAll('#userRolePills .pill').forEach(function(p) {
                p.onclick = function() {
                    document.querySelectorAll('#userRolePills .pill').forEach(function(x) { x.classList.remove('active'); });
                    this.classList.add('active');
                    const r = this.getAttribute('data-role') || '';
                    if (roleEl) roleEl.value = r;
                    filterAndRenderUsers();
                };
            });
        }
        function initUserEditTabs() {
            document.querySelectorAll('.user-edit-tab').forEach(function(btn) {
                btn.onclick = function() {
                    const tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                    document.querySelectorAll('.user-edit-tab-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
                    this.classList.add('active'); this.setAttribute('aria-selected', 'true');
                    const panel = document.getElementById('userEditTab' + (tab === 'info' ? 'Info' : 'Perms'));
                    if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
                };
            });
        }
        function userInitial(u) {
            if (u.avatar && String(u.avatar).trim()) return null;
            return (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?');
        }
        function filterAndRenderUsers() {
            const search = (document.getElementById('userSearchInput') && document.getElementById('userSearchInput').value) || '';
            const roleFilter = (document.getElementById('userFilterRole') && document.getElementById('userFilterRole').value) || '';
            const statusFilter = (document.getElementById('userFilterStatus') && document.getElementById('userFilterStatus').value) || '';
            const q = search.trim().toLowerCase();
            const filtered = userListData.filter(function(u) {
                if (statusFilter === 'active' && u.isActive === false) return false;
                if (statusFilter === 'blocked' && u.isActive !== false) return false;
                if (roleFilter && u.role !== roleFilter) return false;
                if (!q) return true;
                const name = (u.name || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const username = (u.username || '').toLowerCase();
                return name.indexOf(q) >= 0 || email.indexOf(q) >= 0 || username.indexOf(q) >= 0;
            });
            renderUserList(filtered);
        }
        function renderUserList(users) {
            const list = document.getElementById('userList');
            if (!list) return;
            const canManage = (currentUser && currentUser.permissions && currentUser.permissions.manage_users);
            const canViewActivity = currentUser && ['owner', 'admin', 'manager', 'supervisor'].indexOf(currentUser.role) !== -1;
            const roleLabels = { owner: t('role_owner'), admin: t('role_admin'), manager: t('role_manager'), supervisor: t('role_supervisor'), agent: t('role_agent') };
            const statusLabels = { online: t('status_online'), away: t('status_away') || 'دور', busy: t('status_busy') || 'مشغول', offline: t('status_offline') || 'آفلاین' };
            if (!users || users.length === 0) { list.innerHTML = '<div class="empty" style="grid-column:1/-1;"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            list.innerHTML = users.map(function(u) {
                const initial = userInitial(u) || '?';
                const avatarUrl = (u.avatar && String(u.avatar).trim()) ? ((u.avatar.indexOf('/') === 0 ? (window.location.origin || '') : '') + u.avatar) : '';
                const onerr = 'this.style.display=' + String.fromCharCode(39) + 'none' + String.fromCharCode(39);
                const avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="' + onerr + '">' : initial;
                const deptBranch = [];
                if (u.department && u.department.name) deptBranch.push(escapeHtml(u.department.name));
                if (u.branch && u.branch.name) deptBranch.push(escapeHtml(u.branch.name));
                const statusClass = (u.status && ['online', 'away', 'busy'].indexOf(u.status) !== -1) ? u.status : 'offline';
                const statusLabel = statusLabels[u.status] || statusLabels.offline;
                const lastLoginStr = u.lastLoginAt ? timeAgo(u.lastLoginAt) : (LANG === 'fa' ? 'هرگز' : 'Never');
                const inactiveClass = u.isActive === false ? ' inactive' : '';
                const blockedBadge = u.isActive === false ? '<span class="badge cancelled">' + t('blocked') + '</span>' : '';
                const protectedBadge = u.isProtectedAdmin ? '<span class="badge" style="background:#fff3cd;color:#856404;font-size:11px;">' + (LANG === 'fa' ? 'غیر قابل ویرایش' : 'Protected') + '</span>' : '';
                const roleBadge = '<span class="badge" style="background:var(--accent-soft);color:var(--accent);">' + escapeHtml(roleLabels[u.role] || u.role) + '</span>';
                const statusBadge = '<span class="status-dot ' + statusClass + '" title="' + escapeHtml(statusLabel) + '"></span>';
                const btns = [];
                if (canViewActivity) btns.push('<button type="button" class="btn-secondary btn-sm btn-user-list-staff" data-user-id="' + escapeHtml(u.id) + '">' + t('view_activity') + '</button>');
                if (canManage) btns.push('<button type="button" class="btn-secondary btn-sm btn-user-list-edit" data-user-id="' + escapeHtml(u.id) + '">' + (u.isProtectedAdmin ? (LANG === 'fa' ? 'مشاهده' : 'View') : t('edit_access')) + '</button>');
                const btn = btns.join(' ');
                const cardClickClass = canViewActivity ? ' user-card-clickable' : '';
                const cardDataId = ' data-user-id="' + escapeHtml(u.id) + '"';
                const positionLine = u.position ? '<div class="user-card-meta" style="color:var(--accent);font-weight:500;">' + escapeHtml(u.position) + '</div>' : '';
                return '<div class="user-card' + inactiveClass + cardClickClass + '"' + cardDataId + '><div class="user-card-header"><div class="user-card-avatar">' + avatarHtml + '</div><div class="user-card-name">' + statusBadge + ' ' + escapeHtml(u.name) + ' ' + blockedBadge + ' ' + protectedBadge + '</div></div><div class="user-card-body">' + positionLine + '<div class="user-card-email">' + escapeHtml(u.email || '') + '</div><div class="user-card-meta">' + (deptBranch.length ? deptBranch.join(' · ') : '') + '</div><div class="user-card-meta">' + (LANG === 'fa' ? 'آخرین ورود: ' : 'Last login: ') + lastLoginStr + '</div><div class="user-card-badges">' + roleBadge + '</div></div><div class="user-card-actions" onclick="event.stopPropagation();">' + btn + '</div></div>';
            }).join('');
        }
        function toggleUserForm() {
            const box = document.getElementById('userFormBox');
            const btnAdd = document.getElementById('btnAddUser');
            const btnCancel = document.getElementById('btnCancelUserForm');
            const visible = box.style.display === 'block';
            box.style.display = visible ? 'none' : 'block';
            btnAdd.style.display = visible ? '' : 'none';
            if (btnCancel) btnCancel.style.display = visible ? 'none' : '';
        }
        function initUserAddPerms() {
            const box = document.getElementById('userAddPermsBox');
            const cont = document.getElementById('userAddPerms');
            if (!box || !cont || !(currentUser && currentUser.permissions && currentUser.permissions.manage_users)) return;
            const canGrantManageUsers = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            const html = Object.keys(sectionLabels).map(function(k) {
                if (k === 'manage_users' && !canGrantManageUsers) return '';
                return '<label style="display:block; margin:6px 0;"><input type="checkbox" data-perm="' + k + '"> ' + sectionLabel(k) + '</label>';
            }).join('');
            cont.innerHTML = html;
            box.style.display = 'block';
        }
        async function loadUsers() {
            const list = document.getElementById('userList');
            setLoading('userList', 4);
            const res = await apiFetch('/api/users');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + escapeHtml(res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            const data = res.data;
            userListData = data.data || [];
            if (userListData.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            filterAndRenderUsers();
        }
        let currentEditUserId = null;
        var sectionLabels = { dashboard: 'page_dashboard', conversations: 'section_conversations', customers: 'section_customers', tickets: 'section_tickets', tasks: 'section_tasks', departments: 'section_departments', users: 'section_users', branches: 'section_branches', supervision: 'section_supervision', staff_activity: 'section_staff_activity', announcements: 'section_announcements', internal_chat: 'section_internal_chat', whatsapp: 'section_whatsapp', rates: 'section_rates', services: 'section_services', processes: 'section_processes', panel_settings: 'page_panel_settings', manage_users: 'section_manage_users', manage_tickets: 'section_manage_tickets' };
        const permGroups = [
            { key: 'communications', title: 'user_perms_group_communications', keys: ['conversations', 'customers', 'tickets', 'internal_chat', 'whatsapp', 'announcements'] },
            { key: 'organization', title: 'user_perms_group_organization', keys: ['dashboard', 'departments', 'users', 'branches', 'tasks', 'processes', 'staff_activity', 'supervision'] },
            { key: 'settings', title: 'user_perms_group_settings', keys: ['rates', 'services', 'panel_settings'] },
            { key: 'special', title: 'user_perms_group_special', keys: ['manage_users', 'manage_tickets'] }
        ];
        function sectionLabel(k) { const lbl = t(sectionLabels[k] || k); return (lbl && String(lbl).trim()) ? lbl : (sectionLabels[k] || k); }
        function closeUserEditModal() { document.getElementById('userEditModal').style.display = 'none'; currentEditUserId = null; }
        function userPermsSelectAll(checked) {
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) { cb.checked = !!checked; });
        }
        function userPermsSelectGroup(groupKey, checked) {
            const group = permGroups.find(function(g) { return g.key === groupKey; });
            if (!group) return;
            group.keys.forEach(function(k) {
                const cb = document.querySelector('#userEditPerms input[data-perm="' + k + '"]');
                if (cb) cb.checked = !!checked;
            });
        }
        async function openUserEdit(userId) {
            const res = await apiFetch('/api/users/' + userId);
            if (res.needLogin || !res.ok) return;
            const u = res.data;
            const isProtected = !!u.isProtectedAdmin;
            currentEditUserId = userId;
            document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected', b.getAttribute('data-tab') === 'info' ? 'true' : 'false'); if (b.getAttribute('data-tab') === 'info') b.classList.add('active'); });
            document.getElementById('userEditTabInfo').classList.add('active'); document.getElementById('userEditTabInfo').style.display = 'block';
            document.getElementById('userEditTabPerms').classList.remove('active'); document.getElementById('userEditTabPerms').style.display = 'none';
            document.getElementById('userEditId').value = u.id;
            document.getElementById('userEditName').value = u.name || '';
            document.getElementById('userEditUsername').value = u.username || '';
            document.getElementById('userEditEmail').value = u.email || '';
            document.getElementById('userEditRole').value = u.role || 'agent';
            document.getElementById('userEditDept').value = u.departmentId || '';
            document.getElementById('userEditBranch').value = u.branchId || '';
            document.getElementById('userEditActive').checked = u.isActive !== false;
            document.getElementById('userEditPassword').value = '';
            const skillsEl = document.getElementById('userEditSkillsKeywords');
            if (skillsEl) skillsEl.value = (u.settings && u.settings.skillsKeywords) || '';
            const posEl = document.getElementById('userEditPosition');
            if (posEl) posEl.value = u.position || '';
            const editFields = ['userEditName','userEditUsername','userEditEmail','userEditRole','userEditDept','userEditBranch','userEditActive','userEditPassword','userEditSkillsKeywords','userEditPosition'];
            editFields.forEach(function(fid) { const el = document.getElementById(fid); if (el) el.disabled = isProtected; });
            let protectedBanner = document.getElementById('userEditProtectedBanner');
            if (!protectedBanner) {
                protectedBanner = document.createElement('div');
                protectedBanner.id = 'userEditProtectedBanner';
                protectedBanner.style.cssText = 'background:#fff3cd;color:#856404;border:1px solid #ffc107;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:14px;text-align:center;font-weight:600;';
                const editBody = document.querySelector('.user-edit-body');
                if (editBody) editBody.insertBefore(protectedBanner, editBody.firstChild);
            }
            protectedBanner.style.display = isProtected ? 'block' : 'none';
            protectedBanner.textContent = LANG === 'fa' ? 'این کاربر ادمین اصلی سیستم است و اطلاعات آن غیر قابل ویرایش می‌باشد' : 'This is the main system admin — account info is read-only';
            const modalTitle = document.getElementById('userEditModalTitle');
            if (modalTitle) modalTitle.textContent = isProtected ? (LANG === 'fa' ? 'مشاهده ادمین اصلی (غیر قابل ویرایش)' : 'View Main Admin (Read-only)') : (t('modal_user_edit') || 'ویرایش کاربر');
            const perms = u.permissions || {};
            const canGrantSpecial = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            let html = '';
            permGroups.forEach(function(gr) {
                const visibleKeys = gr.keys.filter(function(k) { return (k !== 'manage_users' && k !== 'manage_tickets') || canGrantSpecial; });
                if (visibleKeys.length === 0) return;
                html += '<div class="user-edit-perm-group" data-group="' + gr.key + '">';
                html += '<div class="user-edit-perm-group-header"><span class="user-edit-perm-group-title">' + (t(gr.title) || gr.key) + '</span><span class="user-edit-perm-group-toggles"><button type="button" class="btn-user-perms-group" onclick="userPermsSelectGroup(\'' + gr.key + '\', true)"' + (isProtected ? ' disabled' : '') + '>' + (t('user_perms_all') || 'همه') + '</button><button type="button" class="btn-user-perms-group" onclick="userPermsSelectGroup(\'' + gr.key + '\', false)"' + (isProtected ? ' disabled' : '') + '>' + (t('user_perms_none') || 'هیچ‌کدام') + '</button></span></div>';
                html += '<div class="user-edit-perm-group-items">';
                visibleKeys.forEach(function(k) {
                    const checked = perms[k] !== false ? ' checked' : '';
                    const lbl = sectionLabel(k);
                    html += '<label class="user-edit-perm-item"><input type="checkbox" data-perm="' + k + '"' + checked + (isProtected ? ' disabled' : '') + '><span class="user-edit-perm-label">' + escapeHtml(lbl) + '</span></label>';
                });
                html += '</div></div>';
            });
            document.getElementById('userEditPerms').innerHTML = html;
            const btnDel = document.getElementById('btnUserDelete');
            if (btnDel) btnDel.style.display = (!isProtected && currentUser && currentUser.canDeleteUser && u.id !== (currentUser && currentUser.id)) ? '' : 'none';
            const btnSave = document.querySelector('.user-edit-footer .btn-primary');
            if (btnSave) btnSave.style.display = isProtected ? 'none' : '';
            const permsAllBtn = document.querySelector('.user-edit-perms-actions .btn-perms-all');
            const permsNoneBtn = document.querySelector('.user-edit-perms-actions .btn-perms-none');
            if (permsAllBtn) permsAllBtn.disabled = isProtected;
            if (permsNoneBtn) permsNoneBtn.disabled = isProtected;
            document.getElementById('userEditModal').style.display = 'flex';
        }
        function openDeleteUserModal() {
            if (!currentEditUserId) return;
            const u = userListData.find(function(x) { return x.id === currentEditUserId; });
            if (!u) return;
            document.getElementById('deleteUserModalText').textContent = (LANG === 'fa' ? 'مکالمات، تسک‌ها، تیکت‌ها و فرایندهای ' : 'Conversations, tasks, tickets and processes of ') + (u.name || u.email) + (LANG === 'fa' ? ' به کاربر انتخابی منتقل و حساب غیرفعال می‌شود.' : ' will be transferred and the account will be deactivated.');
            const sel = document.getElementById('deleteUserTransferTo');
            const others = userListData.filter(function(x) { return x.id !== currentEditUserId && x.isActive !== false; });
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'انتخاب کاربر' : 'Select user') + '</option>' + others.map(function(x) { return '<option value="' + x.id + '">' + escapeHtml(x.name || x.username || x.email) + '</option>'; }).join('');
            const permCb = document.getElementById('deleteUserPermanent');
            if (permCb) permCb.checked = false;
            document.getElementById('deleteUserModal').style.display = 'flex';
        }
        function closeDeleteUserModal() { document.getElementById('deleteUserModal').style.display = 'none'; }
        async function confirmDeleteUser() {
            if (!currentEditUserId) return;
            const transferTo = document.getElementById('deleteUserTransferTo').value;
            if (!transferTo) { toast(LANG === 'fa' ? 'انتخاب کاربر برای انتقال الزامی است' : 'Select user to transfer data to', true); return; }
            const permanent = document.getElementById('deleteUserPermanent') && document.getElementById('deleteUserPermanent').checked;
            const endpoint = permanent ? '/api/users/' + currentEditUserId + '/permanent-delete' : '/api/users/' + currentEditUserId + '/delete-with-transfer';
            const btn = document.getElementById('btnConfirmDeleteUser');
            if (btn) { btn.disabled = true; btn.textContent = LANG === 'fa' ? 'در حال پردازش...' : 'Processing...'; }
            const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ transferToUserId: transferTo }) });
            if (btn) { btn.disabled = false; btn.textContent = t('user_delete_confirm_btn') || (LANG === 'fa' ? 'حذف و انتقال' : 'Delete & transfer'); }
            if (res.needLogin) return;
            if (res.ok) {
                toast(permanent ? (t('user_permanent_deleted') || (LANG === 'fa' ? 'کاربر به‌طور دائمی حذف شد' : 'User permanently deleted')) : (t('user_deleted_transferred') || (LANG === 'fa' ? 'کاربر غیرفعال و داده‌ها منتقل شد' : 'User deactivated and data transferred')));
                closeDeleteUserModal(); closeUserEditModal(); loadUsers();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function saveUserEdit() {
            if (!currentEditUserId) return;
            const perms = {};
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) {
                perms[cb.getAttribute('data-perm')] = cb.checked;
            });
            const skillsEl = document.getElementById('userEditSkillsKeywords');
            const posEl = document.getElementById('userEditPosition');
            const editEmail = document.getElementById('userEditEmail').value.trim();
            if (!editEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) { toast(LANG === 'fa' ? 'فرمت ایمیل نامعتبر است' : 'Invalid email format', true); return; }
            const payload = {
                name: document.getElementById('userEditName').value.trim(),
                username: document.getElementById('userEditUsername').value.trim() || null,
                email: editEmail,
                role: document.getElementById('userEditRole').value,
                position: posEl ? posEl.value.trim() || null : undefined,
                departmentId: document.getElementById('userEditDept').value || null,
                branchId: document.getElementById('userEditBranch').value || null,
                isActive: document.getElementById('userEditActive').checked,
                permissions: perms,
                skillsKeywords: skillsEl ? skillsEl.value.trim() || null : null
            };
            const pw = document.getElementById('userEditPassword').value;
            if (pw) {
                if (pw.length < 6) { toast(LANG === 'fa' ? 'رمز عبور حداقل ۶ کاراکتر باشد' : 'Password must be at least 6 characters', true); return; }
                payload.password = pw;
            }
            const res = await apiFetch('/api/users/' + currentEditUserId, { method: 'PUT', body: JSON.stringify(payload) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('saved')); closeUserEditModal(); loadUsers(); if (currentEditUserId === (currentUser && currentUser.id)) { apiFetch('/api/users/me').then(function(r) { if (r.ok && r.data) { currentUser = r.data; applyNavByRole(); } }); } } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        async function loadDeptsForUser() {
            const res = await apiFetch('/api/departments');
            if (res.needLogin) return;
            const arr = (res.data && res.data.data) || [];
            const opt = '<option value="">' + t('no_dept') + '</option>' + arr.map(function(d) { return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
            ['userDept','userEditDept'].forEach(function(id) { const el = document.getElementById(id); if (el) el.innerHTML = opt; });
        }

        async function addUser() {
            if (!(currentUser && currentUser.permissions && currentUser.permissions.manage_users)) { toast(t('manage_users_required'), true); return; }
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmailAdd').value.trim();
            const password = document.getElementById('userPass').value;
            if (!name || !email || !password) { toast(t('required_name_email_pass'), true); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast(LANG === 'fa' ? 'فرمت ایمیل نامعتبر است' : 'Invalid email format', true); return; }
            if (password.length < 6) { toast(LANG === 'fa' ? 'رمز عبور حداقل ۶ کاراکتر باشد' : 'Password must be at least 6 characters', true); return; }
            const username = (document.getElementById('userUsernameAdd') && document.getElementById('userUsernameAdd').value) ? document.getElementById('userUsernameAdd').value.trim() : null;
            const branchId = document.getElementById('userBranch').value || null;
            const deptId = document.getElementById('userDept').value || null;
            const perms = {};
            const permsEl = document.getElementById('userAddPerms');
            if (permsEl) permsEl.querySelectorAll('input[data-perm]').forEach(function(cb) { perms[cb.getAttribute('data-perm')] = cb.checked; });
            const skillsEl = document.getElementById('userSkillsAdd');
            const skillsKeywords = (skillsEl && skillsEl.value.trim()) || null;
            const positionEl = document.getElementById('userPositionAdd');
            const positionVal = (positionEl && positionEl.value.trim()) || null;
            const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ name: name, username: username, email: email, password: password, role: document.getElementById('userRole').value, departmentId: deptId, branchId: branchId, permissions: perms, skillsKeywords: skillsKeywords, position: positionVal }) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('userName').value = '';
                if (document.getElementById('userUsernameAdd')) document.getElementById('userUsernameAdd').value = '';
                document.getElementById('userEmailAdd').value = '';
                document.getElementById('userPass').value = '';
                if (document.getElementById('userSkillsAdd')) document.getElementById('userSkillsAdd').value = '';
                if (positionEl) positionEl.value = '';
                toast(t('toast_user_added')); loadUsers(); toggleUserForm();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var currentInternalThreadId = null;
        let currentInternalThreadOtherUserId = null;
        let currentInternalThreadParticipants = [];
        var internalCallPeers = {};
        var internalCallIceQueue = {};
        var internalCallLocalStream = null;
        var internalCallPendingOffer = null;
        var internalCallPendingInvite = null;
        var internalCallIsIncoming = false;
        var internalCallIsJoining = false;
        var internalCallType = 'voice';
        let internalCallMicMuted = false;
        let internalCallCameraOff = false;
        let internalCallStartedAt = null;
        let internalCallDurationInterval = null;
        // STUN: non-Google first so WebRTC can work when Google is unreachable (e.g. from Iran without VPN)
        var INTERNAL_CALL_ICE_SERVERS = [{ urls: 'stun:stun.stunprotocol.org:3478' }, { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }];
        function getSocket() { return socket; }
        function getInternalCallOtherDisplay() {
            const id = currentInternalThreadOtherUserId || (internalCallPendingInvite && internalCallPendingInvite.fromUserId) || (internalCallPendingOffer && internalCallPendingOffer.fromUserId);
            if (!id) return { name: '', initial: '?' };
            const p = (currentInternalThreadParticipants || []).find(function(x) { return String(x.id) === String(id); });
            const name = (p && (p.name || p.email)) || (internalCallPendingInvite && internalCallPendingInvite.fromUserName) || '';
            const initial = (name && name.trim()[0]) ? name.trim()[0].toUpperCase() : '?';
            return { name: name || (LANG === 'fa' ? 'طرف تماس' : 'Contact'), initial: initial };
        }
        function formatCallDuration(ms) {
            let s = Math.floor(ms / 1000);
            const m = Math.floor(s / 60);
            s = s % 60;
            return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }
        function startInternalCallDurationTimer() {
            if (internalCallDurationInterval) return;
            internalCallStartedAt = internalCallStartedAt || Date.now();
            const el = document.getElementById('internalCallDuration');
            if (el) { el.style.display = 'block'; el.textContent = formatCallDuration(0); }
            internalCallDurationInterval = setInterval(function() {
                const el = document.getElementById('internalCallDuration');
                if (el) el.textContent = formatCallDuration(Date.now() - internalCallStartedAt);
            }, 1000);
        }
        function stopInternalCallDurationTimer() {
            if (internalCallDurationInterval) { clearInterval(internalCallDurationInterval); internalCallDurationInterval = null; }
            internalCallStartedAt = null;
            const el = document.getElementById('internalCallDuration');
            if (el) el.style.display = 'none';
        }
        function updateInternalCallConnectionStatus(text, stateClass) {
            const el = document.getElementById('internalCallConnectionStatus');
            if (!el) return;
            el.textContent = text || '';
            el.style.display = text ? 'block' : 'none';
            el.className = 'internal-call-connection-status' + (stateClass ? ' ' + stateClass : '');
        }
        function attachPeerConnectionStateHandlers(pc, userId) {
            if (!pc) return;
            function updateState() {
                const state = pc.iceConnectionState || (pc.connectionState || '');
                if (state === 'connected' || state === 'completed') updateInternalCallConnectionStatus(t('call_connected') || 'متصل', 'connected');
                else if (state === 'connecting' || state === 'checking') updateInternalCallConnectionStatus(t('call_connecting') || 'در حال اتصال...', 'connecting');
                else if (state === 'failed') updateInternalCallConnectionStatus(t('call_failed') || 'خطا در اتصال', 'failed');
                else if (state === 'disconnected') updateInternalCallConnectionStatus(t('call_connecting') || 'در حال اتصال...', 'connecting');
            }
            pc.oniceconnectionstatechange = updateState;
            try { pc.onconnectionstatechange = updateState; } catch (e) {}
            updateState();
        }
        function getOrCreateRemoteVideoEl(userId) {
            const container = document.getElementById('internalCallRemoteVideos');
            if (!container) return null;
            const id = 'internalCallRemoteVideo_' + userId;
            let el = document.getElementById(id);
            if (!el) { el = document.createElement('video'); el.id = id; el.className = 'internal-call-remote-video'; el.autoplay = true; el.playsInline = true; container.appendChild(el); }
            return el;
        }
        function removeRemoteVideoEl(userId) {
            const el = document.getElementById('internalCallRemoteVideo_' + userId);
            if (el) { el.srcObject = null; el.remove(); }
        }
        let internalThreadsCache = [];
        async function loadInternalThreads() {
            const list = document.getElementById('internalThreadList');
            if (!list) return;
            list.innerHTML = t('loading');
            const res = await apiFetch('/api/internal/threads');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            internalThreadsCache = data;
            renderInternalThreadList(data);
            updateInternalChatFloatingBtn();
        }
        function renderInternalThreadList(data) {
            const list = document.getElementById('internalThreadList');
            if (!list) return;
            list.classList.remove('empty');
            if (data.length === 0) { list.innerHTML = '<div class="empty internal-chat-empty-state"><span class="empty-icon">\uD83D\uDCAC</span><p>' + (t('start_chat_hint') || (LANG === 'fa' ? 'گفتگویی را انتخاب کنید یا گفتگوی جدید شروع کنید.' : 'Select a conversation or start a new one.')) + '</p></div>'; return; }
            const me = (currentUser && currentUser.id) || '';
            list.innerHTML = data.map(function(t) {
                const participants = t.participants || [];
                const names = participants.map(function(p) { return p.name || p.email || ''; }).join(', ');
                const first = participants[0];
                const initial = (first && (first.name || first.email || '').trim()[0]) ? (first.name || first.email || '').trim()[0].toUpperCase() : '\u003F';
                const avatarUrl = resolveAvatarUrl(first && first.avatar);
                const avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                const last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 45) + ((t.lastMessage.content || '').length > 45 ? '\u2026' : '') : '\u2014';
                const timeStr = t.lastMessageAt ? fmtTZ(t.lastMessageAt, 'time') : '';
                const fromLabel = t.lastMessage && t.lastMessage.fromUser && String(t.lastMessage.fromUser.id) !== String(me) ? (t.lastMessage.fromUser.name || '') + ': ' : '';
                return '<div class="list-item internal-chat-thread-item" data-id="' + escapeHtml(t.id) + '" style="cursor:pointer;"><div class="list-item-avatar internal-chat-thread-avatar">' + avatarHtml + '</div><div class="list-item-body"><span class="name">' + escapeHtml(names || t('chat')) + '</span><div class="meta">' + escapeHtml(fromLabel + last) + '</div></div><span class="internal-chat-thread-time">' + escapeHtml(timeStr) + '</span></div>';
            }).join('');
        }
        function filterInternalThreads(q) {
            q = (q || '').trim().toLowerCase();
            if (!q) { renderInternalThreadList(internalThreadsCache); return; }
            const filtered = internalThreadsCache.filter(function(th) {
                const names = (th.participants || []).map(function(p) { return (p.name || '') + ' ' + (p.email || ''); }).join(' ').toLowerCase();
                const last = (th.lastMessage && th.lastMessage.content) ? th.lastMessage.content.toLowerCase() : '';
                return names.indexOf(q) >= 0 || last.indexOf(q) >= 0;
            });
            renderInternalThreadList(filtered);
        }
        function updateInternalChatFloatingBtn() {
            const btn = document.getElementById('internalChatFloatingBtn');
            const popup = document.getElementById('internalChatPopup');
            const perms = (currentUser && currentUser.permissions) || {};
            const hasAccess = perms.internal_chat !== false;
            if (!btn) return;
            if (!hasAccess) { btn.style.display = 'none'; return; }
            btn.style.display = 'flex';
            const badge = document.getElementById('internalChatFloatingBadge');
            if (badge) { badge.style.display = window.hasNewInternalChat ? 'flex' : 'none'; badge.textContent = window.navBadgeCounts && window.navBadgeCounts['internal-chat'] ? window.navBadgeCounts['internal-chat'] : '1'; }
        }
        function toggleInternalChatFloating() {
            const popup = document.getElementById('internalChatPopup');
            if (popup && popup.style.display !== 'none') { popup.classList.remove('minimized'); popup.style.display = 'flex'; return; }
            if (currentInternalThreadId) {
                const headerEl = document.getElementById('internalChatHeader');
                const name = (headerEl && headerEl.textContent) ? headerEl.textContent.trim() : (LANG === 'fa' ? 'چت' : 'Chat');
                showInternalChatPopup(currentInternalThreadId, name);
            } else { openInternalChatPopupPicker(); }
        }
        function selectThreadInPopup(threadId) {
            const t = (internalThreadsCache || []).find(function(x) { return String(x.id) === String(threadId); });
            const names = (t && (t.participants || []).map(function(p) { return p.name || p.email || ''; }).join(', ')) || (LANG === 'fa' ? 'چت' : 'Chat');
            showInternalChatPopup(threadId, names);
        }
        async function openInternalChatPopupPicker() {
            const popup = document.getElementById('internalChatPopup');
            const titleEl = document.getElementById('internalChatPopupTitle');
            const listEl = document.getElementById('internalChatPopupThreadList');
            const messagesEl = document.getElementById('internalChatPopupMessages');
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            const sendWrap = document.querySelector('.internal-chat-popup-send');
            if (!popup || !listEl) return;
            if (titleEl) titleEl.textContent = LANG === 'fa' ? 'چت داخلی' : 'Internal chat';
            listEl.style.display = 'flex';
            listEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (messagesEl) messagesEl.style.display = 'none';
            if (quickEl) quickEl.style.display = 'none';
            if (sendWrap) sendWrap.style.display = 'none';
            popup.style.display = 'flex';
            const btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.add('internal-chat-floating-btn-open');
            try {
                const res = await apiFetch('/api/internal/threads');
                if (res.needLogin || !res.ok) { listEl.innerHTML = '<div class="empty">' + (t('loading_err') || '') + '</div>'; return; }
                const data = (res.data && res.data.data) || [];
                internalThreadsCache = data;
                const me = (currentUser && currentUser.id) || '';
                const itemsHtml = data.map(function(t) {
                    const participants = t.participants || [];
                    const names = participants.map(function(p) { return p.name || p.email || ''; }).join(', ');
                    const first = participants[0];
                    const initial = (first && (first.name || first.email || '').trim()[0]) ? (first.name || first.email || '').trim()[0].toUpperCase() : '\u003F';
                    const avatarUrl = resolveAvatarUrl(first && first.avatar);
                    const avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                    const last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 35) + ((t.lastMessage.content || '').length > 35 ? '\u2026' : '') : '\u2014';
                    const timeStr = t.lastMessageAt ? fmtTZ(t.lastMessageAt, 'time') : '';
                    return '<button type="button" class="internal-chat-popup-thread-item" data-id="' + escapeHtml(t.id) + '"><span class="internal-chat-popup-thread-avatar">' + avatarHtml + '</span><div class="internal-chat-popup-thread-body"><span class="internal-chat-popup-thread-name">' + escapeHtml(names || t('chat')) + '</span><div class="internal-chat-popup-thread-meta">' + escapeHtml(last) + '</div></div><span class="internal-chat-popup-thread-time">' + escapeHtml(timeStr) + '</span></button>';
                }).join('');
                const newBtn = '<button type="button" class="internal-chat-popup-new-btn">' + (LANG === 'fa' ? '\u2795 گفتگوی جدید' : '+ New conversation') + '</button>';
                listEl.innerHTML = (data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">\uD83D\uDCAC</span><p>' + (t('start_chat_hint') || '') + '</p></div>' : '') + itemsHtml + newBtn;
            } catch (e) {
                listEl.innerHTML = '<div class="empty">' + (t('loading_err') || '') + '</div>';
            }
        }
        async function loadInternalUsers() {
            const res = await apiFetch('/api/internal/users');
            if (res.needLogin || !res.ok) return;
            const sel = document.getElementById('internalNewChatUser');
            const data = (res.data && res.data.data) || [];
            sel.innerHTML = '<option value="">' + t('select_user') + '</option>' + data.map(function(u) { return '<option value="' + u.id + '">' + escapeHtml(u.name) + '</option>'; }).join('');
        }
        function showNewChatForm() { document.getElementById('internalNewChatForm').style.display = 'block'; loadInternalUsers(); }
        function hideNewChatForm() { document.getElementById('internalNewChatForm').style.display = 'none'; }
        function showInternalCallModal(statusText, showAccept) {
            const modal = document.getElementById('internalCallModal');
            const statusEl = document.getElementById('internalCallStatus');
            const connEl = document.getElementById('internalCallConnectionStatus');
            const acceptBtn = document.getElementById('internalCallAcceptBtn');
            const rejectBtn = document.getElementById('internalCallRejectBtn');
            const endBtn = document.getElementById('internalCallEndBtn');
            const addBtn = document.getElementById('internalCallAddBtn');
            const micBtn = document.getElementById('internalCallMicBtn');
            const cameraBtn = document.getElementById('internalCallCameraBtn');
            const localV = document.getElementById('internalCallLocalVideo');
            const container = document.getElementById('internalCallRemoteVideos');
            const videosWrap = document.getElementById('internalCallVideos');
            const voicePlaceholder = document.getElementById('internalCallVoicePlaceholder');
            const voiceAvatar = document.getElementById('internalCallVoiceAvatar');
            const voiceName = document.getElementById('internalCallVoiceName');
            const isVoice = internalCallType === 'voice';
            if (statusEl) statusEl.textContent = statusText || '';
            if (voicePlaceholder) voicePlaceholder.style.display = isVoice ? 'flex' : 'none';
            if (videosWrap) videosWrap.style.display = isVoice ? 'none' : 'block';
            if (isVoice) {
                const d = getInternalCallOtherDisplay();
                if (voiceAvatar) voiceAvatar.textContent = d.initial;
                if (voiceName) voiceName.textContent = d.name;
            }
            const isInCall = (statusText === t('in_call') || statusText === 'In call') && !showAccept;
            if (isInCall) startInternalCallDurationTimer();
            else stopInternalCallDurationTimer();
            if (connEl) { connEl.style.display = 'none'; connEl.textContent = ''; connEl.className = 'internal-call-connection-status'; }
            if (acceptBtn) acceptBtn.style.display = showAccept ? 'flex' : 'none';
            /* فقط یکی از دو دکمه قرمز: هنگام برقراری/در انتظار = «لغو»، بعد از اتصال = «قطع تماس» */
            if (rejectBtn) {
                rejectBtn.style.display = isInCall ? 'none' : 'flex';
                rejectBtn.textContent = showAccept ? t('reject_call') : (t('cancel_call') || t('reject_call'));
                rejectBtn.setAttribute('data-i18n', showAccept ? 'reject_call' : 'cancel_call');
            }
            if (endBtn) endBtn.style.display = isInCall ? 'flex' : 'none';
            if (addBtn) addBtn.style.display = 'none';
            if (micBtn) { micBtn.style.display = showAccept ? 'none' : 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); micBtn.title = internalCallMicMuted ? (t('call_unmute') || 'وصل میکروفون') : (t('call_mute') || 'قطع میکروفون'); }
            if (cameraBtn) { cameraBtn.style.display = (showAccept || internalCallType !== 'video') ? 'none' : 'flex'; cameraBtn.classList.toggle('off', internalCallCameraOff); cameraBtn.title = internalCallCameraOff ? (t('call_camera_on') || 'روشن کردن دوربین') : (t('call_camera_off') || 'خاموش کردن دوربین'); }
            if (localV) { localV.srcObject = null; localV.style.display = 'none'; }
            if (container) container.innerHTML = '';
            if (modal) modal.style.display = 'flex';
        }
        function hideInternalCallModal() {
            stopCallRingtone();
            stopInternalCallDurationTimer();
            const modal = document.getElementById('internalCallModal');
            if (modal) modal.style.display = 'none';
            if (internalCallLocalStream) { internalCallLocalStream.getTracks().forEach(function(t){ t.stop(); }); internalCallLocalStream = null; }
            const localV = document.getElementById('internalCallLocalVideo');
            if (localV) localV.srcObject = null;
            Object.keys(internalCallPeers).forEach(function(uid) { const pc = internalCallPeers[uid]; if (pc) pc.close(); });
            internalCallPeers = {};
            internalCallIceQueue = {};
            const container = document.getElementById('internalCallRemoteVideos');
            if (container) container.innerHTML = '';
            internalCallPendingOffer = null;
            internalCallPendingInvite = null;
            internalCallIsIncoming = false;
            internalCallMicMuted = false;
            internalCallCameraOff = false;
            updateInternalCallConnectionStatus('', '');
        }
        function toggleInternalCallMic() {
            if (!internalCallLocalStream) return;
            const audioTracks = internalCallLocalStream.getAudioTracks();
            const currentlyEnabled = audioTracks.length > 0 && audioTracks[0].enabled;
            internalCallMicMuted = currentlyEnabled;
            if (audioTracks.length) audioTracks[0].enabled = !currentlyEnabled;
            const micBtn = document.getElementById('internalCallMicBtn');
            if (micBtn) { micBtn.classList.toggle('muted', internalCallMicMuted); micBtn.title = internalCallMicMuted ? (t('call_unmute') || 'وصل میکروفون') : (t('call_mute') || 'قطع میکروفون'); }
        }
        function toggleInternalCallCamera() {
            if (!internalCallLocalStream) return;
            const videoTracks = internalCallLocalStream.getVideoTracks();
            if (videoTracks.length) {
                internalCallCameraOff = videoTracks[0].enabled;
                videoTracks[0].enabled = !internalCallCameraOff;
            } else internalCallCameraOff = true;
            const localV = document.getElementById('internalCallLocalVideo');
            if (localV) localV.style.display = internalCallCameraOff ? 'none' : 'block';
            const cameraBtn = document.getElementById('internalCallCameraBtn');
            if (cameraBtn) { cameraBtn.classList.toggle('off', internalCallCameraOff); cameraBtn.title = internalCallCameraOff ? (t('call_camera_on') || 'روشن کردن دوربین') : (t('call_camera_off') || 'خاموش کردن دوربین'); }
        }
        async function startInternalCall(type) {
            if (!currentInternalThreadId || !currentInternalThreadOtherUserId) { toast(t('select_conversation_first'), true); return; }
            const s = getSocket();
            if (!s || !s.connected) { toast(t('user_offline') || 'کاربر آفلاین است', true); return; }
            try {
                internalCallType = type;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                const pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                const toId = currentInternalThreadOtherUserId;
                internalCallPeers[toId] = pc;
                attachPeerConnectionStateHandlers(pc, toId);
                internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                pc.onicecandidate = function(e) { if (e.candidate && s) s.emit('call_ice', { toUserId: toId, threadId: currentInternalThreadId, candidate: e.candidate }); };
                pc.ontrack = function(e) { const rv = getOrCreateRemoteVideoEl(toId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                s.emit('call_offer', { toUserId: toId, threadId: currentInternalThreadId, type: type, sdp: offer });
                showInternalCallModal(type === 'video' ? t('calling_video') : t('calling_voice'), false);
                const localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                const addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                const micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                const cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
            } catch (e) { toast((e.name || 'Error') + ': ' + (e.message || ''), true); hideInternalCallModal(); }
        }
        async function acceptInternalCall() {
            if (!internalCallPendingOffer) return;
            const toUserId = internalCallPendingOffer.fromUserId;
            const threadId = internalCallPendingOffer.threadId;
            const s = getSocket();
            if (!s || !s.connected) return;
            try {
                const type = internalCallPendingOffer.type || 'voice';
                internalCallType = type;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                const pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                internalCallPeers[toUserId] = pc;
                attachPeerConnectionStateHandlers(pc, toUserId);
                internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                pc.onicecandidate = function(e) { if (e.candidate && s) s.emit('call_ice', { toUserId: toUserId, threadId: threadId, candidate: e.candidate }); };
                pc.ontrack = function(e) { const rv = getOrCreateRemoteVideoEl(toUserId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                await pc.setRemoteDescription(new RTCSessionDescription(internalCallPendingOffer.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                s.emit('call_answer', { toUserId: toUserId, threadId: threadId, sdp: answer });
                currentInternalThreadId = threadId;
                currentInternalThreadOtherUserId = toUserId;
                showInternalCallModal(t('in_call'), false);
                const localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                const addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                const micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                const cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
                internalCallPendingOffer = null;
                internalCallIsIncoming = false;
                playCallConnected();
            } catch (e) { toast((e.name || 'Error') + ': ' + (e.message || ''), true); rejectInternalCall(); }
        }
        function rejectInternalCall() {
            const s = getSocket();
            const toUserId = internalCallPendingOffer ? internalCallPendingOffer.fromUserId : currentInternalThreadOtherUserId;
            const threadId = internalCallPendingOffer ? internalCallPendingOffer.threadId : currentInternalThreadId;
            if (s && s.connected && toUserId && threadId) s.emit('call_reject', { toUserId: toUserId, threadId: threadId });
            hideInternalCallModal();
        }
        function endInternalCall() {
            const s = getSocket();
            if (s && s.connected && currentInternalThreadId) s.emit('call_end', { threadId: currentInternalThreadId });
            hideInternalCallModal();
        }
        async function handleCallOfferAsJoiner(data) {
            const fromUserId = data.fromUserId;
            const threadId = data.threadId;
            const s = getSocket();
            if (!s || threadId !== currentInternalThreadId || internalCallPeers[fromUserId]) return;
            try {
                const pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                internalCallPeers[fromUserId] = pc;
                attachPeerConnectionStateHandlers(pc, fromUserId);
                internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                pc.onicecandidate = function(e) { if (e.candidate && s) s.emit('call_ice', { toUserId: fromUserId, threadId: threadId, candidate: e.candidate }); };
                pc.ontrack = function(e) { const rv = getOrCreateRemoteVideoEl(fromUserId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                s.emit('call_answer', { toUserId: fromUserId, threadId: threadId, sdp: answer });
            } catch (err) { console.warn('handleCallOfferAsJoiner:', err); }
        }
        async function acceptInternalCallInvite() {
            if (!internalCallPendingInvite) return;
            const threadId = internalCallPendingInvite.threadId;
            const type = internalCallPendingInvite.type || 'voice';
            const s = getSocket();
            if (!s || !s.connected) return;
            try {
                document.getElementById('internalCallInviteModal').style.display = 'none';
                currentInternalThreadId = threadId;
                currentInternalThreadOtherUserId = internalCallPendingInvite.fromUserId;
                internalCallType = type;
                internalCallIsJoining = true;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                s.emit('call_invite_accept', { threadId: threadId, type: type });
                showInternalCallModal(t('in_call'), false);
                const localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                const addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                const micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                const cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
                internalCallPendingInvite = null;
                playCallConnected();
                setTimeout(function() { internalCallIsJoining = false; }, 5000);
            } catch (e) { toast((e.name || 'Error') + ': ' + (e.message || ''), true); rejectInternalCallInvite(); }
        }
        function rejectInternalCallInvite() {
            stopCallRingtone();
            const s = getSocket();
            if (internalCallPendingInvite && s && s.connected) s.emit('call_invite_reject', { fromUserId: internalCallPendingInvite.fromUserId, threadId: internalCallPendingInvite.threadId });
            internalCallPendingInvite = null;
            const mod = document.getElementById('internalCallInviteModal');
            if (mod) mod.style.display = 'none';
        }
        let addToCallParticipantsCache = [];
        function renderAddToCallList(participants) {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            addToCallParticipantsCache = participants || addToCallParticipantsCache;
            const search = (document.getElementById('addToCallSearch') && document.getElementById('addToCallSearch').value) || '';
            const q = search.trim().toLowerCase();
            const filtered = q ? addToCallParticipantsCache.filter(function(p) {
                const name = (p.name || p.email || '').toLowerCase();
                return name.indexOf(q) >= 0;
            }) : addToCallParticipantsCache;
            list.innerHTML = filtered.map(function(p) {
                const name = p.name || p.email || p.id;
                const initial = (name && name.toString().trim()[0]) ? name.toString().trim()[0].toUpperCase() : '?';
                return '<label class="add-to-call-item" data-user-id="' + escapeHtml(p.id) + '"><input type="checkbox" class="add-to-call-check" data-user-id="' + escapeHtml(p.id) + '"><span class="add-to-call-avatar">' + escapeHtml(initial) + '</span><span class="add-to-call-name">' + escapeHtml(name) + '</span></label>';
            }).join('');
            const selAll = document.getElementById('addToCallSelectAll');
            if (selAll) selAll.checked = false;
        }
        function filterAddToCallList() {
            renderAddToCallList(addToCallParticipantsCache);
        }
        function toggleAddToCallSelectAll(checked) {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            list.querySelectorAll('.add-to-call-check').forEach(function(cb) {
                if (cb.closest('.add-to-call-item').style.display !== 'none') cb.checked = !!checked;
            });
        }
        function showAddToCallModal() {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            const inCallIds = Object.keys(internalCallPeers);
            const participants = currentInternalThreadParticipants.filter(function(p) {
                const id = String(p.id);
                return id !== String(currentUser && currentUser.id) && inCallIds.indexOf(id) < 0;
            });
            if (participants.length === 0) { toast(LANG === 'fa' ? 'همه در تماس هستند' : 'Everyone is already in the call', true); return; }
            const searchEl = document.getElementById('addToCallSearch');
            if (searchEl) searchEl.value = '';
            const selAll = document.getElementById('addToCallSelectAll');
            if (selAll) selAll.checked = false;
            renderAddToCallList(participants);
            document.getElementById('addToCallModal').style.display = 'flex';
        }
        function closeAddToCallModal() {
            const mod = document.getElementById('addToCallModal');
            if (mod) mod.style.display = 'none';
        }
        function inviteSelectedToCall() {
            const list = document.getElementById('addToCallList');
            if (!list) return;
            const checked = list.querySelectorAll('.add-to-call-check:checked');
            const ids = Array.from(checked).map(function(cb) { return cb.getAttribute('data-user-id'); }).filter(Boolean);
            if (ids.length === 0) { toast(LANG === 'fa' ? 'حداقل یک نفر را انتخاب کنید' : 'Select at least one person', true); return; }
            const s = getSocket();
            if (!s || !s.connected || !currentInternalThreadId) { toast(t('user_offline') || (LANG === 'fa' ? 'اتصال برقرار نیست' : 'Not connected'), true); return; }
            ids.forEach(function(userId) {
                s.emit('call_invite', { toUserId: userId, threadId: currentInternalThreadId });
            });
            closeAddToCallModal();
            toast(ids.length === 1 ? (LANG === 'fa' ? 'دعوت ارسال شد' : 'Invite sent') : (LANG === 'fa' ? 'دعوت به ' + ids.length + ' نفر ارسال شد' : 'Invite sent to ' + ids.length + ' people'));
        }
        function inviteToCall(userId) {
            const s = getSocket();
            if (!s || !s.connected || !currentInternalThreadId) return;
            s.emit('call_invite', { toUserId: userId, threadId: currentInternalThreadId });
            toast((LANG === 'fa' ? 'دعوت ارسال شد' : 'Invite sent'));
        }
        async function startInternalChat() {
            const sel = document.getElementById('internalNewChatUser');
            const opts = sel ? Array.from(sel.selectedOptions || []) : [];
            const userIds = opts.map(function(o) { return o.value; }).filter(function(v) { return v; });
            if (!userIds.length) { toast(t('select_user_first'), true); return; }
            const res = await apiFetch('/api/internal/threads', { method: 'POST', body: JSON.stringify({ userIds: userIds }) });
            if (res.needLogin) return;
            if (res.ok) { hideNewChatForm(); openInternalThread(res.data.id); loadInternalThreads(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function backToInternalChatList() {
            const wrap = document.getElementById('internalChatLayoutWrap');
            const pane = document.getElementById('internalChatPane');
            if (wrap) { wrap.classList.remove('internal-chat-mobile-chat-open', 'internal-chat-has-chat'); }
            if (pane) pane.style.display = 'none';
        }
        function isInternalChatMobile() { return window.matchMedia('(max-width: 900px)').matches; }
        async function openInternalThread(threadId) {
            currentInternalThreadId = threadId;
            currentInternalThreadOtherUserId = null;
            const pane = document.getElementById('internalChatPane');
            const wrap = document.getElementById('internalChatLayoutWrap');
            pane.style.display = 'flex';
            if (wrap) { wrap.classList.add('internal-chat-has-chat'); if (isInternalChatMobile()) wrap.classList.add('internal-chat-mobile-chat-open'); }
            const partRes = await apiFetch('/api/internal/threads');
            if (partRes.ok && partRes.data && partRes.data.data) {
                const t = partRes.data.data.find(function(x) { return x.id === threadId; });
                const headerEl = document.getElementById('internalChatHeader');
                if (headerEl) headerEl.textContent = t && t.participants ? t.participants.map(function(p) { return p.name; }).join(', ') : t('chat');
                const others = t && t.participants ? t.participants.filter(function(p) { return String(p.id) !== String(currentUser && currentUser.id); }) : [];
                currentInternalThreadOtherUserId = others.length ? others[0].id : null;
                currentInternalThreadParticipants = t && t.participants ? t.participants : [];
                const headerAvatarEl = document.getElementById('internalChatHeaderAvatar');
                if (headerAvatarEl) {
                    const other = others[0];
                    const initial = (other && (other.name || other.email || '').trim()[0]) ? (other.name || other.email || '').trim()[0].toUpperCase() : '\u003F';
                    const pic = resolveAvatarUrl(other && other.avatar);
                    if (pic) headerAvatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">';
                    else { headerAvatarEl.innerHTML = ''; headerAvatarEl.textContent = initial; }
                }
                const callBtns = document.getElementById('internalChatCallBtns');
                if (callBtns) callBtns.style.display = currentInternalThreadOtherUserId ? 'flex' : 'none';
            }
            loadInternalMessages(threadId);
        }
        function insertInternalChatQuickReply(text) {
            const inp = document.getElementById('internalChatInput');
            if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; inp.focus(); }
        }
        async function loadInternalMessages(threadId) {
            const list = document.getElementById('internalChatMessages');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/internal/threads/' + threadId + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            const me = (currentUser && currentUser.id) || '';
            const quickEl = document.getElementById('internalChatQuickReplies');
            if (quickEl) {
                if (data.length === 0) {
                    quickEl.style.display = 'flex';
                    const chips = [{ key: 'quick_reply_hi', text: LANG === 'fa' ? 'سلام' : 'Hi' }, { key: 'quick_reply_gotit', text: LANG === 'fa' ? 'متوجه شدم' : 'Got it' }, { key: 'quick_reply_later', text: LANG === 'fa' ? 'بعداً پاسخ می‌دهم' : 'Will reply later' }, { key: 'quick_reply_checking', text: LANG === 'fa' ? 'در حال بررسی' : 'Checking' }];
                    quickEl.innerHTML = chips.map(function(c) { return '<button type="button" class="internal-quick-reply-chip" data-reply="' + String(c.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">' + t(c.key) + '</button>'; }).join('');
                    quickEl.querySelectorAll('.internal-quick-reply-chip').forEach(function(btn) { btn.onclick = function() { insertInternalChatQuickReply(this.getAttribute('data-reply') || ''); }; });
                } else { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            }
            list.innerHTML = data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">💬</span><p>' + t('start_chat_hint') + '</p></div>' : data.map(function(m) {
                const isOut = m.fromUserId === me;
                const att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
                const avatarHtml = internalMsgAvatarHtml(m.fromUser);
                const timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + linkifyMessageContent(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
        function appendTicketReply(r) {
            const list = document.getElementById('ticketReplies');
            if (!list || !currentTicketId) return;
            const noReply = list.querySelector('.text-muted');
            if (noReply) noReply.remove();
            const isOut = String(r.userId) === String(currentUser && currentUser.id);
            const att = (r.attachments && r.attachments.length) ? r.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent); margin-left:8px;">📎 ' + escapeHtml(a.name || t('file')) + '</a>'; }).join('') : '';
            const html = '<div class="msg ' + (isOut ? 'out' : 'in') + '" style="margin:8px 0;"><div>' + linkifyMessageContent(r.content || '') + '</div>' + att + '<div class="time">' + userDisplay(r.user) + ' · ' + (r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '') + '</div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessage() {
            if (!currentInternalThreadId) { toast(t('select_conversation_first'), true); return; }
            const content = (document.getElementById('internalChatInput') && document.getElementById('internalChatInput').value) || '';
            const fileInput = document.getElementById('internalChatFile');
            const allowDownload = !(document.getElementById('internalChatAllowDownload') && !document.getElementById('internalChatAllowDownload').checked);
            const attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                const up = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                const upData = await up.json();
                if (upData.url) attachments.push({ url: upData.url, name: upData.name || t('file'), size: upData.size, allowDownload: allowDownload });
            }
            if (!content.trim() && attachments.length === 0) { toast(t('enter_text_or_file'), true); return; }
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content.trim() || '(پیوست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('internalChatInput').value = '';
                if (fileInput) { fileInput.value = ''; toggleInternalFileOption(); }
                const msg = res.data;
                if (msg) { msg.fromUserId = msg.fromUserId || (msg.fromUser && msg.fromUser.id); appendInternalMessage(msg); }
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showInternalChatPopup(threadId, fromName) {
            currentInternalThreadId = threadId;
            const popup = document.getElementById('internalChatPopup');
            const titleEl = document.getElementById('internalChatPopupTitle');
            const listEl = document.getElementById('internalChatPopupThreadList');
            const messagesEl = document.getElementById('internalChatPopupMessages');
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            const sendWrap = document.querySelector('.internal-chat-popup-send');
            if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'پیام از ' : 'Message from ') + (fromName || '');
            if (listEl) listEl.style.display = 'none';
            if (messagesEl) messagesEl.style.display = 'flex';
            if (sendWrap) sendWrap.style.display = 'flex';
            if (popup) popup.style.display = 'flex';
            const btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.add('internal-chat-floating-btn-open');
            loadInternalMessagesForPopup(threadId);
        }
        function closeInternalChatPopup() {
            const popup = document.getElementById('internalChatPopup');
            if (popup) { popup.style.display = 'none'; popup.classList.remove('minimized'); }
            const btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.remove('internal-chat-floating-btn-open');
            currentInternalThreadId = null;
        }
        function toggleInternalChatPopupMinimize() {
            const popup = document.getElementById('internalChatPopup');
            if (!popup) return;
            popup.classList.toggle('minimized');
            const btn = popup.querySelector('.internal-chat-popup-minimize');
            if (btn) {
                btn.title = popup.classList.contains('minimized') ? (LANG === 'fa' ? 'باز کردن' : 'Expand') : (LANG === 'fa' ? 'کوچک‌سازی' : 'Minimize');
                const svg = btn.querySelector('svg');
                if (svg) svg.innerHTML = popup.classList.contains('minimized') ? '<path d="M19 12H5M12 19l-7-7 7-7"/>' : '<path d="M5 12h14"/>';
            }
        }
        function handlePopupChatKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInternalMessageFromPopup(); }
        }
        function insertPopupQuickReply(text) {
            const inp = document.getElementById('internalChatPopupInput');
            if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; inp.focus(); }
        }
        function openInternalChatFromPopup() {
            const tid = currentInternalThreadId;
            closeInternalChatPopup();
            showPage('internal-chat');
            setTimeout(function() { openInternalThread(tid); loadInternalThreads(); loadInternalUsers(); }, 100);
        }
        function appendInternalMessageToPopup(m) {
            const list = document.getElementById('internalChatPopupMessages');
            if (!list || !currentInternalThreadId) return;
            const emptyEl = list.querySelector('.empty');
            if (emptyEl) emptyEl.remove();
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            if (quickEl) { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            const me = (currentUser && currentUser.id) || '';
            const isOut = m.fromUserId === me;
            const att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
            const avatarHtml = internalMsgAvatarHtml(m.fromUser);
            const timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
            const html = '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + linkifyMessageContent(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        async function loadInternalMessagesForPopup(threadId) {
            const list = document.getElementById('internalChatPopupMessages');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            const res = await apiFetch('/api/internal/threads/' + threadId + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            const data = (res.data && res.data.data) || [];
            const me = (currentUser && currentUser.id) || '';
            const quickEl = document.getElementById('internalChatPopupQuickReplies');
            if (quickEl) {
                if (data.length === 0) {
                    quickEl.style.display = 'flex';
                    const chips = [{ key: 'quick_reply_hi', text: LANG === 'fa' ? 'سلام' : 'Hi' }, { key: 'quick_reply_gotit', text: LANG === 'fa' ? 'متوجه شدم' : 'Got it' }, { key: 'quick_reply_later', text: LANG === 'fa' ? 'بعداً پاسخ می‌دهم' : 'Will reply later' }, { key: 'quick_reply_checking', text: LANG === 'fa' ? 'در حال بررسی' : 'Checking' }];
                    quickEl.innerHTML = chips.map(function(c) { const s = String(c.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return '<button type="button" class="internal-quick-reply-chip" data-reply="' + s + '">' + t(c.key) + '</button>'; }).join('');
                    quickEl.querySelectorAll('.internal-quick-reply-chip').forEach(function(btn) { btn.onclick = function() { insertPopupQuickReply(this.getAttribute('data-reply') || ''); }; });
                } else { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            }
            list.innerHTML = data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">💬</span><p>' + t('start_chat_hint') + '</p></div>' : data.map(function(m) {
                const isOut = m.fromUserId === me;
                const att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
                const avatarHtml = internalMsgAvatarHtml(m.fromUser);
                const timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + linkifyMessageContent(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessageFromPopup() {
            if (!currentInternalThreadId) return;
            const inp = document.getElementById('internalChatPopupInput');
            const fileInput = document.getElementById('internalChatPopupFile');
            const content = (inp && inp.value) ? inp.value.trim() : '';
            const attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                const up = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                const upData = await up.json();
                if (upData.url) attachments.push({ url: upData.url, name: upData.name || t('file'), size: upData.size, allowDownload: true });
            }
            if (!content && attachments.length === 0) { toast(t('enter_text_or_file'), true); return; }
            const res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content || '(پیوست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) {
                if (inp) inp.value = '';
                if (fileInput) fileInput.value = '';
                const fileLabel = document.getElementById('internalChatPopupFileLabel');
                if (fileLabel) { fileLabel.textContent = ''; fileLabel.style.display = 'none'; }
                const msg = res.data;
                if (msg) { msg.fromUserId = msg.fromUserId || (msg.fromUser && msg.fromUser.id); appendInternalMessageToPopup(msg); }
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var qrRefreshInterval = null;
        let qrRetryTimeout = null;
        let isWhatsappPolling = false;
        const WHATSAPP_POLL_MS = 4000;
        const WHATSAPP_QR_RETRY_MS = 1800;
        let _whatsappStatusSeq = 0;
        let _whatsappActiveTab = 'channels';
        let _whatsappRefreshBusyUntil = 0;

        function initWhatsappProTabs() {
            var nav = document.querySelector('.whatsapp-pro-nav');
            if (!nav || nav._waProBound) return;
            nav._waProBound = true;
            nav.addEventListener('click', function (e) {
                var tab = e.target.closest('.whatsapp-pro-tab');
                if (!tab) return;
                e.preventDefault();
                switchWhatsappMainTab(tab.getAttribute('data-wa-tab') || 'channels');
            });
        }
        function switchWhatsappMainTab(name, silent) {
            name = (name === 'automation' || name === 'routing') ? name : 'channels';
            _whatsappActiveTab = name;
            document.querySelectorAll('.whatsapp-pro-tab').forEach(function (b) {
                var on = (b.getAttribute('data-wa-tab') || '') === name;
                b.classList.toggle('active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            var map = { channels: 'whatsappPanelChannels', automation: 'whatsappPanelAutomation', routing: 'whatsappPanelRouting' };
            Object.keys(map).forEach(function (key) {
                var el = document.getElementById(map[key]);
                if (!el) return;
                var act = key === name;
                el.classList.toggle('whatsapp-pro-panel--active', act);
                el.setAttribute('aria-hidden', act ? 'false' : 'true');
            });
            if (name === 'routing') {
                loadWhatsappDeptRouting();
                loadWhatsappUnassigned();
            }
            if (!silent) {
                try {
                    var h = (location.hash || '').replace(/^#/, '');
                    if (h.indexOf('whatsapp') === 0) location.hash = 'whatsapp';
                } catch (_) {}
            }
        }
        function waBtnLoading(btn, on) {
            if (!btn) return;
            btn.disabled = !!on;
            btn.classList.toggle('is-loading', !!on);
        }
        function refreshWhatsappStatusDebounced() {
            var now = Date.now();
            if (now < _whatsappRefreshBusyUntil) {
                toast(LANG === 'fa' ? 'چند ثانیه صبر کنید و دوباره تلاش کنید.' : 'Please wait a few seconds before refreshing again.', true);
                return;
            }
            _whatsappRefreshBusyUntil = now + 2200;
            var b = document.getElementById('btnRefreshStatus');
            if (b) { b.classList.add('is-refreshing'); b.setAttribute('aria-busy', 'true'); }
            loadWhatsappStatus(true).finally(function () {
                setTimeout(function () {
                    _whatsappRefreshBusyUntil = Math.max(_whatsappRefreshBusyUntil, Date.now() + 400);
                    if (b) { b.classList.remove('is-refreshing'); b.removeAttribute('aria-busy'); }
                }, 300);
            });
        }

        function setWhatsappStatusBadge(status) {
            const badge = document.getElementById('whatsappStatusBadge');
            if (badge) {
                badge.className = 'whatsapp-status-badge whatsapp-status-' + status;
                if (status === 'connected') badge.textContent = LANG === 'fa' ? 'متصل' : 'Connected';
                else if (status === 'starting') badge.textContent = LANG === 'fa' ? 'در حال اتصال...' : 'Connecting...';
                else if (status === 'checking') badge.textContent = LANG === 'fa' ? 'در حال بررسی...' : 'Checking...';
                else badge.textContent = LANG === 'fa' ? 'قطع' : 'Disconnected';
            }
            const headerStatus = document.getElementById('headerWhatsappStatus');
            if (headerStatus) headerStatus.classList.toggle('connected', status === 'connected');
        }
        async function fetchWhatsappHeaderStatus() {
            const perms = (currentUser && currentUser.permissions) || {};
            if (!token || perms.whatsapp === false) return;
            try {
                const res = await apiFetch('/api/gateway/status');
                if (res.ok && res.data && res.data.whatsapp) setWhatsappStatusBadge('connected');
                else setWhatsappStatusBadge('disconnected');
            } catch (_) { setWhatsappStatusBadge('disconnected'); }
        }

        async function loadWhatsappStatus(isInitial) {
            const mySeq = ++_whatsappStatusSeq;
            function waAlive() { return mySeq === _whatsappStatusSeq; }
            const perms = (currentUser && currentUser.permissions) || {};
            if (!token || perms.whatsapp === false) return;
            const st = document.getElementById('gatewayStatus');
            const qrBox = document.getElementById('qrBox');
            const qrUnavailable = document.getElementById('whatsappQrUnavailable');
            const qrWaitingMsg = document.getElementById('qrWaitingMsg');
            const qrImg = document.getElementById('qrImg');
            const btn = document.getElementById('btnStartGateway');
            const btnStartClient = document.getElementById('btnStartWhatsApp');
            const btnDisconnect = document.getElementById('btnDisconnectWhatsApp');
            const lastCard = document.getElementById('whatsappLastConnectionCard');
            if (!st || !qrBox || !qrImg) return;
            if (qrRetryTimeout) { clearTimeout(qrRetryTimeout); qrRetryTimeout = null; }
            if (qrRefreshInterval) { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            if (isInitial !== false) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_checking');
                setWhatsappStatusBadge('checking');
                if (btn) btn.style.display = 'none';
                if (btnStartClient) btnStartClient.style.display = 'none';
                if (btnDisconnect) btnDisconnect.disabled = true;
                qrBox.style.display = 'none';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                const af = document.getElementById('whatsappAuthFailure');
                if (af) { af.style.display = 'none'; af.textContent = ''; }
            }
            let ping;
            try { ping = await apiFetch('/api/ping', { auth: false }); } catch (e) { ping = { needLogin: true }; }
            if (!waAlive()) return;
            if (ping.needLogin || (ping.data && !ping.data.ok)) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_server_err');
                setWhatsappStatusBadge('disconnected');
                return;
            }
            const res = await apiFetch('/api/gateway/status');
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
            const btn = document.getElementById('waAttachTemplateBtn') || document.getElementById('msgTemplateBtn');
            if (!dd) return;
            if (dd.style.display === 'block') {
                dd.style.display = 'none';
                if (btn) btn.setAttribute('aria-expanded', 'false');
                return;
            }
            dd.innerHTML = '<div class="chat-template-dropdown-loading">' + (LANG === 'fa' ? 'در حال بارگذاری...' : 'Loading...') + '</div>';
            dd.style.display = 'block';
            if (btn) btn.setAttribute('aria-expanded', 'true');
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
                var menuBtn = document.getElementById('waAttachMenuBtn');
                var insideTplAnchor = btn && (e.target === btn || btn.contains(e.target));
                var insideAttachTrigger = menuBtn && (e.target === menuBtn || menuBtn.contains(e.target));
                if (!dd.contains(e.target) && !insideTplAnchor && !insideAttachTrigger) {
                    dd.style.display = 'none';
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                    document.removeEventListener('click', closeTemplateDd);
                }
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
                d.users.forEach(function(u) { const bn = (u.branch && u.branch.name) ? u.branch.name : ''; html += '<div class="sup-user-card" data-user-id="' + escapeHtml(u.id) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" title="' + (LANG === 'fa' ? 'جزئیات فعالیت' : 'Activity detail') + '"><div class="sup-user-name">' + escapeHtml(u.name || u.email || '') + '</div><div class="sup-user-meta">' + (u.branch && u.branch.name ? escapeHtml(u.branch.name) : '\u2014') + '</div><div class="sup-user-count">' + (u.outgoingMessageCount || 0) + '</div>' + (function() { const u2 = u; const extras = []; if (u2.avgResponseTimeMinutes != null) extras.push((LANG === 'fa' ? 'زمان پاسخ: ' : 'Response: ') + u2.avgResponseTimeMinutes + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min')); if (u2.avgRating != null) extras.push((LANG === 'fa' ? 'رضایت: ' : 'Rating: ') + u2.avgRating + ' ★'); return extras.length ? '<div class="sup-user-extra">' + extras.join(' · ') + '</div>' : ''; })() + '</div>'; });
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

        async function loadStaffActivity(opts) {
            const refreshAttendance = !!(opts && opts.refreshAttendance);
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
                        const lastLogin = u.lastLoginAt ? fmtTZ(u.lastLoginAt, 'datetime') : '\u2014';
                        const branchName = (u.branch && u.branch.name) ? u.branch.name : '\u2014';
                        const ip = u.lastLoginIp || '\u2014'; const country = u.lastLoginCountry || '\u2014';
                        const lbl = [t('label_name'),t('th_email'),t('th_branch'),t('th_status'),t('th_last_login'),t('th_ip'),t('th_country')]; return '<tr class="staff-row" data-user-id="' + escapeHtml(u.id || '') + '" onclick="var uid=this.getAttribute(\'data-user-id\');if(uid&&event.target.tagName!==\'A\')openStaffDetailModal(uid)" style="cursor:pointer"><td data-label="'+lbl[0]+'">' + escapeHtml(userDisplay(u)) + '</td><td data-label="'+lbl[1]+'">' + escapeHtml(u.email || '\u2014') + '</td><td data-label="'+lbl[2]+'">' + escapeHtml(branchName) + '</td><td data-label="'+lbl[3]+'"><span class="status-dot ' + statusClass + '"></span>' + statusLabel + '</td><td data-label="'+lbl[4]+'">' + lastLogin + '</td><td data-label="'+lbl[5]+'" dir="ltr">' + escapeHtml(ip) + '</td><td data-label="'+lbl[6]+'">' + escapeHtml(country) + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else {
                const onlineErr = (onlineRes.data && onlineRes.data.error) ? String(onlineRes.data.error) : t('loading_err');
                if (onlineList) onlineList.innerHTML = '<div class="empty">' + escapeHtml(onlineErr) + '</div>';
                if (countEl) countEl.textContent = '0';
            }
            const loginsRes = await apiFetch('/api/supervision/logins?limit=50');
            if (loginsRes.needLogin) return;
            if (loginsRes.ok && loginsRes.data && loginsRes.data.data) {
                const rows = loginsRes.data.data;
                const todayStr = fmtTZ(new Date(), 'date');
                function isToday(d) { try { return d && fmtTZ(d, 'date') === todayStr; } catch(e) { return false; } }
                const loginsToday = rows.filter(function(r) { return isToday(r.createdAt); }).length;
                if (loginsTodayEl) loginsTodayEl.textContent = loginsToday;
                const totalLogins = (typeof loginsRes.data.total === 'number') ? loginsRes.data.total : rows.length;
                if (loginsTotalEl) loginsTotalEl.textContent = totalLogins;
                if (loginsList) {
                    if (rows.length === 0) loginsList.innerHTML = '<div class="empty">' + t('empty_no_logins') + '</div>';
                    else loginsList.innerHTML = '<table class="sup-table staff-table"><thead><tr><th>' + t('th_user') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_login_time') + '</th><th>' + t('th_ip') + '</th><th>' + t('th_country') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + rows.map(function(r) {
                        const user = r.user || {};
                        const branch = r.branch ? r.branch.name : '\u2014';
                        const time = r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '';
                        const uid = r.userId || (user && user.id) || '';
                        const rowAttrs = uid ? ' class="staff-row" data-user-id="' + escapeHtml(uid) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" style="cursor:pointer"' : '';
                        const ip = r.ip || '\u2014'; const country = r.country || '\u2014';
                        const ll = [t('th_user'),t('th_email'),t('th_branch'),t('th_login_time'),t('th_ip'),t('th_country'),t('th_summary')]; return '<tr' + rowAttrs + '><td data-label="'+ll[0]+'">' + escapeHtml(userDisplay(user)) + '</td><td data-label="'+ll[1]+'">' + escapeHtml(user.email || '\u2014') + '</td><td data-label="'+ll[2]+'">' + escapeHtml(branch) + '</td><td data-label="'+ll[3]+'">' + time + '</td><td data-label="'+ll[4]+'" dir="ltr">' + escapeHtml(ip) + '</td><td data-label="'+ll[5]+'">' + escapeHtml(country) + '</td><td data-label="'+ll[6]+'">' + escapeHtml(r.summary || '') + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else {
                const loginsErr = (loginsRes.data && loginsRes.data.error) ? String(loginsRes.data.error) : t('login_err_load');
                if (loginsList) loginsList.innerHTML = '<div class="empty">' + escapeHtml(loginsErr) + '</div>';
                if (loginsTodayEl) loginsTodayEl.textContent = '0';
                if (loginsTotalEl) loginsTotalEl.textContent = '0';
            }
            if (updatedEl) { updatedEl.style.display = 'block'; updatedEl.textContent = (LANG === 'fa' ? 'آخرین به\u200Cروزرسانی: ' : 'Last updated: ') + fmtTZ(new Date().toISOString(), 'datetime'); }
            if (!staffActivityAttendanceInitDone) {
                loadAttendanceReportFilters().then(function() {
                    staffActivityAttendanceInitDone = true;
                    loadAttendanceReport();
                });
            } else if (refreshAttendance) {
                loadAttendanceReport();
            }
        }

        async function loadAttendanceReportFilters() {
            const branchSel = document.getElementById('attendanceBranch');
            const userSel = document.getElementById('attendanceUser');
            const fromInp = document.getElementById('attendanceFrom');
            const toInp = document.getElementById('attendanceTo');
            if (!branchSel && !userSel) return Promise.resolve();

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            if (fromInp && toInp && !fromInp.value && !toInp.value) {
                fromInp.value = fmtTZ(firstDay, 'date');
                toInp.value = fmtTZ(today, 'date');
            }

            const prevBranch = branchSel ? branchSel.value : '';
            const prevUser = userSel ? userSel.value : '';

            const [branchRes, userRes] = await Promise.all([apiFetch('/api/branches'), apiFetch('/api/users')]);
            if (branchRes.ok && branchRes.data && branchRes.data.data && branchSel) {
                branchSel.innerHTML = '<option value="">' + (t('all_branches') || 'همه شعب') + '</option>' + branchRes.data.data.filter(function(b){ return b.isActive !== false; }).map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
                if (prevBranch) {
                    branchSel.value = prevBranch;
                    if (branchSel.value !== prevBranch) branchSel.value = '';
                }
            }
            if (userRes.ok && userRes.data && userRes.data.data && userSel) {
                userSel.innerHTML = '<option value="">' + (t('all_users') || 'همه کاربران') + '</option>' + userRes.data.data.filter(function(u){ return u.isActive !== false; }).map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(userDisplay(u)) + '</option>'; }).join('');
                if (prevUser) {
                    userSel.value = prevUser;
                    if (userSel.value !== prevUser) userSel.value = '';
                }
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
                    html += '<div style="padding:12px 16px;background:var(--bg-secondary);border-radius:10px;border:1px solid var(--border);"><div style="font-weight:600;margin-bottom:6px;color:var(--accent);">' + escapeHtml(fromName) + '</div><div>' + linkifyMessageContent(m.content || '') + '</div>' + att + '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">' + (m.createdAt ? fmtTZ(m.createdAt, 'datetime') : '') + '</div></div>';
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
            window.previewPanelLoginLogo = previewPanelLoginLogo;
            window.panelPickBrandingUpload = panelPickBrandingUpload;
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
            window.previewPanelLoginLogo = previewPanelLoginLogo;
            window.panelPickBrandingUpload = panelPickBrandingUpload;
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
            initCspInlineMutationStrip();
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
            fetch(API + '/api/panel-settings/public/branding').then(function(r) { return r.json(); }).then(function(data) { if (data) applyBranding(data, { full: true }); }).catch(function() {});
        }
