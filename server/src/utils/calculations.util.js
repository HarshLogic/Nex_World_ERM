/**
 * Pure Mathematical & Financial Calculation Utilities
 * Guarantees 2-decimal precision without JavaScript floating-point drift.
 */

/**
 * Rounds a number to exactly two decimal places.
 * @param {number|string} val
 * @returns {number}
 */
function round2(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item and line taxes under Tax-Inclusive or Tax-Exclusive rules.
 * @param {Object} params
 * @param {number} params.sellingPrice - Raw catalog selling price per unit
 * @param {number} params.quantity - Quantity purchased
 * @param {number} params.itemDiscount - Direct discount on this line item
 * @param {number} params.allocatedTransactionDiscount - Allocated portion of cart discount
 * @param {number} params.taxRate - Percentage tax (e.g. 5 for 5%)
 * @param {boolean} params.pricesIncludeTax - Flag indicating inclusive vs exclusive
 * @returns {Object} Calculated line totals
 */
function calculateLineTaxAndTotal({
  sellingPrice,
  quantity,
  itemDiscount = 0,
  allocatedTransactionDiscount = 0,
  taxRate = 0,
  pricesIncludeTax = true,
}) {
  const qty = Number(quantity);
  const price = Number(sellingPrice);
  const rawSubtotal = round2(price * qty);

  const totalDiscount = round2(Number(itemDiscount) + Number(allocatedTransactionDiscount));
  const discountedSubtotal = Math.max(0, round2(rawSubtotal - totalDiscount));

  const rate = Number(taxRate) / 100;

  if (pricesIncludeTax) {
    // Tax is included inside the discounted amount:
    // effectivePrice = discountedSubtotal / (1 + rate)
    // taxAmount = discountedSubtotal - effectivePrice
    const effectiveSubtotal = round2(discountedSubtotal / (1 + rate));
    const taxAmount = round2(discountedSubtotal - effectiveSubtotal);
    const lineTotal = discountedSubtotal;

    return {
      quantity: qty,
      unitPrice: round2(price),
      rawSubtotal,
      itemDiscount: round2(itemDiscount),
      allocatedTransactionDiscount: round2(allocatedTransactionDiscount),
      totalDiscount,
      effectiveSubtotal,
      taxRate: round2(taxRate),
      taxAmount,
      lineTotal,
    };
  } else {
    // Tax is added on top of the discounted amount:
    // effectiveSubtotal = discountedSubtotal
    // taxAmount = effectiveSubtotal * rate
    // lineTotal = effectiveSubtotal + taxAmount
    const effectiveSubtotal = discountedSubtotal;
    const taxAmount = round2(effectiveSubtotal * rate);
    const lineTotal = round2(effectiveSubtotal + taxAmount);

    return {
      quantity: qty,
      unitPrice: round2(price),
      rawSubtotal,
      itemDiscount: round2(itemDiscount),
      allocatedTransactionDiscount: round2(allocatedTransactionDiscount),
      totalDiscount,
      effectiveSubtotal,
      taxRate: round2(taxRate),
      taxAmount,
      lineTotal,
    };
  }
}

/**
 * Proportionally allocates a transaction-level discount across cart items.
 * Guarantees the sum of allocated discounts strictly equals the target discount.
 * @param {Array<Object>} items - Array of line items with { price, quantity, itemDiscount }
 * @param {Object} discountSpec - { type: 'PERCENTAGE'|'FIXED', value: number }
 * @returns {Array<number>} Allocated discount per line item
 */
function allocateTransactionDiscount(items, discountSpec) {
  if (!items || items.length === 0) return [];
  if (!discountSpec || !discountSpec.value || discountSpec.value <= 0) {
    return items.map(() => 0);
  }

  // Calculate net item subtotals after line-level discount
  const itemNets = items.map((item) => {
    const raw = round2(Number(item.price || item.sellingPrice) * Number(item.quantity));
    const lineDisc = round2(Number(item.itemDiscount || 0));
    return Math.max(0, round2(raw - lineDisc));
  });

  const cartSubtotal = round2(itemNets.reduce((sum, n) => sum + n, 0));
  if (cartSubtotal <= 0) {
    return items.map(() => 0);
  }

  let totalTargetDiscount = 0;
  if (discountSpec.type === 'PERCENTAGE') {
    const pct = Math.min(100, Math.max(0, Number(discountSpec.value)));
    totalTargetDiscount = round2(cartSubtotal * (pct / 100));
  } else {
    // FIXED amount: cannot exceed subtotal
    totalTargetDiscount = round2(Math.min(cartSubtotal, Math.max(0, Number(discountSpec.value))));
  }

  // Allocate proportionally by item value share
  let allocatedSum = 0;
  const allocations = itemNets.map((net) => {
    if (net === 0) return 0;
    const share = net / cartSubtotal;
    const alloc = round2(totalTargetDiscount * share);
    allocatedSum = round2(allocatedSum + alloc);
    return alloc;
  });

  // Resolve rounding cent discrepancy onto the largest item
  const discrepancy = round2(totalTargetDiscount - allocatedSum);
  if (discrepancy !== 0 && allocations.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < itemNets.length; i++) {
      if (itemNets[i] > itemNets[maxIdx]) maxIdx = i;
    }
    allocations[maxIdx] = round2(allocations[maxIdx] + discrepancy);
  }

  return allocations;
}

/**
 * Calculates proportional landed cost allocation for Purchase Order lines.
 * @param {Array<Object>} lines - Array of { subtotal, quantity, unitCost }
 * @param {number} totalLandedCosts - Additional freight, customs, handling costs
 * @returns {Array<Object>} Lines with allocatedLandedCost and finalLandedUnitCost
 */
function allocateLandedCosts(lines, totalLandedCosts = 0) {
  const landed = round2(totalLandedCosts);
  const poSubtotal = round2(lines.reduce((sum, l) => sum + round2(Number(l.subtotal || (l.quantity * l.unitCost))), 0));

  if (poSubtotal <= 0 || landed <= 0) {
    return lines.map((l) => ({
      ...l,
      allocatedLandedCost: 0,
      finalLandedUnitCost: round2(l.unitCost),
    }));
  }

  let allocatedSum = 0;
  const result = lines.map((l) => {
    const lineSubtotal = round2(Number(l.subtotal || (l.quantity * l.unitCost)));
    const share = lineSubtotal / poSubtotal;
    const allocated = round2(landed * share);
    allocatedSum = round2(allocatedSum + allocated);

    const qty = Number(l.quantity) || 1;
    const finalLandedUnit = round2(Number(l.unitCost) + (allocated / qty));

    return {
      ...l,
      allocatedLandedCost: allocated,
      finalLandedUnitCost: finalLandedUnit,
    };
  });

  // Adjust any penny rounding difference on the item with highest subtotal
  const discrepancy = round2(landed - allocatedSum);
  if (discrepancy !== 0 && result.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].subtotal > lines[maxIdx].subtotal) maxIdx = i;
    }
    result[maxIdx].allocatedLandedCost = round2(result[maxIdx].allocatedLandedCost + discrepancy);
    const qty = Number(result[maxIdx].quantity) || 1;
    result[maxIdx].finalLandedUnitCost = round2(
      Number(result[maxIdx].unitCost) + (result[maxIdx].allocatedLandedCost / qty)
    );
  }

  return result;
}

/**
 * Derives current stock and chronological running balances from signed ledger entries.
 * @param {Array<Object>} ledgerEntries - Chronologically sorted entries with { signedQuantity }
 * @returns {Object} { onHandQuantity: number, runningBalances: Array<number> }
 */
function calculateInventoryLedgerBalances(ledgerEntries = []) {
  let running = 0;
  const runningBalances = [];

  for (const entry of ledgerEntries) {
    const signedQty = Number(entry.signedQuantity);
    running = round2(running + signedQty);
    runningBalances.push(running);
  }

  return {
    onHandQuantity: running,
    runningBalances,
  };
}

/**
 * Validates return quantity eligibility.
 * Returnable quantity = originalSoldQuantity - totalPreviouslyReturnedQuantity.
 * @param {number} originalSoldQuantity
 * @param {number} totalPreviouslyReturnedQuantity
 * @param {number} requestedReturnQuantity
 * @returns {Object} { isValid: boolean, eligibleQuantity: number, message?: string }
 */
function validateReturnQuantity(originalSoldQuantity, totalPreviouslyReturnedQuantity, requestedReturnQuantity) {
  const sold = Number(originalSoldQuantity);
  const previouslyReturned = Number(totalPreviouslyReturnedQuantity);
  const requested = Number(requestedReturnQuantity);

  const eligible = round2(sold - previouslyReturned);

  if (requested <= 0) {
    return {
      isValid: false,
      eligibleQuantity: eligible,
      message: 'Requested return quantity must be greater than zero.',
    };
  }

  if (requested > eligible) {
    return {
      isValid: false,
      eligibleQuantity: eligible,
      message: `Cannot return ${requested} units. Maximum eligible returnable quantity is ${eligible}.`,
    };
  }

  return {
    isValid: true,
    eligibleQuantity: eligible,
  };
}

/**
 * Snapshots line gross profit using the product's historical base cost at time of sale.
 * @param {number} effectiveSubtotal - Selling price subtotal minus allocated discount
 * @param {number} quantity - Quantity sold
 * @param {number} historicalBaseCost - Base purchase cost at time of transaction
 * @returns {Object} { historicalCostTotal: number, grossProfit: number }
 */
function calculateHistoricalGrossProfit(effectiveSubtotal, quantity, historicalBaseCost) {
  const costTotal = round2(Number(quantity) * Number(historicalBaseCost));
  const profit = round2(Number(effectiveSubtotal) - costTotal);
  return {
    historicalCostTotal: costTotal,
    grossProfit: profit,
  };
}

module.exports = {
  round2,
  calculateLineTaxAndTotal,
  allocateTransactionDiscount,
  allocateLandedCosts,
  calculateInventoryLedgerBalances,
  validateReturnQuantity,
  calculateHistoricalGrossProfit,
};

