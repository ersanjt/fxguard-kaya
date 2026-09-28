/**
 * Kaya CRM — مسیرهای ماژول کلینیک: /api/clinic/{patients,doctors,appointments,packages}
 * احراز هویت، دسترسی بخش «clinic» و اسکیل سازمان (tenantSkillGate) پیش از این روتر اعمال می‌شوند.
 * @file    backend/routes/clinic.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const express = require('express');
const c = require('../controllers/clinic.controller');

const router = express.Router();

router.param('id', (req, res, next) => c.validateIdParam(req, res, next));

router.get('/patients', c.patients.list);
router.post('/patients', c.patients.create);
router.get('/patients/:id', c.patients.get);
router.patch('/patients/:id', c.patients.update);

router.get('/doctors', c.doctors.list);
router.post('/doctors', c.requireClinicManager, c.doctors.create);
router.get('/doctors/:id', c.doctors.get);
router.patch('/doctors/:id', c.requireClinicManager, c.doctors.update);

router.get('/packages', c.packages.list);
router.post('/packages', c.requireClinicManager, c.packages.create);
router.get('/packages/:id', c.packages.get);
router.patch('/packages/:id', c.requireClinicManager, c.packages.update);

router.get('/appointments', c.appointments.list);
router.post('/appointments', c.appointments.create);
router.get('/appointments/:id', c.appointments.get);
router.patch('/appointments/:id', c.appointments.update);
router.post('/appointments/:id/status', c.appointments.changeStatus);

module.exports = router;
