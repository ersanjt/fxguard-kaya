/**
 * تشخیص اپ کارکنان (اندروید/iOS) برای صدور JWT در JSON.
 * مرورگر فقط کوکی httpOnly می‌گیرد.
 * @file    backend/lib/staffAppClient.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

function wantsBearerToken(req) {
    const header = String((req && req.get && req.get('x-kaya-client')) || '').trim().toLowerCase();
    if (header === 'staff-app' || header === 'android' || header === 'ios') return true;
    const ua = String((req && req.get && req.get('user-agent')) || '');
    return /KayaStaff-/i.test(ua);
}

module.exports = { wantsBearerToken };
