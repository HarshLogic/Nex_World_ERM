'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  ClipboardCheck,
  Filter,
  Download,
  Printer,
  X,
  Plus,
} from 'lucide-react';

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterProductId, setFilterProductId] = useState('');

  // Modals
  const [stockInModal, setStockInModal] = useState(false);
  const [stockOutModal, setStockOutModal] = useState(false);
  const [stocktakeModal, setStocktakeModal] = useState(false);
  const [bulkReceiveModal, setBulkReceiveModal] = useState(false);

  // Form states
  const [stockFormData, setStockFormData] = useState({
    productId: '',
    quantity: '',
    unitCost: '',
    reason: '',
  });

  const [stocktakeData, setStocktakeData] = useState({
    productId: '',
    physicalCount: '',
    notes: '',
  });

  const [bulkItems, setBulkItems] = useState([{ productId: '', quantity: '', unitCost: '' }]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('transactionType', filterType);
      if (filterProductId) params.append('productId', filterProductId);

      const [ledgerRes, prodRes] = await Promise.all([
        api.get(`/inventory/ledger?${params.toString()}&limit=100`),
        api.get('/products?limit=100'),
      ]);

      if (ledgerRes.success && ledgerRes.data) {
        setLedgerEntries(ledgerRes.data.entries || []);
      }
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data.items || []);
      }
    } catch (err) {
      showToast('Failed to load inventory ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filterType, filterProductId]);

  // Handle Stock In Submit
  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/stock-in', stockFormData);
      showToast('Stock In recorded in ledger', 'success');
      setStockInModal(false);
      setStockFormData({ productId: '', quantity: '', unitCost: '', reason: '' });
      fetchLedger();
    } catch (err) {
      showToast(err.message || 'Stock In failed', 'error');
    }
  };

  // Handle Stock Out Submit
  const handleStockOutSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/stock-out', stockFormData);
      showToast('Stock Out recorded in ledger', 'success');
      setStockOutModal(false);
      setStockFormData({ productId: '', quantity: '', unitCost: '', reason: '' });
      fetchLedger();
    } catch (err) {
      showToast(err.message || 'Stock Out failed', 'error');
    }
  };

  // Handle Stocktake Reconciliation
  const handleStocktakeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/stocktake', stocktakeData);
      if (res.success && res.data) {
        if (res.data.adjusted) {
          showToast(
            `Stocktake adjusted by ${res.data.discrepancy > 0 ? '+' : ''}${res.data.discrepancy} units to match physical count.`,
            'info'
          );
        } else {
          showToast('Physical count matches system stock! No adjustment needed.', 'success');
        }
      }
      setStocktakeModal(false);
      setStocktakeData({ productId: '', physicalCount: '', notes: '' });
      fetchLedger();
    } catch (err) {
      showToast(err.message || 'Stocktake failed', 'error');
    }
  };

  // Handle Bulk Receive Submit
  const handleBulkReceiveSubmit = async (e) => {
    e.preventDefault();
    try {
      const validItems = bulkItems.filter((i) => i.productId && parseFloat(i.quantity) > 0);
      if (validItems.length === 0) {
        showToast('Please specify valid products and quantities', 'error');
        return;
      }

      await api.post('/inventory/bulk-receive', {
        items: validItems,
        reason: 'Bulk receive shipment',
      });

      showToast(`Bulk received ${validItems.length} products successfully`, 'success');
      setBulkReceiveModal(false);
      setBulkItems([{ productId: '', quantity: '', unitCost: '' }]);
      fetchLedger();
    } catch (err) {
      showToast(err.message || 'Bulk receive failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Immutable Inventory Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit-proof running ledger balances derived strictly from signed inventory transactions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStockInModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Stock In</span>
          </button>
          <button
            onClick={() => setStockOutModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Stock Out</span>
          </button>
          <button
            onClick={() => setBulkReceiveModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Bulk Receive</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setStocktakeModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
              <span>Stocktake (Reconcile)</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Transaction Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Movement Types</option>
            <option value="STOCK_IN">Stock In (+)</option>
            <option value="STOCK_OUT">Stock Out (-)</option>
            <option value="SALE">POS Sale (-)</option>
            <option value="RETURN">Sales Return (+)</option>
            <option value="PURCHASE_RECEIPT">PO Receipt (+)</option>
            <option value="ADJUSTMENT">Stocktake Adjustment (&plusmn;)</option>
          </select>

          {/* Product Filter */}
          <select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none max-w-xs"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-center">Movement Qty</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4">Reason / Reference</th>
                <th className="py-3 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading ledger entries...
                  </td>
                </tr>
              ) : ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No ledger transactions found.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => {
                  const isPositive = Number(entry.signedQuantity) > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{entry.product?.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{entry.product?.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.transactionType === 'STOCK_IN' || entry.transactionType === 'PURCHASE_RECEIPT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.transactionType === 'SALE' || entry.transactionType === 'STOCK_OUT'
                              ? 'bg-red-100 text-red-800'
                              : entry.transactionType === 'RETURN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {entry.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={isPositive ? 'text-emerald-700' : 'text-red-700'}>
                          {isPositive ? `+${entry.signedQuantity}` : entry.signedQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {entry.unitCost} AED
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{entry.reason || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{entry.user?.name}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock In Modal */}
      {stockInModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Record Stock In (+)</h3>
              <button onClick={() => setStockInModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStockInSubmit} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product *</label>
                <select
                  required
                  value={stockFormData.productId}
                  onChange={(e) => setStockFormData({ ...stockFormData, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stockFormData.unitCost}
                    onChange={(e) => setStockFormData({ ...stockFormData, unitCost: e.target.value })}
                    placeholder="Auto from catalog"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={stockFormData.reason}
                  onChange={(e) => setStockFormData({ ...stockFormData, reason: e.target.value })}
                  placeholder="e.g. Warehouse Restock, Vendor delivery"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStockInModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">
                  Submit Stock In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Out Modal */}
      {stockOutModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Record Stock Out (-)</h3>
              <button onClick={() => setStockOutModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStockOutSubmit} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product *</label>
                <select
                  required
                  value={stockFormData.productId}
                  onChange={(e) => setStockFormData({ ...stockFormData, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Current: {p.stockOnHand}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity to Remove *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockFormData.quantity}
                  onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Reason *</label>
                <input
                  type="text"
                  required
                  value={stockFormData.reason}
                  onChange={(e) => setStockFormData({ ...stockFormData, reason: e.target.value })}
                  placeholder="e.g. Damaged in transit, Sample demo, Write-off"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStockOutModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg">
                  Submit Stock Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stocktake Modal */}
      {stocktakeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Physical Stocktake Reconciliation</h3>
              <button onClick={() => setStocktakeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStocktakeSubmit} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product *</label>
                <select
                  required
                  value={stocktakeData.productId}
                  onChange={(e) => setStocktakeData({ ...stocktakeData, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current System: {p.stockOnHand})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Count Observed *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stocktakeData.physicalCount}
                  onChange={(e) => setStocktakeData({ ...stocktakeData, physicalCount: e.target.value })}
                  placeholder="Actual counted items on shelf"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Auditor Notes</label>
                <input
                  type="text"
                  value={stocktakeData.notes}
                  onChange={(e) => setStocktakeData({ ...stocktakeData, notes: e.target.value })}
                  placeholder="Audit reason, counted by"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStocktakeModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg">
                  Submit Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Receive Modal */}
      {bulkReceiveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Bulk Stock Receipt</h3>
              <button onClick={() => setBulkReceiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkReceiveSubmit} className="py-4 space-y-3 text-xs">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {bulkItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => {
                        const copy = [...bulkItems];
                        copy[idx].productId = e.target.value;
                        setBulkItems(copy);
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded p-1.5"
                    >
                      <option value="">Select Item</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...bulkItems];
                        copy[idx].quantity = e.target.value;
                        setBulkItems(copy);
                      }}
                      className="w-20 bg-white border border-slate-200 rounded p-1.5 font-bold"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Unit Cost"
                      value={item.unitCost}
                      onChange={(e) => {
                        const copy = [...bulkItems];
                        copy[idx].unitCost = e.target.value;
                        setBulkItems(copy);
                      }}
                      className="w-24 bg-white border border-slate-200 rounded p-1.5"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setBulkItems([...bulkItems, { productId: '', quantity: '', unitCost: '' }])}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Line</span>
              </button>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBulkReceiveModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
                  Submit Bulk Receive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

