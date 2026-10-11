import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingDurationAdvanceBookingRulesPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  // Rules State
  const [minDurationHours, setMinDurationHours] = useState('1');
  const [maxDurationDays, setMaxDurationDays] = useState('14');
  const [advanceHorizonDays, setAdvanceHorizonDays] = useState('30');
  const [minLeadTimeMinutes, setMinLeadTimeMinutes] = useState('15');
  const [turnoverBufferMinutes, setTurnoverBufferMinutes] = useState('10');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState('15');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Booking horizon thresholds and dwell limits updated successfully.');
    }, 400);
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
              <span className="text-[#0F766E]">Booking Limits & Rules (pe_hw_03_05)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Booking Duration & Advance-Booking Parameters
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                24 Bays Protected
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Govern minimum dwell times, maximum stay lengths, advance scheduling horizons, and buffer intervals between sessions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/pricing/closures')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Closures
            </button>
            <button
              onClick={() => onNavigate('/host/pricing/estimate')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Earnings Simulator →
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
          {/* LEFT 7 COLS: FORM CONTROLS */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
            {/* DURATION CONSTRAINTS */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⏱️</span>
                <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Duration Constraints (Dwell Limits)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Minimum Booking Duration</label>
                  <select
                    value={minDurationHours}
                    onChange={(e) => setMinDurationHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="0.5">30 Minutes (Short Errand)</option>
                    <option value="1">1 Hour (Standard)</option>
                    <option value="2">2 Hours Minimum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Maximum Consecutive Stay</label>
                  <select
                    value={maxDurationDays}
                    onChange={(e) => setMaxDurationDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="1">24 Hours (Daily Max)</option>
                    <option value="7">7 Days (Weekly Limit)</option>
                    <option value="14">14 Days (Extended Trip)</option>
                    <option value="30">30 Days (Monthly Lease)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ADVANCE RESERVATION HORIZON */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🗓️</span>
                <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Advance Reservation Horizon & Lead Time
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Booking Window Horizon</label>
                  <select
                    value={advanceHorizonDays}
                    onChange={(e) => setAdvanceHorizonDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="7">Up to 7 Days in Advance</option>
                    <option value="14">Up to 14 Days in Advance</option>
                    <option value="30">Up to 30 Days in Advance (Recommended)</option>
                    <option value="90">Up to 90 Days in Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Minimum Lead Time Notice</label>
                  <select
                    value={minLeadTimeMinutes}
                    onChange={(e) => setMinLeadTimeMinutes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="0">Instant Ingress (0 min)</option>
                    <option value="15">15 Minutes Notice (Recommended)</option>
                    <option value="30">30 Minutes Notice</option>
                    <option value="60">1 Hour Notice</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BUFFER & TURNOVER */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🔄</span>
                <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Turnover & Sanitary Buffer Between Bookings
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Turnover Separation Buffer</label>
                  <select
                    value={turnoverBufferMinutes}
                    onChange={(e) => setTurnoverBufferMinutes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="0">0 Minutes (Immediate Back-to-Back)</option>
                    <option value="10">10 Minutes (Recommended)</option>
                    <option value="15">15 Minutes</option>
                  </select>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Prevents departing & arriving car conflicts in narrow aisles</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Overstay Grace Period</label>
                  <select
                    value={gracePeriodMinutes}
                    onChange={(e) => setGracePeriodMinutes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="10">10 Minutes Grace</option>
                    <option value="15">15 Minutes Grace</option>
                    <option value="30">30 Minutes Grace</option>
                  </select>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Complimentary exit window before overstay penalty kicks in</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {saving ? 'Updating...' : '💾 Save Booking Parameters'}
              </button>
            </div>
          </form>

          {/* RIGHT 5 COLS: SUMMARY CARD */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>🛡️</span>
                <span>Enforcement Protocol Summary</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
                  <span className="text-[#64748B]">Driver Booking Window:</span>
                  <span className="font-bold text-[#141B2C]">{minDurationHours} hr min — {maxDurationDays} days max</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
                  <span className="text-[#64748B]">Calendar Horizon:</span>
                  <span className="font-bold text-[#141B2C]">{advanceHorizonDays} days ahead</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
                  <span className="text-[#64748B]">Aisle Safety Buffer:</span>
                  <span className="font-bold text-[#0F766E]">{turnoverBufferMinutes} minutes</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between">
                  <span className="text-[#64748B]">Late Departure Grace:</span>
                  <span className="font-bold text-[#0F766E]">{gracePeriodMinutes} minutes</span>
                </div>
              </div>

              <div className="p-4 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1] text-xs text-[#0F766E]">
                <strong>Driver Guarantee:</strong> The 10-minute buffer ensures arriving motorists never find another car still occupying their reserved bay.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
