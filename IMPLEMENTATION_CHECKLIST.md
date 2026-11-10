# Master Implementation Checklist: Records Manager ERP + POS + Inventory

Status Legend:
- [ ] Pending
- [/] In Progress
- [x] Completed & Verified

---

### Phase 1: Foundation & Project Structure
- [x] Initialize monorepo directory structure (`client/`, `server/`, `infrastructure/`, `tests/`)
- [x] Configure Express backend with JavaScript, modular controllers, services, repositories, and routes
- [x] Configure Next.js 15 App Router frontend with JavaScript, Tailwind CSS, Lucide React, Recharts
- [x] Configure PostgreSQL with Prisma ORM schema covering all 27 domain entities with indexes, UUIDs, decimals
- [x] Set up database migrations, seeding script (`server/prisma/seed.js`), and connection pooling
- [x] Configure Redis client with distributed coordination, token caching, and fallback resiliency
- [x] Configure BullMQ background job queues and worker specifications
- [x] Configure Dockerfile for client (`Dockerfile.client`) and server (`Dockerfile.server`)
- [x] Configure Docker Compose with multi-instance backend (`api1`, `api2`), Nginx load balancer, PostgreSQL, and Redis
- [x] Configure Nginx reverse proxy with `least_conn` upstream load balancing and health checks

---

### Phase 2: Authentication, Authorization & Security (RBAC)
- [x] User password hashing with `bcrypt` (12 salt rounds)
- [x] Secure JWT issuance with HTTP-only, SameSite cookies and session persistence
- [x] Access token and session verification middleware (`auth.middleware.js`)
- [x] RBAC middleware enforcing `ADMIN` vs `USER` route permissions (HTTP 403 on violation)
- [x] Frontend Auth context (`AuthContext.js`), route guards, and automatic redirection
- [x] Login screen with demo fast-fill pills, validation, session validation, and account status check
- [x] User profile and logout flow with cookie invalidation
- [x] Security headers (Helmet), CORS configuration, and distributed token-bucket rate limiting

---

### Phase 3: Master Data Management
- [x] Category Management API & UI:
  - [x] Add, edit, list, and delete categories (Admin only with product link safeguards)
- [x] Product Catalog API & UI:
  - [x] Concurrency-safe atomic SKU generation (`SKU-00001`) via database counter
  - [x] Barcode & QR code generation and printable sticker label modal
  - [x] Full product CRUD (Admin: delete; User: view/add/edit)
  - [x] Product search, category filters, stock status filters, and pagination
  - [x] CSV export, reorder recommendation report, and table print
- [x] Customer Management API & UI:
  - [x] Customer profile, group, contact information
  - [x] Customer balance tracking & customer credit ledger
  - [x] Customer CRUD (Admin: delete; User: view/add/edit)
- [x] Supplier Management API & UI (Admin only):
  - [x] Supplier contact, payment terms (COD, Net 15, Net 30, Net 60)
  - [x] Accounts payable balance and supplier transaction ledger
  - [x] Record supplier payment modal
- [x] Business Settings API & UI (Admin only):
  - [x] Business information, currency configuration (Default AED)
  - [x] Tax configuration (Inclusive vs Exclusive, default 5% tax rate)
  - [x] Invoice prefix (`INV-`), receipt header and footer settings

---

### Phase 4: Immutable Inventory & Stock Movements
- [x] Immutable Ledger-based Inventory System:
  - [x] `InventoryLedger` table with signed quantities (+/-)
  - [x] Stock calculation: $Q_{\text{on-hand}} = \sum \text{signedQuantity}$
  - [x] Prevent direct historical ledger row mutation
- [x] Stock Operations:
  - [x] Stock In (Positive movement with unit cost and reason)
  - [x] Stock Out (Negative movement with operational reason)
  - [x] Bulk Receive multi-item workflow
  - [x] Physical Stocktake reconciliation and automated corrective adjustment entries
  - [x] Admin-only audited stock correction records
  - [x] Low-stock threshold alerts and negative stock visibility in emergency POS mode
  - [x] Print ledger and filter by movement types

---

### Phase 5: Procurement & Landed Cost Calculation
- [x] Purchase Order Management (Admin only):
  - [x] PO statuses: `DRAFT`, `PENDING`, `RECEIVED`, `CANCELLED`
  - [x] Multi-item line entry with quantity and supplier unit cost
  - [x] Additional landed costs entry (freight, customs, handling)
  - [x] Proportional value landed cost calculation:
    $$\text{Allocated Landed Cost}_i = \frac{\text{Item Subtotal}_i}{\text{PO Subtotal}} \times \text{Landed Costs}$$
  - [x] Final landed unit cost computation and transparency breakdown
- [x] PO Receiving Workflow:
  - [x] Stock only received upon explicit Receive confirmation
  - [x] Positive ledger entry at `finalLandedUnitCost`
  - [x] Automatic update of product catalog `baseCost`
  - [x] Accounts payable record created in `SupplierLedger`

---

### Phase 6: Point of Sale (POS) / QR Sales Terminal
- [x] High-Speed POS Interface:
  - [x] Barcode & QR code scanning integration and manual SKU search with client-side cache & backend fallback
- [x] Cart & Hold Cart Management:
  - [x] Quantity increments/decrements, item removal, dynamic recalculations
  - [x] Hold Cart persistence in PostgreSQL (retrieve, resume, delete)
- [x] Discounts & Tax Calculation:
  - [x] Percentage and fixed discounts (item-level & transaction-level)
  - [x] Proportional distribution of transaction-level discounts across line items
  - [x] Accurate tax calculation (tax-inclusive and tax-exclusive modes)
- [x] Concurrency-Safe Checkout:
  - [x] Idempotency-Key validation to prevent double-billing on retries
  - [x] Backend recalculation of all prices, taxes, discounts, and current costs
  - [x] Concurrency-safe atomic invoice generation (`INV-00001`) via row lock
  - [x] ACID transaction:
    - [x] Insert `Sale` and `SaleItem` records
    - [x] Insert `Payment` record with change calculation for cash
    - [x] Insert negative `InventoryLedger` stock-out entries
    - [x] Snapshot historical base cost and gross profit per item
    - [x] Update customer credit balance if applicable
    - [x] Append audit log entry
- [x] Thermal & Standard Receipt:
  - [x] Printable 80mm thermal receipt layout & standard browser print layout with one-click print

---

### Phase 7: Financials, Sales History & Returns
- [x] Sales History API & UI:
  - [x] Invoice search, date filters, customer filters, payment method filters
  - [x] Detailed invoice view and receipt reprint
  - [x] Accurate historical gross profit reporting using saved cost snapshots
  - [x] Sales log print layout
- [x] Sales Return Processing (Admin only):
  - [x] Strict returnable quantity validation: $\le \text{Sold Quantity} - \text{Total Returned}$
  - [x] Reject over-returns with explicit validation error
  - [x] Atomic return transaction:
    - [x] Create `SaleReturn` and `SaleReturnItem`
    - [x] Create positive `InventoryLedger` movement (reason: `RETURN`)
    - [x] Refund payment record or customer balance update
    - [x] Preserve original sale and profit snapshots
- [x] Expense Management (Admin only):
  - [x] Expense categories, payees, payment methods, notes
  - [x] Date filtering and total AED expense calculations
  - [x] Print expense report

---

### Phase 8: Administration, Audit Logs & Notifications
- [x] User Management (Admin only):
  - [x] User creation, role assignment (`ADMIN` / `USER`), status toggle, password reset
  - [x] Self-privilege escalation prevention
- [x] In-App Notification System:
  - [x] Low-stock alerts, purchase order updates, checkout notifications
  - [x] Unread counter, floating panel, mark all read
- [x] Audit Trail / Activity Logs:
  - [x] Append-only activity logging for all critical operations
  - [x] User, module, action, date filtering and pagination (Admin only)
- [x] Dashboard Analytics (Admin only):
  - [x] Real-time KPIs: Today's Sales, Orders, Low Stock Items, Credit Outstanding, Stock Value, Monthly Revenue, Monthly Expenses, Net Profit/Loss
  - [x] Charts: 7-day revenue trend (AreaChart), sales by payment method (PieChart), recent sales table, low-stock alerts table

---

### Phase 9: Production Readiness, Testing & Verification
- [x] Automated Unit Tests (`tests/unit/*.test.js`):
  - [x] Tax calculations (inclusive & exclusive)
  - [x] Proportional discount distribution
  - [x] Landed cost allocation
  - [x] Inventory ledger balance calculations
  - [x] Return quantity validation
  - [x] Atomic counter formatting
- [x] Integration & Concurrency Tests (`tests/concurrency/*.test.js`, `tests/integration/*.test.js`):
  - [x] Simultaneous checkout race-condition tests
  - [x] Idempotency key retry verification
  - [x] Return limit boundary tests
  - [x] RBAC permission matrix verification (Admin vs User)
- [x] Multi-Instance Load Balancer & Container Configuration:
  - [x] Nginx `least_conn` upstream configuration
  - [x] Stateless Express instances (`api1`, `api2`)
  - [x] Persistent PostgreSQL and Redis broker
- [x] Documentation & Guides:
  - [x] `PROJECT_AUDIT.md`
  - [x] `ARCHITECTURE.md`
  - [x] `DATABASE_SCHEMA.md`
  - [x] `API_DOCUMENTATION.md`
  - [x] `DEPLOYMENT_GUIDE.md`
  - [x] `TEST_REPORT.md`
  - [x] `KNOWN_ISSUES.md`
