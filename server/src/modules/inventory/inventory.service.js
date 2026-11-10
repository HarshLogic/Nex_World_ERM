const prisma = require('../../config/prisma');
const { round2 } = require('../../utils/calculations.util');
const { logActivity } = require('../../utils/audit.util');

class InventoryService {
  async getLedger({ productId, transactionType, startDate, endDate, page = 1, limit = 50 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (productId) where.productId = productId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [entries, totalCount] = await Promise.all([
      prisma.inventoryLedger.findMany({
        where,
        skip,
        take,
        include: {
          product: { select: { id: true, name: true, sku: true, barcode: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryLedger.count({ where }),
    ]);

    return {
      entries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getProductOnHandQuantity(productId) {
    const aggregations = await prisma.inventoryLedger.aggregate({
      where: { productId },
      _sum: {
        signedQuantity: true,
      },
    });

    return round2(aggregations._sum.signedQuantity || 0);
  }

  async recordStockIn({ productId, quantity, unitCost, reason, referenceId }, userId) {
    const qty = round2(Number(quantity));
    if (qty <= 0) {
      const err = new Error('Stock in quantity must be greater than zero.');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        err.isOperational = true;
        throw err;
      }

      const cost = unitCost !== undefined ? Number(unitCost) : product.baseCost;

      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          productId,
          transactionType: 'STOCK_IN',
          quantity: qty,
          signedQuantity: qty, // Positive
          unitCost: cost,
          reason: reason || 'Manual Stock In',
          referenceId,
          performedBy: userId,
        },
      });

      await logActivity({
        prisma: tx,
        userId,
        action: 'STOCK_IN',
        module: 'INVENTORY',
        description: `Recorded Stock In of +${qty} units for ${product.name} (${product.sku})`,
        entityId: ledgerEntry.id,
      });

      return ledgerEntry;
    });
  }

  async recordStockOut({ productId, quantity, reason, referenceId }, userId) {
    const qty = round2(Number(quantity));
    if (qty <= 0) {
      const err = new Error('Stock out quantity must be greater than zero.');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        err.isOperational = true;
        throw err;
      }

      const ledgerEntry = await tx.inventoryLedger.create({
        data: {
          productId,
          transactionType: 'STOCK_OUT',
          quantity: qty,
          signedQuantity: -qty, // Negative signed movement
          unitCost: product.baseCost,
          reason: reason || 'Manual Stock Out',
          referenceId,
          performedBy: userId,
        },
      });

      await logActivity({
        prisma: tx,
        userId,
        action: 'STOCK_OUT',
        module: 'INVENTORY',
        description: `Recorded Stock Out of -${qty} units for ${product.name} (${product.sku})`,
        entityId: ledgerEntry.id,
      });

      return ledgerEntry;
    });
  }

  async bulkReceive({ items, reason, referenceId }, userId) {
    if (!items || items.length === 0) {
      const err = new Error('No items provided for bulk receive');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      const createdEntries = [];

      for (const item of items) {
        const qty = round2(Number(item.quantity));
        if (qty <= 0) continue;

        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        const cost = item.unitCost !== undefined ? Number(item.unitCost) : product.baseCost;

        const entry = await tx.inventoryLedger.create({
          data: {
            productId: item.productId,
            transactionType: 'STOCK_IN',
            quantity: qty,
            signedQuantity: qty,
            unitCost: cost,
            reason: reason || 'Bulk Receive',
            referenceId,
            performedBy: userId,
          },
        });
        createdEntries.push(entry);
      }

      await logActivity({
        prisma: tx,
        userId,
        action: 'BULK_RECEIVE',
        module: 'INVENTORY',
        description: `Bulk received stock for ${createdEntries.length} items`,
        metadata: { count: createdEntries.length },
      });

      return createdEntries;
    });
  }

  async performStocktake({ productId, physicalCount, notes }, userId) {
    const physical = round2(Number(physicalCount));

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        const err = new Error('Product not found');
        err.statusCode = 404;
        err.isOperational = true;
        throw err;
      }

      // Calculate current system stock from ledger
      const currentAgg = await tx.inventoryLedger.aggregate({
        where: { productId },
        _sum: { signedQuantity: true },
      });
      const systemCount = round2(currentAgg._sum.signedQuantity || 0);
      const discrepancy = round2(physical - systemCount);

      if (discrepancy === 0) {
        return {
          systemCount,
          physicalCount: physical,
          discrepancy: 0,
          adjusted: false,
          message: 'Physical count matches system stock exactly. No adjustment needed.',
        };
      }

      // Create corrective adjustment entry
      const adjustmentEntry = await tx.inventoryLedger.create({
        data: {
          productId,
          transactionType: 'ADJUSTMENT',
          quantity: Math.abs(discrepancy),
          signedQuantity: discrepancy, // Signed (+ or -)
          unitCost: product.baseCost,
          reason: `Stocktake adjustment: Physical count ${physical} vs System ${systemCount}. ${notes || ''}`.trim(),
          performedBy: userId,
        },
      });

      await logActivity({
        prisma: tx,
        userId,
        action: 'STOCKTAKE_ADJUSTMENT',
        module: 'INVENTORY',
        description: `Adjusted ${product.name} by ${discrepancy > 0 ? '+' : ''}${discrepancy} to match physical count ${physical}`,
        entityId: adjustmentEntry.id,
      });

      return {
        systemCount,
        physicalCount: physical,
        discrepancy,
        adjusted: true,
        adjustmentEntry,
      };
    });
  }
}

module.exports = new InventoryService();

