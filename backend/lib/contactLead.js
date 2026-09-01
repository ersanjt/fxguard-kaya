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

const CONTACT_PURPOSE_ALIASES = {
    cloud_subscribe: 'purchase',
    buy_license: 'license',
    managed_hosting: 'managed',
    guided: 'demo',
    'guided-demo': 'demo',
    'guided_demo': 'demo',
};

const CONTACT_LANGS = ['en', 'fa', 'tr', 'ar', 'ru'];

function normalizeContactPurpose(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    const mapped = CONTACT_PURPOSE_ALIASES[v] || v;
    return CONTACT_PURPOSES.indexOf(mapped) >= 0 ? mapped : 'other';
}

function normalizeContactLang(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase()
        .slice(0, 8);
    return CONTACT_LANGS.indexOf(v) >= 0 ? v : 'en';
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
    CONTACT_PURPOSE_ALIASES,
    CONTACT_LANGS,
    normalizeContactPurpose,
    normalizeContactLang,
    emptyPurposeCounts,
    tallyPurposeCounts,
};
