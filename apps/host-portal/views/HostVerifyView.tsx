import React, { useState, useEffect } from 'react';
import {
  Mail,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Home,
  Clock,
} from 'lucide-react';
import { Button, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser, VerificationStatusResponse } from '../../../packages/contracts';

interface HostVerifyViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onVerificationSuccess: (user: SessionUser) => void;
}

export const HostVerifyView: React.FC<HostVerifyViewProps> = ({
  currentUser,
  onNavigate,
  onVerificationSuccess,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationType, setVerificationType] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendNotification, setResendNotification] = useState<string | null>(null);

  // Load actual backend verification state
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStatus(true);
    setErrorMessage(null);

    apiClient
      .getVerificationStatus()
      .then((status) => {
        if (!isMounted) return;
        setVerificationStatus(status);
        if (status.isEmailVerified) {
          setSuccessMessage('Your email identity is verified. Proceed to host onboarding.');
        }
        setIsLoadingStatus(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(
          err.statusCode === 401
            ? 'You must be signed in to verify your host account.'
            : err.message || 'Unable to retrieve verification status.'
        );
        setIsLoadingStatus(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendNotification(null);

    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiClient.verifyCode(verificationCode.trim(), verificationType);
      setSuccessMessage(result.message);
      onVerificationSuccess(result.user);
      // Wait a moment so user observes real verified feedback then navigate to onboarding
      setTimeout(() => {
        onNavigate('/host/onboarding');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Code may be invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setResendNotification(null);
    setIsResending(true);

    try {
      const result = await apiClient.resendVerificationCode(verificationType);
      setResendNotification(result.message);
      // Refresh status from backend
      const updatedStatus = await apiClient.getVerificationStatus();
      setVerificationStatus(updatedStatus);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_03"
      className="min-h-screen bg-[#F0F4F3] text-[#12211C] flex flex-col justify-between font-sans"
    >
      {/* Top Navbar */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Host Studio
            </span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">
              ParkEazy Workspace
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate('/')}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Driver Website
        </button>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-2">
              Screen pe_hw_01_03
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Host Verification
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify your contact channel to protect your payout settlement and bay listings.
            </p>
          </div>

          {/* Verification Status Banner */}
          {isLoadingStatus ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Retrieving verification state from backend...
            </div>
          ) : verificationStatus?.isEmailVerified ? (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Host Identity Already Verified
              </div>
              <p className="text-emerald-700">
                Your email ({verificationStatus.email}) is verified. You can proceed directly to completing your host onboarding profile.
              </p>
              <Button
                type="button"
                variant="primary"
                themeContext="host"
                size="sm"
                onClick={() => onNavigate('/host/onboarding')}
                className="w-full font-semibold mt-2"
              >
                Continue to Host Onboarding
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          ) : null}

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Verification Alert</p>
                <p className="mt-0.5">{errorMessage}</p>
                {errorMessage.includes('signed in') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('/host/login')}
                    className="mt-2 text-xs bg-white"
                  >
                    Go to Host Sign In
                  </Button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Verification Successful</p>
                <p className="mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {resendNotification && (
            <div
              role="status"
              className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{resendNotification}</span>
            </div>
          )}

          {!verificationStatus?.isEmailVerified && (
            <form onSubmit={handleVerify} className="space-y-4">
              {/* Channel Selector */}
              <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setVerificationType('EMAIL')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                    verificationType === 'EMAIL'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationType('SMS')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                    verificationType === 'SMS'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  SMS Mobile OTP
                </button>
              </div>

              <div>
                <label
                  htmlFor="host-verify-code-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="host-verify-code-input"
                  type="text"
                  maxLength={10}
                  placeholder="Enter code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full text-center tracking-[0.3em] font-mono text-lg font-bold px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isSubmitting || isLoadingStatus}
                  autoComplete="one-time-code"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Codes expire after 15 minutes
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || isLoadingStatus}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                isLoading={isSubmitting}
                disabled={isLoadingStatus}
                className="w-full mt-2 font-semibold"
              >
                Confirm Verification Code
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate('/host/onboarding')}
              className="hover:text-slate-700"
            >
              Skip to Onboarding
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/host/login')}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Switch Account
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        ParkEazy Marketplace Platform &bull; Host Security &amp; Identity Subsystem
      </footer>
    </div>
  );
};
