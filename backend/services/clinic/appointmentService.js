/**
 * Kaya CRM — نوبت‌دهی کلینیک (جلوگیری از تداخل، ماشین وضعیت، قفل ردیف پزشک)
 * @file    backend/services/clinic/appointmentService.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const {
    sequelize,
    ClinicAppointment,
    ClinicPatient,
    ClinicDoctor,
    ClinicTreatmentPackage,
} = require('../../models');
const {
    APPOINTMENT_STATUSES,
    APPOINTMENT_BLOCKING_STATUSES,
    APPOINTMENT_TRANSITIONS,
} = require('../../lib/clinicConstants');
const {
    ClinicError,
    requiredUuid,
    optionalUuid,
    optionalText,
    optionalEnum,
    parseInstant,
    resolveAppointmentWindow,
    assertStatusTransition,
} = require('./validators');
const { requireTenant, pageOf, notFound } = require('./common');

const LIST_INCLUDE = [
    { model: ClinicPatient, as: 'patient', attributes: ['id', 'fullName', 'fileNumber', 'phone'], required: false },
    { model: ClinicDoctor, as: 'doctor', attributes: ['id', 'name', 'specialty'], required: false },
    { model: ClinicTreatmentPackage, as: 'package', attributes: ['id', 'name'], required: false },
];

function isBlocking(status) {
    return APPOINTMENT_BLOCKING_STATUSES.indexOf(status) >= 0;
}

/** nextStatuses: کلاینت دکمه‌های وضعیت را از سرور می‌گیرد، نه از کپی محلی ماشین وضعیت. */
function toDto(row) {
    const json = row.toJSON();
    json.nextStatuses = (APPOINTMENT_TRANSITIONS[json.status] || []).slice();
    json.editable = isBlocking(json.status);
    return json;
}

async function loadActive(Model, tenantId, id, label, transaction, lock) {
    const row = await Model.findOne({
        where: { id, tenantId },
        transaction,
        lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
    });
    if (!row) throw notFound(label);
    if (row.isActive === false) throw new ClinicError(409, label + ' غیرفعال است', 'INACTIVE');
    return row;
}

/** پزشک یا بیمار در همان بازه نوبت فعال دیگری نداشته باشد. */
async function assertNoOverlap({ tenantId, doctorId, patientId, startsAt, endsAt, excludeId, transaction }) {
    const where = {
        tenantId,
        status: { [Op.in]: APPOINTMENT_BLOCKING_STATUSES },
        startsAt: { [Op.lt]: endsAt },
        endsAt: { [Op.gt]: startsAt },
        [Op.or]: [{ doctorId }, { patientId }],
    };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    const clash = await ClinicAppointment.findOne({ where, attributes: ['id', 'doctorId'], transaction });
    if (!clash) return;
    if (clash.doctorId === doctorId) {
        throw new ClinicError(409, 'پزشک در این بازهٔ زمانی نوبت دیگری دارد', 'DOCTOR_BUSY');
    }
    throw new ClinicError(409, 'بیمار در این بازهٔ زمانی نوبت دیگری دارد', 'PATIENT_BUSY');
}

async function reload(tenantId, id) {
    const row = await ClinicAppointment.findOne({ where: { id, tenantId }, include: LIST_INCLUDE });
    return row ? toDto(row) : null;
}

async function listAppointments(ctx, query) {
    const tenantId = requireTenant(ctx);
    const src = query || {};
    const { limit, offset, page } = pageOf(src);
    const where = { tenantId };
    const from = parseInstant(src.from, 'از تاریخ');
    const to = parseInstant(src.to, 'تا تاریخ');
    if (from && to && to <= from) throw new ClinicError(400, 'بازهٔ تاریخ نامعتبر است', 'VALIDATION');
    if (to) where.startsAt = { [Op.lt]: to };
    if (from) where.endsAt = { [Op.gt]: from };
    const doctorId = optionalUuid(src.doctorId, 'پزشک');
    const patientId = optionalUuid(src.patientId, 'بیمار');
    const status = optionalEnum(src.status, APPOINTMENT_STATUSES, 'وضعیت');
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const { rows, count } = await ClinicAppointment.findAndCountAll({
        where,
        include: LIST_INCLUDE,
        order: [['startsAt', 'ASC']],
        limit,
        offset,
        distinct: true,
    });
    return { items: rows.map(toDto), total: count, page, limit };
}

async function getAppointment(ctx, id) {
    const tenantId = requireTenant(ctx);
    const row = await reload(tenantId, id);
    if (!row) throw notFound('نوبت');
    return row;
}

async function createAppointment(ctx, body) {
    const tenantId = requireTenant(ctx);
    const src = body || {};
    const patientId = requiredUuid(src.patientId, 'بیمار');
    const doctorId = requiredUuid(src.doctorId, 'پزشک');
    const packageId = optionalUuid(src.packageId, 'پکیج') || null;
    const reason = optionalText(src.reason, 255, 'علت مراجعه') || null;
    const notes = optionalText(src.notes, 8000, 'یادداشت') || null;

    const id = await sequelize.transaction(async (transaction) => {
        const doctor = await loadActive(ClinicDoctor, tenantId, doctorId, 'پزشک', transaction, true);
        await loadActive(ClinicPatient, tenantId, patientId, 'بیمار', transaction, false);
        if (packageId) await loadActive(ClinicTreatmentPackage, tenantId, packageId, 'پکیج', transaction, false);
        const { startsAt, endsAt } = resolveAppointmentWindow(src, doctor.slotMinutes);
        await assertNoOverlap({ tenantId, doctorId, patientId, startsAt, endsAt, transaction });
        const row = await ClinicAppointment.create(
            {
                tenantId,
                patientId,
                doctorId,
                packageId,
                startsAt,
                endsAt,
                status: 'scheduled',
                reason,
                notes,
                createdBy: ctx.userId || null,
            },
            { transaction }
        );
        return row.id;
    });
    return reload(tenantId, id);
}

/** جابه‌جایی زمان/پزشک فقط برای نوبت‌های باز؛ متن برای همه. */
async function updateAppointment(ctx, id, body) {
    const tenantId = requireTenant(ctx);
    const src = body || {};
    const reschedule = ['startsAt', 'endsAt', 'durationMinutes', 'doctorId', 'packageId'].some(
        (k) => src[k] !== undefined
    );

    await sequelize.transaction(async (transaction) => {
        const row = await ClinicAppointment.findOne({ where: { id, tenantId }, transaction });
        if (!row) throw notFound('نوبت');
        const patch = {};
        const reason = optionalText(src.reason, 255, 'علت مراجعه');
        const notes = optionalText(src.notes, 8000, 'یادداشت');
        if (reason !== undefined) patch.reason = reason;
        if (notes !== undefined) patch.notes = notes;

        if (reschedule) {
            if (!isBlocking(row.status)) {
                throw new ClinicError(409, 'نوبت بسته‌شده قابل جابه‌جایی نیست', 'APPOINTMENT_CLOSED');
            }
            const doctorId = src.doctorId !== undefined ? requiredUuid(src.doctorId, 'پزشک') : row.doctorId;
            const doctor = await loadActive(ClinicDoctor, tenantId, doctorId, 'پزشک', transaction, true);
            if (src.packageId !== undefined) {
                patch.packageId = optionalUuid(src.packageId, 'پکیج') || null;
                if (patch.packageId) {
                    await loadActive(ClinicTreatmentPackage, tenantId, patch.packageId, 'پکیج', transaction, false);
                }
            }
            const timeInput = {
                startsAt: src.startsAt !== undefined ? src.startsAt : row.startsAt,
                endsAt: src.endsAt,
                durationMinutes: src.durationMinutes,
            };
            if (timeInput.endsAt === undefined && timeInput.durationMinutes === undefined) {
                timeInput.durationMinutes = Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60000);
            }
            const { startsAt, endsAt } = resolveAppointmentWindow(timeInput, doctor.slotMinutes);
            await assertNoOverlap({
                tenantId,
                doctorId,
                patientId: row.patientId,
                startsAt,
                endsAt,
                excludeId: row.id,
                transaction,
            });
            Object.assign(patch, { doctorId, startsAt, endsAt });
        }
        if (Object.keys(patch).length) await row.update(patch, { transaction });
    });
    return reload(tenantId, id);
}

async function changeAppointmentStatus(ctx, id, nextStatus) {
    const tenantId = requireTenant(ctx);
    const status = String(nextStatus || '').trim();
    const row = await ClinicAppointment.findOne({ where: { id, tenantId } });
    if (!row) throw notFound('نوبت');
    assertStatusTransition(row.status, status);
    if (row.status !== status) {
        await row.update({ status, cancelledAt: status === 'cancelled' ? new Date() : null });
    }
    return reload(tenantId, id);
}

module.exports = {
    listAppointments,
    getAppointment,
    createAppointment,
    updateAppointment,
    changeAppointmentStatus,
};
