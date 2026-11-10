# Known Issues & Technical Decisions

## 1. Runtime Environment & Isolated Execution
- **Sandbox Network Isolation**: The host execution sandbox operates without external outbound Internet connectivity by default. Production deployments run containerized using the provided `docker-compose.yml`. For self-contained testing, all core modules include standalone unit test suites, mathematical verification harnesses, and embedded fixtures using Node.js 22's native test runner (`node:test`).
- **Prisma Generator Engine**: The Prisma schema is prepared for PostgreSQL. In the containerized architecture, database migrations execute directly against the persistent PostgreSQL instance.

## 2. Concurrency Safety Notes
- Sequence generation for `InvoiceCounter` and `ProductSkuCounter` leverages atomic row increments with `RETURNING` clauses in PostgreSQL transactions to eliminate gaps and race conditions under multi-instance Express clustering.
- Idempotency verification keys on `/api/pos/checkout` guarantee that duplicate HTTP POST retries will never double-deduct inventory or create duplicate invoices.

## 3. Financial Precision
- All calculations are processed with strict 2-decimal precision. Zero floating-point drift is allowed. Item-level discounts and transaction-level discounts allocate proportionally with residual cents applied to the highest-value line item.

