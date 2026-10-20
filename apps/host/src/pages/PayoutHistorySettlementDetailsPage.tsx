import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PayoutHistorySettlementDetailsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [payouts] = useState([
    {
      id: 'pay-901',
      utr: 'HDFCR5202610140029481',
      date: '14-Oct-2026, 10:14 AM',
      amountInr: 4120.0,
      bank: 'HDFC Bank •• 7123',
      sessionCount: 22,
      status: 'PROCESSED',
    },
    {
      id: 'pay-900',
      utr: 'HDFCR5202610130081729',
      date: '13-Oct-2026, 09:58 AM',
      amountInr: 3650.0,
      bank: 'HDFC Bank •• 7123',
      sessionCount: 19,
      status: 'PROCESSED',
    },
    {
      id: 'pay-899',
      utr: 'HDFCR5202610120044102',
      date: '12-Oct-2026, 10:05 AM',
      amountInr: 5490.0,
      bank: 'HDFC Bank •• 7123',
      sessionCount: 31,
      status: 'PROCESSED',
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Payout History
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_06 • Banking UTR Audit & Receipts</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Payout History & Settlement Details
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/disputes')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Disputes & Adjustments →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Settled Bank Transfers ({payouts.length})
            </h2>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {payouts.map((p) => (
              <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#101828] font-mono">UTR: {p.utr}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#065F46]">
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    Disbursed on {p.date} to <span className="font-semibold text-[#334155]">{p.bank}</span> • Consolidated from {p.sessionCount} parking sessions
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-[#0F766E]">₹{p.amountInr.toLocaleString()}</div>
                  <button className="text-[11px] text-[#0F766E] font-bold hover:underline mt-0.5 block">
                    Download Tax Receipt 🧾
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
