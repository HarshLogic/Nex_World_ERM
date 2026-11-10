# Records Manager ERP + POS + Inventory Management System
## System Architecture & Technical Design Specification

### 1. Executive Summary & Architectural Overview
The Records Manager ERP + POS + Inventory Management System is an enterprise-grade, horizontally scalable, multi-tier retail and distribution management platform. It is designed to provide high throughput for Point-of-Sale (POS) operations, audit-proof inventory ledger tracking, strict role-based access control (RBAC), and automated financial workflows.

The system adheres to:
- **Clean Architecture & Domain-Driven Design (DDD)**: Clear boundaries between Presentation (Next.js 15 Client), Gateway/Load Balancing (Nginx), Stateless Application Layer (Express.js Instances), Asynchronous Processing (BullMQ & Redis), and Relational Persistence (PostgreSQL with Prisma ORM).
- **SOLID Principles**: Single responsibility modules, interface isolation, dependency inversion via repository abstractions, and extensible service contracts.
- **ACID Transaction Guarantees**: Concurrency-safe transactions for checkouts, ledger movements, invoice sequencing, and returns.

---

### 2. High-Level System Architecture Diagram

```
                             +--------------------------------------------------+
                             |              Client Tier (Browser)               |
                             |   Next.js 15 App Router (JavaScript + Tailwind)  |
                             |  TanStack Query, React Hook Form, Zod, Recharts  |
                             +--------------------------------------------------+
                                                      |
                                                      | HTTPS / Secure Cookies
                                                      v
                             +--------------------------------------------------+
                             |           Reverse Proxy & Load Balancer          |
                             |                       Nginx                      |
                             |  - Least Connections / Round-Robin Balancing     |
                             |  - SSL Termination & Rate Limiting               |
                             |  - Health-Check Routing (/api/health)            |
                             +--------------------------------------------------+
                                        /                                \
                                       /                                  \
                                      v                                    v
     +-----------------------------------------+  +-----------------------------------------+
     |       Express API Instance 1            |  |       Express API Instance 2            |
     |  - Stateless REST API Layer             |  |  - Stateless REST API Layer             |
     |  - JWT & RBAC Middleware                |  |  - JWT & RBAC Middleware                |
     |  - Domain Modules (POS, Inventory, PO)  |  |  - Domain Modules (POS, Inventory, PO)  |
     |  - Prisma Client (Connection Pooling)   |  |  - Prisma Client (Connection Pooling)   |
     +-----------------------------------------+  +-----------------------------------------+
                         |           \                      /           |
                         |            \                    /            |
                         |             v                  v             |
                         |      +--------------------------------+      |
                         |      |         Redis Cluster          |      |
                         |      |  - Rate Limiting Token Bucket  |      |
                         |      |  - Idempotency & Lookup Cache  |      |
                         |      |  - BullMQ Queue Backplane      |      |
                         |      +--------------------------------+      |
                         |                      |                       |
                         |                      v                       |
                         |      +--------------------------------+      |
                         |      |       BullMQ Workers           |      |
                         |      |  - Asynchronous PDF / CSV Gen  |      |
                         |      |  - Reorder Alerts / Reports    |      |
                         |      +--------------------------------+      |
                         \                                              /
                          \                                            /
                           v                                          v
     +--------------------------------------------------------------------------------------+
     |                            PostgreSQL Primary Database                               |
     |  - Single Source of Truth for Financials, Catalog, Procurement, & Audits             |
     |  - Immutable Inventory Ledger & Customer/Supplier Balances                           |
     |  - Row-Level Locking (`FOR UPDATE`) for Concurrency-Safe Invoice & SKU Counters     |
     |  - Relational Integrity, Foreign Keys, Decimal Precision                             |
     +--------------------------------------------------------------------------------------+
```

---

### 3. Layered Design & Separation of Concerns

```
[ HTTP Controller Layer ]
        |  - Express Request/Response handling
        |  - Zod Request Schema Validation
        |  - HTTP Status Codes & Uniform Error Formatter
        v
[ Middleware Layer ]
        |  - Authentication (JWT via HTTP-only secure cookie)
        |  - RBAC (ADMIN vs USER role authorization)
        |  - Idempotency Validator (Key hashing & Redis/Postgres check)
        |  - Audit Log Interceptor
        v
[ Domain Service Layer ]
        |  - Core Business Rules & Calculations (Taxes, Discounts, Landed Costs)
        |  - Transaction Orchestration ($prisma.$transaction)
        |  - High-concurrency Row Locking (Invoice & SKU generation)
        v
[ Repository / Data Access Layer ]
        |  - Prisma ORM Queries & Mutations
        |  - Raw Parameterized SQL for Ledger Aggregations & Locks
        |  - Database Connection Pooling
        v
[ PostgreSQL Database ]
```

---

### 4. Database Schema & Entity-Relationship Design

```
+------------------+         +---------------------+         +----------------------+
|       User       |         |       Product       |         |       Category       |
+------------------+         +---------------------+         +----------------------+
| id (UUID, PK)    |         | id (UUID, PK)       |         | id (UUID, PK)        |
| name             |         | name                |         | name (Unique)        |
| email (Unique)   |         | sku (Unique)        |         | description          |
| passwordHash     |         | barcode (Index)     |         +----------------------+
| role (ADMIN/USER)|         | qrCode              |                    ^
| status (ACTIVE)  |         | categoryId (FK) ----+--------------------+
| createdAt        |         | description         |
+------------------+         | sellingPrice (Dec)  |
         |                   | baseCost (Dec)      |
         | 1:N               | taxRate (Dec)       |
         v                   | reorderLevel (Int)  |
+------------------+         | status (ACTIVE)     |
|   ActivityLog    |         +---------------------+
+------------------+                    |
| id (UUID, PK)    |                    | 1:N
| userId (FK)      |                    v
| action           |         +---------------------+
| module           |         |   InventoryLedger   |
| entityId         |         +---------------------+
| ipAddress        |         | id (UUID, PK)       |
| metadata (JSON)  |         | productId (FK)      |
| createdAt        |         | transactionType     |
+------------------+         | quantity (Dec)      |
                             | signedQuantity(Dec) |
                             | unitCost (Dec)      |
                             | reason              |
                             | referenceId         |
                             | performedBy (FK)    |
                             | createdAt           |
                             +---------------------+

+------------------+         +---------------------+         +----------------------+
|     Customer     |         |        Sale         |         |       SaleItem       |
+------------------+         +---------------------+         +----------------------+
| id (UUID, PK)    | 1:N     | id (UUID, PK)       | 1:N     | id (UUID, PK)        |
| name             |-------->| invoiceNumber(Uniq) |-------->| saleId (FK)          |
| phone            |         | customerId (FK)     |         | productId (FK)       |
| email            |         | cashierId (FK)      |         | quantity (Dec)       |
| balance (Dec)    |         | subtotal (Dec)      |         | unitPrice (Dec)      |
| status           |         | totalDiscount (Dec) |         | taxAmount (Dec)      |
+------------------+         | grandTotal (Dec)    |         | historicalCost (Dec) |
         |                   | grossProfit (Dec)   |         | grossProfit (Dec)    |
         | 1:N               | paymentStatus       |         +----------------------+
         v                   +---------------------+                    |
+------------------+                    | 1:N                           | 1:N
|  CustomerLedger  |                    v                               v
+------------------+         +---------------------+         +----------------------+
| id (UUID, PK)    |         |       Payment       |         |    SaleReturnItem    |
| customerId (FK)  |         +---------------------+         +----------------------+
| transactionType  |         | id (UUID, PK)       |         | id (UUID, PK)        |
| amount (Dec)     |         | saleId (FK)         |         | saleReturnId (FK)    |
| signedAmount     |         | amount (Dec)        |         | originalSaleItemId   |
| runningBalance   |         | method (CASH/CARD)  |         | quantityReturned(Dec)|
+------------------+         | amountTendered(Dec) |         | refundTotal (Dec)    |
                             | changeDue (Dec)     |         +----------------------+
                             +---------------------+                    ^
                                        ^                               | 1:N
                                        |                    +----------------------+
                                        | 1:1                |      SaleReturn      |
                                        +--------------------| id (UUID, PK)        |
                                                             | originalSaleId (FK)  |
                                                             | returnNumber (Uniq)  |
                                                             | refundTotal (Dec)    |
                                                             | reason               |
                                                             +----------------------+

+------------------+         +---------------------+         +----------------------+
|     Supplier     | 1:N     |    PurchaseOrder    | 1:N     |  PurchaseOrderItem   |
| id (UUID, PK)    |-------->| id (UUID, PK)       |-------->| id (UUID, PK)        |
| name             |         | poNumber (Unique)   |         | purchaseOrderId (FK) |
| payableBalance   |         | supplierId (FK)     |         | productId (FK)       |
| paymentTerms     |         | subtotal (Dec)      |         | quantity (Dec)       |
+------------------+         | landedCosts (Dec)   |         | unitCost (Dec)       |
         |                   | grandTotal (Dec)    |         | allocatedLandedCost  |
         | 1:N               | status              |         | finalLandedCost(Dec) |
         v                   +---------------------+         +----------------------+
+------------------+
|  SupplierLedger  |
+------------------+
| id (UUID, PK)    |
| supplierId (FK)  |
| transactionType  |
| amount (Dec)     |
| runningBalance   |
+------------------+
```

---

### 5. Concurrency Control & Atomic Sequence Generation

#### 5.1 Atomic Invoice Sequencing
To prevent gaps, race conditions, or duplicate invoice numbers across horizontally distributed Express nodes, generation uses atomic row updates with PostgreSQL return values inside the transaction:

```sql
-- Atomic Invoice Number Generation
UPDATE "InvoiceCounter"
SET "lastNumber" = "lastNumber" + 1, "updatedAt" = NOW()
WHERE "prefix" = 'INV-'
RETURNING "lastNumber";
```
The resulting value is zero-padded (e.g., `INV-00001`).

#### 5.2 Atomic SKU Sequencing
Similarly, product SKUs are issued via:
```sql
UPDATE "ProductSkuCounter"
SET "lastNumber" = "lastNumber" + 1, "updatedAt" = NOW()
WHERE "prefix" = 'SKU-'
RETURNING "lastNumber";
```
Formatted as `SKU-00001`.

#### 5.3 Idempotency Strategy
POS checkouts submit an `Idempotency-Key` header (UUID v4).
1. The transaction checks if `IdempotencyRecord` exists for this key.
2. If it exists and status is completed, the saved response is immediately returned.
3. If not, the checkout transaction proceeds atomically, creates the sale, ledger records, and stores the completed response in `IdempotencyRecord`.

---

### 6. Calculations & Financial Integrity

#### 6.1 Inventory Ledger Balancing
- Product stock balance is never stored as an editable static counter.
- On-hand Stock = $\sum \text{signedQuantity}$.
  - Stock In / Purchase Receipt / Return / Positive Adjustment: $+Q$
  - Stock Out / Sale / Negative Adjustment: $-Q$

#### 6.2 Taxes & Discounts
- **Tax-Exclusive Pricing**:
  $$\text{Effective Price} = \text{Selling Price} - \text{Allocated Discount}$$
  $$\text{Tax Amount} = \text{Effective Price} \times \text{Tax Rate}$$
  $$\text{Line Total} = \text{Effective Price} + \text{Tax Amount}$$
- **Tax-Inclusive Pricing**:
  $$\text{Effective Price} = \frac{\text{Selling Price} - \text{Allocated Discount}}{1 + \text{Tax Rate}}$$
  $$\text{Tax Amount} = (\text{Selling Price} - \text{Allocated Discount}) - \text{Effective Price}$$
  $$\text{Line Total} = \text{Selling Price} - \text{Allocated Discount}$$

#### 6.3 Landed Cost Allocation
Landed costs (freight, duties, handling) in Purchase Orders are allocated proportionally to purchase value:
$$\text{Allocated Landed Cost}_i = \frac{\text{Item Subtotal}_i}{\text{PO Subtotal}} \times \text{Total Landed Costs}$$
$$\text{Final Landed Unit Cost}_i = \text{Unit Cost}_i + \frac{\text{Allocated Landed Cost}_i}{\text{Quantity}_i}$$
Upon receiving the PO, the inventory ledger is incremented with `finalLandedUnitCost`, and the product's `baseCost` is updated.

#### 6.4 Gross Profit Snapshot
When a sale is executed:
- The line item cost is snapshotted from the product's current `baseCost`.
- Line Gross Profit = $\text{Effective Line Subtotal} - (\text{Quantity} \times \text{Historical Base Cost})$.
- Subsequent supplier price updates or cost adjustments never mutate historical profit figures.

---

### 7. Role-Based Access Control (RBAC) Matrix

| Feature / Resource | ADMIN | USER (Cashier/Staff) |
|---|:---:|:---:|
| View Dashboard Analytics & KPIs | Yes | No |
| Product Catalog (View / Add / Edit) | Yes | Yes |
| Product Catalog (Delete) | Yes | No |
| Print QR / Barcode Labels | Yes | Yes |
| Record Stock In / Stock Out / Bulk Receive | Yes | Yes |
| Stocktake & Stock Adjustments | Yes | No |
| Delete Stock Ledger Entries | Yes (Audit trail) | No |
| POS Terminal (Scan, Cart, Hold, Checkout) | Yes | Yes |
| Sales History (View & Reprint Receipts) | Yes | Yes |
| Process Sales Returns | Yes | No |
| Customer Management (View / Add / Edit) | Yes | Yes |
| Customer Management (Delete) | Yes | No |
| Customer Credit Ledger Management | Yes | No |
| Supplier Management & Accounts Payable | Yes | No |
| Purchase Orders (Create, Receive, Landed Cost) | Yes | No |
| Expense Management | Yes | No |
| User Management & Role Assignment | Yes | No |
| System Settings & Categories | Yes | No |
| Activity Logs & Audit Trails | Yes | No |

---

### 8. Deployment & Load Balancing Configuration

- **Docker Compose**: Orchestrates `client` (Next.js), `api1` & `api2` (Express stateless instances), `postgres`, `redis`, `worker` (BullMQ), and `nginx`.
- **Nginx**:
  - Upstream pool `backend_nodes` with `least_conn`.
  - Reverse proxies `/api` to Express cluster with health-check fallback.
  - Proxies Next.js frontend on `/`.
  - Configured with security headers (CSP, HSTS, X-Content-Type-Options).

