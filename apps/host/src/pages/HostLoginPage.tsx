import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';
import { validateLoginPayload } from '@parkeazy/validation';

interface Props {
  onNavigate: (path: string) => void;
  onSuccess: (user: UserAccount, tokens: AuthTokenPair) => void;
  returnUrl?: string;
}

export function HostLoginPage({ onNavigate, onSuccess, returnUrl }: Props) {
  const { tenant } = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFormErrors([]);

    const validation = validateLoginPayload({
      email,
      password,
      tenantId: tenant.tenantId,
    });

    if (!validation.success) {
      setFormErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.auth.login({
        email,
        password,
        tenantId: tenant.tenantId,
      });

      // Ensure user has host role
      const isHost = response.user.roles.includes('host') || response.user.roles.includes('superadmin');
      if (!isHost) {
        setApiError('Access Restricted: This account does not have Host Partner permissions. Please switch to Customer Login.');
        setIsLoading(false);
        return;
      }

      onSuccess(response.user, response.tokens);

      if (response.user.status === 'pending_verification') {
        onNavigate('/host/verify');
      } else {
        onNavigate(returnUrl || '/host/');
      }
    } catch (err: any) {
      setApiError(err.message || 'Invalid host credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

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

          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            <button
              onClick={() => onNavigate('/host/login')}
              className="bg-[#0F766E] text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => onNavigate('/host/register')}
              className="text-[#3E4947] hover:text-[#141B2C] font-medium transition-colors cursor-pointer"
            >
              Register
            </button>
            <button
              onClick={() => onNavigate('/host/exceptions')}
              className="text-[#64748B] hover:text-[#141B2C] font-medium transition-colors cursor-pointer text-xs"
            >
              Status & Help
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="hidden md:inline-flex items-center gap-1 text-[#0F766E] hover:underline font-medium text-xs cursor-pointer"
            >
              Switch to Customer App →
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col items-center justify-center">
        {/* Decorative blur gradients */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[760px] h-[340px] bg-gradient-to-b from-[#0F766E]/10 via-[#14B8A6]/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 bg-[#006B5F]/5 blur-2xl pointer-events-none rounded-full" />
        <div className="absolute bottom-10 -left-20 w-96 h-96 bg-[#0F766E]/5 blur-3xl pointer-events-none rounded-full" />

        {/* Back navigation & Telemetry pill */}
        <div className="w-full max-w-xl flex items-center justify-between mb-6 relative z-10">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F766E] transition-colors py-1 px-2.5 rounded-lg hover:bg-[#E9EDFF] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Marketplace (Customer Portal)</span>
          </button>
          <div className="inline-flex items-center gap-1.5 bg-[#E9EDFF] px-3 py-1 rounded-full text-[#0F766E] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
            <span className="text-[10px] tracking-wider uppercase font-bold">Node Telemetry Active</span>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-xl relative z-10 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
          <div className="p-6 sm:p-10 flex flex-col">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9EDFF] text-[#0F766E] mb-3 text-xs">
                <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  Host Workspace • Operational Access
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight mb-2">
                Sign In to Host Workspace
              </h1>
              <p className="text-sm text-[#64748B] max-w-md">
                Manage parking inventory, monitor real-time gate telemetry, and track earnings across your facilities.
              </p>
            </div>

            {/* Customer switcher notice */}
            <div className="mb-6 rounded-xl bg-[#F1F5F9] p-4 flex items-start gap-3 border border-[#E2E8F0]">
              <span className="material-symbols-outlined text-[#006B5F] text-[20px] shrink-0 mt-0.5">info</span>
              <div className="flex flex-col text-left text-xs">
                <span className="font-semibold text-[#141B2C]">Driver or Customer Account?</span>
                <p className="text-[#64748B] mt-0.5 leading-relaxed">
                  Looking to book a parking spot?{' '}
                  <button
                    onClick={() => onNavigate('/login')}
                    className="text-[#0F766E] underline font-semibold hover:text-[#006B5F] cursor-pointer"
                  >
                    Switch to Customer Login
                  </button>
                  . Customer credentials cannot access Host Workspace without verified partner authorization.
                </p>
              </div>
            </div>

            {/* Error notifications */}
            {apiError && (
              <div className="mb-6 p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <div className="flex-1">
                  <span className="font-bold">Authentication Failed:</span> {apiError}
                </div>
              </div>
            )}

            {formErrors.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs">
                <p className="font-bold mb-1">Please correct the following errors:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {formErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-[#141B2C] uppercase tracking-wider flex items-center justify-between">
                  <span>Business / Host Email</span>
                  <span className="text-[11px] lowercase text-[#64748B] font-normal">Registered Space Partner</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#94A3B8] text-[20px] pointer-events-none">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. facility.ops@metrogroups.in"
                    required
                    className="w-full h-11 pl-11 pr-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#141B2C] uppercase tracking-wider">
                    Access Key / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate('/host/forgot-password')}
                    className="text-xs text-[#0F766E] hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[#94A3B8] text-[20px] pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter authorized credential"
                    required
                    className="w-full h-11 pl-11 pr-11 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#94A3B8] hover:text-[#141B2C] p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#64748B]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F766E] accent-[#0F766E] cursor-pointer"
                  />
                  <span>Remember this workstation for 30 days</span>
                </label>
                <div className="hidden sm:flex items-center gap-1 text-[#64748B] text-xs">
                  <span className="material-symbols-outlined text-[16px]">sensors</span>
                  <span>ANPR Sync Ready</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 h-12 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Host Portal</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 flex items-start gap-2.5 text-left bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
              <span className="material-symbols-outlined text-[18px] text-[#94A3B8] shrink-0 mt-0.5">encrypted</span>
              <p className="text-[11px] text-[#64748B] leading-snug">
                ParkEazy uses rate-limited authentication and zero-knowledge session tokens to safeguard facility telemetry. Dual-factor challenge triggers on unrecognized hardware fingerprints.
              </p>
            </div>
          </div>

          <div className="bg-[#F1F5F9] px-6 sm:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] flex items-center justify-center shrink-0 text-[#0F766E]">
                <span className="material-symbols-outlined text-[20px]">add_business</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#141B2C]">New to hosting parking spaces?</span>
                <span className="text-[11px] text-[#64748B]">Monetize lots, driveways, or commercial bays.</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/host/register')}
              className="whitespace-nowrap px-4 py-2 bg-white text-[#141B2C] hover:text-[#0F766E] border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Create Host Account
            </button>
          </div>
        </div>

        {/* 3-column benefit features */}
        <div className="w-full max-w-4xl mt-8 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">money_off</span>
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-[#141B2C]">Zero Listing Fee</span>
              <span className="text-[11px] text-[#64748B]">List unlimited spaces with zero upfront overhead.</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">nest_cam_iq_outdoor</span>
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-[#141B2C]">Automated ANPR Barriers</span>
              <span className="text-[11px] text-[#64748B]">Direct integration with existing gate hardware.</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[#FEF6E7] text-[#D97706] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">account_balance</span>
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-[#141B2C]">Instant Bank Settlement</span>
              <span className="text-[11px] text-[#64748B]">Automated daily transfers with GST compliance.</span>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_01</code></span>
            <span>•</span>
            <button onClick={() => onNavigate('/')} className="hover:underline">
              Customer Website
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
