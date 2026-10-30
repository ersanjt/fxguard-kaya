/**
 * Kaya CRM — مقادیر ثابت ماژول کلینیک و توریسم سلامت
 * @file    backend/lib/clinicConstants.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const PATIENT_GENDERS = ['female', 'male', 'other'];
const PATIENT_SOURCES = ['local', 'health_tourism'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];

/** وضعیت‌هایی که بازهٔ زمانی پزشک را اشغال می‌کنند. */
const APPOINTMENT_BLOCKING_STATUSES = ['scheduled', 'confirmed', 'checked_in'];

/** گذارهای مجاز وضعیت نوبت؛ وضعیت‌های پایانی خروجی ندارند. */
const APPOINTMENT_TRANSITIONS = {
    scheduled: ['confirmed', 'checked_in', 'cancelled', 'no_show'],
    confirmed: ['checked_in', 'cancelled', 'no_show', 'scheduled'],
    checked_in: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
};

const PACKAGE_INCLUDES = ['hotel', 'airport_transfer', 'interpreter', 'visa_support', 'follow_up'];

const MIN_APPOINTMENT_MINUTES = 5;
const MAX_APPOINTMENT_MINUTES = 12 * 60;

module.exports = {
    PATIENT_GENDERS,
    PATIENT_SOURCES,
    BLOOD_TYPES,
    APPOINTMENT_STATUSES,
    APPOINTMENT_BLOCKING_STATUSES,
    APPOINTMENT_TRANSITIONS,
    PACKAGE_INCLUDES,
    MIN_APPOINTMENT_MINUTES,
    MAX_APPOINTMENT_MINUTES,
};
