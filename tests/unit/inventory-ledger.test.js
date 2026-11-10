const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateInventoryLedgerBalances } = require('../../server/src/utils/calculations.util.js');

describe('Unit Tests: Immutable Inventory Ledger Balancing', () => {
  test('Chronological stock movements produce correct running balance and on-hand quantity', () => {
    const movements = [
      { transactionType: 'STOCK_IN', signedQuantity: 100 },       // Balance: 100
      { transactionType: 'SALE', signedQuantity: -25 },           // Balance: 75
      { transactionType: 'RETURN', signedQuantity: 5 },           // Balance: 80
      { transactionType: 'PURCHASE_RECEIPT', signedQuantity: 50 },// Balance: 130
      { transactionType: 'STOCK_OUT', signedQuantity: -10 },      // Balance: 120
      { transactionType: 'ADJUSTMENT', signedQuantity: -5 },      // Balance: 115
    ];

    const { onHandQuantity, runningBalances } = calculateInventoryLedgerBalances(movements);

    assert.strictEqual(onHandQuantity, 115);
    assert.deepStrictEqual(runningBalances, [100, 75, 80, 130, 120, 115]);
  });

  test('Negative stock is accurately represented when sales exceed stock in emergency POS', () => {
    const movements = [
      { transactionType: 'STOCK_IN', signedQuantity: 10 },
      { transactionType: 'SALE', signedQuantity: -15 }, // Emergency POS sale
    ];

    const { onHandQuantity, runningBalances } = calculateInventoryLedgerBalances(movements);

    assert.strictEqual(onHandQuantity, -5);
    assert.deepStrictEqual(runningBalances, [10, -5]);
  });

  test('Empty inventory ledger produces zero on-hand quantity', () => {
    const { onHandQuantity, runningBalances } = calculateInventoryLedgerBalances([]);

    assert.strictEqual(onHandQuantity, 0);
    assert.deepStrictEqual(runningBalances, []);
  });

  test('Corrective physical stocktake adjustment restores system balance to physical count', () => {
    // Current system stock = 50, physical count = 42 -> Adjustment = -8
    const movements = [
      { transactionType: 'STOCK_IN', signedQuantity: 50 },
      { transactionType: 'ADJUSTMENT', signedQuantity: -8 }, // Physical discrepancy adjustment
    ];

    const { onHandQuantity } = calculateInventoryLedgerBalances(movements);
    assert.strictEqual(onHandQuantity, 42);
  });
});

