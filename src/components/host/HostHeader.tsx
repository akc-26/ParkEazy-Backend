import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Bell,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { User, Facility, NotificationItem } from '../../types';
import { api } from '../../api';

interface HostHeaderProps {
  currentUser: User;
  facilities: Facility[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string) => void;
  onLogout: () => void;
  onNavigateToCustomer: () => void;
}

export const HostHeader: React.FC<HostHeaderProps> = ({
  currentUser,
  facilities,
  selectedFacilityId,
  onSelectFacility,
  onLogout,
  onNavigateToCustomer
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark with Host Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#087E8A] text-white flex items-center justify-center font-bold text-base shadow-xs">
              P
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-[#162A2D]">
                ParkEazy
              </span>
              <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#075762] text-[10px] font-bold uppercase tracking-wider">
                Host Portal
              </span>
            </div>
          </div>

          {/* Quick Facility Selector (if multiple) */}
          {facilities.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedFacilityId || ''}
                onChange={(e) => onSelectFacility(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent border-0 focus:ring-0 cursor-pointer pr-6 truncate max-w-xs"
              >
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.city})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Controls: Customer View Link, Notifications, Host Profile & Explicit Logout */}
        <div className="flex items-center gap-3">
          {/* Link to public customer experience */}
          <button
            type="button"
            onClick={onNavigateToCustomer}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Notifications Drawer */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Host notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#087E8A]" />
                    <span>Host Activity & Alerts</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-[#087E8A] hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 py-2">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`py-2.5 px-2 rounded-lg transition-colors ${
                          !n.isRead ? 'bg-teal-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-800">{n.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Host Profile Info */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#087E8A]">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {currentUser.businessDetails?.businessName || 'Host Account'}
              </div>
            </div>

            {/* Clear Real Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Log out of Host Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
