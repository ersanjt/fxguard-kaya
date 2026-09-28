/**
 * Unit tests for clinic input normalization, appointment windows and status machine
 */
'use strict';

const assert = require('assert');
const {
    ClinicError,
    normalizePatientInput,
    normalizeDoctorInput,
    normalizePackageInput,
    resolveAppointmentWindow,
    assertStatusTransition,
} = require('../services/clinic/validators');
const { APPOINTMENT_STATUSES, APPOINTMENT_TRANSITIONS } = require('../lib/clinicConstants');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓', name);
    } catch (err) {
        failed++;
        console.error('  ✗', name, '→', err.message);
    }
}

function throwsStatus(fn, status, code) {
    try {
        fn();
    } catch (err) {
        assert.ok(err instanceof ClinicError, 'expected ClinicError, got ' + err.name);
        assert.strictEqual(err.status, status);
        if (code) assert.strictEqual(err.code, code);
        return;
    }
    assert.fail('expected ClinicError ' + status);
}

console.log('clinic validators tests\n');

test('patient: name required on create, trimmed, source defaults to local', () => {
    throwsStatus(() => normalizePatientInput({}), 400, 'VALIDATION');
    const p = normalizePatientInput({ fullName: '  Sara  ', email: 'A@B.CO', nationality: 'de' });
    assert.strictEqual(p.fullName, 'Sara');
    assert.strictEqual(p.email, 'a@b.co');
    assert.strictEqual(p.nationality, 'DE');
    assert.strictEqual(p.source, 'local');
});

test('patient: partial update leaves unsent fields untouched and clears empty ones', () => {
    const p = normalizePatientInput({ phone: '' }, { partial: true });
    assert.deepStrictEqual(p, { phone: null });
    throwsStatus(() => normalizePatientInput({ fullName: '' }, { partial: true }), 400);
});

test('patient: rejects bad enums, email, country and future/invalid birth dates', () => {
    const now = new Date('2026-09-28T12:00:00Z');
    throwsStatus(() => normalizePatientInput({ fullName: 'x', gender: 'robot' }), 400);
    throwsStatus(() => normalizePatientInput({ fullName: 'x', bloodType: 'C+' }), 400);
    throwsStatus(() => normalizePatientInput({ fullName: 'x', email: 'nope' }), 400);
    throwsStatus(() => normalizePatientInput({ fullName: 'x', nationality: 'DEU' }), 400);
    throwsStatus(() => normalizePatientInput({ fullName: 'x', birthDate: '2026-02-30' }, { now }), 400);
    throwsStatus(() => normalizePatientInput({ fullName: 'x', birthDate: '2027-01-01' }, { now }), 400);
    assert.strictEqual(normalizePatientInput({ fullName: 'x', birthDate: '1990-05-01' }, { now }).birthDate, '1990-05-01');
});

test('doctor: languages are deduplicated ISO codes; slot bounded', () => {
    const d = normalizeDoctorInput({ name: 'Dr. A', languages: ['EN', 'fa', 'en'], slotMinutes: 20 });
    assert.deepStrictEqual(d.languages, ['en', 'fa']);
    assert.strictEqual(d.slotMinutes, 20);
    throwsStatus(() => normalizeDoctorInput({ name: 'Dr. A', languages: ['english'] }), 400);
    throwsStatus(() => normalizeDoctorInput({ name: 'Dr. A', slotMinutes: 2 }), 400);
});

test('package: price needs currency; includes restricted to known services', () => {
    throwsStatus(() => normalizePackageInput({ name: 'Rhino', price: 2500 }), 400);
    const p = normalizePackageInput({ name: 'Rhino', price: '2500.456', currency: 'eur', includes: ['hotel', 'hotel'] });
    assert.strictEqual(p.price, 2500.46);
    assert.strictEqual(p.currency, 'EUR');
    assert.deepStrictEqual(p.includes, ['hotel']);
    throwsStatus(() => normalizePackageInput({ name: 'Rhino', includes: ['spa'] }), 400);
    throwsStatus(() => normalizePackageInput({ name: 'Rhino', price: -1, currency: 'EUR' }), 400);
});

test('appointment window: explicit end, duration, doctor default, bounds', () => {
    const start = '2026-10-01T09:00:00.000Z';
    let w = resolveAppointmentWindow({ startsAt: start, endsAt: '2026-10-01T09:45:00.000Z' }, 30);
    assert.strictEqual((w.endsAt - w.startsAt) / 60000, 45);
    w = resolveAppointmentWindow({ startsAt: start, durationMinutes: 15 }, 30);
    assert.strictEqual((w.endsAt - w.startsAt) / 60000, 15);
    w = resolveAppointmentWindow({ startsAt: start }, 40);
    assert.strictEqual((w.endsAt - w.startsAt) / 60000, 40);
    throwsStatus(() => resolveAppointmentWindow({}, 30), 400);
    throwsStatus(() => resolveAppointmentWindow({ startsAt: 'yesterday' }, 30), 400);
    throwsStatus(() => resolveAppointmentWindow({ startsAt: start, endsAt: start }, 30), 400);
    throwsStatus(() => resolveAppointmentWindow({ startsAt: start, durationMinutes: 13 * 60 }, 30), 400);
});

test('status machine: allowed moves pass, terminal states are final', () => {
    assertStatusTransition('scheduled', 'confirmed');
    assertStatusTransition('confirmed', 'checked_in');
    assertStatusTransition('checked_in', 'completed');
    assertStatusTransition('completed', 'completed');
    throwsStatus(() => assertStatusTransition('scheduled', 'completed'), 409, 'INVALID_TRANSITION');
    throwsStatus(() => assertStatusTransition('cancelled', 'scheduled'), 409, 'INVALID_TRANSITION');
    throwsStatus(() => assertStatusTransition('scheduled', 'lost'), 400);
});

test('status machine only references known statuses', () => {
    Object.keys(APPOINTMENT_TRANSITIONS).forEach((from) => {
        assert.ok(APPOINTMENT_STATUSES.indexOf(from) >= 0, from);
        APPOINTMENT_TRANSITIONS[from].forEach((to) => assert.ok(APPOINTMENT_STATUSES.indexOf(to) >= 0, from + '→' + to));
    });
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
