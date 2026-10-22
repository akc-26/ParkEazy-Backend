import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentSuccessfulPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-['Inter'] px-4 py-8">
      <div className="bg-white p-8 rounded-2xl border border-[#A7F3D0] shadow-sm max-w-lg w-full text-center flex flex-col items-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full mb-4">
          payment_successful_pe_uw_05_04
        </span>

        <div className="w-16 h-16 rounded-full bg-[#10B981] text-white flex items-center justify-center text-3xl font-black mb-4 shadow-sm">
          ✓
        </div>

        <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
          Payment Authorized & Escrow Secured
        </h1>
        <p className="text-xs text-[#64748B] mt-1 mb-6">
          Your payment of ₹128.00 has been verified. Your reserved bay is locked.
        </p>

        {/* Receipt Box */}
        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] w-full text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-[#64748B]">Transaction ID:</span>
            <span className="font-mono font-bold text-[#101828]">TXN-948210385</span>
          </div>
          <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-[#64748B]">Bank Reference (RRN):</span>
            <span className="font-mono font-bold text-[#101828]">RRN-84920491</span>
          </div>
          <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-[#64748B]">Amount Paid:</span>
            <span className="font-bold text-[#0F766E]">₹128.00 (Inclusive of GST)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">Assigned Space:</span>
            <span className="font-bold text-[#101828]">Anna Nagar Plaza • Bay A-01</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => onNavigate('/book/confirmed')}
            className="flex-1 py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-sm transition-all text-center"
          >
            View Gate Entry Pass →
          </button>
          <button
            onClick={() => onNavigate('/bookings')}
            className="flex-1 py-3 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] text-center"
          >
            My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
