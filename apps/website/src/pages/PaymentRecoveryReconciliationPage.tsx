import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentRecoveryReconciliationPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [refNumber, setRefNumber] = useState('');
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupMsg('Transaction found. Amount was held by issuing bank and auto-refunded within 24-48 business hours.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('/payment/methods')}
            className="text-xs font-semibold text-[#64748B] hover:text-[#101828]"
          >
            ← Back to Payment
          </button>
          <span className="text-xs font-bold text-[#0F766E]">Automated Dispute Desk</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-8 flex-1 flex flex-col gap-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
            payment_recovery_reconciliation_states_pe_uw_05_08
          </span>
          <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mt-1">
            Payment Recovery & Late Debit Reconciliation
          </h1>
          <p className="text-xs text-[#64748B]">
            If money was debited from your account but the booking was not confirmed, our banking webhook automatically reconciles the transaction.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
            Lookup Debited Transaction
          </h2>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">
                Bank UTR / UPI Reference Number / Card Auth Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 428901827491"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
            >
              Verify Settlement Status 🔍
            </button>
          </form>

          {lookupMsg && (
            <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-[#065F46] font-medium mt-4">
              ✓ {lookupMsg}
            </div>
          )}
        </div>

        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] text-xs space-y-2 text-[#475467]">
          <h3 className="font-bold text-[#101828]">NPCI Banking Guarantee</h3>
          <p>Under Reserve Bank of India (RBI) circular on failed electronic transactions, unconfirmed debits are reversed automatically within T+1 working days without requiring manual tickets.</p>
        </div>
      </main>
    </div>
  );
}
