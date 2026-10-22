import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';

interface Props {
  onNavigate: (path: string) => void;
}

export function CustomerAuthErrorStatesPage({ onNavigate }: Props) {
  const { tenant } = useBrand();
  const [activeFilter, setActiveFilter] = useState<'all' | 'field' | 'credential' | 'system'>('all');

  const errorScenarios = [
    {
      id: 'sc-01',
      category: 'field',
      title: 'Required Field Missing',
      badge: 'Input Required',
      badgeClass: 'bg-error-container text-on-error-container',
      description: 'Triggered during form submission when mandatory identifier or password fields are left blank.',
      trigger: 'Client schema validation blur',
      remediation: 'Enter your registered email address and password before submitting.',
      actionText: 'Go to Sign In',
      actionPath: '/login',
    },
    {
      id: 'sc-02',
      category: 'field',
      title: 'Invalid Email or Mobile Syntax',
      badge: 'Format Error',
      badgeClass: 'bg-amber-100 text-amber-800',
      description: 'Triggered when entry violates RFC 5322 email syntax or Indian E.164 (+91) 10-digit mobile number rules.',
      trigger: 'RegEx validation mismatch',
      remediation: 'Ensure your phone number has 10 valid digits without special characters.',
      actionText: 'Verify Mobile OTP',
      actionPath: '/verify-mobile',
    },
    {
      id: 'sc-03',
      category: 'field',
      title: 'Password Complexity Requirements',
      badge: 'Policy Enforcement',
      badgeClass: 'bg-amber-100 text-amber-800',
      description: 'Triggered when chosen password lacks 8+ chars, upper/lowercase letters, numbers, or symbols.',
      trigger: 'OWASP security password policy',
      remediation: 'Supply a passphrase meeting all 4 complexity categories.',
      actionText: 'Reset Password',
      actionPath: '/reset-password',
    },
    {
      id: 'sc-04',
      category: 'credential',
      title: 'Invalid Credentials (401 Unauthorized)',
      badge: 'Authentication Failed',
      badgeClass: 'bg-error-container text-on-error-container',
      description: 'The supplied email and password hash do not match records in the database.',
      trigger: 'PBKDF2 constant-time verification failure',
      remediation: 'Double-check password capitalization or use the forgot password workflow.',
      actionText: 'Forgot Password?',
      actionPath: '/forgot-password',
    },
    {
      id: 'sc-05',
      category: 'credential',
      title: 'Expired or Invalid OTP Challenge',
      badge: 'Token Stale',
      badgeClass: 'bg-amber-100 text-amber-800',
      description: 'The 6-digit verification code has exceeded its 300-second lifespan or was previously consumed.',
      trigger: 'Single-use token expiration timestamp',
      remediation: 'Request a fresh one-time verification challenge via SMS or email.',
      actionText: 'Request New OTP',
      actionPath: '/verify-mobile',
    },
    {
      id: 'sc-06',
      category: 'credential',
      title: 'Account Verification Incomplete',
      badge: 'Step Outstanding',
      badgeClass: 'bg-blue-100 text-blue-800',
      description: 'User registered successfully but has not verified their phone or email required for gate pass generation.',
      trigger: 'isPhoneVerified === false flag check',
      remediation: 'Complete two-factor verification to activate your digital RFID pass.',
      actionText: 'Complete Verification',
      actionPath: '/verification-required',
    },
    {
      id: 'sc-07',
      category: 'system',
      title: 'Rate Limit Lockout (429 Too Many Requests)',
      badge: 'Security Cooldown',
      badgeClass: 'bg-error-container text-on-error-container',
      description: 'Repeated failed attempts have triggered progressive IP and account throttling.',
      trigger: 'Brute-force mitigation filter',
      remediation: 'Wait 15 minutes before re-attempting authentication. Do not send rapid automated requests.',
      actionText: 'Return to Homepage',
      actionPath: '/',
    },
    {
      id: 'sc-08',
      category: 'system',
      title: 'Cross-Tenant Access Denied (403 Forbidden)',
      badge: 'Tenant Isolation',
      badgeClass: 'bg-purple-100 text-purple-800',
      description: 'User credentials authenticated for one tenant attempted to access resources of another white-label partner.',
      trigger: 'TenantGuard multi-tenant barrier',
      remediation: 'Sign in to the specific white-label domain corresponding to your vehicle license.',
      actionText: 'Sign In to Portal',
      actionPath: '/login',
    },
    {
      id: 'sc-09',
      category: 'system',
      title: 'Persistence Service Unavailable (503)',
      badge: 'Infrastructure Error',
      badgeClass: 'bg-rose-100 text-rose-800',
      description: 'Production PostgreSQL connection pool is temporarily unreachable. Silent in-memory bypasses are strictly prevented.',
      trigger: 'DatabaseService health ping failure',
      remediation: 'Verify PostgreSQL connection strings or check server status before retrying.',
      actionText: 'Check Status',
      actionPath: '/',
    },
  ];

  const filteredScenarios =
    activeFilter === 'all'
      ? errorScenarios
      : errorScenarios.filter((s) => s.category === activeFilter);

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/30">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-1.5 text-body-md-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Marketplace</span>
            </button>
            <div className="h-4 w-px bg-outline-variant/40 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
                P
              </div>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                {tenant.displayName}
              </span>
              <span className="hidden lg:inline-block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
                Remediation Guide
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/login')}
            className="text-xs font-semibold text-primary-container hover:underline cursor-pointer"
          >
            Customer Sign In →
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-outline-variant/30">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-container uppercase tracking-wider bg-surface-container px-2.5 py-1 rounded mb-2">
              Security Spec • PE-UW-02-08
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">
              Authentication Error Recovery Guide
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 max-w-3xl">
              Production reference matrix showcasing compliant, enumeration-safe error states, accessible feedback patterns, and user recovery paths across all ParkEazy authentication gateways.
            </p>
          </div>

          {/* Filtering Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-container rounded-xl">
            {(
              [
                { id: 'all', label: 'All States (9)' },
                { id: 'field', label: 'Field-Level' },
                { id: 'credential', label: 'Credentials & OTP' },
                { id: 'system', label: 'System & Limits' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeFilter === t.id
                    ? 'bg-white text-primary-container shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Security Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-xs">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Enumeration Defense
            </span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">100% Blind</span>
            <p className="text-xs text-on-surface-variant mt-1">Zero leakage of user existence delta</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-xs">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              WCAG 2.1 AA Compliance
            </span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">Dual Signal</span>
            <p className="text-xs text-on-surface-variant mt-1">Icon + color + descriptive text</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-xs">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Token Validity Window
            </span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">300s Cap</span>
            <p className="text-xs text-on-surface-variant mt-1">SMS DLT code lifetime enforced</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-xs">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Rate Lockout Threshold
            </span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">15 Minutes</span>
            <p className="text-xs text-on-surface-variant mt-1">Progressive backoff across IP hash</p>
          </div>
        </div>

        {/* Error Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((sc) => (
            <div
              key={sc.id}
              className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold text-on-surface-variant">
                    {sc.id.toUpperCase()}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${sc.badgeClass}`}>
                    {sc.badge}
                  </span>
                </div>

                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
                  {sc.title}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  {sc.description}
                </p>

                <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1 mb-4">
                  <span className="text-[11px] font-bold uppercase text-on-surface-variant block">
                    Trigger Condition:
                  </span>
                  <p className="font-mono text-[11px] text-on-surface">{sc.trigger}</p>
                  <span className="text-[11px] font-bold uppercase text-on-surface-variant block pt-1">
                    Remediation:
                  </span>
                  <p className="text-on-surface">{sc.remediation}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/20">
                <button
                  onClick={() => onNavigate(sc.actionPath)}
                  className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{sc.actionText}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. OWASP ASVS Level 2 Verification Compliant.
      </footer>
    </div>
  );
}
