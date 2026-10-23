import React from 'react';
import {
  Shield,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Server,
  Activity
} from 'lucide-react';
import { User } from '../../types';

interface AdminHeaderProps {
  currentUser: User;
  onLogout: () => void;
  onNavigateToCustomer: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentUser,
  onLogout,
  onNavigateToCustomer
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0F1E2E] text-white border-b border-slate-800">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark with Admin Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                ParkEazy
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Admin Moderation
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-700 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Online · Strict Authorization Guard</span>
          </div>
        </div>

        {/* Right Controls: Customer View Link, Admin Identity & Explicit Logout */}
        <div className="flex items-center gap-3">
          {/* Link to public customer experience */}
          <button
            type="button"
            onClick={onNavigateToCustomer}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>Public Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Admin Profile Info */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700">
            <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-xs font-bold text-blue-200">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-white leading-tight">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-blue-300">Administrator</div>
            </div>

            {/* Clear Real Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-400 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Log out of Admin Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
