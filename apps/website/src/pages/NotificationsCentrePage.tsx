import React, { useState } from 'react';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

interface NotificationItem {
  id: string;
  category: 'booking' | 'payment' | 'security' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function NotificationsCentrePage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'booking' | 'payment' | 'security'>('all');
  // The API does not yet expose a persisted customer notification feed.
  // Do not render fabricated booking/payment/security events as real notifications.
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.category === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              P
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">ParkEazy</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Reserve &amp; Arrive</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/account/profile')}
            className="text-xs font-semibold text-slate-600 hover:text-teal-800"
          >
            ← Back to Profile
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">pe_uw_07_06</span>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notification Centre
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Booking, payment, and account alerts will appear here when the server-backed notification feed is enabled.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-teal-800 hover:text-teal-900 self-start sm:self-auto bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {(['all', 'booking', 'payment', 'security'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 rounded-lg capitalize transition-colors ${
                filter === cat
                  ? 'bg-teal-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat === 'all' ? 'All Alerts' : cat}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {!filtered.length && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center" role="status">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-2xl" aria-hidden="true">🔔</div>
            <h2 className="text-base font-bold text-slate-900">No notifications to display</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">There are no server-backed notifications available for this account yet. This screen will not display sample events as if they were real.</p>
            <button type="button" onClick={() => onNavigate('/bookings')} className="mt-4 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-900">View My Bookings</button>
          </section>
        )}
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all ${
                item.read
                  ? 'bg-white border-slate-200 opacity-90'
                  : 'bg-teal-50/50 border-teal-200 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">
                    {item.category === 'booking' ? '🎫' : item.category === 'payment' ? '💳' : '🔒'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-sm text-slate-900">{item.title}</h2>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-teal-700 inline-block"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.body}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block font-medium">{item.timestamp}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  {item.actionUrl && (
                    <button
                      onClick={() => onNavigate(item.actionUrl!)}
                      className="px-3 py-1 bg-white border border-slate-300 text-teal-800 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleRead(item.id)}
                    className="text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    {item.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
