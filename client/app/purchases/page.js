'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  X,
  Printer,
  ChevronRight,
  Truck,
} from 'lucide-react';

export default function PurchasesPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState(null);
  const [receiveNotes, setReceiveNotes] = useState('');

  // New PO Form
  const [poFormData, setPoFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    landedCosts: '0',
    notes: '',
  });

  const [poLines, setPoLines] = useState([
    { productId: '', quantity: '10', unitCost: '50' },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, suppRes, prodRes] = await Promise.all([
        api.get('/purchase-orders?limit=50'),
        api.get('/suppliers?limit=50'),
        api.get('/products?limit=100'),
      ]);

      if (poRes.success && poRes.data) {
        setPurchaseOrders(poRes.data.purchaseOrders || []);
      }
      if (suppRes.success && suppRes.data) {
        setSuppliers(suppRes.data.suppliers || []);
      }
      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data.items || []);
      }
    } catch (err) {
      showToast('Failed to load procurement data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addPoLine = () => {
    setPoLines([...poLines, { productId: '', quantity: '10', unitCost: '50' }]);
  };

  const removePoLine = (index) => {
    setPoLines(poLines.filter((_, i) => i !== index));
  };

  const updatePoLine = (index, field, value) => {
    const copy = [...poLines];
    copy[index][field] = value;
    // Auto fill default base cost if product selected
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        copy[index].unitCost = prod.baseCost.toString();
      }
    }
    setPoLines(copy);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    try {
      const validLines = poLines.filter((l) => l.productId && parseFloat(l.quantity) > 0);
      if (validLines.length === 0) {
        showToast('Please add at least one valid product line', 'error');
        return;
      }

      await api.post('/purchase-orders', {
        ...poFormData,
        landedCosts: parseFloat(poFormData.landedCosts) || 0,
        items: validLines.map((l) => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
          unitCost: parseFloat(l.unitCost),
        })),
      });

      showToast('Purchase Order created successfully (Status: PENDING)', 'success');
      setCreateModalOpen(false);
      setPoLines([{ productId: '', quantity: '10', unitCost: '50' }]);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to create PO', 'error');
    }
  };

  const handleReceivePo = async () => {
    if (!selectedPoForReceive) return;
    try {
      const res = await api.post(`/purchase-orders/${selectedPoForReceive.id}/receive`, {
        notes: receiveNotes || 'Received in full',
      });

      if (res.success) {
        showToast(
          `PO ${selectedPoForReceive.poNumber} received! Inventory ledger incremented and base costs updated with proportional landed costs.`,
          'success'
        );
        setReceiveModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to receive PO', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Procurement & Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Supplier procurement lifecycle, proportional landed cost distribution & inventory receiving.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Order</span>
          </button>
        )}
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date Created</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Landed Costs</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No purchase orders created yet.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary-700">{po.poNumber}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{po.supplier?.name}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">{po._count.items}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{po.subtotal} AED</td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600">+{po.landedCosts} AED</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{po.grandTotal} AED</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.status === 'RECEIVED' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{po.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {po.status !== 'RECEIVED' && isAdmin ? (
                        <button
                          onClick={() => {
                            setSelectedPoForReceive(po);
                            setReceiveModalOpen(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition-all"
                        >
                          Receive Stock
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Stock Received</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Create New Purchase Order</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    required
                    value={poFormData.supplierId}
                    onChange={(e) => setPoFormData({ ...poFormData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.paymentTerms})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Landed Costs (Freight / Customs / Handling AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={poFormData.landedCosts}
                    onChange={(e) => setPoFormData({ ...poFormData, landedCosts: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Line Items *</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {poLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <select
                        required
                        value={line.productId}
                        onChange={(e) => updatePoLine(idx, 'productId', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded p-1.5"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updatePoLine(idx, 'quantity', e.target.value)}
                        className="w-20 bg-white border border-slate-200 rounded p-1.5 font-bold"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit Cost"
                        value={line.unitCost}
                        onChange={(e) => updatePoLine(idx, 'unitCost', e.target.value)}
                        className="w-24 bg-white border border-slate-200 rounded p-1.5 font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => removePoLine(idx)}
                        disabled={poLines.length === 1}
                        className="text-slate-400 hover:text-red-600 p-1 disabled:opacity-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPoLine}
                  className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center space-x-1 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Item Line</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-sm">
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive PO Modal */}
      {receiveModalOpen && selectedPoForReceive && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                Confirm Receipt for {selectedPoForReceive.poNumber}
              </h3>
              <button onClick={() => setReceiveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 space-y-1">
                <p className="font-bold text-blue-900">Proportional Landed Cost Formula:</p>
                <p className="text-[11px] text-blue-700 font-mono">
                  Allocated = (Item Subtotal / PO Subtotal) &times; Landed Costs
                </p>
                <p className="text-[11px] text-blue-700 font-mono">
                  Final Landed Unit Cost = Base Cost + (Allocated / Qty)
                </p>
              </div>

              <p className="text-slate-600">
                Receiving will increment the stock ledger for all items at their final landed unit cost,
                update catalog base costs, and post an accounts payable bill to {selectedPoForReceive.supplier?.name}.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receiving Notes / Bill of Lading</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="e.g. Received intact, signed by storekeeper"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReceivePo}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Confirm Stock Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

