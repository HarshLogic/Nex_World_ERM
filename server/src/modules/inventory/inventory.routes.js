const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);

router.get('/ledger', inventoryController.getLedger);
router.get('/on-hand/:productId', inventoryController.getOnHand);
router.post('/stock-in', inventoryController.stockIn);
router.post('/stock-out', inventoryController.stockOut);
router.post('/bulk-receive', inventoryController.bulkReceive);
router.post('/stocktake', authorize(['ADMIN']), inventoryController.stocktake);

module.exports = router;

