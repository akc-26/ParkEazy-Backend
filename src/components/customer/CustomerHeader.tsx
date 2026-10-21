import React, { useState } from 'react';
import {
  Car,
  CalendarCheck,
  Building2,
  LogIn,
  LogOut,
  User as UserIcon,
  X,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { User } from '../../types';
import { api } from '../../api';

interface CustomerHeaderProps {
  currentUser: User | null;
  activeCustomerTab: 'home' | 'my_bookings';
  onSelectCustomerTab: (tab: 'home' | 'my_bookings') => void;
  onNavigateToHost: () => void;
  onCustomerAuthChange: (user: User | null) => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  currentUser,
  activeCustomerTab,
  onSelectCustomerTab,
  onNavigateToHost,
  onCustomerAuthChange
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('alex.driver@example.com');
  const [password, setPassword] = useState('driver123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.loginCustomer(email.trim(), password);
      onCustomerAuthChange(res.user);
      setShowLoginModal(false);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logoutCustomer();
    onCustomerAuthChange(null);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0E1E20] border-b border-slate-800 text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => onSelectCustomerTab('home')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#087E8A] to-[#12B886] flex items-center justify-center font-bold text-lg text-white shadow-md">
                P
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white">ParkEazy</span>
                <span className="text-[10px] text-teal-400 block -mt-1 font-medium">Guaranteed Parking</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-1 bg-[#162A2D] p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => onSelectCustomerTab('home')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeCustomerTab === 'home'
                    ? 'bg-[#087E8A] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Search & Reserve</span>
              </button>

              <button
                onClick={() => onSelectCustomerTab('my_bookings')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeCustomerTab === 'my_bookings'
                    ? 'bg-[#087E8A] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/40'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>My Reservations</span>
              </button>
            </nav>

            {/* Right-Hand Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToHost}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#162A2D] hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Host Portal</span>
              </button>

              {currentUser ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                  <div className="w-7 h-7 rounded-full bg-[#087E8A] flex items-center justify-center font-bold text-xs text-white">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left text-xs">
                    <div className="font-semibold text-white leading-tight">{currentUser.fullName}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{currentUser.role}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#087E8A] hover:bg-[#076D77] text-white shadow-xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Customer Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Customer Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#162A2D] max-w-md w-full rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#087E8A] flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Customer Sign In</h3>
                  <p className="text-[11px] text-slate-400">Access your active parking holds & reservations</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-200">
                  <span className="font-semibold block mb-0.5">Authentication Error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
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
                    className="block w-full pl-9 pr-3 py-2 bg-[#0E1E20] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#087E8A]"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
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
                    className="block w-full pl-9 pr-3 py-2 bg-[#0E1E20] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-[#087E8A]"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#087E8A] hover:bg-[#076D77] active:bg-[#065A63] text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-700/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Protected by ParkEazy Security Architecture</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
