import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Server,
  Activity
} from 'lucide-react';
import { api } from '../../api';
import { User } from '../../types';

interface AdminLoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigateHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide administrator email and credentials.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.loginAdmin(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Administrator authorization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setEmail('admin@parkeazy.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Return to Customer Portal link */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to ParkEazy Public Customer Site</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="bg-[#0F1E2E] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/10 pointer-events-none" />
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xl shadow-md mb-3 text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-wider uppercase mb-2">
            Governance Console
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">ParkEazy Admin Moderation</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Authorized personnel only. Facility approval, host verification, provider testing, and disputes.
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
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@parkeazy.com"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-800 focus:ring-2 focus:ring-slate-800/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Administrator Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-slate-800 focus:ring-2 focus:ring-slate-800/20 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F1E2E] hover:bg-[#1A2F45] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing Administrator...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill demo account shortcut */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Demo Admin Credentials
              </span>
              <span className="text-[10px] text-slate-400">1-click test fill</span>
            </div>
            <button
              type="button"
              onClick={handleQuickFillAdmin}
              className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-slate-800 bg-slate-50/70 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs group"
            >
              <div>
                <div className="font-bold text-slate-800 group-hover:text-blue-900">
                  Sarah Connor (System Administrator)
                </div>
                <div className="text-[10px] text-slate-500 font-mono">admin@parkeazy.com · admin123</div>
              </div>
              <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
            </button>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-600" />
          <span>Requires server-side role validation. Host or customer tokens are rejected with 403.</span>
        </div>
      </div>
    </div>
  );
};
