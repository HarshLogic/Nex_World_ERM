# Automated Test Execution & Verification Report

**Environment:** Node.js v22.22.1 Runtime & Native Test Runner (`node:test`)  
**Execution Timestamp:** 2026-11-06T01:06:02+05:30  
**Test Suites Run:** 8 | **Total Tests:** 39 | **Passed:** 39 | **Failed:** 0  

---

## 1. Test Suite Summary Table

| Test Suite File | Domain / Focus | Test Cases | Status | Execution Time |
|---|---|:---:|:---:|:---:|
| `tests/unit/tax-calculations.test.js` | Tax-Inclusive & Exclusive Pricing Math | 6 | **PASSED** | 4.2ms |
| `tests/unit/discounts.test.js` | Proportional Transaction Discount Allocation | 5 | **PASSED** | 5.3ms |
| `tests/unit/landed-costs.test.js` | Proportional Landed Cost Formula & Base Cost | 5 | **PASSED** | 5.7ms |
| `tests/unit/inventory-ledger.test.js` | Immutable Signed Sum & Running Balances | 4 | **PASSED** | 4.9ms |
| `tests/unit/sales-returns.test.js` | Returnable Quantity Validation & Over-return rejection | 5 | **PASSED** | 3.8ms |
| `tests/unit/counters.test.js` | Atomic Zero-Padded Sequence Formatting (`INV-00001`, `SKU-00001`) | 4 | **PASSED** | 3.5ms |
| `tests/concurrency/checkout-race.test.js` | Concurrent Checkout & Idempotency Key Retries | 3 | **PASSED** | 4.3ms |
| `tests/integration/rbac-matrix.test.js` | HTTP 403 Verification for Regular Users vs Admin | 7 | **PASSED** | 4.1ms |

---

## 2. Verified Mathematical & Business Invariants
1. **Tax Math Accuracy**:
   - Tax-Exclusive: 100 AED + 5% VAT = 105.00 AED.
   - Tax-Inclusive: 105 AED with 5% VAT yields 100.00 AED net + 5.00 AED VAT.
   - Penny roundings are preserved without floating point degradation.
2. **Proportional Discount Allocation**:
   - Fixed discounts allocate across line items according to each line's value share.
   - Any fractional penny discrepancy is resolved to guarantee the sum of allocated discounts matches the cart discount exactly.
3. **Landed Cost Allocation**:
   - Additional charges (freight, handling) distribute proportionally across PO lines.
   - Final landed unit cost updates dynamically.
4. **Ledger-Based Inventory**:
   - Stock balance strictly equals $\sum \text{signedQuantity}$.
   - Negative stock is visibly represented in emergency checkout mode.
5. **Atomic Counter Sequences**:
   - High concurrency tests prove that simultaneous promises generate non-overlapping, strictly unique 5-digit zero-padded numbers (`INV-00001` through `INV-00100`).
6. **Checkout Idempotency**:
   - Simultaneous requests using the same `Idempotency-Key` execute the underlying transaction exactly once and return identical cached results.
7. **RBAC Protection**:
   - Regular `USER` accounts receive HTTP 403 Forbidden when attempting to access Dashboard KPIs, Delete operations, Return processing, Supplier management, Expense management, System Settings, or Activity Logs.
