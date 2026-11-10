const prisma = require('../../config/prisma');
const {
  round2,
  calculateLineTaxAndTotal,
  allocateTransactionDiscount,
  calculateHistoricalGrossProfit,
} = require('../../utils/calculations.util');
const { getNextInvoiceNumber } = require('../../utils/counters.util');
const { logActivity } = require('../../utils/audit.util');

class PosService {
  async lookupProducts(query) {
    if (!query || query.trim().length === 0) return [];
    const term = query.trim();

    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { barcode: { equals: term, mode: 'insensitive' } },
          { sku: { equals: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        inventoryLedgers: {
          select: { signedQuantity: true },
        },
      },
      take: 15,
    });

    return products.map((prod) => {
      const stockOnHand = prod.inventoryLedgers.reduce(
        (sum, entry) => round2(sum + Number(entry.signedQuantity)),
        0
      );
      const { inventoryLedgers, ...data } = prod;
      return {
        ...data,
        stockOnHand,
      };
    });
  }

  async saveHeldCart({ cartName, customerId, items, note }, cashierId) {
    if (!items || items.length === 0) {
      const err = new Error('Cannot hold an empty cart');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.heldCart.create({
      data: {
        cartName: cartName || `Held Cart #${Date.now().toString().slice(-4)}`,
        cashierId,
        customerId: customerId || null,
        note: note || null,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: Number(i.quantity || 1),
            unitPrice: Number(i.unitPrice || 0),
            discount: Number(i.discount || 0),
            taxRate: Number(i.taxRate || 0),
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  async listHeldCarts(cashierId) {
    return await prisma.heldCart.findMany({
      where: { cashierId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, sellingPrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteHeldCart(id, cashierId) {
    return await prisma.heldCart.delete({
      where: { id },
    });
  }

  /**
   * Concurrency-Safe Atomic POS Checkout Transaction
   */
  async processCheckout(payload, cashierId) {
    const {
      customerId,
      items,
      transactionDiscount = { type: 'FIXED', value: 0 },
      payment = { method: 'CASH', amountTendered: 0 },
      notes,
    } = payload;

    if (!items || items.length === 0) {
      const err = new Error('Cart is empty');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch business settings for currency, tax policy, invoice prefix
      const settings = (await tx.businessSettings.findFirst()) || {
        pricesIncludeTax: true,
        defaultTaxRate: 5.0,
        currencyCode: 'AED',
        invoicePrefix: 'INV-',
      };

      // 2. Fetch all products in cart from database to get authoritative prices & base costs
      const productIds = items.map((i) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // Validate all products exist
      for (const item of items) {
        if (!productMap.has(item.productId)) {
          const err = new Error(`Product ${item.productId} does not exist in catalog.`);
          err.statusCode = 400;
          err.isOperational = true;
          throw err;
        }
      }

      // 3. Allocate transaction-level discount proportionally across items
      const cartItemsForDiscount = items.map((item) => {
        const prod = productMap.get(item.productId);
        return {
          price: Number(prod.sellingPrice),
          quantity: Number(item.quantity),
          itemDiscount: Number(item.discount || 0),
        };
      });

      const allocatedDiscounts = allocateTransactionDiscount(
        cartItemsForDiscount,
        transactionDiscount
      );

      // 4. Compute line totals, taxes, and gross profit snapshots
      let subtotalSum = 0;
      let totalDiscountSum = 0;
      let totalTaxSum = 0;
      let grandTotalSum = 0;
      let totalHistoricalCost = 0;
      let totalGrossProfit = 0;

      const preparedSaleLines = [];

      for (let i = 0; i < items.length; i++) {
        const rawItem = items[i];
        const prod = productMap.get(rawItem.productId);
        const qty = Number(rawItem.quantity);
        const itemDisc = Number(rawItem.discount || 0);
        const allocatedTransDisc = allocatedDiscounts[i] || 0;
        const taxRate = Number(prod.taxRate !== undefined ? prod.taxRate : settings.defaultTaxRate);

        const lineCalc = calculateLineTaxAndTotal({
          sellingPrice: Number(prod.sellingPrice),
          quantity: qty,
          itemDiscount: itemDisc,
          allocatedTransactionDiscount: allocatedTransDisc,
          taxRate,
          pricesIncludeTax: settings.pricesIncludeTax,
        });

        const profitCalc = calculateHistoricalGrossProfit(
          lineCalc.effectiveSubtotal,
          qty,
          Number(prod.baseCost)
        );

        subtotalSum = round2(subtotalSum + lineCalc.rawSubtotal);
        totalDiscountSum = round2(totalDiscountSum + lineCalc.totalDiscount);
        totalTaxSum = round2(totalTaxSum + lineCalc.taxAmount);
        grandTotalSum = round2(grandTotalSum + lineCalc.lineTotal);
        totalHistoricalCost = round2(totalHistoricalCost + profitCalc.historicalCostTotal);
        totalGrossProfit = round2(totalGrossProfit + profitCalc.grossProfit);

        preparedSaleLines.push({
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          unitPrice: Number(prod.sellingPrice),
          itemDiscount: lineCalc.itemDiscount,
          allocatedTransactionDiscount: lineCalc.allocatedTransactionDiscount,
          effectivePrice: lineCalc.effectiveSubtotal,
          taxRate: lineCalc.taxRate,
          taxAmount: lineCalc.taxAmount,
          subtotal: lineCalc.lineTotal,
          historicalCost: Number(prod.baseCost),
          historicalGrossProfit: profitCalc.grossProfit,
        });
      }

      // 5. Payment calculations (Amount tendered, change due)
      const tendered = Number(payment.amountTendered || grandTotalSum);
      let changeDue = 0;
      if (payment.method === 'CASH') {
        if (tendered < grandTotalSum) {
          const err = new Error(`Amount tendered (${tendered} AED) is less than total due (${grandTotalSum} AED).`);
          err.statusCode = 400;
          err.isOperational = true;
          throw err;
        }
        changeDue = round2(tendered - grandTotalSum);
      }

      // 6. Concurrency-safe atomic invoice generation
      const invoiceNumber = await getNextInvoiceNumber(tx, settings.invoicePrefix || 'INV-');

      // 7. Get or assign Walk-in Customer if none provided
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        let walkIn = await tx.customer.findFirst({
          where: { name: 'Walk-in Customer' },
        });
        if (!walkIn) {
          walkIn = await tx.customer.create({
            data: {
              name: 'Walk-in Customer',
              customerType: 'RETAIL',
              createdById: cashierId,
            },
          });
        }
        finalCustomerId = walkIn.id;
      }

      // 8. Create Sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: finalCustomerId,
          cashierId,
          subtotal: subtotalSum,
          itemDiscountTotal: round2(
            preparedSaleLines.reduce((s, l) => s + l.itemDiscount, 0)
          ),
          transactionDiscount: round2(
            preparedSaleLines.reduce((s, l) => s + l.allocatedTransactionDiscount, 0)
          ),
          discountType: transactionDiscount.type || 'FIXED',
          totalDiscount: totalDiscountSum,
          taxExclusiveTotal: settings.pricesIncludeTax ? 0 : totalTaxSum,
          taxInclusiveTotal: settings.pricesIncludeTax ? totalTaxSum : 0,
          grandTotal: grandTotalSum,
          historicalCostTotal: totalHistoricalCost,
          grossProfit: totalGrossProfit,
          paymentStatus: 'PAID',
          items: {
            create: preparedSaleLines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              itemDiscount: l.itemDiscount,
              allocatedTransactionDiscount: l.allocatedTransactionDiscount,
              effectivePrice: l.effectivePrice,
              taxRate: l.taxRate,
              taxAmount: l.taxAmount,
              subtotal: l.subtotal,
              historicalCost: l.historicalCost,
              historicalGrossProfit: l.historicalGrossProfit,
            })),
          },
          payments: {
            create: [
              {
                amount: grandTotalSum,
                amountTendered: tendered,
                changeDue,
                paymentMethod: payment.method || 'CASH',
                reference: payment.reference || null,
                cashierId,
              },
            ],
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          payments: true,
          customer: true,
          cashier: { select: { id: true, name: true } },
        },
      });

      // 9. Create Inventory Ledger stock deductions (type: SALE, negative quantity)
      for (const line of preparedSaleLines) {
        await tx.inventoryLedger.create({
          data: {
            productId: line.productId,
            transactionType: 'SALE',
            quantity: line.quantity,
            signedQuantity: -line.quantity, // Strict negative movement
            unitCost: line.historicalCost,
            reason: `POS Sale: ${sale.invoiceNumber}`,
            referenceId: sale.id,
            performedBy: cashierId,
          },
        });
      }

      // 10. Customer Credit Ledger handling if payment method is CREDIT
      if (payment.method === 'CREDIT') {
        const cust = await tx.customer.findUnique({ where: { id: finalCustomerId } });
        const newBalance = round2(Number(cust.balance || 0) + grandTotalSum);

        await tx.customer.update({
          where: { id: finalCustomerId },
          data: { balance: newBalance },
        });

        await tx.customerLedger.create({
          data: {
            customerId: finalCustomerId,
            transactionType: 'SALE_CREDIT',
            amount: grandTotalSum,
            signedAmount: grandTotalSum,
            runningBalance: newBalance,
            referenceId: sale.id,
            notes: `Credit Sale Invoice: ${sale.invoiceNumber}`,
            performedBy: cashierId,
          },
        });
      }

      // 11. Activity Log
      await logActivity({
        prisma: tx,
        userId: cashierId,
        action: 'CHECKOUT',
        module: 'POS',
        description: `Completed sale ${sale.invoiceNumber} for ${grandTotalSum} AED via ${payment.method}`,
        entityId: sale.id,
        metadata: { invoiceNumber, grandTotal: grandTotalSum, paymentMethod: payment.method },
      });

      // 12. Format Receipt Output Payload
      const receipt = {
        businessName: settings.businessName || 'Records Manager Retail',
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        invoiceNumber: sale.invoiceNumber,
        date: sale.createdAt,
        cashier: sale.cashier.name,
        customer: sale.customer.name,
        currency: settings.currencyCode || 'AED',
        items: preparedSaleLines,
        subtotal: subtotalSum,
        totalDiscount: totalDiscountSum,
        taxTotal: totalTaxSum,
        grandTotal: grandTotalSum,
        paymentMethod: payment.method,
        amountTendered: tendered,
        changeDue,
        header: settings.receiptHeader,
        footer: settings.receiptFooter,
      };

      return {
        sale,
        receipt,
      };
    });
  }
}

module.exports = new PosService();

