import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
  targetDestinationName?: string;
  targetDestinationPath?: string;
}

export function CustomerAccessSuccessPage({
  currentUser,
  onNavigate,
  targetDestinationName = 'Parking Details — Anna Nagar (PE-UW-04-01)',
  targetDestinationPath = '/',
}: Props) {
  const { tenant } = useBrand();
  const [secondsRemaining, setSecondsRemaining] = useState(3);

  useEffect(() => {
    if (secondsRemaining > 0) {
      const timer = setTimeout(() => setSecondsRemaining((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onNavigate(targetDestinationPath);
    }
  }, [secondsRemaining, targetDestinationPath]);

  const userName = currentUser?.fullName || 'Arun Kumar';
  const userEmail = currentUser?.email || 'driver.arun@parkeazy.com';
  const userPhone = currentUser?.phone || '+91 98401 22345';

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
              <span className="hidden lg:inline-block font-label-sm text-label-sm uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Verified Session
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
        {/* Glow Spheres */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-secondary-fixed-dim/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-80 h-80 bg-primary-fixed/25 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[620px] bg-surface-container-lowest rounded-2xl shadow-xl p-8 sm:p-12 border border-outline-variant/20 flex flex-col items-center text-center">
          {/* Top Decorative Verification Halo & Icon */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute w-24 h-24 rounded-full bg-secondary-container/40 animate-ping opacity-60" />
            <div className="absolute w-20 h-20 rounded-full bg-primary-fixed-dim/30 blur-xs" />
            <div className="relative w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                <path className="opacity-90" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path className="text-white" d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2.7" />
              </svg>
            </div>
          </div>

          {/* Subtitle Badge */}
          <div className="inline-flex items-center gap-2 bg-surface-container-high px-3.5 py-1 rounded-full text-primary font-label-md text-label-md mb-2 uppercase tracking-wider font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Authentication Verified</span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight mb-2">
            Account verified & ready
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[490px] mb-6">
            Your credentials have been securely established. You have full access to search, book, and unlock automated gate barriers across ParkEazy hubs.
          </p>

          {/* Driver Profile Summary Card */}
          <div className="w-full bg-surface-container-low rounded-xl p-5 mb-6 text-left border border-outline-variant/20 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container font-extrabold text-base shrink-0 border border-primary-container/20">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{userName}</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {userEmail} • {userPhone}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>Verified Citizen Parker</span>
              </span>
            </div>

            {/* Metric Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center text-primary mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">contactless</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Automated Barrier Pass
                  </div>
                  <div className="font-mono text-xs font-bold text-on-surface">
                    Active • Synced with FastTag / RFID
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded bg-surface-container-high flex items-center justify-center text-primary mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">electric_car</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Default Vehicle
                  </div>
                  <div className="font-mono text-xs font-bold text-on-surface">
                    TN 09 BX 4291 • EV Compatible
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Redirection Notice & Progress Tracker */}
          <div className="w-full bg-surface-container rounded-xl p-4 mb-6 text-left border border-outline-variant/20">
            <div className="flex items-center justify-between text-on-surface-variant mb-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[16px]">navigation</span>
                <span className="text-on-surface font-medium">
                  Returning you to: <strong className="text-primary-container">{targetDestinationName}</strong>
                </span>
              </div>
              <span className="font-mono font-bold text-primary-container text-xs">
                {secondsRemaining}s
              </span>
            </div>
            {/* Live Countdown Progress Bar */}
            <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Action Cluster */}
          <div className="w-full flex flex-col gap-2.5 mb-4">
            <button
              onClick={() => onNavigate(targetDestinationPath)}
              className="w-full h-11 bg-primary-container hover:bg-[#005c55] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Continue to ParkEazy</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-primary-container hover:underline font-semibold cursor-pointer py-1"
            >
              Go to Marketplace Homepage
            </button>
          </div>

          {/* Security Endorsement */}
          <div className="flex items-center justify-center gap-1.5 text-on-surface-variant text-xs pt-2">
            <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            <span>Session secured with end-to-end cryptographic tokens.</span>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. FastTag ANPR Terminal Handshake Active.
      </footer>
    </div>
  );
}
