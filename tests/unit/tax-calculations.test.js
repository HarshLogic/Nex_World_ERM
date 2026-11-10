const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateLineTaxAndTotal, round2 } = require('../../server/src/utils/calculations.util.js');

describe('Unit Tests: Tax Calculations & Pricing Rules', () => {
  test('Tax-Exclusive Pricing (5% Tax on 100 AED item) yields 5.00 Tax and 105.00 Total', () => {
    const result = calculateLineTaxAndTotal({
      sellingPrice: 100,
      quantity: 1,
      itemDiscount: 0,
      allocatedTransactionDiscount: 0,
      taxRate: 5,
      pricesIncludeTax: false,
    });

    assert.strictEqual(result.effectiveSubtotal, 100);
    assert.strictEqual(result.taxAmount, 5);
    assert.strictEqual(result.lineTotal, 105);
  });

  test('Tax-Inclusive Pricing (5% Tax on 105 AED item) yields 5.00 Tax and 105.00 Total', () => {
    const result = calculateLineTaxAndTotal({
      sellingPrice: 105,
      quantity: 1,
      itemDiscount: 0,
      allocatedTransactionDiscount: 0,
      taxRate: 5,
      pricesIncludeTax: true,
    });

    assert.strictEqual(result.effectiveSubtotal, 100);
    assert.strictEqual(result.taxAmount, 5);
    assert.strictEqual(result.lineTotal, 105);
  });

  test('Tax-Exclusive with Line Item Discount: 100 AED item, 20 AED discount, 5% tax', () => {
    const result = calculateLineTaxAndTotal({
      sellingPrice: 100,
      quantity: 1,
      itemDiscount: 20,
      allocatedTransactionDiscount: 0,
      taxRate: 5,
      pricesIncludeTax: false,
    });

    // Subtotal after discount = 80 AED
    // Tax = 80 * 0.05 = 4.00 AED
    // Total = 84.00 AED
    assert.strictEqual(result.effectiveSubtotal, 80);
    assert.strictEqual(result.taxAmount, 4);
    assert.strictEqual(result.lineTotal, 84);
  });

  test('Multi-quantity Tax-Inclusive: 5 items @ 21.00 AED each with 5% VAT', () => {
    const result = calculateLineTaxAndTotal({
      sellingPrice: 21,
      quantity: 5,
      itemDiscount: 0,
      taxRate: 5,
      pricesIncludeTax: true,
    });

    // Raw = 105.00 AED
    // Effective = 105 / 1.05 = 100.00 AED
    // Tax = 5.00 AED
    // Total = 105.00 AED
    assert.strictEqual(result.rawSubtotal, 105);
    assert.strictEqual(result.effectiveSubtotal, 100);
    assert.strictEqual(result.taxAmount, 5);
    assert.strictEqual(result.lineTotal, 105);
  });

  test('Zero Tax Rate yields exact subtotal with zero tax', () => {
    const result = calculateLineTaxAndTotal({
      sellingPrice: 50,
      quantity: 2,
      itemDiscount: 10,
      taxRate: 0,
      pricesIncludeTax: false,
    });

    assert.strictEqual(result.effectiveSubtotal, 90);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.lineTotal, 90);
  });

  test('Prevent negative total when discount exceeds selling price', () => {
    const result = calculateLineTaxAndTotal({
      sellingPrice: 50,
      quantity: 1,
      itemDiscount: 100,
      taxRate: 5,
      pricesIncludeTax: false,
    });

    assert.strictEqual(result.effectiveSubtotal, 0);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.lineTotal, 0);
  });
});

