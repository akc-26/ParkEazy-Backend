import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';

interface Props {
  onNavigate: (path: string) => void;
}

type ExceptionType =
  | 'role_forbidden'
  | 'contact_unverified'
  | 'rate_limit_lockout'
  | 'compliance_hold'
  | 'session_revoked'
  | 'barrier_offline';

export function HostAccessExceptionsPage({ onNavigate }: Props) {
  const { tenant } = useBrand();
  const [activeTab, setActiveTab] = useState<ExceptionType>('role_forbidden');

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
            <span className="text-xs text-[#64748B] font-mono">PE-HW-01-09</span>
            <button
              onClick={() => onNavigate('/host/login')}
              className="text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-3xl space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9EDFF] text-[#0F766E] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-[16px]">rule</span>
              <span>Exception Protocol • PE-HW-01-09</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
              Host Access & Onboarding Exception Reference
            </h1>
            <p className="text-sm text-[#64748B]">
              Operational UI standards for handling authentication failures, verification expiries, compliance holds, and service interruptions.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-[#0F766E] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
              <span>Audit Mode: Strict</span>
            </div>
            <span className="text-[#94A3B8]">•</span>
            <span className="text-xs font-mono font-bold text-[#141B2C]">6 Matrix Blueprints</span>
          </div>
        </div>

        {/* Operational Guardrails Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#E6F7F4] text-[#0F766E]">
              <span className="material-symbols-outlined text-[20px]">shield_person</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#141B2C]">Zero Unhandled Traces</h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">Raw stack strings suppressed. Only actionable, consumer-safe remediation routes.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#FEF6E7] text-[#D97706]">
              <span className="material-symbols-outlined text-[20px]">sync_saved_locally</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#141B2C]">Offline Fallback Native</h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">Hardware anomalies automatically preserve entry manifests via edge cache.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#E9EDFF] text-[#006B5F]">
              <span className="material-symbols-outlined text-[20px]">lock_reset</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#141B2C]">Enumeration Safe</h4>
              <p className="text-[11px] text-[#64748B] mt-0.5">Identity discovery timing attacks neutralised via uniform constant delays.</p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-[#E2E8F0]">
          {[
            { id: 'role_forbidden', label: '1. Role Mismatch (403)' },
            { id: 'contact_unverified', label: '2. Unverified Endpoints' },
            { id: 'rate_limit_lockout', label: '3. Rate Limit Lockout (429)' },
            { id: 'compliance_hold', label: '4. Compliance Hold' },
            { id: 'session_revoked', label: '5. Session Revoked (401)' },
            { id: 'barrier_offline', label: '6. Barrier Hardware Offline' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ExceptionType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#141B2C]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Exception Display Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#E2E8F0] shadow-md mb-8">
          {activeTab === 'role_forbidden' && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF3F2] text-[#B42318] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">no_accounts</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#FEF3F2] text-[#B42318] text-xs font-bold uppercase tracking-wider inline-block">
                HTTP 403 • FORBIDDEN ROLE
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C]">
                Host Workspace Authorization Required
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                The authenticated credential belongs to a Driver / Customer marketplace account. Customer profiles do not have administrative telemetry rights over parking bays or gate relays.
              </p>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-left text-xs text-[#64748B] space-y-1">
                <div className="font-bold text-[#141B2C]">Remediation Actions:</div>
                <div>• Sign out and authenticate with your registered Host Partner credentials.</div>
                <div>• If you own parking spaces, register as a host partner via the onboarding pipeline.</div>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => onNavigate('/host/login')}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Switch to Host Login
                </button>
                <button
                  onClick={() => onNavigate('/')}
                  className="px-5 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Return to Driver App
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contact_unverified' && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF6E7] text-[#D97706] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">phonelink_lock</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#FEF6E7] text-[#D97706] text-xs font-bold uppercase tracking-wider inline-block">
                ACCESS GATEWAY • VERIFICATION HOLD
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C]">
                Mobile OTP or Email Unverified
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Before gate marshalls can issue parking access codes or view live driver telemetry, both your official email and SMS endpoints must complete dual-handshake verification.
              </p>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-left text-xs text-[#64748B]">
                <span className="font-bold text-[#141B2C] block mb-1">Pending Challenge:</span>
                <span>Verification code was sent to registered telephone line (+91 98401 98820).</span>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => onNavigate('/host/verify')}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Complete Dual Verification
                </button>
              </div>
            </div>
          )}

          {activeTab === 'rate_limit_lockout' && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF3F2] text-[#B42318] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">timer_off</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#FEF3F2] text-[#B42318] text-xs font-bold uppercase tracking-wider inline-block">
                HTTP 429 • TOO MANY REQUESTS
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C]">
                Workstation Temporarily Locked
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Exceeded maximum permissible authentication attempts (5 failures in 5 minutes). In order to safeguard facility node telemetry, your subnet has been restricted for 15 minutes.
              </p>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
                <span>Lockout expires automatically in:</span>
                <span className="font-mono font-bold text-[#B42318] text-sm">11:42 mins</span>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => onNavigate('/host/forgot-password')}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Reset Password via Verified Email
                </button>
              </div>
            </div>
          )}

          {activeTab === 'compliance_hold' && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF6E7] text-[#D97706] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">gavel</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#FEF6E7] text-[#D97706] text-xs font-bold uppercase tracking-wider inline-block">
                COMPLIANCE REVIEW • INVENTORY PAUSED
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C]">
                Commercial Lease Documentation Required
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your facility application for <strong>Anna Nagar Plaza</strong> is temporarily held pending submission of building association NOC or registered lease agreement.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => onNavigate('/host/onboarding/profile')}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Upload Commercial NOC
                </button>
              </div>
            </div>
          )}

          {activeTab === 'session_revoked' && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] text-[#141B2C] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">vpn_key_alert</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#F1F5F9] text-[#64748B] text-xs font-bold uppercase tracking-wider inline-block">
                HTTP 401 • SESSION TERMINATED
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C]">
                Host Access Token Revoked
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your workstation credentials were invalidated due to a concurrent session login from another terminal or an administrative password reset.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => onNavigate('/host/login')}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Re-Authenticate Host Terminal
                </button>
              </div>
            </div>
          )}

          {activeTab === 'barrier_offline' && (
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FEF6E7] text-[#D97706] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">wifi_off</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#FEF6E7] text-[#D97706] text-xs font-bold uppercase tracking-wider inline-block">
                GATE TELEMETRY • OFFLINE EDGE
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C]">
                Automated Barrier Relay Disconnected
              </h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Gate Node ANPR-BLR-01 heartbeat missed for &gt;45 seconds. Local fallback mode is active: drivers can present static QR tokens to on-ground gate marshalls without automated barcode lift.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => onNavigate('/host/')}
                  className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  View Offline Gate Manifest
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_09</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
