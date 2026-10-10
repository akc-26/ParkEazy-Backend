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

export function CustomerLoginPage({ onNavigate, onSuccess, returnUrl }: Props) {
  const { tenant } = useBrand();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFormErrors([]);

    // Client-side validation
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

      onSuccess(response.user, response.tokens);

      if (response.user.status === 'pending_verification') {
        onNavigate('/verification-required');
      } else {
        onNavigate(returnUrl || '/auth/success');
      }
    } catch (err: any) {
      if (err.statusCode === 429) {
        setRateLimited(true);
        setApiError('Too many login attempts. For security, your account is temporarily throttled for 15 minutes.');
      } else {
        setApiError(err.message || 'Incorrect email or password credentials. Please verify your details.');
      }
    } finally {
      setIsLoading(false);
    }
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
                Customer Sign In
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-on-surface-variant">
            <button onClick={() => onNavigate('/host/login')} className="hover:text-primary transition-colors cursor-pointer">
              Host Sign In →
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SPLIT LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* LEFT COLUMN: HIGH-TRUST REASSURANCE PANEL */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-surface-container-low shadow-xs border border-outline-variant/20">
            <div className="flex flex-col gap-6">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary-container font-label-md text-label-md shadow-xs w-fit">
                <span className="material-symbols-outlined text-[16px] text-tertiary-container">verified</span>
                <span>Trusted by 50,000+ drivers in Chennai & Tier-1 Hubs</span>
              </div>

              {/* Headline */}
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-2 font-bold leading-tight">
                  Park smart.<br />Arrive effortless.
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Access reserved metropolitan bays, high-clearance EV stalls, and secure corporate garages with guaranteed arrival locks.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">shield</span>
                  </div>
                  <div>
                    <span className="block font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                      Guaranteed Bay Reservation
                    </span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">
                      No circling blocks. Your designated slot is locked until arrival.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">qr_code_scanner</span>
                  </div>
                  <div>
                    <span className="block font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                      Instant QR & ANPR Clearance
                    </span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">
                      Contactless barrier arms sync with your smartphone pass.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">currency_rupee</span>
                  </div>
                  <div>
                    <span className="block font-body-md-medium text-body-md-medium text-on-surface font-semibold">
                      Zero Surge Transparency
                    </span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">
                      Fixed hourly rates with zero sudden traffic multiplier fees.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial card */}
            <div className="mt-8 bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/30">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-container/10 flex items-center justify-center text-primary-container font-bold text-sm shrink-0">
                  SN
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-0.5 text-tertiary-container mb-1">
                    {'★★★★★'.split('').map((s, i) => (
                      <span key={i} className="text-[#D6A84F] text-xs">{s}</span>
                    ))}
                    <span className="ml-1 text-on-surface font-label-sm text-label-sm font-semibold">4.92 / 5</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant italic">
                    “Saved me 25 minutes every morning around Anna Nagar. Scan QR, park in 4B, walk right into office.”
                  </p>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-1">
                    — Siddharth N., Daily Commuter
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CORE AUTHENTICATION CARD */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="w-full max-w-xl mx-auto bg-surface-container-lowest p-6 sm:p-10 rounded-2xl shadow-md border border-outline-variant/20">
              {/* Card Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
                    Welcome back
                  </h2>
                  <span className="inline-flex items-center gap-1.5 font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container text-primary-container font-semibold">
                    <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                    Secure Session
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Sign in with your registered credentials to access your parking passes.
                </p>
              </div>

              {/* Status & Error Banners */}
              {apiError && (
                <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-start gap-3 shadow-xs">
                  <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">error</span>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-sm mb-0.5">Authentication Error</p>
                    <p>{apiError}</p>
                    {rateLimited && (
                      <p className="mt-2 text-[11px] underline cursor-pointer" onClick={() => onNavigate('/auth/error')}>
                        View Rate Limit & Recovery Guide →
                      </p>
                    )}
                  </div>
                </div>
              )}

              {formErrors.length > 0 && (
                <div className="mb-6 p-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                  <p className="font-semibold mb-1">Please correct the following:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1.5">
                    Account Email or Mobile
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[19px]">mail</span>
                    </div>
                    <input
                      type="text"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. driver.arun@parkeazy.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => onNavigate('/forgot-password')}
                      className="font-label-sm text-label-sm text-primary-container hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[19px]">lock</span>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-primary-container accent-primary-container"
                    />
                    <span className="text-xs text-on-surface-variant font-medium">
                      Remember this device for 30 days
                    </span>
                  </label>
                  <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-primary-container">sensors</span>
                    <span>FastTag ANPR Ready</span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-3 py-3 rounded-lg bg-primary-container hover:bg-[#005c55] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to ParkEazy</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Alternate Login Option */}
              <div className="mt-6 pt-5 border-t border-outline-variant/30 text-center">
                <p className="text-xs text-on-surface-variant mb-3">Or quick mobile verification:</p>
                <button
                  type="button"
                  onClick={() => onNavigate('/verify-mobile')}
                  className="w-full py-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary-container">smartphone</span>
                  <span>Sign in with 6-Digit Mobile OTP</span>
                </button>
              </div>

              {/* Registration Link */}
              <div className="mt-6 text-center text-xs text-on-surface-variant">
                <span>Don't have an account yet? </span>
                <button
                  onClick={() => onNavigate('/signup')}
                  className="font-bold text-primary-container hover:underline cursor-pointer"
                >
                  Create ParkEazy Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 {tenant.displayName} Mobility Systems. 256-Bit SSL Encrypted.</span>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('/verification-required')} className="hover:underline cursor-pointer">
              Account Verification Status
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('/session-expired')} className="hover:underline cursor-pointer">
              Session Timeout Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
