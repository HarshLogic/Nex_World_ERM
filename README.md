# Records Manager ERP + POS + Inventory Management System

An enterprise-ready, horizontally scalable, multi-tier web application built with Clean Architecture, SOLID principles, ACID transaction guarantees, and an immutable ledger-based inventory engine.

---

## 1. Key Features

- **High-Speed QR / Barcode POS Terminal**: Instant client-side cached lookup + backend search fallback, multi-item cart, item & transaction-level proportional discounts, customer selection, hold/recall cart persistence, cash tender change due calculation, and one-click 80mm thermal receipt printing.
- **Immutable Inventory Ledger**: Stock quantities are derived purely as $\sum \text{signedQuantity}$. Includes Stock In, Stock Out, Bulk Receive, physical Stocktake reconciliation, and low-stock alerts.
- **Concurrency-Safe Sequencing**: Atomic invoice numbers (`INV-00001`) and product SKUs (`SKU-00001`) generated using database row-level locking. Idempotency-Key headers prevent double-billing on checkout retries.
- **Procurement & Landed Cost Allocation**: Purchase orders with proportional landed cost distribution (freight, customs, handling) updating product catalog base costs upon physical receipt.
- **Financial Integrity & Sales Returns**: Historical base costs and gross profit margins are snapshotted at checkout. Sales returns enforce strict eligibility limits ($\le \text{Sold} - \text{Returned}$) and restore inventory.
- **Role-Based Access Control (RBAC)**: Strict permission boundaries between `ADMIN` and `USER` (Cashier) enforced at both the Next.js UI layer and the Express API gateway (HTTP 403 Forbidden).
- **Executive Dashboard**: Real-time business KPIs (Today's Sales, Orders, Low Stock Items, Credit Outstanding, Stock Value, Monthly Revenue, Expenses, Net Profit/Loss) and interactive Recharts visualizations.

---

## 2. Technology Stack

- **Frontend**: Next.js 15 (App Router), React, JavaScript, Tailwind CSS, Lucide React, Recharts, React Hook Form.
- **Backend**: Node.js, Express.js (Stateless), JavaScript, Prisma ORM, JWT (secure HTTP-only cookies), bcrypt.
- **Persistence & Caching**: PostgreSQL 16 (Single source of truth), Redis 7 (Caching, rate limiting, queues).
- **Infrastructure**: Nginx reverse proxy load-balancer (`least_conn` algorithm), Docker, Docker Compose.

---

## 3. Directory Layout

```
ERP/
├── client/                      # Next.js 15 App Router Frontend
│   ├── app/                     # Pages (dashboard, pos, products, inventory, sales, etc.)
│   ├── components/layout/       # AppLayout (Sidebar, TopBar, Notifications)
│   ├── context/                 # AuthContext & ToastContext
│   └── lib/api.js               # Standard HTTP client
├── server/                      # Stateless Express.js REST API
│   ├── prisma/                  # schema.prisma & seed.js
│   └── src/
│       ├── config/              # Prisma, Redis, Env configuration
│       ├── middleware/          # Auth, RBAC, Idempotency, Error handler
│       ├── modules/             # Auth, Products, POS, Inventory, Purchases, etc.
│       ├── routes/              # Centralized route registration
│       └── utils/               # Pure calculation utilities, counters, audit
├── infrastructure/              # Nginx configuration & Dockerfiles
├── tests/                       # Automated Unit, Concurrency, and Integration tests
├── docker-compose.yml           # Containerized orchestration
├── ARCHITECTURE.md              # Architectural specification
├── DATABASE_SCHEMA.md           # Entity relationship & model documentation
├── API_DOCUMENTATION.md         # Complete REST API reference
├── DEPLOYMENT_GUIDE.md          # Multi-instance deployment manual
├── IMPLEMENTATION_CHECKLIST.md  # 9-Phase execution verification tracker
└── TEST_REPORT.md               # Automated test execution report
```

---

## 4. Quick Start

### 4.1 Running the Automated Test Suite
```bash
npm run test
# Or run individual suites:
npm run test:unit
npm run test:concurrency
npm run test:integration
```

### 4.2 Running with Docker Compose (Multi-Instance Nginx)
```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and start containers
docker compose up -d --build

# 3. Seed database
docker compose exec api1 node prisma/seed.js

# 4. Open Application
# Frontend: http://localhost:3000 (or http://localhost via Nginx)
# Health Check: http://localhost/api/health
```

---

## 5. Demo Access Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **ADMIN** | `admin@recordsmanager.ae` | `Admin@123456` | Full system access (Dashboard, Catalog, Stocktake, Purchases, Expenses, Users, Settings, Activity Logs) |
| **USER** (Cashier) | `cashier@recordsmanager.ae` | `Cashier@123456` | POS terminal, Product catalog, Stock In/Out, Bulk Receive, Sales history |

# Nex_World_ERM
