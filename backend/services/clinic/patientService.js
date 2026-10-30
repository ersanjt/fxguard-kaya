/**
 * Kaya CRM — پرونده بیماران (شماره پرونده یکتا، اتصال به مشتری، بدون حذف فیزیکی)
 * @file    backend/services/clinic/patientService.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const { ClinicPatient, ClinicAppointment, ClinicDoctor, Customer } = require('../../models');
const { PATIENT_SOURCES, APPOINTMENT_BLOCKING_STATUSES } = require('../../lib/clinicConstants');
const { ClinicError, normalizePatientInput, optionalEnum } = require('./validators');
const { requireTenant, likeOp, searchTerm, pageOf, notFound, isUniqueViolation } = require('./common');

const FILE_PREFIX = 'P-';
const FILE_DIGITS = 6;
const FILE_NUMBER_ATTEMPTS = 5;

function formatFileNumber(n) {
    return FILE_PREFIX + String(n).padStart(FILE_DIGITS, '0');
}

async function nextFileNumber(tenantId) {
    const last = await ClinicPatient.findOne({
        where: { tenantId, fileNumber: { [Op.like]: FILE_PREFIX + '%' } },
        attributes: ['fileNumber'],
        order: [['fileNumber', 'DESC']],
    });
    const lastNum = last ? parseInt(String(last.fileNumber).slice(FILE_PREFIX.length), 10) || 0 : 0;
    return formatFileNumber(lastNum + 1);
}

async function assertCustomerLinkable(tenantId, customerId, patientId) {
    if (!customerId) return;
    const customer = await Customer.findOne({ where: { id: customerId, tenantId }, attributes: ['id'] });
    if (!customer) throw notFound('مشتری');
    const taken = await ClinicPatient.findOne({ where: { tenantId, customerId }, attributes: ['id'] });
    if (taken && taken.id !== patientId) {
        throw new ClinicError(409, 'این مشتری قبلاً به پرونده بیمار دیگری متصل شده است', 'CUSTOMER_LINKED');
    }
}

async function listPatients(ctx, query) {
    const tenantId = requireTenant(ctx);
    const src = query || {};
    const { limit, offset, page } = pageOf(src);
    const where = { tenantId };
    const term = searchTerm(src.q);
    if (term) {
        const like = likeOp();
        where[Op.or] = [
            { fullName: { [like]: term } },
            { phone: { [like]: term } },
            { fileNumber: { [like]: term } },
            { passportNumber: { [like]: term } },
        ];
    }
    const source = optionalEnum(src.source, PATIENT_SOURCES, 'منبع بیمار');
    if (source) where.source = source;
    if (src.includeInactive !== 'true') where.isActive = true;

    const { rows, count } = await ClinicPatient.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });
    return { items: rows.map((r) => r.toJSON()), total: count, page, limit };
}

async function getPatient(ctx, id) {
    const tenantId = requireTenant(ctx);
    const patient = await ClinicPatient.findOne({
        where: { id, tenantId },
        include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }],
    });
    if (!patient) throw notFound('بیمار');
    const upcoming = await ClinicAppointment.findAll({
        where: {
            tenantId,
            patientId: patient.id,
            status: { [Op.in]: APPOINTMENT_BLOCKING_STATUSES },
            endsAt: { [Op.gte]: new Date() },
        },
        include: [{ model: ClinicDoctor, as: 'doctor', attributes: ['id', 'name', 'specialty'], required: false }],
        order: [['startsAt', 'ASC']],
        limit: 20,
    });
    return Object.assign(patient.toJSON(), { upcomingAppointments: upcoming.map((a) => a.toJSON()) });
}

async function createPatient(ctx, body) {
    const tenantId = requireTenant(ctx);
    const data = normalizePatientInput(body, { partial: false });
    await assertCustomerLinkable(tenantId, data.customerId, null);

    for (let attempt = 1; attempt <= FILE_NUMBER_ATTEMPTS; attempt += 1) {
        const fileNumber = await nextFileNumber(tenantId);
        try {
            const row = await ClinicPatient.create(
                Object.assign({}, data, { tenantId, fileNumber, createdBy: ctx.userId || null })
            );
            return row.toJSON();
        } catch (err) {
            if (!isUniqueViolation(err)) throw err;
            const fields = Object.keys(err.fields || {});
            if (fields.indexOf('customerId') >= 0) {
                throw new ClinicError(409, 'این مشتری قبلاً به پرونده بیمار دیگری متصل شده است', 'CUSTOMER_LINKED');
            }
            if (attempt === FILE_NUMBER_ATTEMPTS) throw err;
        }
    }
    throw new ClinicError(500, 'ایجاد شماره پرونده ناموفق بود');
}

async function updatePatient(ctx, id, body) {
    const tenantId = requireTenant(ctx);
    const patient = await ClinicPatient.findOne({ where: { id, tenantId } });
    if (!patient) throw notFound('بیمار');
    const data = normalizePatientInput(body, { partial: true });
    if (data.customerId !== undefined) await assertCustomerLinkable(tenantId, data.customerId, patient.id);
    await patient.update(data);
    return patient.toJSON();
}

module.exports = {
    listPatients,
    getPatient,
    createPatient,
    updatePatient,
    formatFileNumber,
};
