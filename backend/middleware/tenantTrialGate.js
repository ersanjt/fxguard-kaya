/**
 * Kaya CRM — قفل API پس از پایان آزمایش یا عدم پرداخت
 * @file    backend/middleware/tenantTrialGate.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { tenantAccessState, isTrialGateExemptPath, trialErrorPayload } = require('../lib/tenantTrial');

function tenantTrialGate(req, res, next) {
    const tenant = req.tenant;
    if (!tenant || tenant.isPlatform || tenant.missing) return next();
    const path = String(req.originalUrl || req.url || req.path || '');
    if (isTrialGateExemptPath(req.method, path)) return next();
    const state = tenantAccessState(tenant);
    if (state.ok) return next();
    return res.status(402).json(trialErrorPayload(state));
}

module.exports = { tenantTrialGate };
