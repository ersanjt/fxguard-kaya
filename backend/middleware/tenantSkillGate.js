/**
 * Kaya CRM — قفل API اسکیل‌های خاموش پنل خودخدمت
 * @file    backend/middleware/tenantSkillGate.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { disabledSkillForPath } = require('../lib/tenantSkills');

function tenantSkillGate(req, res, next) {
    const tenant = req.tenant;
    if (!tenant || tenant.missing) return next();
    const path = String(req.originalUrl || req.url || '');
    const skill = disabledSkillForPath(tenant, path);
    if (!skill) return next();
    return res.status(403).json({
        error: 'ماژول «' + skill.label.fa + '» برای این پنل فعال نیست. از تنظیمات پنل › اسکیل‌ها روشنش کنید.',
        code: 'SKILL_DISABLED',
        skill: skill.id,
    });
}

module.exports = { tenantSkillGate };
