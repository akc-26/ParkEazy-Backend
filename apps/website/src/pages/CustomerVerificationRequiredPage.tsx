import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function CustomerVerificationRequiredPage({ currentUser, onNavigate, onLogout }: Props) {
  const { tenant } = useBrand();

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
              <span className="hidden lg:inline-block font-label-sm text-label-sm uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                Verification Required
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/auth/error')}
            className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Need help? Support
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-72 h-72 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[540px] bg-surface-container-lowest rounded-2xl shadow-xl p-8 sm:p-10 border border-outline-variant/20 text-center">
          {/* Warning Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-100 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
              <span className="material-symbols-outlined text-[34px]">verified_user</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs text-xs">
              <span className="material-symbols-outlined text-[14px]">priority_high</span>
            </div>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight mb-2">
            Account verification required
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
            To prevent unauthorized parking bay bookings and activate automated boom barrier access, please complete two-factor authentication on your registered account.
          </p>

          {/* User Capsule */}
          {currentUser && (
            <div className="bg-surface-container-low rounded-xl p-3.5 mb-6 text-left border border-outline-variant/20 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Target Account
                </span>
                <span className="text-xs font-bold text-on-surface">
                  {currentUser.fullName} ({currentUser.email})
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                Pending Two-Factor
              </span>
            </div>
          )}

          {/* Action Cards */}
          <div className="space-y-3 mb-8 text-left">
            <button
              onClick={() => onNavigate('/verify-mobile')}
              className="w-full p-4 rounded-xl border border-primary-container/30 bg-primary-fixed/10 hover:bg-primary-fixed/20 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">smartphone</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-on-surface">Verify via Mobile SMS OTP</h3>
                  <p className="text-[11px] text-on-surface-variant">Recommended for instant boom barrier license plate pairing</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-primary-container group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>

            <button
              onClick={() => onNavigate('/verify-email')}
              className="w-full p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container-highest text-on-surface-variant flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-on-surface">Verify via Email Link</h3>
                  <p className="text-[11px] text-on-surface-variant">Receive a cryptographic token in your registered email inbox</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Switch Account */}
          <div className="pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant">
            <span>Wrong user? </span>
            <button
              onClick={() => {
                onLogout();
                onNavigate('/login');
              }}
              className="font-bold text-primary-container hover:underline cursor-pointer"
            >
              Sign out and switch account
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. DLT Indian Telecom Compliant.
      </footer>
    </div>
  );
}
