import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentReviewAuthorizationPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [agreedTerms, setAgreedTerms] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('/payment/methods')}
            className="text-xs font-semibold text-[#64748B] hover:text-[#101828]"
          >
            ← Change Payment Method
          </button>
          <span className="text-xs font-bold text-[#0F766E]">Bank-Grade Authorization</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-8 flex-1 flex flex-col gap-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
            payment_review_authorization_pe_uw_05_02
          </span>
          <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mt-1">
            Authorize Payment & Escrow Lock
          </h1>
          <p className="text-xs text-[#64748B]">Review charge authorization terms before dispatching to bank rail.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-xs text-[#64748B]">Method:</span>
              <div className="font-bold text-[#101828]">UPI Instant Pay (driver@okaxis)</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#64748B]">Payable Amount:</span>
              <div className="text-xl font-black text-[#0F766E]">₹128.00</div>
            </div>
          </div>

          <div className="space-y-2 text-[#475467]">
            <p><strong>Merchant:</strong> ParkEazy Infrastructure Pvt Ltd / Anna Nagar Plaza</p>
            <p><strong>Hold Validity:</strong> 15 minutes before unallocated release</p>
            <p><strong>Cancellation:</strong> 100% refundable prior to arrival start window</p>
          </div>

          <div className="pt-2 border-t border-[#F1F5F9] flex items-center gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
            <label htmlFor="terms" className="text-xs text-[#334155]">
              I authorize ParkEazy to reserve ₹128.00 on my selected payment method.
            </label>
          </div>
        </div>

        {/* Phase 2 Isolation Banner */}
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl text-xs text-[#92400E]">
          <strong>Phase 1 Integration Boundary:</strong> Production payment gateway APIs (Razorpay / Stripe) are scheduled for Phase 2. The simulation controls below allow testing of all approved states.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('/payment/processing')}
            className="py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs text-center"
          >
            Authorize Payment →
          </button>
          <button
            onClick={() => onNavigate('/payment/failed')}
            className="py-3 border border-[#FCA5A5] text-[#DC2626] rounded-xl text-xs font-semibold hover:bg-[#FEF2F2] text-center"
          >
            Test Bank Decline
          </button>
          <button
            onClick={() => onNavigate('/payment/cancelled')}
            className="py-3 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] text-center"
          >
            Cancel Flow
          </button>
        </div>
      </main>
    </div>
  );
}
