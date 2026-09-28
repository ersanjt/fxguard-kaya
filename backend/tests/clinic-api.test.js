/**
 * Clinic module HTTP tests — skill gate, tenant isolation, booking rules (SQLite in-process)
 */
'use strict';

process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.ENCRYPT_SECRET = 'test-encrypt-secret-32-chars-min!';
process.env.MAIN_ADMIN_EMAIL = 'admin@test.com';
process.env.MAIN_ADMIN_PASSWORD = 'Admin@Test123!';
process.env.NODE_ENV = 'test';
process.env.PORT = '3104';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.WEBHOOK_SECRET = '';
process.env.SELF_SERVE_SIGNUP = 'true';
process.env.TENANT_BASE_HOST = 'app.fxguard.io';
process.env.SELF_SERVE_PUBLIC_PROTO = 'http';
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const assert = require('assert');
const supertest = require('supertest');

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
    try {
        await fn();
        console.log('  ✓', name);
        passed++;
    } catch (err) {
        console.error('  ✗', name);
        console.error('    →', err.message);
        failed++;
        failures.push({ name, error: err.message });
    }
}

const PASSWORD = 'Secret123';

async function main() {
    console.log('clinic API tests\n');
    const serverModule = require('../server');
    const req = supertest(serverModule.app);
    await serverModule.ready;

    async function signup(slug, industry) {
        const r = await req
            .post('/api/tenants/signup')
            .set('Host', 'app.fxguard.io')
            .send({ slug, email: 'owner@' + slug + '.test', password: PASSWORD, companyName: slug, industry });
        assert.strictEqual(r.status, 201, JSON.stringify(r.body));
    }

    async function session(slug, email) {
        const host = slug + '.app.fxguard.io';
        const login = await req.post('/api/auth/login').set('Host', host).send({ email, password: PASSWORD });
        assert.strictEqual(login.status, 200, JSON.stringify(login.body));
        const cookie = login.headers['set-cookie'] || '';
        const token = login.body.token ? 'Bearer ' + login.body.token : '';
        const wrap = (r) => r.set('Host', host).set('Cookie', cookie).set('Authorization', token);
        return {
            get: (url) => wrap(req.get(url)),
            post: (url, body) => wrap(req.post(url)).send(body || {}),
            patch: (url, body) => wrap(req.patch(url)).send(body || {}),
            put: (url, body) => wrap(req.put(url)).send(body || {}),
        };
    }

    const at = (hhmm) => '2031-03-10T' + hhmm + ':00.000Z';

    try {
        await signup('clinic-a', 'health');
        await signup('clinic-b', 'health');
        await signup('plain-desk', 'general');
        const a = await session('clinic-a', 'owner@clinic-a.test');
        const b = await session('clinic-b', 'owner@clinic-b.test');
        const plain = await session('plain-desk', 'owner@plain-desk.test');

        const state = {};

        await test('non-health panel is blocked by the skill gate (any letter case)', async () => {
            const r = await plain.get('/api/clinic/patients');
            assert.strictEqual(r.status, 403);
            assert.strictEqual(r.body.code, 'SKILL_DISABLED');
            const upper = await plain.get('/api/CLINIC/Patients');
            assert.strictEqual(upper.status, 403);
            assert.strictEqual(upper.body.code, 'SKILL_DISABLED');
        });

        await test('clinic sidebar pages are visible for a health panel only', async () => {
            const va = await a.get('/api/panel-settings/public/visibility');
            assert.ok(va.body.hiddenSections.indexOf('clinic-patients') < 0);
            assert.ok(va.body.hiddenSections.indexOf('clinic-appointments') < 0);
            const vp = await plain.get('/api/panel-settings/public/visibility');
            assert.ok(vp.body.hiddenSections.indexOf('clinic-patients') >= 0);
        });

        await test('owner creates doctor, package and patients with sequential file numbers', async () => {
            const doc = await a.post('/api/clinic/doctors', { name: 'Dr. Rahimi', specialty: 'ENT', slotMinutes: 30 });
            assert.strictEqual(doc.status, 201, JSON.stringify(doc.body));
            state.doctorId = doc.body.data.id;
            const doc2 = await a.post('/api/clinic/doctors', { name: 'Dr. Karimi', languages: ['en', 'ar'] });
            assert.strictEqual(doc2.status, 201);
            state.doctor2Id = doc2.body.data.id;

            const pkg = await a.post('/api/clinic/packages', {
                name: 'Rhinoplasty 7 nights',
                price: 2500,
                currency: 'eur',
                durationDays: 7,
                includes: ['hotel', 'airport_transfer'],
            });
            assert.strictEqual(pkg.status, 201, JSON.stringify(pkg.body));
            assert.strictEqual(pkg.body.data.price, 2500);
            assert.strictEqual(pkg.body.data.currency, 'EUR');
            state.packageId = pkg.body.data.id;

            const p1 = await a.post('/api/clinic/patients', { fullName: 'Sara Ahmadi', phone: '+49 151 000' });
            const p2 = await a.post('/api/clinic/patients', {
                fullName: 'John Doe',
                source: 'health_tourism',
                nationality: 'gb',
                passportNumber: 'X1234567',
            });
            assert.strictEqual(p1.status, 201, JSON.stringify(p1.body));
            assert.strictEqual(p1.body.data.fileNumber, 'P-000001');
            assert.strictEqual(p2.body.data.fileNumber, 'P-000002');
            assert.strictEqual(p2.body.data.nationality, 'GB');
            state.patientId = p1.body.data.id;
            state.patient2Id = p2.body.data.id;
        });

        await test('invalid input is rejected with 400', async () => {
            assert.strictEqual((await a.post('/api/clinic/patients', {})).status, 400);
            assert.strictEqual((await a.post('/api/clinic/patients', { fullName: 'x', birthDate: '3000-01-01' })).status, 400);
            assert.strictEqual((await a.get('/api/clinic/patients/not-a-uuid')).status, 400);
            assert.strictEqual((await a.post('/api/clinic/packages', { name: 'x', price: 10 })).status, 400);
        });

        await test('patient search matches name and file number', async () => {
            const byName = await a.get('/api/clinic/patients?q=sara');
            assert.strictEqual(byName.status, 200);
            assert.strictEqual(byName.body.total, 1);
            const byFile = await a.get('/api/clinic/patients?q=P-000002');
            assert.strictEqual(byFile.body.data[0].fullName, 'John Doe');
            const tourists = await a.get('/api/clinic/patients?source=health_tourism');
            assert.strictEqual(tourists.body.total, 1);
        });

        await test('booking uses doctor slot length and blocks overlaps', async () => {
            const ok = await a.post('/api/clinic/appointments', {
                patientId: state.patientId,
                doctorId: state.doctorId,
                packageId: state.packageId,
                startsAt: at('09:00'),
                reason: 'Consultation',
            });
            assert.strictEqual(ok.status, 201, JSON.stringify(ok.body));
            assert.strictEqual(ok.body.data.status, 'scheduled');
            assert.ok(ok.body.data.nextStatuses.indexOf('confirmed') >= 0);
            assert.strictEqual(ok.body.data.editable, true);
            assert.strictEqual(new Date(ok.body.data.endsAt).toISOString(), at('09:30'));
            assert.strictEqual(ok.body.data.patient.fileNumber, 'P-000001');
            assert.strictEqual(ok.body.data.doctor.name, 'Dr. Rahimi');
            state.apptId = ok.body.data.id;

            const clash = await a.post('/api/clinic/appointments', {
                patientId: state.patient2Id,
                doctorId: state.doctorId,
                startsAt: at('09:15'),
            });
            assert.strictEqual(clash.status, 409);
            assert.strictEqual(clash.body.code, 'DOCTOR_BUSY');

            const patientClash = await a.post('/api/clinic/appointments', {
                patientId: state.patientId,
                doctorId: state.doctor2Id,
                startsAt: at('09:10'),
                durationMinutes: 10,
            });
            assert.strictEqual(patientClash.status, 409);
            assert.strictEqual(patientClash.body.code, 'PATIENT_BUSY');

            const backToBack = await a.post('/api/clinic/appointments', {
                patientId: state.patient2Id,
                doctorId: state.doctorId,
                startsAt: at('09:30'),
            });
            assert.strictEqual(backToBack.status, 201, JSON.stringify(backToBack.body));
            state.appt2Id = backToBack.body.data.id;
        });

        await test('rescheduling re-checks overlaps and excludes itself', async () => {
            const onto = await a.patch('/api/clinic/appointments/' + state.appt2Id, { startsAt: at('09:20') });
            assert.strictEqual(onto.status, 409);
            const later = await a.patch('/api/clinic/appointments/' + state.appt2Id, { startsAt: at('10:00') });
            assert.strictEqual(later.status, 200, JSON.stringify(later.body));
            assert.strictEqual(new Date(later.body.data.endsAt).toISOString(), at('10:30'));
        });

        await test('status machine enforces order; cancelling frees the slot', async () => {
            const url = '/api/clinic/appointments/' + state.apptId + '/status';
            const skip = await a.post(url, { status: 'completed' });
            assert.strictEqual(skip.status, 409);
            assert.strictEqual(skip.body.code, 'INVALID_TRANSITION');
            assert.strictEqual((await a.post(url, { status: 'checked_in' })).status, 200);
            const done = await a.post(url, { status: 'completed' });
            assert.strictEqual(done.status, 200);
            assert.strictEqual(done.body.data.status, 'completed');
            assert.strictEqual((await a.post(url, { status: 'scheduled' })).status, 409);
            const move = await a.patch('/api/clinic/appointments/' + state.apptId, { startsAt: at('12:00') });
            assert.strictEqual(move.status, 409);
            assert.strictEqual(move.body.code, 'APPOINTMENT_CLOSED');

            const cancel = await a.post('/api/clinic/appointments/' + state.appt2Id + '/status', { status: 'cancelled' });
            assert.strictEqual(cancel.status, 200);
            assert.ok(cancel.body.data.cancelledAt);
            const reuse = await a.post('/api/clinic/appointments', {
                patientId: state.patient2Id,
                doctorId: state.doctorId,
                startsAt: at('10:00'),
            });
            assert.strictEqual(reuse.status, 201, JSON.stringify(reuse.body));
        });

        await test('appointment list filters by day and doctor', async () => {
            const r = await a.get(
                '/api/clinic/appointments?from=' + at('00:00') + '&to=2031-03-11T00:00:00.000Z&doctorId=' + state.doctorId
            );
            assert.strictEqual(r.status, 200);
            assert.strictEqual(r.body.total, 3);
            const cancelled = await a.get('/api/clinic/appointments?status=cancelled');
            assert.strictEqual(cancelled.body.total, 1);
        });

        await test('inactive doctors cannot take new bookings', async () => {
            const off = await a.patch('/api/clinic/doctors/' + state.doctor2Id, { isActive: false });
            assert.strictEqual(off.status, 200);
            const r = await a.post('/api/clinic/appointments', {
                patientId: state.patient2Id,
                doctorId: state.doctor2Id,
                startsAt: at('15:00'),
            });
            assert.strictEqual(r.status, 409);
            assert.strictEqual(r.body.code, 'INACTIVE');
        });

        await test('another clinic sees none of this data and cannot reference it', async () => {
            const list = await b.get('/api/clinic/patients');
            assert.strictEqual(list.status, 200);
            assert.strictEqual(list.body.total, 0);
            assert.strictEqual((await b.get('/api/clinic/patients/' + state.patientId)).status, 404);
            assert.strictEqual((await b.patch('/api/clinic/doctors/' + state.doctorId, { name: 'Hacked' })).status, 404);
            const own = await b.post('/api/clinic/patients', { fullName: 'Own patient' });
            assert.strictEqual(own.body.data.fileNumber, 'P-000001');
            const cross = await b.post('/api/clinic/appointments', {
                patientId: own.body.data.id,
                doctorId: state.doctorId,
                startsAt: at('11:00'),
            });
            assert.strictEqual(cross.status, 404);
            assert.strictEqual((await b.get('/api/clinic/appointments')).body.total, 0);
        });

        await test('staff agents book appointments but cannot edit doctors or packages', async () => {
            const { User, Tenant } = require('../models');
            const tenant = await Tenant.findOne({ where: { slug: 'clinic-a' } });
            await User.create({
                tenantId: tenant.id,
                name: 'Reception',
                email: 'reception@clinic-a.test',
                password: PASSWORD,
                role: 'agent',
                isActive: true,
            });
            const agent = await session('clinic-a', 'reception@clinic-a.test');
            assert.strictEqual((await agent.get('/api/clinic/doctors')).status, 200);
            const denied = await agent.post('/api/clinic/doctors', { name: 'Dr. X' });
            assert.strictEqual(denied.status, 403);
            assert.strictEqual(denied.body.code, 'CLINIC_MANAGER_ONLY');
            assert.strictEqual((await agent.post('/api/clinic/packages', { name: 'P' })).status, 403);
            const p = await agent.post('/api/clinic/patients', { fullName: 'Walk-in' });
            assert.strictEqual(p.status, 201);
            assert.strictEqual(p.body.data.fileNumber, 'P-000003');
        });

        await test('turning the skill off locks the API again', async () => {
            const off = await a.put('/api/tenants/skills', { industry: 'health', enabledSkills: ['treatment_packages'] });
            assert.strictEqual(off.status, 200, JSON.stringify(off.body));
            const r = await a.get('/api/clinic/appointments');
            assert.strictEqual(r.status, 403);
            assert.strictEqual(r.body.code, 'SKILL_DISABLED');
            assert.strictEqual((await a.get('/api/clinic/packages')).status, 200);
        });
    } finally {
        try {
            const { sequelize } = require('../models');
            await sequelize.close();
        } catch (_) {}
        try {
            if (serverModule.server && serverModule.server.close) {
                await new Promise((resolve) => serverModule.server.close(() => resolve()));
            }
        } catch (_) {}
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed) {
        failures.forEach((f) => console.error(' -', f.name, f.error));
    }
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
