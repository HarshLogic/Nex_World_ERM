const express = require('express');
const router = express.Router();
const purchasesController = require('./purchases.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', purchasesController.list);
router.get('/:id', purchasesController.getById);
router.post('/', purchasesController.create);
router.post('/:id/receive', purchasesController.receive);

module.exports = router;

