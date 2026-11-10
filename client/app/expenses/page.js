'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Receipt, Plus, Search, Trash2, Printer, Download, X, DollarSign } from 'lucide-react';

export default function ExpensesPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalAmountAED, setTotalAmountAED] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paidViaFilter, setPaidViaFilter] = useState('');

  // Add Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    expenseCategoryId: '',
    payee: '',
    amount: '',
    paidVia: 'CASH',
    notes: '',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (paidViaFilter) params.append('paidVia', paidViaFilter);

      const [expRes, catRes] = await Promise.all([
        api.get(`/expenses?${params.toString()}&limit=50`),
        api.get('/expenses/categories'),
      ]);

      if (expRes.success && expRes.data) {
        setExpenses(expRes.data.expenses || []);
        setTotalAmountAED(expRes.data.totalAmountAED || 0);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data || []);
      }
    } catch (err) {
      showToast('Failed to load expense records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, paidViaFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', formData);
      showToast('Expense voucher recorded successfully', 'success');
      setModalOpen(false);
      setFormData({
        expenseCategoryId: '',
        payee: '',
        amount: '',
        paidVia: 'CASH',
        notes: '',
      });
      fetchExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to record expense', 'error');
    }
  };

  const handleDelete = async (id, payee, amount) => {
    if (!confirm(`Delete expense of ${amount} AED paid to ${payee}?`)) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast('Expense voucher removed', 'success');
      fetchExpenses();
    } catch (err) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Operational overhead, petty cash vouchers & monthly expenditure tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Total Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={paidViaFilter}
            onChange={(e) => setPaidViaFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Corporate Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>

        {/* Filtered Total AED Banner */}
        <div className="flex items-center space-x-2 bg-red-50 text-red-800 px-4 py-2 rounded-xl border border-red-200">
          <DollarSign className="w-4 h-4 text-red-600" />
          <span className="text-xs font-semibold">Total Filtered Expenses:</span>
          <span className="text-sm font-extrabold">{totalAmountAED} AED</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payee</th>
                <th className="py-3 px-4">Paid Via</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Amount (AED)</th>
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{exp.category?.name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{exp.payee}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {exp.paidVia}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{exp.notes || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">{exp.amount} AED</td>
                    <td className="py-3 px-4 text-center no-print">
                      <button
                        onClick={() => handleDelete(exp.id, exp.payee, exp.amount)}
                        title="Delete Voucher"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Record Operational Expense</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
                <select
                  required
                  value={formData.expenseCategoryId}
                  onChange={(e) => setFormData({ ...formData, expenseCategoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payee / Recipient *</label>
                  <input
                    type="text"
                    required
                    value={formData.payee}
                    onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    placeholder="e.g. DEWA, Office Landlord"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paid Via</label>
                <select
                  value={formData.paidVia}
                  onChange={(e) => setFormData({ ...formData, paidVia: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="CASH">Petty Cash</option>
                  <option value="CARD">Corporate Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Voucher Reference</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Invoice #, Receipt attachment ref"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-sm">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

