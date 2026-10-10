import React, { useState, useEffect } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';
import { HostLoginPage } from './pages/HostLoginPage';
import { HostRegisterPage } from './pages/HostRegisterPage';
import { HostVerificationPage } from './pages/HostVerificationPage';
import { HostPasswordRecoveryPage } from './pages/HostPasswordRecoveryPage';
import { HostOnboardingOverviewPage } from './pages/HostOnboardingOverviewPage';
import { HostProfileContactDetailsPage } from './pages/HostProfileContactDetailsPage';
import { HostEligibilityPage } from './pages/HostEligibilityPage';
import { HostApplicationStatusPage } from './pages/HostApplicationStatusPage';
import { HostAccessExceptionsPage } from './pages/HostAccessExceptionsPage';

interface HostAppProps {
  onNavigateToWebsite?: () => void;
  onNavigateToAdmin?: () => void;
}

export function HostPortalContent({ onNavigateToWebsite, onNavigateToAdmin }: HostAppProps = {}) {
  const { tenant } = useBrand();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/host/';
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('parkeazy_host_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthSuccess = (user: UserAccount, tokens: AuthTokenPair) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('parkeazy_host_user', JSON.stringify(user));
      localStorage.setItem('parkeazy_host_token', tokens.accessToken);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parkeazy_host_user');
      localStorage.removeItem('parkeazy_host_token');
    }
    navigateTo('/host/login');
  };

  // 1. Host Login
  if (currentPath === '/host/login') {
    return (
      <HostLoginPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
        returnUrl="/host/"
      />
    );
  }

  // 2. Host Register
  if (currentPath === '/host/register' || currentPath === '/host/signup') {
    return (
      <HostRegisterPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // 3. Host Verification
  if (currentPath === '/host/verify' || currentPath === '/host/verification') {
    return (
      <HostVerificationPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onSuccess={() => {
          if (currentUser) {
            const updated = { ...currentUser, isPhoneVerified: true, isEmailVerified: true };
            setCurrentUser(updated);
            localStorage.setItem('parkeazy_host_user', JSON.stringify(updated));
          }
        }}
      />
    );
  }

  // 4. Host Password Recovery
  if (currentPath === '/host/forgot-password' || currentPath === '/host/password-recovery') {
    return <HostPasswordRecoveryPage onNavigate={navigateTo} />;
  }

  // 5. Host Onboarding Overview
  if (currentPath === '/host/onboarding' || currentPath === '/host/onboarding/overview') {
    return <HostOnboardingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 6. Host Profile & Contacts
  if (currentPath === '/host/onboarding/profile' || currentPath === '/host/profile') {
    return <HostProfileContactDetailsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 7. Host Space Listing Eligibility
  if (currentPath === '/host/onboarding/eligibility' || currentPath === '/host/eligibility') {
    return <HostEligibilityPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 8. Host Application Setup Status
  if (currentPath === '/host/application-status' || currentPath === '/host/onboarding/status') {
    return <HostApplicationStatusPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 9. Host Access & Onboarding Exception States
  if (currentPath === '/host/exceptions' || currentPath === '/host/access-status') {
    return <HostAccessExceptionsPage onNavigate={navigateTo} />;
  }

  // 10. Default Host Operations Dashboard (Grounding in pe_hp_02_01)
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FF] text-[#141B2C] font-['Inter']">
      {/* HOST WORKSPACE HEADER */}
      <header className="sticky top-0 z-50 bg-[#F9F9FF]/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/host/')}
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

            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-[#64748B]">
              <button
                onClick={() => navigateTo('/host/')}
                className="text-[#0F766E] font-bold cursor-pointer"
              >
                Operations Dashboard
              </button>
              <button
                onClick={() => navigateTo('/host/onboarding')}
                className="hover:text-[#141B2C] transition-colors cursor-pointer"
              >
                Facility Launchpad
              </button>
              <button
                onClick={() => navigateTo('/host/onboarding/profile')}
                className="hover:text-[#141B2C] transition-colors cursor-pointer"
              >
                Profile & Contacts
              </button>
              <button
                onClick={() => navigateTo('/host/application-status')}
                className="hover:text-[#141B2C] transition-colors cursor-pointer"
              >
                Review Status
              </button>
              <button
                onClick={() => navigateTo('/host/exceptions')}
                className="hover:text-[#141B2C] transition-colors cursor-pointer"
              >
                Exception Guide
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-[#E6F7F4] border border-[#0F766E]/20 px-3 py-1.5 rounded-full text-xs">
                <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
                <span className="font-bold text-[#0F766E]">
                  {currentUser.fullName || currentUser.email}
                </span>
                <span className="text-[#64748B]">•</span>
                <span className="capitalize font-mono text-[#0F766E]">Host Partner</span>
                <button
                  onClick={handleLogout}
                  className="ml-2 text-[11px] font-bold text-[#D92D20] hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo('/host/login')}
                  className="px-3 py-1.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigateTo('/host/register')}
                  className="px-3 py-1.5 bg-white border border-[#CBD5E1] text-[#141B2C] hover:text-[#0F766E] rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Register Space
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (onNavigateToWebsite) {
                  onNavigateToWebsite();
                } else {
                  navigateTo('/');
                }
              }}
              className="text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer hidden sm:inline-block ml-2"
            >
              Marketplace (/) →
            </button>
          </div>
        </div>
      </header>

      {/* MAIN HOST CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HOST OPERATIONAL CONTEXT BANNER */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full border border-[#0F766E]/20">
                HQ Operation Node
              </span>
              <span className="text-xs font-mono text-[#64748B]">FACILITY ID: #FAC-0104</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48] font-bold">
                18 of 24 Spaces Occupied (75%)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] tracking-tight font-['Plus_Jakarta_Sans'] mt-1">
              Anna Nagar Plaza Parking — 100 Feet Rd
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Real-time terminal sync active • Telemetry refresh rate: 15s • Chennai Urban Sector 4
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigateTo('/host/onboarding')}
              className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-bold text-[#141B2C] rounded-xl border border-[#CBD5E1] cursor-pointer"
            >
              🚀 Launchpad Setup
            </button>
            <button
              onClick={() => navigateTo('/host/application-status')}
              className="px-4 py-2 bg-[#0F766E] hover:bg-[#005C55] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              ⚙️ Technical Status
            </button>
          </div>
        </div>

        {/* 4-COLUMN METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Today's Earnings</span>
              <span className="text-lg">₹</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">₹4,820.00</div>
            <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-semibold mt-1">
              <span>+14% vs ystd</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">Ledger synced</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Active Occupancy</span>
              <span className="text-lg">🚗</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">18 / 24</div>
            <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-semibold mt-1">
              <span>75% Capacity</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">6 bays free</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Today's Check-ins</span>
              <span className="text-lg">⏱️</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">42 Arrivals</div>
            <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-semibold mt-1">
              <span>+8 vs average</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">0 overstays</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Pending Payout</span>
              <span className="text-lg">🏦</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">₹28,450.00</div>
            <div className="flex items-center gap-1.5 text-xs text-[#0F766E] font-semibold mt-1">
              <span>Direct NEFT</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">Weekly cycle</span>
            </div>
          </div>
        </div>

        {/* HOST WORKSPACE SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Inventory Management
                </span>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  pe_hp_04_01
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                Parking Bay & Slot Allocations
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Control dedicated slots, EV charging stations, 2-wheeler bays, and seasonal closure schedules.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Slots registered: <strong>24 Bays</strong></span>
              <button
                onClick={() => navigateTo('/host/onboarding/eligibility')}
                className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
              >
                Inspect Bays →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Arrivals & Departures
                </span>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  pe_hw_04_04
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                Gate Check-in Operations
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Verify driver QR tokens, inspect vehicle license plates, record arrival timestamps, and resolve conflicts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Active scanner: <strong>Simulated</strong></span>
              <button
                onClick={() => navigateTo('/host/application-status')}
                className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
              >
                Gate Status →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Finance & Settlements
                </span>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  pe_hw_05_04
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                Payout Accounts & Statements
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Platform commission breakdown, automated GST invoices, settlement schedules, and bank account settings.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Settlement cycle: <strong>T+2 Weekly</strong></span>
              <button
                onClick={() => navigateTo('/host/onboarding/profile')}
                className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
              >
                Bank Ledgers →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Monorepo App: <code>apps/host</code></span>
            <span>•</span>
            <button onClick={() => navigateTo('/')} className="hover:underline">
              Customer Website
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HostPortalApp() {
  return (
    <BrandProvider>
      <HostPortalContent />
    </BrandProvider>
  );
}
