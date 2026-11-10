const prisma = require('../../config/prisma');
const { round2 } = require('../../utils/calculations.util');
const { logActivity } = require('../../utils/audit.util');

class ExpensesService {
  async listCategories() {
    return await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name, description) {
    return await prisma.expenseCategory.create({
      data: {
        name: name.trim(),
        description: description || null,
      },
    });
  }

  async listExpenses({ categoryId, paidVia, startDate, endDate, page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};
    if (categoryId) where.expenseCategoryId = categoryId;
    if (paidVia) where.paidVia = paidVia;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [expenses, totalCount, aggregations] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalAmount = round2(aggregations._sum.amount || 0);

    return {
      expenses,
      totalAmountAED: totalAmount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    };
  }

  async createExpense(data, userId) {
    const { expenseCategoryId, payee, amount, paidVia = 'CASH', notes, date } = data;

    const parsedAmount = round2(Number(amount));
    if (parsedAmount <= 0) {
      const err = new Error('Expense amount must be greater than zero.');
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    const expense = await prisma.expense.create({
      data: {
        expenseCategoryId,
        payee: payee.trim(),
        amount: parsedAmount,
        paidVia,
        notes: notes || null,
        date: date ? new Date(date) : new Date(),
        createdById: userId,
      },
      include: {
        category: true,
      },
    });

    await logActivity({
      prisma,
      userId,
      action: 'CREATE_EXPENSE',
      module: 'EXPENSES',
      description: `Recorded expense of ${parsedAmount} AED to ${payee} (${expense.category.name})`,
      entityId: expense.id,
    });

    return expense;
  }

  async deleteExpense(id, userId) {
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      const err = new Error('Expense record not found');
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    await prisma.expense.delete({ where: { id } });

    await logActivity({
      prisma,
      userId,
      action: 'DELETE_EXPENSE',
      module: 'EXPENSES',
      description: `Deleted expense record of ${expense.amount} AED paid to ${expense.payee}`,
      entityId: id,
    });

    return { message: 'Expense deleted successfully' };
  }
}

module.exports = new ExpensesService();

