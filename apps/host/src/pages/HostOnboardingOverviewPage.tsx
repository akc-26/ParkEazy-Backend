import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostOnboardingOverviewPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

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
            <span className="text-xs text-[#64748B] font-mono">PE-HW-01-05</span>
            <button
              onClick={() => onNavigate('/host/login')}
              className="text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Top breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">domain</span> Host Hub
            </span>
            <span>/</span>
            <span>Inventory Preparation</span>
            <span>/</span>
            <span className="text-[#0F766E] font-semibold">Launchpad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#E9EDFF] px-2.5 py-1 rounded-full text-xs text-[#141B2C]">
              <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
              <span className="text-[11px] font-medium">Auto-Saving Active</span>
            </div>
            <span className="text-xs text-[#64748B] font-mono">Ref ID: PK-BLR-8921</span>
          </div>
        </div>

        {/* Primary Header & Overview Header Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm mb-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                <span className="font-bold text-[#141B2C]">
                  {currentUser?.fullName || 'Kavitha Rajan'}
                </span>
                <span className="text-[#94A3B8]">•</span>
                <span className="text-[#64748B] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#0F766E] text-[16px]">location_on</span>
                  Anna Nagar Plaza
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F7F4] text-[#0F766E] font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                  In Progress • 2 of 4 Milestones Completed
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
                Host Onboarding & Facility Launchpad
              </h1>
              <p className="text-sm text-[#64748B]">
                Complete your profile and space specifications to list your parking inventory on the {tenant.displayName} marketplace.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-bold">Setup Velocity</div>
                <div className="text-lg font-bold text-[#0F766E]">Stage 2 Active</div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-xl font-['Plus_Jakarta_Sans']">
                50%
              </div>
            </div>
          </div>

          {/* Progress Ribbon */}
          <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-[#141B2C] flex items-center gap-1">
                <span className="material-symbols-outlined text-[#0F766E] text-[16px]">speed</span>
                Overall Completion: 50%
              </span>
              <span className="text-[#64748B]">Approx 6 mins remaining</span>
            </div>
            <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-[#0F766E] rounded-full transition-all duration-700" style={{ width: '50%' }} />
            </div>
          </div>
        </div>

        {/* Milestone Cards Grid */}
        <div className="space-y-4 mb-8">
          {/* Milestone 1 */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF3] text-[#027A48] flex items-center justify-center font-bold text-sm shrink-0">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#027A48] tracking-wider">Milestone 01</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48] text-[10px] font-bold">Completed</span>
                </div>
                <h3 className="font-bold text-sm text-[#141B2C]">Host Partner Identity & Credentials</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Dual endpoint verification of email and mobile telephone.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/host/verify')}
              className="px-4 py-2 bg-[#F1F5F9] text-[#64748B] rounded-xl text-xs font-semibold hover:bg-[#E2E8F0] cursor-pointer"
            >
              View Verification
            </button>
          </div>

          {/* Milestone 2 */}
          <div className="bg-white rounded-2xl p-6 border-2 border-[#0F766E] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#0F766E] tracking-wider">Milestone 02</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E6F7F4] text-[#0F766E] text-[10px] font-bold">In Progress</span>
                </div>
                <h3 className="font-bold text-sm text-[#141B2C]">Host Profile & Facility Contact Details</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Administrative records, on-ground marshalls, and escalation dispatch.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/host/onboarding/profile')}
              className="px-4 py-2 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span>Continue Setup</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Milestone 3 */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 opacity-75">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">Milestone 03</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold">Pending Profile</span>
                </div>
                <h3 className="font-bold text-sm text-[#141B2C]">Space Listing Eligibility & Physical Criteria</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Vehicular clearance cap, CCTV coverage, and EV charger capabilities.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/host/onboarding/eligibility')}
              className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Inspect Criteria
            </button>
          </div>

          {/* Milestone 4 */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 opacity-75">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center font-bold text-sm shrink-0">
                4
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">Milestone 04</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold">Pending Review</span>
                </div>
                <h3 className="font-bold text-sm text-[#141B2C]">Technical Review & Application Status</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Pre-flight readiness audit and live marketplace publication status.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/host/application-status')}
              className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] rounded-xl text-xs font-semibold cursor-pointer"
            >
              View Application
            </button>
          </div>
        </div>

        {/* Bottom Operations Notice */}
        <div className="bg-[#F1F5F9] rounded-2xl p-4 border border-[#CBD5E1] flex items-center justify-between text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0F766E] text-[18px]">verified_user</span>
            <span>Production onboarding is enumeration-safe and audited per tenant protocol.</span>
          </div>
          <button
            onClick={() => onNavigate('/host/')}
            className="text-[#0F766E] font-bold hover:underline cursor-pointer"
          >
            Launch Host Dashboard Preview →
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_05</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
