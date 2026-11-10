'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  Barcode,
  Camera,
  CameraOff,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  UserCheck,
  PauseCircle,
  PlayCircle,
  Printer,
  CheckCircle2,
  X,
  User,
  Percent,
  Receipt,
  Scan,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Share2,
} from 'lucide-react';

export default function PosPage() {
  const { showToast } = useToast();

  // Mobile View Tab: 'CATALOG' or 'CART'
  const [mobileTab, setMobileTab] = useState('CATALOG');

  // Search & Products Cache
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchResults, setSearchResults] = useState([]);
  const [productCatalog, setProductCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Manual SKU Input
  const [manualSkuInput, setManualSkuInput] = useState('');

  // Camera Barcode / QR Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' or 'user'
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastScannedTimeRef = useRef(0);

  // Cart State
  const [cart, setCart] = useState([]);
  const [customerType, setCustomerType] = useState('WALK_IN'); // 'WALK_IN', 'WEBSITE', 'REGISTERED'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', address: '' });

  // Discount State
  const [transactionDiscount, setTransactionDiscount] = useState({ type: 'FIXED', value: '' });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, WALLET, BANK_TRANSFER, CREDIT
  const [amountTendered, setAmountTendered] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Held Carts Modal
  const [heldCarts, setHeldCarts] = useState([]);
  const [heldModalOpen, setHeldModalOpen] = useState(false);

  // Completed Receipt Modal
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const barcodeInputRef = useRef(null);

  // Play audio beep on successful scan
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  };

  // Load Initial Catalog, Categories, and Customers
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingCatalog(true);
        const [prodRes, catRes, custRes] = await Promise.all([
          api.get('/products?limit=100&status=ACTIVE'),
          api.get('/categories'),
          api.get('/customers?limit=100&status=ACTIVE'),
        ]);

        if (prodRes.success && prodRes.data) {
          setProductCatalog(prodRes.data.items || []);
        }
        if (catRes.success && catRes.data) {
          setCategories(catRes.data || []);
        }
        if (custRes.success && custRes.data) {
          setCustomers(custRes.data.customers || []);
        }
      } catch (err) {
        console.error('Failed to load POS catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };

    initData();
  }, []);

  // Filtered Catalog by Category
  const filteredCatalog = useMemo(() => {
    if (selectedCategory === 'ALL') return productCatalog;
    return productCatalog.filter((p) => p.categoryId === selectedCategory);
  }, [productCatalog, selectedCategory]);

  // Fast Product Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchQuery.toLowerCase().trim();
    const localMatches = productCatalog.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.includes(term))
    );

    if (localMatches.length > 0) {
      setSearchResults(localMatches);
    } else {
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
          brand: product.brand || '',
          sizeVolume: product.sizeVolume || '',
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

  // Handle Manual SKU Entry
  const handleManualSkuSubmit = (e) => {
    e.preventDefault();
    if (!manualSkuInput.trim()) return;

    const term = manualSkuInput.trim().toUpperCase();
    const found = productCatalog.find(
      (p) => p.sku.toUpperCase() === term || (p.barcode && p.barcode.trim() === term)
    );

    if (found) {
      addToCart(found);
      playScanBeep();
      showToast(`Added ${found.name} (${found.sku})`, 'success');
      setManualSkuInput('');
    } else {
      showToast(`Unknown SKU / Product Code "${term}". Check product catalog.`, 'error');
    }
  };

  // Camera Scanner Management
  const startCamera = async () => {
    setCameraError('');
    setScannerOpen(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera streaming is not supported on this device/browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setCameraError(err.message || 'Camera permission denied or camera unavailable.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  };

  // Continuous Barcode Scanning Loop via BarcodeDetector API
  useEffect(() => {
    if (!scannerOpen) return;

    let animationFrameId;
    let detector = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'code_39'],
        });
      } catch (_) {}
    }

    const scanFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const now = Date.now();
        // Debounce: allow scan once every 1200ms
        if (now - lastScannedTimeRef.current > 1200 && detector) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const codeValue = barcodes[0].rawValue.trim();
              lastScannedTimeRef.current = now;

              // Find product by SKU or Barcode
              const match = productCatalog.find(
                (p) =>
                  p.sku.toUpperCase() === codeValue.toUpperCase() ||
                  (p.barcode && p.barcode === codeValue)
              );

              if (match) {
                playScanBeep();
                addToCart(match);
                showToast(`Scanned: ${match.name} (${match.sku})`, 'success');
              } else {
                showToast(`Scanned code "${codeValue}" not found in catalog`, 'info');
              }
            }
          } catch (_) {}
        }
      }
      animationFrameId = requestAnimationFrame(scanFrame);
    };

    animationFrameId = requestAnimationFrame(scanFrame);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [scannerOpen, productCatalog]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

  // Calculations Breakdown (Subtotal, Discounts, VAT 5%, Grand Total, Change)
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalUnits = 0;
    let itemDiscountsTotal = 0;

    cart.forEach((item) => {
      const lineRaw = item.sellingPrice * item.quantity;
      subtotal += lineRaw;
      totalUnits += item.quantity;
      itemDiscountsTotal += item.discount || 0;
    });

    const netBeforeTxDiscount = Math.max(0, subtotal - itemDiscountsTotal);
    let txDiscountAmount = 0;

    const discVal = parseFloat(transactionDiscount.value) || 0;
    if (transactionDiscount.type === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, discVal));
      txDiscountAmount = (netBeforeTxDiscount * pct) / 100;
    } else {
      txDiscountAmount = Math.min(netBeforeTxDiscount, Math.max(0, discVal));
    }

    const totalDiscount = itemDiscountsTotal + txDiscountAmount;
    const discountedTotal = Math.max(0, subtotal - totalDiscount);

    // UAE 5% VAT (Tax Inclusive Calculation: Total - Total / 1.05)
    const taxRate = 0.05;
    const estimatedTax = discountedTotal - discountedTotal / (1 + taxRate);
    const grandTotal = discountedTotal;

    const tenderedNum = parseFloat(amountTendered) || (paymentMethod === 'CASH' ? grandTotal : 0);
    const changeDue = paymentMethod === 'CASH' ? Math.max(0, tenderedNum - grandTotal) : 0;
    const outstandingBalance = paymentMethod === 'CREDIT' ? grandTotal : 0;

    return {
      totalUnits,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      estimatedTax: Math.round(estimatedTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      changeDue: Math.round(changeDue * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
    };
  }, [cart, transactionDiscount, amountTendered, paymentMethod]);

  // Hold Cart Functionality
  const handleHoldCart = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add perfumes to hold.', 'error');
      return;
    }

    try {
      const holdRef = `HOLD-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await api.post('/pos/held-carts', {
        cartName: `${holdRef} (${cart.length} items &bull; ${calculations.grandTotal} AED)`,
        customerId: customerType === 'REGISTERED' ? selectedCustomerId || null : null,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.sellingPrice,
          discount: i.discount,
          taxRate: i.taxRate,
        })),
      });

      if (res.success) {
        showToast(`Sale held as ${holdRef}! Inventory preserved.`, 'success');
        setCart([]);
        setSelectedCustomerId('');
        setTransactionDiscount({ type: 'FIXED', value: '' });
      }
    } catch (err) {
      showToast(err.message || 'Failed to hold sale', 'error');
    }
  };

  // Open Held Carts Modal
  const openHeldModal = async () => {
    try {
      const res = await api.get('/pos/held-carts');
      if (res.success && res.data) {
        setHeldCarts(res.data);
        setHeldModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to fetch held sales', 'error');
    }
  };

  // Resume Held Cart
  const resumeHeldCart = async (heldCart) => {
    const resumedItems = heldCart.items.map((i) => ({
      productId: i.productId,
      name: i.product?.name || 'Perfume Item',
      sku: i.product?.sku || 'PERF',
      brand: i.product?.brand || '',
      sizeVolume: i.product?.sizeVolume || '',
      sellingPrice: Number(i.unitPrice),
      quantity: Number(i.quantity),
      discount: Number(i.discount || 0),
      taxRate: Number(i.taxRate || 5.0),
    }));

    setCart(resumedItems);
    if (heldCart.customerId) {
      setCustomerType('REGISTERED');
      setSelectedCustomerId(heldCart.customerId);
    }
    setHeldModalOpen(false);

    try {
      await api.delete(`/pos/held-carts/${heldCart.id}`);
      showToast('Held cart restored to active POS terminal', 'info');
    } catch (_) {}
  };

  // Handle Quick Add New Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerData.name.trim()) return;

    try {
      const res = await api.post('/customers', newCustomerData);
      if (res.success && res.data) {
        showToast(`Customer "${newCustomerData.name}" created`, 'success');
        setCustomers((prev) => [res.data, ...prev]);
        setCustomerType('REGISTERED');
        setSelectedCustomerId(res.data.id);
        setNewCustomerModalOpen(false);
        setNewCustomerData({ name: '', phone: '', email: '', address: '' });
      }
    } catch (err) {
      showToast(err.message || 'Failed to create customer', 'error');
    }
  };

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cannot checkout an empty cart.', 'error');
      return;
    }

    if (paymentMethod === 'CREDIT' && (customerType !== 'REGISTERED' || !selectedCustomerId)) {
      showToast('Credit sale requires selecting a registered customer to record balance.', 'error');
      return;
    }

    if (paymentMethod === 'CASH' && amountTendered && parseFloat(amountTendered) < calculations.grandTotal) {
      showToast('Amount tendered is less than grand total due.', 'error');
      return;
    }

    try {
      setIsCheckingOut(true);
      const idempotencyKey = `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        customerId: customerType === 'REGISTERED' ? selectedCustomerId || null : null,
        customerType,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount || 0,
        })),
        transactionDiscount: {
          type: transactionDiscount.type,
          value: parseFloat(transactionDiscount.value) || 0,
        },
        payment: {
          method: paymentMethod,
          amountTendered: parseFloat(amountTendered) || calculations.grandTotal,
          reference: paymentReference || null,
        },
      };

      const res = await api.post('/pos/checkout', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      if (res.success && res.data) {
        playScanBeep();
        showToast(`Invoice ${res.data.sale.invoiceNumber} completed successfully!`, 'success');
        setCompletedReceipt(res.data.receipt);
        setReceiptModalOpen(true);

        // Reset POS Terminal
        setCart([]);
        setAmountTendered('');
        setPaymentReference('');
        setTransactionDiscount({ type: 'FIXED', value: '' });
      }
    } catch (err) {
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Mobile Tab Switcher (Visible only on mobile/tablet) */}
      <div className="flex lg:hidden bg-slate-200 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setMobileTab('CATALOG')}
          className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === 'CATALOG' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Catalog & Scan</span>
        </button>

        <button
          onClick={() => setMobileTab('CART')}
          className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
            mobileTab === 'CART' ? 'bg-slate-900 text-amber-400 shadow-sm' : 'text-slate-600'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Cart ({cart.length}) &bull; {calculations.grandTotal} AED</span>
        </button>
      </div>

      {/* Main 2-Column POS Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[calc(100vh-8rem)]">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: SCANNER, SEARCH, CATEGORIES, QUICK SELECT (7 or 8 Cols)     */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-7 xl:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4 ${
            mobileTab === 'CART' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Bar: Barcode Scanner Toggle & Manual SKU Quick Add */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
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
                placeholder="Scan barcode, SKU, or search perfume..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <div className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-40 max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 flex items-center justify-between text-xs group"
                    >
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-amber-700">{p.name}</p>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded font-bold text-slate-700">
                            {p.sku}
                          </span>
                          <span>{p.brand}</span>
                          <span>&bull;</span>
                          <span>{p.sizeVolume}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-amber-700 text-sm">{p.sellingPrice} AED</span>
                        <span className="block text-[10px] text-slate-400">Stock: {p.stockOnHand}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual SKU Form + Add Button */}
            <form onSubmit={handleManualSkuSubmit} className="flex space-x-1.5">
              <input
                type="text"
                value={manualSkuInput}
                onChange={(e) => setManualSkuInput(e.target.value)}
                placeholder="SKU (e.g. PERF-000001)"
                className="w-36 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs shadow-sm transition-colors"
              >
                Add
              </button>
            </form>

            {/* Camera Scanner Toggle Button */}
            <button
              onClick={() => (scannerOpen ? stopCamera() : startCamera())}
              className={`flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                scannerOpen
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {scannerOpen ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              <span>{scannerOpen ? 'Close Cam' : 'Scan Cam'}</span>
            </button>
          </div>

          {/* Camera Scanner Viewport Dropdown */}
          {scannerOpen && (
            <div className="relative bg-slate-950 rounded-2xl p-4 overflow-hidden border border-slate-800 shadow-xl flex flex-col items-center">
              <div className="relative w-full max-w-sm aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

                {/* Reticle Overlay */}
                <div className="absolute inset-0 border-2 border-amber-400/40 m-6 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-bounce"></div>
                </div>
              </div>

              {cameraError ? (
                <div className="mt-3 text-center text-xs text-red-400 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{cameraError} (Use manual SKU entry below)</span>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-400 font-medium">
                  Point camera at perfume barcode or QR code on bottle/box
                </p>
              )}
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex overflow-x-auto pb-1 space-x-1.5 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Perfumes
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === c.id
                    ? 'bg-slate-900 text-amber-400 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Quick Select Perfume Catalog Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredCatalog.map((product) => {
                const isLow = product.stockOnHand <= product.reorderLevel;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 rounded-2xl text-left transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-mono font-bold text-slate-500">{product.sku}</span>
                        <span className="font-semibold text-amber-700 bg-amber-100/60 px-1 py-0.2 rounded">
                          {product.brand || 'House'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2 group-hover:text-amber-700 leading-snug">
                        {product.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{product.sizeVolume}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="font-black text-xs text-slate-900">{product.sellingPrice} AED</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isLow ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {product.stockOnHand} left
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE CART, CUSTOMER, DISCOUNTS & CHECKOUT (4 or 5 Cols)   */}
        {/* ========================================================================= */}
        <div
          className={`lg:col-span-5 xl:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 ${
            mobileTab === 'CATALOG' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header & Cart Management Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-sm text-slate-900">
                Cart ({calculations.totalUnits} items)
              </h3>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleHoldCart}
                title="Hold Sale"
                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
              >
                <PauseCircle className="w-4 h-4" />
              </button>
              <button
                onClick={openHeldModal}
                title="Recall Held Sales"
                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCart([])}
                title="Clear Cart"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer Selection Section (Walk-in, Website, Registered, +Add) */}
          <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Customer Type</span>
              </span>

              <button
                type="button"
                onClick={() => setNewCustomerModalOpen(true)}
                className="text-amber-700 hover:text-amber-800 font-bold flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'WALK_IN', label: 'Walk-in' },
                { id: 'WEBSITE', label: 'Website' },
                { id: 'REGISTERED', label: 'Registered' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCustomerType(t.id)}
                  className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                    customerType === t.id
                      ? 'bg-slate-900 text-amber-400 shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {customerType === 'REGISTERED' && (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full mt-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
              >
                <option value="">Select Registered Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} &bull; {c.phone || c.email} {c.balance > 0 ? `(Debt: ${c.balance} AED)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-56 min-h-[140px] pr-0.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
                <ShoppingCart className="w-8 h-8 text-slate-300 mb-2" />
                <span>Cart is empty</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Scan SKU or click catalog perfume</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex-1 truncate pr-2">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono font-semibold">{item.sku}</span>
                      <span>&bull;</span>
                      <span>{item.sellingPrice} AED</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Stepper */}
                    <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="p-1 text-slate-500 hover:text-slate-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <span className="font-black text-slate-900 w-16 text-right">
                      {item.sellingPrice * item.quantity} AED
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount & Calculations Breakdown */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
            {/* Discount Control */}
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 text-[11px]">Cart Discount:</span>
              <div className="flex items-center space-x-1">
                <select
                  value={transactionDiscount.type}
                  onChange={(e) => setTransactionDiscount({ ...transactionDiscount, type: e.target.value })}
                  className="text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-bold"
                >
                  <option value="FIXED">AED</option>
                  <option value="PERCENTAGE">%</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={transactionDiscount.value}
                  onChange={(e) => setTransactionDiscount({ ...transactionDiscount, value: e.target.value })}
                  placeholder="0"
                  className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-right font-bold text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800">{calculations.subtotal} AED</span>
            </div>

            {calculations.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 text-[11px] font-bold">
                <span>Discount Applied:</span>
                <span>-{calculations.totalDiscount} AED</span>
              </div>
            )}

            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>VAT Included (5%):</span>
              <span>{calculations.estimatedTax} AED</span>
            </div>

            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
              <span className="font-bold text-slate-900 text-sm">Grand Total:</span>
              <span className="font-black text-slate-950 text-xl tracking-tight">
                {calculations.grandTotal} <span className="text-xs text-amber-600">AED</span>
              </span>
            </div>

            {/* Payment Method Selector (All 5 UAE Standard Methods) */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'WALLET', label: 'Wallet', icon: Smartphone },
                { id: 'BANK_TRANSFER', label: 'Bank', icon: Landmark },
                { id: 'CREDIT', label: 'Credit', icon: UserCheck },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = paymentMethod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaymentMethod(p.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-bold transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 mb-1" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Tendered & Change Due */}
            {paymentMethod === 'CASH' && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 font-bold">Cash Received:</span>
                  <input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder={calculations.grandTotal.toString()}
                    className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right font-bold text-xs"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-800 pt-1 border-t border-slate-200/60">
                  <span>Change Due:</span>
                  <span className="text-emerald-700 font-black">{calculations.changeDue} AED</span>
                </div>
              </div>
            )}

            {/* Reference Input for Card, Wallet, Bank Transfer */}
            {['CARD', 'WALLET', 'BANK_TRANSFER'].includes(paymentMethod) && (
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Auth Code / Transaction Reference..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              />
            )}

            {/* Credit Note Warning */}
            {paymentMethod === 'CREDIT' && (
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-semibold">
                Will record {calculations.grandTotal} AED as an outstanding receivable against selected customer.
              </div>
            )}

            {/* Complete Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || cart.length === 0}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
            >
              {isCheckingOut ? (
                <span>Processing Transaction...</span>
              ) : (
                <>
                  <Receipt className="w-4 h-4 text-slate-950" />
                  <span>Complete Sale &bull; {calculations.grandTotal} AED</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Held Carts Modal */}
      {heldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Recall Suspended / Held Sales</h3>
              <button onClick={() => setHeldModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {heldCarts.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No held sales found</p>
              ) : (
                heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{h.cartName}</p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                        {h.items?.length || 0} line items
                      </span>
                    </div>

                    <button
                      onClick={() => resumeHeldCart(h)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs"
                    >
                      Restore to POS
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Quick Modal */}
      {newCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Register New Customer</h3>
              <button onClick={() => setNewCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  placeholder="e.g. Fatima Al-Zahra"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  placeholder="+971 50 000 0000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  placeholder="customer@email.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Delivery / Residence Address
                </label>
                <input
                  type="text"
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  placeholder="Dubai, UAE"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewCustomerModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Printable Receipt Modal (80mm Thermal & A4 Format) */}
      {receiptModalOpen && completedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Sale Receipt Ready</h3>
              </div>
              <button onClick={() => setReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div id="printable-receipt" className="text-slate-900 text-xs font-mono space-y-3 bg-white p-2">
              <div className="text-center space-y-1">
                <h2 className="font-black text-sm uppercase tracking-tight">{completedReceipt.businessName}</h2>
                <p className="text-[10px] text-slate-600">{completedReceipt.address}</p>
                <p className="text-[10px] text-slate-600">Phone: {completedReceipt.phone}</p>
                {completedReceipt.taxNumber && (
                  <p className="text-[10px] text-slate-800 font-bold">TRN: {completedReceipt.taxNumber}</p>
                )}
                <div className="border-t border-b border-dashed border-slate-300 py-1 my-1">
                  <span className="font-bold text-xs">TAX INVOICE #{completedReceipt.invoiceNumber}</span>
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Date: {new Date(completedReceipt.date).toLocaleString()}</span>
                <span>Cashier: {completedReceipt.cashier}</span>
              </div>
              {completedReceipt.customer && (
                <div className="text-[10px] text-slate-700">
                  <span>Customer: {completedReceipt.customer}</span>
                </div>
              )}

              {/* Items Table */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5">
                {completedReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div className="truncate pr-2">
                      <p className="font-bold truncate">{item.productName}</p>
                      <span className="text-[9px] text-slate-500">
                        {item.quantity} x {item.unitPrice} AED
                      </span>
                    </div>
                    <span className="font-bold">{item.subtotal} AED</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
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
                <div className="flex justify-between text-slate-600">
                  <span>VAT (5% Included):</span>
                  <span>{completedReceipt.taxTotal} AED</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                  <span>TOTAL PAID:</span>
                  <span>{completedReceipt.grandTotal} AED</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                  <span>Payment Method:</span>
                  <span className="font-bold">{completedReceipt.paymentMethod}</span>
                </div>
                {completedReceipt.changeDue > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-700">
                    <span>Change Due:</span>
                    <span>{completedReceipt.changeDue} AED</span>
                  </div>
                )}
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-3 border-t border-dashed border-slate-300 space-y-1">
                <p className="font-bold text-[10px]">{completedReceipt.header}</p>
                <p className="text-[9px] text-slate-500">{completedReceipt.footer}</p>
              </div>
            </div>

            {/* Print & Share Actions */}
            <div className="flex items-center space-x-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs"
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
