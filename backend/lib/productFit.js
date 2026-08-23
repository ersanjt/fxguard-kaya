/**
 * Kaya CRM — تناسب محصول با بازار (سهم پیام از پنل)
 * @file    backend/lib/productFit.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const PANEL_SHARE_TARGET_PCT = 80;
const LOOKBACK_DAYS = 30;
const SEAN_ELLIS_ANSWERS = ['very', 'somewhat', 'not'];

function roundPct(num, den) {
    if (!den || den < 1) return null;
    return Math.round((num / den) * 1000) / 10;
}

/**
 * سهم پیام‌های خروجی تیمی که از پنل رفته‌اند (نه از گوشی واتساپ).
 * پاسخ خودکار از مخرج خارج است.
 */
function panelSharePct(panelOutgoing, phoneOutgoing) {
    return roundPct(panelOutgoing, panelOutgoing + phoneOutgoing);
}

function meetsPanelShareTarget(pct) {
    return pct != null && pct >= PANEL_SHARE_TARGET_PCT;
}

function seanEllisVeryDisappointedPct(counts) {
    const very = Number(counts && counts.very) || 0;
    const somewhat = Number(counts && counts.somewhat) || 0;
    const notDisappointed = Number(counts && counts.not) || 0;
    return roundPct(very, very + somewhat + notDisappointed);
}

function normalizeSeanEllisAnswer(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    if (v === 'very' || v === 'very_disappointed') return 'very';
    if (v === 'somewhat' || v === 'somewhat_disappointed') return 'somewhat';
    if (v === 'not' || v === 'not_disappointed') return 'not';
    return null;
}

module.exports = {
    PANEL_SHARE_TARGET_PCT,
    LOOKBACK_DAYS,
    SEAN_ELLIS_ANSWERS,
    panelSharePct,
    meetsPanelShareTarget,
    seanEllisVeryDisappointedPct,
    normalizeSeanEllisAnswer,
};
