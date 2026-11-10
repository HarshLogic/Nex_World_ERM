const prisma = require('../../config/prisma');
const { round2, allocateLandedCosts } = require('../../utils/calculations.util');
const { formatSequenceCode } = require('../../utils/counters.util');
const { logActivity } = require('../../utils/audit.util');

class PurchasesService {
  async listPurchaseOrders({ supplierId, status, page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [purchaseOrders, totalCount] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      purchaseOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getPurchaseOrderById(id) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, barcode: true, baseCost: true } },
          },
        },
        purchaseReceipts: {
          include: {
            receivedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!po) {
      const err = new Error('Purchase order not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    return po;
  }

  async createPurchaseOrder(data, userId) {
    const { supplierId, items, landedCosts = 0, expectedDeliveryDate, status = 'PENDING', notes } = data;

    if (!supplierId || !items || items.length === 0) {
      const err = new Error('Supplier ID and purchase order items are required');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      const poCount = await tx.purchaseOrder.count();
      const poNumber = formatSequenceCode('PO-', poCount + 1);

      let subtotal = 0;
      const preparedLines = [];

      for (const item of items) {
        const qty = round2(Number(item.quantity));
        const cost = round2(Number(item.unitCost));
        const lineSubtotal = round2(qty * cost);
        subtotal = round2(subtotal + lineSubtotal);

        preparedLines.push({
          productId: item.productId,
          quantity: qty,
          unitCost: cost,
          subtotal: lineSubtotal,
        });
      }

      const totalLanded = round2(Number(landedCosts || 0));
      const grandTotal = round2(subtotal + totalLanded);

      // Pre-calculate landed costs
      const allocatedLines = allocateLandedCosts(preparedLines, totalLanded);

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          subtotal,
          landedCosts: totalLanded,
          grandTotal,
          status,
          notes,
          createdById: userId,
          items: {
            create: allocatedLines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              allocatedLandedCost: l.allocatedLandedCost,
              finalLandedUnitCost: l.finalLandedUnitCost,
              subtotal: l.subtotal,
            })),
          },
        },
        include: {
          items: true,
          supplier: true,
        },
      });

      await logActivity({
        prisma: tx,
        userId,
        action: 'CREATE_PO',
        module: 'PURCHASE_ORDERS',
        description: `Created PO ${purchaseOrder.poNumber} for ${grandTotal} AED from ${purchaseOrder.supplier.name}`,
        entityId: purchaseOrder.id,
      });

      return purchaseOrder;
    });
  }

  /**
   * Concurrency-Safe PO Receiving Workflow
   * 1. Allocates landed costs across lines.
   * 2. Adds stock in InventoryLedger at finalLandedUnitCost.
   * 3. Updates Product baseCost in catalog.
   * 4. Updates Supplier.payableBalance & creates SupplierLedger entry.
   * 5. Sets status to RECEIVED and creates PurchaseReceipt.
   */
  async receivePurchaseOrder(id, notes, userId) {
    return await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          supplier: true,
        },
      });

      if (!po) {
        const err = new Error('Purchase order not found');
        err.statusCode = 404;
        err.isOperational = true;
        throw err;
      }

      if (po.status === 'RECEIVED') {
        const err = new Error(`Purchase order ${po.poNumber} has already been received.`);
        err.statusCode = 400;
        err.isOperational = true;
        throw err;
      }

      // Re-allocate landed costs to guarantee reproducibility
      const rawLines = po.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        subtotal: Number(i.subtotal),
      }));

      const allocatedLines = allocateLandedCosts(rawLines, Number(po.landedCosts));

      // 1. Update line item landed costs & insert positive InventoryLedger movements
      for (const line of allocatedLines) {
        await tx.purchaseOrderItem.update({
          where: { id: line.id },
          data: {
            allocatedLandedCost: line.allocatedLandedCost,
            finalLandedUnitCost: line.finalLandedUnitCost,
          },
        });

        // Positive stock ledger movement with unitCost = finalLandedUnitCost
        await tx.inventoryLedger.create({
          data: {
            productId: line.productId,
            transactionType: 'PURCHASE_RECEIPT',
            quantity: line.quantity,
            signedQuantity: line.quantity, // Positive addition
            unitCost: line.finalLandedUnitCost,
            reason: `PO Receipt: ${po.poNumber}`,
            referenceId: po.id,
            performedBy: userId,
          },
        });

        // 2. Update product base cost in catalog
        await tx.product.update({
          where: { id: line.productId },
          data: { baseCost: line.finalLandedUnitCost },
        });
      }

      // 3. Update Supplier payable balance & record in SupplierLedger
      const supplier = po.supplier;
      const newPayableBalance = round2(Number(supplier.payableBalance || 0) + Number(po.grandTotal));

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { payableBalance: newPayableBalance },
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: supplier.id,
          transactionType: 'PURCHASE_BILL',
          amount: Number(po.grandTotal),
          signedAmount: Number(po.grandTotal),
          runningBalance: newPayableBalance,
          referenceId: po.id,
          notes: `Purchase Order Received: ${po.poNumber}`,
          performedBy: userId,
        },
      });

      // 4. Create PurchaseReceipt audit record
      const receipt = await tx.purchaseReceipt.create({
        data: {
          purchaseOrderId: po.id,
          receivedById: userId,
          notes: notes || 'Received in full',
        },
      });

      // 5. Update PO status to RECEIVED
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
      });

      await logActivity({
        prisma: tx,
        userId,
        action: 'RECEIVE_PO',
        module: 'PURCHASE_ORDERS',
        description: `Received PO ${po.poNumber} from ${supplier.name}. Updated stock for ${po.items.length} items. Added ${po.grandTotal} AED to accounts payable.`,
        entityId: po.id,
      });

      return {
        purchaseOrder: updatedPo,
        receipt,
        supplierBalance: newPayableBalance,
      };
    });
  }
}

module.exports = new PurchasesService();

