/**
 * Kaya CRM — اعتبارسنجی و نرمال‌سازی ورودی ماژول کلینیک (توابع خالص)
 * @file    backend/services/clinic/validators.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { isValidUUID } = require('../../lib/validation');
const {
    PATIENT_GENDERS,
    PATIENT_SOURCES,
    BLOOD_TYPES,
    APPOINTMENT_STATUSES,
    APPOINTMENT_TRANSITIONS,
    PACKAGE_INCLUDES,
    MIN_APPOINTMENT_MINUTES,
    MAX_APPOINTMENT_MINUTES,
} = require('../../lib/clinicConstants');

class ClinicError extends Error {
    constructor(status, message, code) {
        super(message);
        this.name = 'ClinicError';
        this.status = status;
        this.code = code || null;
    }
}

function badRequest(message, code) {
    return new ClinicError(400, message, code || 'VALIDATION');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** undefined = «فیلد ارسال نشده»؛ null/'' = «پاک شود». */
function optionalText(value, max, label) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const s = String(value).trim();
    if (!s) return null;
    if (s.length > max) throw badRequest(label + ' حداکثر ' + max + ' کاراکتر است');
    return s;
}

function requiredText(value, max, label) {
    const s = optionalText(value, max, label);
    if (!s) throw badRequest(label + ' الزامی است');
    return s;
}

function optionalEnum(value, allowed, label) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const v = String(value).trim();
    if (allowed.indexOf(v) < 0) throw badRequest(label + ' نامعتبر است');
    return v;
}

function optionalEmail(value) {
    const s = optionalText(value, 160, 'ایمیل');
    if (s && !EMAIL_RE.test(s)) throw badRequest('ایمیل نامعتبر است');
    return s ? s.toLowerCase() : s;
}

function optionalCountry(value) {
    const s = optionalText(value, 2, 'کد کشور');
    if (s == null) return s;
    const up = s.toUpperCase();
    if (!/^[A-Z]{2}$/.test(up)) throw badRequest('کد کشور باید دو حرفی (ISO) باشد');
    return up;
}

function optionalCurrency(value) {
    const s = optionalText(value, 3, 'ارز');
    if (s == null) return s;
    const up = s.toUpperCase();
    if (!/^[A-Z]{3}$/.test(up)) throw badRequest('کد ارز باید سه حرفی (ISO) باشد');
    return up;
}

function optionalBirthDate(value, now) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const s = String(value).trim();
    const d = new Date(s + 'T00:00:00Z');
    if (!DATE_ONLY_RE.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
        throw badRequest('تاریخ تولد باید به شکل YYYY-MM-DD باشد');
    }
    const today = (now instanceof Date ? now : new Date()).toISOString().slice(0, 10);
    if (s > today) throw badRequest('تاریخ تولد نمی‌تواند در آینده باشد');
    if (s < '1900-01-01') throw badRequest('تاریخ تولد نامعتبر است');
    return s;
}

function optionalUuid(value, label) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const s = String(value).trim();
    if (!isValidUUID(s)) throw badRequest('شناسه ' + label + ' نامعتبر است');
    return s;
}

function requiredUuid(value, label) {
    const s = optionalUuid(value, label);
    if (!s) throw badRequest(label + ' الزامی است');
    return s;
}

function optionalInt(value, min, max, label) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
        throw badRequest(label + ' باید عدد صحیح بین ' + min + ' و ' + max + ' باشد');
    }
    return n;
}

function optionalMoney(value) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1e12) throw badRequest('مبلغ نامعتبر است');
    return Math.round(n * 100) / 100;
}

function optionalBool(value) {
    if (value === undefined) return undefined;
    return value === true || value === 'true' || value === 1 || value === '1';
}

function optionalCodeList(value, pattern, max, label) {
    if (value === undefined) return undefined;
    if (value === null) return [];
    if (!Array.isArray(value)) throw badRequest(label + ' باید فهرست باشد');
    const out = [];
    value.forEach((raw) => {
        const v = String(raw || '').trim().toLowerCase();
        if (!v) return;
        if (!pattern.test(v)) throw badRequest(label + ' نامعتبر است: ' + v);
        if (out.indexOf(v) < 0) out.push(v);
    });
    if (out.length > max) throw badRequest(label + ' حداکثر ' + max + ' مورد است');
    return out;
}

function optionalIncludes(value) {
    if (value === undefined) return undefined;
    if (value === null) return [];
    if (!Array.isArray(value)) throw badRequest('خدمات همراه باید فهرست باشد');
    const out = [];
    value.forEach((raw) => {
        const v = String(raw || '').trim();
        if (PACKAGE_INCLUDES.indexOf(v) < 0) throw badRequest('خدمت همراه نامعتبر است: ' + v);
        if (out.indexOf(v) < 0) out.push(v);
    });
    return out;
}

function parseInstant(value, label) {
    if (value === undefined || value === null || value === '') return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw badRequest(label + ' نامعتبر است');
    return d;
}

/**
 * startsAt الزامی؛ پایان از endsAt یا durationMinutes یا پیش‌فرض پزشک.
 * @returns {{ startsAt: Date, endsAt: Date }}
 */
function resolveAppointmentWindow(input, defaultMinutes) {
    const startsAt = parseInstant(input.startsAt, 'زمان شروع');
    if (!startsAt) throw badRequest('زمان شروع نوبت الزامی است');
    let endsAt = parseInstant(input.endsAt, 'زمان پایان');
    if (!endsAt) {
        const minutes = optionalInt(input.durationMinutes, MIN_APPOINTMENT_MINUTES, MAX_APPOINTMENT_MINUTES, 'مدت نوبت');
        endsAt = new Date(startsAt.getTime() + (minutes || defaultMinutes || 30) * 60000);
    }
    const minutes = (endsAt.getTime() - startsAt.getTime()) / 60000;
    if (minutes < MIN_APPOINTMENT_MINUTES) throw badRequest('پایان نوبت باید دست‌کم ۵ دقیقه بعد از شروع باشد');
    if (minutes > MAX_APPOINTMENT_MINUTES) throw badRequest('مدت نوبت بیش از حد مجاز است');
    return { startsAt, endsAt };
}

function assertStatusTransition(from, to) {
    if (APPOINTMENT_STATUSES.indexOf(to) < 0) throw badRequest('وضعیت نوبت نامعتبر است');
    if (from === to) return;
    const allowed = APPOINTMENT_TRANSITIONS[from] || [];
    if (allowed.indexOf(to) < 0) {
        throw new ClinicError(409, 'تغییر وضعیت از «' + from + '» به «' + to + '» مجاز نیست', 'INVALID_TRANSITION');
    }
}

function normalizePatientInput(body, { partial, now } = {}) {
    const src = body || {};
    const out = {
        fullName: partial ? optionalText(src.fullName, 160, 'نام بیمار') : requiredText(src.fullName, 160, 'نام بیمار'),
        phone: optionalText(src.phone, 40, 'تلفن'),
        email: optionalEmail(src.email),
        gender: optionalEnum(src.gender, PATIENT_GENDERS, 'جنسیت'),
        birthDate: optionalBirthDate(src.birthDate, now),
        nationality: optionalCountry(src.nationality),
        passportNumber: optionalText(src.passportNumber, 40, 'شماره پاسپورت'),
        bloodType: optionalEnum(src.bloodType, BLOOD_TYPES, 'گروه خونی'),
        allergies: optionalText(src.allergies, 4000, 'حساسیت‌ها'),
        medicalNotes: optionalText(src.medicalNotes, 20000, 'یادداشت پزشکی'),
        source: optionalEnum(src.source, PATIENT_SOURCES, 'منبع بیمار'),
        customerId: optionalUuid(src.customerId, 'مشتری'),
        isActive: optionalBool(src.isActive),
    };
    if (partial && out.fullName === null) throw badRequest('نام بیمار الزامی است');
    if (!partial && !out.source) out.source = 'local';
    return stripUndefined(out);
}

function normalizeDoctorInput(body, { partial } = {}) {
    const src = body || {};
    const out = {
        name: partial ? optionalText(src.name, 120, 'نام پزشک') : requiredText(src.name, 120, 'نام پزشک'),
        specialty: optionalText(src.specialty, 120, 'تخصص'),
        phone: optionalText(src.phone, 40, 'تلفن'),
        email: optionalEmail(src.email),
        languages: optionalCodeList(src.languages, /^[a-z]{2}$/, 10, 'زبان'),
        bio: optionalText(src.bio, 4000, 'معرفی'),
        slotMinutes: optionalInt(src.slotMinutes, MIN_APPOINTMENT_MINUTES, 240, 'مدت پیش‌فرض نوبت'),
        userId: optionalUuid(src.userId, 'کاربر'),
        isActive: optionalBool(src.isActive),
    };
    if (partial && out.name === null) throw badRequest('نام پزشک الزامی است');
    if (out.slotMinutes === null) delete out.slotMinutes;
    return stripUndefined(out);
}

function normalizePackageInput(body, { partial } = {}) {
    const src = body || {};
    const out = {
        name: partial ? optionalText(src.name, 160, 'نام پکیج') : requiredText(src.name, 160, 'نام پکیج'),
        procedure: optionalText(src.procedure, 160, 'درمان اصلی'),
        description: optionalText(src.description, 8000, 'توضیحات'),
        durationDays: optionalInt(src.durationDays, 1, 365, 'مدت اقامت'),
        price: optionalMoney(src.price),
        currency: optionalCurrency(src.currency),
        includes: optionalIncludes(src.includes),
        isActive: optionalBool(src.isActive),
    };
    if (partial && out.name === null) throw badRequest('نام پکیج الزامی است');
    const hasPrice = out.price != null;
    if (hasPrice && !out.currency && !partial) throw badRequest('برای قیمت، ارز را مشخص کنید');
    return stripUndefined(out);
}

function stripUndefined(obj) {
    Object.keys(obj).forEach((k) => {
        if (obj[k] === undefined) delete obj[k];
    });
    return obj;
}

module.exports = {
    ClinicError,
    badRequest,
    optionalText,
    requiredUuid,
    optionalUuid,
    optionalEnum,
    parseInstant,
    resolveAppointmentWindow,
    assertStatusTransition,
    normalizePatientInput,
    normalizeDoctorInput,
    normalizePackageInput,
};
