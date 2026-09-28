/**
 * Kaya CRM — پزشکان کلینیک (اتصال اختیاری به کاربر پنل، غیرفعال‌سازی به‌جای حذف)
 * @file    backend/services/clinic/doctorService.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const { ClinicDoctor, User } = require('../../models');
const { normalizeDoctorInput } = require('./validators');
const { requireTenant, likeOp, searchTerm, pageOf, notFound } = require('./common');

async function assertUserInTenant(tenantId, userId) {
    if (!userId) return;
    const user = await User.findOne({ where: { id: userId, tenantId }, attributes: ['id'] });
    if (!user) throw notFound('کاربر');
}

async function listDoctors(ctx, query) {
    const tenantId = requireTenant(ctx);
    const src = query || {};
    const { limit, offset, page } = pageOf(src);
    const where = { tenantId };
    const term = searchTerm(src.q);
    if (term) {
        const like = likeOp();
        where[Op.or] = [{ name: { [like]: term } }, { specialty: { [like]: term } }];
    }
    if (src.includeInactive !== 'true') where.isActive = true;
    const { rows, count } = await ClinicDoctor.findAndCountAll({
        where,
        order: [['name', 'ASC']],
        limit,
        offset,
    });
    return { items: rows.map((r) => r.toJSON()), total: count, page, limit };
}

async function getDoctor(ctx, id) {
    const tenantId = requireTenant(ctx);
    const doctor = await ClinicDoctor.findOne({ where: { id, tenantId } });
    if (!doctor) throw notFound('پزشک');
    return doctor.toJSON();
}

async function createDoctor(ctx, body) {
    const tenantId = requireTenant(ctx);
    const data = normalizeDoctorInput(body, { partial: false });
    await assertUserInTenant(tenantId, data.userId);
    const row = await ClinicDoctor.create(Object.assign({}, data, { tenantId }));
    return row.toJSON();
}

async function updateDoctor(ctx, id, body) {
    const tenantId = requireTenant(ctx);
    const doctor = await ClinicDoctor.findOne({ where: { id, tenantId } });
    if (!doctor) throw notFound('پزشک');
    const data = normalizeDoctorInput(body, { partial: true });
    if (data.userId !== undefined) await assertUserInTenant(tenantId, data.userId);
    await doctor.update(data);
    return doctor.toJSON();
}

module.exports = { listDoctors, getDoctor, createDoctor, updateDoctor };
