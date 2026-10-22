import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MailOpen,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostNotificationsViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostNotificationsView: React.FC<HostNotificationsViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await apiClient.getHostNotifications(hostId);
      setNotifications(data);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not load notifications' });
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(hostId, id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead(hostId);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setFeedback({ type: 'success', message: 'All notifications marked as read.' });
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter((n) => (filter === 'UNREAD' ? !n.is_read : true));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] font-sans">
      <header className="h-16 bg-[#12211C] border-b border-[#1e342d] px-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">Host Studio</span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">Notification Center</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/host')}>
            Back to Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <HostSubNav activeSection="notifications" onNavigate={onNavigate} />

      <main className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-emerald-600" />
              Notifications &amp; Activity Inbox
              {unreadCount > 0 && (
                <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Operational updates, booking notices, extension alerts, and settlement confirmations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                <MailOpen className="w-3.5 h-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={loadNotifications} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'ALL' ? 'bg-[#12211C] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'UNREAD' ? 'bg-[#12211C] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-8 text-center bg-white border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-50" />
            <h3 className="font-bold text-sm text-slate-800">Inbox is Clear</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No notifications to display in this view.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                  !n.is_read
                    ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-200'
                    : 'bg-white border-slate-200 opacity-80'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    n.notification_type === 'EXTENSION_REQUEST'
                      ? 'bg-amber-100 text-amber-700'
                      : n.notification_type === 'PAYOUT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {n.notification_type === 'EXTENSION_REQUEST' ? (
                    <Clock className="w-4 h-4" />
                  ) : n.notification_type === 'PAYOUT' ? (
                    <DollarSign className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {n.created_at_utc ? new Date(n.created_at_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                  {n.link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(n.link);
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-2"
                    >
                      View Details <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {!n.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
