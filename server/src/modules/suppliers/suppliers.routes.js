const express = require('express');
const router = express.Router();
const suppliersController = require('./suppliers.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', suppliersController.list);
router.get('/:id', suppliersController.getById);
router.post('/', suppliersController.create);
router.put('/:id', suppliersController.update);
router.post('/payments', suppliersController.recordPayment);

module.exports = router;

