const express = require('express');
const router = express.Router();
const activityLogsController = require('./activityLogs.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', activityLogsController.list);

module.exports = router;

