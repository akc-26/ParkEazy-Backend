import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentCancelledPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-['Inter'] px-4 py-8">
      <div className="bg-white p-8 rounded-2xl border border-[#CBD5E1] shadow-sm max-w-lg w-full text-center flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] bg-[#F1F5F9] px-2.5 py-0.5 rounded-full mb-4">
          payment_cancelled_pe_uw_05_07
        </span>

        <div className="w-16 h-16 rounded-full bg-[#94A3B8] text-white flex items-center justify-center text-3xl font-black mb-4 shadow-sm">
          ↩
        </div>

        <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
          Payment Cancelled by User
        </h1>
        <p className="text-xs text-[#64748B] mt-1 mb-6">
          The payment session was abandoned before completion. No funds have been debited from your card or account.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => onNavigate('/payment/methods')}
            className="flex-1 py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-sm transition-all text-center"
          >
            Restart Checkout →
          </button>
          <button
            onClick={() => onNavigate('/')}
            className="flex-1 py-3 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] text-center"
          >
            Return to Marketplace Home
          </button>
        </div>
      </div>
    </div>
  );
}
