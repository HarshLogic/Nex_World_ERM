import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_SALES,
  INITIAL_INVENTORY_LEDGER,
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_NOTIFICATIONS,
} from './demoData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * LocalStorage state helper to ensure demo mutations persist across pages
 */
function getStored(key, initialVal) {
  if (typeof window === 'undefined') return initialVal;
  try {
    const item = window.localStorage.getItem(`erp_${key}`);
    return item ? JSON.parse(item) : initialVal;
  } catch (_) {
    return initialVal;
  }
}

function setStored(key, val) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`erp_${key}`, JSON.stringify(val));
  } catch (_) {}
}

/**
 * Mock Handler for Zero-Database Offline / Demo Mode
 */
function handleDemoApi(endpoint, method, body) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanPath = path.split('?')[0];

  // Auth
  if (cleanPath === '/auth/me') {
    const demoUser = getStored('demo_user', null);
    if (demoUser) {
      return { success: true, data: demoUser };
    }
    return { success: false, message: 'Not authenticated', code: 'UNAUTHORIZED' };
  }

  if (cleanPath === '/auth/login') {
    const email = body?.email?.toLowerCase() || '';
    const role = email.includes('admin') ? 'ADMIN' : 'USER';
    const user = {
      id: role === 'ADMIN' ? 'demo-admin-id' : 'demo-cashier-id',
      email: email || (role === 'ADMIN' ? 'admin@recordsmanager.ae' : 'cashier@recordsmanager.ae'),
      name: role === 'ADMIN' ? 'Super Admin (Demo)' : 'Jane Cashier (Demo)',
      role,
    };
    setStored('demo_user', user);
    return { success: true, data: { token: 'mock-jwt-token', user } };
  }

  if (cleanPath === '/auth/logout') {
    setStored('demo_user', null);
    return { success: true, message: 'Logged out' };
  }

  // Dashboard
  if (cleanPath === '/dashboard/kpis') {
    const products = getStored('products', INITIAL_PRODUCTS);
    const sales = getStored('sales', INITIAL_SALES);
    const expenses = getStored('expenses', INITIAL_EXPENSES);
    const customers = getStored('customers', INITIAL_CUSTOMERS);

    const todaySales = sales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
    const stockValue = products.reduce((sum, p) => sum + (Number(p.stockOnHand || 0) * Number(p.baseCost || 0)), 0);
    const lowStockAlerts = products.filter((p) => Number(p.stockOnHand || 0) <= Number(p.reorderLevel || 5));
    const creditOutstanding = customers.reduce((sum, c) => sum + Number(c.balance || 0), 0);
    const monthlyExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const monthlyRevenue = todaySales + 145000;
    const monthlyNetProfit = Math.round((monthlyRevenue * 0.38 - monthlyExpenses) * 100) / 100;

    return {
      success: true,
      data: {
        todaySales: Math.round(todaySales * 100) / 100,
        todayOrders: sales.length + 18,
        lowStockItemsCount: lowStockAlerts.length,
        creditOutstanding: Math.round(creditOutstanding * 100) / 100,
        stockValue: Math.round(stockValue * 100) / 100,
        monthlyRevenue,
        monthlyExpenses,
        monthlyNetProfit,
        lowStockAlerts,
      },
    };
  }

  if (cleanPath === '/dashboard/analytics') {
    const sales = getStored('sales', INITIAL_SALES);
    return {
      success: true,
      data: {
        salesTrend: [
          { day: 'Mon', sales: 12400, orders: 24 },
          { day: 'Tue', sales: 15600, orders: 31 },
          { day: 'Wed', sales: 18900, orders: 42 },
          { day: 'Thu', sales: 22100, orders: 48 },
          { day: 'Fri', sales: 28400, orders: 62 },
          { day: 'Sat', sales: 31200, orders: 74 },
          { day: 'Sun', sales: 24800, orders: 55 },
        ],
        paymentBreakdown: [
          { method: 'CASH', totalAmount: 48500, count: 85 },
          { method: 'CARD', totalAmount: 62400, count: 110 },
          { method: 'CREDIT', totalAmount: 14200, count: 18 },
        ],
        recentSales: sales.slice(0, 10),
      },
    };
  }

  // Products
  if (cleanPath === '/products') {
    let products = getStored('products', INITIAL_PRODUCTS);
    if (method === 'POST') {
      const newSku = `SKU-${String(products.length + 1).padStart(5, '0')}`;
      const newProd = {
        id: `prod-${Date.now()}`,
        name: body.name,
        sku: newSku,
        barcode: body.barcode || String(Date.now()).slice(-12),
        categoryId: body.categoryId,
        category: getStored('categories', INITIAL_CATEGORIES).find((c) => c.id === body.categoryId) || { name: 'General' },
        sellingPrice: Number(body.sellingPrice),
        baseCost: Number(body.baseCost),
        taxRate: Number(body.taxRate || 5.0),
        reorderLevel: Number(body.reorderLevel || 5),
        suggestedReorderQty: Number(body.suggestedReorderQty || 20),
        stockOnHand: Number(body.initialStock || 10),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      products = [newProd, ...products];
      setStored('products', products);
      return { success: true, data: newProd, message: 'Product created' };
    }
    return { success: true, data: { items: products, pagination: { totalCount: products.length } } };
  }

  if (cleanPath.startsWith('/products/')) {
    const id = cleanPath.split('/products/')[1];
    let products = getStored('products', INITIAL_PRODUCTS);
    if (method === 'DELETE') {
      products = products.filter((p) => p.id !== id);
      setStored('products', products);
      return { success: true, message: 'Product deleted' };
    }
    if (method === 'PUT') {
      products = products.map((p) => (p.id === id ? { ...p, ...body } : p));
      setStored('products', products);
      return { success: true, message: 'Product updated' };
    }
    const found = products.find((p) => p.id === id);
    return { success: true, data: found || products[0] };
  }

  // Categories
  if (cleanPath === '/categories') {
    let categories = getStored('categories', INITIAL_CATEGORIES);
    if (method === 'POST') {
      const newCat = { id: `cat-${Date.now()}`, name: body.name, description: body.description, _count: { products: 0 } };
      categories = [...categories, newCat];
      setStored('categories', categories);
      return { success: true, data: newCat };
    }
    return { success: true, data: categories };
  }

  if (cleanPath.startsWith('/categories/')) {
    const id = cleanPath.split('/categories/')[1];
    let categories = getStored('categories', INITIAL_CATEGORIES);
    if (method === 'DELETE') {
      categories = categories.filter((c) => c.id !== id);
      setStored('categories', categories);
      return { success: true, message: 'Category deleted' };
    }
  }

  // POS
  if (cleanPath === '/pos/lookup') {
    const products = getStored('products', INITIAL_PRODUCTS);
    return { success: true, data: products };
  }

  if (cleanPath === '/pos/held-carts') {
    let held = getStored('held_carts', []);
    if (method === 'POST') {
      const newHeld = { id: `held-${Date.now()}`, ...body, createdAt: new Date().toISOString() };
      held = [newHeld, ...held];
      setStored('held_carts', held);
      return { success: true, data: newHeld };
    }
    return { success: true, data: held };
  }

  if (cleanPath.startsWith('/pos/held-carts/')) {
    const id = cleanPath.split('/pos/held-carts/')[1];
    let held = getStored('held_carts', []);
    held = held.filter((h) => h.id !== id);
    setStored('held_carts', held);
    return { success: true, message: 'Held cart removed' };
  }

  if (cleanPath === '/pos/checkout') {
    const sales = getStored('sales', INITIAL_SALES);
    let products = getStored('products', INITIAL_PRODUCTS);
    const customers = getStored('customers', INITIAL_CUSTOMERS);
    const settings = getStored('settings', INITIAL_SETTINGS);

    const invNum = `INV-${String(sales.length + 1).padStart(5, '0')}`;
    let grandTotal = 0;
    const items = (body.items || []).map((cartItem) => {
      const prod = products.find((p) => p.id === cartItem.productId) || { name: 'Item', sellingPrice: 50 };
      const lineTotal = Number(prod.sellingPrice) * Number(cartItem.quantity) - Number(cartItem.discount || 0);
      grandTotal += lineTotal;
      // Decrement stock
      products = products.map((p) =>
        p.id === cartItem.productId ? { ...p, stockOnHand: Math.max(0, p.stockOnHand - Number(cartItem.quantity)) } : p
      );
      return {
        productName: prod.name,
        quantity: cartItem.quantity,
        unitPrice: prod.sellingPrice,
        subtotal: lineTotal,
      };
    });

    setStored('products', products);

    const customer = customers.find((c) => c.id === body.customerId) || { name: 'Walk-in Customer' };
    const tendered = Number(body.payment?.amountTendered || grandTotal);
    const changeDue = body.payment?.method === 'CASH' ? Math.max(0, tendered - grandTotal) : 0;

    const newSale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: invNum,
      customer,
      cashier: { name: 'Demo Cashier' },
      subtotal: grandTotal,
      totalDiscount: body.transactionDiscount?.value || 0,
      grandTotal,
      grossProfit: Math.round(grandTotal * 0.35 * 100) / 100,
      paymentStatus: 'PAID',
      payments: [{ paymentMethod: body.payment?.method || 'CASH', amount: grandTotal }],
      items,
      createdAt: new Date().toISOString(),
      _count: { items: items.length },
    };

    setStored('sales', [newSale, ...sales]);

    const receipt = {
      businessName: settings.businessName,
      address: settings.address,
      phone: settings.phone,
      invoiceNumber: invNum,
      date: newSale.createdAt,
      cashier: 'Demo Cashier',
      customer: customer.name,
      items,
      subtotal: grandTotal,
      totalDiscount: 0,
      taxTotal: Math.round(grandTotal * 0.05 * 100) / 100,
      grandTotal,
      paymentMethod: body.payment?.method || 'CASH',
      amountTendered: tendered,
      changeDue,
      header: settings.receiptHeader,
      footer: settings.receiptFooter,
    };

    return {
      success: true,
      data: {
        sale: newSale,
        receipt,
      },
    };
  }

  // Inventory
  if (cleanPath === '/inventory/ledger') {
    const ledger = getStored('ledger', INITIAL_INVENTORY_LEDGER);
    return { success: true, data: { entries: ledger } };
  }

  if (cleanPath === '/inventory/stock-in') {
    let ledger = getStored('ledger', INITIAL_INVENTORY_LEDGER);
    let products = getStored('products', INITIAL_PRODUCTS);
    const prod = products.find((p) => p.id === body.productId);

    const qty = Number(body.quantity);
    products = products.map((p) => (p.id === body.productId ? { ...p, stockOnHand: p.stockOnHand + qty } : p));
    setStored('products', products);

    const newEntry = {
      id: `led-${Date.now()}`,
      productId: body.productId,
      product: { name: prod?.name || 'Product', sku: prod?.sku || 'SKU' },
      transactionType: 'STOCK_IN',
      quantity: qty,
      signedQuantity: qty,
      unitCost: body.unitCost || prod?.baseCost || 0,
      reason: body.reason || 'Manual Stock In',
      user: { name: 'Demo Admin' },
      createdAt: new Date().toISOString(),
    };
    setStored('ledger', [newEntry, ...ledger]);
    return { success: true, data: newEntry };
  }

  if (cleanPath === '/inventory/stock-out') {
    let ledger = getStored('ledger', INITIAL_INVENTORY_LEDGER);
    let products = getStored('products', INITIAL_PRODUCTS);
    const prod = products.find((p) => p.id === body.productId);

    const qty = Number(body.quantity);
    products = products.map((p) => (p.id === body.productId ? { ...p, stockOnHand: Math.max(0, p.stockOnHand - qty) } : p));
    setStored('products', products);

    const newEntry = {
      id: `led-${Date.now()}`,
      productId: body.productId,
      product: { name: prod?.name || 'Product', sku: prod?.sku || 'SKU' },
      transactionType: 'STOCK_OUT',
      quantity: qty,
      signedQuantity: -qty,
      unitCost: prod?.baseCost || 0,
      reason: body.reason || 'Manual Stock Out',
      user: { name: 'Demo Admin' },
      createdAt: new Date().toISOString(),
    };
    setStored('ledger', [newEntry, ...ledger]);
    return { success: true, data: newEntry };
  }

  if (cleanPath === '/inventory/bulk-receive') {
    let ledger = getStored('ledger', INITIAL_INVENTORY_LEDGER);
    let products = getStored('products', INITIAL_PRODUCTS);

    (body.items || []).forEach((item) => {
      const qty = Number(item.quantity);
      products = products.map((p) => (p.id === item.productId ? { ...p, stockOnHand: p.stockOnHand + qty } : p));
      const prod = products.find((p) => p.id === item.productId);
      ledger.unshift({
        id: `led-${Date.now()}-${Math.random()}`,
        productId: item.productId,
        product: { name: prod?.name || 'Product', sku: prod?.sku || 'SKU' },
        transactionType: 'STOCK_IN',
        quantity: qty,
        signedQuantity: qty,
        unitCost: item.unitCost || prod?.baseCost || 0,
        reason: 'Bulk Receive shipment',
        user: { name: 'Demo Admin' },
        createdAt: new Date().toISOString(),
      });
    });

    setStored('products', products);
    setStored('ledger', ledger);
    return { success: true, message: 'Bulk receive recorded' };
  }

  if (cleanPath === '/inventory/stocktake') {
    let ledger = getStored('ledger', INITIAL_INVENTORY_LEDGER);
    let products = getStored('products', INITIAL_PRODUCTS);
    const prod = products.find((p) => p.id === body.productId);
    const physical = Number(body.physicalCount);
    const diff = physical - (prod?.stockOnHand || 0);

    products = products.map((p) => (p.id === body.productId ? { ...p, stockOnHand: physical } : p));
    setStored('products', products);

    ledger.unshift({
      id: `led-${Date.now()}`,
      productId: body.productId,
      product: { name: prod?.name || 'Product', sku: prod?.sku || 'SKU' },
      transactionType: 'ADJUSTMENT',
      quantity: Math.abs(diff),
      signedQuantity: diff,
      unitCost: prod?.baseCost || 0,
      reason: `Stocktake audit: Physical ${physical} vs System. ${body.notes || ''}`,
      user: { name: 'Demo Admin' },
      createdAt: new Date().toISOString(),
    });
    setStored('ledger', ledger);

    return {
      success: true,
      data: { adjusted: diff !== 0, discrepancy: diff },
    };
  }

  // Sales
  if (cleanPath === '/sales') {
    const sales = getStored('sales', INITIAL_SALES);
    return { success: true, data: { sales } };
  }

  if (cleanPath.startsWith('/sales/')) {
    const id = cleanPath.split('/sales/')[1];
    const sales = getStored('sales', INITIAL_SALES);
    const sale = sales.find((s) => s.id === id) || sales[0];
    return { success: true, data: sale };
  }

  if (cleanPath === '/returns') {
    return { success: true, data: { returnNumber: `RET-${Date.now().toString().slice(-5)}` } };
  }

  // Customers
  if (cleanPath === '/customers') {
    let customers = getStored('customers', INITIAL_CUSTOMERS);
    if (method === 'POST') {
      const newCust = { id: `cust-${Date.now()}`, ...body, balance: 0.0, status: 'ACTIVE', createdAt: new Date().toISOString() };
      customers = [newCust, ...customers];
      setStored('customers', customers);
      return { success: true, data: newCust };
    }
    return { success: true, data: { customers } };
  }

  if (cleanPath.startsWith('/customers/')) {
    const id = cleanPath.split('/customers/')[1];
    let customers = getStored('customers', INITIAL_CUSTOMERS);
    if (method === 'DELETE') {
      customers = customers.filter((c) => c.id !== id);
      setStored('customers', customers);
      return { success: true, message: 'Customer deleted' };
    }
    if (method === 'PUT') {
      customers = customers.map((c) => (c.id === id ? { ...c, ...body } : c));
      setStored('customers', customers);
      return { success: true, message: 'Customer updated' };
    }
    return { success: true, data: customers.find((c) => c.id === id) || customers[0] };
  }

  // Suppliers
  if (cleanPath === '/suppliers') {
    let suppliers = getStored('suppliers', INITIAL_SUPPLIERS);
    if (method === 'POST') {
      const newSupp = { id: `supp-${Date.now()}`, ...body, payableBalance: 0.0, status: 'ACTIVE' };
      suppliers = [newSupp, ...suppliers];
      setStored('suppliers', suppliers);
      return { success: true, data: newSupp };
    }
    return { success: true, data: { suppliers } };
  }

  if (cleanPath === '/suppliers/payments') {
    let suppliers = getStored('suppliers', INITIAL_SUPPLIERS);
    suppliers = suppliers.map((s) =>
      s.id === body.supplierId ? { ...s, payableBalance: Math.max(0, s.payableBalance - Number(body.amount)) } : s
    );
    setStored('suppliers', suppliers);
    return { success: true, message: 'Supplier payment recorded' };
  }

  // Purchase Orders
  if (cleanPath === '/purchase-orders') {
    let poList = getStored('purchase_orders', INITIAL_PURCHASE_ORDERS);
    if (method === 'POST') {
      const suppliers = getStored('suppliers', INITIAL_SUPPLIERS);
      const supplier = suppliers.find((s) => s.id === body.supplierId) || { name: 'Vendor' };
      const newPo = {
        id: `po-${Date.now()}`,
        poNumber: `PO-${String(poList.length + 1).padStart(5, '0')}`,
        supplier,
        subtotal: (body.items || []).reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0),
        landedCosts: Number(body.landedCosts || 0),
        grandTotal: (body.items || []).reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0) + Number(body.landedCosts || 0),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        _count: { items: body.items?.length || 1 },
      };
      poList = [newPo, ...poList];
      setStored('purchase_orders', poList);
      return { success: true, data: newPo };
    }
    return { success: true, data: { purchaseOrders: poList } };
  }

  if (cleanPath.endsWith('/receive')) {
    const poId = cleanPath.split('/')[2];
    let poList = getStored('purchase_orders', INITIAL_PURCHASE_ORDERS);
    poList = poList.map((po) => (po.id === poId ? { ...po, status: 'RECEIVED' } : po));
    setStored('purchase_orders', poList);
    return { success: true, message: 'Stock received and base costs updated' };
  }

  // Expenses
  if (cleanPath === '/expenses') {
    let expenses = getStored('expenses', INITIAL_EXPENSES);
    const categories = getStored('expense_categories', INITIAL_EXPENSE_CATEGORIES);
    if (method === 'POST') {
      const cat = categories.find((c) => c.id === body.expenseCategoryId) || { name: 'General' };
      const newExp = {
        id: `exp-${Date.now()}`,
        date: new Date().toISOString(),
        category: cat,
        payee: body.payee,
        amount: Number(body.amount),
        paidVia: body.paidVia || 'CASH',
        notes: body.notes,
      };
      expenses = [newExp, ...expenses];
      setStored('expenses', expenses);
      return { success: true, data: newExp };
    }
    const totalAmountAED = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return { success: true, data: { expenses, totalAmountAED } };
  }

  if (cleanPath === '/expenses/categories') {
    return { success: true, data: getStored('expense_categories', INITIAL_EXPENSE_CATEGORIES) };
  }

  if (cleanPath.startsWith('/expenses/')) {
    const id = cleanPath.split('/expenses/')[1];
    let expenses = getStored('expenses', INITIAL_EXPENSES);
    expenses = expenses.filter((e) => e.id !== id);
    setStored('expenses', expenses);
    return { success: true, message: 'Expense deleted' };
  }

  // Users
  if (cleanPath === '/users') {
    let users = getStored('users', INITIAL_USERS);
    if (method === 'POST') {
      const newUser = { id: `user-${Date.now()}`, ...body, createdAt: new Date().toISOString() };
      users = [newUser, ...users];
      setStored('users', users);
      return { success: true, data: newUser };
    }
    return { success: true, data: { users } };
  }

  if (cleanPath.startsWith('/users/')) {
    return { success: true, message: 'User updated' };
  }

  // Settings
  if (cleanPath === '/settings') {
    let settings = getStored('settings', INITIAL_SETTINGS);
    if (method === 'PUT') {
      settings = { ...settings, ...body };
      setStored('settings', settings);
      return { success: true, data: settings };
    }
    return { success: true, data: settings };
  }

  // Activity Logs
  if (cleanPath === '/activity-logs') {
    return { success: true, data: { logs: getStored('activity_logs', INITIAL_ACTIVITY_LOGS) } };
  }

  // Notifications
  if (cleanPath.startsWith('/notifications')) {
    let notifications = getStored('notifications', INITIAL_NOTIFICATIONS);
    if (cleanPath.includes('/read-all')) {
      notifications = notifications.map((n) => ({ ...n, isRead: true }));
      setStored('notifications', notifications);
      return { success: true, message: 'All notifications marked as read' };
    }
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return { success: true, data: { notifications, unreadCount } };
  }

  return { success: true, data: {} };
}

/**
 * Standard HTTP Fetch Client with Credentials & Automatic Demo / Offline Fallback
 */
async function fetchClient(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (response.ok) {
      return await response.json();
    }
    // If backend returns 500/503/404 due to no DB connection, activate Demo Mock Fallback
    console.warn(`[API NOTICE]: Server responded with ${response.status}. Using interactive demo fallback.`);
    return handleDemoApi(endpoint, options.method || 'GET', options.body);
  } catch (err) {
    // If backend is completely offline or DB is missing, use interactive demo fallback
    return handleDemoApi(endpoint, options.method || 'GET', options.body);
  }
}

export const api = {
  get: (endpoint, options) => fetchClient(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => fetchClient(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => fetchClient(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => fetchClient(endpoint, { method: 'DELETE', ...options }),
};
