import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentFailedPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-['Inter'] px-4 py-8">
      <div className="bg-white p-8 rounded-2xl border border-[#FCA5A5] shadow-sm max-w-lg w-full text-center flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626] bg-[#FEE2E2] px-2.5 py-0.5 rounded-full mb-4">
          payment_failed_pe_uw_05_05
        </span>

        <div className="w-16 h-16 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-3xl font-black mb-4 shadow-sm">
          ✕
        </div>

        <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
          Payment Authorization Declined
        </h1>
        <p className="text-xs text-[#64748B] mt-1 mb-6">
          Your issuing bank was unable to complete the transaction (Decline Code: <span className="font-mono font-bold text-[#DC2626]">U30_LIMIT_OR_TIMEOUT</span>).
        </p>

        <div className="bg-[#FEF2F2] p-4 rounded-xl border border-[#FCA5A5] w-full text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-[#991B1B] font-semibold">Account Charge:</span>
            <span className="font-bold text-[#991B1B]">No money deducted</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#991B1B] font-semibold">Bay Reservation:</span>
            <span className="font-bold text-[#991B1B]">Temporarily held for 04:30 mins</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => onNavigate('/payment/methods')}
            className="flex-1 py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-sm transition-all text-center"
          >
            Retry with Different Method →
          </button>
          <button
            onClick={() => onNavigate('/payment/recovery')}
            className="flex-1 py-3 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] text-center"
          >
            Debit Recovery Status
          </button>
        </div>
      </div>
    </div>
  );
}
