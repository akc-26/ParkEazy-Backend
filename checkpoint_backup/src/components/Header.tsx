import React, { useState, useEffect } from 'react';
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
  Layers
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

  useEffect(() => {
    loadDemoUsers();
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

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
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveRole('host')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-xl tracking-tight">
                P
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-lg tracking-tight">
                  <span>ParkEazy</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    Host Engine
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Intelligent Parking Operations</div>
              </div>
            </div>

            {/* Portal Switcher Navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveRole('host')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeRole === 'host'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Host Portal</span>
              </button>

              <button
                onClick={() => setActiveRole('customer')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeRole === 'customer'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Customer Booking</span>
              </button>

              <button
                onClick={() => setActiveRole('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeRole === 'admin'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Moderation</span>
              </button>
            </nav>
          </div>

          {/* Right Controls: Notifications, Role Quick Switcher, User Avatar */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs font-semibold">
                    <span className="text-slate-200">System Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-sky-400 hover:underline text-[11px]"
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
                          className={`p-2.5 rounded-lg text-xs transition-colors ${
                            n.isRead ? 'bg-slate-700/30 text-slate-300' : 'bg-slate-700 text-white border-l-2 border-sky-400'
                          }`}
                        >
                          <div className="font-medium text-slate-200 flex items-center justify-between">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Account Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white text-xs">
                  {currentUser?.fullName.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-medium text-slate-200 leading-tight">
                    {currentUser?.fullName}
                  </div>
                  <div className="text-[10px] text-sky-400 capitalize">
                    {currentUser?.role === 'host' ? 'Host Account' : currentUser?.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700 mb-1">
                    Switch Test Account
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
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                        currentUser?.id === user.id ? 'bg-sky-500/20 text-sky-300 font-medium' : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <div>
                        <div className="text-white font-medium">{user.fullName}</div>
                        <div className="text-[11px] text-slate-400">{user.email}</div>
                        {user.businessDetails && (
                          <div className="text-[10px] text-sky-400 mt-0.5">
                            {user.businessDetails.businessName}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 capitalize font-medium text-slate-300">
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
        <div className="flex md:hidden border-t border-slate-800 py-2 gap-1 justify-around text-xs">
          <button
            onClick={() => setActiveRole('host')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              activeRole === 'host' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Host</span>
          </button>
          <button
            onClick={() => setActiveRole('customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              activeRole === 'customer' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>
          <button
            onClick={() => setActiveRole('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              activeRole === 'admin' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
