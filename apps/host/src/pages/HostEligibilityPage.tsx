import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostEligibilityPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  const [clearanceMet, setClearanceMet] = useState(true);
  const [cctvActive, setCctvActive] = useState(true);
  const [barrierAutomated, setBarrierAutomated] = useState(true);
  const [evReady, setEvReady] = useState(true);
  const [twoWheelerSupport, setTwoWheelerSupport] = useState(true);
  const [fireSafetyApproved, setFireSafetyApproved] = useState(true);

  const criteriaCount = [
    clearanceMet,
    cctvActive,
    barrierAutomated,
    evReady,
    twoWheelerSupport,
    fireSafetyApproved,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/90 backdrop-blur-xl border-b border-[#E2E8F0] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold font-['Plus_Jakarta_Sans'] shadow-xs">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#141B2C] leading-tight tracking-tight">
                  {tenant.displayName}
                </span>
                <span className="text-[10px] uppercase text-[#64748B] font-semibold tracking-wider">
                  Host Workspace
                </span>
              </div>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9EDFF] text-[#006B5F] text-xs">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span className="font-medium text-[#3E4947]">256-Bit SSL Encrypted</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] font-mono">PE-HW-01-07</span>
            <button
              onClick={() => onNavigate('/host/onboarding')}
              className="text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer"
            >
              Back to Launchpad
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span className="px-2 py-0.5 rounded bg-[#E9EDFF] text-[#0F766E] font-bold">
              Anna Nagar Plaza (#FAC-0104)
            </span>
            <span>/</span>
            <span className="font-semibold text-[#141B2C]">
              Step 3 of 4: Eligibility & Space Requirements
            </span>
          </div>

          <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-[#E2E8F0] shadow-xs text-xs">
            <span className="material-symbols-outlined text-[#0F766E] text-[16px]">pie_chart</span>
            <span className="font-bold text-[#141B2C]">{criteriaCount} of 6 Criteria Fulfilled</span>
          </div>
        </div>

        {/* Header Banner Area */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-1.5 text-[#0F766E] text-xs font-bold uppercase tracking-widest mb-1">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Operational Pre-Flight Gate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
              Space Listing Eligibility & Required Information
            </h1>
            <p className="text-sm text-[#64748B] leading-relaxed mt-1">
              Ensure your parking facility meets safety, vehicular clearance, and operational criteria prior to marketplace publication. Eligibility review is pending formal host verification and operational inspection.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-xs shrink-0">
            <div className="flex flex-col pr-4 border-r border-[#E2E8F0]">
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Clearance Cap</span>
              <span className="text-sm font-bold text-[#141B2C]">2.2m Standard</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Bays Ready</span>
              <span className="text-sm font-bold text-[#0F766E]">Not verified</span>
            </div>
          </div>
        </div>

        {/* Criteria Checklist Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <input
              type="checkbox"
              checked={clearanceMet}
              onChange={(e) => setClearanceMet(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded mt-0.5 cursor-pointer"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#141B2C] block text-sm mb-0.5">
                Vehicular Height & Entry Clearance
              </span>
              <p className="text-[#64748B] leading-relaxed">
                Facility provides at least 2.1m vertical clearance across ingress/egress ramps suitable for standard SUVs and sedans.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <input
              type="checkbox"
              checked={cctvActive}
              onChange={(e) => setCctvActive(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded mt-0.5 cursor-pointer"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#141B2C] block text-sm mb-0.5">
                24/7 CCTV & Security Marshalling
              </span>
              <p className="text-[#64748B] leading-relaxed">
                Active high-definition camera surveillance covering parking bays and entry gate with minimum 14-day local DVR retention.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <input
              type="checkbox"
              checked={barrierAutomated}
              onChange={(e) => setBarrierAutomated(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded mt-0.5 cursor-pointer"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#141B2C] block text-sm mb-0.5">
                Boom Barrier or Dedicated Gate Marshal
              </span>
              <p className="text-[#64748B] leading-relaxed">
                Facility possesses an electronic barrier arm or manned gate attendee during active marketplace reservation windows.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <input
              type="checkbox"
              checked={evReady}
              onChange={(e) => setEvReady(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded mt-0.5 cursor-pointer"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#141B2C] block text-sm mb-0.5">
                Dedicated EV Charging Station Slots
              </span>
              <p className="text-[#64748B] leading-relaxed">
                Dedicated 7.4kW Type-2 AC chargers or 15A high-power industrial sockets available with sub-metered telemetry.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <input
              type="checkbox"
              checked={twoWheelerSupport}
              onChange={(e) => setTwoWheelerSupport(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded mt-0.5 cursor-pointer"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#141B2C] block text-sm mb-0.5">
                Two-Wheeler (Motorcycle/Scooter) Bays
              </span>
              <p className="text-[#64748B] leading-relaxed">
                Demarcated zones for commuter 2-wheelers with anti-slip flooring and distinct slot numbering.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
            <input
              type="checkbox"
              checked={fireSafetyApproved}
              onChange={(e) => setFireSafetyApproved(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded mt-0.5 cursor-pointer"
            />
            <div className="flex-1 text-xs">
              <span className="font-bold text-[#141B2C] block text-sm mb-0.5">
                Fire Safety & Emergency Exit Routes
              </span>
              <p className="text-[#64748B] leading-relaxed">
                Functional dry chemical fire extinguishers, marked exit pathways, and illuminated signage per local civic code.
              </p>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <button
            type="button"
            onClick={() => onNavigate('/host/onboarding/profile')}
            className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#141B2C] hover:bg-[#F8FAFC] cursor-pointer"
          >
            ← Back to Profile
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/application-status')}
            className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#005C55] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Proceed to Application Status Audit →</span>
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_07</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
