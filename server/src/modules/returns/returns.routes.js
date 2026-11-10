const express = require('express');
const router = express.Router();
const returnsController = require('./returns.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', returnsController.list);
router.post('/', returnsController.process);

module.exports = router;

