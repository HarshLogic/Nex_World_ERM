'use client';

import React from 'react';
import { Info, ShieldCheck, Database, Server, Layers, Cpu } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg flex-shrink-0">
          RM
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Records Manager ERP + POS + Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Retail Management System &bull; Version 1.0.0 Production Release
          </p>
        </div>
      </div>

      {/* Architecture Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-primary-600 font-bold text-sm">
            <Server className="w-5 h-5" />
            <span>Stateless Multi-Instance API Layer</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Horizontal scalability powered by an Nginx reverse proxy distributing traffic across Express instances
            using the <code className="bg-slate-100 px-1 py-0.5 rounded text-primary-700">least_conn</code> load-balancing algorithm.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm">
            <Database className="w-5 h-5" />
            <span>Immutable Ledger-Based Inventory</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Stock balances are strictly derived from the algebraic sum of signed ledger movements
            (<span className="font-mono font-semibold">&sum; signedQuantity</span>). Zero direct mutations of static counters.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-purple-600 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>ACID Concurrency Safeguards</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Atomic invoice numbering (<code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">INV-00001</code>) and
            SKU generation (<code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">SKU-00001</code>) using database row-level locking.
            POSIX Idempotency-Key headers prevent double billing.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-amber-600 font-bold text-sm">
            <Layers className="w-5 h-5" />
            <span>Historical Financial Snapshots</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Product base costs and gross profit margins are snapshotted at the exact time of checkout. Subsequent vendor
            price fluctuations never compromise historical accounting reports.
          </p>
        </div>
      </div>

      {/* Technology Specifications */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Technology Stack Specification</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block text-[10px]">Frontend</span>
            <span className="font-bold text-slate-800">Next.js 15 (App Router)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block text-[10px]">Styling & UI</span>
            <span className="font-bold text-slate-800">Tailwind CSS + Lucide Icons</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block text-[10px]">Backend Server</span>
            <span className="font-bold text-slate-800">Node.js + Express REST API</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block text-[10px]">Database</span>
            <span className="font-bold text-slate-800">PostgreSQL + Prisma ORM</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block text-[10px]">Load Balancer</span>
            <span className="font-bold text-slate-800">Nginx Reverse Proxy</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 font-medium block text-[10px]">Caching & Queues</span>
            <span className="font-bold text-slate-800">Redis 7 + BullMQ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

