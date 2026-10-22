import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
}

export function HostPasswordRecoveryPage({ onNavigate }: Props) {
  const { tenant } = useBrand();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsLoading(true);

    try {
      await apiClient.auth.forgotPassword({
        email,
        tenantId: tenant.tenantId,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      // Enumeration safety: always show success message
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/90 backdrop-blur-xl border-b border-[#E2E8F0] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/host/login')}
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

          <span className="text-xs text-[#64748B] font-mono">PE-HW-01-04</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative">
        <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('/host/login')}
              className="inline-flex items-center gap-1.5 text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Host Sign In</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9EDFF] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-[#64748B] text-[10px]">
                Access Recovery
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-6 sm:p-10 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="w-12 h-12 rounded-xl bg-[#E6F7F4] flex items-center justify-center text-[#0F766E]">
                <span className="material-symbols-outlined text-[26px]">key_vertical</span>
              </div>
              <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
                Reset Your Host Password
              </h1>
              <p className="text-sm text-[#64748B]">
                Enter your registered host business email to receive an authorization token and password reset link.
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-[#141B2C] flex items-center justify-between" htmlFor="host-email">
                    <span>Registered Host Email</span>
                    <span className="text-[#64748B] text-[11px] font-normal">Business domain required</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#94A3B8] text-[20px] pointer-events-none">
                      mail
                    </span>
                    <input
                      id="host-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="facility.ops@metrogroups.in"
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#0F766E] text-[20px] shrink-0 mt-0.5">shield</span>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-[#141B2C] uppercase tracking-wide text-[11px]">
                      Enumeration-Safe Protocol
                    </span>
                    <p className="text-[#64748B] leading-relaxed">
                      If this email matches an active host or facility operator account, reset instructions will be dispatched immediately. For security reasons, we do not confirm whether an account exists.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#0F766E] hover:bg-[#005C55] text-white font-['Plus_Jakarta_Sans'] font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-[#E6F7F4] border border-[#14B8A6]/30 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0F766E] text-[20px]">check_circle</span>
                    <span className="font-bold text-sm text-[#141B2C]">Check Your Inbox</span>
                  </div>
                  <p className="text-xs text-[#344054]">
                    A secure password reset link has been dispatched with a 15-minute expiry token to <strong>{email}</strong>. Check your spam folder if you do not receive it shortly.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[#0F766E] font-medium pt-1">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>Token active for 15 minutes</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
                  <span>Didn't receive instructions?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setCountdown(60);
                    }}
                    className="text-[#0F766E] font-bold hover:underline cursor-pointer"
                  >
                    Resend link
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('/host/login')}
                  className="w-full py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] text-xs font-bold transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_04</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
