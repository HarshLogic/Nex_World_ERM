'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Settings, Save, Plus, Trash2, Building, Receipt, Layers, X } from 'lucide-react';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [settings, setSettings] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    defaultTaxRate: 5.0,
    pricesIncludeTax: true,
    defaultLowStockThreshold: 5,
    invoicePrefix: 'INV-',
    receiptHeader: '',
    receiptFooter: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settRes, catRes] = await Promise.all([
        api.get('/settings'),
        api.get('/categories'),
      ]);

      if (settRes.success && settRes.data) {
        setSettings(settRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data || []);
      }
    } catch (err) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', settings);
      showToast('Business & system settings saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.post('/categories', { name: newCategoryName });
      showToast(`Category "${newCategoryName}" created`, 'success');
      setNewCategoryName('');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to add category', 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      showToast('Category deleted', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/4"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Parameters</h1>
          <p className="text-xs text-slate-500 mt-1">
            Business metadata, default currency (AED), VAT rates, receipt templates & category taxonomy.
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSettingsSave} className="space-y-6">
        {/* Business Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Building className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-sm text-slate-900">Enterprise Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Corporate Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store / Warehouse Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Currency & Tax Policies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">Currency, Invoices & Tax Calculations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Code</label>
              <input
                type="text"
                required
                value={settings.currencyCode}
                onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                required
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sequential Invoice Prefix</label>
              <input
                type="text"
                required
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pricesIncludeTax}
                onChange={(e) => setSettings({ ...settings, pricesIncludeTax: e.target.checked })}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <span>Catalog Prices Include Tax (Tax-Inclusive Pricing Mode)</span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              When checked, the VAT amount is extracted from product prices during checkout. When unchecked, tax is added on top.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Header Greeting</label>
              <input
                type="text"
                value={settings.receiptHeader || ''}
                onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Policy</label>
              <input
                type="text"
                value={settings.receiptFooter || ''}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save All Configuration Changes</span>
          </button>
        </div>
      </form>

      {/* Product Categories Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
          <Layers className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-sm text-slate-900">Catalog Category Taxonomy</h2>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 text-xs">
          <input
            type="text"
            required
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New Category Name (e.g. Storage & Networking)"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </form>

        {/* Categories List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {categories.map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
              <div>
                <span className="font-bold text-slate-800">{c.name}</span>
                <span className="text-slate-400 text-[10px] ml-2">
                  ({c._count?.products || 0} linked products)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteCategory(c.id, c.name)}
                className="text-slate-400 hover:text-red-600 p-1"
                title="Delete Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

