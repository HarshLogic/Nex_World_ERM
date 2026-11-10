'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  History,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function SalesHistoryPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchInvoice, setSearchInvoice] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Selected Sale Detail Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Process Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnSale, setReturnSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [returnReason, setReturnReason] = useState('Customer return');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchInvoice) params.append('invoiceNumber', searchInvoice);
      if (paymentFilter) params.append('paymentMethod', paymentFilter);

      const res = await api.get(`/sales?${params.toString()}&limit=50`);
      if (res.success && res.data) {
        setSales(res.data.sales || []);
      }
    } catch (err) {
      showToast('Failed to load sales history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [searchInvoice, paymentFilter]);

  const viewSaleDetails = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.success && res.data) {
        setSelectedSale(res.data);
        setDetailModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load sale details', 'error');
    }
  };

  const openReturnModal = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      if (res.success && res.data) {
        setReturnSale(res.data);
        const initQuantities = {};
        res.data.items.forEach((item) => {
          initQuantities[item.id] = 0;
        });
        setReturnQuantities(initQuantities);
        setReturnModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to prepare return', 'error');
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemsToReturn = Object.entries(returnQuantities)
        .filter(([_, qty]) => parseFloat(qty) > 0)
        .map(([saleItemId, qty]) => ({
          saleItemId,
          quantity: parseFloat(qty),
        }));

      if (itemsToReturn.length === 0) {
        showToast('Please specify at least one item quantity to return.', 'error');
        return;
      }

      const res = await api.post('/returns', {
        originalSaleId: returnSale.id,
        items: itemsToReturn,
        refundMethod,
        reason: returnReason,
      });

      if (res.success) {
        showToast(`Return #${res.data.returnNumber} processed successfully! Stock restored.`, 'success');
        setReturnModalOpen(false);
        fetchSales();
      }
    } catch (err) {
      showToast(err.message || 'Return processing failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales History & Returns</h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical sales transactions, payment settlements & historical gross profit preservation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sales Log</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
            placeholder="Search invoice number (e.g. INV-00001)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Customer Credit</option>
          </select>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
                {isAdmin && <th className="py-3 px-4 text-right">Gross Profit</th>}
                <th className="py-3 px-4 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No sales records found.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary-700">{sale.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{sale.customer?.name}</td>
                    <td className="py-3 px-4 text-slate-500">{sale.cashier?.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">{sale._count.items}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{sale.grandTotal} AED</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {sale.payments[0]?.paymentMethod || 'CASH'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        +{sale.grossProfit} AED
                      </td>
                    )}
                    <td className="py-3 px-4 text-center no-print">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => viewSaleDetails(sale.id)}
                          title="View Receipt & Details"
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openReturnModal(sale.id)}
                            title="Process Return (Admin Only)"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details & Receipt Modal */}
      {detailModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Sale Details: {selectedSale.invoiceNumber}</h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 text-xs space-y-2 border-b border-slate-100">
              <div className="flex justify-between text-slate-500">
                <span>Date:</span>
                <span>{new Date(selectedSale.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Customer:</span>
                <span className="font-semibold text-slate-800">{selectedSale.customer?.name}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cashier:</span>
                <span>{selectedSale.cashier?.name}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-3 max-h-48 overflow-y-auto space-y-2 border-b border-slate-100">
              {selectedSale.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{item.product?.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {item.quantity} x {item.unitPrice} AED {item.itemDiscount > 0 ? `(-${item.itemDiscount} disc)` : ''}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">{item.subtotal} AED</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{selectedSale.subtotal} AED</span>
              </div>
              {selectedSale.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{selectedSale.totalDiscount} AED</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>{selectedSale.grandTotal} AED</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between font-bold text-emerald-700 text-xs pt-1">
                  <span>Gross Profit Snapshotted:</span>
                  <span>+{selectedSale.grossProfit} AED</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Return Modal (Admin Only) */}
      {returnModalOpen && returnSale && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-1.5 text-amber-600 font-bold text-sm">
                <RotateCcw className="w-4 h-4" />
                <span>Process Return for Invoice {returnSale.invoiceNumber}</span>
              </div>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="py-4 space-y-4 text-xs">
              <p className="text-[11px] text-slate-500">
                Specify quantities to return. Cannot exceed eligible sold units minus previous returns.
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {returnSale.items.map((item) => {
                  const previouslyReturned = item.saleReturnItems.reduce(
                    (sum, ret) => sum + Number(ret.quantityReturned),
                    0
                  );
                  const eligible = Number(item.quantity) - previouslyReturned;

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex-1 pr-2">
                        <span className="font-semibold text-slate-800 block">{item.product?.name}</span>
                        <span className="text-[10px] text-slate-500">
                          Sold: {item.quantity} | Previously Returned: {previouslyReturned} | Eligible: {eligible}
                        </span>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          max={eligible}
                          disabled={eligible <= 0}
                          value={returnQuantities[item.id] || 0}
                          onChange={(e) =>
                            setReturnQuantities({
                              ...returnQuantities,
                              [item.id]: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="CASH">Cash Refund</option>
                    <option value="CREDIT">Store Credit to Customer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Customer dissatisfaction, Defect"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Confirm & Restore Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

