const express = require('express');
const router = express.Router();
const branchesController = require('../controllers/branches.controller');
const { isMainAdmin } = require('../lib/permissions');

function ownerOrAdmin(req, res, next) {
    if (isMainAdmin(req.user) || req.user.role === 'owner' || req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'فقط مالک یا ادمین' });
}

router.get('/', branchesController.list);
router.get('/:id', branchesController.getById);
router.post('/', ownerOrAdmin, branchesController.create);
router.put('/:id', ownerOrAdmin, branchesController.update);

module.exports = router;
