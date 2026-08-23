const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/dashboard', analyticsController.dashboard);
router.get('/product-fit', analyticsController.productFit);
router.post('/product-fit/survey', analyticsController.submitProductFitSurvey);

module.exports = router;
