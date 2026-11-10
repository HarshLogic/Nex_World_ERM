const prisma = require('../../config/prisma');
const { logActivity } = require('../../utils/audit.util');

class CustomersService {
  async listCustomers({ search, customerType, status, page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (status) where.status = status;
    if (customerType) where.customerType = customerType;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { sales: true, customerLedgers: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async getCustomerById(id) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
        customerLedgers: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      const err = new Error('Customer not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    return customer;
  }

  async createCustomer(data, userId) {
    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        customerType: data.customerType || 'RETAIL',
        customerGroup: data.customerGroup || null,
        createdById: userId,
      },
    });

    await logActivity({
      prisma,
      userId,
      action: 'CREATE',
      module: 'CUSTOMERS',
      description: `Created customer ${customer.name}`,
      entityId: customer.id,
    });

    return customer;
  }

  async updateCustomer(id, data, userId) {
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        phone: data.phone,
        email: data.email,
        address: data.address,
        customerType: data.customerType,
        customerGroup: data.customerGroup,
        status: data.status,
      },
    });

    await logActivity({
      prisma,
      userId,
      action: 'UPDATE',
      module: 'CUSTOMERS',
      description: `Updated customer ${updated.name}`,
      entityId: updated.id,
    });

    return updated;
  }

  async deleteCustomer(id, userId) {
    const [salesCount, balanceCheck] = await Promise.all([
      prisma.sale.count({ where: { customerId: id } }),
      prisma.customer.findUnique({ where: { id }, select: { balance: true, name: true } }),
    ]);

    if (!balanceCheck) {
      const err = new Error('Customer not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    if (salesCount > 0 || Number(balanceCheck.balance) !== 0) {
      const deactivated = await prisma.customer.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      await logActivity({
        prisma,
        userId,
        action: 'DEACTIVATE',
        module: 'CUSTOMERS',
        description: `Deactivated customer ${deactivated.name} (has ${salesCount} sales, balance: ${balanceCheck.balance} AED)`,
        entityId: id,
      });

      return { deleted: false, deactivated: true, message: 'Customer has sales history or non-zero balance. Deactivated instead of deleted.' };
    }

    await prisma.customer.delete({ where: { id } });

    await logActivity({
      prisma,
      userId,
      action: 'DELETE',
      module: 'CUSTOMERS',
      description: `Permanently deleted customer ${balanceCheck.name}`,
      entityId: id,
    });

    return { deleted: true, deactivated: false, message: 'Customer deleted successfully.' };
  }
}

module.exports = new CustomersService();

