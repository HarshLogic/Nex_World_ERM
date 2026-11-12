# CLIENT SETUP GUIDE
**Perfume ERP, Inventory Management & POS Web Application**  
**Version:** 1.0.0 (Production Release)  
**Target Platform:** Linux / macOS / Windows / Cloud (Railway, VPS, Docker)

---

## 1. System Requirements

### Option A: Running with Docker & Docker Compose (Recommended)
- **Docker Engine:** v24.0 or higher
- **Docker Compose:** v2.20 or higher
- **RAM:** Minimum 2 GB (4 GB recommended)
- **Storage:** Minimum 10 GB available SSD space

### Option B: Running Directly on Host (Node.js & PostgreSQL)
- **Node.js:** v20.x or v22.x LTS
- **npm:** v10.x or higher
- **PostgreSQL:** v15 or v16
- **RAM:** Minimum 2 GB

---

## 2. Environment Configuration

1. Copy the example environment file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and configure your credentials:
   ```env
   # Node Environment
   NODE_ENV=production
   PORT=5000

   # Next.js Client
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   CLIENT_PORT=3000

   # PostgreSQL Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=erp_user
   DB_PASSWORD=YOUR_STRONG_DB_PASSWORD
   DB_NAME=erp_records_db
   DATABASE_URL=postgresql://erp_user:YOUR_STRONG_DB_PASSWORD@localhost:5432/erp_records_db?schema=public

   # Initial Administrator Credentials (Backend Only)
   ADMIN_NAME=Administrator
   ADMIN_EMAIL=admin@yourperfumestore.com
   ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD_MIN_8_CHARS
   ADMIN_ROLE=ADMIN

   # JWT Security Key (Minimum 32 random characters)
   JWT_SECRET=generate_a_random_32_character_secret_key_here
   JWT_EXPIRES_IN=7d
   COOKIE_NAME=erp_token
   COOKIE_SECURE=false

   # Business Defaults
   DEFAULT_CURRENCY=AED
   DEFAULT_TAX_RATE=5.00
   PRICES_INCLUDE_TAX=true
   ```

> [!IMPORTANT]
> Never commit your real `.env` file to version control. It is already excluded by `.gitignore`.

---

## 3. Quick Start with Docker Compose

To launch the complete system (PostgreSQL Database, Load Balancer, Multi-instance Backend, and Next.js Frontend):

```bash
# Build and start all services in background
docker compose up -d --build

# View container status
docker compose ps

# View application logs
docker compose logs -f
```

The application will be accessible at:
- **Web Application & POS:** `http://localhost:3000` (or `http://localhost` if using Nginx)
- **API Health Check:** `http://localhost:5000/health`

---

## 4. Manual Setup (Without Docker)

### Step 1: Install Dependencies
From the repository root:
```bash
npm install
```

### Step 2: Initialize Database & Run Migrations
From `server/`:
```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

### Step 3: Seed Reference Categories & Bootstrap Admin Account
```bash
node prisma/seed.js
```
*This command creates the 8 perfume reference categories (Oud & Agarwood, Attar & Pure Oils, etc.), initializes Business Settings with Dubai 5% VAT, and creates the Administrator account defined in your `.env`.*

### Step 4: Build the Next.js Frontend
From the root directory:
```bash
npm run build -w client
```

### Step 5: Start Backend and Frontend
- **Start Backend:**
  ```bash
  cd server
  npm start
  ```
- **Start Frontend (in a separate terminal):**
  ```bash
  cd client
  npm start
  ```

---

## 5. Maintenance & Useful Commands

| Task | Command | Description |
|---|---|---|
| **Run Automated Tests** | `npm test` | Runs all 45 unit, concurrency, RBAC, and health check tests. |
| **Database Backup** | `npm run db:backup -w server` | Creates a timestamped JSON snapshot in `backups/`. |
| **Database Reset & Clean** | `npm run db:clean -w server` | Safely purges demo records, resets counters, and re-bootstraps admin. |
| **Bootstrap Admin** | `npm run bootstrap:admin -w server` | Idempotently creates or verifies the administrator account from `.env`. |
