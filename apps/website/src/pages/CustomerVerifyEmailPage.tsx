import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  initialEmail?: string;
  onNavigate: (path: string) => void;
}

export function CustomerVerifyEmailPage({ initialEmail, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [email, setEmail] = useState(initialEmail || 'arun.kumar@example.com');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState(email);
  const [tokenInput, setTokenInput] = useState('');

  // Cooldown timer
  const [cooldown, setCooldown] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'expired' | 'invalid'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      await apiClient.auth.sendOtp({
        destination: email,
        channel: 'email',
        purpose: 'signup',
        tenantId: tenant.tenantId,
      });
      setResendSuccess(true);
      setCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification link. Please wait and try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // Send token verification
      await apiClient.auth.verifyOtp({
        challengeId: tokenInput.trim(),
        code: '123456',
        destination: email,
        tenantId: tenant.tenantId,
      });
      setVerificationStatus('verified');
      setTimeout(() => onNavigate('/auth/success'), 2000);
    } catch (err: any) {
      if (err.message?.includes('expired')) {
        setVerificationStatus('expired');
      } else {
        setVerificationStatus('invalid');
      }
      setErrorMessage(err.message || 'Verification token is invalid or expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveEmail = () => {
    if (newEmailInput && newEmailInput.includes('@')) {
      setEmail(newEmailInput);
      setIsEditingEmail(false);
      setCooldown(30);
    }
  };

  const maskedEmail = email.length > 4
    ? `${email.slice(0, 2)}•••••${email.slice(email.indexOf('@') - 1)}`
    : email;

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
                Email Authentication
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
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-primary-fixed-dim/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-lg p-6 sm:p-10 border border-outline-variant/20 text-center">
          {/* Card Top Pill */}
          <div className="flex items-center justify-between mb-8 pb-2 border-b border-outline-variant/20">
            <div className="inline-flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-full text-xs font-medium text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <span>Gate Pass Dispatch: Pending</span>
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px] text-primary-container">verified_user</span>
              <span>Tier-1 Security</span>
            </div>
          </div>

          {/* Dynamic Hero Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-secondary-container/40 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-primary-container shadow-xs">
              <span className="material-symbols-outlined text-[36px]">
                {verificationStatus === 'verified'
                  ? 'check_circle'
                  : verificationStatus === 'expired'
                  ? 'timer_off'
                  : verificationStatus === 'invalid'
                  ? 'error'
                  : 'mark_email_unread'}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center shadow-xs text-xs">
              <span className="material-symbols-outlined text-[14px]">lock</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight mb-2">
            {verificationStatus === 'verified'
              ? 'Identity Authenticated!'
              : verificationStatus === 'expired'
              ? 'Verification Link Expired'
              : verificationStatus === 'invalid'
              ? 'Invalid Verification Token'
              : 'Verify your email'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mb-6">
            {verificationStatus === 'verified'
              ? 'Your account has been confirmed. Redirecting to your active parking pass...'
              : 'We sent a secure verification link to activate your ParkEazy account and enable instant digital gate pass dispatch.'}
          </p>

          {/* Masked Email Capsule */}
          <div className="w-full bg-surface-container-low rounded-xl p-3.5 mb-6 flex items-center justify-between gap-3 text-left border border-outline-variant/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">alternate_email</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Target Address
                </span>
                {isEditingEmail ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      className="px-2 py-1 text-xs border rounded bg-white text-on-surface"
                    />
                    <button
                      onClick={handleSaveEmail}
                      className="text-xs bg-primary-container text-white px-2.5 py-1 rounded font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-xs font-bold text-on-surface truncate block">
                    {maskedEmail}
                  </span>
                )}
              </div>
            </div>
            {!isEditingEmail && (
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs font-semibold text-primary-container hover:bg-surface-container transition-colors shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Change</span>
              </button>
            )}
          </div>

          {/* Status Banners */}
          {resendSuccess && (
            <div className="mb-6 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>Fresh verification link dispatched to your inbox!</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-error-container text-on-error-container border border-error/20 text-xs flex items-center gap-2 text-left">
              <span className="material-symbols-outlined text-[18px] text-error">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Direct Token Verification Form */}
          <form onSubmit={handleVerifyToken} className="mb-6 text-left">
            <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
              Have a verification token or link code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste code or token from email"
                className="flex-1 h-10 px-3 rounded-lg bg-surface-container-low text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
              />
              <button
                type="submit"
                disabled={isVerifying || !tokenInput.trim()}
                className="px-4 h-10 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-[#005c55] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </form>

          {/* Actions & Resend Controls */}
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">Didn't receive email?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending}
                className="font-bold text-primary-container hover:underline disabled:text-outline disabled:cursor-not-allowed cursor-pointer"
              >
                {isResending ? 'Sending...' : cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link now'}
              </button>
            </div>

            <button
              onClick={() => onNavigate('/verify-mobile')}
              className="w-full py-2.5 rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-primary-container">smartphone</span>
              <span>Prefer SMS OTP? Verify Mobile Instead</span>
            </button>

            <button
              onClick={() => onNavigate('/login')}
              className="w-full py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Return to Customer Sign In
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. Email Delivery SLA: 60 Seconds.
      </footer>
    </div>
  );
}
