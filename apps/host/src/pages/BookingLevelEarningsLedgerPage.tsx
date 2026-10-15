import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingLevelEarningsLedgerPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    apiClient.host.getLedger()
      .then((data) => setLedger(data))
      .catch(() => {
        // Fallback ledger entries
        setLedger([
          {
            id: 'ledg-001',
            bookingId: '5987de02',
            date: 'Today, 11:20 AM',
            vehiclePlate: 'TN-09-CB-4821',
            grossFare: 150,
            platformCommission: 22.5,
            gstOnCommission: 4.05,
            netHostPayout: 123.45,
            status: 'SETTLED',
          },
          {
            id: 'ledg-002',
            bookingId: 'cf8c9b5c',
            date: 'Today, 10:45 AM',
            vehiclePlate: 'TN-01-AX-9021',
            grossFare: 100,
            platformCommission: 15.0,
            gstOnCommission: 2.7,
            netHostPayout: 82.3,
            status: 'SETTLED',
          },
          {
            id: 'ledg-003',
            bookingId: '10000000',
            date: 'Today, 09:15 AM',
            vehiclePlate: 'TN-07-JK-1928',
            grossFare: 200,
            platformCommission: 30.0,
            gstOnCommission: 5.4,
            netHostPayout: 164.6,
            status: 'PENDING_BATCH',
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Earnings & Ledger
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_02 • Itemized Settlement Ledger</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Booking-Level Earnings Transaction Ledger
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/earnings/fees')}
              className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
            >
              Commission Breakdown →
            </button>
            <button
              onClick={() => onNavigate('/host/earnings')}
              className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC]"
            >
              Earnings Overview
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs font-bold text-[#64748B] uppercase">Gross Fares Collected</span>
            <div className="text-2xl font-black text-[#101828] mt-1">₹450.00</div>
            <span className="text-[11px] text-[#64748B]">Across 3 sessions today</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs font-bold text-[#64748B] uppercase">Platform Commission (15%)</span>
            <div className="text-2xl font-black text-[#64748B] mt-1">₹67.50</div>
            <span className="text-[11px] text-[#64748B]">Platform service + GST</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs font-bold text-[#0F766E] uppercase">Net Host Earnings</span>
            <div className="text-2xl font-black text-[#0F766E] mt-1">₹370.35</div>
            <span className="text-[11px] text-[#0F766E] font-semibold">T+1 bank payout eligible</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Transaction Line Items ({ledger.length})
            </h2>
            <button
              onClick={() => onNavigate('/host/earnings/export')}
              className="text-xs text-[#0F766E] font-bold hover:underline"
            >
              Export CSV Report →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                <tr>
                  <th className="px-6 py-3">Txn ID</th>
                  <th className="px-6 py-3">Booking Ref</th>
                  <th className="px-6 py-3">Date / Time</th>
                  <th className="px-6 py-3">Plate</th>
                  <th className="px-6 py-3 text-right">Gross Fare</th>
                  <th className="px-6 py-3 text-right">Fee (15%)</th>
                  <th className="px-6 py-3 text-right">Net Payout</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-mono font-bold text-[#101828]">{row.id}</td>
                    <td className="px-6 py-4 font-mono text-[#0F766E]">#{row.bookingId.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-[#64748B]">{row.date}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-[#101828]">{row.vehiclePlate}</td>
                    <td className="px-6 py-4 text-right font-bold text-[#101828]">₹{row.grossFare}</td>
                    <td className="px-6 py-4 text-right text-[#DC2626]">-₹{row.platformCommission}</td>
                    <td className="px-6 py-4 text-right font-black text-[#0F766E]">₹{row.netHostPayout}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'SETTLED'
                          ? 'bg-[#ECFDF5] text-[#065F46]'
                          : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
