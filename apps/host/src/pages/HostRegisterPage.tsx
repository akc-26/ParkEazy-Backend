import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';
import { validateSignupPayload } from '@parkeazy/validation';

interface Props {
  onNavigate: (path: string) => void;
  onSuccess: (user: UserAccount, tokens: AuthTokenPair) => void;
}

export function HostRegisterPage({ onNavigate, onSuccess }: Props) {
  const { tenant } = useBrand();
  const [hostType, setHostType] = useState<'residential' | 'commercial'>('residential');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cityRegion, setCityRegion] = useState('chennai');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFormErrors([]);

    if (!acceptTerms) {
      setFormErrors(['You must agree to the Host Partner Terms of Service and Verification Policy.']);
      return;
    }

    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanedPhone.startsWith('91') && cleanedPhone.length === 12
      ? `+${cleanedPhone}`
      : cleanedPhone.length === 10
      ? `+91${cleanedPhone}`
      : phone;

    const validation = validateSignupPayload({
      email,
      password,
      fullName,
      phone: formattedPhone,
      role: 'host',
      tenantId: tenant.tenantId,
    });

    if (!validation.success) {
      setFormErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.auth.register({
        email,
        password,
        fullName,
        phone: formattedPhone,
        role: 'host',
        tenantId: tenant.tenantId,
      });

      onSuccess(response.user, response.tokens);
      onNavigate('/host/verify');
    } catch (err: any) {
      setApiError(err.message || 'Host registration failed. Please try again with valid information.');
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
              className="text-[#3E4947] hover:text-[#141B2C] font-medium transition-colors cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => onNavigate('/host/register')}
              className="bg-[#0F766E] text-white font-semibold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
            >
              Register
            </button>
            <button
              onClick={() => onNavigate('/host/exceptions')}
              className="text-[#64748B] hover:text-[#141B2C] font-medium transition-colors cursor-pointer text-xs"
            >
              Help & Support
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-5xl">
          {/* Step Pill */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9EDFF] text-[#141B2C] shadow-xs w-fit text-xs">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">Host Partner Enrollment</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-medium">Step 1 of 4: Account Creation</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span className="material-symbols-outlined text-[18px] text-[#0F766E]">verified_user</span>
              <span>ISO/IEC 27001 Verified Infrastructure</span>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-8 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-6 sm:p-10">
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight mb-2">
                  Create Your Host Partner Account
                </h1>
                <p className="text-sm text-[#64748B]">
                  Monetize vacant parking bays or deploy enterprise gate automation in under 5 minutes.
                </p>
              </div>

              {/* Classification Model */}
              <div className="mb-8">
                <label className="block text-xs font-semibold text-[#141B2C] uppercase tracking-wider mb-3">
                  Classification Model
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setHostType('residential')}
                    className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer group shadow-xs ${
                      hostType === 'residential'
                        ? 'border-[#0F766E] bg-[#E6F7F4]/40 ring-2 ring-[#0F766E]/20'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#0F766E] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">home_work</span>
                      </div>
                      <input
                        type="radio"
                        name="hostType"
                        checked={hostType === 'residential'}
                        onChange={() => setHostType('residential')}
                        className="w-4 h-4 accent-[#0F766E] mt-1 cursor-pointer"
                      />
                    </div>
                    <span className="text-sm font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                      Individual / Residential
                    </span>
                    <span className="text-xs text-[#64748B] leading-relaxed">
                      Private driveways, standalone villas, and reserved gated apartment slots.
                    </span>
                    <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center gap-1.5 text-[#0F766E] text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>Instant Spot Activation</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setHostType('commercial')}
                    className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer group shadow-xs ${
                      hostType === 'commercial'
                        ? 'border-[#0F766E] bg-[#E6F7F4]/40 ring-2 ring-[#0F766E]/20'
                        : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#E2E8F0] text-[#141B2C] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">apartment</span>
                      </div>
                      <input
                        type="radio"
                        name="hostType"
                        checked={hostType === 'commercial'}
                        onChange={() => setHostType('commercial')}
                        className="w-4 h-4 accent-[#0F766E] mt-1 cursor-pointer"
                      />
                    </div>
                    <span className="text-sm font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                      Commercial / Operator
                    </span>
                    <span className="text-xs text-[#64748B] leading-relaxed">
                      Multi-level garages, corporate IT corridors, retail mall decks, and valet hubs.
                    </span>
                    <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex items-center gap-1.5 text-[#64748B] text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[15px]">sensors</span>
                      <span>ANPR & Fastag API Compatible</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {apiError && (
                <div className="mb-6 p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs">
                  <span className="font-bold">Error:</span> {apiError}
                </div>
              )}
              {formErrors.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs">
                  <p className="font-bold mb-1">Please fix the following:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="block text-xs font-semibold text-[#141B2C]" htmlFor="fullName">
                      Legal Representative Name
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">
                        badge
                      </span>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Kavitha Rajan"
                        required
                        className="w-full h-11 pl-10 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="block text-xs font-semibold text-[#141B2C]" htmlFor="contactEmail">
                      Primary Contact Email
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">
                        mail
                      </span>
                      <input
                        id="contactEmail"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@domain.com"
                        required
                        className="w-full h-11 pl-10 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 text-left">
                    <label className="block text-xs font-semibold text-[#141B2C]" htmlFor="mobilePhone">
                      Official Mobile Number (OTP Verification)
                    </label>
                    <div className="relative flex">
                      <div className="h-11 px-3 bg-[#E2E8F0] border border-r-0 border-[#CBD5E1] rounded-l-xl flex items-center gap-1 text-xs font-bold text-[#141B2C]">
                        <span>🇮🇳 +91</span>
                      </div>
                      <input
                        id="mobilePhone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98401 98820"
                        required
                        className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-r-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="block text-xs font-semibold text-[#141B2C]" htmlFor="cityRegion">
                      Facility Metropolitan Territory
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">
                        location_city
                      </span>
                      <select
                        id="cityRegion"
                        value={cityRegion}
                        onChange={(e) => setCityRegion(e.target.value)}
                        className="w-full h-11 pl-10 pr-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E] appearance-none"
                      >
                        <option value="chennai">Chennai (TN - Core & OMR Corridor)</option>
                        <option value="bengaluru">Bengaluru (KA - Whitefield / ORR)</option>
                        <option value="hyderabad">Hyderabad (TS - HITEC City / Gachibowli)</option>
                        <option value="mumbai">Mumbai / MMR (MH - BKC / Nariman Pt)</option>
                        <option value="delhi">Delhi NCR (DL - Gurugram CyberCity / Noida)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none text-[20px]">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#141B2C]" htmlFor="password">
                    Host Console Password (min. 8 characters, letters & numbers)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[18px]">
                      lock
                    </span>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full h-11 pl-10 pr-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0F766E] accent-[#0F766E] mt-0.5 cursor-pointer"
                    />
                    <span>
                      I certify that I hold legal tenancy or commercial operating authority over the listed parking spaces and agree to the{' '}
                      <span className="text-[#0F766E] font-semibold underline">Host Service Agreement</span> and{' '}
                      <span className="text-[#0F766E] font-semibold underline">Payout Direct-Debit Terms</span>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 h-12 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit & Continue to Contact Verification</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
                <h3 className="font-bold text-[#141B2C] text-sm mb-3 flex items-center gap-2 font-['Plus_Jakarta_Sans']">
                  <span className="material-symbols-outlined text-[#0F766E] text-[20px]">checklist</span>
                  What happens after registration?
                </h3>
                <ul className="space-y-3 text-xs text-[#64748B]">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                    <span><strong>Dual Endpoint Verification:</strong> Verify both your official email and mobile OTP.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                    <span><strong>Facility Profile & KYC:</strong> Submit facility address, parking capacity, and GST/PAN.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                    <span><strong>Bay Configuration:</strong> Set hourly rates, EV bays, and operating hours.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-[11px] shrink-0">4</span>
                    <span><strong>Instant Publication:</strong> Go live on the driver marketplace.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#F1F5F9] rounded-2xl p-6 border border-[#CBD5E1]">
                <div className="text-xs text-[#64748B] flex flex-col gap-2">
                  <span className="font-bold text-[#141B2C]">Already registered as a host?</span>
                  <p>Access your existing facility dashboard, gate monitors, and payout ledgers.</p>
                  <button
                    onClick={() => onNavigate('/host/login')}
                    className="w-full mt-2 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#0F766E] border border-[#CBD5E1] rounded-xl font-bold transition-colors cursor-pointer text-xs"
                  >
                    Sign In to Existing Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_02</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
