import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function RefundsAdjustmentsDisputedTransactionsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [disputes] = useState([
    {
      id: 'dsp-01',
      bookingId: '9847120a',
      reason: 'Driver cancellation > 2 hours prior to start window',
      deductionAmountInr: 120.0,
      hostLiabilityInr: 0.0,
      status: 'RESOLVED_POLICY',
      date: '11-Oct-2026',
    },
    {
      id: 'dsp-02',
      bookingId: '331892ff',
      reason: 'Gate barrier mechanical delay — 10 min hold applied',
      deductionAmountInr: 25.0,
      hostLiabilityInr: 25.0,
      status: 'SETTLED_COURTESY',
      date: '09-Oct-2026',
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Adjustments & Refunds
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_07 • Financial Reconciliation Ledger</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Refunds, Adjustments & Disputed Transactions
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/export')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Export Centre →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Recorded Deductions & Customer Refunds ({disputes.length})
            </h2>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {disputes.map((d) => (
              <div key={d.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#101828] font-mono">Case #{d.id}</span>
                    <span className="text-xs text-[#64748B] font-mono">Booking #{d.bookingId}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475467]">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#334155] mt-1">{d.reason}</p>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">{d.date}</span>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-[#DC2626]">
                    -₹{d.hostLiabilityInr.toFixed(2)} Host Net
                  </div>
                  <span className="text-[10px] text-[#64748B]">Total Refund: ₹{d.deductionAmountInr.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
