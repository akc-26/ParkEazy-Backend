import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Landmark,
  Zap,
  ShieldCheck,
  X
} from 'lucide-react';
import { User, LedgerEntry, PayoutRequest } from '../../types';
import { api } from '../../api';

interface HostEarningsProps {
  currentUser: User;
}

export const HostEarnings: React.FC<HostEarningsProps> = ({ currentUser }) => {
  const [financials, setFinancials] = useState<{
    availableBalance: number;
    pendingPayouts: number;
    lifetimeEarnings: number;
    lifetimePayouts: number;
    lifetimeRefunds: number;
  }>({
    availableBalance: 0,
    pendingPayouts: 0,
    lifetimeEarnings: 0,
    lifetimePayouts: 0,
    lifetimeRefunds: 0
  });

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Payout Form
  const [payoutAmount, setPayoutAmount] = useState<string>('50.00');
  const [payoutMethod, setPayoutMethod] = useState<'stripe_instant' | 'ach_bank_transfer'>('stripe_instant');
  const [destinationAccount, setDestinationAccount] = useState('Silicon Valley Bank (****8492)');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fin, ledg, pos] = await Promise.all([
        api.getEarningsSummary(currentUser.id),
        api.getLedger(currentUser.id),
        api.getPayouts(currentUser.id)
      ]);
      setFinancials(fin);
      setLedger(ledg);
      setPayouts(pos);
    } catch (err) {
      console.error('Failed to load financials', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid payout amount');
      return;
    }
    if (amountNum > financials.availableBalance) {
      alert(`Amount exceeds your available balance ($${financials.availableBalance.toFixed(2)})`);
      return;
    }

    try {
      setPayoutSubmitting(true);
      const res = await api.requestPayout(amountNum, payoutMethod, destinationAccount);
      setPayoutSuccess(`Payout ${res.referenceNumber} requested successfully for $${res.amount.toFixed(2)}.`);
      setShowPayoutModal(false);
      await loadData();
      setTimeout(() => setPayoutSuccess(null), 5000);
    } catch (err: any) {
      alert('Payout request failed: ' + err.message);
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleReconcilePayout = async (payoutId: string) => {
    try {
      const res = await api.reconcilePayout(payoutId);
      if (res.reconciled) {
        setPayoutSuccess(`Reconciliation complete: ${res.message}`);
      } else {
        alert(res.message);
      }
      await loadData();
    } catch (err: any) {
      alert('Reconciliation failed: ' + err.message);
    }
  };

  const handleCancelPayout = async (payoutId: string) => {
    if (!window.confirm('Cancel this pending payout request and release the reserved balance?')) return;
    try {
      await api.cancelPayout(payoutId, 'Cancelled from host portal');
      setPayoutSuccess('Payout cancelled and reserved balance released.');
      await loadData();
    } catch (err: any) {
      alert('Cancel failed: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Type', 'Description', 'Amount (USD)', 'Balance After (USD)', 'Idempotency Key'];
    const rows = ledger.map(l => [
      l.id,
      l.createdAt,
      l.type,
      `"${l.description.replace(/"/g, '""')}"`,
      l.amount.toFixed(2),
      l.balanceAfter.toFixed(2),
      l.idempotencyKey
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `parkeazy_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Balance Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Treasury & Payouts Engine
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Host Financial Ledger & Payouts
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Idempotent double-entry records with automatic 12% platform commission and 88% net earnings debit/credit.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setPayoutAmount(Math.min(financials.availableBalance, 50).toFixed(2));
                setShowPayoutModal(true);
              }}
              disabled={financials.availableBalance <= 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              <span>Transfer Payout</span>
            </button>
          </div>
        </div>

        {/* Payout Success notification */}
        {payoutSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{payoutSuccess}</span>
          </div>
        )}

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Available for Payout
            </div>
            <div className="text-3xl font-extrabold text-emerald-700">
              ${financials.availableBalance.toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-800/80 mt-1">
              Ready for instant bank transfer
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pending Clearance
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              ${financials.pendingPayouts.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Processing in transit
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Lifetime Net Earnings
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              ${financials.lifetimeEarnings.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Net 88% revenue to date
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Withdrawn to Bank
            </div>
            <div className="text-3xl font-extrabold text-slate-800">
              ${financials.lifetimePayouts.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Settled to verified bank accounts
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Payouts & Transaction Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payout History (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Payout Transfer History</span>
            <span className="text-xs text-slate-400 font-normal">{payouts.length} transfers</span>
          </h3>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {payouts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">No payouts requested yet.</div>
            ) : (
              payouts.map(po => (
                <div key={po.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">{po.referenceNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        po.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : po.status === 'failed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{po.destinationAccount}</span>
                    <span className="font-bold text-slate-900">${po.amount.toFixed(2)}</span>
                  </div>
                  {po.notes && (
                    <div className="text-[10px] text-slate-600 bg-white/80 p-1.5 rounded border border-slate-100 leading-tight">
                      {po.notes}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                    <span>{po.method === 'stripe_instant' ? 'Stripe Instant' : 'ACH Standard'}</span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(po.requestedAt).toLocaleDateString()}</span>
                      {(po.status === 'processing' || po.status === 'pending') && (
                        <>
                          <button
                            onClick={() => handleReconcilePayout(po.id)}
                            className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                            title="Check clearance with provider"
                          >
                            Reconcile
                          </button>
                          <button
                            onClick={() => handleCancelPayout(po.id)}
                            className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                            title="Cancel request and release reserved funds"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Double-entry Transaction Ledger (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Double-Entry Transaction Ledger
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Idempotent Financial Operations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map(tx => {
                  const isCredit = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                            tx.type === 'booking_income'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.type === 'host_payout'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-800 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                        <span className={isCredit ? 'text-emerald-600' : 'text-slate-800'}>
                          {isCredit ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-semibold whitespace-nowrap">
                        ${tx.balanceAfter.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                Request Earnings Payout
              </h3>
              <button onClick={() => setShowPayoutModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="text-[11px] text-emerald-700 block">Available Balance:</span>
                <span className="text-xl font-bold">${financials.availableBalance.toFixed(2)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payout Amount ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={financials.availableBalance}
                    required
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transfer Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between ${
                      payoutMethod === 'stripe_instant'
                        ? 'border-sky-500 bg-sky-50/50 text-sky-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="stripe_instant"
                      checked={payoutMethod === 'stripe_instant'}
                      onChange={() => setPayoutMethod('stripe_instant')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Zap className="w-3.5 h-3.5 text-sky-600" />
                      <span>Instant Stripe</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Minutes to debit card / bank</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between ${
                      payoutMethod === 'ach_bank_transfer'
                        ? 'border-sky-500 bg-sky-50/50 text-sky-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payoutMethod"
                      value="ach_bank_transfer"
                      checked={payoutMethod === 'ach_bank_transfer'}
                      onChange={() => setPayoutMethod('ach_bank_transfer')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Landmark className="w-3.5 h-3.5 text-slate-600" />
                      <span>Standard ACH</span>
                    </div>
                    <span className="text-[10px] text-slate-500">1-2 business days</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination Bank Account
                </label>
                <input
                  type="text"
                  value={destinationAccount}
                  onChange={e => setDestinationAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs"
                >
                  {payoutSubmitting ? 'Processing...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
