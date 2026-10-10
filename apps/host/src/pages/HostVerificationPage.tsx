import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
  onSuccess?: () => void;
}

export function HostVerificationPage({ currentUser, onNavigate, onSuccess }: Props) {
  const { tenant } = useBrand();
  const [mobileOtp, setMobileOtp] = useState(['', '', '', '', '', '']);
  const [phone, setPhone] = useState(currentUser?.phone || '+91 98401 98820');
  const [email] = useState(currentUser?.email || 'kavitha.rajan@annagarplaza.in');

  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(currentUser?.isPhoneVerified || false);
  const [emailVerified, setEmailVerified] = useState(currentUser?.isEmailVerified || false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  // Handle countdown
  useEffect(() => {
    let interval: any = null;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  const handleSendOtp = async () => {
    setError(null);
    setMessage(null);
    setIsSendingOtp(true);
    try {
      const res = await apiClient.auth.sendOtp({
        destination: phone,
        channel: 'sms',
        purpose: 'verify_phone',
        tenantId: tenant.tenantId,
      });
      setChallengeId(res.challengeId);
      setOtpSent(true);
      setOtpTimer(60);
      setMessage(`Security SMS dispatched to ${phone}. Enter 6-digit verification OTP.`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch SMS challenge. Please check your number.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const fullCode = mobileOtp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    if (!challengeId) {
      setError('Request a verification code before submitting it.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setMessage(null);

    try {
      await apiClient.auth.verifyOtp({
        challengeId: challengeId || '',
        code: fullCode,
        destination: phone,
        tenantId: tenant.tenantId,
      });
      setMobileVerified(true);
      setMessage('Mobile phone verified successfully.');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP token. Please request a new code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...mobileOtp];
    next[index] = val.slice(-1);
    setMobileOtp(next);

    // Auto advance focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`host-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSimulateEmailVerify = () => {
    setEmailVerified(true);
    setMessage('Email endpoint verified successfully.');
  };

  const handleProceed = () => {
    if (onSuccess) onSuccess();
    onNavigate('/host/onboarding');
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

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] font-mono">PE-HW-01-03</span>
            <button
              onClick={() => onNavigate('/host/login')}
              className="text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Step Progress Ribbon */}
        <div className="mb-8 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-[#0F766E]">Step 01 • Done</span>
                <span className="text-xs font-semibold text-[#141B2C]">Account Created</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs ring-4 ring-[#0F766E]/20">
                2
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-[#0F766E]">Step 02 • Active</span>
                <span className="text-xs font-semibold text-[#141B2C]">Contact Verification</span>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-[#64748B]">Step 03</span>
                <span className="text-xs font-semibold text-[#64748B]">Facility Profile</span>
              </div>
            </div>

            <div className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] text-[#64748B] flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase text-[#64748B]">Step 04</span>
                <span className="text-xs font-semibold text-[#64748B]">Bay Setup & Gates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#E6F7F4] text-[#0F766E] text-xs mb-2">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span className="font-semibold uppercase tracking-wider text-[11px]">Operational Dual-Auth Protocol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
              Verify Host Contact Credentials
            </h1>
            <p className="text-sm text-[#64748B] mt-1 max-w-xl">
              To activate your host console, deploy automated barrier IoT webhooks, and receive real-time driver dispatch alerts, please verify both endpoints.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] text-[#0F766E] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">security_update_good</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Host Node ID</span>
              <span className="text-xs font-mono font-bold text-[#141B2C]">NODE-BLR-84021</span>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Dual Verification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-8">
          {/* CARD A: Mobile Phone Verification */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">smartphone</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      Official Mobile Number
                    </h3>
                    <p className="text-xs text-[#64748B]">Direct SMS gate dispatch line</p>
                  </div>
                </div>
                {mobileVerified ? (
                  <span className="px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#027A48] text-[11px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check</span> Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-[#FEF6E7] text-[#D97706] text-[11px] font-bold">
                    Pending
                  </span>
                )}
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] mb-4 text-xs">
                <span className="text-[#64748B] block text-[11px]">Registered Endpoint:</span>
                <span className="font-bold font-mono text-[#141B2C] text-sm">{phone}</span>
              </div>

              {!mobileVerified && (
                <div className="space-y-4">
                  {!otpSent ? (
                    <button
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="w-full py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSendingOtp ? 'Dispatching...' : 'Dispatch 6-Digit SMS Challenge'}
                    </button>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#141B2C] mb-2">
                        Enter 6-Digit OTP Code
                      </label>
                      <div className="flex gap-2 justify-center mb-3">
                        {mobileOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`host-otp-${idx}`}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            className="w-10 h-12 text-center font-bold text-lg border border-[#CBD5E1] rounded-xl focus:border-[#0F766E] focus:outline-none"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#64748B] mb-4">
                        <span>
                          {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Did not receive code?'}
                        </span>
                        {otpTimer === 0 && (
                          <button
                            onClick={handleSendOtp}
                            className="text-[#0F766E] font-bold hover:underline cursor-pointer"
                          >
                            Resend Code
                          </button>
                        )}
                      </div>

                      <button
                        onClick={handleVerifyOtp}
                        disabled={isVerifying}
                        className="w-full py-2.5 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        {isVerifying ? 'Validating Token...' : 'Confirm & Validate Code'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CARD B: Email Verification */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#E9EDFF] text-[#0F766E] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">mail</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      Official Host Email
                    </h3>
                    <p className="text-xs text-[#64748B]">Invoice & legal notifications</p>
                  </div>
                </div>
                {emailVerified ? (
                  <span className="px-2.5 py-1 rounded-full bg-[#ECFDF3] text-[#027A48] text-[11px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check</span> Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-[#FEF6E7] text-[#D97706] text-[11px] font-bold">
                    Pending Link
                  </span>
                )}
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] mb-4 text-xs">
                <span className="text-[#64748B] block text-[11px]">Registered Address:</span>
                <span className="font-bold text-[#141B2C] text-sm break-all">{email}</span>
              </div>

              {!emailVerified && (
                <div className="space-y-3">
                  <p className="text-xs text-[#64748B]">
                    A verification link was dispatched to your inbox upon account creation.
                  </p>
                  <button
                    onClick={handleSimulateEmailVerify}
                    className="w-full py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F766E] border border-[#CBD5E1] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">mark_email_read</span>
                    Confirm Email Verification Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#64748B]">
            <span className="font-bold text-[#141B2C] block">Verification State:</span>
            <span>
              {mobileVerified && emailVerified
                ? 'Both endpoints confirmed. Ready for facility onboarding.'
                : 'Complete verification of both endpoints or proceed to onboarding preview.'}
            </span>
          </div>

          <button
            onClick={handleProceed}
            className="px-6 py-3 bg-[#0F766E] hover:bg-[#005C55] text-white rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Continue to Facility Launchpad</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_03</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
