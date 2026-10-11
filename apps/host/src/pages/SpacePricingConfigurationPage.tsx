import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function SpacePricingConfigurationPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  // Form State
  const [baseRate, setBaseRate] = useState('40.00');
  const [dailyCap, setDailyCap] = useState('250.00');
  const [minBillingUnit, setMinBillingUnit] = useState('30_min');
  const [morningPeakMult, setMorningPeakMult] = useState('1.25');
  const [eveningPeakMult, setEveningPeakMult] = useState('1.25');
  const [weekendMult, setWeekendMult] = useState('1.10');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulation Duration
  const [simHours, setSimHours] = useState(3);
  const [simIsPeak, setSimIsPeak] = useState(true);

  const numBase = parseFloat(baseRate) || 40;
  const numCap = parseFloat(dailyCap) || 250;
  const numPeakMult = simIsPeak ? (parseFloat(morningPeakMult) || 1.25) : 1.0;

  const rawTotal = Math.min(numCap, numBase * simHours * numPeakMult);
  const platformFee = rawTotal * 0.12;
  const gst = (rawTotal + platformFee) * 0.18;
  const totalDriverPays = rawTotal + platformFee + gst;
  const hostNetTakeHome = rawTotal * 0.88;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Commercial tariff parameters and dynamic peak rules committed successfully.');
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
              <span className="text-[#0F766E]">Configure Tariff Rules (pe_hw_03_02)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Configure Space Tariff & Commercial Rules
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                Bay A-04 • EV Fast Charger
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Set host hourly base rates, optional day caps, peak multipliers, and review transparent driver-facing cost breakdowns.
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
              onClick={() => onNavigate('/host/pricing/schedule')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Operating Hours →
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
            {/* BASE RATE & CORE TARIFFS */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💵</span>
                <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Base Hourly Rate & Core Tariffs
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Base Hourly Rate (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-[#64748B] font-bold">₹</span>
                    <input
                      type="number"
                      step="5"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E] font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Marketplace benchmark: ₹30 - ₹60 / hr</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Daily Maximum Cap (₹ / 24h)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-[#64748B] font-bold">₹</span>
                    <input
                      type="number"
                      step="10"
                      value={dailyCap}
                      onChange={(e) => setDailyCap(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E] font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Automatic ceiling for stays exceeding 6 hours</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Minimum Billing Increment</label>
                  <select
                    value={minBillingUnit}
                    onChange={(e) => setMinBillingUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="15_min">15 Minutes Blocks</option>
                    <option value="30_min">30 Minutes Blocks (Recommended)</option>
                    <option value="60_min">1 Hour Strict Full Block</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PEAK & DEMAND MULTIPLIERS */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⚡</span>
                <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Dynamic Peak & Demand Multipliers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Morning Peak (08:00–11:00)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={morningPeakMult}
                    onChange={(e) => setMorningPeakMult(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none"
                  />
                  <p className="text-[10px] text-[#94A3B8] mt-1">Multiplier: {morningPeakMult}x</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Evening Peak (17:00–20:00)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={eveningPeakMult}
                    onChange={(e) => setEveningPeakMult(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none"
                  />
                  <p className="text-[10px] text-[#94A3B8] mt-1">Multiplier: {eveningPeakMult}x</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Weekend Surge (Sat–Sun)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={weekendMult}
                    onChange={(e) => setWeekendMult(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none"
                  />
                  <p className="text-[10px] text-[#94A3B8] mt-1">Multiplier: {weekendMult}x</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {saving ? 'Updating...' : '💾 Save Commercial Rules'}
              </button>
            </div>
          </form>

          {/* RIGHT 5 COLS: LIVE SIMULATION BREAKDOWN */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧮</span>
                  <div>
                    <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      Live Rate Simulation
                    </h2>
                    <p className="text-[11px] text-[#64748B]">Driver checkout invoice simulation</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-[#CCFBF1] text-[#0F766E] font-bold px-2 py-0.5 rounded">
                  Live Calculator
                </span>
              </div>

              {/* CONTROLS */}
              <div className="space-y-3 mb-4 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#334155] mb-1">
                    <span>Parking Duration:</span>
                    <span>{simHours} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={simHours}
                    onChange={(e) => setSimHours(parseInt(e.target.value, 10))}
                    className="w-full accent-[#0F766E]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-[#334155]">Peak Hour Period?</span>
                  <button
                    type="button"
                    onClick={() => setSimIsPeak(!simIsPeak)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      simIsPeak ? 'bg-[#F43F5E] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {simIsPeak ? '⚡ Peak (+25%)' : 'Standard'}
                  </button>
                </div>
              </div>

              {/* INVOICE CARD */}
              <div className="bg-[#101828] text-white p-5 rounded-2xl border border-[#1E293B] space-y-3 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#334155] pb-2">
                  Driver Motorist Checkout Bill
                </div>

                <div className="flex justify-between text-[#CBD5E1]">
                  <span>Base Parking ({simHours} hrs @ ₹{numBase}/hr):</span>
                  <span className="font-mono">₹{(numBase * simHours).toFixed(2)}</span>
                </div>

                {simIsPeak && (
                  <div className="flex justify-between text-[#F43F5E]">
                    <span>Rush Surge Adjustment (+25%):</span>
                    <span className="font-mono">+₹{((numBase * simHours * 0.25)).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#94A3B8]">
                  <span>ParkEazy Platform Fee (12%):</span>
                  <span className="font-mono">₹{platformFee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[#94A3B8]">
                  <span>Government Taxes (GST 18%):</span>
                  <span className="font-mono">₹{gst.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-[#334155] flex justify-between font-extrabold text-sm text-white">
                  <span>Total Driver Pays:</span>
                  <span className="text-[#2DD4BF] font-mono">₹{totalDriverPays.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-[#1E293B] flex justify-between text-[11px] text-[#027A48] bg-[#027A48]/10 p-2 rounded-lg">
                  <span>Host Net Payout Take-Home:</span>
                  <span className="font-mono font-bold text-white">₹{hostNetTakeHome.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
