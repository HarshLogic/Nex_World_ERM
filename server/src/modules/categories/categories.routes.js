const express = require('express');
const router = express.Router();
const categoriesController = require('./categories.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', categoriesController.list);
router.post('/', authorize(['ADMIN']), categoriesController.create);
router.put('/:id', authorize(['ADMIN']), categoriesController.update);
router.delete('/:id', authorize(['ADMIN']), categoriesController.delete);

module.exports = router;

