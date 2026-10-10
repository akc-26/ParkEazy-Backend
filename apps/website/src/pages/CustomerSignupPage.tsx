import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';
import { validateSignupPayload, isValidPassword } from '@parkeazy/validation';

interface Props {
  onNavigate: (path: string) => void;
  onSuccess: (user: UserAccount, tokens: AuthTokenPair) => void;
}

export function CustomerSignupPage({ onNavigate, onSuccess }: Props) {
  const { tenant } = useBrand();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState<'car' | 'bike' | 'auto' | 'suv'>('car');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Status & error state
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const passwordChecks = isValidPassword(password);
  const passwordsMatch = password && confirmPassword ? password === confirmPassword : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFormErrors([]);

    if (!termsAccepted) {
      setFormErrors(['You must agree to the Terms of Service and Privacy Policy to create an account.']);
      return;
    }

    if (password !== confirmPassword) {
      setFormErrors(['Passwords do not match. Please verify both password entries.']);
      return;
    }

    // Client-side payload validation
    const valResult = validateSignupPayload({
      fullName,
      email,
      phone,
      password,
      tenantId: tenant.tenantId,
      role: 'customer',
      preferredVehicleCategory: vehicle,
    });

    if (!valResult.success) {
      setFormErrors(valResult.errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.auth.register({
        fullName,
        email,
        phone,
        password,
        tenantId: tenant.tenantId,
        role: 'customer',
        preferredVehicleCategory: vehicle,
      });

      onSuccess(response.user, response.tokens);

      // Transition to OTP mobile verification or success
      if (phone) {
        onNavigate(`/verify-mobile?phone=${encodeURIComponent(phone)}`);
      } else {
        onNavigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setApiError(err.message || 'Registration failed. An account with this email may already exist.');
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
                Registration
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-on-surface-variant">
            <span>Already registered?</span>
            <button onClick={() => onNavigate('/login')} className="font-bold text-primary-container hover:underline cursor-pointer">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: BRAND NARRATIVE & ASSURANCE */}
          <div className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-md text-label-md shadow-xs w-fit">
              <span className="material-symbols-outlined text-[16px] text-primary-container">shield_with_heart</span>
              <span>Verified Citizen Parking Portal</span>
            </div>

            <div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight leading-tight">
                Join India's premier smart parking network
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
                Zero circling, guaranteed slots, and seamless multi-city reservations across Chennai, Bengaluru, Mumbai, and NCR.
              </p>
            </div>

            {/* Bento Features */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/20">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-container text-[22px]">arrows_outward</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Reserve bays in seconds before leaving
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Real-time availability locks the exact bay at prime metro hubs, IT corridors, and airports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/20">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-container text-[22px]">camera_outdoor</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Automated ANPR boom barrier entry
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Contactless, sensor-driven access via automated optical license plate recognition. No paper tickets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-outline-variant/20">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-container text-[22px]">currency_rupee_circle</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Overstay grace buffer & instant refunds
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    15-minute traffic allowance at every terminal. Transparent hourly billing with UPI reversal.
                  </p>
                </div>
              </div>
            </div>

            {/* Superhost Guarantee */}
            <div className="rounded-xl p-4 bg-gradient-to-br from-surface-container-lowest to-surface-container-low border border-outline-variant/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shadow-xs shrink-0">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    ParkEazy Superhost Guarantee
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Every reserved private & commercial bay is geofenced, 24/7 CCTV-monitored, and covered by a baseline incidental safety bond.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: REGISTRATION CARD */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-6 sm:p-10 border border-outline-variant/20">
              <div className="mb-6">
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                  Create your driver account
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Enter your details to generate your digital gate access pass.
                </p>
              </div>

              {/* Error Banners */}
              {apiError && (
                <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container border border-error/20 flex items-start gap-3 text-xs">
                  <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">error</span>
                  <div>
                    <p className="font-semibold text-sm mb-0.5">Registration Error</p>
                    <p>{apiError}</p>
                  </div>
                </div>
              )}

              {formErrors.length > 0 && (
                <div className="mb-6 p-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs">
                  <p className="font-semibold mb-1">Please fix the following:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px] pointer-events-none">
                      person
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Arun Kumar"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px] pointer-events-none">
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. arun.kumar@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1">
                    Mobile Number (for SMS Gate Pass)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px] pointer-events-none">
                      smartphone
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                    />
                  </div>
                </div>

                {/* Vehicle Selection */}
                <div>
                  <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1.5">
                    Primary Vehicle Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'car', label: '🚗 Sedan / Hatch' },
                      { key: 'suv', label: '🚙 Large SUV' },
                      { key: 'bike', label: '🏍️ Two-Wheeler' },
                      { key: 'auto', label: '⚡ EV Compatible' },
                    ].map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setVehicle(v.key as any)}
                        className={`p-2.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                          vehicle === v.key
                            ? 'bg-primary-container text-white border-primary-container shadow-xs'
                            : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:bg-surface-container'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px] pointer-events-none">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full pl-10 pr-9 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-3 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px] pointer-events-none">
                        lock_reset
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border focus:outline-none focus:bg-white ${
                          !passwordsMatch ? 'border-error' : 'border-outline-variant/30 focus:border-primary-container'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Policy Indicator */}
                <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1 text-on-surface-variant">
                  <div className="font-semibold text-on-surface mb-1">Security requirements:</div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className={password.length >= 8 ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                      {password.length >= 8 ? '✓' : '○'} 8+ characters
                    </span>
                    <span className={/[A-Z]/.test(password) ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                      {/[A-Z]/.test(password) ? '✓' : '○'} 1 uppercase letter
                    </span>
                    <span className={/[0-9]/.test(password) ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                      {/[0-9]/.test(password) ? '✓' : '○'} 1 numeric digit
                    </span>
                    <span className={/[!@#$%^&*]/.test(password) ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                      {/[!@#$%^&*]/.test(password) ? '✓' : '○'} 1 special symbol
                    </span>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                    />
                    <span>
                      I agree to the <strong className="text-on-surface">ParkEazy Master Terms of Service</strong> and acknowledged the{' '}
                      <strong className="text-on-surface">Privacy Policy</strong> for automated sensor processing.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 rounded-lg bg-primary-container hover:bg-[#005c55] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Creating Secure Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Create ParkEazy Account</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 {tenant.displayName} Technologies. ISO 27001 Certified Security.</span>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('/login')} className="hover:underline cursor-pointer">
              Existing Customer Login
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('/host/signup')} className="hover:underline cursor-pointer">
              Host Onboarding Registration
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
