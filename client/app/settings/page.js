'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Building2,
  Coins,
  Receipt,
  Layers,
  CreditCard,
  Sliders,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Upload,
  Globe,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Categories State
  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '', status: 'ACTIVE' });

  // Main System & Perfume ERP Settings State
  const [settings, setSettings] = useState({
    businessName: 'Royal Oud & Perfumes LLC',
    phone: '+971 4 399 8888',
    email: 'sales@royaloudperfumes.ae',
    address: 'Shop 12, Gold & Diamond Souk, Deira, Dubai, UAE',
    website: 'https://royaloudperfumes.ae',
    taxNumber: '100234567800003',
    logoUrl: '',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    defaultTaxRate: 5.0,
    pricesIncludeTax: true,
    defaultLowStockThreshold: 5,
    invoicePrefix: 'INV-',
    invoiceFormat: 'PERF-SEQ',
    receiptHeader: 'Royal Oud & Perfumes — Luxury Fragrances Dubai',
    receiptFooter: 'Perfumes and oils once opened cannot be exchanged or refunded due to hygiene regulations.',
    receiptNotes: '100% Authentic French & Oriental Fragrances',
    showTaxDetails: true,
    showCustomerDetails: true,
    allowNegativeInventory: false,
    defaultPaymentMethod: 'CASH',
    allowPartialPayments: true,
    allowCustomerCredit: true,
    maxDiscountPercent: 50.0,
    businessTimezone: 'Asia/Dubai',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settRes, catRes] = await Promise.all([
        api.get('/settings'),
        api.get('/categories'),
      ]);

      if (settRes.success && settRes.data) {
        setSettings((prev) => ({ ...prev, ...settRes.data }));
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
    e?.preventDefault?.();
    try {
      setSaving(true);
      await api.put('/settings', settings);
      showToast('Perfume ERP settings saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Category Actions
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', description: '', status: 'ACTIVE' });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryFormData({
      name: cat.name,
      description: cat.description || '',
      status: cat.status || 'ACTIVE',
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, categoryFormData);
        showToast(`Category "${categoryFormData.name}" updated`, 'success');
      } else {
        await api.post('/categories', categoryFormData);
        showToast(`Category "${categoryFormData.name}" created`, 'success');
      }
      setCategoryModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await api.delete(`/categories/${id}`);
      showToast('Category deleted successfully', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Cannot delete category with associated products', 'error');
    }
  };

  const tabs = [
    { id: 'business', label: '1. Business Info', icon: Building2 },
    { id: 'currency', label: '2. Currency & Tax', icon: Coins },
    { id: 'receipt', label: '3. Receipt & Invoice', icon: Receipt },
    { id: 'categories', label: '4. Perfume Categories', icon: Layers },
    { id: 'payment_pos', label: '5. Payment & POS Preferences', icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl">
        <div className="h-12 bg-slate-200 rounded-2xl w-1/3"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Page Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Perfume ERP Business Settings
            </h1>
            <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
              UAE Production
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure boutique metadata, VAT rate (5%), invoice prefixes, and perfume categories.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          onClick={handleSettingsSave}
          disabled={saving}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 self-start sm:self-auto"
        >
          <Save className="w-4 h-4 text-slate-950" />
          <span>{saving ? 'Saving Changes...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* Navigation Tabs (Mobile horizontally scrollable, Desktop pills) */}
      <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-md shadow-slate-900/10'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Business Information */}
      {activeTab === 'business' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Boutique & Enterprise Profile</h2>
              <p className="text-xs text-slate-500">Official business identity printed on receipts and legal invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Business Legal Name *
              </label>
              <input
                type="text"
                required
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                placeholder="e.g. Royal Oud & Perfumes LLC"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Tax Registration Number (TRN)
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={settings.taxNumber || ''}
                  onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                  placeholder="100234567800003 (15 digits)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Official Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+971 4 399 8888"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Business Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="sales@royaloudperfumes.ae"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Official Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={settings.website || ''}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  placeholder="https://royaloudperfumes.ae"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Logo URL or CDN Link
              </label>
              <div className="relative">
                <Upload className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://yourdomain.com/logo.png"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Shop / Warehouse Physical Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Shop 12, Gold & Diamond Souk, Deira, Dubai, UAE"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Currency & Tax */}
      {activeTab === 'currency' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <Coins className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Currency & Value Added Tax (VAT)</h2>
              <p className="text-xs text-slate-500">
                Official UAE standard: 5% VAT rate, AED currency code & pricing policy.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Currency Code *
              </label>
              <input
                type="text"
                required
                value={settings.currencyCode}
                onChange={(e) => setSettings({ ...settings, currencyCode: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: AED (United Arab Emirates Dirham)</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Currency Display Symbol *
              </label>
              <input
                type="text"
                required
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Default VAT Tax Rate (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Standard UAE FTA VAT is 5.0%</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Default Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={settings.defaultLowStockThreshold}
                onChange={(e) => setSettings({ ...settings, defaultLowStockThreshold: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Triggers reorder badge on POS and Dashboard</span>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-900">Retail Prices Include Tax (VAT Inclusive)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, product shelf price already includes the 5% VAT (UAE retail norm).
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.pricesIncludeTax}
                onChange={(e) => setSettings({ ...settings, pricesIncludeTax: e.target.checked })}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Receipt / Invoice Settings */}
      {activeTab === 'receipt' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Receipt & Invoice Template Formatting</h2>
              <p className="text-xs text-slate-500">Configure headers, footers and numbering for thermal & A4 receipts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Invoice Number Prefix *
              </label>
              <input
                type="text"
                required
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Example: INV-000042</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Invoice Numbering Format
              </label>
              <select
                value={settings.invoiceFormat || 'PERF-SEQ'}
                onChange={(e) => setSettings({ ...settings, invoiceFormat: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="PERF-SEQ">Sequential 5-Digit (INV-00001)</option>
                <option value="YEAR-SEQ">Year + Sequential (INV-2026-0001)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Receipt Header Greetings
              </label>
              <input
                type="text"
                value={settings.receiptHeader || ''}
                onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                placeholder="Royal Oud & Perfumes — Luxury Fragrances Dubai"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Receipt Footer Terms & Return Policy
              </label>
              <textarea
                rows={2}
                value={settings.receiptFooter || ''}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                placeholder="Perfumes and oils once opened cannot be exchanged or refunded due to hygiene regulations."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-900">Show VAT Breakdown on Receipt</p>
                <p className="text-[10px] text-slate-500">Prints Net Subtotal, 5% Tax and TRN.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showTaxDetails}
                onChange={(e) => setSettings({ ...settings, showTaxDetails: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-900">Show Customer Information on Receipt</p>
                <p className="text-[10px] text-slate-500">Prints Customer Name, Phone & Address if selected.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showCustomerDetails}
                onChange={(e) => setSettings({ ...settings, showCustomerDetails: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Product Categories (Perfume Categories) */}
      {activeTab === 'categories' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <div>
                <h2 className="font-bold text-sm text-slate-900">Perfume Taxonomy & Categories</h2>
                <p className="text-xs text-slate-500">
                  Organize inventory into Oud, Attar, Eau de Parfum, Body Mist and Gift Sets.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Perfume Category</span>
            </button>
          </div>

          {/* Categories Grid Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        cat.status === 'INACTIVE' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {cat.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {cat.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    {cat._count?.products ?? 0} Products
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Payment & POS Settings */}
      {activeTab === 'payment_pos' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Payment Gateways & POS Operational Rules</h2>
              <p className="text-xs text-slate-500">
                Payment tender methods, customer credit policies and inventory rules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Default POS Payment Method
              </label>
              <select
                value={settings.defaultPaymentMethod || 'CASH'}
                onChange={(e) => setSettings({ ...settings, defaultPaymentMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                <option value="CASH">Cash (AED)</option>
                <option value="CARD">Card / POS Terminal</option>
                <option value="WALLET">Mobile Wallet (Apple / Samsung Pay)</option>
                <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                <option value="CREDIT">Customer Credit / Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Maximum Cashier Discount Permitted (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.maxDiscountPercent}
                onChange={(e) => setSettings({ ...settings, maxDiscountPercent: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Discounts exceeding this require manager PIN / authorization.
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-900">Allow Customer Credit Sales</p>
                <p className="text-[10px] text-slate-500">Allow registered customers to purchase on unpaid account balance.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowCustomerCredit}
                onChange={(e) => setSettings({ ...settings, allowCustomerCredit: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-xs text-slate-900">Allow Negative Inventory on Emergency POS</p>
                <p className="text-[10px] text-slate-500">Permits sales when stock is zero (triggers negative ledger tracking).</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowNegativeInventory}
                onChange={(e) => setSettings({ ...settings, allowNegativeInventory: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingCategory ? 'Edit Perfume Category' : 'Create New Perfume Category'}
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g. Attar & Concentrated Oils"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Description / Scent Profile
                </label>
                <textarea
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Alcohol-free pure perfume oils formulated with aged Cambodian & Hindi oud."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Status
                </label>
                <select
                  value={categoryFormData.status}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-sm"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
