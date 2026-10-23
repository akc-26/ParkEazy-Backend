import React, { useState } from 'react';
import {
  Car,
  CalendarCheck,
  Building2,
  User as UserIcon,
  LogOut,
  Sparkles,
  Search,
  CheckCircle2,
  Lock,
  Mail,
  X
} from 'lucide-react';
import { User } from '../../types';
import { api } from '../../api';

interface CustomerHeaderProps {
  currentUser: User | null;
  activeCustomerTab: 'home' | 'my_bookings';
  onSelectCustomerTab: (tab: 'home' | 'my_bookings') => void;
  onNavigateToHost: () => void;
  onCustomerAuthChange?: (user: User | null) => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  currentUser,
  activeCustomerTab,
  onSelectCustomerTab,
  onNavigateToHost,
  onCustomerAuthChange
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await api.loginCustomer(email, password);
      onCustomerAuthChange?.(res.user);
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDriverLogout = async () => {
    await api.logoutCustomer();
    onCustomerAuthChange?.(null);
  };

  const handleQuickFillCustomer = () => {
    setEmail('alex.driver@example.com');
    setPassword('driver123');
    setLoginError(null);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark & Customer Navigation */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => onSelectCustomerTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#087E8A] text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:bg-[#076D77] transition-colors">
                P
              </div>
              <span className="text-xl font-bold tracking-tight text-[#162A2D]">
                ParkEazy
              </span>
            </button>

            {/* Standard Customer Navigation Links (No Host/Admin Switching Tabs) */}
            <nav aria-label="Customer navigation" className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <button
                type="button"
                onClick={() => onSelectCustomerTab('home')}
                className={`transition-colors py-1.5 border-b-2 flex items-center gap-1.5 ${
                  activeCustomerTab === 'home'
                    ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                    : 'text-slate-600 border-transparent hover:text-[#087E8A]'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Find Parking</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCustomerTab('my_bookings')}
                className={`transition-colors py-1.5 border-b-2 flex items-center gap-1.5 ${
                  activeCustomerTab === 'my_bookings'
                    ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                    : 'text-slate-600 border-transparent hover:text-[#087E8A]'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>My Reservations</span>
              </button>
            </nav>
          </div>

          {/* Right Controls: Become a Host link and Customer Identity / Sign In */}
          <div className="flex items-center gap-3">
            {/* Direct Link to Host Account Entry Point */}
            <button
              type="button"
              onClick={onNavigateToHost}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#087E8A] hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-[#087E8A]" />
              <span>Host Portal</span>
            </button>

            {/* Customer Session / Sign-in */}
            {currentUser && currentUser.role === 'customer' ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-xs font-bold text-[#087E8A]">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-slate-400">Verified Driver</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDriverLogout}
                  title="Sign out as driver"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#087E8A] text-white text-xs font-bold hover:bg-[#076D77] transition-colors shadow-xs"
              >
                Driver Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Driver Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#087E8A] flex items-center justify-center font-bold">
                <Car className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-[#162A2D]">Driver Sign In</h3>
            </div>

            <p className="text-xs text-slate-500">
              Sign in to manage your active reservations and view barrier access QR passes.
            </p>

            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleDriverLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.driver@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A]"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 bg-[#087E8A] text-white font-bold rounded-xl hover:bg-[#076D77] transition-colors"
              >
                {loginLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleQuickFillCustomer}
                className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-700">Demo Driver: Alex Driver</div>
                  <div className="text-[10px] text-slate-500 font-mono">alex.driver@example.com · driver123</div>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
