import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Home,
} from 'lucide-react';
import { Button, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';

interface HostForgotPasswordViewProps {
  onNavigate: (path: string) => void;
}

export const HostForgotPasswordView: React.FC<HostForgotPasswordViewProps> = ({
  onNavigate,
}) => {
  const [step, setStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devTokenNotice, setDevTokenNotice] = useState<string | null>(null);

  const validateEmailFormat = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setDevTokenNotice(null);

    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.forgotPassword(email.trim());
      setStatusMessage(response.message);

      if (response.resetToken) {
        setResetToken(response.resetToken);
        setDevTokenNotice(
          'Security recovery token generated for this session. You can now set your new password.'
        );
        setStep('RESET');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process password recovery request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!resetToken.trim()) {
      setErrorMessage('Password reset token is required.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('New password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setErrorMessage('New password must contain at least one letter and one number.');
      return;
    }

    if (confirmPassword !== newPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.resetPassword({
        token: resetToken.trim(),
        newPassword,
        confirmPassword,
      });
      setStatusMessage(result.message);
      // After brief confirmation, navigate to login
      setTimeout(() => {
        onNavigate('/host/login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Link may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_04"
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

      {/* Main Content Form Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-2">
              Screen pe_hw_01_04
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {step === 'REQUEST' ? 'Recover Host Access' : 'Create New Password'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {step === 'REQUEST'
                ? 'Enter your registered host email to receive password recovery instructions.'
                : 'Enter your verified reset token and choose a secure replacement password.'}
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Recovery Error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Request Processed</p>
                <p className="mt-0.5">{statusMessage}</p>
              </div>
            </div>
          )}

          {devTokenNotice && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <span className="font-semibold block flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                Active Session Token
              </span>
              <p className="text-[11px] text-blue-700">{devTokenNotice}</p>
            </div>
          )}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <Input
                label="Registered Host Email"
                id="host-forgot-email"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                isLoading={isLoading}
                className="w-full mt-2 font-semibold"
              >
                Send Password Recovery Link
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('RESET')}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  Already have a reset token? Enter it here
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="host-reset-token-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Reset Token
                </label>
                <input
                  id="host-reset-token-input"
                  type="text"
                  placeholder="Paste 64-character token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="host-reset-new-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="host-reset-new-password"
                  type="password"
                  placeholder="Min 8 chars with letter & number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label
                  htmlFor="host-reset-confirm-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="host-reset-confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                isLoading={isLoading}
                className="w-full mt-2 font-semibold"
              >
                Set New Password &amp; Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Back to request recovery link
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => onNavigate('/host/login')}
              className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Host Sign In
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
