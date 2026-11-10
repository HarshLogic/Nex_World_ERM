'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, ShoppingBag, Zap } from 'lucide-react';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg mb-3">
            RM
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Records Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise ERP + POS System</p>
        </div>

        {/* Quick Demo One-Click Access Banner */}
        <div className="bg-primary-50/70 p-4 rounded-xl border border-primary-200 mb-6">
          <div className="flex items-center justify-center space-x-1.5 text-primary-700 font-bold text-xs uppercase tracking-wider mb-2.5">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Instant One-Click Demo Login</span>
          </div>
          <p className="text-[11px] text-slate-600 text-center mb-3">
            Click either button below to enter the live system immediately without requiring a database setup.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => demoLogin('ADMIN')}
              className="flex items-center justify-center space-x-2 py-3 px-3 bg-white border border-amber-300 hover:border-amber-500 rounded-xl text-xs font-bold text-slate-800 hover:text-amber-700 shadow-sm hover:shadow transition-all group"
            >
              <ShieldCheck className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Login as Admin</span>
            </button>
            <button
              type="button"
              onClick={() => demoLogin('USER')}
              className="flex items-center justify-center space-x-2 py-3 px-3 bg-white border border-blue-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-800 hover:text-blue-700 shadow-sm hover:shadow transition-all group"
            >
              <ShoppingBag className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <span>Login as Cashier</span>
            </button>
          </div>
        </div>

        {/* Traditional Credentials Form */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-semibold uppercase">Or Sign In with Email</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@recordsmanager.ae"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-6">
          Encrypted 256-bit Session &bull; Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
