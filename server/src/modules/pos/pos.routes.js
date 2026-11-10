const express = require('express');
const router = express.Router();
const posController = require('./pos.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { idempotencyMiddleware } = require('../../middleware/idempotency.middleware');

router.use(authenticate);

router.get('/lookup', posController.lookup);
router.get('/held-carts', posController.listHolds);
router.post('/held-carts', posController.saveHold);
router.delete('/held-carts/:id', posController.deleteHold);
router.post('/checkout', idempotencyMiddleware(3600), posController.checkout);

module.exports = router;

