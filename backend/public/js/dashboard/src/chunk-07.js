/**
 * Kaya CRM — Dashboard SPA (chunk 07/07)
 * @file    public/js/dashboard/src/chunk-07.js
 * @layer   frontend/dashboard
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * محتوا: موتور عمومی (ماژول‌های سازمان: منوی پویا، لیست/فرم رکورد از schema)،
 *        ماژول‌ساز + قالب صنعت + واژگان سازمان، نوبت‌دهی/رزرو (روز/هفته/لیست، خدمات، یادآوری).
 *        API: /api/objects, /api/fields, /api/records, /api/industry-templates,
 *             /api/appointments, /api/bookable-services
 */
        /* ========== Kaya CRM chunk-07 | موتور عمومی + نوبت‌دهی | docs/CODEBASE-MAP.md ========== */
        var ENG = { objects: null, key: null, page: 1, limit: 30, total: 0, status: '', assignee: '', q: '', users: null, branches: null, fieldTypes: null, editing: null, apptFields: null };
        var BK = { view: 'day', date: null, rows: [], services: null, summary: null, conflictPayload: null, reminderLoaded: false };
        var MB = { tab: 'modules', objects: [], templates: [], current: null, fields: {}, vocabKeys: ['nav_customers', 'page_customers', 'dashboard_quick_new_customer', 'th_customer', 'customer', 'nav_conversations', 'nav_tickets', 'nav_tasks', 'nav_processes', 'nav_services', 'nav_appointments', 'nav_records', 'nav_modules_group'] };
        var ENG_STATUS_ORDER = ['scheduled', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'];
        var ENG_TRANSITIONS = { scheduled: ['confirmed', 'arrived', 'completed', 'cancelled', 'no_show'], confirmed: ['arrived', 'completed', 'cancelled', 'no_show', 'scheduled'], arrived: ['completed', 'cancelled', 'no_show'], completed: [], cancelled: ['scheduled'], no_show: ['scheduled'] };
        var ENG_ACT_KEY = { confirmed: 'bk_act_confirm', arrived: 'bk_act_arrived', completed: 'bk_act_complete', cancelled: 'bk_act_cancel', no_show: 'bk_act_no_show', scheduled: 'bk_act_reopen' };

        /* ---------- helpers ---------- */
        var ENG_ICONS = { sparkles: '✨', tag: '🏷️', hospital: '🏥', 'heart-pulse': '💓', 'briefcase-medical': '🩺', globe: '🌍', map: '🗺️', plane: '✈️', ticket: '🎫', 'message-square': '💬', package: '📦', 'shopping-bag': '🛍️', 'shopping-cart': '🛒', 'rotate-ccw': '↩️', share: '🔗', banknote: '💵', calendar: '📅', users: '👥', star: '⭐', grid: '▦', file: '📄', truck: '🚚', wrench: '🔧', home: '🏠', car: '🚗', book: '📚', gift: '🎁', clipboard: '📋', factory: '🏭', box: '📦' };
        function engIcon(icon) {
            var s = String(icon || '').trim();
            if (!s) return '▦';
            if (ENG_ICONS[s]) return ENG_ICONS[s];
            if (/^[a-z0-9-]+$/i.test(s)) return '▦';
            return s.slice(0, 4);
        }
        function engLang() { return (typeof LANG === 'string' && LANG) ? LANG : 'fa'; }
        function engLabel(labels, fallback) {
            if (!labels) return fallback || '';
            if (typeof labels === 'string') return labels;
            var l = engLang();
            return labels[l] || labels.fa || labels.en || labels.tr || fallback || '';
        }
        function engAttr(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        function engIsManager() {
            return !!(currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager' || (currentUser.permissions && currentUser.permissions.manage_users)));
        }
        function engIsOwnerAdmin() { return !!(currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')); }
        function engCan(section) { return typeof canAccessSection === 'function' ? canAccessSection(section) : true; }
        function engErr(res, fallback) { return (res && res.data && res.data.error) || fallback || t('err_generic'); }
        function engShowFormError(id, msg) { var el = document.getElementById(id); if (!el) return; if (!msg) { el.style.display = 'none'; el.textContent = ''; return; } el.textContent = msg; el.style.display = 'block'; }
        function engOpenModal(id) { var m = document.getElementById(id); if (!m) return; m.style.display = 'flex'; document.body.classList.add('modal-open'); var f = m.querySelector('input:not([type=hidden]):not([disabled]), select, textarea'); if (f) setTimeout(function() { try { f.focus(); } catch (_) {} }, 30); }
        function engCloseModal(id) { var m = document.getElementById(id); if (!m) return; m.style.display = 'none'; if (!document.querySelector('.modal-overlay[style*="flex"]')) document.body.classList.remove('modal-open'); }
        function engPad(n) { return (n < 10 ? '0' : '') + n; }
        function engIsoDate(d) { return d.getFullYear() + '-' + engPad(d.getMonth() + 1) + '-' + engPad(d.getDate()); }
        function engIsoTime(d) { return engPad(d.getHours()) + ':' + engPad(d.getMinutes()); }
        function engParseIsoDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
        function engFmtNum(n) { var v = Number(n); if (!isFinite(v)) return ''; try { return new Intl.NumberFormat(engLang() === 'fa' ? 'fa-IR' : engLang() === 'tr' ? 'tr-TR' : 'en-US', { maximumFractionDigits: 2 }).format(v); } catch (_) { return String(v); } }
        function engFmtDateOnly(d) { return typeof fmtTZ === 'function' ? fmtTZ(d, 'date') : String(d); }
        function engFmtDateTime(d) { return typeof fmtTZ === 'function' ? fmtTZ(d, 'datetime') : String(d); }
        function engFmtTime(d) { return typeof fmtTZ === 'function' ? fmtTZ(d, 'time') : String(d); }
        function engWeekdayName(d) { try { return new Intl.DateTimeFormat(engLang() === 'fa' ? 'fa-IR' : engLang() === 'tr' ? 'tr-TR' : 'en-GB', { weekday: 'short' }).format(d); } catch (_) { return ''; } }
        function engDayLabel(d) { try { return new Intl.DateTimeFormat(engLang() === 'fa' ? 'fa-IR' : engLang() === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' }).format(d); } catch (_) { return engIsoDate(d); } }
        async function engUsers(force) {
            if (ENG.users && !force) return ENG.users;
            var res = await apiFetch('/api/users');
            var arr = (res.ok && res.data && res.data.data) || [];
            ENG.users = arr.filter(function(u) { return u.isActive !== false; });
            return ENG.users;
        }
        async function engBranches(force) {
            if (ENG.branches && !force) return ENG.branches;
            var res = await apiFetch('/api/branches');
            ENG.branches = (res.ok && res.data && res.data.data) || [];
            return ENG.branches;
        }
        function engUserName(id) { var u = (ENG.users || []).filter(function(x) { return x.id === id; })[0]; return u ? (u.name || u.username || u.email || '') : ''; }
        function engOptionsHtml(list, selected, emptyLabel, getVal, getLabel) {
            var html = emptyLabel != null ? '<option value="">' + escapeHtml(emptyLabel) + '</option>' : '';
            (list || []).forEach(function(it) { var v = getVal(it); html += '<option value="' + engAttr(v) + '"' + (String(v) === String(selected == null ? '' : selected) ? ' selected' : '') + '>' + escapeHtml(getLabel(it)) + '</option>'; });
            return html;
        }
        /* انتخاب مشتری با جستجو (برای فرم رکورد و نوبت) */
        function engBindCustomerPicker(inputEl, hiddenEl, resultsEl) {
            if (!inputEl || inputEl._engPicker) return;
            inputEl._engPicker = true;
            var timer = null;
            function hide() { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; }
            inputEl.addEventListener('input', function() {
                hiddenEl.value = '';
                inputEl.removeAttribute('data-picked');
                clearTimeout(timer);
                var q = inputEl.value.trim();
                if (q.length < 2) { hide(); return; }
                timer = setTimeout(async function() {
                    var res = await apiFetch('/api/customers?limit=8&search=' + encodeURIComponent(q));
                    var rows = (res.ok && res.data && res.data.data) || [];
                    if (!rows.length) { resultsEl.innerHTML = '<div class="engine-picker-empty">' + escapeHtml(t('no_results') !== 'no_results' ? t('no_results') : '—') + '</div>'; resultsEl.style.display = 'block'; return; }
                    resultsEl.innerHTML = rows.map(function(c) {
                        return '<button type="button" class="engine-picker-item" data-id="' + engAttr(c.id) + '" data-name="' + engAttr(c.name || c.phone || '') + '"><span class="engine-picker-name">' + escapeHtml(c.name || '—') + '</span><span class="engine-picker-sub">' + escapeHtml(c.phone || '') + '</span></button>';
                    }).join('');
                    resultsEl.style.display = 'block';
                }, 300);
            });
            resultsEl.addEventListener('click', function(e) {
                var b = e.target.closest('.engine-picker-item');
                if (!b) return;
                hiddenEl.value = b.getAttribute('data-id');
                inputEl.value = b.getAttribute('data-name');
                inputEl.setAttribute('data-picked', '1');
                hide();
                inputEl.dispatchEvent(new CustomEvent('engine:picked', { bubbles: true }));
            });
            inputEl.addEventListener('blur', function() { setTimeout(hide, 180); });
            inputEl.addEventListener('keydown', function(e) { if (e.key === 'Escape') hide(); });
        }
        function engSetPickedCustomer(inputEl, hiddenEl, id, name) {
            if (!inputEl || !hiddenEl) return;
            hiddenEl.value = id || '';
            inputEl.value = name || '';
            if (id) inputEl.setAttribute('data-picked', '1'); else inputEl.removeAttribute('data-picked');
        }

        /* ---------- schema → input / value ---------- */
        function engFieldOptionLabel(field, val) {
            var o = (field.options || []).filter(function(x) { return String(x.value) === String(val); })[0];
            return o ? engLabel(o.labels, o.value) : String(val == null ? '' : val);
        }
        function engFmtValue(field, v) {
            if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '—';
            switch (field.type) {
                case 'boolean': return v ? t('eng_yes') : t('eng_no');
                case 'select': return engFieldOptionLabel(field, v);
                case 'multiselect': return (Array.isArray(v) ? v : [v]).map(function(x) { return engFieldOptionLabel(field, x); }).join('، ');
                case 'date': return engFmtDateOnly(v);
                case 'datetime': return engFmtDateTime(v);
                case 'number': return engFmtNum(v);
                case 'money': return engFmtNum(v) + ((field.validation && field.validation.currency) ? ' ' + field.validation.currency : '');
                case 'user': return engUserName(v) || '—';
                case 'url': return '<a href="' + engAttr(v) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(String(v).replace(/^https?:\/\//, '').slice(0, 40)) + '</a>';
                case 'phone': return '<span dir="ltr">' + escapeHtml(v) + '</span>';
                case 'customer': return escapeHtml(String(v).slice(0, 8)) + '…';
                default: return escapeHtml(String(v));
            }
        }
        function engFieldInputHtml(field, value) {
            var id = 'engf_' + field.key;
            var req = field.required ? ' required' : '';
            var ph = field.placeholder ? ' placeholder="' + engAttr(field.placeholder) + '"' : '';
            var v = value == null ? '' : value;
            var val = field.validation || {};
            var label = '<label for="' + id + '">' + escapeHtml(engLabel(field.labels, field.key)) + (field.required ? ' <span class="engine-req">*</span>' : '') + '</label>';
            var help = field.helpText ? '<small class="engine-hint">' + escapeHtml(field.helpText) + '</small>' : '';
            var wide = (field.type === 'textarea' || field.type === 'multiselect') ? ' task-form-field-wide' : '';
            var inner = '';
            switch (field.type) {
                case 'textarea': inner = '<textarea id="' + id + '" data-key="' + engAttr(field.key) + '" rows="3" dir="auto"' + req + ph + (val.maxLength ? ' maxlength="' + val.maxLength + '"' : '') + '>' + escapeHtml(v) + '</textarea>'; break;
                case 'number':
                case 'money': inner = '<div class="engine-money-wrap"><input type="number" id="' + id + '" data-key="' + engAttr(field.key) + '" step="any" inputmode="decimal" dir="ltr" value="' + engAttr(v) + '"' + req + ph + (val.min != null ? ' min="' + val.min + '"' : '') + (val.max != null ? ' max="' + val.max + '"' : '') + '>' + (field.type === 'money' && val.currency ? '<span class="engine-money-cur">' + escapeHtml(val.currency) + '</span>' : '') + '</div>'; break;
                case 'date': inner = '<input type="date" id="' + id + '" data-key="' + engAttr(field.key) + '" value="' + engAttr(v ? String(v).slice(0, 10) : '') + '"' + req + '>'; break;
                case 'datetime': { var dv = ''; if (v) { var d = new Date(v); if (!isNaN(d.getTime())) dv = engIsoDate(d) + 'T' + engIsoTime(d); } inner = '<input type="datetime-local" id="' + id + '" data-key="' + engAttr(field.key) + '" value="' + engAttr(dv) + '"' + req + '>'; break; }
                case 'select': inner = '<select id="' + id + '" data-key="' + engAttr(field.key) + '"' + req + '><option value="">' + escapeHtml(t('eng_none')) + '</option>' + (field.options || []).map(function(o) { return '<option value="' + engAttr(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + escapeHtml(engLabel(o.labels, o.value)) + '</option>'; }).join('') + '</select>'; break;
                case 'multiselect': { var arr = Array.isArray(v) ? v.map(String) : []; inner = '<div class="engine-multiselect" id="' + id + '" data-key="' + engAttr(field.key) + '">' + (field.options || []).map(function(o) { return '<label class="engine-check"><input type="checkbox" value="' + engAttr(o.value) + '"' + (arr.indexOf(String(o.value)) >= 0 ? ' checked' : '') + '> <span>' + escapeHtml(engLabel(o.labels, o.value)) + '</span></label>'; }).join('') + '</div>'; break; }
                case 'boolean': inner = '<label class="engine-check engine-check-solo"><input type="checkbox" id="' + id + '" data-key="' + engAttr(field.key) + '"' + (v === true || v === 'true' || v === 1 ? ' checked' : '') + '> <span>' + escapeHtml(t('eng_yes')) + '</span></label>'; label = '<span class="engine-label-static">' + escapeHtml(engLabel(field.labels, field.key)) + '</span>'; break;
                case 'user': inner = '<select id="' + id + '" data-key="' + engAttr(field.key) + '"' + req + '>' + engOptionsHtml(ENG.users || [], v, t('eng_select_user'), function(u) { return u.id; }, function(u) { return u.name || u.username || u.email || ''; }) + '</select>'; break;
                case 'customer': inner = '<div class="engine-customer-picker"><input type="hidden" id="' + id + '" data-key="' + engAttr(field.key) + '" value="' + engAttr(v) + '"><input type="text" class="engine-customer-search" data-for="' + id + '" placeholder="' + engAttr(t('eng_select_customer')) + '" autocomplete="off" value="' + engAttr(v ? '…' : '') + '"><div class="engine-picker-results" style="display:none;"></div></div>'; break;
                case 'phone': inner = '<input type="tel" id="' + id + '" data-key="' + engAttr(field.key) + '" dir="ltr" value="' + engAttr(v) + '"' + req + ph + '>'; break;
                case 'email': inner = '<input type="email" id="' + id + '" data-key="' + engAttr(field.key) + '" dir="ltr" value="' + engAttr(v) + '"' + req + ph + '>'; break;
                case 'url': inner = '<input type="url" id="' + id + '" data-key="' + engAttr(field.key) + '" dir="ltr" value="' + engAttr(v) + '"' + req + ph + '>'; break;
                default: inner = '<input type="text" id="' + id + '" data-key="' + engAttr(field.key) + '" dir="auto" value="' + engAttr(v) + '"' + req + ph + (val.maxLength ? ' maxlength="' + val.maxLength + '"' : '') + '>';
            }
            return '<div class="task-form-field engine-field engine-field-' + engAttr(field.type) + wide + '">' + label + inner + help + '</div>';
        }
        function engBindDynamicPickers(container) {
            container.querySelectorAll('.engine-customer-search').forEach(function(inp) {
                var hidden = document.getElementById(inp.getAttribute('data-for'));
                var results = inp.parentNode.querySelector('.engine-picker-results');
                if (hidden && results) engBindCustomerPicker(inp, hidden, results);
            });
        }
        function engCollectData(container, fields) {
            var data = {};
            fields.forEach(function(f) {
                var el = container.querySelector('[data-key="' + f.key + '"]');
                if (!el) return;
                switch (f.type) {
                    case 'boolean': data[f.key] = !!el.checked; break;
                    case 'multiselect': data[f.key] = Array.prototype.map.call(el.querySelectorAll('input:checked'), function(c) { return c.value; }); break;
                    case 'number':
                    case 'money': data[f.key] = el.value === '' ? null : Number(el.value); break;
                    case 'datetime': data[f.key] = el.value ? new Date(el.value).toISOString() : null; break;
                    default: data[f.key] = el.value === '' ? null : el.value;
                }
            });
            return data;
        }

        /* ---------- فیلدهای سفارشی مشتری (schema) در مودال مشتری ---------- */
        var ENG_CUSTOMER_FIELDS = null;
        async function engCustomerFields(force) {
            if (ENG_CUSTOMER_FIELDS && !force) return ENG_CUSTOMER_FIELDS;
            var res = await apiFetch('/api/fields?entity=customer');
            ENG_CUSTOMER_FIELDS = (res.ok && res.data && res.data.data) || [];
            return ENG_CUSTOMER_FIELDS;
        }
        /** رندر فیلدهای schema بالای ردیف‌های آزاد؛ خروجی: کلیدهایی که به‌صورت تایپ‌دار رندر شدند */
        async function engineRenderCustomerSchemaFields(freeContainer, cf) {
            var box = document.getElementById('customerModalSchemaFields');
            if (!box) {
                box = document.createElement('div');
                box.id = 'customerModalSchemaFields';
                box.className = 'engine-customer-schema';
                freeContainer.parentNode.insertBefore(box, freeContainer);
            }
            var fields = await engCustomerFields();
            if (!fields.length) { box.innerHTML = ''; box.style.display = 'none'; return []; }
            if (fields.some(function(f) { return f.type === 'user'; })) await engUsers();
            box.style.display = '';
            box.innerHTML = fields.map(function(f) { return engFieldInputHtml(f, cf ? cf[f.key] : undefined); }).join('');
            engBindDynamicPickers(box);
            return fields.map(function(f) { return f.key; });
        }
        function engineCollectCustomerSchemaFields() {
            var box = document.getElementById('customerModalSchemaFields');
            if (!box || !ENG_CUSTOMER_FIELDS || !ENG_CUSTOMER_FIELDS.length || box.style.display === 'none') return {};
            return engCollectData(box, ENG_CUSTOMER_FIELDS);
        }
        window.engineRenderCustomerSchemaFields = engineRenderCustomerSchemaFields;
        window.engineCollectCustomerSchemaFields = engineCollectCustomerSchemaFields;

        /* ---------- ماژول‌ها: بارگذاری + منوی پویا ---------- */
        async function loadEngineObjects(force) {
            if (ENG.objects && !force) return ENG.objects;
            if (!engCan('records')) { ENG.objects = []; return ENG.objects; }
            var res = await apiFetch('/api/objects');
            ENG.objects = (res.ok && res.data && res.data.data) || [];
            return ENG.objects;
        }
        function engObjectByKey(key) { return (ENG.objects || []).filter(function(o) { return o.key === key; })[0] || null; }
        function renderDynamicNav() {
            var box = document.getElementById('navDynamicModules');
            if (!box) return;
            var canRecords = engCan('records');
            var list = canRecords ? (ENG.objects || []).filter(function(o) { return o.showInMenu !== false && o.isActive !== false; }) : [];
            // صفحهٔ فعال را قبل از بازسازی لینک‌ها نگه می‌داریم (لینک پویا با innerHTML از بین می‌رود)
            var prevActive = document.querySelector('.sidebar .nav-link.active');
            var activePage = prevActive ? prevActive.getAttribute('data-page') : null;
            if (!activePage) {
                var pr = document.getElementById('pageRecords');
                if (pr && pr.classList.contains('show')) activePage = 'records';
            }
            box.innerHTML = list.map(function(o) {
                var label = engLabel(o.labels, o.key);
                return '<a href="#records/' + engAttr(o.key) + '" class="nav-link nav-link-dynamic" data-page="records" data-section="records" data-record-key="' + engAttr(o.key) + '" title="' + engAttr(label) + '" data-tooltip="' + engAttr(label) + '"><span class="nav-icon nav-icon-emoji" style="' + (o.color ? 'color:' + engAttr(o.color) : '') + '">' + escapeHtml(engIcon(o.icon)) + '</span> <span class="nav-link-label">' + escapeHtml(label) + '</span></a>';
            }).join('');
            box.querySelectorAll('a').forEach(function(a) {
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    ENG.key = a.getAttribute('data-record-key');
                    window.__engineRecordsKey = ENG.key;
                    ENG.page = 1;
                    showPage('records');
                });
            });
            engineSyncNavVisibility();
            engineSyncActiveNav(activePage);
        }
        function engineSyncNavVisibility() {
            var section = document.getElementById('navSectionModules');
            var hiddenNav = (typeof HIDDEN_SECTIONS !== 'undefined' && Array.isArray(HIDDEN_SECTIONS)) ? HIDDEN_SECTIONS : [];
            if (section) {
                var links = section.querySelectorAll('.nav-link[data-section]');
                var any = false;
                links.forEach(function(l) {
                    var sec = l.getAttribute('data-section');
                    var page = l.getAttribute('data-page');
                    var show = engCan(sec) && hiddenNav.indexOf(page) < 0;
                    l.style.display = show ? '' : 'none';
                    if (show) any = true;
                });
                section.style.display = any ? '' : 'none';
            }
            var sub = document.getElementById('navSubModulesBuilder');
            if (sub) {
                var showBuilder = engIsManager() && engCan('records') && hiddenNav.indexOf('modules') < 0;
                sub.style.display = showBuilder ? '' : 'none';
                var bl = sub.querySelector('.nav-link'); if (bl) bl.style.display = showBuilder ? '' : 'none';
            }
            var bookBtn = document.getElementById('waChatBookBtn');
            if (bookBtn) bookBtn.style.display = engCan('appointments') ? '' : 'none';
            document.querySelectorAll('.customer-detail-tab-engine').forEach(function(b) {
                var tab = b.getAttribute('data-tab');
                b.style.display = engCan(tab === 'records' ? 'records' : 'appointments') ? '' : 'none';
            });
        }
        function engineSyncActiveNav(page) {
            document.querySelectorAll('#navDynamicModules .nav-link').forEach(function(a) {
                var on = page === 'records' && a.getAttribute('data-record-key') === ENG.key;
                a.classList.toggle('active', on);
            });
            if (page === 'records') {
                document.querySelectorAll('.sidebar .nav-link[data-page="records"]:not(.nav-link-dynamic)').forEach(function(a) { a.classList.remove('active'); });
            }
        }
        window.engineSyncActiveNav = engineSyncActiveNav;
        window.engineSyncNavVisibility = engineSyncNavVisibility;
        async function engineBootstrapNav() {
            try {
                await loadEngineObjects(true);
                renderDynamicNav();
            } catch (e) { console.error('[engine] nav', e); }
        }
        window.engineBootstrapNav = engineBootstrapNav;

        /* ---------- صفحهٔ رکوردها ---------- */
        async function initRecordsPage() {
            var objs = await loadEngineObjects();
            var tabs = document.getElementById('recordsModuleTabs');
            var emptyEl = document.getElementById('recordsEmptyModules');
            var toolbar = document.getElementById('recordsToolbar');
            var list = document.getElementById('recordsList');
            var addBtn = document.getElementById('btnRecordCreate');
            var visible = objs.filter(function(o) { return o.isActive !== false; });
            if (!visible.length) {
                if (tabs) tabs.innerHTML = '';
                if (toolbar) toolbar.style.display = 'none';
                if (addBtn) addBtn.style.display = 'none';
                if (list) list.innerHTML = '';
                document.getElementById('recordsStatusChips').innerHTML = '';
                document.getElementById('recordsPager').style.display = 'none';
                if (emptyEl) {
                    emptyEl.style.display = 'block';
                    emptyEl.innerHTML = '<span class="empty-icon">▦</span><h3>' + escapeHtml(t('eng_no_modules_title')) + '</h3><p>' + escapeHtml(t('eng_no_modules_body')) + '</p>' + (engIsManager() ? '<button type="button" class="btn-primary" onclick="showPage(\'modules\')">' + escapeHtml(t('eng_open_builder')) + '</button>' : '');
                }
                engSetRecordsTitle(null);
                return;
            }
            if (emptyEl) emptyEl.style.display = 'none';
            var wanted = window.__engineRecordsKey || ENG.key;
            if (!wanted || !visible.some(function(o) { return o.key === wanted; })) wanted = visible[0].key;
            ENG.key = wanted;
            window.__engineRecordsKey = wanted;
            var obj = engObjectByKey(wanted);
            if (tabs) {
                tabs.innerHTML = visible.map(function(o) {
                    return '<button type="button" class="task-tab' + (o.key === wanted ? ' active' : '') + '" data-key="' + engAttr(o.key) + '" onclick="switchRecordsModule(\'' + engAttr(o.key) + '\')"><span class="engine-tab-icon">' + escapeHtml(engIcon(o.icon)) + '</span> ' + escapeHtml(engLabel(o.labels, o.key)) + '</button>';
                }).join('');
            }
            engSetRecordsTitle(obj);
            if (addBtn) { addBtn.style.display = ''; addBtn.textContent = t('eng_add_record') + ' ' + engLabel(obj.singularLabels, engLabel(obj.labels, '')); }
            if (toolbar) toolbar.style.display = '';
            var stSel = document.getElementById('recordsFilterStatus');
            if (stSel) {
                stSel.innerHTML = '<option value="">' + escapeHtml(t('eng_all_statuses')) + '</option>' + (obj.statuses || []).map(function(s) { return '<option value="' + engAttr(s.key) + '"' + (ENG.status === s.key ? ' selected' : '') + '>' + escapeHtml(engLabel(s.labels, s.key)) + '</option>'; }).join('');
                stSel.style.display = (obj.statuses || []).length ? '' : 'none';
                if (!stSel._bound) { stSel._bound = true; stSel.addEventListener('change', function() { ENG.status = stSel.value; ENG.page = 1; loadRecords(); }); }
            }
            var asSel = document.getElementById('recordsFilterAssignee');
            if (asSel) {
                if (obj.hasAssignee) {
                    var users = await engUsers();
                    asSel.innerHTML = engOptionsHtml(users, ENG.assignee, t('filter_all_users') !== 'filter_all_users' ? t('filter_all_users') : t('eng_assignee'), function(u) { return u.id; }, function(u) { return u.name || u.username || u.email || ''; });
                    asSel.style.display = '';
                } else { asSel.style.display = 'none'; ENG.assignee = ''; }
                if (!asSel._bound) { asSel._bound = true; asSel.addEventListener('change', function() { ENG.assignee = asSel.value; ENG.page = 1; loadRecords(); }); }
            }
            var q = document.getElementById('recordsSearch');
            if (q && !q._bound) { q._bound = true; q.addEventListener('input', function() { clearTimeout(q._t); q._t = setTimeout(function() { ENG.q = q.value.trim(); ENG.page = 1; loadRecords(); }, 350); }); }
            engineSyncActiveNav('records');
            loadRecords();
        }
        function engSetRecordsTitle(obj) {
            var title = obj ? engLabel(obj.labels, obj.key) : t('nav_records');
            var h = document.getElementById('recordsPageTitle'); if (h) { h.textContent = title; h.removeAttribute('data-i18n'); }
            var desc = document.getElementById('recordsPageDesc'); if (desc) desc.textContent = obj ? (obj.recordCount != null ? engFmtNum(obj.recordCount) + ' ' + t('eng_records_count') : '') : '';
            ['headerPageTitle', 'headerBreadcrumb', 'headerMobileTitle'].forEach(function(id) { var el = document.getElementById(id); if (el) { el.textContent = title; el.removeAttribute('data-i18n'); } });
            try { document.title = title + ' — ' + t('page_title'); } catch (_) {}
        }
        function switchRecordsModule(key) {
            ENG.key = key; window.__engineRecordsKey = key; ENG.page = 1; ENG.status = ''; ENG.q = ''; ENG.assignee = '';
            var q = document.getElementById('recordsSearch'); if (q) q.value = '';
            var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/';
            try { window.history.replaceState(null, '', base + '#records/' + key); } catch (_) {}
            initRecordsPage();
        }
        window.switchRecordsModule = switchRecordsModule;
        async function loadRecords() {
            var obj = engObjectByKey(ENG.key);
            var list = document.getElementById('recordsList');
            var pager = document.getElementById('recordsPager');
            if (!obj || !list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            if (obj.hasAssignee) await engUsers();
            var params = ['page=' + ENG.page, 'limit=' + ENG.limit];
            if (ENG.status) params.push('status=' + encodeURIComponent(ENG.status));
            if (ENG.assignee) params.push('assignedTo=' + encodeURIComponent(ENG.assignee));
            if (ENG.q) params.push('q=' + encodeURIComponent(ENG.q));
            var res = await apiFetch('/api/records/' + encodeURIComponent(obj.key) + '?' + params.join('&'));
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            var rows = (res.data && res.data.rows) || [];
            ENG.total = (res.data && res.data.count) || 0;
            var desc = document.getElementById('recordsPageDesc'); if (desc) desc.textContent = engFmtNum(ENG.total) + ' ' + t('eng_records_count');
            renderRecordsStatusChips(obj);
            if (!rows.length) {
                list.innerHTML = '<div class="empty"><span class="empty-icon">▦</span><h3>' + escapeHtml(t('eng_no_records')) + '</h3><p>' + escapeHtml(t('eng_no_records_body')) + '</p></div>';
                if (pager) pager.style.display = 'none';
                return;
            }
            var cols = (obj.fields || []).filter(function(f) { return f.showInList && f.isActive !== false && !f.isTitle; }).slice(0, 5);
            var html = '<div class="engine-table-wrap"><table class="engine-table"><thead><tr><th>' + escapeHtml(t('eng_title')) + '</th>';
            if (obj.linkToCustomer) html += '<th>' + escapeHtml(t('eng_customer')) + '</th>';
            cols.forEach(function(f) { html += '<th>' + escapeHtml(engLabel(f.labels, f.key)) + '</th>'; });
            if ((obj.statuses || []).length) html += '<th>' + escapeHtml(t('eng_status')) + '</th>';
            if (obj.hasAssignee) html += '<th>' + escapeHtml(t('eng_assignee')) + '</th>';
            html += '<th>' + escapeHtml(t('eng_created_at')) + '</th><th class="engine-th-actions">' + escapeHtml(t('eng_actions')) + '</th></tr></thead><tbody>';
            rows.forEach(function(r) {
                var st = (obj.statuses || []).filter(function(s) { return s.key === r.status; })[0];
                html += '<tr data-id="' + engAttr(r.id) + '">';
                html += '<td class="engine-td-title" data-th="' + engAttr(t('eng_title')) + '"><button type="button" class="engine-link" onclick="openRecordForm(\'' + engAttr(r.id) + '\')">' + escapeHtml(r.title || '—') + '</button></td>';
                if (obj.linkToCustomer) html += '<td data-th="' + engAttr(t('eng_customer')) + '">' + (r.customer ? '<a href="#customer-detail/' + engAttr(r.customer.id) + '" class="engine-link" onclick="event.preventDefault(); showCustomerHistory(\'' + engAttr(r.customer.id) + '\')">' + escapeHtml(r.customer.name || r.customer.phone || '—') + '</a>' : '—') + '</td>';
                cols.forEach(function(f) { html += '<td data-th="' + engAttr(engLabel(f.labels, f.key)) + '">' + engFmtValue(f, r.data ? r.data[f.key] : null) + '</td>'; });
                if ((obj.statuses || []).length) html += '<td data-th="' + engAttr(t('eng_status')) + '">' + (st ? '<span class="badge engine-status-badge" style="' + (st.color ? 'background:' + engAttr(st.color) + '22;color:' + engAttr(st.color) : '') + '">' + escapeHtml(engLabel(st.labels, st.key)) + '</span>' : '—') + '</td>';
                if (obj.hasAssignee) html += '<td data-th="' + engAttr(t('eng_assignee')) + '">' + escapeHtml(r.assignee ? r.assignee.name : '—') + '</td>';
                html += '<td data-th="' + engAttr(t('eng_created_at')) + '"><span class="engine-muted">' + escapeHtml(engFmtDateTime(r.createdAt)) + '</span></td>';
                html += '<td class="engine-td-actions"><button type="button" class="btn-secondary btn-sm" onclick="openRecordForm(\'' + engAttr(r.id) + '\')">' + escapeHtml(t('eng_edit_record')) + '</button> <button type="button" class="btn-danger btn-sm" onclick="deleteRecord(\'' + engAttr(r.id) + '\')">' + escapeHtml(t('eng_delete_record')) + '</button></td>';
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            list.innerHTML = html;
            var pages = Math.max(1, Math.ceil(ENG.total / ENG.limit));
            if (pager) {
                pager.style.display = pages > 1 ? 'flex' : 'none';
                pager.innerHTML = '<button type="button" class="btn-secondary btn-sm" ' + (ENG.page <= 1 ? 'disabled' : '') + ' onclick="recordsGoPage(' + (ENG.page - 1) + ')">' + escapeHtml(t('eng_prev')) + '</button><span class="engine-pager-label">' + engFmtNum(ENG.page) + ' / ' + engFmtNum(pages) + '</span><button type="button" class="btn-secondary btn-sm" ' + (ENG.page >= pages ? 'disabled' : '') + ' onclick="recordsGoPage(' + (ENG.page + 1) + ')">' + escapeHtml(t('eng_next')) + '</button>';
            }
        }
        function recordsGoPage(p) { ENG.page = Math.max(1, p); loadRecords(); }
        window.recordsGoPage = recordsGoPage;
        function renderRecordsStatusChips(obj) {
            var box = document.getElementById('recordsStatusChips');
            if (!box) return;
            var sts = obj.statuses || [];
            if (!sts.length) { box.innerHTML = ''; return; }
            box.innerHTML = '<button type="button" class="engine-chip' + (!ENG.status ? ' active' : '') + '" onclick="recordsSetStatus(\'\')">' + escapeHtml(t('eng_all_statuses')) + '</button>' + sts.map(function(s) {
                return '<button type="button" class="engine-chip' + (ENG.status === s.key ? ' active' : '') + '" style="' + (s.color ? '--chip:' + engAttr(s.color) : '') + '" onclick="recordsSetStatus(\'' + engAttr(s.key) + '\')"><span class="engine-chip-dot"></span>' + escapeHtml(engLabel(s.labels, s.key)) + '</button>';
            }).join('');
        }
        function recordsSetStatus(s) { ENG.status = s; ENG.page = 1; var sel = document.getElementById('recordsFilterStatus'); if (sel) sel.value = s; loadRecords(); }
        window.recordsSetStatus = recordsSetStatus;

        /* فرم رکورد (افزودن/ویرایش) */
        async function openRecordForm(id, presets) {
            var obj = engObjectByKey(ENG.key);
            if (!obj) return;
            var box = document.getElementById('recordFormFields');
            var title = document.getElementById('recordModalTitle');
            engShowFormError('recordFormError', '');
            var record = null;
            if (id) {
                var res = await apiFetch('/api/records/' + encodeURIComponent(obj.key) + '/' + encodeURIComponent(id));
                if (!res.ok) { toast(engErr(res), true); return; }
                record = res.data;
            }
            ENG.editing = { objectKey: obj.key, id: id || null };
            var needUsers = obj.hasAssignee || (obj.fields || []).some(function(f) { return f.type === 'user'; });
            if (needUsers) await engUsers();
            var fields = (obj.fields || []).filter(function(f) { return f.isActive !== false; });
            var hasTitleField = fields.some(function(f) { return f.isTitle; });
            var data = (record && record.data) || {};
            var html = '';
            if (!hasTitleField) html += '<div class="task-form-field task-form-field-wide"><label for="recTitle">' + escapeHtml(t('eng_title')) + '</label><input type="text" id="recTitle" maxlength="200" dir="auto" value="' + engAttr(record ? record.title : '') + '"></div>';
            if (obj.linkToCustomer) {
                var cName = record && record.customer ? (record.customer.name || record.customer.phone || '') : (presets && presets.customerName) || '';
                var cId = record ? (record.customerId || '') : (presets && presets.customerId) || '';
                html += '<div class="task-form-field task-form-field-wide"><label for="recCustomerSearch">' + escapeHtml(t('eng_customer')) + '</label><div class="engine-customer-picker"><input type="hidden" id="recCustomerId" value="' + engAttr(cId) + '"><input type="text" id="recCustomerSearch" placeholder="' + engAttr(t('eng_select_customer')) + '" autocomplete="off" value="' + engAttr(cName) + '"' + (cId ? ' data-picked="1"' : '') + '><div id="recCustomerResults" class="engine-picker-results" style="display:none;"></div></div></div>';
            }
            if (obj.hasAssignee) html += '<div class="task-form-field"><label for="recAssignee">' + escapeHtml(t('eng_assignee')) + '</label><select id="recAssignee">' + engOptionsHtml(ENG.users || [], record ? record.assignedTo : (presets && presets.assignedTo) || '', t('eng_none'), function(u) { return u.id; }, function(u) { return u.name || u.username || u.email || ''; }) + '</select></div>';
            if ((obj.statuses || []).length && record) html += '<div class="task-form-field"><label for="recStatus">' + escapeHtml(t('eng_status')) + '</label><select id="recStatus">' + (obj.statuses || []).map(function(s) { return '<option value="' + engAttr(s.key) + '"' + (record.status === s.key ? ' selected' : '') + '>' + escapeHtml(engLabel(s.labels, s.key)) + '</option>'; }).join('') + '</select></div>';
            fields.forEach(function(f) { html += engFieldInputHtml(f, data[f.key] != null ? data[f.key] : (f.defaultValue != null ? f.defaultValue : null)); });
            box.innerHTML = html;
            engBindDynamicPickers(box);
            var cs = document.getElementById('recCustomerSearch');
            if (cs) engBindCustomerPicker(cs, document.getElementById('recCustomerId'), document.getElementById('recCustomerResults'));
            if (title) title.textContent = (id ? t('eng_edit_record') : t('eng_add_record')) + ' — ' + engLabel(obj.singularLabels, engLabel(obj.labels, obj.key));
            engOpenModal('recordModal');
        }
        function closeRecordForm() { engCloseModal('recordModal'); ENG.editing = null; }
        async function submitRecordForm(e) {
            if (e) e.preventDefault();
            var ed = ENG.editing; var obj = ed && engObjectByKey(ed.objectKey);
            if (!obj) return false;
            var box = document.getElementById('recordFormFields');
            var fields = (obj.fields || []).filter(function(f) { return f.isActive !== false; });
            var payload = { data: engCollectData(box, fields) };
            var tEl = document.getElementById('recTitle'); if (tEl) payload.title = tEl.value.trim();
            var cEl = document.getElementById('recCustomerId'); if (cEl) payload.customerId = cEl.value || null;
            var aEl = document.getElementById('recAssignee'); if (aEl) payload.assignedTo = aEl.value || null;
            var sEl = document.getElementById('recStatus'); if (sEl) payload.status = sEl.value;
            var btn = document.getElementById('recordFormSubmit'); if (btn) btn.disabled = true;
            engShowFormError('recordFormError', '');
            var res = ed.id
                ? await apiFetch('/api/records/' + encodeURIComponent(obj.key) + '/' + encodeURIComponent(ed.id), { method: 'PUT', body: JSON.stringify(payload) })
                : await apiFetch('/api/records/' + encodeURIComponent(obj.key), { method: 'POST', body: JSON.stringify(payload) });
            if (btn) btn.disabled = false;
            if (!res.ok) { engShowFormError('recordFormError', (res.data && res.data.errors && res.data.errors.join(' — ')) || engErr(res)); return false; }
            toast(t('eng_saved'));
            closeRecordForm();
            if (document.getElementById('pageRecords').classList.contains('show')) loadRecords();
            if (typeof currentCustomerId !== 'undefined' && currentCustomerId && document.getElementById('pageCustomerDetail').classList.contains('show')) loadCustomerRecords(currentCustomerId);
            return false;
        }
        async function deleteRecord(id) {
            var obj = engObjectByKey(ENG.key);
            if (!obj || !confirm(t('eng_confirm_delete'))) return;
            var res = await apiFetch('/api/records/' + encodeURIComponent(obj.key) + '/' + encodeURIComponent(id), { method: 'DELETE' });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('eng_deleted'));
            loadRecords();
        }
        window.openRecordForm = openRecordForm; window.closeRecordForm = closeRecordForm; window.submitRecordForm = submitRecordForm; window.deleteRecord = deleteRecord;

        /* پروندهٔ مشتری: تب ماژول‌ها و تب نوبت‌ها */
        async function loadCustomerRecords(custId) {
            var box = document.getElementById('customerRecordsList');
            if (!box) return;
            box.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            await loadEngineObjects();
            var res = await apiFetch('/api/records/by-customer/' + encodeURIComponent(custId));
            if (res.needLogin) return;
            if (!res.ok) { box.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            var rows = (res.data && res.data.data) || [];
            var linkable = (ENG.objects || []).filter(function(o) { return o.linkToCustomer && o.isActive !== false; });
            var addBar = linkable.length ? '<div class="engine-cust-addbar">' + linkable.map(function(o) { return '<button type="button" class="btn-secondary btn-sm" onclick="openRecordFormForCustomer(\'' + engAttr(o.key) + '\')">+ ' + escapeHtml(engLabel(o.singularLabels, engLabel(o.labels, o.key))) + '</button>'; }).join('') + '</div>' : '';
            if (!rows.length) { box.innerHTML = addBar + '<div class="empty"><span class="empty-icon">▦</span><p>' + escapeHtml(t('eng_customer_no_records')) + '</p></div>'; return; }
            var groups = {};
            rows.forEach(function(r) { var k = r.object ? r.object.key : '_'; (groups[k] = groups[k] || { object: r.object, rows: [] }).rows.push(r); });
            var html = addBar;
            Object.keys(groups).forEach(function(k) {
                var g = groups[k]; var o = g.object || {};
                var full = engObjectByKey(k);
                var cols = full ? (full.fields || []).filter(function(f) { return f.showInList && !f.isTitle && f.isActive !== false; }).slice(0, 3) : [];
                html += '<div class="engine-cust-group"><h4 class="engine-cust-group-title"><span>' + escapeHtml(engIcon(o.icon)) + '</span> ' + escapeHtml(engLabel(o.labels, k)) + ' <span class="engine-muted">(' + engFmtNum(g.rows.length) + ')</span></h4><div class="engine-cust-rows">';
                g.rows.forEach(function(r) {
                    var st = (o.statuses || []).filter(function(s) { return s.key === r.status; })[0];
                    html += '<div class="engine-cust-row"><div class="engine-cust-row-main"><button type="button" class="engine-link" onclick="ENG.key=\'' + engAttr(k) + '\';openRecordForm(\'' + engAttr(r.id) + '\')">' + escapeHtml(r.title || '—') + '</button>' + (st ? ' <span class="badge engine-status-badge" style="' + (st.color ? 'background:' + engAttr(st.color) + '22;color:' + engAttr(st.color) : '') + '">' + escapeHtml(engLabel(st.labels, st.key)) + '</span>' : '') + '</div>';
                    if (cols.length) html += '<div class="engine-cust-row-meta">' + cols.map(function(f) { return '<span><b>' + escapeHtml(engLabel(f.labels, f.key)) + ':</b> ' + engFmtValue(f, r.data ? r.data[f.key] : null) + '</span>'; }).join('') + '</div>';
                    html += '<div class="engine-muted engine-cust-row-date">' + escapeHtml(engFmtDateTime(r.createdAt)) + '</div></div>';
                });
                html += '</div></div>';
            });
            box.innerHTML = html;
        }
        function openRecordFormForCustomer(key) {
            ENG.key = key;
            var name = (typeof currentCustomerData !== 'undefined' && currentCustomerData) ? (currentCustomerData.name || currentCustomerData.phone || '') : '';
            openRecordForm(null, { customerId: currentCustomerId, customerName: name });
        }
        window.loadCustomerRecords = loadCustomerRecords; window.openRecordFormForCustomer = openRecordFormForCustomer;
        async function loadCustomerAppointments(custId) {
            var box = document.getElementById('customerAppointmentsList');
            if (!box) return;
            box.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/appointments?customerId=' + encodeURIComponent(custId));
            if (res.needLogin) return;
            if (!res.ok) { box.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            var rows = ((res.data && res.data.data) || []).slice().sort(function(a, b) { return new Date(b.startAt) - new Date(a.startAt); });
            if (!rows.length) { box.innerHTML = '<div class="empty"><span class="empty-icon">📅</span><p>' + escapeHtml(t('bk_no_appointments')) + '</p></div>'; return; }
            box.innerHTML = '<div class="engine-appt-list">' + rows.map(function(a) { return bkCardHtml(a, { compact: true }); }).join('') + '</div>';
            var addBtn = document.getElementById('btnCustomerAddAppointment');
            if (addBtn && !addBtn._bound) { addBtn._bound = true; addBtn.addEventListener('click', function() { var name = currentCustomerData ? (currentCustomerData.name || currentCustomerData.phone || '') : ''; openAppointmentForm({ customerId: currentCustomerId, customerName: name }); }); }
        }
        window.loadCustomerAppointments = loadCustomerAppointments;

        /* ========== نوبت‌دهی / رزرو ========== */
        function bkStatusLabel(s) { return t('bk_status_' + s); }
        function bkStatusClass(s) { return 'engine-appt-' + String(s || 'scheduled'); }
        async function bkServices(force) {
            if (BK.services && !force) return BK.services;
            var res = await apiFetch('/api/bookable-services' + (engIsManager() ? '?all=1' : ''));
            BK.services = (res.ok && res.data && res.data.data) || [];
            return BK.services;
        }
        function bkServiceById(id) { return (BK.services || []).filter(function(s) { return s.id === id; })[0] || null; }
        function bkRange() {
            var d = BK.date || new Date();
            var start, end;
            if (BK.view === 'day') { start = new Date(d.getFullYear(), d.getMonth(), d.getDate()); end = new Date(start.getTime() + 86400000); }
            else if (BK.view === 'week') {
                var wd = d.getDay(); // 0=Sun
                var firstDow = engLang() === 'fa' ? 6 : 1; // شنبه برای فارسی، دوشنبه برای بقیه
                var diff = (wd - firstDow + 7) % 7;
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff); end = new Date(start.getTime() + 7 * 86400000);
            } else { start = new Date(d.getFullYear(), d.getMonth(), d.getDate()); end = new Date(start.getTime() + 14 * 86400000); }
            return { start: start, end: end };
        }
        function bkBindStaticHandlers() {
            if (window._bkStaticBound) return;
            window._bkStaticBound = true;
            var bind = function(id, ev, fn) { var el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
            bind('apptDate', 'change', onApptDateChange);
            bind('apptFilterStaff', 'change', loadAppointments);
            bind('apptFilterService', 'change', loadAppointments);
            bind('apptFilterStatus', 'change', loadAppointments);
            bind('apptService', 'change', onApptServiceChange);
            bind('mbFieldType', 'change', onFieldTypeChange);
        }
        async function initAppointmentsPage() {
            bkBindStaticHandlers();
            if (!BK.date) BK.date = new Date();
            var dateInp = document.getElementById('apptDate'); if (dateInp) dateInp.value = engIsoDate(BK.date);
            document.querySelectorAll('#pageAppointments .engine-managers-only').forEach(function(el) { el.style.display = engIsManager() ? '' : 'none'; });
            var users = await engUsers();
            await bkServices(true);
            var st = document.getElementById('apptFilterStaff'); if (st) st.innerHTML = engOptionsHtml(users, st.value, t('bk_all_staff'), function(u) { return u.id; }, function(u) { return u.name || u.username || u.email || ''; });
            var sv = document.getElementById('apptFilterService'); if (sv) sv.innerHTML = engOptionsHtml((BK.services || []).filter(function(s) { return s.isActive !== false; }), sv.value, t('bk_all_services'), function(s) { return s.id; }, function(s) { return engLabel(s.labels, s.name); });
            var ss = document.getElementById('apptFilterStatus'); if (ss) ss.innerHTML = '<option value="">' + escapeHtml(t('eng_all_statuses')) + '</option>' + ENG_STATUS_ORDER.map(function(s) { return '<option value="' + s + '"' + (ss.value === s ? ' selected' : '') + '>' + escapeHtml(bkStatusLabel(s)) + '</option>'; }).join('');
            setApptView(BK.view);
            loadAppointmentsSummary();
        }
        function setApptView(view) {
            BK.view = view;
            document.querySelectorAll('#apptViewTabs .task-tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-view') === view); });
            var isSvc = view === 'services';
            document.getElementById('apptToolbar').style.display = isSvc ? 'none' : '';
            document.getElementById('apptCalendar').style.display = isSvc ? 'none' : '';
            document.getElementById('apptServicesPanel').style.display = isSvc ? '' : 'none';
            if (isSvc) { loadServicesPanel(); return; }
            loadAppointments();
        }
        function shiftApptDate(dir) { var d = BK.date || new Date(); var step = BK.view === 'week' ? 7 : BK.view === 'list' ? 14 : 1; BK.date = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dir * step); var i = document.getElementById('apptDate'); if (i) i.value = engIsoDate(BK.date); loadAppointments(); }
        function goApptToday() { BK.date = new Date(); var i = document.getElementById('apptDate'); if (i) i.value = engIsoDate(BK.date); loadAppointments(); }
        function onApptDateChange() { var i = document.getElementById('apptDate'); var d = engParseIsoDate(i && i.value); if (d) { BK.date = d; loadAppointments(); } }
        window.setApptView = setApptView; window.shiftApptDate = shiftApptDate; window.goApptToday = goApptToday; window.onApptDateChange = onApptDateChange;
        async function loadAppointmentsSummary() {
            var box = document.getElementById('apptSummary');
            if (!box) return;
            var res = await apiFetch('/api/appointments/summary');
            if (!res.ok) { box.innerHTML = ''; return; }
            var d = res.data || {};
            box.innerHTML = [['today', 'bk_summary_today'], ['upcoming', 'bk_summary_upcoming'], ['unconfirmed', 'bk_summary_unconfirmed']].map(function(p) {
                return '<div class="stat-card"><div class="label">' + escapeHtml(t(p[1])) + '</div><div class="stat-number engine-stat-number">' + engFmtNum(d[p[0]] || 0) + '</div></div>';
            }).join('');
        }
        async function loadAppointments() {
            var cal = document.getElementById('apptCalendar');
            if (!cal || BK.view === 'services') return;
            var r = bkRange();
            var label = document.getElementById('apptRangeLabel');
            if (label) label.textContent = BK.view === 'day' ? engFmtDateOnly(r.start) : engFmtDateOnly(r.start) + ' → ' + engFmtDateOnly(new Date(r.end.getTime() - 1));
            cal.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            var params = ['from=' + encodeURIComponent(r.start.toISOString()), 'to=' + encodeURIComponent(r.end.toISOString())];
            var st = document.getElementById('apptFilterStaff'); if (st && st.value) params.push('staffId=' + encodeURIComponent(st.value));
            var sv = document.getElementById('apptFilterService'); if (sv && sv.value) params.push('serviceId=' + encodeURIComponent(sv.value));
            var ss = document.getElementById('apptFilterStatus'); if (ss && ss.value) params.push('status=' + encodeURIComponent(ss.value));
            var res = await apiFetch('/api/appointments?' + params.join('&'));
            if (res.needLogin) return;
            if (!res.ok) { cal.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            BK.rows = (res.data && res.data.data) || [];
            if (BK.view === 'week') renderApptWeek(cal, r); else if (BK.view === 'list') renderApptList(cal); else renderApptDay(cal, r);
        }
        window.loadAppointments = loadAppointments;
        function bkEmptyHtml() { return '<div class="empty"><span class="empty-icon">📅</span><h3>' + escapeHtml(t('bk_no_appointments')) + '</h3><p>' + escapeHtml(t('bk_no_appointments_body')) + '</p></div>'; }
        function bkCardHtml(a, opts) {
            opts = opts || {};
            var svc = a.service || bkServiceById(a.serviceId);
            var color = (svc && svc.color) || '#64748b';
            var s = new Date(a.startAt), e = new Date(a.endAt);
            var custName = a.customer ? (a.customer.name || a.customer.phone || '—') : '—';
            var actions = '';
            (ENG_TRANSITIONS[a.status] || []).forEach(function(to) {
                if (to === 'scheduled' && !engIsManager()) return;
                actions += '<button type="button" class="btn-sm engine-act engine-act-' + to + '" onclick="setAppointmentStatus(\'' + engAttr(a.id) + '\',\'' + to + '\')">' + escapeHtml(t(ENG_ACT_KEY[to])) + '</button>';
            });
            var closed = ['completed', 'cancelled', 'no_show'].indexOf(a.status) >= 0;
            var editBtn = (!closed || engIsManager()) ? '<button type="button" class="btn-secondary btn-sm" onclick="openAppointmentForm({id:\'' + engAttr(a.id) + '\'})">' + escapeHtml(t('eng_edit_record')) + '</button>' : '';
            return '<div class="engine-appt-card ' + bkStatusClass(a.status) + (opts.compact ? ' compact' : '') + '" style="--svc:' + engAttr(color) + '" data-id="' + engAttr(a.id) + '">' +
                '<div class="engine-appt-time"><b>' + escapeHtml(engFmtTime(s)) + '</b><span>' + escapeHtml(engFmtTime(e)) + '</span>' + (opts.showDate || opts.compact ? '<small>' + escapeHtml(engFmtDateOnly(s)) + '</small>' : '') + '</div>' +
                '<div class="engine-appt-body"><div class="engine-appt-title">' + (a.customer && !opts.compact ? '<a href="#customer-detail/' + engAttr(a.customer.id) + '" class="engine-link" onclick="event.preventDefault(); showCustomerHistory(\'' + engAttr(a.customer.id) + '\')">' + escapeHtml(custName) + '</a>' : escapeHtml(custName)) + ' <span class="badge engine-appt-badge">' + escapeHtml(bkStatusLabel(a.status)) + '</span>' + (a.reminderSentAt ? ' <span class="engine-muted engine-appt-rem" title="' + engAttr(t('bk_reminder_sent')) + '">🔔</span>' : '') + '</div>' +
                '<div class="engine-appt-meta">' + (svc ? '<span class="engine-appt-svc">' + escapeHtml(engLabel(svc.labels, svc.name)) + '</span>' : '') + (a.staff ? '<span>👤 ' + escapeHtml(a.staff.name) + '</span>' : '') + (a.branch ? '<span>🏢 ' + escapeHtml(a.branch.name) + '</span>' : '') + (a.source && a.source !== 'panel' ? '<span class="engine-muted">' + escapeHtml(t('bk_source_' + a.source)) + '</span>' : '') + '</div>' +
                (a.notes ? '<div class="engine-appt-notes">' + escapeHtml(String(a.notes).slice(0, 160)) + '</div>' : '') +
                '<div class="engine-appt-actions">' + editBtn + actions + '</div></div></div>';
        }
        function renderApptDay(cal) {
            if (!BK.rows.length) { cal.innerHTML = bkEmptyHtml(); return; }
            var byHour = {};
            BK.rows.forEach(function(a) { var h = new Date(a.startAt).getHours(); (byHour[h] = byHour[h] || []).push(a); });
            var html = '<div class="engine-day-agenda">';
            Object.keys(byHour).map(Number).sort(function(a, b) { return a - b; }).forEach(function(h) {
                html += '<div class="engine-hour-row"><div class="engine-hour-label">' + escapeHtml(engPad(h) + ':00') + '</div><div class="engine-hour-items">' + byHour[h].map(function(a) { return bkCardHtml(a); }).join('') + '</div></div>';
            });
            cal.innerHTML = html + '</div>';
        }
        function renderApptWeek(cal, r) {
            var days = [];
            for (var i = 0; i < 7; i++) days.push(new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate() + i));
            var todayIso = engIsoDate(new Date());
            var html = '<div class="engine-week-grid">';
            days.forEach(function(d) {
                var iso = engIsoDate(d);
                var items = BK.rows.filter(function(a) { return engIsoDate(new Date(a.startAt)) === iso; });
                html += '<div class="engine-week-col' + (iso === todayIso ? ' today' : '') + '"><button type="button" class="engine-week-head" onclick="BK.date=new Date(' + d.getFullYear() + ',' + d.getMonth() + ',' + d.getDate() + ');setApptView(\'day\')"><span>' + escapeHtml(engWeekdayName(d)) + '</span><b>' + escapeHtml(engDayLabel(d)) + '</b>' + (items.length ? '<em>' + engFmtNum(items.length) + '</em>' : '') + '</button><div class="engine-week-items">' + (items.length ? items.map(function(a) { return bkCardHtml(a); }).join('') : '<div class="engine-week-empty">—</div>') + '</div></div>';
            });
            cal.innerHTML = html + '</div>';
        }
        function renderApptList(cal) {
            if (!BK.rows.length) { cal.innerHTML = bkEmptyHtml(); return; }
            cal.innerHTML = '<div class="engine-appt-list">' + BK.rows.map(function(a) { return bkCardHtml(a, { showDate: true }); }).join('') + '</div>';
        }
        async function setAppointmentStatus(id, status) {
            var reason = null;
            if (status === 'cancelled') { reason = prompt(t('bk_cancel_reason'), ''); if (reason === null) return; }
            var res = await apiFetch('/api/appointments/' + encodeURIComponent(id) + '/status', { method: 'POST', body: JSON.stringify({ status: status, reason: reason || undefined }) });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('eng_saved'));
            bkRefreshVisible();
        }
        window.setAppointmentStatus = setAppointmentStatus;
        function bkRefreshVisible() {
            var pa = document.getElementById('pageAppointments');
            if (pa && pa.classList.contains('show')) { loadAppointments(); loadAppointmentsSummary(); }
            var pc = document.getElementById('pageCustomerDetail');
            if (pc && pc.classList.contains('show') && typeof currentCustomerId !== 'undefined' && currentCustomerId) loadCustomerAppointments(currentCustomerId);
        }
        window.onAppointmentChangedSocket = function() { clearTimeout(window._bkSockT); window._bkSockT = setTimeout(bkRefreshVisible, 400); };

        /* فرم نوبت */
        async function openAppointmentForm(opts) {
            opts = opts || {};
            bkBindStaticHandlers();
            engShowFormError('apptFormError', '');
            var users = await engUsers();
            await bkServices();
            var branches = await engBranches();
            if (!ENG.apptFields) { var fr = await apiFetch('/api/fields?entity=appointment'); ENG.apptFields = (fr.ok && fr.data && fr.data.data) || []; }
            var a = null;
            if (opts.id) { var res = await apiFetch('/api/appointments/' + encodeURIComponent(opts.id)); if (!res.ok) { toast(engErr(res), true); return; } a = res.data; }
            document.getElementById('apptId').value = a ? a.id : '';
            document.getElementById('apptConversationId').value = a ? (a.conversationId || '') : (opts.conversationId || '');
            var cs = document.getElementById('apptCustomerSearch'), ch = document.getElementById('apptCustomerId');
            engBindCustomerPicker(cs, ch, document.getElementById('apptCustomerResults'));
            engSetPickedCustomer(cs, ch, a ? a.customerId : opts.customerId || '', a && a.customer ? (a.customer.name || a.customer.phone || '') : opts.customerName || '');
            if (cs) cs.readOnly = !!a;
            var svcSel = document.getElementById('apptService');
            svcSel.innerHTML = engOptionsHtml((BK.services || []).filter(function(s) { return s.isActive !== false || (a && a.serviceId === s.id); }), a ? a.serviceId : opts.serviceId || '', t('eng_none'), function(s) { return s.id; }, function(s) { return engLabel(s.labels, s.name) + ' · ' + s.durationMin + '′'; });
            var stSel = document.getElementById('apptStaff');
            stSel.innerHTML = engOptionsHtml(users, a ? a.staffId : opts.staffId || '', t('eng_none'), function(u) { return u.id; }, function(u) { return u.name || u.username || u.email || ''; });
            var brSel = document.getElementById('apptBranch');
            brSel.innerHTML = engOptionsHtml(branches, a ? a.branchId : '', t('no_branch'), function(b) { return b.id; }, function(b) { return b.name || ''; });
            var start = a ? new Date(a.startAt) : (opts.startAt ? new Date(opts.startAt) : null);
            if (!start) { var base = BK.date || new Date(); var now = new Date(); start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.min(23, now.getHours() + 1), 0); }
            document.getElementById('apptStartDate').value = engIsoDate(start);
            document.getElementById('apptStartTime').value = engIsoTime(start);
            var dur = a ? Math.round((new Date(a.endAt) - new Date(a.startAt)) / 60000) : ((bkServiceById(svcSel.value) || {}).durationMin || 30);
            document.getElementById('apptDuration').value = dur;
            document.getElementById('apptNotes').value = a ? (a.notes || '') : '';
            var extra = document.getElementById('apptExtraFields');
            var activeFields = (ENG.apptFields || []).filter(function(f) { return f.isActive !== false; });
            extra.innerHTML = activeFields.length ? '<div class="task-form-grid engine-form-grid engine-nested-grid">' + activeFields.map(function(f) { return engFieldInputHtml(f, a && a.data ? a.data[f.key] : (f.defaultValue != null ? f.defaultValue : null)); }).join('') + '</div>' : '';
            engBindDynamicPickers(extra);
            document.getElementById('apptModalTitle').textContent = a ? t('bk_edit') : t('bk_new');
            document.getElementById('apptBusyHint').innerHTML = '';
            BK.conflictPayload = null;
            ['apptStaff', 'apptStartDate'].forEach(function(id) { var el = document.getElementById(id); if (el && !el._bkBound) { el._bkBound = true; el.addEventListener('change', bkUpdateBusyHint); } });
            bkUpdateBusyHint();
            engOpenModal('apptModal');
        }
        function onApptServiceChange() { var s = bkServiceById(document.getElementById('apptService').value); if (s && s.durationMin) document.getElementById('apptDuration').value = s.durationMin; }
        async function bkUpdateBusyHint() {
            var hint = document.getElementById('apptBusyHint');
            var date = document.getElementById('apptStartDate').value;
            var staff = document.getElementById('apptStaff').value;
            var selfId = document.getElementById('apptId').value;
            if (!hint || !date || !staff) { if (hint) hint.innerHTML = ''; return; }
            var res = await apiFetch('/api/appointments/availability?date=' + encodeURIComponent(date) + '&staffId=' + encodeURIComponent(staff));
            if (!res.ok) { hint.innerHTML = ''; return; }
            var busy = ((res.data && res.data.busy) || []).filter(function(b) { return b.id !== selfId; });
            hint.innerHTML = busy.length ? '<span class="engine-muted">⏱ ' + busy.map(function(b) { return escapeHtml(engFmtTime(b.startAt) + '–' + engFmtTime(b.endAt)); }).join('، ') + '</span>' : '';
        }
        function closeAppointmentForm() { engCloseModal('apptModal'); BK.conflictPayload = null; }
        async function submitAppointmentForm(e, force) {
            if (e) e.preventDefault();
            var id = document.getElementById('apptId').value;
            var customerId = document.getElementById('apptCustomerId').value;
            if (!customerId) { engShowFormError('apptFormError', t('bk_customer_required')); return false; }
            var date = document.getElementById('apptStartDate').value, time = document.getElementById('apptStartTime').value;
            if (!date || !time) { engShowFormError('apptFormError', t('bk_time_required')); return false; }
            var start = new Date(date + 'T' + time + ':00');
            var payload = {
                customerId: customerId,
                serviceId: document.getElementById('apptService').value || null,
                staffId: document.getElementById('apptStaff').value || null,
                branchId: document.getElementById('apptBranch').value || null,
                startAt: start.toISOString(),
                durationMin: Number(document.getElementById('apptDuration').value) || undefined,
                notes: document.getElementById('apptNotes').value.trim(),
                data: engCollectData(document.getElementById('apptExtraFields'), (ENG.apptFields || []).filter(function(f) { return f.isActive !== false; })),
            };
            var conv = document.getElementById('apptConversationId').value; if (conv && !id) payload.conversationId = conv;
            if (force) payload.force = true;
            var btn = document.getElementById('apptFormSubmit'); if (btn) btn.disabled = true;
            engShowFormError('apptFormError', '');
            var res = id ? await apiFetch('/api/appointments/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(payload) }) : await apiFetch('/api/appointments', { method: 'POST', body: JSON.stringify(payload) });
            if (btn) btn.disabled = false;
            if (!res.ok) {
                if (res.status === 409 && res.data && res.data.code === 'APPOINTMENT_CONFLICT') {
                    var lines = (res.data.conflicts || []).map(function(c) { return engFmtTime(c.startAt) + '–' + engFmtTime(c.endAt); }).join('، ');
                    if (engIsManager() && !force) { if (confirm(t('bk_conflict') + (lines ? '\n' + lines : '') + '\n\n' + t('bk_conflict_force'))) return submitAppointmentForm(null, true); }
                    engShowFormError('apptFormError', t('bk_conflict') + (lines ? ' (' + lines + ')' : ''));
                    return false;
                }
                engShowFormError('apptFormError', (res.data && res.data.errors && res.data.errors.join(' — ')) || engErr(res));
                return false;
            }
            toast(t('bk_saved'));
            closeAppointmentForm();
            bkRefreshVisible();
            return false;
        }
        function openAppointmentFromChat() {
            var p = (typeof openChatCustomerPreview !== 'undefined') ? openChatCustomerPreview : null;
            if (!p || !p.id) { toast(t('bk_customer_required'), true); return; }
            openAppointmentForm({ customerId: p.id, customerName: p.name || p.phone || '', conversationId: (typeof currentConvId !== 'undefined' && currentConvId) ? currentConvId : null });
        }
        window.openAppointmentForm = openAppointmentForm; window.closeAppointmentForm = closeAppointmentForm; window.submitAppointmentForm = submitAppointmentForm; window.onApptServiceChange = onApptServiceChange; window.openAppointmentFromChat = openAppointmentFromChat;

        /* خدمات قابل رزرو + تنظیمات یادآوری */
        async function loadServicesPanel() {
            var list = document.getElementById('apptServicesList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            await bkServices(true);
            var rows = BK.services || [];
            if (!rows.length) list.innerHTML = '<div class="empty"><p>' + escapeHtml(t('bk_svc_none')) + '</p></div>';
            else list.innerHTML = '<div class="engine-svc-grid">' + rows.map(function(s) {
                return '<div class="engine-svc-card' + (s.isActive === false ? ' inactive' : '') + '" style="--svc:' + engAttr(s.color || '#0ea5e9') + '"><div class="engine-svc-head"><span class="engine-svc-dot"></span><b>' + escapeHtml(engLabel(s.labels, s.name)) + '</b>' + (s.isActive === false ? ' <span class="badge">' + escapeHtml(t('mb_inactive')) + '</span>' : '') + '</div><div class="engine-svc-meta"><span>⏱ ' + engFmtNum(s.durationMin) + '′' + (s.bufferMin ? ' +' + engFmtNum(s.bufferMin) + '′' : '') + '</span>' + (s.price != null && s.price !== '' ? '<span>💰 ' + engFmtNum(s.price) + ' ' + escapeHtml(s.currency || '') + '</span>' : '') + '</div>' + (s.description ? '<div class="engine-muted">' + escapeHtml(s.description) + '</div>' : '') + '<div class="engine-svc-actions"><button type="button" class="btn-secondary btn-sm" onclick="openServiceForm(\'' + engAttr(s.id) + '\')">' + escapeHtml(t('eng_edit_record')) + '</button>' + (s.isActive !== false ? '<button type="button" class="btn-danger btn-sm" onclick="deleteBookableService(\'' + engAttr(s.id) + '\')">' + escapeHtml(t('eng_delete_record')) + '</button>' : '<button type="button" class="btn-secondary btn-sm" onclick="toggleService(\'' + engAttr(s.id) + '\', true)">' + escapeHtml(t('bk_act_reopen')) + '</button>') + '</div></div>';
            }).join('') + '</div>';
            loadBookingReminderSettings();
        }
        async function loadBookingReminderSettings() {
            var box = document.querySelector('.engine-reminder-box');
            if (!box) return;
            if (!engCan('panel_settings')) { box.style.display = 'none'; return; }
            var res = await apiFetch('/api/panel-settings');
            if (!res.ok) { box.style.display = 'none'; return; }
            box.style.display = '';
            document.getElementById('bkReminderHours').value = res.data.bookingReminderHours != null ? res.data.bookingReminderHours : 24;
            document.getElementById('bkReminderTemplate').value = res.data.bookingReminderTemplate || '';
            document.getElementById('bkReminderTemplate').placeholder = 'سلام {name} عزیز، یادآوری نوبت شما: {service} در تاریخ {date} ساعت {time}{staff_line}. — {org}';
        }
        async function saveBookingReminderSettings() {
            var hours = Number(document.getElementById('bkReminderHours').value);
            var tpl = document.getElementById('bkReminderTemplate').value.trim();
            var res = await apiFetch('/api/panel-settings', { method: 'PUT', body: JSON.stringify({ bookingReminderHours: isFinite(hours) ? hours : 24, bookingReminderTemplate: tpl || null }) });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('eng_saved'));
        }
        async function openServiceForm(id) {
            engShowFormError('serviceFormError', '');
            var s = id ? bkServiceById(id) : null;
            var branches = await engBranches();
            document.getElementById('svcId').value = s ? s.id : '';
            document.getElementById('svcName').value = s ? (s.name || '') : '';
            document.getElementById('svcDuration').value = s ? s.durationMin : 30;
            document.getElementById('svcBuffer').value = s ? (s.bufferMin || 0) : 0;
            document.getElementById('svcPrice').value = s && s.price != null ? s.price : '';
            document.getElementById('svcCurrency').value = s ? (s.currency || '') : '';
            document.getElementById('svcColor').value = s && /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#0ea5e9';
            document.getElementById('svcDescription').value = s ? (s.description || '') : '';
            document.getElementById('svcBranch').innerHTML = engOptionsHtml(branches, s ? s.branchId : '', t('no_branch'), function(b) { return b.id; }, function(b) { return b.name || ''; });
            document.getElementById('serviceModalTitle').textContent = s ? engLabel(s.labels, s.name) : t('bk_svc_new');
            engOpenModal('serviceModal');
        }
        function closeServiceForm() { engCloseModal('serviceModal'); }
        async function submitServiceForm(e) {
            if (e) e.preventDefault();
            var id = document.getElementById('svcId').value;
            var priceRaw = document.getElementById('svcPrice').value;
            var payload = {
                name: document.getElementById('svcName').value.trim(),
                durationMin: Number(document.getElementById('svcDuration').value) || 30,
                bufferMin: Number(document.getElementById('svcBuffer').value) || 0,
                price: priceRaw === '' ? null : Number(priceRaw),
                currency: document.getElementById('svcCurrency').value.trim() || null,
                color: document.getElementById('svcColor').value,
                branchId: document.getElementById('svcBranch').value || null,
                description: document.getElementById('svcDescription').value.trim() || null,
                isActive: true,
            };
            var res = id ? await apiFetch('/api/bookable-services/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(payload) }) : await apiFetch('/api/bookable-services', { method: 'POST', body: JSON.stringify(payload) });
            if (!res.ok) { engShowFormError('serviceFormError', engErr(res)); return false; }
            toast(t('eng_saved'));
            closeServiceForm();
            loadServicesPanel();
            return false;
        }
        async function deleteBookableService(id) {
            if (!confirm(t('bk_svc_delete_confirm'))) return;
            var res = await apiFetch('/api/bookable-services/' + encodeURIComponent(id), { method: 'DELETE' });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('eng_deleted'));
            loadServicesPanel();
        }
        async function toggleService(id, active) {
            var res = await apiFetch('/api/bookable-services/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ isActive: !!active }) });
            if (!res.ok) { toast(engErr(res), true); return; }
            loadServicesPanel();
        }
        window.openServiceForm = openServiceForm; window.closeServiceForm = closeServiceForm; window.submitServiceForm = submitServiceForm; window.deleteBookableService = deleteBookableService; window.toggleService = toggleService; window.saveBookingReminderSettings = saveBookingReminderSettings;

        /* ========== ماژول‌ساز + قالب صنعت + واژگان ========== */
        async function initModulesPage() {
            var pm = document.getElementById('pageModules');
            if (!engIsManager()) { pm.querySelectorAll('.engine-builder-panel').forEach(function(p) { p.innerHTML = ''; }); document.getElementById('mbPanelModules').innerHTML = '<div class="empty"><p>' + escapeHtml(t('mb_only_managers')) + '</p></div>'; document.getElementById('btnModuleCreate').style.display = 'none'; return; }
            if (!ENG.fieldTypes) { var m = await apiFetch('/api/fields/meta'); ENG.fieldTypes = (m.ok && m.data && m.data.types) || ['text', 'textarea', 'number', 'money', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'phone', 'email', 'url', 'user', 'customer']; }
            setBuilderTab(MB.tab || 'modules');
        }
        function setBuilderTab(tab) {
            MB.tab = tab;
            document.querySelectorAll('#mbTabs .task-tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
            var map = { modules: 'mbPanelModules', customer: 'mbPanelCustomer', appointment: 'mbPanelAppointment', templates: 'mbPanelTemplates', vocab: 'mbPanelVocab' };
            Object.keys(map).forEach(function(k) { var el = document.getElementById(map[k]); if (el) el.style.display = k === tab ? '' : 'none'; });
            document.getElementById('btnModuleCreate').style.display = tab === 'modules' ? '' : 'none';
            if (tab === 'modules') loadBuilderModules();
            else if (tab === 'customer' || tab === 'appointment') loadBuilderEntityFields(tab);
            else if (tab === 'templates') loadIndustryTemplates();
            else if (tab === 'vocab') renderVocabPanel();
        }
        window.setBuilderTab = setBuilderTab;
        function mbTypeLabel(type) { var k = 'mb_type_' + type; var v = t(k); return v === k ? type : v; }
        function mbFieldsTableHtml(fields, entity, objectId) {
            var rows = (fields || []).slice().sort(function(a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
            var head = '<div class="engine-fields-head"><b>' + escapeHtml(t('mb_fields')) + ' <span class="engine-muted">(' + engFmtNum(rows.length) + ')</span></b><button type="button" class="btn-secondary btn-sm" onclick="openFieldForm(null, \'' + engAttr(entity) + '\', ' + (objectId ? '\'' + engAttr(objectId) + '\'' : 'null') + ')">+ ' + escapeHtml(t('mb_add_field')) + '</button></div>';
            if (!rows.length) return head + '<div class="engine-muted engine-fields-empty">' + escapeHtml(t('mb_no_fields')) + '</div>';
            return head + '<div class="engine-table-wrap"><table class="engine-table engine-fields-table"><thead><tr><th>' + escapeHtml(t('mb_field_key')) + '</th><th>' + escapeHtml(t('eng_title')) + '</th><th>' + escapeHtml(t('mb_field_type')) + '</th><th></th><th class="engine-th-actions"></th></tr></thead><tbody>' + rows.map(function(f) {
                var flags = [];
                if (f.required) flags.push(t('mb_field_required'));
                if (f.isTitle) flags.push(t('mb_field_is_title'));
                if (f.showInList) flags.push(t('mb_field_show_in_list'));
                if (f.searchable) flags.push(t('mb_field_searchable'));
                if (f.isActive === false) flags.push(t('mb_inactive'));
                if (f.templateKey) flags.push(t('mb_from_template'));
                return '<tr class="' + (f.isActive === false ? 'inactive' : '') + '"><td data-th="' + engAttr(t('mb_field_key')) + '"><code>' + escapeHtml(f.key) + '</code></td><td data-th="' + engAttr(t('eng_title')) + '">' + escapeHtml(engLabel(f.labels, f.key)) + '</td><td data-th="' + engAttr(t('mb_field_type')) + '">' + escapeHtml(mbTypeLabel(f.type)) + '</td><td><span class="engine-muted">' + escapeHtml(flags.join(' · ')) + '</span></td><td class="engine-td-actions"><button type="button" class="btn-secondary btn-sm" onclick="openFieldForm(\'' + engAttr(f.id) + '\', \'' + engAttr(entity) + '\', ' + (objectId ? '\'' + engAttr(objectId) + '\'' : 'null') + ')">' + escapeHtml(t('eng_edit_record')) + '</button> ' + (f.isActive === false ? '<button type="button" class="btn-secondary btn-sm" onclick="toggleField(\'' + engAttr(f.id) + '\', true)">' + escapeHtml(t('bk_act_reopen')) + '</button>' : '<button type="button" class="btn-danger btn-sm" onclick="deleteField(\'' + engAttr(f.id) + '\')">' + escapeHtml(t('eng_delete_record')) + '</button>') + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        }
        async function loadBuilderModules() {
            var box = document.getElementById('mbPanelModules');
            box.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/objects?all=1');
            if (!res.ok) { box.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            MB.objects = (res.data && res.data.data) || [];
            MB.fields = {};
            MB.objects.forEach(function(o) { MB.fields[o.id] = o.fields || []; });
            if (!MB.objects.length) { box.innerHTML = '<div class="empty"><span class="empty-icon">▦</span><h3>' + escapeHtml(t('eng_no_modules_title')) + '</h3><p>' + escapeHtml(t('eng_no_modules_body')) + '</p><button type="button" class="btn-primary" onclick="setBuilderTab(\'templates\')">' + escapeHtml(t('mb_tab_templates')) + '</button></div>'; return; }
            box.innerHTML = MB.objects.map(function(o) {
                var sts = (o.statuses || []).map(function(s) { return '<span class="badge engine-status-badge" style="' + (s.color ? 'background:' + engAttr(s.color) + '22;color:' + engAttr(s.color) : '') + '">' + escapeHtml(engLabel(s.labels, s.key)) + '</span>'; }).join(' ');
                return '<div class="engine-mb-card' + (o.isActive === false ? ' inactive' : '') + '" style="--svc:' + engAttr(o.color || '#6366f1') + '"><div class="engine-mb-head"><div class="engine-mb-title"><span class="engine-mb-icon">' + escapeHtml(engIcon(o.icon)) + '</span><div><b>' + escapeHtml(engLabel(o.labels, o.key)) + '</b><div class="engine-muted"><code>' + escapeHtml(o.key) + '</code>' + (o.templateKey ? ' · ' + escapeHtml(t('mb_from_template')) + ' ' + escapeHtml(o.templateKey) : '') + (o.isActive === false ? ' · ' + escapeHtml(t('mb_inactive')) : '') + (o.linkToCustomer ? ' · 👤' : '') + (o.hasAssignee ? ' · 🧑‍💼' : '') + (o.showInMenu === false ? ' · 🙈' : '') + '</div></div></div><div class="engine-mb-actions"><button type="button" class="btn-secondary btn-sm" onclick="ENG.key=\'' + engAttr(o.key) + '\';window.__engineRecordsKey=ENG.key;showPage(\'records\')">' + escapeHtml(t('mb_records')) + '</button><button type="button" class="btn-secondary btn-sm" onclick="openModuleForm(\'' + engAttr(o.id) + '\')">' + escapeHtml(t('eng_edit_record')) + '</button>' + (o.isActive === false ? '<button type="button" class="btn-secondary btn-sm" onclick="toggleModule(\'' + engAttr(o.id) + '\', true)">' + escapeHtml(t('bk_act_reopen')) + '</button>' : '<button type="button" class="btn-danger btn-sm" onclick="deleteModule(\'' + engAttr(o.id) + '\', false)">' + escapeHtml(t('eng_delete_record')) + '</button>') + (engIsOwnerAdmin() && o.isActive === false ? '<button type="button" class="btn-danger btn-sm" onclick="deleteModule(\'' + engAttr(o.id) + '\', true)">🗑</button>' : '') + '</div></div>' + (sts ? '<div class="engine-mb-statuses">' + sts + '</div>' : '') + '<div class="engine-mb-fields">' + mbFieldsTableHtml(o.fields, 'record', o.id) + '</div></div>';
            }).join('');
        }
        async function loadBuilderEntityFields(entity) {
            var box = document.getElementById(entity === 'customer' ? 'mbPanelCustomer' : 'mbPanelAppointment');
            box.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/fields?entity=' + entity + '&all=1');
            if (!res.ok) { box.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            MB.fields[entity] = (res.data && res.data.data) || [];
            box.innerHTML = '<div class="engine-mb-card">' + mbFieldsTableHtml(MB.fields[entity], entity, null) + '</div>';
        }
        function mbFindField(id) {
            var all = [];
            Object.keys(MB.fields).forEach(function(k) { all = all.concat(MB.fields[k] || []); });
            return all.filter(function(f) { return f.id === id; })[0] || null;
        }
        function mbLinesToStatuses(text) {
            return String(text || '').split('\n').map(function(l) { return l.trim(); }).filter(Boolean).map(function(l) {
                var p = l.split('|').map(function(x) { return x.trim(); });
                var o = { key: p[0], labels: { fa: p[1] || p[0], en: p[2] || '', tr: p[3] || '' } };
                if (p[4]) o.color = p[4];
                return o;
            });
        }
        function mbStatusesToLines(sts) { return (sts || []).map(function(s) { return [s.key, (s.labels || {}).fa || '', (s.labels || {}).en || '', (s.labels || {}).tr || '', s.color || ''].join('|').replace(/\|+$/, ''); }).join('\n'); }
        function mbLinesToOptions(text) {
            return String(text || '').split('\n').map(function(l) { return l.trim(); }).filter(Boolean).map(function(l) {
                var p = l.split('|').map(function(x) { return x.trim(); });
                return { value: p[0], labels: { fa: p[1] || p[0], en: p[2] || '', tr: p[3] || '' } };
            });
        }
        function mbOptionsToLines(opts) { return (opts || []).map(function(o) { return [o.value, (o.labels || {}).fa || '', (o.labels || {}).en || '', (o.labels || {}).tr || ''].join('|').replace(/\|+$/, ''); }).join('\n'); }
        /* فرم ماژول */
        function openModuleForm(id) {
            var o = id ? MB.objects.filter(function(x) { return x.id === id; })[0] : null;
            engShowFormError('moduleFormError', '');
            document.getElementById('mbObjId').value = o ? o.id : '';
            var keyEl = document.getElementById('mbObjKey'); keyEl.value = o ? o.key : ''; keyEl.readOnly = !!o;
            document.getElementById('mbObjIcon').value = o ? (o.icon || '') : '';
            document.getElementById('mbObjLabelFa').value = o ? ((o.labels || {}).fa || '') : '';
            document.getElementById('mbObjLabelEn').value = o ? ((o.labels || {}).en || '') : '';
            document.getElementById('mbObjLabelTr').value = o ? ((o.labels || {}).tr || '') : '';
            document.getElementById('mbObjSingularFa').value = o ? ((o.singularLabels || {}).fa || '') : '';
            document.getElementById('mbObjColor').value = o && /^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color : '#6366f1';
            document.getElementById('mbObjLinkCustomer').checked = o ? o.linkToCustomer !== false : true;
            document.getElementById('mbObjHasAssignee').checked = o ? !!o.hasAssignee : false;
            document.getElementById('mbObjShowInMenu').checked = o ? o.showInMenu !== false : true;
            document.getElementById('mbObjStatuses').value = o ? mbStatusesToLines(o.statuses) : 'new|جدید|New|Yeni|#3b82f6\nin_progress|در جریان|In progress|Devam ediyor|#f59e0b\ndone|انجام شد|Done|Tamamlandı|#22c55e';
            document.getElementById('moduleModalTitle').textContent = o ? t('mb_edit_module') : t('mb_new_module');
            engOpenModal('moduleModal');
        }
        function closeModuleForm() { engCloseModal('moduleModal'); }
        async function submitModuleForm(e) {
            if (e) e.preventDefault();
            var id = document.getElementById('mbObjId').value;
            var fa = document.getElementById('mbObjLabelFa').value.trim();
            var payload = {
                key: document.getElementById('mbObjKey').value.trim().toLowerCase(),
                labels: { fa: fa, en: document.getElementById('mbObjLabelEn').value.trim(), tr: document.getElementById('mbObjLabelTr').value.trim() },
                singularLabels: { fa: document.getElementById('mbObjSingularFa').value.trim() || fa },
                icon: document.getElementById('mbObjIcon').value.trim() || null,
                color: document.getElementById('mbObjColor').value,
                linkToCustomer: document.getElementById('mbObjLinkCustomer').checked,
                hasAssignee: document.getElementById('mbObjHasAssignee').checked,
                showInMenu: document.getElementById('mbObjShowInMenu').checked,
                statuses: mbLinesToStatuses(document.getElementById('mbObjStatuses').value),
            };
            engShowFormError('moduleFormError', '');
            var res = id ? await apiFetch('/api/objects/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(payload) }) : await apiFetch('/api/objects', { method: 'POST', body: JSON.stringify(payload) });
            if (!res.ok) { engShowFormError('moduleFormError', engErr(res)); return false; }
            toast(t('eng_saved'));
            closeModuleForm();
            await engineBootstrapNav();
            loadBuilderModules();
            return false;
        }
        async function toggleModule(id, active) {
            var res = await apiFetch('/api/objects/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ isActive: !!active }) });
            if (!res.ok) { toast(engErr(res), true); return; }
            await engineBootstrapNav();
            loadBuilderModules();
        }
        async function deleteModule(id, hard) {
            if (!confirm(hard ? t('mb_hard_delete_module_confirm') : t('mb_delete_module_confirm'))) return;
            var res = await apiFetch('/api/objects/' + encodeURIComponent(id) + (hard ? '?hard=1' : ''), { method: 'DELETE' });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('eng_deleted'));
            await engineBootstrapNav();
            loadBuilderModules();
        }
        window.openModuleForm = openModuleForm; window.closeModuleForm = closeModuleForm; window.submitModuleForm = submitModuleForm; window.toggleModule = toggleModule; window.deleteModule = deleteModule;
        /* فرم فیلد */
        function openFieldForm(id, entity, objectId) {
            bkBindStaticHandlers();
            var f = id ? mbFindField(id) : null;
            engShowFormError('fieldFormError', '');
            document.getElementById('mbFieldId').value = f ? f.id : '';
            document.getElementById('mbFieldEntity').value = entity;
            document.getElementById('mbFieldObjectId').value = objectId || '';
            var keyEl = document.getElementById('mbFieldKey'); keyEl.value = f ? f.key : ''; keyEl.readOnly = !!f;
            var typeSel = document.getElementById('mbFieldType');
            typeSel.innerHTML = (ENG.fieldTypes || []).map(function(tp) { return '<option value="' + tp + '"' + (f && f.type === tp ? ' selected' : '') + '>' + escapeHtml(mbTypeLabel(tp)) + '</option>'; }).join('');
            typeSel.disabled = false;
            document.getElementById('mbFieldLabelFa').value = f ? ((f.labels || {}).fa || '') : '';
            document.getElementById('mbFieldLabelEn').value = f ? ((f.labels || {}).en || '') : '';
            document.getElementById('mbFieldLabelTr').value = f ? ((f.labels || {}).tr || '') : '';
            document.getElementById('mbFieldPlaceholder').value = f ? (f.placeholder || '') : '';
            document.getElementById('mbFieldOptions').value = f ? mbOptionsToLines(f.options) : '';
            document.getElementById('mbFieldMin').value = f && f.validation && f.validation.min != null ? f.validation.min : '';
            document.getElementById('mbFieldMax').value = f && f.validation && f.validation.max != null ? f.validation.max : '';
            document.getElementById('mbFieldRequired').checked = f ? !!f.required : false;
            document.getElementById('mbFieldShowInList').checked = f ? f.showInList !== false : true;
            document.getElementById('mbFieldSearchable').checked = f ? !!f.searchable : false;
            document.getElementById('mbFieldIsTitle').checked = f ? !!f.isTitle : false;
            document.getElementById('mbFieldIsTitleWrap').style.display = entity === 'record' ? '' : 'none';
            document.getElementById('fieldModalTitle').textContent = f ? t('mb_edit_field') : t('mb_add_field');
            onFieldTypeChange();
            engOpenModal('fieldModal');
        }
        function onFieldTypeChange() {
            var tp = document.getElementById('mbFieldType').value;
            var hasOpts = tp === 'select' || tp === 'multiselect';
            var numeric = tp === 'number' || tp === 'money';
            document.getElementById('mbFieldOptionsWrap').style.display = hasOpts ? '' : 'none';
            document.getElementById('mbFieldMinWrap').style.display = numeric ? '' : 'none';
            document.getElementById('mbFieldMaxWrap').style.display = numeric ? '' : 'none';
        }
        function closeFieldForm() { engCloseModal('fieldModal'); }
        async function submitFieldForm(e) {
            if (e) e.preventDefault();
            var id = document.getElementById('mbFieldId').value;
            var entity = document.getElementById('mbFieldEntity').value;
            var objectId = document.getElementById('mbFieldObjectId').value || null;
            var tp = document.getElementById('mbFieldType').value;
            var validation = {};
            var mn = document.getElementById('mbFieldMin').value, mx = document.getElementById('mbFieldMax').value;
            if ((tp === 'number' || tp === 'money') && mn !== '') validation.min = Number(mn);
            if ((tp === 'number' || tp === 'money') && mx !== '') validation.max = Number(mx);
            var payload = {
                entity: entity, objectId: objectId,
                key: document.getElementById('mbFieldKey').value.trim().toLowerCase(),
                type: tp,
                labels: { fa: document.getElementById('mbFieldLabelFa').value.trim(), en: document.getElementById('mbFieldLabelEn').value.trim(), tr: document.getElementById('mbFieldLabelTr').value.trim() },
                placeholder: document.getElementById('mbFieldPlaceholder').value.trim() || null,
                options: (tp === 'select' || tp === 'multiselect') ? mbLinesToOptions(document.getElementById('mbFieldOptions').value) : [],
                validation: validation,
                required: document.getElementById('mbFieldRequired').checked,
                showInList: document.getElementById('mbFieldShowInList').checked,
                searchable: document.getElementById('mbFieldSearchable').checked,
                isTitle: entity === 'record' ? document.getElementById('mbFieldIsTitle').checked : false,
            };
            engShowFormError('fieldFormError', '');
            var res = id ? await apiFetch('/api/fields/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(payload) }) : await apiFetch('/api/fields', { method: 'POST', body: JSON.stringify(payload) });
            if (!res.ok) { engShowFormError('fieldFormError', engErr(res)); return false; }
            toast(t('eng_saved'));
            closeFieldForm();
            mbAfterFieldChange(entity);
            return false;
        }
        function mbAfterFieldChange(entity) {
            ENG.objects = null; ENG.apptFields = null; ENG_CUSTOMER_FIELDS = null;
            if (entity === 'record') { loadBuilderModules(); engineBootstrapNav(); } else loadBuilderEntityFields(entity);
        }
        async function toggleField(id, active) {
            var f = mbFindField(id);
            var res = await apiFetch('/api/fields/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ isActive: !!active }) });
            if (!res.ok) { toast(engErr(res), true); return; }
            mbAfterFieldChange(f ? f.entity : 'record');
        }
        async function deleteField(id) {
            var f = mbFindField(id);
            if (!confirm(t('mb_delete_field_confirm'))) return;
            var res = await apiFetch('/api/fields/' + encodeURIComponent(id), { method: 'DELETE' });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('eng_deleted'));
            mbAfterFieldChange(f ? f.entity : 'record');
        }
        window.openFieldForm = openFieldForm; window.closeFieldForm = closeFieldForm; window.submitFieldForm = submitFieldForm; window.onFieldTypeChange = onFieldTypeChange; window.toggleField = toggleField; window.deleteField = deleteField;
        /* قالب‌های صنعت */
        async function loadIndustryTemplates() {
            var box = document.getElementById('mbPanelTemplates');
            box.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/industry-templates');
            if (!res.ok) { box.innerHTML = '<div class="empty">' + escapeHtml(engErr(res)) + '</div>'; return; }
            MB.templates = (res.data && res.data.data) || [];
            MB.current = res.data && res.data.current;
            var canApply = engIsOwnerAdmin() || (currentUser && currentUser.isMainAdmin);
            box.innerHTML = '<p class="engine-muted engine-intro">' + escapeHtml(t('mb_templates_intro')) + '</p><div class="engine-tpl-grid">' + MB.templates.map(function(tp) {
                var cur = MB.current === tp.key;
                var c = tp.counts || {};
                var chips = [c.objects ? engFmtNum(c.objects) + ' ' + t('mb_template_modules') : '', c.customerFields ? engFmtNum(c.customerFields) + ' ' + t('mb_template_fields') : '', c.bookableServices ? engFmtNum(c.bookableServices) + ' ' + t('mb_template_services') : '', tp.booking ? '📅 ' + t('mb_template_booking') : ''].filter(Boolean);
                return '<div class="engine-tpl-card' + (cur ? ' current' : '') + '"><div class="engine-tpl-head"><b>' + escapeHtml(engLabel(tp.labels, tp.key)) + '</b>' + (cur ? '<span class="badge done">' + escapeHtml(t('mb_template_current')) + '</span>' : '') + '</div><p class="engine-muted">' + escapeHtml(engLabel(tp.description, '')) + '</p><div class="engine-tpl-chips">' + chips.map(function(x) { return '<span class="engine-chip static">' + escapeHtml(x) + '</span>'; }).join('') + '</div>' + (canApply ? '<button type="button" class="btn-primary btn-sm" onclick="applyIndustryTemplate(\'' + engAttr(tp.key) + '\')">' + escapeHtml(t('mb_template_apply')) + '</button>' : '') + '</div>';
            }).join('') + '</div>';
        }
        async function applyIndustryTemplate(key) {
            var tp = MB.templates.filter(function(x) { return x.key === key; })[0];
            if (!tp || !confirm(t('mb_template_confirm').replace('{name}', engLabel(tp.labels, key)))) return;
            var res = await apiFetch('/api/industry-templates/' + encodeURIComponent(key) + '/apply', { method: 'POST', body: JSON.stringify({}) });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('mb_template_applied'));
            ENG.objects = null; ENG.apptFields = null; BK.services = null; ENG_CUSTOMER_FIELDS = null;
            await engineBootstrapNav();
            if (typeof loadPanelSettingsAndApply === 'function') { try { await loadPanelSettingsAndApply(); } catch (_) {} }
            loadIndustryTemplates();
        }
        window.applyIndustryTemplate = applyIndustryTemplate;
        /* واژگان سازمان */
        function renderVocabPanel() {
            var box = document.getElementById('mbPanelVocab');
            var overrides = window.__engineLabelOverrides || {};
            var defaults = window.__I18N_DEFAULTS || {};
            function def(lang, k) { var pack = lang === 'fa' ? window.__I18N_FA : lang === 'en' ? window.__I18N_EN : window.__I18N_TR; var d = defaults[lang] && defaults[lang][k] !== undefined ? defaults[lang][k] : (pack ? pack[k] : ''); return d == null ? '' : d; }
            var keys = MB.vocabKeys.filter(function(k) { return def('fa', k) || def('en', k); });
            box.innerHTML = '<p class="engine-muted engine-intro">' + escapeHtml(t('mb_vocab_intro')) + '</p><div class="engine-table-wrap"><table class="engine-table engine-vocab-table"><thead><tr><th>' + escapeHtml(t('mb_vocab_key')) + '</th><th>FA</th><th>EN</th><th>TR</th></tr></thead><tbody>' + keys.map(function(k) {
                var o = overrides[k] || {};
                return '<tr data-key="' + engAttr(k) + '"><td data-th="' + engAttr(t('mb_vocab_key')) + '"><b>' + escapeHtml(def('fa', k)) + '</b><div class="engine-muted"><code>' + escapeHtml(k) + '</code></div></td>' + ['fa', 'en', 'tr'].map(function(l) { return '<td data-th="' + l.toUpperCase() + '"><input type="text" class="engine-vocab-input" data-lang="' + l + '" maxlength="80" dir="' + (l === 'fa' ? 'rtl' : 'ltr') + '" placeholder="' + engAttr(def(l, k)) + '" value="' + engAttr(o[l] || '') + '"></td>'; }).join('') + '</tr>';
            }).join('') + '</tbody></table></div><div class="task-form-actions"><button type="button" class="btn-primary" onclick="saveVocab()">' + escapeHtml(t('mb_vocab_save')) + '</button></div>';
        }
        async function saveVocab() {
            var map = {};
            document.querySelectorAll('#mbPanelVocab tr[data-key]').forEach(function(tr) {
                var k = tr.getAttribute('data-key'); var o = {};
                tr.querySelectorAll('.engine-vocab-input').forEach(function(inp) { var v = inp.value.trim(); if (v) o[inp.getAttribute('data-lang')] = v; });
                if (Object.keys(o).length) map[k] = o;
            });
            var res = await apiFetch('/api/panel-settings', { method: 'PUT', body: JSON.stringify({ labelOverrides: map }) });
            if (!res.ok) { toast(engErr(res), true); return; }
            toast(t('mb_vocab_saved'));
            if (window.applyLabelOverrides) window.applyLabelOverrides(map);
            renderVocabPanel();
        }
        window.saveVocab = saveVocab;

        /* ---------- اتصال به showPage / تب‌های پروندهٔ مشتری ---------- */
        window.initRecordsPage = initRecordsPage;
        window.initAppointmentsPage = initAppointmentsPage;
        window.initModulesPage = initModulesPage;
        window.engineHasCustomerTab = function(tab) { return tab === 'records' || tab === 'appointments'; };
        window.engineOnCustomerTab = function(tab, custId) { if (tab === 'records') loadCustomerRecords(custId); if (tab === 'appointments') loadCustomerAppointments(custId); };
        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            ['fieldModal', 'moduleModal', 'serviceModal', 'apptModal', 'recordModal'].forEach(function(id) { var m = document.getElementById(id); if (m && m.style.display === 'flex') engCloseModal(id); });
        });
        ['recordModal', 'apptModal', 'serviceModal', 'moduleModal', 'fieldModal'].forEach(function(id) {
            var m = document.getElementById(id);
            if (m) m.addEventListener('click', function(e) { if (e.target === m) engCloseModal(id); });
        });
