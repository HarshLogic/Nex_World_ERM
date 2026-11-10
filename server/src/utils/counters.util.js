/**
 * Atomic Concurrency-Safe Counter Utilities
 * Used for sequential Invoice (INV-00001) and Product SKU (SKU-00001) generation.
 */

/**
 * Formats a prefix and integer number into a zero-padded sequence code.
 * @param {string} prefix - e.g. "INV-", "SKU-", or "PERF-"
 * @param {number|bigint} number - e.g. 1
 * @param {number} [digits] - Zero-pad length (defaults to 6 for PERF-, 5 for others)
 * @returns {string} e.g. "PERF-000001" or "INV-00001"
 */
function formatSequenceCode(prefix, number, digits = null) {
  const padLength = digits !== null ? digits : (prefix.startsWith('PERF') ? 6 : 5);
  const numStr = String(number).padStart(padLength, '0');
  return `${prefix}${numStr}`;
}

/**
 * Atomically increments and retrieves the next sequential invoice number within a Prisma transaction.
 * @param {Object} tx - Active Prisma transaction client ($prisma.$transaction)
 * @param {string} [prefix="INV-"]
 * @returns {Promise<string>} Next invoice code, e.g. "INV-00001"
 */
async function getNextInvoiceNumber(tx, prefix = 'INV-') {
  // Use upsert/raw atomic update to ensure concurrency safety
  const counter = await tx.invoiceCounter.upsert({
    where: { prefix },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      prefix,
      lastNumber: 1,
    },
  });

  return formatSequenceCode(prefix, counter.lastNumber);
}

/**
 * Atomically increments and retrieves the next sequential SKU within a Prisma transaction.
 * @param {Object} tx - Active Prisma transaction client ($prisma.$transaction)
 * @param {string} [prefix="PERF-"]
 * @returns {Promise<string>} Next SKU code, e.g. "PERF-000001"
 */
async function getNextSkuNumber(tx, prefix = 'PERF-') {
  const counter = await tx.productSkuCounter.upsert({
    where: { prefix },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      prefix,
      lastNumber: 1,
    },
  });

  return formatSequenceCode(prefix, counter.lastNumber);
}

module.exports = {
  formatSequenceCode,
  getNextInvoiceNumber,
  getNextSkuNumber,
};

