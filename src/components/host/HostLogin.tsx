import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  KeyRound,
  User,
  Phone,
  FileCheck
} from 'lucide-react';
import { api } from '../../api';
import { User as UserType } from '../../types';

interface HostLoginProps {
  onLoginSuccess: (user: UserType) => void;
  onNavigateHome: () => void;
}

export const HostLogin: React.FC<HostLoginProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Register modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    taxId: '91-3829104',
    payoutBankName: 'Chase Commercial Banking',
    payoutAccountNumber: '****8492',
    payoutRoutingNumber: '121000358'
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both your registered host email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.loginHost(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillHost = (hostEmail: string, hostPass: string) => {
    setEmail(hostEmail);
    setPassword(hostPass);
    setError(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      setForgotLoading(true);
      const res = await api.forgotPassword(forgotEmail);
      setForgotMsg(res.message);
    } catch (err: any) {
      setForgotMsg(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegisterHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.businessName || !regData.fullName || !regData.email || !regData.password) {
      setRegError('Please fill in all required registration fields.');
      return;
    }
    if (regData.password !== regData.confirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    try {
      setRegLoading(true);
      setRegError(null);
      const res = await api.registerHost({
        email: regData.email,
        password: regData.password,
        fullName: regData.fullName,
        phone: regData.phone || '+1 (206) 555-0199',
        businessDetails: {
          businessName: regData.businessName,
          registrationNumber: 'WA-CORP-' + Math.floor(100000 + Math.random() * 900000),
          taxId: regData.taxId,
          payoutBankName: regData.payoutBankName,
          payoutAccountNumber: regData.payoutAccountNumber,
          payoutRoutingNumber: regData.payoutRoutingNumber,
          stripeConnectAccountId: 'acct_' + Math.random().toString(36).substring(2, 10),
          isVerified: true
        }
      });
      setShowRegisterModal(false);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F3] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Return to Customer Portal link */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#087E8A] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to ParkEazy Public Customer Site</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-[#162A2D] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-[#087E8A]/20 pointer-events-none" />
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#087E8A] flex items-center justify-center font-bold text-xl shadow-md mb-3">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">ParkEazy Host Portal</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Manage commercial garages, parking bays, dynamic rates, barrier gates, and earnings payouts.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Host Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="host@parkeazy.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-[#087E8A] focus:ring-2 focus:ring-[#087E8A]/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-semibold text-[#087E8A] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-[#087E8A] focus:ring-2 focus:ring-[#087E8A]/20 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#087E8A] hover:bg-[#076D77] active:bg-[#075762] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Host Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Host Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill demo account shortcut */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Demo Credentials Shortcut
              </span>
              <span className="text-[10px] text-slate-400">1-click test fill</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFillHost('host@parkeazy.com', 'host123')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#087E8A] bg-slate-50/70 hover:bg-teal-50/40 transition-colors flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-[#087E8A]">
                    Marcus Vance (Metro Parking LLC)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">host@parkeazy.com · host123</div>
                </div>
                <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-[#087E8A]" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickFillHost('sarah.host@parkeazy.com', 'host123')}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#087E8A] bg-slate-50/70 hover:bg-teal-50/40 transition-colors flex items-center justify-between text-xs group"
              >
                <div>
                  <div className="font-bold text-slate-800 group-hover:text-[#087E8A]">
                    Sarah Jenkins (EcoPark Bays Inc)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">sarah.host@parkeazy.com · host123</div>
                </div>
                <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-[#087E8A]" />
              </button>
            </div>
          </div>

          {/* Onboarding & Registration Link */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              New property owner or operator?{' '}
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="font-bold text-[#087E8A] hover:underline"
              >
                Register as a Host
              </button>
            </p>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected with server-side authorization and host facility ownership checks</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-[#162A2D]">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#087E8A] flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm">Host Password Recovery</h3>
            </div>
            <p className="text-xs text-slate-600">
              Enter your registered host email address to receive password recovery instructions.
            </p>
            {forgotMsg && (
              <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{forgotMsg}</span>
              </div>
            )}
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="host@parkeazy.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotMsg(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-1.5 text-xs bg-[#087E8A] text-white font-bold rounded-lg hover:bg-[#076D77]"
                >
                  {forgotLoading ? 'Dispatching...' : 'Send Recovery Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Host Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#087E8A] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#162A2D]">Register New Host Account</h3>
                <p className="text-[11px] text-slate-500">
                  Onboard commercial parking facility operator with payout routing
                </p>
              </div>
            </div>

            {regError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterHost} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Operating Business Name *</label>
                <input
                  type="text"
                  required
                  value={regData.businessName}
                  onChange={(e) => setRegData({ ...regData, businessName: e.target.value })}
                  placeholder="e.g. Apex Parking Solutions LLC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={regData.fullName}
                    onChange={(e) => setRegData({ ...regData, fullName: e.target.value })}
                    placeholder="e.g. David Miller"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Phone *</label>
                  <input
                    type="text"
                    required
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    placeholder="+1 (206) 555-0199"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Host Email Address *</label>
                <input
                  type="email"
                  required
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="operator@company.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="block font-bold text-slate-700 mb-1">Banking & Direct Payout Details</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={regData.payoutBankName}
                      onChange={(e) => setRegData({ ...regData, payoutBankName: e.target.value })}
                      placeholder="Bank Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={regData.payoutRoutingNumber}
                      onChange={(e) => setRegData({ ...regData, payoutRoutingNumber: e.target.value })}
                      placeholder="Routing Number (9 digits)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-5 py-2 bg-[#087E8A] hover:bg-[#076D77] text-white font-bold rounded-xl shadow-md"
                >
                  {regLoading ? 'Registering...' : 'Complete Host Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
