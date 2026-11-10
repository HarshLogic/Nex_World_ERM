'use client';

import React from 'react';
import { Info, ShieldCheck, Database, Server, Layers, Cpu, Sparkles, Scan, Coins, Truck, Headphones, Store, Printer, QrCode } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 flex-shrink-0">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Royal Oud Perfume ERP & POS
            </h1>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-300">
              Perfume Edition v2.0
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enterprise Fragrance Retail & Wholesale Management System &bull; Production Release
          </p>
        </div>
      </div>

      {/* Architecture Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-amber-600 font-bold text-sm">
            <Scan className="w-5 h-5" />
            <span>QR & Barcode Camera POS Terminal</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fast counter checkout with HTML5 video barcode detection, manual SKU fallback, item-level discounts,
            held carts, and 80mm thermal receipt printing.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm">
            <Database className="w-5 h-5" />
            <span>Immutable Stock Movement Ledger</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Authoritative inventory tracking derived from signed movements (<span className="font-mono font-semibold">&sum; signedQuantity</span>).
            Protects against stock drift, counter testers, and physical audit discrepancies.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-purple-600 font-bold text-sm">
            <Coins className="w-5 h-5" />
            <span>UAE Tax & Multi-Tender Compliance</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automated 5% VAT calculation (inclusive and exclusive modes), 15-digit TRN registration,
            and support for Cash, Card, Mobile Wallets, Bank Wire, and Customer Credit.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-sm">
            <Truck className="w-5 h-5" />
            <span>Landed Cost Procurement</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Purchase order workflows with proportional freight and customs duties allocation across lines,
            ensuring exact historical unit costing and accurate gross margin tracking.
          </p>
        </div>
      </div>

      {/* Hardware & Peripheral Compatibility */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
          Hardware & Peripheral Compatibility
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <Printer className="w-4 h-4 text-amber-600" />
              <span>Thermal Receipt Printers</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Standard 80mm and 58mm ESC/POS USB, Ethernet, and Bluetooth printers.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Barcode & QR Scanners</span>
            </div>
            <p className="text-[11px] text-slate-500">
              1D/2D handheld USB scanners, wireless Bluetooth wands, and mobile cameras.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <Store className="w-4 h-4 text-blue-600" />
              <span>Cash Drawers</span>
            </div>
            <p className="text-[11px] text-slate-500">
              RJ11/RJ12 drawer kick integration triggered automatically upon cash receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
