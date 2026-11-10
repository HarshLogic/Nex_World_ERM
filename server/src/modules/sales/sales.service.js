const prisma = require('../../config/prisma');

class SalesService {
  async listSales({ invoiceNumber, customerId, paymentMethod, startDate, endDate, page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (invoiceNumber) where.invoiceNumber = { contains: invoiceNumber, mode: 'insensitive' };
    if (customerId) where.customerId = customerId;
    if (paymentMethod) {
      where.payments = {
        some: { paymentMethod },
      };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [sales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, name: true } },
          payments: true,
          _count: { select: { items: true, saleReturns: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sale.count({ where }),
    ]);

    return {
      sales,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getSaleById(id) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, barcode: true } },
            saleReturnItems: true,
          },
        },
        payments: true,
        saleReturns: {
          include: {
            items: true,
            processedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!sale) {
      const err = new Error('Sale record not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    return sale;
  }
}

module.exports = new SalesService();

