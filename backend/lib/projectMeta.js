/**
 * Kaya CRM — متادیتای پروژه (مالک، نام محصول)
 * @file    lib/projectMeta.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const PROJECT_META = Object.freeze({
    name: 'Kaya CRM',
    slug: 'fxguard-kaya',
    owner: Object.freeze({
        name: 'Ersan Jahed Tabrizi',
        email: 'ersanjahedtabrizi@gmail.com',
    }),
    docs: Object.freeze({
        codebaseMap: 'docs/CODEBASE-MAP.md',
        standards: 'docs/PROJECT-STANDARDS.md',
        frontend: 'backend/docs/FRONTEND-ARCHITECTURE.md',
    }),
});

module.exports = { PROJECT_META };
