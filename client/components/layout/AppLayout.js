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
  X,
  Bell,
  LogOut,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();

  // Desktop sidebar collapse state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  // Mobile drawer open state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

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
    { label: 'Perfumes & Products', href: '/products', icon: Package, adminOnly: false },
    { label: 'Stock In / Out', href: '/inventory', icon: ArrowLeftRight, adminOnly: false },
    { label: 'Sales History', href: '/sales', icon: History, adminOnly: false },
    { label: 'Customers', href: '/customers', icon: Users, adminOnly: false },
    { label: 'Suppliers', href: '/suppliers', icon: Truck, adminOnly: true },
    { label: 'Purchase Orders', href: '/purchases', icon: FileSpreadsheet, adminOnly: true },
    { label: 'Expenses', href: '/expenses', icon: Receipt, adminOnly: true },
    { label: 'Employees & Users', href: '/users', icon: UserCog, adminOnly: true },
    { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
    { label: 'Activity Logs', href: '/activity-logs', icon: Activity, adminOnly: true },
    { label: 'About App', href: '/about', icon: Info, adminOnly: false },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);
  const currentItem = navItems.find((item) => pathname.startsWith(item.href)) || { label: 'Overview' };

  if (!user && pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-800">
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar (Desktop Persistent + Mobile Slide-over Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shadow-2xl
          ${mobileDrawerOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${desktopCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40">
          <Link
            href={isAdmin ? '/dashboard' : '/pos'}
            className="flex items-center space-x-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl flex-shrink-0 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {(!desktopCollapsed || mobileDrawerOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-white text-sm tracking-tight flex items-center space-x-1.5">
                  <span>Royal Oud</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold border border-amber-500/30">
                    ERP
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 truncate">Perfume POS & Inventory</span>
              </div>
            )}
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const isCollapsed = desktopCollapsed && !mobileDrawerOpen;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              {(!desktopCollapsed || mobileDrawerOpen) && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider ${
                      isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {user?.role}
                  </span>
                </div>
              )}
            </div>
            {(!desktopCollapsed || mobileDrawerOpen) && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Layout Area - Automatically takes full width on mobile/tablet */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          desktopCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        } ml-0`}
      >
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm no-print">
          {/* Left: Mobile Drawer Toggle & Desktop Sidebar Toggle & Breadcrumbs */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors lg:hidden focus:outline-none"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors hidden lg:block focus:outline-none"
              aria-label="Toggle sidebar width"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Display */}
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-slate-500 font-medium truncate">
              <span className="hidden sm:inline">Perfume ERP</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <span className="text-slate-900 font-bold truncate">{currentItem.label}</span>
            </div>
          </div>

          {/* Right: Notifications & Quick Role Status */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Alerts & Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No unread notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-xs ${n.isRead ? 'bg-white' : 'bg-amber-50/40'}`}>
                          <p className="font-semibold text-slate-900">{n.title}</p>
                          <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">{n.message}</p>
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

            {/* Quick User Badge */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-3 sm:pl-4">
              <span className="text-xs font-semibold text-slate-800 hidden md:inline">{user?.name}</span>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                  isAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900'
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport - Uses full width with responsive padding */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
