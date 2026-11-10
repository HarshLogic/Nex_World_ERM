const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/', usersController.list);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.post('/:id/reset-password', usersController.resetPassword);

module.exports = router;

