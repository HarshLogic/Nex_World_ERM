# REST API Documentation: Records Manager ERP + POS + Inventory

**Base Path:** `/api`  
**Authentication:** Bearer JWT in `Authorization` header or HTTP-only secure cookie `token`.  
**Content-Type:** `application/json`

---

## 1. Standard Response Formats

### Success Response (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response (HTTP 400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "message": "Detailed error explanation",
  "code": "ERROR_CODE",
  "errors": []
}
```

---

## 2. Authentication & User Management (`/api/auth`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Authenticates user credentials, sets HTTP-only JWT cookie |
| `/api/auth/me` | GET | Authenticated | Returns current authenticated user and role profile |
| `/api/auth/logout` | POST | Authenticated | Clears auth cookie, invalidates server session |

---

## 3. Product Catalog & Categories (`/api/products`, `/api/categories`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/products` | GET | All | List products with pagination, search, category & stock filters |
| `/api/products/:id` | GET | All | Retrieve single product details with ledger-derived stock |
| `/api/products` | POST | All | Create new product with concurrency-safe auto `SKU-00001` |
| `/api/products/:id` | PUT | All | Update product specifications, prices, reorder levels |
| `/api/products/:id` | DELETE | ADMIN | Soft or safe delete product (blocked if transaction history exists) |
| `/api/categories` | GET | All | List catalog categories |
| `/api/categories` | POST | ADMIN | Create new category |
| `/api/categories/:id` | PUT | ADMIN | Update category details |
| `/api/categories/:id` | DELETE | ADMIN | Delete category if no products linked |

---

## 4. Immutable Inventory Ledger (`/api/inventory`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/inventory/ledger` | GET | All | List signed inventory transactions with filters and running balance |
| `/api/inventory/stock-in` | POST | All | Record stock-in with positive quantity and unit cost |
| `/api/inventory/stock-out` | POST | All | Record stock-out with negative quantity and operational reason |
| `/api/inventory/bulk-receive`| POST | All | Bulk record multiple item receipts in single atomic transaction |
| `/api/inventory/stocktake` | POST | ADMIN | Submit physical count; auto-generates corrective adjustments |
| `/api/inventory/on-hand/:id` | GET | All | Calculate precise on-hand quantity derived from $\sum \text{signedQuantity}$ |

---

## 5. POS Terminal & Checkout (`/api/pos`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/pos/lookup` | GET | All | Fast SKU/barcode/name search with cached response |
| `/api/pos/checkout` | POST | All | Concurrency-safe atomic checkout with `Idempotency-Key` header |
| `/api/pos/held-carts` | GET | All | List active held carts for current cashier |
| `/api/pos/held-carts` | POST | All | Save current cart state to PostgreSQL |
| `/api/pos/held-carts/:id` | DELETE| All | Resume or discard held cart |

---

## 6. Procurement & Purchase Orders (`/api/purchase-orders`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/purchase-orders` | GET | ADMIN | List purchase orders with status filtering |
| `/api/purchase-orders/:id` | GET | ADMIN | Get purchase order details and line items |
| `/api/purchase-orders` | POST | ADMIN | Create new PO (Draft or Pending) |
| `/api/purchase-orders/:id/receive` | POST | ADMIN | Receive items, allocate landed costs, update inventory & base cost |

---

## 7. Sales History & Returns (`/api/sales`, `/api/returns`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/sales` | GET | All | List historical sales, gross profits, invoices, and payment methods |
| `/api/sales/:id` | GET | All | Detailed invoice view and receipt breakdown |
| `/api/returns` | POST | ADMIN | Process partial or full return; validates remaining returnable quantity |
| `/api/returns` | GET | ADMIN | List return records with reasons and refund totals |

---

## 8. Customers & Suppliers (`/api/customers`, `/api/suppliers`)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/customers` | GET | All | List customers with credit balances |
| `/api/customers` | POST | All | Create customer record |
| `/api/customers/:id` | PUT | All | Update customer contact & address |
| `/api/customers/:id` | DELETE | ADMIN | Delete customer if no sales/ledger records exist |
| `/api/suppliers` | GET | ADMIN | List suppliers with accounts payable balances |
| `/api/suppliers` | POST | ADMIN | Create new procurement supplier |
| `/api/suppliers/:id` | PUT | ADMIN | Update supplier payment terms |

---

## 9. Expenses, Settings, Activity Logs & Dashboard

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/expenses` | GET | ADMIN | List expenses with date, category, and payment method filters |
| `/api/expenses` | POST | ADMIN | Record expense voucher with category and AED amount |
| `/api/settings` | GET | All | Retrieve business settings, currency, and tax configurations |
| `/api/settings` | PUT | ADMIN | Update business parameters, receipt header/footer, tax rates |
| `/api/activity-logs` | GET | ADMIN | Query append-only audit trail with module, action, and date filters |
| `/api/dashboard/kpis` | GET | ADMIN | Real-time KPIs (Today Sales, Orders, Low Stock, Stock Value, Net Profit) |
| `/api/dashboard/analytics`| GET | ADMIN | 7-day revenue trend, payment breakdowns, monthly performance |
| `/api/notifications` | GET | All | Fetch active system, inventory, and order notifications |
| `/api/notifications/:id/read` | PUT | All | Mark notification as read |

