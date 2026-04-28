const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departments.controller');

router.get('/', departmentsController.list);
router.post('/', departmentsController.create);
router.get('/:id', departmentsController.getById);
router.put('/:id', departmentsController.update);

module.exports = router;
