const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatSequenceCode } = require('../../server/src/utils/counters.util.js');

describe('Unit Tests: Atomic Sequence Counter Formatting', () => {
  test('Formats sequential invoices zero-padded to 5 digits (INV-00001)', () => {
    assert.strictEqual(formatSequenceCode('INV-', 1), 'INV-00001');
    assert.strictEqual(formatSequenceCode('INV-', 42), 'INV-00042');
    assert.strictEqual(formatSequenceCode('INV-', 999), 'INV-00999');
    assert.strictEqual(formatSequenceCode('INV-', 12345), 'INV-12345');
  });

  test('Formats sequential product SKUs zero-padded to 5 digits (SKU-00001)', () => {
    assert.strictEqual(formatSequenceCode('SKU-', 1), 'SKU-00001');
    assert.strictEqual(formatSequenceCode('SKU-', 25), 'SKU-00025');
  });

  test('Formats sequential Perfume SKUs zero-padded to 6 digits (PERF-000001)', () => {
    assert.strictEqual(formatSequenceCode('PERF-', 1), 'PERF-000001');
    assert.strictEqual(formatSequenceCode('PERF-', 42), 'PERF-000042');
    assert.strictEqual(formatSequenceCode('PERF-', 999), 'PERF-000999');
  });

  test('Supports BigInt inputs from PostgreSQL BIGINT columns', () => {
    assert.strictEqual(formatSequenceCode('INV-', 7n), 'INV-00007');
    assert.strictEqual(formatSequenceCode('SKU-', 100n), 'SKU-00100');
  });

  test('Expands beyond 5 digits without truncation', () => {
    assert.strictEqual(formatSequenceCode('INV-', 100000), 'INV-100000');
  });
});

