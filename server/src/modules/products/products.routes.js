const express = require('express');
const router = express.Router();
const productsController = require('./products.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', productsController.list);
router.get('/:id', productsController.getById);
router.post('/', productsController.create);
router.put('/:id', productsController.update);
router.delete('/:id', authorize(['ADMIN']), productsController.delete);

module.exports = router;

