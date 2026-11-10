const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/kpis', dashboardController.getKpis);
router.get('/analytics', dashboardController.getAnalytics);

module.exports = router;

