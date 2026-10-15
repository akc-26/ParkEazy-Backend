import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function NotificationCentreActivityAlertsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [notifications] = useState([
    {
      id: 'notif-01',
      title: 'New Booking Confirmed (Bay A-02)',
      time: '10 mins ago',
      desc: 'Driver Arun Kumar booked Bay A-02 for today, 2:00 PM – 4:00 PM. Vehicle: TN-09-CB-4821.',
      category: 'BOOKING',
      unread: true,
    },
    {
      id: 'notif-02',
      title: 'Overstay Threshold Exceeded',
      time: '35 mins ago',
      desc: 'Vehicle TN-03-ZZ-1234 has been parked 25 minutes past reservation limit at Bay A-04.',
      category: 'ALERT',
      unread: true,
    },
    {
      id: 'notif-03',
      title: 'Settlement Payout Dispatched',
      time: '2 hours ago',
      desc: 'Daily earnings of ₹4,120.00 credited to HDFC Bank A/C ending 7123. UTR: HDFCR5202610140029481.',
      category: 'FINANCE',
      unread: false,
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-11 • Messages & Alerts
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_06 • Host Notification Inbox</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Notification Centre & Operational Alerts
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/channels')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Delivery Channels →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Recent Alerts & Push Events
            </h2>
            <span className="text-xs text-[#0F766E] font-semibold bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
              2 Unread
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {notifications.map((n) => (
              <div key={n.id} className={`p-5 flex items-start justify-between gap-4 hover:bg-[#F8FAFC] ${n.unread ? 'bg-[#F0FDFA]/40' : ''}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-[#101828]">{n.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      n.category === 'ALERT'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : n.category === 'FINANCE'
                          ? 'bg-[#E6F7F4] text-[#0F766E]'
                          : 'bg-[#EFF6FF] text-[#1D4ED8]'
                    }`}>
                      {n.category}
                    </span>
                    {n.unread && <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span>}
                  </div>
                  <p className="text-xs text-[#334155]">{n.desc}</p>
                </div>
                <span className="text-[11px] text-[#64748B] shrink-0 font-medium">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
