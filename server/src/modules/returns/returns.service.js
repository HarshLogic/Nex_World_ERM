const prisma = require('../../config/prisma');
const { round2, validateReturnQuantity } = require('../../utils/calculations.util');
const { formatSequenceCode } = require('../../utils/counters.util');
const { logActivity } = require('../../utils/audit.util');

class ReturnsService {
  async processReturn(payload, adminUserId) {
    const { originalSaleId, items, refundMethod = 'CASH', reason } = payload;

    if (!items || items.length === 0) {
      const err = new Error('No items specified for return.');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch original sale and its items
      const sale = await tx.sale.findUnique({
        where: { id: originalSaleId },
        include: {
          items: {
            include: {
              saleReturnItems: true,
              product: true,
            },
          },
          customer: true,
        },
      });

      if (!sale) {
        const err = new Error('Original sale record not found.');
        err.statusCode = 404;
        err.isOperational = true;
        throw err;
      }

      const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));

      let totalRefund = 0;
      let totalTaxRefund = 0;
      let totalSubtotalRefund = 0;
      const preparedReturnItems = [];

      // 2. Validate return quantities against original sale minus past returns
      for (const returnReq of items) {
        const saleItem = saleItemMap.get(returnReq.saleItemId);
        if (!saleItem) {
          const err = new Error(`Item ${returnReq.saleItemId} does not belong to sale ${sale.invoiceNumber}.`);
          err.statusCode = 400;
          err.isOperational = true;
          throw err;
        }

        const totalPreviouslyReturned = saleItem.saleReturnItems.reduce(
          (sum, ret) => round2(sum + Number(ret.quantityReturned)),
          0
        );

        const check = validateReturnQuantity(
          Number(saleItem.quantity),
          totalPreviouslyReturned,
          Number(returnReq.quantity)
        );

        if (!check.isValid) {
          const err = new Error(`Return rejected for ${saleItem.product.name}: ${check.message}`);
          err.statusCode = 400;
          err.isOperational = true;
          throw err;
        }

        const returnQty = Number(returnReq.quantity);
        // Calculate proportional refund based on effective price paid
        const unitRefund = round2(Number(saleItem.effectivePrice) / Number(saleItem.quantity));
        const unitTaxRefund = round2(Number(saleItem.taxAmount) / Number(saleItem.quantity));
        const itemRefund = round2(unitRefund * returnQty);
        const itemTax = round2(unitTaxRefund * returnQty);
        const itemTotalRefund = round2(itemRefund + itemTax);

        totalSubtotalRefund = round2(totalSubtotalRefund + itemRefund);
        totalTaxRefund = round2(totalTaxRefund + itemTax);
        totalRefund = round2(totalRefund + itemTotalRefund);

        preparedReturnItems.push({
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          productName: saleItem.product.name,
          quantityReturned: returnQty,
          unitRefundPrice: unitRefund,
          taxRefund: itemTax,
          totalRefund: itemTotalRefund,
          baseCost: Number(saleItem.historicalCost),
        });
      }

      // 3. Generate sequential return number (e.g. RET-00001)
      const returnCount = await tx.saleReturn.count();
      const returnNumber = formatSequenceCode('RET-', returnCount + 1);

      // 4. Create SaleReturn parent record
      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNumber,
          originalSaleId: sale.id,
          processedById: adminUserId,
          subtotal: totalSubtotalRefund,
          taxTotal: totalTaxRefund,
          refundTotal: totalRefund,
          refundMethod,
          reason: reason || 'Customer return',
          items: {
            create: preparedReturnItems.map((ri) => ({
              originalSaleItemId: ri.saleItemId,
              productId: ri.productId,
              quantityReturned: ri.quantityReturned,
              unitRefundPrice: ri.unitRefundPrice,
              taxRefund: ri.taxRefund,
              totalRefund: ri.totalRefund,
            })),
          },
        },
        include: {
          items: true,
          processedBy: { select: { id: true, name: true } },
        },
      });

      // 5. Create positive Inventory Ledger movements (reason: Return)
      for (const item of preparedReturnItems) {
        await tx.inventoryLedger.create({
          data: {
            productId: item.productId,
            transactionType: 'RETURN',
            quantity: item.quantityReturned,
            signedQuantity: item.quantityReturned, // Positive to restore stock
            unitCost: item.baseCost,
            reason: `Return #${saleReturn.returnNumber} from Invoice ${sale.invoiceNumber}`,
            referenceId: saleReturn.id,
            performedBy: adminUserId,
          },
        });
      }

      // 6. Handle refund method (Cash refund vs Customer Credit)
      if (refundMethod === 'CREDIT' && sale.customerId) {
        const cust = await tx.customer.findUnique({ where: { id: sale.customerId } });
        const newBalance = round2(Number(cust.balance || 0) - totalRefund);

        await tx.customer.update({
          where: { id: sale.customerId },
          data: { balance: newBalance },
        });

        await tx.customerLedger.create({
          data: {
            customerId: sale.customerId,
            transactionType: 'REFUND',
            amount: totalRefund,
            signedAmount: -totalRefund,
            runningBalance: newBalance,
            referenceId: saleReturn.id,
            notes: `Refund for return #${saleReturn.returnNumber}`,
            performedBy: adminUserId,
          },
        });
      }

      await logActivity({
        prisma: tx,
        userId: adminUserId,
        action: 'PROCESS_RETURN',
        module: 'RETURNS',
        description: `Processed return ${saleReturn.returnNumber} for invoice ${sale.invoiceNumber} (${totalRefund} AED)`,
        entityId: saleReturn.id,
      });

      return saleReturn;
    });
  }

  async listReturns({ page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [returns, totalCount] = await Promise.all([
      prisma.saleReturn.findMany({
        skip,
        take,
        include: {
          originalSale: { select: { id: true, invoiceNumber: true, createdAt: true } },
          processedBy: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.saleReturn.count(),
    ]);

    return {
      returns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }
}

module.exports = new ReturnsService();

