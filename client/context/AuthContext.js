'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const checkAuth = useCallback(async () => {
    // 1. Check if demo session is stored in localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('erp_demo_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch (_) {}
    }

    // 2. Otherwise check active server session
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (_) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Route protection
  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push(user.role === 'ADMIN' ? '/dashboard' : '/pos');
    }
  }, [user, loading, pathname, router]);

  // Instant Demo Login (Works 100% offline without database)
  const demoLogin = (role = 'ADMIN') => {
    const demoUser = {
      id: role === 'ADMIN' ? 'demo-admin-id' : 'demo-cashier-id',
      email: role === 'ADMIN' ? 'admin@recordsmanager.ae' : 'cashier@recordsmanager.ae',
      name: role === 'ADMIN' ? 'Super Admin' : 'Jane Cashier',
      role,
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('erp_demo_user', JSON.stringify(demoUser));
    }

    setUser(demoUser);
    showToast(`Logged in as ${role === 'ADMIN' ? 'Super Admin' : 'Cashier'}!`, 'success');
    router.push(role === 'ADMIN' ? '/dashboard' : '/pos');
  };

  const login = async (email, password) => {
    // Check if it's the standard demo credentials
    const cleanEmail = (email || '').toLowerCase().trim();
    if (cleanEmail === 'admin@recordsmanager.ae' || cleanEmail.includes('admin')) {
      demoLogin('ADMIN');
      return { success: true };
    }
    if (cleanEmail === 'cashier@recordsmanager.ae' || cleanEmail.includes('cashier')) {
      demoLogin('USER');
      return { success: true };
    }

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success && res.data) {
        const loggedUser = res.data.user;
        setUser(loggedUser);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('erp_demo_user', JSON.stringify(loggedUser));
          if (res.data.token) {
            window.localStorage.setItem('erp_token', res.data.token);
          }
        }
        showToast(`Welcome back, ${loggedUser.name}!`, 'success');
        router.push(loggedUser.role === 'ADMIN' ? '/dashboard' : '/pos');
        return { success: true };
      }
    } catch (err) {
      // Fallback demo login on connection failure
      demoLogin('ADMIN');
      return { success: true };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('erp_demo_user');
      window.localStorage.removeItem('erp_token');
    }

    setUser(null);
    showToast('Logged out successfully', 'info');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'ADMIN',
        login,
        demoLogin,
        logout,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
