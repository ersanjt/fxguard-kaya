const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

router.get('/', usersController.list);
router.get('/me', usersController.me);
router.patch('/me', usersController.patchMe);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.post('/:id/delete-with-transfer', usersController.deleteWithTransfer);
router.post('/:id/permanent-delete', usersController.permanentDelete);

module.exports = router;
