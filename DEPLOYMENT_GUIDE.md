# PRODUCTION DEPLOYMENT GUIDE
**Perfume ERP, Inventory Management & POS Web Application**  
**Version:** 1.0.0 (Production Release)  

---

## 1. Production Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│                   CLIENT BROWSER                       │
│     (Desktop POS Terminal, Tablets, Cashier PC)       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS
                           ▼
┌────────────────────────────────────────────────────────┐
│             FRONTEND SERVICE (Next.js 15)              │
│       SSR / Static POS Pages, Client Route Guards      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / REST API
                           ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND SERVICE (Node.js/Express)          │
│       JWT Auth, RBAC, POS Engine, In-Memory Cache      │
└──────────────────────────┬─────────────────────────────┘
                           │ TCP (Port 5432)
                           ▼
┌────────────────────────────────────────────────────────┐
│            POSTGRESQL DATABASE (v16)                   │
│   Referential Integrity, ACID Ledger, Sequence Counters │
└────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Redis Architecture Note:** Following a comprehensive audit, Redis was decommissioned in favor of a zero-dependency in-memory TTL cache backed by PostgreSQL's `IdempotencyRecord` table. This eliminates external Redis container costs, connection dropouts, and maintenance overhead without sacrificing performance.

---

## 2. Deploying on Railway (Cloud Hosting)

Railway is recommended for multi-service hosting with automatic HTTPS and zero DevOps maintenance.

### Step 1: Provision PostgreSQL Database
1. In your Railway project, click **New** ➔ **Database** ➔ **Add PostgreSQL**.
2. Railway will create the PostgreSQL container and automatically generate the `DATABASE_URL` variable.

### Step 2: Deploy Backend Service (`erp-backend`)
1. Click **New** ➔ **GitHub Repo** ➔ Select your repository (`Nex_World_ERM`).
2. Set **Root Directory:** `/server`
3. Under **Variables**, configure:
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=YOUR_SECURE_RANDOM_SECRET_AT_LEAST_32_CHARS
   JWT_EXPIRES_IN=7d
   COOKIE_NAME=erp_token
   COOKIE_SECURE=true
   ADMIN_NAME=Administrator
   ADMIN_EMAIL=admin@yourperfumestore.com
   ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD
   ADMIN_ROLE=ADMIN
   DEFAULT_CURRENCY=AED
   DEFAULT_TAX_RATE=5.00
   PRICES_INCLUDE_TAX=true
   ```
4. Under **Settings** ➔ **Deploy** ➔ **Custom Start Command**:
   ```bash
   npx prisma db push && node prisma/seed.js && npm start
   ```
5. Click **Deploy**.
6. Under **Settings** ➔ **Networking** ➔ Click **Generate Domain** (e.g. `https://erp-backend-production-xyz.up.railway.app`).

### Step 3: Deploy Frontend Service (`ERP_Frontend`)
1. In the same project, click **New** ➔ **GitHub Repo** ➔ Select your repository.
2. Set **Root Directory:** `/client`
3. Under **Variables**, add:
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://erp-backend-production-xyz.up.railway.app/api
   ```
   *(Replace with the actual public URL generated for your backend service).*
4. Under **Settings** ➔ **Networking** ➔ Click **Generate Domain** (or bind your custom domain, e.g., `pos.yourperfumestore.com`).
5. Click **Deploy**.

---

## 3. Deploying with Docker Compose (VPS / Dedicated Server)

For self-hosting on Ubuntu/Debian Linux VPS (DigitalOcean, AWS EC2, Hetzner, Linode):

### Step 1: Prepare Server
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
```

### Step 2: Clone Repository & Configure Environment
```bash
git clone https://github.com/YourRepo/Nex_World_ERM.git /opt/perfume-erp
cd /opt/perfume-erp
cp .env.example .env
nano .env   # Configure DB_PASSWORD, ADMIN_PASSWORD, JWT_SECRET, etc.
```

### Step 3: Launch Containers
```bash
docker compose up -d --build
```

### Step 4: Verify Deployment
```bash
docker compose ps
curl http://localhost:5000/health
```

---

## 4. Production Checklist

- [x] **SSL / HTTPS:** Enforced across all domains (handled automatically by Railway or Nginx reverse proxy).
- [x] **Database Migrations:** Prisma schema in sync; `seed.js` initializes business settings and administrator account.
- [x] **Secure Cookies:** `COOKIE_SECURE=true` in production with `SameSite: None` for cross-origin deployments.
- [x] **RBAC Enforcement:** Cashiers (`USER` role) are authoritatively restricted from administrative APIs.
- [x] **Health Check Endpoint:** `GET /health` and `GET /` available for load balancer and uptime monitoring.
- [x] **Zero Demo Data:** All dummy products, test sales, and hardcoded credentials removed.
