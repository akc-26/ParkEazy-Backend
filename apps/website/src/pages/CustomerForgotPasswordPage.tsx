import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
}

export function CustomerForgotPasswordPage({ onNavigate }: Props) {
  const { tenant } = useBrand();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resetTokenReceived, setResetTokenReceived] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const res = await apiClient.auth.forgotPassword({
        email: identifier.trim(),
        tenantId: tenant.tenantId,
      });

      setSubmitted(true);
      if (res.resetToken) {
        setResetTokenReceived(res.resetToken);
      }
    } catch (err: any) {
      setApiError(err.message || 'Unable to process recovery request at this time. Please retry later.');
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
                Password Recovery
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
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-secondary-fixed/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[500px] bg-surface-container-lowest rounded-2xl shadow-xl p-8 sm:p-10 border border-outline-variant/20">
          {/* Top Badge */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container shadow-inner">
              <span className="material-symbols-outlined text-[26px]">key</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-xs text-primary-container font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>Zero-Leak Policy</span>
            </div>
          </div>

          {!submitted ? (
            <div className="space-y-6">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
                  Forgot your password?
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                  No worries. Enter the verified email address associated with your ParkEazy account, and we'll send password reset instructions.
                </p>
              </div>

              {apiError && (
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/20 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-error">error</span>
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface">
                      Account Email or Phone Number
                    </label>
                    <span className="text-[11px] text-on-surface-variant">SMS or Email OTP</span>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[19px] pointer-events-none">
                      alternate_email
                    </span>
                    <input
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. driver.arun@parkeazy.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !identifier.trim()}
                  className="w-full py-3 rounded-lg bg-primary-container hover:bg-[#005c55] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Dispatching Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Instructions</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-outline-variant/30 text-center">
                <button
                  onClick={() => onNavigate('/login')}
                  className="text-xs text-on-surface-variant hover:text-on-surface font-semibold cursor-pointer"
                >
                  Remember your password? Return to Sign In
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#12B76A] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">mark_email_read</span>
              </div>

              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                  Recovery link dispatched
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                  If an account exists associated with <strong className="text-on-surface">{identifier}</strong>, we have dispatched recovery instructions with a single-use reset token.
                </p>
              </div>

              {resetTokenReceived && (
                <div className="p-3 bg-surface-container-low rounded-xl text-left text-xs border border-outline-variant/30">
                  <span className="font-bold text-primary-container block mb-1">
                    Development Sandbox Token:
                  </span>
                  <code className="block p-2 bg-white rounded font-mono text-[11px] break-all border border-outline-variant/20">
                    {resetTokenReceived}
                  </code>
                  <button
                    onClick={() => onNavigate(`/reset-password?token=${encodeURIComponent(resetTokenReceived)}`)}
                    className="mt-2 text-xs font-bold text-primary-container hover:underline cursor-pointer block"
                  >
                    Proceed to Reset Password Page with Token →
                  </button>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onNavigate('/reset-password')}
                  className="w-full py-2.5 rounded-lg bg-primary-container hover:bg-[#005c55] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Enter Reset Token Manually
                </button>
                <button
                  onClick={() => onNavigate('/login')}
                  className="w-full py-2 text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Return to Customer Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. Cryptographic Token Protection Active.
      </footer>
    </div>
  );
}
