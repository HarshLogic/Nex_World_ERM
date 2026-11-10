'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  CreditCard,
  Layers,
  TrendingUp,
  Receipt,
  PiggyBank,
  PlusCircle,
  ScanLine,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpiRes, analyticsRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/analytics'),
      ]);
      if (kpiRes.success) setKpis(kpiRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Business Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial indicators & inventory balance derived from PostgreSQL ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pos"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <ScanLine className="w-4 h-4" />
            <span>New Sale</span>
          </Link>
          <Link
            href="/products"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/purchases"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>New PO</span>
          </Link>
          <Link
            href="/expenses"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {Number(kpis?.todaySales || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Today's Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Orders</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpis?.todayOrders || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Low Stock Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              <span className={kpis?.lowStockItemsCount > 0 ? 'text-amber-600' : 'text-slate-900'}>
                {kpis?.lowStockItemsCount || 0}
              </span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Credit Outstanding */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Outstanding</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {Number(kpis?.creditOutstanding || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* 5. Total Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Valuation</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {Number(kpis?.stockValue || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* 6. Monthly Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {Number(kpis?.monthlyRevenue || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 7. Monthly Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Expenses</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {Number(kpis?.monthlyExpenses || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* 8. Monthly Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Net Profit</p>
            <h3
              className={`text-2xl font-bold mt-1 ${
                Number(kpis?.monthlyNetProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {Number(kpis?.monthlyNetProfit || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">7-Day Sales Trend</h2>
            <span className="text-xs text-slate-400">Past 7 days revenue (AED)</span>
          </div>
          <div className="h-64">
            {analytics?.salesTrend && analytics.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.salesTrend}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`${val} AED`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No revenue records in the past 7 days
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Sales by Payment Method</h2>
          <div className="h-48 flex items-center justify-center">
            {analytics?.paymentBreakdown && analytics.paymentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.paymentBreakdown}
                    dataKey="totalAmount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={40}
                  >
                    {analytics.paymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} AED`, 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No payment data recorded</p>
            )}
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {analytics?.paymentBreakdown?.map((item, idx) => (
              <div key={item.method} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="font-medium text-slate-700">{item.method}</span>
                </div>
                <span className="font-bold text-slate-900">{item.totalAmount} AED</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables: Recent Sales & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Transactions</h2>
            <Link href="/sales" className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              <span>View History</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {analytics?.recentSales && analytics.recentSales.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Invoice</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Cashier</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {analytics.recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-primary-700">{s.invoiceNumber}</td>
                      <td className="py-2.5 px-4">{s.customer?.name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{s.cashier?.name}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">{s.grandTotal} AED</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-xs text-slate-400">No recent transactions recorded</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-amber-700 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low Stock Alerts</span>
            </h2>
            <Link href="/products" className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              <span>Catalog</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {kpis?.lowStockAlerts && kpis.lowStockAlerts.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4 text-right">On Hand</th>
                    <th className="py-2.5 px-4 text-right">Reorder Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {kpis.lowStockAlerts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{item.name}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{item.sku}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-red-600">{item.stockOnHand}</td>
                      <td className="py-2.5 px-4 text-right text-slate-500">{item.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-xs text-emerald-600 font-medium">All items are sufficiently stocked.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

