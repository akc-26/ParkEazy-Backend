import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PayoutScheduleUpcomingSettlementsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [schedule] = useState([
    {
      id: 'sch-01',
      date: 'Tomorrow, 16-Oct-2026',
      amountInr: 3820,
      window: 'Morning Batch (10:00 AM IST)',
      status: 'PROCESSING',
      account: 'HDFC Bank •• 7123',
    },
    {
      id: 'sch-02',
      date: 'Friday, 17-Oct-2026',
      amountInr: 4510,
      window: 'Afternoon Batch (03:00 PM IST)',
      status: 'SCHEDULED',
      account: 'HDFC Bank •• 7123',
    },
    {
      id: 'sch-03',
      date: 'Monday, 20-Oct-2026',
      amountInr: 9240,
      window: 'Weekend Consolidated Batch',
      status: 'PROJECTED',
      account: 'HDFC Bank •• 7123',
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Payout Schedule
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_05 • Automated Liquidity Calendar</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Payout Schedule & Upcoming Settlements
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/history')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Payout History (UTR) →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Settlement Cadence</span>
            <h2 className="text-lg font-bold text-[#101828] mt-0.5">Automated Daily T+1 Dispatch</h2>
            <p className="text-xs text-[#64748B] mt-1">Earnings accrued between 00:00 - 23:59 are settled into verified bank account by 10:00 AM next business day.</p>
          </div>
          <span className="text-xs font-bold bg-[#E6F7F4] text-[#0F766E] px-3 py-1.5 rounded-xl">T+1 AUTOMATION</span>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Upcoming Bank Dispatches ({schedule.length})
            </h3>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {schedule.map((s) => (
              <div key={s.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#101828]">{s.date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      s.status === 'PROCESSING'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : s.status === 'SCHEDULED'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                          : 'bg-[#F1F5F9] text-[#475467]'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    {s.window} • Target: <span className="font-semibold text-[#334155]">{s.account}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-[#0F766E]">₹{s.amountInr.toLocaleString()}</div>
                  <span className="text-[10px] text-[#64748B]">Net estimated credit</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
