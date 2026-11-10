const express = require('express');
const router = express.Router();
const expensesController = require('./expenses.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(authorize(['ADMIN']));

router.get('/categories', expensesController.listCategories);
router.post('/categories', expensesController.createCategory);
router.get('/', expensesController.list);
router.post('/', expensesController.create);
router.delete('/:id', expensesController.delete);

module.exports = router;

