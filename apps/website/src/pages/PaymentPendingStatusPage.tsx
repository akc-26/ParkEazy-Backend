import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentPendingStatusPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [checking, setChecking] = useState(false);

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      onNavigate('/payment/success');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-['Inter'] px-4 py-8">
      <div className="bg-white p-8 rounded-2xl border border-[#FDE68A] shadow-sm max-w-lg w-full text-center flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full mb-4">
          payment_pending_status_check_pe_uw_05_06
        </span>

        <div className="w-16 h-16 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-3xl font-black mb-4 shadow-sm">
          ⏳
        </div>

        <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
          Awaiting Bank Settlement Confirmation
        </h1>
        <p className="text-xs text-[#64748B] mt-1 mb-6">
          Your issuing bank is reconciling the transaction. We are actively polling for the digital receipt.
        </p>

        <div className="bg-[#FFFBEB] p-4 rounded-xl border border-[#FDE68A] w-full text-left text-xs space-y-1 mb-6">
          <div className="flex justify-between text-[#92400E]">
            <span>Bank Status:</span>
            <span className="font-bold">PENDING_CONFIRMATION</span>
          </div>
          <div className="flex justify-between text-[#92400E]">
            <span>Expected Window:</span>
            <span>Within 60 seconds</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="flex-1 py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-sm transition-all text-center"
          >
            {checking ? 'Checking NPCI Rail...' : 'Refresh Bank Status 🔄'}
          </button>
          <button
            onClick={() => onNavigate('/payment/recovery')}
            className="flex-1 py-3 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] text-center"
          >
            Late Debit Recovery
          </button>
        </div>
      </div>
    </div>
  );
}
