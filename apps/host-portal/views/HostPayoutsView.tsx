import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPayoutsViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostPayoutsView: React.FC<HostPayoutsViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';
  const [data, setData] = useState<{ earnings: any; records: any[] } | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [newMethod, setNewMethod] = useState({
    beneficiaryName: `${currentUser?.firstName || 'Host'} ${currentUser?.lastName || 'Partner'}`,
    bankName: 'JPMorgan Chase Bank',
    routingNumber: '021000021',
    accountNumber: '',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [payoutsRes, methodsRes] = await Promise.all([
        apiClient.getHostPayouts(hostId),
        apiClient.getHostPayoutMethods(hostId),
      ]);
      setData(payoutsRes);
      setPayoutMethods(methodsRes);
      if (payoutsRes.earnings?.availableForPayoutCents) {
        setPayoutAmount((payoutsRes.earnings.availableForPayoutCents / 100).toFixed(2));
      }
    } catch (err: any) {
      console.error('Failed to load payout data:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not load payouts' });
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat(payoutAmount);
    if (isNaN(dollars) || dollars <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid payout amount.' });
      return;
    }

    const amountCents = Math.round(dollars * 100);
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await apiClient.requestHostPayout(hostId, amountCents);
      setFeedback({
        type: 'success',
        message: `Payout of $${(amountCents / 100).toFixed(2)} processed successfully! Reference UTR: ${res.referenceOrUtr}`,
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to process payout.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.accountNumber || newMethod.accountNumber.length < 4) {
      setFeedback({ type: 'error', message: 'Account number must be at least 4 digits.' });
      return;
    }

    try {
      await apiClient.saveHostPayoutMethod(hostId, newMethod);
      setShowAddMethodModal(false);
      setFeedback({ type: 'success', message: 'Payout bank account saved successfully.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save payout method.' });
    }
  };

  const earnings = data?.earnings;
  const records = data?.records || [];
  const defaultMethod = payoutMethods.find((m) => m.is_default) || payoutMethods[0];

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] font-sans">
      <header className="h-16 bg-[#12211C] border-b border-[#1e342d] px-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">Host Studio</span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">Payouts &amp; Settlements</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/host')}>
            Back to Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <HostSubNav activeSection="payouts" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              Host Financial Settlements &amp; Payouts
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative double-entry ledger balance, bank routing configuration, and automated disbursements.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Balances
          </Button>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 1. Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs text-slate-500 block">Available For Payout</span>
            <span className="text-3xl font-extrabold font-mono text-emerald-700 mt-1 block">
              ${earnings ? (earnings.availableForPayoutCents / 100).toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Ready for instant transfer
            </span>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs text-slate-500 block">Total Accrued Revenue</span>
            <span className="text-3xl font-extrabold font-mono text-slate-900 mt-1 block">
              ${earnings ? (earnings.totalAccruedCents / 100).toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">85% host revenue share</span>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs text-slate-500 block">Pending Clearance</span>
            <span className="text-3xl font-extrabold font-mono text-slate-800 mt-1 block">
              ${earnings ? (earnings.pendingClearanceCents / 100).toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 24h post check-out hold
            </span>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs text-slate-500 block">Lifetime Settled</span>
            <span className="text-3xl font-extrabold font-mono text-slate-900 mt-1 block">
              ${earnings ? (earnings.lifetimePayoutsCents / 100).toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">Disbursed to bank account</span>
          </Card>
        </div>

        {/* 2. Actions & Bank Configuration Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Payout Request Card */}
          <div className="lg:col-span-7">
            <Card className="p-6 bg-white border-slate-200 space-y-5">
              <div>
                <h3 className="font-bold text-base text-slate-900">Request Instant Payout</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Disburse cleared funds directly to your verified bank account via ACH transfer.
                </p>
              </div>

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount to Disburse (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7 font-mono font-bold text-base"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Maximum available: ${earnings ? (earnings.availableForPayoutCents / 100).toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span>
                      Deposit target: <strong>{defaultMethod?.bank_name || 'Direct Deposit'} ({defaultMethod?.account_number_masked || '•••• 8821'})</strong>
                    </span>
                  </div>
                  <Badge variant="success">ACH Next-Day</Badge>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isSubmitting || !earnings || earnings.availableForPayoutCents <= 0}
                >
                  {isSubmitting ? 'Processing ACH Disbursement...' : 'Initiate Payout Transfer'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Connected Payout Method */}
          <div className="lg:col-span-5">
            <Card className="p-6 bg-white border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Settlement Account</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Verified bank account on file</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowAddMethodModal(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-semibold text-slate-800">{defaultMethod?.bank_name || 'JPMorgan Chase Bank'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Number:</span>
                  <span className="font-mono font-medium text-slate-800">{defaultMethod?.account_number_masked || '•••• 8821'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Routing (ABA):</span>
                  <span className="font-mono text-slate-700">{defaultMethod?.routing_number || '021000021'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-medium text-slate-800">{defaultMethod?.beneficiary_name || `${currentUser?.firstName || 'Marcus'} ${currentUser?.lastName || 'Chen'}`}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Account Status:</span>
                  <Badge variant="success">Verified &amp; Active</Badge>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All bank credentials are encrypted at rest per banking security standards.</span>
              </div>
            </Card>
          </div>
        </div>

        {/* 3. Transaction & Settlement History */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Settlement Transaction Ledger</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Reference / UTR</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Settled Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No payout records found yet. Disbursed funds will record an immutable UTR here.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-medium text-slate-800">{rec.reference_or_utr || rec.id}</td>
                      <td className="p-3 text-slate-600">
                        {rec.bank_name || 'ACH Direct Deposit'} ({rec.account_number_masked || '•••• 8821'})
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">${(rec.amount_cents / 100).toFixed(2)}</td>
                      <td className="p-3">
                        <Badge variant={rec.status === 'SETTLED' ? 'success' : 'warning'}>
                          {rec.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono">
                        {rec.settled_at_utc ? new Date(rec.settled_at_utc).toLocaleDateString() : 'Processing'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Bank Account Modal */}
        {showAddMethodModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900">Update Settlement Account</h3>
                <button
                  onClick={() => setShowAddMethodModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveMethod} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Beneficiary Legal Name</label>
                  <Input
                    value={newMethod.beneficiaryName}
                    onChange={(e) => setNewMethod({ ...newMethod, beneficiaryName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                  <Input
                    value={newMethod.bankName}
                    onChange={(e) => setNewMethod({ ...newMethod, bankName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Routing Number (ABA)</label>
                  <Input
                    value={newMethod.routingNumber}
                    onChange={(e) => setNewMethod({ ...newMethod, routingNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Account Number</label>
                  <Input
                    type="password"
                    placeholder="Enter full account number"
                    value={newMethod.accountNumber}
                    onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Masked upon save: only last 4 digits stored visible</span>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button variant="secondary" type="button" onClick={() => setShowAddMethodModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save Account
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
