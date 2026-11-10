const { test, describe } = require('node:test');
const assert = require('node:assert');
const { allocateTransactionDiscount, round2 } = require('../../server/src/utils/calculations.util.js');

describe('Unit Tests: Transaction-Level Discount Proportional Allocation', () => {
  test('Proportional allocation of 30 AED fixed discount across 2 items (100 AED and 200 AED)', () => {
    const items = [
      { price: 100, quantity: 1, itemDiscount: 0 },
      { price: 200, quantity: 1, itemDiscount: 0 },
    ];

    const allocations = allocateTransactionDiscount(items, {
      type: 'FIXED',
      value: 30,
    });

    // 100 AED item gets (100/300) * 30 = 10.00 AED
    // 200 AED item gets (200/300) * 30 = 20.00 AED
    assert.strictEqual(allocations[0], 10);
    assert.strictEqual(allocations[1], 20);
    assert.strictEqual(round2(allocations[0] + allocations[1]), 30);
  });

  test('Percentage discount (10%) across 3 items (50, 100, 150 AED)', () => {
    const items = [
      { price: 50, quantity: 1 },
      { price: 100, quantity: 1 },
      { price: 150, quantity: 1 },
    ];

    const allocations = allocateTransactionDiscount(items, {
      type: 'PERCENTAGE',
      value: 10,
    });

    // 50 -> 5.00 AED
    // 100 -> 10.00 AED
    // 150 -> 15.00 AED
    assert.deepStrictEqual(allocations, [5, 10, 15]);
  });

  test('Fixed discount capped at cart subtotal (preventing negative totals)', () => {
    const items = [
      { price: 50, quantity: 1 },
      { price: 50, quantity: 1 },
    ];

    // Subtotal = 100, Attempting 150 AED discount
    const allocations = allocateTransactionDiscount(items, {
      type: 'FIXED',
      value: 150,
    });

    assert.strictEqual(round2(allocations[0] + allocations[1]), 100);
    assert.strictEqual(allocations[0], 50);
    assert.strictEqual(allocations[1], 50);
  });

  test('Penny discrepancy resolution on unequal values (10 AED discount over 3 items of 33.33 AED)', () => {
    const items = [
      { price: 10, quantity: 1 },
      { price: 10, quantity: 1 },
      { price: 10, quantity: 1 },
    ];

    const allocations = allocateTransactionDiscount(items, {
      type: 'FIXED',
      value: 10,
    });

    const sum = round2(allocations.reduce((a, b) => a + b, 0));
    assert.strictEqual(sum, 10);
  });

  test('Zero discount returns all zeros', () => {
    const items = [{ price: 100, quantity: 2 }];
    const allocations = allocateTransactionDiscount(items, { type: 'FIXED', value: 0 });
    assert.deepStrictEqual(allocations, [0]);
  });
});

