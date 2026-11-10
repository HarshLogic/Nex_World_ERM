'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Activity, Search, ShieldCheck, Printer, Filter } from 'lucide-react';

export default function ActivityLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/activity-logs?${params.toString()}&limit=100`);
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
      }
    } catch (err) {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit Trail & Activity Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-proof, append-only operational audit log capturing all mutations, checkouts & stock changes.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Audit Trail</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3 no-print">
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Domain Modules</option>
          <option value="POS">POS / Checkout</option>
          <option value="INVENTORY">Inventory / Stock</option>
          <option value="PRODUCTS">Products</option>
          <option value="PURCHASE_ORDERS">Purchase Orders</option>
          <option value="CUSTOMERS">Customers</option>
          <option value="SUPPLIERS">Suppliers</option>
          <option value="EXPENSES">Expenses</option>
          <option value="USERS">Users</option>
          <option value="SETTINGS">Settings</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
        >
          <option value="">All Action Types</option>
          <option value="CHECKOUT">CHECKOUT</option>
          <option value="STOCK_IN">STOCK_IN</option>
          <option value="STOCK_OUT">STOCK_OUT</option>
          <option value="RECEIVE_PO">RECEIVE_PO</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="PROCESS_RETURN">PROCESS_RETURN</option>
        </select>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Operational Description</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No activity logs recorded matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-primary-700">{log.module}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{log.description}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{log.user?.name || 'System'}</span>
                      <span className="text-[10px] text-slate-400">{log.user?.email}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

