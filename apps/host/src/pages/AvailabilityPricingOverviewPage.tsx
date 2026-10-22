import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function AvailabilityPricingOverviewPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<ParkingFacility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.facilities.list();
      setFacilities(list);
      if (list.length > 0) {
        setSelectedFacility(list[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load pricing overview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#64748B]">Auditing Facility Tariffs & Schedules...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <span>Host Workspace</span>
              <span>/</span>
              <span>Facilities</span>
              <span>/</span>
              <span>{selectedFacility?.name || 'Anna Nagar Plaza'}</span>
              <span>/</span>
              <span className="text-[#0F766E]">Tariffs & Overview (pe_hw_03_01)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Facility Tariffs & Availability Overview
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-xs font-bold uppercase">
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Consolidated operational control of hourly rates, operating schedules, peak multipliers, and bookable allocation across 24 bays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedFacility?.id || ''}
              onChange={(e) => {
                const f = facilities.find((item) => item.id === e.target.value);
                if (f) setSelectedFacility(f);
              }}
              className="px-3 py-2 text-xs font-bold border border-[#CBD5E1] rounded-xl bg-white text-[#141B2C] outline-none"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facilityCode})
                </option>
              ))}
            </select>

            <button
              onClick={() => onNavigate('/host/pricing/rates')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              ⚙️ Configure Rates
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-medium text-[#991B1B]">
            {error}
          </div>
        )}

        {/* 4-COLUMN RATE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Standard Car Base</span>
              <span className="text-lg">🚙</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Dynamic <span className="text-xs font-normal text-[#64748B]">/ hour</span>
            </div>
            <div className="text-[11px] text-[#027A48] font-semibold mt-1">Configured per space</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Two-Wheeler Tariff</span>
              <span className="text-lg">🛵</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              ₹20.00 <span className="text-xs font-normal text-[#64748B]">/ hour</span>
            </div>
            <div className="text-[11px] text-[#027A48] font-semibold mt-1">Dedicated Bike Zone</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>EV Fast Charger Station</span>
              <span className="text-lg">⚡</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              ₹60.00 <span className="text-xs font-normal text-[#64748B]">/ hour</span>
            </div>
            <div className="text-[11px] text-[#0F766E] font-semibold mt-1">22kW Type 2 Included</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Daily Maximum Cap</span>
              <span className="text-lg">📅</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              ₹250.00 <span className="text-xs font-normal text-[#64748B]">/ 24 hrs</span>
            </div>
            <div className="text-[11px] text-[#027A48] font-semibold mt-1">Long-stay incentive</div>
          </div>
        </div>

        {/* 2-COLUMN OPERATIONAL SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLS: PRICING MATRIX TABLE */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>📊</span>
                <span>Configured Space Pricing Matrix</span>
              </h2>
              <button
                onClick={() => onNavigate('/host/pricing/bulk')}
                className="text-xs font-bold text-[#0F766E] hover:underline"
              >
                Bulk Modifier →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-2.5 px-3">Vehicle / Space Tier</th>
                    <th className="py-2.5 px-3">Base Tariff</th>
                    <th className="py-2.5 px-3">Peak Multiplier</th>
                    <th className="py-2.5 px-3">Daily Cap</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#141B2C] flex items-center gap-1.5">
                      <span>🚙</span> Standard Sedan / Hatchback
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#0F766E]">Configured rate</td>
                    <td className="py-3 px-3 text-[#64748B]">1.25x (Rush Hr)</td>
                    <td className="py-3 px-3 font-semibold">₹250.00</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onNavigate('/host/pricing/rates')}
                        className="text-[#0F766E] hover:underline font-bold"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#141B2C] flex items-center gap-1.5">
                      <span>⚡</span> EV Charging Bay (A-04)
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#0F766E]">₹60.00/hr</td>
                    <td className="py-3 px-3 text-[#64748B]">1.25x (Rush Hr)</td>
                    <td className="py-3 px-3 font-semibold">₹350.00</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onNavigate('/host/pricing/rates')}
                        className="text-[#0F766E] hover:underline font-bold"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#141B2C] flex items-center gap-1.5">
                      <span>🛵</span> Two-Wheeler / Scooter
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#0F766E]">₹20.00/hr</td>
                    <td className="py-3 px-3 text-[#64748B]">1.0x (Flat)</td>
                    <td className="py-3 px-3 font-semibold">₹120.00</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onNavigate('/host/pricing/rates')}
                        className="text-[#0F766E] hover:underline font-bold"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#141B2C] flex items-center gap-1.5">
                      <span>♿</span> Accessible Priority Bay
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#0F766E]">Configured rate</td>
                    <td className="py-3 px-3 text-[#64748B]">1.0x (Subsidized)</td>
                    <td className="py-3 px-3 font-semibold">₹200.00</td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => onNavigate('/host/pricing/rates')}
                        className="text-[#0F766E] hover:underline font-bold"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* QUICK LINKS */}
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('/host/pricing/schedule')}
                className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
              >
                📅 Weekly Schedule
              </button>
              <button
                onClick={() => onNavigate('/host/pricing/closures')}
                className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
              >
                🚫 Date Closures
              </button>
              <button
                onClick={() => onNavigate('/host/pricing/estimate')}
                className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
              >
                💰 Earnings Simulator
              </button>
              <button
                onClick={() => onNavigate('/host/pricing/history')}
                className="px-3.5 py-1.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
              >
                📜 Audit Log
              </button>
            </div>
          </div>

          {/* RIGHT 5 COLS: 24-HOUR SURGE MULTIPLIER CURVE */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>📈</span>
                <span>24-Hour Surge Multiplier Curve</span>
              </h2>
              <span className="text-[10px] font-mono text-[#0F766E] font-bold bg-[#CCFBF1] px-2 py-0.5 rounded">
                Dynamic Tier
              </span>
            </div>

            <p className="text-xs text-[#64748B]">
              Peak hours apply 1.25x multiplier during morning (08:00–11:00) and evening rush (17:00–20:00).
            </p>

            {/* SVG SURGE CURVE */}
            <div className="bg-[#0B132B] rounded-xl p-4 text-white relative">
              <div className="flex justify-between text-[10px] font-mono text-[#64D2FF] mb-2">
                <span>OFF-PEAK: 1.0x (₹40/hr)</span>
                <span>PEAK SURGE: 1.25x (₹50/hr)</span>
              </div>
              <svg viewBox="0 0 300 120" className="w-full h-auto">
                {/* Grid Lines */}
                <line x1="20" y1="90" x2="280" y2="90" stroke="#1E293B" strokeWidth="1" />
                <line x1="20" y1="50" x2="280" y2="50" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
                {/* Curve */}
                <path
                  d="M 20 90 Q 60 90, 80 85 Q 100 45, 120 45 Q 140 85, 160 85 Q 180 85, 200 45 Q 220 45, 240 85 L 280 90"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="3"
                />
                {/* Peak 1 Point */}
                <circle cx="110" cy="45" r="4" fill="#F43F5E" />
                <text x="110" y="35" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">09:00 (1.25x)</text>
                {/* Peak 2 Point */}
                <circle cx="210" cy="45" r="4" fill="#F43F5E" />
                <text x="210" y="35" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">18:00 (1.25x)</text>
                {/* Hour Labels */}
                <text x="20" y="105" fill="#64748B" fontSize="8">00:00</text>
                <text x="110" y="105" fill="#64748B" fontSize="8">08:00</text>
                <text x="160" y="105" fill="#64748B" fontSize="8">14:00</text>
                <text x="210" y="105" fill="#64748B" fontSize="8">18:00</text>
                <text x="280" y="105" fill="#64748B" fontSize="8">24:00</text>
              </svg>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
              <span>Automatic Surge Trigger:</span>
              <span className="font-bold text-[#0F766E]">Active on Occupancy &gt; 80%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
