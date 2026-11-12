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
    try {
      const res = await api.get('/auth/me');
      if (res && res.success && res.data) {
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

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (res && res.success && res.data) {
        const loggedUser = res.data.user;
        setUser(loggedUser);

        if (typeof window !== 'undefined' && res.data.token) {
          window.localStorage.setItem('erp_token', res.data.token);
        }

        showToast(`Welcome back, ${loggedUser.name}!`, 'success');
        router.push(loggedUser.role === 'ADMIN' ? '/dashboard' : '/pos');
        return { success: true };
      } else {
        const errMsg = res?.message || 'Invalid email or password.';
        showToast(errMsg, 'error');
        return { success: false, message: errMsg };
      }
    } catch (err) {
      const errMsg = err?.message || 'Unable to connect to server. Please check your credentials.';
      showToast(errMsg, 'error');
      return { success: false, message: errMsg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('erp_token');
      window.localStorage.removeItem('erp_demo_user');
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
