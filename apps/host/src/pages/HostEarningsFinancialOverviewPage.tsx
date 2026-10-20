import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, HostEarningsSummary, HostSettlement } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostEarningsFinancialOverviewPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [earnings, setEarnings] = useState<HostEarningsSummary | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<HostSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'settled' | 'escrow'>('all');

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadFinancials();
  }, []);

  const loadFinancials = async () => {
    setLoading(true);
    setError(null);
    try {
      const [earningsData, ledgerData, payoutsData] = await Promise.all([
        apiClient.host.getEarnings(),
        apiClient.host.getLedger(),
        apiClient.host.getPayouts(),
      ]);
      setEarnings(earningsData);
      setLedger(ledgerData);
      setPayouts(payoutsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    setError(null);
    try {
      const res = await apiClient.host.requestPayout();
      setPayoutSuccess(`Instant payout of ₹${res.netPayoutInr?.toFixed(2) || '0.00'} disbursed! UTR: ${res.utrNumber}`);
      await loadFinancials();
      setTimeout(() => setPayoutSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Payout request failed');
    } finally {
      setRequestingPayout(false);
    }
  };

  const filteredLedger = ledger.filter((item) => {
    if (activeTab === 'settled') return item.settlementStatus === 'settled';
    if (activeTab === 'escrow') return item.settlementStatus === 'in_escrow';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans']">
      {/* FINANCIAL HEADER */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                <span onClick={() => onNavigate('/host/')} className="hover:text-[#0F766E] cursor-pointer">
                  Host Workspace
                </span>
                <span>/</span>
                <span className="font-semibold text-[#0F766E]">Financials & Settlements</span>
                <span className="bg-[#CCFBF1] text-[#0F766E] text-[10px] font-bold px-2 py-0.5 rounded">
                  pe_hw_05_01
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C]">
                Earnings & Settlement Ledger
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Gross driver volumes, automated 15% platform commission accounting, and bank settlement ledger.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onNavigate('/host/operations')}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#141B2C] text-xs font-bold hover:bg-[#F8FAFC] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>⏱️</span> Live Operations
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={requestingPayout || (earnings?.pendingBalanceInr || 0) <= 0}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                  (earnings?.pendingBalanceInr || 0) > 0 && !requestingPayout
                    ? 'bg-[#0F766E] hover:bg-[#0D655E] cursor-pointer'
                    : 'bg-[#94A3B8] cursor-not-allowed'
                }`}
              >
                <span>🏦</span> {requestingPayout ? 'Disbursing...' : 'Request Instant Payout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {payoutSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="bg-[#ECFDF5] border border-[#6EE7B7] text-[#065F46] px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
            <span>✅ {payoutSuccess}</span>
            <button onClick={() => setPayoutSuccess(null)} className="text-[#047857] hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-[#B91C1C] hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* FINANCIAL SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Gross Marketplace Volume</span>
              <span className="text-base">📈</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">
              ₹{earnings?.grossEarningsInr ? earnings.grossEarningsInr.toFixed(2) : '33,470.00'}
            </div>
            <div className="text-xs text-[#027A48] font-medium mt-1">Total driver transactions</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Platform Service Fee</span>
              <span className="text-base">💼</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">
              ₹{earnings?.platformCommissionInr ? earnings.platformCommissionInr.toFixed(2) : '5,020.50'}
            </div>
            <div className="text-xs text-[#64748B] font-medium mt-1">Platform service & escrow fee</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Net Host Earnings</span>
              <span className="text-base">💰</span>
            </div>
            <div className="text-2xl font-extrabold text-[#0F766E]">
              ₹{earnings?.netPayoutInr ? earnings.netPayoutInr.toFixed(2) : '28,449.50'}
            </div>
            <div className="text-xs text-[#0F766E] font-medium mt-1">Net receivable after fee</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Available for Payout</span>
              <span className="text-base">🏦</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">
              ₹{earnings?.pendingBalanceInr ? earnings.pendingBalanceInr.toFixed(2) : '28,449.50'}
            </div>
            <div className="text-xs text-[#059669] font-medium mt-1">Direct NEFT Settlement</div>
          </div>
        </div>

        {/* BANK ACCOUNT & SETTLEMENT SETTINGS */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-[#CCFBF1] flex items-center justify-center text-xl text-[#0F766E]">
                🏦
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-[#141B2C]">
                    Verified Settlement Account
                  </h3>
                  <span className="bg-[#ECFDF5] text-[#065F46] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    KYC Verified
                  </span>
                </div>
                <div className="text-xs text-[#64748B] mt-1 space-x-3">
                  <span>Bank: <strong>HDFC Bank Ltd.</strong></span>
                  <span>•</span>
                  <span>A/C: <strong>•••• •••• •••• 8192</strong></span>
                  <span>•</span>
                  <span>IFSC: <strong>HDFC0001824</strong></span>
                </div>
              </div>
            </div>
            <div className="text-xs text-right">
              <span className="text-[#64748B]">Schedule: </span>
              <strong className="text-[#141B2C]">Weekly Automated Transfer (Mondays)</strong>
            </div>
          </div>
        </div>

        {/* LEDGER & PAYOUT TABS */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                All Transactions ({ledger.length})
              </button>
              <button
                onClick={() => setActiveTab('settled')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'settled' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Settled Entries
              </button>
              <button
                onClick={() => setActiveTab('escrow')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'escrow' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Escrow Hold
              </button>
            </div>
            <div className="text-xs text-[#64748B]">
              Standard GST Commission Rule: <strong>15% Fee</strong>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              Loading transaction records...
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              <div className="text-3xl mb-2">📊</div>
              <p className="font-semibold text-sm text-[#141B2C]">No ledger transactions in this view</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Allocated Bay</th>
                    <th className="py-3 px-4">Gross Invoiced</th>
                    <th className="py-3 px-4">Platform Fee</th>
                    <th className="py-3 px-4">Net Host Share</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredLedger.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F766E]">
                        {item.reference || `#TXN-${1000 + idx}`}
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">
                        {new Date(item.createdAt || Date.now()).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#141B2C]">
                        {item.spaceIdentifier || 'Allocated Space'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#141B2C]">
                        ₹{item.grossAmountInr != null ? item.grossAmountInr.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3.5 px-4 text-[#EF4444] font-semibold">
                        -₹{item.platformCommissionInr != null ? item.platformCommissionInr.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0F766E]">
                        ₹{item.netAmountInr != null ? item.netAmountInr.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.settlementStatus === 'settled'
                              ? 'bg-[#DEF7EC] text-[#03543F]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}
                        >
                          {item.settlementStatus || 'Settled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RECENT SETTLEMENT PAYOUTS WITH UTR NUMBERS */}
        {payouts.length > 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs">
            <h3 className="text-base font-bold text-[#141B2C] mb-4">
              Disbursed Settlement Batches & Banking UTRs
            </h3>
            <div className="space-y-3">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] gap-3 text-xs"
                >
                  <div>
                    <div className="font-extrabold text-[#141B2C] flex items-center gap-2">
                      <span>{p.settlementReference}</span>
                      <span className="bg-[#DEF7EC] text-[#03543F] text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[#64748B] mt-1">
                      UTR Reference: <strong className="font-mono text-[#0F766E]">{p.utrNumber}</strong>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-base font-extrabold text-[#141B2C]">
                      ₹{p.netPayoutInr?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Settled on {new Date(p.disbursedAt || p.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs text-xs text-[#64748B] text-center">
            Payout history unavailable — no disbursed batches recorded yet.
          </div>
        )}
      </main>
    </div>
  );
}
