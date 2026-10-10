import React, { useState, useEffect, useRef } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';

interface Props {
  initialPhone?: string;
  onNavigate: (path: string) => void;
  onSuccess: (user: UserAccount, tokens: AuthTokenPair) => void;
}

export function CustomerVerifyMobileOtpPage({ initialPhone, onNavigate, onSuccess }: Props) {
  const { tenant } = useBrand();
  const [phone, setPhone] = useState(initialPhone || '+91 98765 43210');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [challengeId, setChallengeId] = useState<string>('initial-challenge');
  const [cooldown, setCooldown] = useState(54);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  // Initialize OTP challenge on mount if needed
  useEffect(() => {
    let isMounted = true;
    const initChallenge = async () => {
      try {
        const res = await apiClient.auth.sendOtp({
          destination: phone,
          channel: 'sms',
          purpose: 'login',
          tenantId: tenant.tenantId,
        });
        if (isMounted) {
          setChallengeId(res.challengeId);
          if (res.mockCodeNotice) {
            setSuccessNotice(res.mockCodeNotice);
          }
        }
      } catch {
        // Continue with current challenge
      }
    };
    initChallenge();
    return () => { isMounted = false; };
  }, [phone]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Single digit or paste multiple
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length && index + i < 6; i++) {
        newDigits[index + i] = pasted[i];
      }
      setDigits(newDigits);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = clean[0];
    setDigits(newDigits);

    // Auto-advance focus
    if (index < 5 && clean.length > 0) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      const newDigits = pasteData.split('');
      while (newDigits.length < 6) newDigits.push('');
      setDigits(newDigits);
      inputRefs.current[Math.min(pasteData.length, 5)]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.auth.sendOtp({
        destination: phone,
        channel: 'sms',
        purpose: 'login',
        tenantId: tenant.tenantId,
      });
      setChallengeId(res.challengeId);
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      if (res.mockCodeNotice) {
        setSuccessNotice(res.mockCodeNotice);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend SMS code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.auth.verifyOtp({
        challengeId,
        code,
        destination: phone,
        tenantId: tenant.tenantId,
      });

      onSuccess(response.user, response.tokens);
      onNavigate('/auth/success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect verification code. Please check and retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  const filledCount = digits.filter((d) => d.length > 0).length;

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/30">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/login')}
              className="flex items-center gap-1.5 text-body-md-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Sign In</span>
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
                Mobile OTP
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/auth/error')}
            className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Security & Support
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* MAIN VERIFICATION CARD (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 sm:p-10 shadow-lg border border-outline-variant/20 flex flex-col justify-between">
            <div>
              {/* Top Shield Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center text-primary-container shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">shield_person</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                  <span>Encrypted DLT Gateway</span>
                </div>
              </div>

              {/* Headlines */}
              <div className="mb-6">
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
                  Verify your mobile number
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  We've sent a 6-digit one-time verification code via SMS to confirm your driver profile for automated boom barrier clearance.
                </p>
              </div>

              {/* Masked Phone Capsule */}
              <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center justify-between mb-6 border border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">smartphone</span>
                  <div>
                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Target Destination
                    </p>
                    <p className="font-mono text-xs font-bold text-on-surface">
                      {phone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newNum = prompt('Enter 10-digit mobile number:', phone);
                    if (newNum && newNum.trim()) {
                      setPhone(newNum.trim());
                      setCooldown(0);
                    }
                  }}
                  className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit</span>
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              </div>

              {/* Notice & Error Banners */}
              {successNotice && (
                <div className="mb-6 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">info</span>
                  <span>{successNotice}</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-6 p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/20 text-xs flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-error shrink-0 mt-0.5">error</span>
                  <div>
                    <p className="font-semibold text-xs mb-0.5">Verification Failed</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                      Enter 6-digit code
                    </label>
                    <span className="font-mono text-xs text-on-surface-variant">
                      {filledCount} of 6 entered
                    </span>
                  </div>

                  {/* 6 Accessible Pin Boxes */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <React.Fragment key={idx}>
                        {idx === 3 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0 mx-0.5" />
                        )}
                        <input
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          autoFocus={idx === 0}
                          value={digits[idx]}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className="w-11 h-14 sm:w-12 sm:h-16 text-center font-bold text-xl sm:text-2xl text-on-surface bg-surface-container-low border border-outline-variant/40 rounded-xl shadow-xs focus:outline-none focus:bg-white focus:border-primary-container transition-all"
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || filledCount < 6}
                  className="w-full h-12 bg-primary-container hover:bg-[#005c55] text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Validating Security Code...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      <span>Verify & Continue to Account</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Resend Controls */}
            <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>Didn't get the code?</span>
              </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending}
                className="font-bold text-primary-container hover:underline disabled:text-outline disabled:cursor-not-allowed cursor-pointer"
              >
                {isResending ? 'Sending...' : cooldown > 0 ? `Resend SMS in ${cooldown}s` : 'Resend code via SMS'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: PROTOCOL EXPLANATION (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xs">
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-primary-container uppercase tracking-wider bg-surface-container px-2.5 py-1 rounded">
                  Why Mobile Verification Matters
                </span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface mt-2">
                  Seamless Access Guaranteed
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  ParkEazy terminals require verified phone numbers to pair license plates with boom barriers.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-on-surface">Boom Barrier ANPR Sync</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Your phone acts as the digital trigger for automated barrier arms if cameras encounter weather haze.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">notification_important</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-on-surface">Emergency Overstay & Bay Alerts</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Receive instant notifications before expiry to extend your slot without incurring overstay penalties.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">security</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-on-surface">Zero Fraud Guarantee</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Protects parking facilities and prevents unauthorized parking reservations under your profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-outline-variant/30 text-xs text-on-surface-variant text-center">
              <button
                onClick={() => onNavigate('/verify-email')}
                className="text-primary-container hover:underline font-semibold cursor-pointer"
              >
                Switch to Email Link Verification →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. TRAI DLT Compliant SMS Routing.
      </footer>
    </div>
  );
}
