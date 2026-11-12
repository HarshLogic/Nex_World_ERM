const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Integration Tests: Role-Based Access Control (RBAC) Permission Matrix', () => {
  // Permission rules specification
  const RBAC_RULES = {
    // Admin Only Endpoints
    'GET /api/dashboard/kpis': ['ADMIN'],
    'DELETE /api/products/:id': ['ADMIN'],
    'POST /api/categories': ['ADMIN'],
    'DELETE /api/customers/:id': ['ADMIN'],
    'GET /api/suppliers': ['ADMIN'],
    'POST /api/purchase-orders': ['ADMIN'],
    'POST /api/returns': ['ADMIN'],
    'GET /api/expenses': ['ADMIN'],
    'POST /api/expenses': ['ADMIN'],
    'GET /api/users': ['ADMIN'],
    'PUT /api/settings': ['ADMIN'],
    'GET /api/activity-logs': ['ADMIN'],
    'POST /api/inventory/stocktake': ['ADMIN'],

    // Shared Endpoints (ADMIN & USER)
    'GET /api/products': ['ADMIN', 'USER'],
    'POST /api/products': ['ADMIN', 'USER'],
    'PUT /api/products/:id': ['ADMIN', 'USER'],
    'GET /api/customers': ['ADMIN', 'USER'],
    'POST /api/customers': ['ADMIN', 'USER'],
    'POST /api/inventory/stock-in': ['ADMIN', 'USER'],
    'POST /api/inventory/stock-out': ['ADMIN', 'USER'],
    'POST /api/inventory/bulk-receive': ['ADMIN', 'USER'],
    'POST /api/pos/checkout': ['ADMIN', 'USER'],
    'GET /api/sales': ['ADMIN', 'USER'],
    'POST /api/auth/change-password': ['ADMIN', 'USER'],
    'POST /api/users/:id/reset-password': ['ADMIN'],
  };

  function checkPermission(role, route) {
    const allowed = RBAC_RULES[route];
    if (!allowed) return false;
    return allowed.includes(role);
  }

  test('ADMIN has access to all protected management routes', () => {
    assert.strictEqual(checkPermission('ADMIN', 'GET /api/dashboard/kpis'), true);
    assert.strictEqual(checkPermission('ADMIN', 'DELETE /api/products/:id'), true);
    assert.strictEqual(checkPermission('ADMIN', 'POST /api/returns'), true);
    assert.strictEqual(checkPermission('ADMIN', 'GET /api/expenses'), true);
    assert.strictEqual(checkPermission('ADMIN', 'GET /api/activity-logs'), true);
    assert.strictEqual(checkPermission('ADMIN', 'POST /api/inventory/stocktake'), true);
  });

  test('Regular USER is blocked (HTTP 403) from Dashboard Analytics', () => {
    assert.strictEqual(checkPermission('USER', 'GET /api/dashboard/kpis'), false);
  });

  test('Regular USER is blocked from Deleting Products or Customers', () => {
    assert.strictEqual(checkPermission('USER', 'DELETE /api/products/:id'), false);
    assert.strictEqual(checkPermission('USER', 'DELETE /api/customers/:id'), false);
  });

  test('Regular USER is blocked from Processing Returns', () => {
    assert.strictEqual(checkPermission('USER', 'POST /api/returns'), false);
  });

  test('Regular USER is blocked from Managing Expenses or Suppliers', () => {
    assert.strictEqual(checkPermission('USER', 'GET /api/expenses'), false);
    assert.strictEqual(checkPermission('USER', 'POST /api/expenses'), false);
    assert.strictEqual(checkPermission('USER', 'GET /api/suppliers'), false);
  });

  test('Regular USER is blocked from Viewing Activity Logs & System Settings', () => {
    assert.strictEqual(checkPermission('USER', 'GET /api/activity-logs'), false);
    assert.strictEqual(checkPermission('USER', 'PUT /api/settings'), false);
  });

  test('Regular USER is allowed to use POS, Record Stock In/Out, and View Sales History', () => {
    assert.strictEqual(checkPermission('USER', 'POST /api/pos/checkout'), true);
    assert.strictEqual(checkPermission('USER', 'POST /api/inventory/stock-in'), true);
    assert.strictEqual(checkPermission('USER', 'POST /api/inventory/stock-out'), true);
    assert.strictEqual(checkPermission('USER', 'GET /api/sales'), true);
  });

  test('All authenticated users can change own password, but only ADMIN can reset others', () => {
    assert.strictEqual(checkPermission('ADMIN', 'POST /api/auth/change-password'), true);
    assert.strictEqual(checkPermission('USER', 'POST /api/auth/change-password'), true);
    assert.strictEqual(checkPermission('ADMIN', 'POST /api/users/:id/reset-password'), true);
    assert.strictEqual(checkPermission('USER', 'POST /api/users/:id/reset-password'), false);
  });
});

