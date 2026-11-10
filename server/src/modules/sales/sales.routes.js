const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', salesController.list);
router.get('/:id', salesController.getById);

module.exports = router;

