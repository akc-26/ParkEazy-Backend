import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PlatformCommissionFeeBreakdownPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Fees & Economics
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_03 • Platform Fee Schedule</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Platform Commission & Fee Structure
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/account')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Bank Payout Settings →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Tier Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">Active Host Tier</span>
              <h2 className="text-xl font-bold text-[#101828]">Commercial Hub Partner (Tier 1)</h2>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#0F766E]">85%</span>
              <span className="text-xs text-[#64748B] block">Host Net Take-Home</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[#64748B] block">Base Commission</span>
              <span className="text-lg font-black text-[#101828] mt-1">15.0%</span>
              <span className="text-[11px] text-[#64748B] block mt-1">Platform technology & app marketplace hosting</span>
            </div>
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[#64748B] block">GST on Commission</span>
              <span className="text-lg font-black text-[#101828] mt-1">18.0% GST</span>
              <span className="text-[11px] text-[#64748B] block mt-1">Statutory service tax passed with GSTIN credit</span>
            </div>
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[#64748B] block">Payment Gateway Fee</span>
              <span className="text-lg font-black text-[#101828] mt-1">0.0%</span>
              <span className="text-[11px] text-[#0F766E] font-bold block mt-1">100% Absorbed by Platform</span>
            </div>
          </div>
        </div>

        {/* Example Math breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs text-xs">
          <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider mb-4">
            Sample ₹100 Booking Settlement Model
          </h3>
          <div className="space-y-3 max-w-lg">
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#334155]">Customer Booking Charge:</span>
              <span className="font-bold text-[#101828]">₹100.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9] text-[#DC2626]">
              <span>Platform Service Commission (15%):</span>
              <span>-₹15.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9] text-[#DC2626]">
              <span>GST on Service Commission (18% of ₹15):</span>
              <span>-₹2.70</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-[#101828] font-bold text-sm text-[#0F766E]">
              <span>Net Host Bank Credit (T+1):</span>
              <span>₹82.30</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
