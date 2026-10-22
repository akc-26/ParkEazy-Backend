import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentProcessingPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (seconds > 0) {
      const t = setTimeout(() => setSeconds(seconds - 1), 1000);
      return () => clearTimeout(t);
    } else {
      onNavigate('/payment/pending');
    }
  }, [seconds, onNavigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-['Inter'] px-4">
      <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm max-w-md w-full text-center flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full mb-6">
          payment_processing_pe_uw_05_03
        </span>

        {/* Processing Spinner */}
        <div className="w-16 h-16 rounded-full border-4 border-[#E2E8F0] border-t-[#0F766E] animate-spin mb-6"></div>

        <h1 className="text-xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
          Contacting Issuing Bank...
        </h1>
        <p className="text-xs text-[#64748B] mt-2 mb-4">
          Please do not refresh the page or press the back button while your 256-bit payment authorization is being secured.
        </p>

        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] w-full text-xs text-[#334155] font-mono">
          Gateway Polling Status: In Transit ({seconds}s)
        </div>

        <div className="flex gap-2 w-full mt-6">
          <button
            onClick={() => onNavigate('/payment/pending')}
            className="flex-1 py-2 bg-[#F1F5F9] text-[#334155] rounded-lg text-xs font-semibold hover:bg-[#E2E8F0]"
          >
            Check Pending Status
          </button>
          <button
            onClick={() => onNavigate('/payment/cancelled')}
            className="py-2 px-3 border border-[#CBD5E1] text-[#64748B] rounded-lg text-xs hover:text-[#DC2626]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
