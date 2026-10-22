import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';

interface Props {
  onNavigate: (path: string) => void;
  returnUrl?: string;
}

export function CustomerSessionExpiredPage({ onNavigate, returnUrl }: Props) {
  const { tenant } = useBrand();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleReauth = () => {
    setIsRedirecting(true);
    setTimeout(() => {
      onNavigate(returnUrl ? `/login?return=${encodeURIComponent(returnUrl)}` : '/login');
    }, 600);
  };

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
              <span>Back to ParkEazy</span>
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
                Session Control
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
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[520px] bg-surface-container-lowest rounded-2xl shadow-xl p-8 sm:p-10 border border-outline-variant/20 flex flex-col items-center text-center">
          {/* Lock Clock Icon with Badge */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-xs flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[30px]">lock_clock</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-container text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary-container text-xs font-semibold mb-3 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
            <span>SECURITY TIMEOUT • 30 MIN INACTIVITY</span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight mb-2">
            Your session has expired
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[420px] mb-6">
            For your security and to protect your reserved parking passes, sessions automatically expire after 30 minutes of inactivity.
          </p>

          {/* Reassurance Card */}
          <div className="w-full bg-surface-container-low rounded-xl p-4 text-left mb-6 border border-outline-variant/20 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-surface-container-highest text-primary-container shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">shield</span>
              </div>
              <div>
                <span className="font-body-md-medium text-body-md-medium text-on-surface font-semibold block">
                  Rest assured: Your data is secure
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Any confirmed parking bookings, payments, or barrier QR passes remain safe and unchanged on our servers. You will be returned to your active page upon sign-in.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleReauth}
              disabled={isRedirecting}
              className="w-full h-11 bg-primary-container hover:bg-[#005c55] text-white rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRedirecting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Redirecting to authentication...</span>
                </>
              ) : (
                <>
                  <span>Log In Again</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>

            <button
              onClick={() => onNavigate('/')}
              className="w-full py-2.5 text-center text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Return to ParkEazy Homepage</span>
            </button>
          </div>

          {/* Diagnostic Footnote */}
          <div className="w-full mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-between text-[11px] text-outline">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-primary-container">dns</span>
              <span>Node: MAA-SEC-1</span>
            </span>
            <span>Session ID: #SES-9824X</span>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. End-to-End Cryptographic Session Security.
      </footer>
    </div>
  );
}
