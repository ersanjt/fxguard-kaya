/**
 * Kaya CRM — اهداف فرم تماس لندینگ (قیف فروش)
 * @file    backend/lib/contactLead.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const CONTACT_PURPOSES = [
    'purchase',
    'quote',
    'license',
    'managed',
    'support',
    'demo',
    'trial',
    'other',
];

function normalizeContactPurpose(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    return CONTACT_PURPOSES.indexOf(v) >= 0 ? v : 'other';
}

function emptyPurposeCounts() {
    const out = {};
    CONTACT_PURPOSES.forEach((p) => {
        out[p] = 0;
    });
    return out;
}

function tallyPurposeCounts(rows) {
    const counts = emptyPurposeCounts();
    (rows || []).forEach((row) => {
        const p = normalizeContactPurpose(row && (row.purpose || row.get && row.get('purpose')));
        counts[p] = (counts[p] || 0) + (Number(row.n || row.count) || 1);
    });
    return counts;
}

module.exports = {
    CONTACT_PURPOSES,
    normalizeContactPurpose,
    emptyPurposeCounts,
    tallyPurposeCounts,
};
