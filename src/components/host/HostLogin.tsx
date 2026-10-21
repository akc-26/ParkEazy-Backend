import React, { useState } from 'react';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../api';

interface HostLoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigateHome: () => void;
}

export const HostLogin: React.FC<HostLoginProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('host@parkeazy.com');
  const [password, setPassword] = useState('host123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.loginHost(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1E20] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onNavigateHome}
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Customer Portal</span>
        </button>

        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#087E8A] to-[#12B886] flex items-center justify-center shadow-lg shadow-teal-900/30 font-bold text-2xl">
            P
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>ParkEazy</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#087E8A]/30 text-teal-300 border border-[#087E8A]/50 font-semibold">
                Host Portal
              </span>
            </h2>
            <p className="text-xs text-slate-400">Parking Facility Management & Revenue Engine</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#162A2D] py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                <span className="font-semibold block mb-0.5">Authentication Error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Host Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-[#0E1E20] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#087E8A] focus:border-[#087E8A]"
                  placeholder="host@parkeazy.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Account Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-[#0E1E20] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#087E8A] focus:border-[#087E8A]"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#087E8A] hover:bg-[#076D77] active:bg-[#065A63] text-white text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Host Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Host Authorization Guarded</span>
            </div>
            <span>ParkEazy Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};
