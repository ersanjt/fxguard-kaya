/**
 * Kaya CRM — پکیج‌های درمانی / گردشگری سلامت
 * @file    backend/services/clinic/packageService.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const { ClinicTreatmentPackage } = require('../../models');
const { ClinicError, normalizePackageInput } = require('./validators');
const { requireTenant, likeOp, searchTerm, pageOf, notFound } = require('./common');

/** DECIMAL در Postgres رشته برمی‌گردد؛ خروجی API همیشه عدد است. */
function toDto(row) {
    const json = row.toJSON();
    json.price = json.price == null ? null : Number(json.price);
    return json;
}

async function listPackages(ctx, query) {
    const tenantId = requireTenant(ctx);
    const src = query || {};
    const { limit, offset, page } = pageOf(src);
    const where = { tenantId };
    const term = searchTerm(src.q);
    if (term) {
        const like = likeOp();
        where[Op.or] = [{ name: { [like]: term } }, { procedure: { [like]: term } }];
    }
    if (src.includeInactive !== 'true') where.isActive = true;
    const { rows, count } = await ClinicTreatmentPackage.findAndCountAll({
        where,
        order: [['name', 'ASC']],
        limit,
        offset,
    });
    return { items: rows.map(toDto), total: count, page, limit };
}

async function getPackage(ctx, id) {
    const tenantId = requireTenant(ctx);
    const row = await ClinicTreatmentPackage.findOne({ where: { id, tenantId } });
    if (!row) throw notFound('پکیج');
    return toDto(row);
}

async function createPackage(ctx, body) {
    const tenantId = requireTenant(ctx);
    const data = normalizePackageInput(body, { partial: false });
    const row = await ClinicTreatmentPackage.create(Object.assign({}, data, { tenantId }));
    return toDto(row);
}

async function updatePackage(ctx, id, body) {
    const tenantId = requireTenant(ctx);
    const row = await ClinicTreatmentPackage.findOne({ where: { id, tenantId } });
    if (!row) throw notFound('پکیج');
    const data = normalizePackageInput(body, { partial: true });
    const nextPrice = data.price !== undefined ? data.price : row.price;
    const nextCurrency = data.currency !== undefined ? data.currency : row.currency;
    if (nextPrice != null && !nextCurrency) {
        throw new ClinicError(400, 'برای قیمت، ارز را مشخص کنید', 'VALIDATION');
    }
    await row.update(data);
    return toDto(row);
}

module.exports = { listPackages, getPackage, createPackage, updatePackage };
