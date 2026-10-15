import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PayoutAccountSettlementSettingsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [accountNumber, setAccountNumber] = useState('50100293847123');
  const [ifscCode, setIfscCode] = useState('HDFC0000128');
  const [beneficiaryName, setBeneficiaryName] = useState('Anna Nagar Plaza Commercial Ventures LLP');
  const [payoutMethod, setPayoutMethod] = useState<'NEFT_RTGS' | 'UPI_VPA'>('NEFT_RTGS');
  const [upiVpa, setUpiVpa] = useState('annanagarplaza@okhdfcbank');
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess('Bank settlement credentials updated successfully. Penny-drop verification queued.');
    setTimeout(() => setSavedSuccess(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Payout Settings
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_04 • Banking & Settlement Node</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Bank Account & Payout Settings
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/schedule')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Payout Schedule →
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {savedSuccess && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {savedSuccess}</span>
            <button onClick={() => setSavedSuccess(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {/* Verification Status Banner */}
        <div className="bg-white p-5 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-sm">
              ✓
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#065F46]">Direct Bank Settlement Verified</h2>
              <span className="text-xs text-[#047857]">NPCI Penny Drop passed on 12-Oct-2026 • Account active for automatic T+1 credits</span>
            </div>
          </div>
          <span className="text-xs font-bold bg-[#10B981] text-white px-3 py-1 rounded-full">ACTIVE</span>
        </div>

        {/* Bank Form */}
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">Disbursement Rail</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayoutMethod('NEFT_RTGS')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  payoutMethod === 'NEFT_RTGS'
                    ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E]'
                    : 'border-[#CBD5E1] text-[#64748B]'
                }`}
              >
                🏦 Direct Bank Account (NEFT/IMPS)
              </button>
              <button
                type="button"
                onClick={() => setPayoutMethod('UPI_VPA')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  payoutMethod === 'UPI_VPA'
                    ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E]'
                    : 'border-[#CBD5E1] text-[#64748B]'
                }`}
              >
                ⚡ UPI Virtual Payment Address (VPA)
              </button>
            </div>
          </div>

          {payoutMethod === 'NEFT_RTGS' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Beneficiary Legal Name</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] font-mono font-bold"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">UPI VPA Handle</label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="username@bank"
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] font-mono"
              />
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] transition-all shadow-xs"
            >
              Save Settlement Settings
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
