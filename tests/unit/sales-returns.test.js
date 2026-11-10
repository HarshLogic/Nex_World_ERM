const { test, describe } = require('node:test');
const assert = require('node:assert');
const { validateReturnQuantity } = require('../../server/src/utils/calculations.util.js');

describe('Unit Tests: Sales Return Eligibility Validation', () => {
  test('Eligible partial return: sold 10, 0 previously returned, requesting 3', () => {
    const result = validateReturnQuantity(10, 0, 3);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.eligibleQuantity, 10);
  });

  test('Eligible subsequent return: sold 10, 3 previously returned, requesting 7', () => {
    const result = validateReturnQuantity(10, 3, 7);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.eligibleQuantity, 7);
  });

  test('Reject over-return attempt exceeding eligible balance: sold 10, 8 previously returned, requesting 3', () => {
    const result = validateReturnQuantity(10, 8, 3);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.eligibleQuantity, 2);
    assert.match(result.message, /Maximum eligible returnable quantity is 2/);
  });

  test('Reject return request when all sold units have already been returned', () => {
    const result = validateReturnQuantity(5, 5, 1);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.eligibleQuantity, 0);
  });

  test('Reject zero or negative return requests', () => {
    const resultZero = validateReturnQuantity(10, 0, 0);
    assert.strictEqual(resultZero.isValid, false);

    const resultNeg = validateReturnQuantity(10, 0, -2);
    assert.strictEqual(resultNeg.isValid, false);
  });
});

