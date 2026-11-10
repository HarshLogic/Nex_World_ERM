const { test, describe } = require('node:test');
const assert = require('node:assert');
const { allocateLandedCosts, round2 } = require('../../server/src/utils/calculations.util.js');

describe('Unit Tests: Purchase Order Landed Cost Allocation', () => {
  test('Proportional allocation of 100 AED freight across 2 PO lines (400 AED and 600 AED)', () => {
    const lines = [
      { unitCost: 40, quantity: 10, subtotal: 400 },
      { unitCost: 60, quantity: 10, subtotal: 600 },
    ];

    const result = allocateLandedCosts(lines, 100);

    // Line 1: (400 / 1000) * 100 = 40.00 AED allocated -> 4.00 AED/unit -> Final unit cost = 44.00 AED
    // Line 2: (600 / 1000) * 100 = 60.00 AED allocated -> 6.00 AED/unit -> Final unit cost = 66.00 AED
    assert.strictEqual(result[0].allocatedLandedCost, 40);
    assert.strictEqual(result[0].finalLandedUnitCost, 44);

    assert.strictEqual(result[1].allocatedLandedCost, 60);
    assert.strictEqual(result[1].finalLandedUnitCost, 66);

    const totalAllocated = round2(result[0].allocatedLandedCost + result[1].allocatedLandedCost);
    assert.strictEqual(totalAllocated, 100);
  });

  test('Zero landed cost preserves original unit costs without alteration', () => {
    const lines = [
      { unitCost: 25, quantity: 4, subtotal: 100 },
    ];

    const result = allocateLandedCosts(lines, 0);
    assert.strictEqual(result[0].allocatedLandedCost, 0);
    assert.strictEqual(result[0].finalLandedUnitCost, 25);
  });

  test('Single item absorbs 100% of landed costs', () => {
    const lines = [
      { unitCost: 50, quantity: 5, subtotal: 250 },
    ];

    const result = allocateLandedCosts(lines, 50);
    assert.strictEqual(result[0].allocatedLandedCost, 50);
    // 50 AED / 5 units = 10 AED/unit -> final = 60.00 AED
    assert.strictEqual(result[0].finalLandedUnitCost, 60);
  });

  test('Uneven split resolves rounding cents to largest line', () => {
    const lines = [
      { unitCost: 10, quantity: 1, subtotal: 10 },
      { unitCost: 20, quantity: 1, subtotal: 20 },
      { unitCost: 30, quantity: 1, subtotal: 30 },
    ];

    const result = allocateLandedCosts(lines, 10);
    const sumAllocated = round2(result.reduce((s, l) => s + l.allocatedLandedCost, 0));
    assert.strictEqual(sumAllocated, 10);
  });

  test('Empty line array handles safely', () => {
    const result = allocateLandedCosts([], 100);
    assert.deepStrictEqual(result, []);
  });
});

