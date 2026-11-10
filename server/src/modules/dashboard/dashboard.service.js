const prisma = require('../../config/prisma');
const { round2 } = require('../../utils/calculations.util');

class DashboardService {
  async getKpis() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const [
      todaySalesAgg,
      todayOrdersCount,
      monthSalesAgg,
      monthExpensesAgg,
      customerCreditAgg,
      productsWithLedgers,
      monthReturnsAgg,
    ] = await Promise.all([
      // 1. Today's Sales
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _sum: { grandTotal: true },
      }),
      // 2. Today's Orders
      prisma.sale.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      // 3. Monthly Revenue & COGS
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { grandTotal: true, historicalCostTotal: true, grossProfit: true },
      }),
      // 4. Monthly Expenses
      prisma.expense.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // 5. Total Credit Outstanding
      prisma.customer.aggregate({
        where: { balance: { gt: 0 } },
        _sum: { balance: true },
      }),
      // 6. Products for Low Stock and Total Stock Value
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          sku: true,
          reorderLevel: true,
          baseCost: true,
          inventoryLedgers: {
            select: { signedQuantity: true },
          },
        },
      }),
      // 7. Monthly Returns (deductions from profit)
      prisma.saleReturn.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { refundTotal: true },
      }),
    ]);

    // Calculate low stock items count & total catalog stock value
    let lowStockCount = 0;
    let totalStockValue = 0;
    const lowStockAlerts = [];

    for (const prod of productsWithLedgers) {
      const stockOnHand = prod.inventoryLedgers.reduce(
        (sum, entry) => round2(sum + Number(entry.signedQuantity)),
        0
      );
      const stockVal = round2(stockOnHand * Number(prod.baseCost));
      totalStockValue = round2(totalStockValue + stockVal);

      if (stockOnHand <= prod.reorderLevel) {
        lowStockCount++;
        lowStockAlerts.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          stockOnHand,
          reorderLevel: prod.reorderLevel,
        });
      }
    }

    const todaySales = round2(todaySalesAgg._sum.grandTotal || 0);
    const monthlyRevenue = round2(monthSalesAgg._sum.grandTotal || 0);
    const monthlyGrossProfit = round2(monthSalesAgg._sum.grossProfit || 0);
    const monthlyExpenses = round2(monthExpensesAgg._sum.amount || 0);
    const monthlyReturns = round2(monthReturnsAgg._sum.refundTotal || 0);
    const creditOutstanding = round2(customerCreditAgg._sum.balance || 0);

    // Monthly Net Profit = Gross Profit - Returns - Expenses
    const monthlyNetProfit = round2(monthlyGrossProfit - monthlyReturns - monthlyExpenses);

    return {
      todaySales,
      todayOrders: todayOrdersCount,
      lowStockItemsCount: lowStockCount,
      creditOutstanding,
      stockValue: totalStockValue,
      monthlyRevenue,
      monthlyExpenses,
      monthlyNetProfit,
      lowStockAlerts: lowStockAlerts.slice(0, 10),
    };
  }

  async getAnalytics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);

    const [recentSales, last7DaysSales, paymentsByMethod] = await Promise.all([
      // Recent 10 sales
      prisma.sale.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          cashier: { select: { id: true, name: true } },
          payments: { select: { paymentMethod: true } },
        },
      }),
      // Sales for last 7 days for trend chart
      prisma.sale.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
          grandTotal: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Sales by Payment Method
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Group last 7 days by calendar date
    const dailyMap = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyMap.set(dateKey, { date: dateKey, day: dayName, sales: 0, orders: 0 });
    }

    for (const sale of last7DaysSales) {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        const item = dailyMap.get(dateKey);
        item.sales = round2(item.sales + Number(sale.grandTotal));
        item.orders += 1;
      }
    }

    const salesTrend = Array.from(dailyMap.values());

    const paymentBreakdown = paymentsByMethod.map((p) => ({
      method: p.paymentMethod,
      totalAmount: round2(p._sum.amount || 0),
      count: p._count.id,
    }));

    return {
      salesTrend,
      paymentBreakdown,
      recentSales,
    };
  }
}

module.exports = new DashboardService();

