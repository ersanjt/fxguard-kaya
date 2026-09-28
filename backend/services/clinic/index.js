/**
 * Kaya CRM — نقطهٔ ورود سرویس‌های ماژول کلینیک / گردشگری سلامت
 * @file    backend/services/clinic/index.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { ClinicError } = require('./validators');

module.exports = {
    ClinicError,
    patients: require('./patientService'),
    doctors: require('./doctorService'),
    packages: require('./packageService'),
    appointments: require('./appointmentService'),
};
