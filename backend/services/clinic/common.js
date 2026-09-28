/**
 * Kaya CRM — ابزار مشترک سرویس‌های کلینیک (زمینهٔ سازمان، جست‌وجو، صفحه‌بندی)
 * @file    backend/services/clinic/common.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../../models');
const { parsePagination, safeString } = require('../../lib/validation');
const { ClinicError } = require('./validators');

/**
 * هر فراخوانی سرویس کلینیک باید tenantId صریح داشته باشد؛ هوک tenantScope
 * فقط وقتی AsyncLocalStorage پر است فیلتر می‌کند و اینجا به آن تکیه نمی‌کنیم.
 * @param {{ tenantId?: string, userId?: string }} ctx
 */
function requireTenant(ctx) {
    const tenantId = ctx && ctx.tenantId ? String(ctx.tenantId) : '';
    if (!tenantId) throw new ClinicError(400, 'سازمان مشخص نیست', 'TENANT_REQUIRED');
    return tenantId;
}

function likeOp() {
    return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
}

function escapeLike(term) {
    return term.replace(/[\\%_]/g, (c) => '\\' + c);
}

function searchTerm(q) {
    const s = safeString(q, 80);
    return s ? '%' + escapeLike(s) + '%' : null;
}

function pageOf(query) {
    const src = query || {};
    return parsePagination(src.page, src.limit, 100);
}

function notFound(label) {
    return new ClinicError(404, label + ' یافت نشد', 'NOT_FOUND');
}

function isUniqueViolation(err) {
    return !!err && (err.name === 'SequelizeUniqueConstraintError' || err.original?.code === '23505');
}

module.exports = {
    requireTenant,
    likeOp,
    searchTerm,
    pageOf,
    notFound,
    isUniqueViolation,
};
