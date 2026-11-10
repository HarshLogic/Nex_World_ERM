'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  PauseCircle,
  PlayCircle,
  Printer,
  CheckCircle2,
  X,
  User,
  Percent,
  Receipt,
  Scan,
} from 'lucide-react';

export default function PosPage() {
  const { showToast } = useToast();

  // Search & Products Cache
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [transactionDiscount, setTransactionDiscount] = useState({ type: 'FIXED', value: 0 });

  // Payment & Checkout State
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Held Carts Modal
  const [heldCarts, setHeldCarts] = useState([]);
  const [heldModalOpen, setHeldModalOpen] = useState(false);

  // Completed Receipt Modal
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const barcodeInputRef = useRef(null);

  // Load Initial Product Catalog & Customers for Fast Client Lookup
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingCatalog(true);
        const [prodRes, custRes] = await Promise.all([
          api.get('/products?limit=50&status=ACTIVE'),
          api.get('/customers?limit=50&status=ACTIVE'),
        ]);

        if (prodRes.success && prodRes.data) {
          setProductCatalog(prodRes.data.items || []);
        }
        if (custRes.success && custRes.data) {
          setCustomers(custRes.data.customers || []);
        }
      } catch (err) {
        console.error('Failed to pre-cache POS catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };

    initData();
  }, []);

  // Fast Product Search: First searches client cache, falls back to backend
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchQuery.toLowerCase().trim();
    // 1. Client-side memory cache filter
    const localMatches = productCatalog.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.includes(term))
    );

    if (localMatches.length > 0) {
      setSearchResults(localMatches);
    } else {
      // 2. Server lookup fallback
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/pos/lookup?q=${encodeURIComponent(term)}`);
          if (res.success && res.data) {
            setSearchResults(res.data);
          }
        } catch (_) {}
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, productCatalog]);

  // Add Item to Cart
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          sellingPrice: Number(product.sellingPrice),
          quantity: 1,
          discount: 0,
          taxRate: Number(product.taxRate || 5.0),
          stockOnHand: product.stockOnHand,
        },
      ];
    });
    setSearchQuery('');
    setSearchResults([]);
    barcodeInputRef.current?.focus();
  };

  // Modify Quantity
  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Remove Item
  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Item Level Discount Update
  const updateItemDiscount = (productId, disc) => {
    const val = Math.max(0, parseFloat(disc) || 0);
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, discount: val } : item))
    );
  };

  // Cart Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let itemDiscountsTotal = 0;

    cart.forEach((item) => {
      const lineRaw = item.sellingPrice * item.quantity;
      subtotal += lineRaw;
      itemDiscountsTotal += item.discount;
    });

    const netBeforeTxDiscount = Math.max(0, subtotal - itemDiscountsTotal);
    let txDiscountAmount = 0;

    if (transactionDiscount.type === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, parseFloat(transactionDiscount.value) || 0));
      txDiscountAmount = (netBeforeTxDiscount * pct) / 100;
    } else {
      txDiscountAmount = Math.min(netBeforeTxDiscount, Math.max(0, parseFloat(transactionDiscount.value) || 0));
    }

    const totalDiscount = itemDiscountsTotal + txDiscountAmount;
    const discountedTotal = Math.max(0, subtotal - totalDiscount);

    // Default 5% inclusive tax preview
    const taxRate = 0.05;
    const estimatedTax = discountedTotal - discountedTotal / (1 + taxRate);
    const grandTotal = discountedTotal;

    const tenderedNum = parseFloat(amountTendered) || grandTotal;
    const changeDue = paymentMethod === 'CASH' ? Math.max(0, tenderedNum - grandTotal) : 0;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      estimatedTax: Math.round(estimatedTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      changeDue: Math.round(changeDue * 100) / 100,
    };
  }, [cart, transactionDiscount, amountTendered, paymentMethod]);

  // Hold Cart Functionality
  const handleHoldCart = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add products to hold.', 'error');
      return;
    }

    try {
      const res = await api.post('/pos/held-carts', {
        cartName: `Hold #${Date.now().toString().slice(-4)} (${cart.length} items)`,
        customerId: selectedCustomerId || null,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.sellingPrice,
          discount: i.discount,
          taxRate: i.taxRate,
        })),
      });

      if (res.success) {
        showToast('Cart held successfully in database', 'success');
        setCart([]);
        setSelectedCustomerId('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to hold cart', 'error');
    }
  };

  // Fetch Held Carts
  const openHeldModal = async () => {
    try {
      const res = await api.get('/pos/held-carts');
      if (res.success && res.data) {
        setHeldCarts(res.data);
        setHeldModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to fetch held carts', 'error');
    }
  };

  // Resume Held Cart
  const resumeHeldCart = async (heldCart) => {
    const resumedItems = heldCart.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      sku: i.product.sku,
      sellingPrice: Number(i.unitPrice),
      quantity: Number(i.quantity),
      discount: Number(i.discount),
      taxRate: Number(i.taxRate),
    }));

    setCart(resumedItems);
    setSelectedCustomerId(heldCart.customerId || '');
    setHeldModalOpen(false);

    // Delete resumed cart from database
    try {
      await api.delete(`/pos/held-carts/${heldCart.id}`);
      showToast('Held cart restored to active terminal', 'info');
    } catch (_) {}
  };

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cannot checkout an empty cart.', 'error');
      return;
    }

    if (paymentMethod === 'CASH' && amountTendered && parseFloat(amountTendered) < calculations.grandTotal) {
      showToast('Amount tendered is less than total amount due.', 'error');
      return;
    }

    try {
      setIsCheckingOut(true);

      // Generate UUID v4 idempotency key to prevent double checkout on retries
      const idempotencyKey = 'pos-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();

      const payload = {
        customerId: selectedCustomerId || null,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        transactionDiscount,
        payment: {
          method: paymentMethod,
          amountTendered: parseFloat(amountTendered) || calculations.grandTotal,
        },
      };

      const res = await api.post('/pos/checkout', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (res.success && res.data) {
        showToast(`Checkout successful! Invoice ${res.data.sale.invoiceNumber} created.`, 'success');
        setCompletedReceipt(res.data.receipt);
        setReceiptModalOpen(true);
        // Clear terminal
        setCart([]);
        setAmountTendered('');
        setTransactionDiscount({ type: 'FIXED', value: 0 });
      }
    } catch (err) {
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6">
      {/* Left Column: Product Search & Quick Catalog Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
        {/* Search Bar with Barcode Scanner Icon */}
        <div className="relative mb-4">
          <Barcode className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            ref={barcodeInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults.length > 0) {
                addToCart(searchResults[0]);
              }
            }}
            placeholder="Scan barcode, enter SKU or search product name..."
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 max-h-72 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-xs text-slate-900">{product.name}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{product.sku}</span>
                      {product.barcode && <span>Barcode: {product.barcode}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs text-primary-700">{product.sellingPrice} AED</p>
                    <span
                      className={`text-[10px] font-semibold ${
                        product.stockOnHand <= product.reorderLevel ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    >
                      Stock: {product.stockOnHand ?? '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Catalog Grid View */}
        <div className="flex-1 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Catalog Fast Select
          </p>
          {loadingCatalog ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productCatalog.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 bg-slate-50 hover:bg-primary-50/50 border border-slate-200 hover:border-primary-400 rounded-xl text-left transition-all flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">
                      {product.sku}
                    </span>
                    <h4 className="font-semibold text-xs text-slate-800 line-clamp-2 group-hover:text-primary-700">
                      {product.name}
                    </h4>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-xs text-primary-700">{product.sellingPrice} AED</span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        product.stockOnHand <= product.reorderLevel
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {product.stockOnHand} left
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Cart, Discounts, Tender & Checkout */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
        {/* Cart Header with Customer & Hold Actions */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-sm text-slate-900">Current Cart ({cart.length})</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleHoldCart}
              title="Hold Cart"
              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
            <button
              onClick={openHeldModal}
              title="Recall Held Carts"
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCart([])}
              title="Clear Cart"
              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer Selector */}
        <div className="py-2 border-b border-slate-100">
          <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="">Walk-in Customer (Default)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(Balance: ${c.balance} AED)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <ShoppingCart className="w-8 h-8 text-slate-300 mb-2" />
              <span>Cart is empty</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Scan an item or pick from catalog</span>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex-1 truncate pr-2">
                  <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                  <span className="text-[10px] text-slate-500">{item.sellingPrice} AED each</span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 text-slate-500 hover:text-slate-800 focus:outline-none"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 text-slate-500 hover:text-slate-800 focus:outline-none"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <span className="font-bold text-slate-900 w-16 text-right">
                    {Math.round((item.sellingPrice * item.quantity - item.discount) * 100) / 100} AED
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-red-600 focus:outline-none"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculations & Discounts Summary */}
        <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
          {/* Cart Discount Control */}
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-slate-600 font-medium">Cart Discount:</span>
            <div className="flex items-center space-x-1">
              <select
                value={transactionDiscount.type}
                onChange={(e) => setTransactionDiscount({ ...transactionDiscount, type: e.target.value })}
                className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5"
              >
                <option value="FIXED">AED</option>
                <option value="PERCENTAGE">%</option>
              </select>
              <input
                type="number"
                min="0"
                value={transactionDiscount.value || ''}
                onChange={(e) => setTransactionDiscount({ ...transactionDiscount, value: e.target.value })}
                placeholder="0"
                className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-medium"
              />
            </div>
          </div>

          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">{calculations.subtotal} AED</span>
          </div>
          {calculations.totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discounts Applied:</span>
              <span>-{calculations.totalDiscount} AED</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>VAT Included (5%):</span>
            <span>{calculations.estimatedTax} AED</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
            <span>Grand Total:</span>
            <span className="text-primary-700">{calculations.grandTotal} AED</span>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5 pt-2">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'CARD', label: 'Card', icon: CreditCard },
              { id: 'CREDIT', label: 'Credit', icon: User },
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = paymentMethod === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPaymentMethod(p.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary-50 border-primary-600 text-primary-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cash Tendered & Change Due */}
          {paymentMethod === 'CASH' && (
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-medium">Amount Tendered:</span>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder={calculations.grandTotal.toString()}
                  className="w-24 bg-white border border-slate-200 rounded px-2 py-0.5 text-right font-bold text-xs"
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-700 pt-1 border-t border-slate-200/60">
                <span>Change Due:</span>
                <span className="text-emerald-700">{calculations.changeDue} AED</span>
              </div>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut || cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {isCheckingOut ? (
              <span>Processing Transaction...</span>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Complete Checkout &bull; {calculations.grandTotal} AED</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Held Carts Modal */}
      {heldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Held POS Carts</h3>
              <button onClick={() => setHeldModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-2 max-h-80 overflow-y-auto">
              {heldCarts.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No held carts stored in database.</p>
              ) : (
                heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-900">{h.cartName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {h.items.length} items &bull; {new Date(h.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => resumeHeldCart(h)}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Resume
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt Modal */}
      {receiptModalOpen && completedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-1.5 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Transaction Complete</span>
              </div>
              <button onClick={() => setReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Visual Preview (80mm) */}
            <div className="printable-receipt font-mono text-xs text-slate-900 p-4 border border-dashed border-slate-300 rounded-lg my-4 bg-slate-50/50">
              <div className="text-center pb-2 border-b border-slate-300">
                <h2 className="font-extrabold text-sm uppercase">{completedReceipt.businessName}</h2>
                <p className="text-[10px] text-slate-500">{completedReceipt.address}</p>
                <p className="text-[10px] text-slate-500">Tel: {completedReceipt.phone}</p>
              </div>

              <div className="py-2 border-b border-slate-300 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Invoice:</span>
                  <span className="font-bold">{completedReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{new Date(completedReceipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{completedReceipt.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{completedReceipt.customer}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-slate-300 space-y-1">
                {completedReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="truncate pr-2">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="font-bold flex-shrink-0">{item.subtotal} AED</span>
                  </div>
                ))}
              </div>

              {/* Financial Totals */}
              <div className="py-2 border-b border-slate-300 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{completedReceipt.subtotal} AED</span>
                </div>
                {completedReceipt.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-{completedReceipt.totalDiscount} AED</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>VAT (5%):</span>
                  <span>{completedReceipt.taxTotal} AED</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                  <span>Total:</span>
                  <span>{completedReceipt.grandTotal} AED</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1">
                  <span>Method ({completedReceipt.paymentMethod}):</span>
                  <span>{completedReceipt.amountTendered} AED</span>
                </div>
                {completedReceipt.paymentMethod === 'CASH' && (
                  <div className="flex justify-between text-[10px]">
                    <span>Change Due:</span>
                    <span>{completedReceipt.changeDue} AED</span>
                  </div>
                )}
              </div>

              {/* Footer Notice */}
              <div className="text-center pt-2 text-[9px] text-slate-500">
                <p>{completedReceipt.header}</p>
                <p className="mt-0.5">{completedReceipt.footer}</p>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

