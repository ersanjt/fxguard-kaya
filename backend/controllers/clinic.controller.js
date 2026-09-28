/**
 * Kaya CRM — کنترلر ماژول کلینیک (HTTP ↔ services/clinic)
 * @file    backend/controllers/clinic.controller.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const clinic = require('../services/clinic');
const { isMainAdmin } = require('../lib/permissions');
const { isValidUUID } = require('../lib/validation');

const MANAGER_ROLES = ['owner', 'admin', 'manager'];

function ctxOf(req) {
    return { tenantId: req.tenant && req.tenant.id, userId: req.userId || (req.user && req.user.id) };
}

function sendError(res, next, err) {
    if (err instanceof clinic.ClinicError) {
        const body = { error: err.message };
        if (err.code) body.code = err.code;
        return res.status(err.status).json(body);
    }
    return next(err);
}

/** پزشکان و پکیج‌ها پیکربندی کلینیک‌اند؛ فقط مدیران تغییرشان می‌دهند. */
function requireClinicManager(req, res, next) {
    if (isMainAdmin(req.user) || MANAGER_ROLES.indexOf(req.user && req.user.role) >= 0) return next();
    return res.status(403).json({ error: 'فقط مدیران می‌توانند این بخش را ویرایش کنند', code: 'CLINIC_MANAGER_ONLY' });
}

function validateIdParam(req, res, next) {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است', code: 'VALIDATION' });
    return next();
}

function listHandler(fn) {
    return async (req, res, next) => {
        try {
            const out = await fn(ctxOf(req), req.query);
            res.json({ data: out.items, total: out.total, page: out.page, limit: out.limit });
        } catch (err) {
            sendError(res, next, err);
        }
    };
}

function getHandler(fn) {
    return async (req, res, next) => {
        try {
            res.json({ data: await fn(ctxOf(req), req.params.id) });
        } catch (err) {
            sendError(res, next, err);
        }
    };
}

function createHandler(fn) {
    return async (req, res, next) => {
        try {
            res.status(201).json({ data: await fn(ctxOf(req), req.body) });
        } catch (err) {
            sendError(res, next, err);
        }
    };
}

function updateHandler(fn) {
    return async (req, res, next) => {
        try {
            res.json({ data: await fn(ctxOf(req), req.params.id, req.body) });
        } catch (err) {
            sendError(res, next, err);
        }
    };
}

async function changeAppointmentStatus(req, res, next) {
    try {
        const status = req.body && req.body.status;
        res.json({ data: await clinic.appointments.changeAppointmentStatus(ctxOf(req), req.params.id, status) });
    } catch (err) {
        sendError(res, next, err);
    }
}

module.exports = {
    requireClinicManager,
    validateIdParam,
    patients: {
        list: listHandler(clinic.patients.listPatients),
        get: getHandler(clinic.patients.getPatient),
        create: createHandler(clinic.patients.createPatient),
        update: updateHandler(clinic.patients.updatePatient),
    },
    doctors: {
        list: listHandler(clinic.doctors.listDoctors),
        get: getHandler(clinic.doctors.getDoctor),
        create: createHandler(clinic.doctors.createDoctor),
        update: updateHandler(clinic.doctors.updateDoctor),
    },
    packages: {
        list: listHandler(clinic.packages.listPackages),
        get: getHandler(clinic.packages.getPackage),
        create: createHandler(clinic.packages.createPackage),
        update: updateHandler(clinic.packages.updatePackage),
    },
    appointments: {
        list: listHandler(clinic.appointments.listAppointments),
        get: getHandler(clinic.appointments.getAppointment),
        create: createHandler(clinic.appointments.createAppointment),
        update: updateHandler(clinic.appointments.updateAppointment),
        changeStatus: changeAppointmentStatus,
    },
};
