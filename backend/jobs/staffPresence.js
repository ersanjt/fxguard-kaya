/**
 * Kaya CRM — پاک‌سازی دوره‌ای وضعیت آنلاین کهنه
 * @file    backend/jobs/staffPresence.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
const logger = require('../config/logger');
const { expireStalePresence } = require('../lib/staffPresence');

const CHECK_INTERVAL_MS = 30 * 1000;

let _intervalId = null;

function startStaffPresenceJob(io) {
    if (process.env.NODE_ENV === 'test') return;
    if (_intervalId) return;

    const { User } = require('../models');
    _intervalId = setInterval(() => {
        expireStalePresence(User, io).catch((err) => {
            logger.warn('Staff presence expire:', err.message);
        });
    }, CHECK_INTERVAL_MS);
    _intervalId.unref();
}

function stopStaffPresenceJob() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

module.exports = { startStaffPresenceJob, stopStaffPresenceJob };
