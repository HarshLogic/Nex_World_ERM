'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  LayoutDashboard,
  ScanLine,
  Package,
  ArrowLeftRight,
  History,
  Users,
  Truck,
  FileSpreadsheet,
  Receipt,
  UserCog,
  Settings,
  Activity,
  Info,
  Menu,
  Bell,
  LogOut,
  ChevronRight,
  Check,
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications?limit=5');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  // Nav items configuration with role restrictions
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: true },
    { label: 'QR Sales / POS', href: '/pos', icon: ScanLine, adminOnly: false },
    { label: 'Products', href: '/products', icon: Package, adminOnly: false },
    { label: 'Stock In / Out', href: '/inventory', icon: ArrowLeftRight, adminOnly: false },
    { label: 'Sales History', href: '/sales', icon: History, adminOnly: false },
    { label: 'Customers', href: '/customers', icon: Users, adminOnly: false },
    { label: 'Suppliers', href: '/suppliers', icon: Truck, adminOnly: true },
    { label: 'Purchase Orders', href: '/purchases', icon: FileSpreadsheet, adminOnly: true },
    { label: 'Expenses', href: '/expenses', icon: Receipt, adminOnly: true },
    { label: 'Users', href: '/users', icon: UserCog, adminOnly: true },
    { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
    { label: 'Activity Logs', href: '/activity-logs', icon: Activity, adminOnly: true },
    { label: 'About App', href: '/about', icon: Info, adminOnly: false },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  // Get current breadcrumb label
  const currentItem = navItems.find((item) => pathname.startsWith(item.href)) || { label: 'Overview' };

  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-30 fixed inset-y-0 left-0 shadow-xl`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link href={isAdmin ? '/dashboard' : '/pos'} className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-md">
              RM
            </div>
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-white text-sm tracking-wide">Records Manager</span>
                <span className="text-xs text-slate-400">ERP + POS Retail</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-bold uppercase ${
                      isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {user?.role}
                  </span>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm no-print">
          {/* Left: Sidebar Toggle & Breadcrumbs */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
              <span>ERP</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900 font-semibold">{currentItem.label}</span>
            </div>
          </div>

          {/* Right: Notifications & User profile */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No recent notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-xs ${n.isRead ? 'bg-white' : 'bg-primary-50/50'}`}>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-600 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Pill */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <span className="text-xs font-medium text-slate-700 hidden sm:inline">{user?.name}</span>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                  isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

