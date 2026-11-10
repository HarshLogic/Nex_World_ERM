const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const productsRoutes = require('../modules/products/products.routes');
const categoriesRoutes = require('../modules/categories/categories.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const posRoutes = require('../modules/pos/pos.routes');
const salesRoutes = require('../modules/sales/sales.routes');
const returnsRoutes = require('../modules/returns/returns.routes');
const customersRoutes = require('../modules/customers/customers.routes');
const suppliersRoutes = require('../modules/suppliers/suppliers.routes');
const purchaseOrdersRoutes = require('../modules/purchases/purchases.routes');
const expensesRoutes = require('../modules/expenses/expenses.routes');
const usersRoutes = require('../modules/users/users.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const activityLogsRoutes = require('../modules/activity-logs/activityLogs.routes');
const notificationsRoutes = require('../modules/notifications/notifications.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');

// Health Check Endpoint (used by Nginx and Docker)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    instance: process.env.INSTANCE_ID || 'standalone',
  });
});

// Domain Routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/pos', posRoutes);
router.use('/sales', salesRoutes);
router.use('/returns', returnsRoutes);
router.use('/customers', customersRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/expenses', expensesRoutes);
router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);
router.use('/activity-logs', activityLogsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;

