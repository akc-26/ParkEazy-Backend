import React from 'react';
import { ShieldCheck, ArrowRight, Building2, Shield, Heart } from 'lucide-react';

interface UserFooterProps {
  onOpenHostPortal: () => void;
  onOpenAdminPortal: () => void;
  onNavigateHome: () => void;
}

export const UserFooter: React.FC<UserFooterProps> = ({
  onOpenHostPortal,
  onOpenAdminPortal,
  onNavigateHome
}) => {
  return (
    <footer className="bg-[#0E1E20] border-t border-slate-800 text-white py-12 mt-16 font-sans">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#087E8A] to-[#12B886] flex items-center justify-center font-bold text-base text-white">
                P
              </div>
              <span className="font-bold text-lg text-white">ParkEazy</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Guaranteed covered parking bay reservations with cryptographic gate passes, automated IoT access, and ACID double-entry ledger escrow.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
              Guarantees & Architecture
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>10-Minute Hold Invariant</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>100% Segregated Escrow</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Instant QR Gate Codes</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
              Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onOpenHostPortal}
                  className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Building2 className="w-3 h-3 text-teal-400" />
                  <span>Host Partner Portal</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAdminPortal}
                  className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Shield className="w-3 h-3 text-rose-400" />
                  <span>Admin Moderation Console</span>
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
              Status & Compliance
            </h4>
            <div className="bg-[#162A2D] p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">Operations Active</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Authoritative persistence, double-entry financial ledger, and verified access control.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>© {new Date().getFullYear()} ParkEazy Platform Inc. All rights reserved.</div>
          <div className="text-[11px] text-slate-400">
            Phase 03 Host Baseline & Payout Integrity Enforced
          </div>
        </div>
      </div>
    </footer>
  );
};
