import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PricingPreviewEarningsEstimatePage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  // Single Session Simulation
  const [vehicleType, setVehicleType] = useState<'car' | 'ev' | 'bike'>('ev');
  const [sessionHours, setSessionHours] = useState(4);
  const [isPeak, setIsPeak] = useState(true);

  // Monthly Projection Model
  const [occupancyRate, setOccupancyRate] = useState(75); // 75%
  const [totalBays, setTotalBays] = useState(24);
  const [avgTurnoverPerDay, setAvgTurnoverPerDay] = useState(2.5); // sessions per bay per day

  // Rates
  const baseRate = vehicleType === 'bike' ? 20 : vehicleType === 'ev' ? 60 : 40;
  const peakMultiplier = isPeak ? 1.25 : 1.0;
  const rawSession = baseRate * sessionHours * peakMultiplier;
  const platformFee = rawSession * 0.12;
  const gst = (rawSession + platformFee) * 0.18;
  const totalDriverPays = rawSession + platformFee + gst;
  const hostSessionNet = rawSession * 0.88;

  // Monthly Calculations
  const activeBays = Math.round((totalBays * occupancyRate) / 100);
  const dailySessions = activeBays * avgTurnoverPerDay;
  const avgSessionRevenue = 150; // average ₹150 per session
  const monthlyGross = dailySessions * avgSessionRevenue * 30;
  const monthlyPlatformFee = monthlyGross * 0.12;
  const monthlyHostNet = monthlyGross * 0.88;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/pricing')} className="hover:underline">Tariffs</button>
              <span>/</span>
              <span className="text-[#0F766E]">Earnings Simulator (pe_hw_03_06)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Driver Tariff Simulator & Host Earnings Calculator
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-xs font-bold uppercase">
                Sim Engine v2.4
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Test simulated motorist bookings, inspect multi-tier price breakdowns, and project monthly net host proceeds under various occupancy scenarios.
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
              onClick={() => onNavigate('/host/pricing/bulk')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Bulk Updates →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* SECTION 1: SINGLE SESSION SIMULATOR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 6 COLS: INPUT CONTROLS */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-5">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span>🚗</span>
              <span>1. Simulate a Motorist Reservation</span>
            </h2>

            {/* Vehicle Type */}
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-2">Vehicle / Bay Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'car', label: 'Standard Car', rate: '₹40/hr', icon: '🚙' },
                  { id: 'ev', label: 'EV Station (A-04)', rate: '₹60/hr', icon: '⚡' },
                  { id: 'bike', label: 'Two-Wheeler', rate: '₹20/hr', icon: '🛵' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleType(v.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      vehicleType === v.id
                        ? 'border-[#0F766E] bg-[#F0FDFA] ring-2 ring-[#0F766E]/20 text-[#0F766E]'
                        : 'border-[#E2E8F0] bg-white text-[#64748B]'
                    }`}
                  >
                    <div className="text-xl mb-1">{v.icon}</div>
                    <div className="font-bold text-xs text-[#141B2C]">{v.label}</div>
                    <div className="text-[10px] text-[#0F766E] font-semibold mt-0.5">{v.rate}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#334155] mb-1">
                <span>Parking Duration:</span>
                <span className="font-mono text-[#0F766E] text-sm">{sessionHours} Hours</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={sessionHours}
                onChange={(e) => setSessionHours(parseInt(e.target.value, 10))}
                className="w-full accent-[#0F766E]"
              />
              <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                <span>1 hr</span>
                <span>4 hrs (Avg)</span>
                <span>8 hrs</span>
                <span>24 hrs (Day Cap)</span>
              </div>
            </div>

            {/* Peak Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <div className="font-bold text-xs text-[#141B2C]">Peak Hour Ingress?</div>
                <div className="text-[11px] text-[#64748B]">Morning (08:00–11:00) or Evening (17:00–20:00)</div>
              </div>
              <button
                type="button"
                onClick={() => setIsPeak(!isPeak)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isPeak ? 'bg-[#F43F5E] text-white shadow-xs' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {isPeak ? '⚡ Peak (+25%)' : 'Standard'}
              </button>
            </div>
          </div>

          {/* RIGHT 6 COLS: INVOICE BREAKDOWN */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span>🧾</span>
              <span>Checkout Bill & Revenue Split</span>
            </h2>

            <div className="bg-[#101828] text-white p-5 rounded-2xl border border-[#1E293B] space-y-3 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#334155] pb-2 flex justify-between">
                <span>Motorist In-App Pass Bill</span>
                <span className="font-mono text-[#2DD4BF]">{sessionHours} Hours</span>
              </div>

              <div className="flex justify-between text-[#CBD5E1]">
                <span>Base Parking Fee:</span>
                <span className="font-mono">₹{(baseRate * sessionHours).toFixed(2)}</span>
              </div>

              {isPeak && (
                <div className="flex justify-between text-[#F43F5E]">
                  <span>Surge Multiplier (+25%):</span>
                  <span className="font-mono">+₹{((baseRate * sessionHours * 0.25)).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#94A3B8]">
                <span>Platform Convenience Fee (12%):</span>
                <span className="font-mono">₹{platformFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[#94A3B8]">
                <span>GST (18% on total):</span>
                <span className="font-mono">₹{gst.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-[#334155] flex justify-between font-extrabold text-sm text-white">
                <span>Motorist Pays:</span>
                <span className="text-[#2DD4BF] font-mono">₹{totalDriverPays.toFixed(2)}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-[#334155] bg-[#027A48]/20 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#4ADE80]">Host Payout (88% Net)</div>
                  <div className="text-lg font-black text-white font-mono">
                    ₹{hostSessionNet.toFixed(2)}
                  </div>
                </div>
                <span className="text-[11px] text-[#86EFAC] font-semibold">T+2 Weekly NEFT</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: MONTHLY EARNINGS PROJECTION MODEL */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>📈</span>
                <span>Monthly Facility Earnings Projection Model</span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Simulate 30-day facility financial performance under varying driver demand and capacity utilization.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-[#F1F5F9] px-3 py-1 rounded-xl text-[#334155]">
              24 Bays Facility Model
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between text-xs font-bold text-[#334155] mb-2">
                <span>Average Facility Occupancy:</span>
                <span className="text-[#0F766E]">{occupancyRate}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={occupancyRate}
                onChange={(e) => setOccupancyRate(parseInt(e.target.value, 10))}
                className="w-full accent-[#0F766E]"
              />
              <div className="text-[10px] text-[#64748B] mt-1">{activeBays} Active Bays in rotation</div>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between text-xs font-bold text-[#334155] mb-2">
                <span>Daily Turnover per Bay:</span>
                <span className="text-[#0F766E]">{avgTurnoverPerDay} cars/day</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={avgTurnoverPerDay}
                onChange={(e) => setAvgTurnoverPerDay(parseFloat(e.target.value))}
                className="w-full accent-[#0F766E]"
              />
              <div className="text-[10px] text-[#64748B] mt-1">{dailySessions.toFixed(0)} total arrivals / day</div>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] flex flex-col justify-between">
              <div className="text-xs font-bold text-[#334155]">Total Monthly Ingress Volume:</div>
              <div className="text-2xl font-black text-[#141B2C] font-mono">
                {(dailySessions * 30).toLocaleString()} <span className="text-xs font-normal text-[#64748B]">Sessions</span>
              </div>
              <div className="text-[11px] text-[#027A48]">Calculated on 30-day month</div>
            </div>
          </div>

          {/* PROJECTED RESULT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="text-xs font-bold text-[#64748B]">Projected Gross Revenue</div>
              <div className="text-2xl font-extrabold text-[#141B2C] font-mono mt-1">
                ₹{monthlyGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">100% of driver billings</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="text-xs font-bold text-[#64748B]">Platform Service Fee (12%)</div>
              <div className="text-2xl font-extrabold text-[#94A3B8] font-mono mt-1">
                -₹{monthlyPlatformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#64748B] mt-1">Covers payment gateway & support</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#F0FDFA] border border-[#2DD4BF] shadow-xs">
              <div className="text-xs font-bold text-[#0F766E]">Projected Host Net Payout</div>
              <div className="text-2xl font-black text-[#0F766E] font-mono mt-1">
                ₹{monthlyHostNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-[#027A48] font-semibold mt-1">88% Disbursed Weekly to Bank</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
