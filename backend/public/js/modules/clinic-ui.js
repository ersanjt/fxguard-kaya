/**
 * Kaya CRM — صفحات ماژول کلینیک در داشبورد (بیماران، پزشکان، نوبت‌ها، پکیج‌ها)
 * ورودی: window.CRM.Clinic.show(page, { canManage }) از showPage در chunk-04.
 * @file    public/js/modules/clinic-ui.js
 * @layer   frontend/dashboard
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    'use strict';

    const PAGE_SIZE = 25;
    const GENDERS = ['female', 'male', 'other'];
    const SOURCES = ['local', 'health_tourism'];
    const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const STATUSES = ['scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];
    const INCLUDES = ['hotel', 'airport_transfer', 'interpreter', 'visa_support', 'follow_up'];

    const PAGES = {
        'clinic-patients': { kind: 'patients', rootId: 'pageClinicPatients' },
        'clinic-doctors': { kind: 'doctors', rootId: 'pageClinicDoctors' },
        'clinic-appointments': { kind: 'appointments', rootId: 'pageClinicAppointments' },
        'clinic-packages': { kind: 'packages', rootId: 'pageClinicPackages' },
    };

    const state = {
        canManage: false,
        patients: { page: 1, q: '', source: '', inactive: false },
        doctors: { page: 1, q: '', inactive: false },
        packages: { page: 1, q: '', inactive: false },
        appointments: { page: 1, date: '', doctorId: '', status: '' },
        cache: { patients: {}, doctors: {}, packages: {}, appointments: {} },
        modalSubmit: null,
        bound: {},
    };

    function t(key) {
        return typeof window.t === 'function' ? window.t(key) : key;
    }
    function tn(key, n) {
        return String(t(key)).replace('{n}', String(n));
    }
    function esc(s) {
        return window.CRM.Utils.escapeHtml(s);
    }
    function attr(s) {
        return window.CRM.Utils.escapeAttr(s);
    }
    function notify(msg, isErr) {
        if (typeof window.toast === 'function') window.toast(msg, isErr);
    }
    function locale() {
        const l = window.LANG || 'fa';
        return l === 'fa' ? 'fa-IR' : l === 'tr' ? 'tr-TR' : 'en-GB';
    }

    async function api(url, opts) {
        return window.CRM.Api.fetch(url, opts);
    }

    /** پیام خطا بر اساس code سرور ترجمه می‌شود؛ پیام اعتبارسنجی فارسی سرور دقیق‌تر است. */
    function errorText(res) {
        const code = res && res.data && res.data.code;
        if (code === 'VALIDATION' && (window.LANG || 'fa') === 'fa') return window.CRM.Api.getError(res);
        if (code) {
            const key = 'clinic_err_' + code;
            const msg = t(key);
            if (msg && msg !== key) return msg;
        }
        return window.CRM.Api.getError(res);
    }

    function fmtTime(iso) {
        try {
            return new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
        } catch (_) {
            return '';
        }
    }
    function fmtMoney(amount, currency) {
        if (amount == null) return '';
        try {
            return new Intl.NumberFormat(locale(), { style: 'currency', currency: currency || 'USD' }).format(amount);
        } catch (_) {
            return String(amount) + (currency ? ' ' + currency : '');
        }
    }
    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }
    function localDate(d) {
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }
    function localTime(d) {
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function root(kind) {
        const cfg = Object.keys(PAGES).map((k) => PAGES[k]).filter((p) => p.kind === kind)[0];
        return cfg ? document.getElementById(cfg.rootId) : null;
    }
    function listEl(kind) {
        const r = root(kind);
        return r ? r.querySelector('[data-clinic-list]') : null;
    }
    function setList(kind, html) {
        const el = listEl(kind);
        if (el) el.innerHTML = html;
    }
    function loading(kind) {
        setList(kind, '<div class="clinic-empty">' + esc(t('clinic_loading')) + '</div>');
    }
    function renderPager(kind, total, page) {
        const r = root(kind);
        const el = r && r.querySelector('[data-clinic-pager]');
        if (!el) return;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (pages <= 1) {
            el.innerHTML = total ? '<span class="clinic-pager-total">' + esc(tn('clinic_total', total)) + '</span>' : '';
            return;
        }
        el.innerHTML =
            '<button type="button" class="btn-secondary btn-sm" data-clinic-action="page" data-dir="-1"' +
            (page <= 1 ? ' disabled' : '') + '>' + esc(t('clinic_btn_prev')) + '</button>' +
            '<span class="clinic-pager-total">' + esc(page + ' / ' + pages + ' · ' + tn('clinic_total', total)) + '</span>' +
            '<button type="button" class="btn-secondary btn-sm" data-clinic-action="page" data-dir="1"' +
            (page >= pages ? ' disabled' : '') + '>' + esc(t('clinic_btn_next')) + '</button>';
    }
    function table(headKeys, rowsHtml) {
        if (!rowsHtml) return '<div class="clinic-empty">' + esc(t('clinic_empty')) + '</div>';
        return (
            '<div class="clinic-table-wrap"><table class="clinic-table"><thead><tr>' +
            headKeys.map((k) => '<th>' + esc(t(k)) + '</th>').join('') +
            '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>'
        );
    }
    function btn(action, id, labelKey, extraClass) {
        return (
            '<button type="button" class="btn-secondary btn-sm ' + (extraClass || '') + '" data-clinic-action="' + attr(action) +
            '" data-id="' + attr(id) + '">' + esc(t(labelKey)) + '</button>'
        );
    }
    function inactiveBadge(row) {
        return row.isActive === false ? ' <span class="clinic-badge is-muted">' + esc(t('clinic_badge_inactive')) + '</span>' : '';
    }
    function query(params) {
        const parts = [];
        Object.keys(params).forEach((k) => {
            const v = params[k];
            if (v === '' || v == null || v === false) return;
            parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
        });
        return parts.length ? '?' + parts.join('&') : '';
    }
    function remember(kind, rows) {
        state.cache[kind] = {};
        rows.forEach((r) => { state.cache[kind][r.id] = r; });
    }

    /* ——— لیست‌ها ——— */

    async function loadPatients() {
        const s = state.patients;
        loading('patients');
        const res = await api('/api/clinic/patients' + query({
            q: s.q, source: s.source, includeInactive: s.inactive ? 'true' : '', page: s.page, limit: PAGE_SIZE,
        }));
        if (!res.ok) return setList('patients', '<div class="clinic-empty is-error">' + esc(errorText(res)) + '</div>');
        const rows = res.data.data || [];
        remember('patients', rows);
        const body = rows.map((p) =>
            '<tr><td class="clinic-mono">' + esc(p.fileNumber) + '</td>' +
            '<td>' + esc(p.fullName) + inactiveBadge(p) + '</td>' +
            '<td class="clinic-mono" dir="ltr">' + esc(p.phone || '') + '</td>' +
            '<td><span class="clinic-badge' + (p.source === 'health_tourism' ? ' is-accent' : '') + '">' +
            esc(t('clinic_source_' + p.source)) + '</span></td>' +
            '<td>' + esc(p.nationality || '') + '</td>' +
            '<td class="clinic-actions">' + btn('edit', p.id, 'clinic_btn_edit') +
            (p.isActive !== false ? btn('book', p.id, 'clinic_btn_book') : '') +
            btn('toggle', p.id, p.isActive === false ? 'clinic_btn_activate' : 'clinic_btn_deactivate') + '</td></tr>'
        ).join('');
        setList('patients', table(
            ['clinic_col_file', 'clinic_col_name', 'clinic_col_phone', 'clinic_col_source', 'clinic_col_nationality', 'clinic_col_actions'],
            body
        ));
        renderPager('patients', res.data.total || 0, s.page);
    }

    async function loadDoctors() {
        const s = state.doctors;
        loading('doctors');
        const res = await api('/api/clinic/doctors' + query({
            q: s.q, includeInactive: s.inactive ? 'true' : '', page: s.page, limit: PAGE_SIZE,
        }));
        if (!res.ok) return setList('doctors', '<div class="clinic-empty is-error">' + esc(errorText(res)) + '</div>');
        const rows = res.data.data || [];
        remember('doctors', rows);
        const body = rows.map((d) =>
            '<tr><td>' + esc(d.name) + inactiveBadge(d) + '</td>' +
            '<td>' + esc(d.specialty || '') + '</td>' +
            '<td class="clinic-mono">' + esc((d.languages || []).join(', ').toUpperCase()) + '</td>' +
            '<td>' + esc(tn('clinic_minutes', d.slotMinutes)) + '</td>' +
            '<td class="clinic-actions">' + (state.canManage
                ? btn('edit', d.id, 'clinic_btn_edit') + btn('toggle', d.id, d.isActive === false ? 'clinic_btn_activate' : 'clinic_btn_deactivate')
                : '') + '</td></tr>'
        ).join('');
        setList('doctors', table(
            ['clinic_col_name', 'clinic_col_specialty', 'clinic_col_languages', 'clinic_col_slot', 'clinic_col_actions'],
            body
        ));
        renderPager('doctors', res.data.total || 0, s.page);
    }

    async function loadPackages() {
        const s = state.packages;
        loading('packages');
        const res = await api('/api/clinic/packages' + query({
            q: s.q, includeInactive: s.inactive ? 'true' : '', page: s.page, limit: PAGE_SIZE,
        }));
        if (!res.ok) return setList('packages', '<div class="clinic-empty is-error">' + esc(errorText(res)) + '</div>');
        const rows = res.data.data || [];
        remember('packages', rows);
        const body = rows.map((p) =>
            '<tr><td>' + esc(p.name) + inactiveBadge(p) + '</td>' +
            '<td>' + esc(p.procedure || '') + '</td>' +
            '<td>' + (p.durationDays ? esc(tn('clinic_days', p.durationDays)) : '') + '</td>' +
            '<td class="clinic-mono">' + esc(fmtMoney(p.price, p.currency)) + '</td>' +
            '<td>' + (p.includes || []).map((i) => '<span class="clinic-chip">' + esc(t('clinic_inc_' + i)) + '</span>').join(' ') + '</td>' +
            '<td class="clinic-actions">' + (state.canManage
                ? btn('edit', p.id, 'clinic_btn_edit') + btn('toggle', p.id, p.isActive === false ? 'clinic_btn_activate' : 'clinic_btn_deactivate')
                : '') + '</td></tr>'
        ).join('');
        setList('packages', table(
            ['clinic_col_name', 'clinic_col_procedure', 'clinic_col_duration', 'clinic_col_price', 'clinic_col_includes', 'clinic_col_actions'],
            body
        ));
        renderPager('packages', res.data.total || 0, s.page);
    }

    async function fillDoctorFilter() {
        const r = root('appointments');
        const sel = r && r.querySelector('[data-clinic-filter="doctorId"]');
        if (!sel) return;
        const res = await api('/api/clinic/doctors?limit=100');
        const rows = res.ok ? res.data.data || [] : [];
        const current = state.appointments.doctorId;
        sel.innerHTML = '<option value="">' + esc(t('clinic_any')) + '</option>' + rows.map((d) =>
            '<option value="' + attr(d.id) + '"' + (d.id === current ? ' selected' : '') + '>' + esc(d.name) + '</option>'
        ).join('');
    }

    async function loadAppointments() {
        const s = state.appointments;
        if (!s.date) s.date = localDate(new Date());
        const r = root('appointments');
        const dateInput = r && r.querySelector('[data-clinic-filter="date"]');
        if (dateInput && dateInput.value !== s.date) dateInput.value = s.date;
        loading('appointments');
        const from = new Date(s.date + 'T00:00:00');
        const to = new Date(from.getTime());
        to.setDate(to.getDate() + 1);
        const res = await api('/api/clinic/appointments' + query({
            from: from.toISOString(), to: to.toISOString(), doctorId: s.doctorId, status: s.status, page: s.page, limit: PAGE_SIZE,
        }));
        if (!res.ok) return setList('appointments', '<div class="clinic-empty is-error">' + esc(errorText(res)) + '</div>');
        const rows = res.data.data || [];
        remember('appointments', rows);
        const body = rows.map((a) => {
            const patient = a.patient || {};
            const actions = (a.editable ? btn('edit', a.id, 'clinic_btn_edit') : '') +
                (a.nextStatuses || []).map((st) =>
                    '<button type="button" class="btn-secondary btn-sm clinic-status-btn is-' + attr(st) +
                    '" data-clinic-action="status" data-status="' + attr(st) + '" data-id="' + attr(a.id) + '">' +
                    esc(t('clinic_act_' + st)) + '</button>'
                ).join('');
            return '<tr><td class="clinic-mono" dir="ltr">' + esc(fmtTime(a.startsAt) + ' – ' + fmtTime(a.endsAt)) + '</td>' +
                '<td>' + esc(patient.fullName || '') + ' <span class="clinic-muted clinic-mono">' + esc(patient.fileNumber || '') + '</span></td>' +
                '<td>' + esc((a.doctor && a.doctor.name) || '') + '</td>' +
                '<td>' + esc((a.package && a.package.name) || '') + '</td>' +
                '<td>' + esc(a.reason || '') + '</td>' +
                '<td><span class="clinic-status is-' + attr(a.status) + '">' + esc(t('clinic_status_' + a.status)) + '</span></td>' +
                '<td class="clinic-actions">' + actions + '</td></tr>';
        }).join('');
        setList('appointments', table(
            ['clinic_col_time', 'clinic_col_patient', 'clinic_col_doctor', 'clinic_col_package', 'clinic_col_reason', 'clinic_col_status', 'clinic_col_actions'],
            body
        ));
        renderPager('appointments', res.data.total || 0, s.page);
    }

    const LOADERS = { patients: loadPatients, doctors: loadDoctors, packages: loadPackages, appointments: loadAppointments };

    /* ——— مودال و فرم‌ها ——— */

    function modal() {
        return document.getElementById('clinicModal');
    }
    function openModal(titleKey, fieldsHtml, onSubmit) {
        const m = modal();
        if (!m) return;
        m.querySelector('#clinicModalTitle').textContent = t(titleKey);
        m.querySelector('#clinicModalFields').innerHTML = fieldsHtml;
        const errEl = m.querySelector('#clinicModalError');
        errEl.hidden = true;
        errEl.textContent = '';
        state.modalSubmit = onSubmit;
        m.style.display = 'flex';
    }
    function closeModal() {
        const m = modal();
        if (m) m.style.display = 'none';
        state.modalSubmit = null;
    }
    function modalError(msg) {
        const errEl = modal().querySelector('#clinicModalError');
        errEl.textContent = msg;
        errEl.hidden = false;
    }

    function field(name, labelKey, inputHtml, opts) {
        const o = opts || {};
        return '<div class="clinic-field' + (o.wide ? ' is-wide' : '') + '"><label for="clinicF_' + attr(name) + '">' +
            esc(t(labelKey)) + (o.required ? ' <span class="clinic-req">*</span>' : '') + '</label>' + inputHtml +
            (o.hintKey ? '<small class="clinic-hint">' + esc(t(o.hintKey)) + '</small>' : '') + '</div>';
    }
    function input(name, value, opts) {
        const o = opts || {};
        return '<input id="clinicF_' + attr(name) + '" name="' + attr(name) + '" type="' + attr(o.type || 'text') + '"' +
            ' value="' + attr(value == null ? '' : value) + '"' +
            (o.max ? ' maxlength="' + attr(o.max) + '"' : '') +
            (o.min != null ? ' min="' + attr(o.min) + '"' : '') +
            (o.step ? ' step="' + attr(o.step) + '"' : '') +
            (o.ltr ? ' dir="ltr"' : '') + (o.required ? ' required' : '') + (o.disabled ? ' disabled' : '') + '>';
    }
    function textarea(name, value, max) {
        return '<textarea id="clinicF_' + attr(name) + '" name="' + attr(name) + '" rows="3" maxlength="' + attr(max) + '">' +
            esc(value || '') + '</textarea>';
    }
    function select(name, options, value, opts) {
        const o = opts || {};
        return '<select id="clinicF_' + attr(name) + '" name="' + attr(name) + '"' + (o.required ? ' required' : '') +
            (o.disabled ? ' disabled' : '') + '>' +
            (o.emptyKey ? '<option value="">' + esc(t(o.emptyKey)) + '</option>' : '') +
            options.map((opt) => '<option value="' + attr(opt.value) + '"' + (opt.value === value ? ' selected' : '') + '>' +
                esc(opt.label) + '</option>').join('') + '</select>';
    }
    function enumOptions(values, prefix) {
        return values.map((v) => ({ value: v, label: prefix ? t(prefix + v) : v }));
    }

    function formValues() {
        const form = document.getElementById('clinicModalForm');
        const out = {};
        Array.prototype.forEach.call(form.elements, (el) => {
            if (!el.name || el.disabled) return;
            if (el.type === 'checkbox') {
                if (!out[el.name]) out[el.name] = [];
                if (el.checked) out[el.name].push(el.value);
                return;
            }
            out[el.name] = el.value.trim();
        });
        return out;
    }

    async function submitJson(url, method, body, kind) {
        const res = await api(url, { method, body: JSON.stringify(body) });
        if (!res.ok) return modalError(errorText(res));
        closeModal();
        notify(t('clinic_saved'));
        LOADERS[kind]();
    }

    function patientForm(p) {
        const v = p || {};
        const fields =
            field('fullName', 'clinic_f_full_name', input('fullName', v.fullName, { max: 160, required: true }), { required: true, wide: true }) +
            field('phone', 'clinic_f_phone', input('phone', v.phone, { max: 40, ltr: true, type: 'tel' })) +
            field('email', 'clinic_f_email', input('email', v.email, { max: 160, ltr: true, type: 'email' })) +
            field('gender', 'clinic_f_gender', select('gender', enumOptions(GENDERS, 'clinic_gender_'), v.gender, { emptyKey: 'clinic_none' })) +
            field('birthDate', 'clinic_f_birth_date', input('birthDate', v.birthDate, { type: 'date', ltr: true })) +
            field('source', 'clinic_f_source', select('source', enumOptions(SOURCES, 'clinic_source_'), v.source || 'local')) +
            field('nationality', 'clinic_f_nationality', input('nationality', v.nationality, { max: 2, ltr: true }), { hintKey: 'clinic_f_nationality_hint' }) +
            field('passportNumber', 'clinic_f_passport', input('passportNumber', v.passportNumber, { max: 40, ltr: true })) +
            field('bloodType', 'clinic_f_blood_type', select('bloodType', enumOptions(BLOOD_TYPES), v.bloodType, { emptyKey: 'clinic_none' })) +
            field('allergies', 'clinic_f_allergies', textarea('allergies', v.allergies, 4000), { wide: true }) +
            field('medicalNotes', 'clinic_f_medical_notes', textarea('medicalNotes', v.medicalNotes, 20000), { wide: true });
        openModal(p ? 'clinic_edit_patient' : 'clinic_new_patient', fields, () => {
            const body = formValues();
            return p
                ? submitJson('/api/clinic/patients/' + encodeURIComponent(p.id), 'PATCH', body, 'patients')
                : submitJson('/api/clinic/patients', 'POST', body, 'patients');
        });
    }

    function doctorForm(d) {
        const v = d || {};
        const fields =
            field('name', 'clinic_f_name', input('name', v.name, { max: 120, required: true }), { required: true }) +
            field('specialty', 'clinic_f_specialty', input('specialty', v.specialty, { max: 120 })) +
            field('phone', 'clinic_f_phone', input('phone', v.phone, { max: 40, ltr: true, type: 'tel' })) +
            field('email', 'clinic_f_email', input('email', v.email, { max: 160, ltr: true, type: 'email' })) +
            field('languages', 'clinic_f_languages', input('languages', (v.languages || []).join(', '), { max: 60, ltr: true }), { hintKey: 'clinic_f_languages_hint' }) +
            field('slotMinutes', 'clinic_f_slot', input('slotMinutes', v.slotMinutes || 30, { type: 'number', min: 5, step: 5 })) +
            field('bio', 'clinic_f_bio', textarea('bio', v.bio, 4000), { wide: true });
        openModal(d ? 'clinic_edit_doctor' : 'clinic_new_doctor', fields, () => {
            const body = formValues();
            body.languages = body.languages ? body.languages.split(/[\s,،]+/).filter(Boolean) : [];
            body.slotMinutes = body.slotMinutes ? Number(body.slotMinutes) : undefined;
            return d
                ? submitJson('/api/clinic/doctors/' + encodeURIComponent(d.id), 'PATCH', body, 'doctors')
                : submitJson('/api/clinic/doctors', 'POST', body, 'doctors');
        });
    }

    function packageForm(p) {
        const v = p || {};
        const includes = INCLUDES.map((i) =>
            '<label class="clinic-check"><input type="checkbox" name="includes" value="' + attr(i) + '"' +
            ((v.includes || []).indexOf(i) >= 0 ? ' checked' : '') + '> ' + esc(t('clinic_inc_' + i)) + '</label>'
        ).join('');
        const fields =
            field('name', 'clinic_f_name', input('name', v.name, { max: 160, required: true }), { required: true, wide: true }) +
            field('procedure', 'clinic_f_procedure', input('procedure', v.procedure, { max: 160 })) +
            field('durationDays', 'clinic_f_duration_days', input('durationDays', v.durationDays, { type: 'number', min: 1 })) +
            field('price', 'clinic_f_price', input('price', v.price, { type: 'number', min: 0, step: '0.01', ltr: true })) +
            field('currency', 'clinic_f_currency', input('currency', v.currency, { max: 3, ltr: true }), { hintKey: 'clinic_f_currency_hint' }) +
            '<div class="clinic-field is-wide"><span class="clinic-label">' + esc(t('clinic_f_includes')) + '</span><div class="clinic-checks">' + includes + '</div></div>' +
            field('description', 'clinic_f_description', textarea('description', v.description, 8000), { wide: true });
        openModal(p ? 'clinic_edit_package' : 'clinic_new_package', fields, () => {
            const body = formValues();
            body.includes = body.includes || [];
            return p
                ? submitJson('/api/clinic/packages/' + encodeURIComponent(p.id), 'PATCH', body, 'packages')
                : submitJson('/api/clinic/packages', 'POST', body, 'packages');
        });
    }

    async function appointmentForm(appt, presetPatient) {
        const [docRes, pkgRes] = await Promise.all([
            api('/api/clinic/doctors?limit=100'),
            api('/api/clinic/packages?limit=100'),
        ]);
        if (!docRes.ok) return notify(errorText(docRes), true);
        const doctors = (docRes.data.data || []).map((d) => ({ value: d.id, label: d.name + (d.specialty ? ' — ' + d.specialty : '') }));
        const packages = pkgRes.ok ? (pkgRes.data.data || []).map((p) => ({ value: p.id, label: p.name })) : [];
        const start = appt ? new Date(appt.startsAt) : new Date(state.appointments.date + 'T09:00:00');
        const minutes = appt ? Math.round((new Date(appt.endsAt) - new Date(appt.startsAt)) / 60000) : '';
        const patient = appt ? appt.patient : presetPatient;

        let patientField;
        if (patient) {
            patientField = field('patientLabel', 'clinic_f_patient',
                input('patientLabel', patient.fullName + ' (' + patient.fileNumber + ')', { disabled: true }), { wide: true }) +
                '<input type="hidden" name="patientId" value="' + attr(patient.id) + '">';
        } else {
            patientField =
                field('patientSearch', 'clinic_f_patient_search', input('patientSearch', '', { max: 80 }), { wide: true }) +
                field('patientId', 'clinic_f_patient', select('patientId', [], '', { required: true, emptyKey: 'clinic_select' }), { required: true, wide: true });
        }
        const fields = patientField +
            field('doctorId', 'clinic_f_doctor', select('doctorId', doctors, appt ? appt.doctorId : state.appointments.doctorId, { required: true, emptyKey: 'clinic_select' }), { required: true }) +
            field('packageId', 'clinic_f_package', select('packageId', packages, appt ? appt.packageId : '', { emptyKey: 'clinic_none' })) +
            field('date', 'clinic_f_date', input('date', localDate(start), { type: 'date', required: true, ltr: true }), { required: true }) +
            field('time', 'clinic_f_time', input('time', localTime(start), { type: 'time', required: true, ltr: true, step: 300 }), { required: true }) +
            field('durationMinutes', 'clinic_f_duration_min', input('durationMinutes', minutes, { type: 'number', min: 5, step: 5 }), { hintKey: 'clinic_f_duration_hint' }) +
            field('reason', 'clinic_f_reason', input('reason', appt ? appt.reason : '', { max: 255 }), { wide: true }) +
            field('notes', 'clinic_f_notes', textarea('notes', appt ? appt.notes : '', 8000), { wide: true });

        openModal(appt ? 'clinic_edit_appointment' : 'clinic_new_appointment', fields, () => {
            const v = formValues();
            const body = {
                doctorId: v.doctorId,
                packageId: v.packageId || null,
                startsAt: new Date(v.date + 'T' + v.time + ':00').toISOString(),
                reason: v.reason,
                notes: v.notes,
            };
            if (v.durationMinutes) body.durationMinutes = Number(v.durationMinutes);
            if (appt) return submitJson('/api/clinic/appointments/' + encodeURIComponent(appt.id), 'PATCH', body, 'appointments');
            body.patientId = v.patientId;
            return submitJson('/api/clinic/appointments', 'POST', body, 'appointments');
        });
        if (!patient) searchPatientsForSelect('');
    }

    let patientSearchTimer = null;
    async function searchPatientsForSelect(q) {
        const sel = document.getElementById('clinicF_patientId');
        if (!sel) return;
        const res = await api('/api/clinic/patients' + query({ q, limit: 50 }));
        const rows = res.ok ? res.data.data || [] : [];
        sel.innerHTML = '<option value="">' + esc(t('clinic_select')) + '</option>' + rows.map((p) =>
            '<option value="' + attr(p.id) + '">' + esc(p.fullName + ' (' + p.fileNumber + ')' + (p.phone ? ' · ' + p.phone : '')) + '</option>'
        ).join('');
        if (rows.length === 1) sel.value = rows[0].id;
    }

    /* ——— اکشن‌ها ——— */

    async function toggleActive(kind, id) {
        const row = state.cache[kind][id];
        if (!row) return;
        const res = await api('/api/clinic/' + kind + '/' + encodeURIComponent(id), {
            method: 'PATCH',
            body: JSON.stringify({ isActive: row.isActive === false }),
        });
        if (!res.ok) return notify(errorText(res), true);
        notify(t('clinic_saved'));
        LOADERS[kind]();
    }

    async function changeStatus(id, status) {
        if ((status === 'cancelled' || status === 'no_show') && !window.confirm(t('clinic_confirm_' + status))) return;
        const res = await api('/api/clinic/appointments/' + encodeURIComponent(id) + '/status', {
            method: 'POST',
            body: JSON.stringify({ status }),
        });
        if (!res.ok) return notify(errorText(res), true);
        notify(t('clinic_saved'));
        loadAppointments();
    }

    function handleAction(kind, action, el) {
        const id = el.getAttribute('data-id');
        if (action === 'page') {
            state[kind].page = Math.max(1, state[kind].page + Number(el.getAttribute('data-dir') || 0));
            return LOADERS[kind]();
        }
        if (action === 'new') {
            if (kind === 'patients') return patientForm(null);
            if (kind === 'doctors') return doctorForm(null);
            if (kind === 'packages') return packageForm(null);
            return appointmentForm(null, null);
        }
        if (action === 'edit') {
            const row = state.cache[kind][id];
            if (!row) return null;
            if (kind === 'patients') return patientForm(row);
            if (kind === 'doctors') return doctorForm(row);
            if (kind === 'packages') return packageForm(row);
            return appointmentForm(row, null);
        }
        if (action === 'toggle') return toggleActive(kind, id);
        if (action === 'status') return changeStatus(id, el.getAttribute('data-status'));
        if (action === 'book') {
            const p = state.cache.patients[id];
            if (!p) return null;
            if (typeof window.showPage === 'function') window.showPage('clinic-appointments');
            return appointmentForm(null, p);
        }
        return null;
    }

    function bindPage(kind) {
        if (state.bound[kind]) return;
        const r = root(kind);
        if (!r) return;
        state.bound[kind] = true;
        r.addEventListener('click', (e) => {
            const el = e.target.closest('[data-clinic-action]');
            if (!el || !r.contains(el) || el.disabled) return;
            handleAction(kind, el.getAttribute('data-clinic-action'), el);
        });
        let timer = null;
        r.addEventListener('input', (e) => {
            const el = e.target.closest('[data-clinic-filter]');
            if (!el || el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'date') return;
            clearTimeout(timer);
            timer = setTimeout(() => {
                state[kind][el.getAttribute('data-clinic-filter')] = el.value.trim();
                state[kind].page = 1;
                LOADERS[kind]();
            }, 300);
        });
        r.addEventListener('change', (e) => {
            const el = e.target.closest('[data-clinic-filter]');
            if (!el || el.type === 'search' || el.type === 'text') return;
            const key = el.getAttribute('data-clinic-filter');
            state[kind][key] = el.type === 'checkbox' ? el.checked : el.value;
            state[kind].page = 1;
            LOADERS[kind]();
        });
    }

    function bindModal() {
        if (state.bound.modal) return;
        const m = modal();
        if (!m) return;
        state.bound.modal = true;
        m.addEventListener('click', (e) => {
            if (e.target === m || e.target.closest('[data-clinic-close]')) closeModal();
        });
        document.getElementById('clinicModalForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.modalSubmit) return;
            const saveBtn = document.getElementById('clinicModalSave');
            saveBtn.disabled = true;
            try {
                await state.modalSubmit();
            } finally {
                saveBtn.disabled = false;
            }
        });
        m.addEventListener('input', (e) => {
            if (e.target.id !== 'clinicF_patientSearch') return;
            clearTimeout(patientSearchTimer);
            const q = e.target.value.trim();
            patientSearchTimer = setTimeout(() => searchPatientsForSelect(q), 300);
        });
    }

    function show(page, opts) {
        const cfg = PAGES[page];
        if (!cfg) return;
        state.canManage = !!(opts && opts.canManage);
        bindModal();
        bindPage(cfg.kind);
        const r = root(cfg.kind);
        const newBtn = r && r.querySelector('[data-clinic-action="new"]');
        const manageOnly = cfg.kind === 'doctors' || cfg.kind === 'packages';
        if (newBtn) newBtn.hidden = manageOnly && !state.canManage;
        const hint = r && r.querySelector('[data-clinic-manager-hint]');
        if (hint) hint.hidden = !manageOnly || state.canManage;
        if (cfg.kind === 'appointments') fillDoctorFilter();
        LOADERS[cfg.kind]();
    }

    window.CRM = window.CRM || {};
    window.CRM.Clinic = { show, statuses: STATUSES.slice() };
})();
