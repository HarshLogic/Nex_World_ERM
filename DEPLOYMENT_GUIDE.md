# Production Deployment & Infrastructure Guide

This guide describes how to run and verify the Records Manager ERP + POS + Inventory Management System in a production-ready, horizontally scalable Docker Compose environment.

---

## 1. System Topology

```
             +-----------------------+
             |  Nginx Reverse Proxy  | (Port 80 / 443)
             |   & Load Balancer     |
             +-----------------------+
               /         |         \
              /          |          \
             v           v           v
    +-------------+ +-------------+ +-------------+
    | Express API | | Express API | | Next.js 15  |
    | Instance 1  | | Instance 2  | | Frontend    |
    | (Port 5001) | | (Port 5002) | | (Port 3000) |
    +-------------+ +-------------+ +-------------+
           \             /
            \           /
             v         v
     +-----------------------------------+
     |        PostgreSQL Primary         | (Port 5432)
     |          Redis Cluster            | (Port 6379)
     |          BullMQ Worker            |
     +-----------------------------------+
```

---

## 2. Infrastructure Components

### 2.1 Services Defined in `docker-compose.yml`
1. `client`: Next.js 15 App Router production server.
2. `api1`: Stateless Node.js / Express backend instance 1.
3. `api2`: Stateless Node.js / Express backend instance 2.
4. `worker`: BullMQ background worker for asynchronous reporting and notifications.
5. `postgres`: PostgreSQL 16 database with persistent storage volume `pgdata`.
6. `redis`: Redis 7 Alpine cache and job queue broker.
7. `nginx`: Nginx reverse proxy load-balancing requests across `api1` and `api2` using `least_conn`.

---

## 3. Quick Start Commands

### 3.1 Setup Environment Configuration
```bash
cp .env.example .env
```

### 3.2 Build and Start Containers
```bash
# Build and run all services in detached mode
docker compose up -d --build

# View running container status
docker compose ps
```

### 3.3 Database Migrations & Seeding
```bash
# Run Prisma migrations inside the backend container
docker compose exec api1 npx prisma migrate deploy

# Seed initial roles, demo users (admin & cashier), categories, and business settings
docker compose exec api1 node prisma/seed.js
```

### 3.4 Verification & Health Checks
```bash
# Check Nginx load balancer health
curl http://localhost/api/health

# Inspect backend logs to confirm horizontal distribution
docker compose logs -f nginx api1 api2
```

### 3.5 Stopping and Cleaning Up
```bash
# Stop containers gracefully
docker compose down

# Stop containers and remove persistent volumes (Caution: removes database data)
docker compose down -v
```

