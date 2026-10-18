import React, { useState } from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  UserPlus,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { Button, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';

interface HostLoginViewProps {
  onNavigate: (path: string) => void;
  onLoginSuccess: (user: SessionUser) => void;
  returnUrl?: string;
}

export const HostLoginView: React.FC<HostLoginViewProps> = ({
  onNavigate,
  onLoginSuccess,
  returnUrl,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateEmailFormat = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    let hasError = false;

    if (!email.trim()) {
      setEmailError('Email address is required.');
      hasError = true;
    } else if (!validateEmailFormat(email)) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      const response = await apiClient.login(email.trim(), password, 'host');
      onLoginSuccess(response.user);
      if (returnUrl && returnUrl !== '/host/login') {
        onNavigate(returnUrl);
      } else if (!response.user.isHostVerified) {
        onNavigate('/host/verify');
      } else if (response.onboardingStep && response.onboardingStep !== 'APPROVED') {
        onNavigate('/host/onboarding');
      } else {
        onNavigate('/host/');
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid credentials. Please verify your email and password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('host@parkeazy.com');
    setPassword('DriverPass123!');
    setErrorMessage(null);
    setEmailError(null);
    setPasswordError(null);
    setIsLoading(true);
    try {
      const response = await apiClient.login('host@parkeazy.com', 'DriverPass123!', 'host');
      onLoginSuccess(response.user);
      onNavigate('/host/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate demo host.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_01"
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
              Screen pe_hw_01_01
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Host Partner Sign In
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to manage your parking locations, bay inventory, and payouts.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Sign In Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Host Email Address"
                id="host-login-email"
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError || undefined}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="host-login-password"
                  className="text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('/host/forgot-password')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="host-login-password"
                type="password"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  passwordError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-slate-600 focus:ring-slate-100'
                }`}
                autoComplete="current-password"
                disabled={isLoading}
              />
              {passwordError && (
                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              themeContext="host"
              isLoading={isLoading}
              className="w-full mt-2 font-semibold"
            >
              Sign In to Host Studio
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Verified Demo Host Sign-In */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div className="text-left">
                <span className="text-[11px] font-bold text-emerald-900 block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Demo Host
                </span>
                <span className="text-[10px] text-emerald-700 block font-mono">
                  host@parkeazy.com
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                themeContext="host"
                onClick={handleDemoLogin}
                isLoading={isLoading}
                className="text-xs font-semibold bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                Autofill & Sign In
              </Button>
            </div>
          </div>

          {/* Registration navigation link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have a host account yet?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/host/register')}
              className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Register as Host
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
