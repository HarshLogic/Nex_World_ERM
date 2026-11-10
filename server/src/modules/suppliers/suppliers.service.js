const prisma = require('../../config/prisma');
const { round2 } = require('../../utils/calculations.util');
const { logActivity } = require('../../utils/audit.util');

class SuppliersService {
  async listSuppliers({ search, status, page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, totalCount] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { purchaseOrders: true, supplierLedgers: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getSupplierById(id) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        supplierLedgers: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      const err = new Error('Supplier not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    return supplier;
  }

  async createSupplier(data, userId) {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        paymentTerms: data.paymentTerms || 'COD',
      },
    });

    await logActivity({
      prisma,
      userId,
      action: 'CREATE',
      module: 'SUPPLIERS',
      description: `Created supplier ${supplier.name} (${supplier.paymentTerms})`,
      entityId: supplier.id,
    });

    return supplier;
  }

  async updateSupplier(id, data, userId) {
    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
        paymentTerms: data.paymentTerms,
        status: data.status,
      },
    });

    await logActivity({
      prisma,
      userId,
      action: 'UPDATE',
      module: 'SUPPLIERS',
      description: `Updated supplier ${updated.name}`,
      entityId: updated.id,
    });

    return updated;
  }

  async recordPayment({ supplierId, amount, notes, paymentMethod = 'BANK_TRANSFER' }, userId) {
    const payAmount = round2(Number(amount));
    if (payAmount <= 0) {
      const err = new Error('Payment amount must be greater than zero.');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    return await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        const err = new Error('Supplier not found');
        err.statusCode = 404;
        err.isOperational = true;
        throw err;
      }

      const newBalance = round2(Number(supplier.payableBalance || 0) - payAmount);

      await tx.supplier.update({
        where: { id: supplierId },
        data: { payableBalance: newBalance },
      });

      const ledgerEntry = await tx.supplierLedger.create({
        data: {
          supplierId,
          transactionType: 'PAYMENT',
          amount: payAmount,
          signedAmount: -payAmount,
          runningBalance: newBalance,
          notes: notes || `Supplier payment via ${paymentMethod}`,
          performedBy: userId,
        },
      });

      await logActivity({
        prisma: tx,
        userId,
        action: 'SUPPLIER_PAYMENT',
        module: 'SUPPLIERS',
        description: `Recorded payment of ${payAmount} AED to ${supplier.name}. New payable balance: ${newBalance} AED`,
        entityId: ledgerEntry.id,
      });

      return {
        supplierId,
        paymentAmount: payAmount,
        newBalance,
        ledgerEntry,
      };
    });
  }
}

module.exports = new SuppliersService();

