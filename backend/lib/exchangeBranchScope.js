/**
 * محدودهٔ شعبه برای صندوق / حساب / تراکنش صرافی.
 * @file    backend/lib/exchangeBranchScope.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { isMainAdmin } = require('./permissions');

const FORBIDDEN = 'دسترسی به داده‌های این شعبه ندارید';
const NO_BRANCH = 'شعبه برای این حساب تعریف نشده است';

function canSeeAllExchangeBranches(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    const role = user.role;
    return role === 'owner' || role === 'admin';
}

function applyExchangeBranchFilter(user, queryBranchId) {
    const q = queryBranchId ? String(queryBranchId) : '';
    if (canSeeAllExchangeBranches(user)) {
        const where = {};
        if (q) where.branchId = q;
        return { ok: true, empty: false, where };
    }
    const bid = user && user.branchId ? String(user.branchId) : '';
    if (!bid) return { ok: true, empty: true, where: {} };
    if (q && q !== bid) {
        return { ok: false, status: 403, error: FORBIDDEN, empty: false, where: {} };
    }
    return { ok: true, empty: false, where: { branchId: bid } };
}

function denyIfWrongBranch(user, recordBranchId) {
    if (canSeeAllExchangeBranches(user)) return { ok: true };
    const bid = user && user.branchId ? String(user.branchId) : '';
    const rec = recordBranchId ? String(recordBranchId) : '';
    if (!bid || !rec || rec !== bid) {
        return { ok: false, status: 403, error: FORBIDDEN };
    }
    return { ok: true };
}

function assignWriteBranchId(user, requestedBranchId) {
    const requested = requestedBranchId ? String(requestedBranchId) : '';
    if (canSeeAllExchangeBranches(user)) {
        return { ok: true, branchId: requested || null };
    }
    const bid = user && user.branchId ? String(user.branchId) : '';
    if (!bid) return { ok: false, status: 403, error: NO_BRANCH };
    if (requested && requested !== bid) {
        return { ok: false, status: 403, error: FORBIDDEN };
    }
    return { ok: true, branchId: bid };
}

module.exports = {
    canSeeAllExchangeBranches,
    applyExchangeBranchFilter,
    denyIfWrongBranch,
    assignWriteBranchId
};
