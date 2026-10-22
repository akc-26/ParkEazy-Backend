import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { isValidPassword } from '@parkeazy/validation';

interface Props {
  initialToken?: string;
  onNavigate: (path: string) => void;
}

export function CustomerResetPasswordPage({ initialToken, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [token, setToken] = useState(initialToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const passwordChecks = isValidPassword(newPassword);
  const passwordsMatch = newPassword && confirmPassword ? newPassword === confirmPassword : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('A valid password reset token is required.');
      return;
    }

    if (!passwordChecks.valid) {
      setErrorMessage(passwordChecks.errors.join('; '));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your new password entries.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.auth.resetPassword({
        token: token.trim(),
        newPassword,
        tenantId: tenant.tenantId,
      });

      setIsSuccess(true);
      setTimeout(() => onNavigate('/login'), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. The token may be expired or invalid.');
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
                Reset Password
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

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-secondary-fixed/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[500px] bg-surface-container-lowest rounded-2xl shadow-xl p-8 sm:p-10 border border-outline-variant/20">
          {!isSuccess ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[28px]">lock_reset</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-surface-container text-primary-container">
                  Session Re-keying
                </span>
              </div>

              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
                  Set new password
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-relaxed">
                  Enter your single-use reset token and choose a strong password. All other active sessions will be terminated.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/20 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reset Token */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1">
                    Reset Token / Secret Key
                  </label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste 64-char hex recovery token"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low font-mono text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-surface-container-low font-body-md text-body-md border border-outline-variant/30 focus:outline-none focus:bg-white focus:border-primary-container"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low font-body-md text-body-md border focus:outline-none focus:bg-white ${
                      !passwordsMatch ? 'border-error' : 'border-outline-variant/30 focus:border-primary-container'
                    }`}
                  />
                </div>

                {/* Password strength checklist */}
                <div className="p-3 bg-surface-container-low rounded-lg text-[11px] space-y-1 text-on-surface-variant">
                  <span className={newPassword.length >= 8 ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                    {newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                  </span>
                  <span className="block" />
                  <span className={/[A-Z]/.test(newPassword) ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '○'} 1 uppercase & 1 lowercase letter
                  </span>
                  <span className="block" />
                  <span className={/[0-9]/.test(newPassword) ? 'text-[#12B76A]' : 'text-on-surface-variant'}>
                    {/[0-9]/.test(newPassword) ? '✓' : '○'} 1 numeric digit & 1 special symbol
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !token || !newPassword}
                  className="w-full py-3 rounded-lg bg-primary-container hover:bg-[#005c55] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password & Re-authenticate</span>
                      <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#12B76A] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <div>
                <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  Password Updated Successfully
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                  Your new credentials are saved. All active sessions have been invalidated for security. Redirecting you to sign in...
                </p>
              </div>
              <button
                onClick={() => onNavigate('/login')}
                className="w-full py-3 rounded-lg bg-primary-container text-white text-xs font-semibold cursor-pointer"
              >
                Sign In Now →
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-outline-variant/30 py-4 px-4 text-xs text-on-surface-variant text-center">
        © 2026 {tenant.displayName} Mobility Systems. Zero-Knowledge Session Revocation.
      </footer>
    </div>
  );
}
