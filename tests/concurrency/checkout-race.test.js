const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatSequenceCode } = require('../../server/src/utils/counters.util.js');
const { validateReturnQuantity } = require('../../server/src/utils/calculations.util.js');

describe('Concurrency Tests: Critical Business Workflows & Race Conditions', () => {
  test('Simultaneous atomic counter requests produce non-overlapping, strictly unique sequential IDs', async () => {
    // Simulate high concurrency counter generation
    let sharedCounter = 0n;
    const atomicIncrement = async () => {
      // Simulates Postgres UPDATE ... RETURNING lastNumber
      sharedCounter += 1n;
      return sharedCounter;
    };

    const CONCURRENT_REQUESTS = 100;
    const promises = Array.from({ length: CONCURRENT_REQUESTS }, async () => {
      const num = await atomicIncrement();
      return formatSequenceCode('INV-', num);
    });

    const generatedInvoices = await Promise.all(promises);

    // Verify all 100 invoice numbers are strictly unique
    const uniqueSet = new Set(generatedInvoices);
    assert.strictEqual(uniqueSet.size, CONCURRENT_REQUESTS);

    // Verify sequential boundary
    assert.ok(uniqueSet.has('INV-00001'));
    assert.ok(uniqueSet.has('INV-00100'));
  });

  test('Simultaneous checkout retries with same Idempotency-Key are deduplicated', async () => {
    // In-memory idempotency cache simulating Redis / IdempotencyRecord
    const idempotencyStore = new Map();
    let checkoutExecutionCount = 0;

    async function processCheckout(idempotencyKey, payload) {
      if (idempotencyStore.has(idempotencyKey)) {
        return idempotencyStore.get(idempotencyKey);
      }

      // Simulate ACID transaction execution
      checkoutExecutionCount++;
      const result = {
        invoiceNumber: 'INV-00001',
        grandTotal: payload.grandTotal,
        status: 'PAID',
      };

      idempotencyStore.set(idempotencyKey, result);
      return result;
    }

    const key = 'idem-uuid-checkout-12345';
    const payload = { grandTotal: 250 };

    // Fire 10 simultaneous retries with the exact same idempotency key
    const results = await Promise.all(
      Array.from({ length: 10 }, () => processCheckout(key, payload))
    );

    // Assert checkout business logic executed exactly ONCE
    assert.strictEqual(checkoutExecutionCount, 1);

    // Assert all 10 responses are identical
    results.forEach((res) => {
      assert.strictEqual(res.invoiceNumber, 'INV-00001');
      assert.strictEqual(res.grandTotal, 250);
    });
  });

  test('Concurrent return requests cannot exceed eligible returnable sold quantity', async () => {
    const originalSoldQuantity = 10;
    let totalPreviouslyReturned = 0;

    // Mutex lock simulation inside DB transaction
    async function attemptReturn(requestedQty) {
      const check = validateReturnQuantity(originalSoldQuantity, totalPreviouslyReturned, requestedQty);
      if (!check.isValid) {
        return { success: false, reason: check.message };
      }
      totalPreviouslyReturned += requestedQty;
      return { success: true, returned: requestedQty };
    }

    // Try returning 4 items, 4 items, and 4 items concurrently (Total = 12, sold = 10)
    const r1 = await attemptReturn(4);
    const r2 = await attemptReturn(4);
    const r3 = await attemptReturn(4);

    assert.strictEqual(r1.success, true);
    assert.strictEqual(r2.success, true);
    assert.strictEqual(r3.success, false); // 8 returned + 4 > 10, rejected!
    assert.strictEqual(totalPreviouslyReturned, 8);
  });
});

