import React, { useState, useEffect, useRef } from 'react';
import {
  Car,
  Building2,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Layers,
  User as UserIcon
} from 'lucide-react';
import { User, NotificationItem } from '../types';
import { api } from '../api';

interface HeaderProps {
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  activeRole: 'host' | 'customer' | 'admin';
  setActiveRole: (role: 'host' | 'customer' | 'admin') => void;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUser,
  activeRole,
  setActiveRole,
  onRefreshData
}) => {
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDemoUsers();
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadDemoUsers = async () => {
    try {
      const users = await api.getDemoUsers();
      setDemoUsers(users);
    } catch (e) {
      console.error('Failed to load demo users', e);
    }
  };

  const loadNotifications = async () => {
    try {
      const items = await api.getNotifications();
      setNotifications(items);
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    loadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark & Main Nav */}
        <div className="flex items-center gap-8">
          <div
            onClick={() => setActiveRole('customer')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#087E8A] text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:bg-[#076D77] transition-colors">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-[#162A2D]">
              ParkEazy
            </span>
          </div>

          {/* Primary Navigation Options (Anti-slop clean typography with active indicators) */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium">
            <button
              onClick={() => setActiveRole('customer')}
              className={`transition-colors py-1.5 border-b-2 flex items-center gap-1.5 ${
                activeRole === 'customer'
                  ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                  : 'text-slate-600 border-transparent hover:text-[#087E8A]'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Customer Booking</span>
            </button>

            <button
              onClick={() => setActiveRole('host')}
              className={`transition-colors py-1.5 border-b-2 flex items-center gap-1.5 ${
                activeRole === 'host'
                  ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                  : 'text-slate-600 border-transparent hover:text-[#087E8A]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Host Portal</span>
            </button>

            <button
              onClick={() => setActiveRole('admin')}
              className={`transition-colors py-1.5 border-b-2 flex items-center gap-1.5 ${
                activeRole === 'admin'
                  ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                  : 'text-slate-600 border-transparent hover:text-[#087E8A]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Moderation</span>
            </button>
          </nav>
        </div>

        {/* Right Controls: Notifications, Test Account Switcher, User Avatar */}
        <div className="flex items-center gap-3">
          {/* Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute 1 top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs font-semibold">
                  <span className="text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[#087E8A] hover:underline text-[11px]"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl text-xs transition-colors ${
                          n.isRead ? 'bg-slate-50 text-slate-600' : 'bg-teal-50/60 text-slate-900 border-l-2 border-[#087E8A]'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Test Account Switcher Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-[#087E8A] text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser?.fullName.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                  {currentUser?.fullName}
                </div>
                <div className="text-[10px] text-slate-500 capitalize leading-none">
                  {currentUser?.role === 'host' ? 'Host Account' : currentUser?.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Switch Active Test Account
                </div>

                {demoUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      api.setUserId(user.id);
                      onSelectUser(user);
                      if (user.role === 'host') setActiveRole('host');
                      else if (user.role === 'admin') setActiveRole('admin');
                      else setActiveRole('customer');
                      setShowUserDropdown(false);
                      onRefreshData?.();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      currentUser?.id === user.id
                        ? 'bg-teal-50 text-[#075762] font-semibold border border-teal-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{user.fullName}</div>
                      <div className="text-[10px] text-slate-400">{user.email}</div>
                      {user.businessDetails && (
                        <div className="text-[9px] text-[#087E8A] mt-0.5">
                          {user.businessDetails.businessName}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {user.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Portal Navigation Bar */}
      <div className="flex md:hidden border-t border-slate-200 py-2 px-4 gap-2 justify-around text-xs bg-slate-50">
        <button
          onClick={() => setActiveRole('customer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
            activeRole === 'customer' ? 'bg-[#087E8A] text-white' : 'text-slate-600'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Customer</span>
        </button>
        <button
          onClick={() => setActiveRole('host')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
            activeRole === 'host' ? 'bg-[#087E8A] text-white' : 'text-slate-600'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Host Portal</span>
        </button>
        <button
          onClick={() => setActiveRole('admin')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
            activeRole === 'admin' ? 'bg-[#087E8A] text-white' : 'text-slate-600'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
};
