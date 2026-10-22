import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function FinancialExceptionsReconciliationStatesPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [alerts] = useState([
    {
      id: 'rec-01',
      title: 'Settlement Account Status: Clear',
      description: 'All pending payment gateway tranches successfully matched with bank deposits. Zero negative balances or unrecovered chargebacks.',
      type: 'HEALTHY',
    },
    {
      id: 'rec-02',
      title: 'GSTIN Quarterly Reconciliation',
      description: 'ITC credit ledger reconciled against government e-invoicing portal for GSTR-1 filings.',
      type: 'INFO',
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Financial Exceptions
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_09 • Bank Reconciliation Health</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Financial Exception States & Reconciliation
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Workspace Settings →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="text-sm font-bold text-[#065F46]">Clean Reconciliation Audit</h2>
              <p className="text-xs text-[#047857]">All gateway collections match bank deposits 1:1. No pending disbursement holds or regulatory locks.</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-[#10B981] text-white px-3 py-1 rounded-full">AUDITED</span>
        </div>

        <div className="space-y-4">
          {alerts.map((a) => (
            <div key={a.id} className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
              <h3 className="text-sm font-bold text-[#101828] mb-1">{a.title}</h3>
              <p className="text-xs text-[#475467]">{a.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
