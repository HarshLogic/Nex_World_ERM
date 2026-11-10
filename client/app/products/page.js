'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  QrCode,
  AlertTriangle,
  X,
  FileText,
  Sparkles,
  Droplet,
  Tag,
  CheckCircle2,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, IN_STOCK, LOW_STOCK

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    brand: '',
    perfumeType: 'Spray',
    fragranceName: '',
    sizeVolume: '100ml',
    concentration: 'Eau de Parfum (EDP)',
    gender: 'Unisex',
    sellingPrice: '',
    baseCost: '',
    barcode: '',
    taxRate: '5.0',
    reorderLevel: '5',
    suggestedReorderQty: '20',
    initialStock: '10',
    imageUrl: '',
    supplierId: '',
    description: '',
  });

  // Barcode / QR Label Modal
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState(null);
  const [copiedSku, setCopiedSku] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (selectedCategory) queryParams.append('categoryId', selectedCategory);
      if (selectedBrand) queryParams.append('brand', selectedBrand);

      const [prodRes, catRes, suppRes] = await Promise.all([
        api.get(`/products?${queryParams.toString()}&limit=100`),
        api.get('/categories'),
        api.get('/suppliers?status=ACTIVE'),
      ]);

      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data.items || []);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data || []);
      }
      if (suppRes.success && suppRes.data) {
        setSuppliers(suppRes.data.suppliers || []);
      }
    } catch (err) {
      showToast('Failed to load perfumes and products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedBrand]);

  // Extract unique brands for filter dropdown
  const uniqueBrands = useMemo(() => {
    const brands = new Set();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (stockFilter === 'LOW_STOCK') return p.stockOnHand <= p.reorderLevel;
      if (stockFilter === 'IN_STOCK') return p.stockOnHand > 0;
      return true;
    });
  }, [products, stockFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      brand: 'Swiss Arabian',
      perfumeType: 'Spray',
      fragranceName: '',
      sizeVolume: '100ml',
      concentration: 'Eau de Parfum (EDP)',
      gender: 'Unisex',
      sellingPrice: '',
      baseCost: '',
      barcode: '',
      taxRate: '5.0',
      reorderLevel: '5',
      suggestedReorderQty: '20',
      initialStock: '10',
      imageUrl: '',
      supplierId: suppliers[0]?.id || '',
      description: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.categoryId || categories[0]?.id || '',
      brand: product.brand || '',
      perfumeType: product.perfumeType || 'Spray',
      fragranceName: product.fragranceName || '',
      sizeVolume: product.sizeVolume || '100ml',
      concentration: product.concentration || 'Eau de Parfum (EDP)',
      gender: product.gender || 'Unisex',
      sellingPrice: String(product.sellingPrice),
      baseCost: String(product.baseCost),
      barcode: product.barcode || '',
      taxRate: String(product.taxRate || 5.0),
      reorderLevel: String(product.reorderLevel || 5),
      suggestedReorderQty: String(product.suggestedReorderQty || 20),
      initialStock: String(product.stockOnHand || 0),
      imageUrl: product.imageUrl || '',
      supplierId: product.supplierId || '',
      description: product.description || '',
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Perfume product name is required', 'error');
      return;
    }
    if (!formData.sellingPrice || Number(formData.sellingPrice) <= 0) {
      showToast('Valid selling price in AED is required', 'error');
      return;
    }

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        showToast(`Perfume "${formData.name}" updated successfully`, 'success');
      } else {
        await api.post('/products', formData);
        showToast(`Perfume "${formData.name}" added to catalog`, 'success');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Failed to save perfume product', 'error');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to archive perfume "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      showToast(`Product "${name}" archived`, 'success');
      fetchProducts();
    } catch (err) {
      showToast(err.message || 'Cannot delete product with sales history', 'error');
    }
  };

  const openLabelModal = (product) => {
    setSelectedProductForLabel(product);
    setCopiedSku(false);
    setLabelModalOpen(true);
  };

  const handleCopySku = (sku) => {
    navigator.clipboard?.writeText(sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
    showToast(`SKU ${sku} copied to clipboard`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Perfumes & Product Catalog
            </h1>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
              {filteredProducts.length} Items
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage perfume SKUs, fragrance notes, volume, wholesale costs, selling prices and barcode labels.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Add New Perfume</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by perfume name, brand, SKU (PERF-XXXXXX), or barcode..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Filter */}
        {uniqueBrands.length > 0 && (
          <div className="w-full md:w-44">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stock Status Pills */}
        <div className="flex rounded-xl bg-slate-100 p-1 space-x-1 text-xs font-bold">
          <button
            onClick={() => setStockFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              stockFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStockFilter('IN_STOCK')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              stockFilter === 'IN_STOCK' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setStockFilter('LOW_STOCK')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              stockFilter === 'LOW_STOCK' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Low Stock
          </button>
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No perfumes found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or click "Add New Perfume" to create a new fragrance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const isLow = p.stockOnHand <= p.reorderLevel;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Brand, Category & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {p.brand || 'House Brand'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 ml-1.5">
                        {p.category?.name || 'Perfume'}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isLow
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isLow ? `Low Stock (${p.stockOnHand})` : `${p.stockOnHand} In Stock`}
                    </span>
                  </div>

                  {/* Title & Scent Notes */}
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    {p.sizeVolume && <span className="font-medium text-slate-600">{p.sizeVolume}</span>}
                    {p.concentration && <span>&bull; {p.concentration}</span>}
                    {p.gender && <span>&bull; {p.gender}</span>}
                  </div>

                  {/* SKU & Barcode */}
                  <div className="mt-3 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400 font-mono text-[10px]">SKU:</span>
                      <span className="font-mono font-bold text-slate-800">{p.sku}</span>
                    </div>
                    {p.barcode && (
                      <span className="text-slate-400 font-mono text-[10px]">BC: {p.barcode}</span>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Price & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                      Selling Price
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {p.sellingPrice} <span className="text-xs font-bold text-amber-600">AED</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openLabelModal(p)}
                      title="Print Barcode / QR Sticker Label"
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      title="Edit Perfume"
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      title="Archive Perfume"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Perfume Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  {editingProduct ? 'Edit Perfume Specifications' : 'Add New Perfume Product'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Perfume Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Royal Amber Oud Eau de Parfum 100ml"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Brand / Perfume House *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Swiss Arabian, Ajmal, Lattafa"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size / Volume */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Size / Volume
                  </label>
                  <input
                    type="text"
                    value={formData.sizeVolume}
                    onChange={(e) => setFormData({ ...formData, sizeVolume: e.target.value })}
                    placeholder="e.g. 100ml, 50ml, 12ml Tola"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>

                {/* Concentration */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Concentration
                  </label>
                  <select
                    value={formData.concentration}
                    onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none"
                  >
                    <option value="Eau de Parfum (EDP)">Eau de Parfum (EDP)</option>
                    <option value="Extrait de Parfum">Extrait de Parfum (Highest)</option>
                    <option value="Eau de Toilette (EDT)">Eau de Toilette (EDT)</option>
                    <option value="Pure Attar / Oil">Pure Attar / Concentrated Oil</option>
                    <option value="Body Mist">Body Mist / Hair Mist</option>
                    <option value="Incense / Bakhoor">Incense / Bakhoor</option>
                  </select>
                </div>

                {/* Target Audience / Gender */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Target Audience / Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  >
                    <option value="Unisex">Unisex (Both)</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                  </select>
                </div>

                {/* Fragrance Name / Scent Profile */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Fragrance Profile / Notes
                  </label>
                  <input
                    type="text"
                    value={formData.fragranceName}
                    onChange={(e) => setFormData({ ...formData, fragranceName: e.target.value })}
                    placeholder="e.g. Amber Woody, Smoky Vanilla"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Selling Price (AED) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="280.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                {/* Base Cost */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Wholesale Purchase Cost (AED)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.baseCost}
                    onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })}
                    placeholder="140.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                {/* Stock on Hand (Initial Stock) */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    {editingProduct ? 'Current Stock Level' : 'Initial Opening Stock'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Minimum Reorder Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                {/* Barcode Number */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                    Barcode Number (Leave empty to auto-generate from SKU)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 629104000011"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20"
                >
                  {editingProduct ? 'Save Perfume Changes' : 'Create Perfume SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Barcode / QR Label Modal */}
      {labelModalOpen && selectedProductForLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Print Perfume Shelf / Bottle Label</h3>
              <button onClick={() => setLabelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Label Sticker Preview (50x30mm retail label format) */}
            <div
              id="printable-label"
              className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl text-center space-y-2 shadow-inner"
            >
              <p className="font-bold text-slate-900 text-xs truncate">{selectedProductForLabel.name}</p>
              <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-600">
                <span>{selectedProductForLabel.brand}</span>
                <span>&bull;</span>
                <span>{selectedProductForLabel.sizeVolume || '100ml'}</span>
              </div>

              {/* Barcode Mock Visual */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="flex items-center space-x-1 h-10">
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1.5 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-2 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-800 mt-1">
                  {selectedProductForLabel.sku}
                </span>
              </div>

              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs px-2">
                <span className="text-[10px] text-slate-400">Price (incl. VAT)</span>
                <span className="font-black text-slate-900 text-sm">
                  {selectedProductForLabel.sellingPrice} AED
                </span>
              </div>
            </div>

            {/* SKU Copy & Print Action */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => handleCopySku(selectedProductForLabel.sku)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                {copiedSku ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSku ? 'Copied!' : 'Copy SKU'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
