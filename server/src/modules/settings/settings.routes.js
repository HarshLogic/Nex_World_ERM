const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', settingsController.get);
router.put('/', authorize(['ADMIN']), settingsController.update);

module.exports = router;

