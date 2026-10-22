import React, { useEffect, useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingSpace } from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

interface BayDeltaItem {
  bay: string;
  floor: string;
  currentRate: number;
  proposedRate: number;
  delta: number;
}

const apiClient = new ApiClient();

export function BulkPricingScheduleUpdatesPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [targetScope, setTargetScope] = useState('all');
  const [adjustMethod, setAdjustMethod] = useState<'flat' | 'percentage' | 'fixed'>('flat');
  const [adjustValue, setAdjustValue] = useState('10');
  const [effectiveDate, setEffectiveDate] = useState('immediate');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient.facilities.getSpaces('fac-anna-001')
      .then((loaded) => {
        if (isMounted) setSpaces(loaded || []);
      })
      .catch(() => {
        if (isMounted) setSpaces([]);
      });
    return () => { isMounted = false; };
  }, []);

  const numVal = parseFloat(adjustValue) || 0;

  const previewItems: BayDeltaItem[] = spaces.map((s) => {
    const cur = s.hourlyRateInr || 40;
    let nextRate = cur;
    if (adjustMethod === 'flat') {
      nextRate = cur + numVal;
    } else if (adjustMethod === 'percentage') {
      nextRate = Math.round(cur * (1 + numVal / 100));
    } else {
      nextRate = numVal;
    }
    return {
      bay: s.bayIdentifier || s.spaceNumber || 'Bay',
      floor: s.floorLevel || 'Ground',
      currentRate: cur,
      proposedRate: Math.max(10, nextRate),
      delta: Math.max(10, nextRate) - cur,
    };
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Bulk update halted: A transactional bulk-pricing API is required on the server to execute atomic updates without partial failure.');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/pricing')} className="hover:underline">Tariffs</button>
              <span>/</span>
              <span className="text-[#0F766E]">Bulk Updates (pe_hw_03_07)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Bulk Tariff & Operating Schedule Adjustment
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                Transaction Engine v4.8
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Execute batch tariff updates or synchronized shift changes across selected zones with strict transactional rollbacks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/pricing')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Overview
            </button>
            <button
              onClick={() => onNavigate('/host/pricing/conflicts')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Conflict Review →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 6 COLS: BATCH CONFIG */}
          <form onSubmit={handleApply} className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span>🎯</span>
              <span>1. Target Inventory Selection</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-2">Scope Target</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'all_24', label: 'All 24 Facility Bays' },
                  { id: 'b1', label: 'Basement 1 (A-01 to A-12)' },
                  { id: 'b2', label: 'Basement 2 (B-01 to B-12)' },
                  { id: 'ev_only', label: 'EV Charging Bays Only' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTargetScope(s.id)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      targetScope === s.id
                        ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E] ring-2 ring-[#0F766E]/20'
                        : 'border-[#E2E8F0] bg-white text-[#64748B]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] pt-4">
              <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2 mb-3">
                <span>⚙️</span>
                <span>2. Configure Adjustment Rule</span>
              </h2>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: 'flat', label: 'Flat INR (±₹)' },
                  { id: 'percentage', label: 'Percentage (±%)' },
                  { id: 'fixed', label: 'Set Fixed Rate' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAdjustMethod(m.id as any)}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold text-center transition-all ${
                      adjustMethod === m.id
                        ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]'
                        : 'border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Adjustment Delta Value ({adjustMethod === 'percentage' ? '%' : '₹'})
                </label>
                <input
                  type="number"
                  step={adjustMethod === 'percentage' ? '5' : '1'}
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E] font-bold"
                />
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] pt-4">
              <label className="block text-xs font-bold text-[#334155] mb-1">Effective Timing</label>
              <select
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
              >
                <option value="immediate">Immediate Live Sync (All Future Bookings)</option>
                <option value="tomorrow">Tomorrow 00:00 IST</option>
                <option value="weekend">Next Saturday 00:00 IST</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {saving ? 'Executing Batch...' : '🚀 Execute Bulk Tariff Update'}
              </button>
            </div>
          </form>

          {/* RIGHT 6 COLS: DELTA REVIEW TABLE */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>📋</span>
                <span>Proposed Tariff Delta Review</span>
              </h2>
              <span className="text-[11px] font-mono text-[#0F766E] font-bold bg-[#CCFBF1] px-2 py-0.5 rounded">
                Simulated Preview
              </span>
            </div>

            <p className="text-xs text-[#64748B]">
              Inspect bay-by-bay price changes before confirming the update.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-2.5 px-3">Bay Slot</th>
                    <th className="py-2.5 px-3">Floor</th>
                    <th className="py-2.5 px-3">Current</th>
                    <th className="py-2.5 px-3">Proposed</th>
                    <th className="py-2.5 px-3">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {previewItems.map((item) => (
                    <tr key={item.bay}>
                      <td className="py-3 px-3 font-bold text-[#141B2C]">{item.bay}</td>
                      <td className="py-3 px-3 text-[#64748B]">{item.floor}</td>
                      <td className="py-3 px-3 text-[#64748B]">₹{item.currentRate}/hr</td>
                      <td className="py-3 px-3 font-bold text-[#0F766E]">₹{item.proposedRate}/hr</td>
                      <td className="py-3 px-3 font-bold">
                        <span className={item.delta >= 0 ? 'text-[#027A48]' : 'text-[#D92D20]'}>
                          {item.delta >= 0 ? `+₹${item.delta}` : `-₹${Math.abs(item.delta)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B]">
              <strong>Safety Guard:</strong> Existing verified reservations will not be charged retrospectively; the new rate strictly attaches to future bookings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
