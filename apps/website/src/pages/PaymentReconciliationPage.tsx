import React, { useState } from 'react';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PaymentReconciliationPage({
  currentUser,
  onNavigate,
}: Props) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'dispute'>('matrix');
  const [ticketCategory, setTicketCategory] = useState('payment_debit_without_confirmation');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError('Payment dispute submission is not connected to a server-side support workflow. No ticket was created. Please use the published support channel once it is configured.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              P
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">ParkEazy</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Seamless Arrival</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            <span>🛡️ Payment reconciliation unavailable</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('/checkout/payment')}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-800 font-medium transition-colors"
          >
            ← Back to Payment
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'matrix' ? 'bg-teal-800 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              Reconciliation States
            </button>
            <button
              onClick={() => setActiveTab('dispute')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'dispute' ? 'bg-teal-800 text-white' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              File Settlement Dispute
            </button>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_05_08</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payment Recovery &amp; Reconciliation Reference Matrix
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Reference guidance only. Provider status polling and dispute-ticket submission are not connected in this release.
          </p>
        </div>

        {activeTab === 'matrix' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* State 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  STATE 01
                </span>
                <span className="text-xs text-slate-500">Client-Side Validation</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Submission Validation Error</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Occurs when the customer submits an invalid VPA address, expired card timestamp, or unmatched phone number. No payment attempt is sent to the banking network.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono">
                Recovery: Instant form field highlight without refreshing hold state.
              </div>
            </div>

            {/* State 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                  STATE 02
                </span>
                <span className="text-xs text-slate-500">Network Layer</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Gateway Handshake Timeout</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                This scenario describes a provider timeout. The current release does not initiate a live payment or poll a provider status.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono">
                Recovery: Verify transaction status with the configured provider before retrying.
              </div>
            </div>

            {/* State 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  STATE 03
                </span>
                <span className="text-xs text-slate-500">Provider integration pending</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Expected provider-webhook handling</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                This is an expected integration scenario. Provider webhooks are not connected in the current release, so duplicate delivery and ledger idempotency have not been verified.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono">
                Recovery: Verify idempotency and ledger behavior when provider integration is implemented.
              </div>
            </div>

            {/* State 4 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                  STATE 04
                </span>
                <span className="text-xs text-slate-500">Reconciliation Exception</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">Account Debit Ambiguity</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                This reference scenario describes a possible debit/booking mismatch. A support ticket must be created through a configured server-side workflow; this release does not create one.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 font-mono">
                Recovery: confirm transaction status with the bank and configured payment provider.
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Submit Payment Dispute or Inquiry</h2>
            {ticketError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{ticketError}</div>}
            <form onSubmit={handleSubmitDispute} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Issue Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="payment_debit_without_confirmation">Bank Debited but Booking not Confirmed</option>
                    <option value="duplicate_charge">Duplicate Charge on Card/UPI</option>
                    <option value="cancelled_refund_pending">Cancellation Refund Delayed</option>
                    <option value="overstay_penalty_dispute">Dispute Overstay Fee Penalty</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Details &amp; Bank UTR / Reference</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter 12-digit bank UTR, date/time, and summary of the issue..."
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-sm transition-all"
                >
                  Submit Reconciliation Request
                </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
