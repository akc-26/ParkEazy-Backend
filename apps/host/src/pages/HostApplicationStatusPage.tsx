import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostApplicationStatusPage({ currentUser, onNavigate }: Props) {
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
            <span className="text-xs text-[#64748B] font-mono">PE-HW-01-08</span>
            <button
              onClick={() => onNavigate('/host/')}
              className="text-xs text-[#0F766E] font-bold hover:underline cursor-pointer"
            >
              Launch Dashboard Preview →
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Breadcrumb & Facility identifier */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-xs text-[#64748B] flex-wrap">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[#0F766E]">domain</span>
              <span className="font-semibold text-[#141B2C]">Anna Nagar Plaza (#FAC-0104)</span>
            </div>
            <span>/</span>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[#0F766E]">person</span>
              <span>Host: <strong>{currentUser?.fullName || 'Kavitha Rajan'}</strong></span>
            </div>
            <span>/</span>
            <span className="px-2 py-0.5 rounded bg-[#E2E8F0] font-mono text-[11px]">ID: 884-AP-IN</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/host/exceptions')}
              className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#141B2C] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#0F766E]">support_agent</span>
              <span>Contact Concierge</span>
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="px-3 py-1.5 rounded-lg bg-[#E6F7F4] text-[#0F766E] hover:bg-[#CCFBF1] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Preview Public Listing</span>
            </button>
          </div>
        </div>

        {/* Page Title Block */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
            Host Facility Application & Setup Status
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-3xl">
            Track the operational review, safety compliance, and telemetric verification status of your parking lot before live publishing.
          </p>
        </div>

        {/* Hero Status Command Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF6E7] text-[#D97706] flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[28px]">hourglass_top</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-3 py-0.5 rounded-full bg-[#FEF6E7] text-[#D97706] text-xs font-bold uppercase tracking-wider">
                    Under Technical Review
                  </span>
                  <span className="text-xs text-[#64748B] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
                    Estimated Completion: Within 24 Hours
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Physical Bay & ANPR Camera Pre-Flight Verification
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Our regional operations engineer is validating gate coordinate geotags and barrier relay latency tests.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-[#64748B]">Verification Score</div>
                <div className="text-xl font-bold text-[#0F766E]">85 / 100</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-sm">
                85%
              </div>
            </div>
          </div>

          <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#D97706] rounded-full" style={{ width: '85%' }} />
          </div>
        </div>

        {/* 4-Stage Operational Audit Pipeline */}
        <div className="space-y-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#ECFDF3] text-[#027A48] flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-[#141B2C] block">
                  Stage 1: Identity & GSTIN Entity Validation
                </span>
                <span className="text-[11px] text-[#64748B]">Verified against Ministry of Corporate Affairs and GST portal.</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#027A48] text-xs font-bold">Passed</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#ECFDF3] text-[#027A48] flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold text-[#141B2C] block">
                  Stage 2: Space Clearance & Vehicular Safety Review
                </span>
                <span className="text-[11px] text-[#64748B]">24 dedicated bays mapped, fire compliance criteria checked.</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#027A48] text-xs font-bold">Passed</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border-2 border-[#D97706] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#FEF6E7] text-[#D97706] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <span className="text-xs font-bold text-[#141B2C] block">
                  Stage 3: Gate IoT Barrier & QR Relay Latency Test
                </span>
                <span className="text-[11px] text-[#64748B]">Checking simulated barcode scanner and ANPR API response times (&lt;450ms).</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FEF6E7] text-[#D97706] text-xs font-bold animate-pulse">Running</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-xs flex items-center justify-between opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <span className="text-xs font-bold text-[#141B2C] block">
                  Stage 4: Public Driver Marketplace Publication
                </span>
                <span className="text-[11px] text-[#64748B]">Activation of driver booking slot inventory across Chennai metro map.</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] text-xs font-bold">Pending Stage 3</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <button
            onClick={() => onNavigate('/host/onboarding/eligibility')}
            className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#141B2C] hover:bg-[#F8FAFC] cursor-pointer"
          >
            ← Back to Eligibility
          </button>

          <button
            onClick={() => onNavigate('/host/')}
            className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#005C55] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Enter Host Operations Console →</span>
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_08</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
