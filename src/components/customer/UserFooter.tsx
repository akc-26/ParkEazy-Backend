import React from 'react';

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
    <footer className="bg-white border-t border-slate-200 py-10 sm:py-14 mt-auto">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand Wordmark and Info */}
          <div>
            <div
              onClick={onNavigateHome}
              className="flex items-center gap-2 mb-3 cursor-pointer p-0.5"
            >
              <div className="w-7 h-7 rounded bg-[#087E8A] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                P
              </div>
              <span className="font-bold text-base text-[#162A2D]">ParkEazy</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Peer-to-peer parking marketplace connecting drivers with secure parking spaces, backed by authoritative 10-minute hold locks and double-entry escrow.
            </p>
            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} ParkEazy Technologies Inc. All rights reserved.
            </div>
          </div>

          {/* Col 2: Marketplace Navigation */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('locations');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Find Parking Spaces
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('locations');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Featured Locations
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Covered & Secured Garages
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  EV Charging Bays
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Hosting Partner Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Hosting
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <button
                  type="button"
                  onClick={onOpenHostPortal}
                  className="hover:text-[#087E8A] text-left transition-colors font-medium text-[#075762]"
                >
                  Host Portal & Management →
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Host Requirements & Guarantees
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Automated Gate Access Methods
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('how-it-works');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Segregated Escrow Protection
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Verification Invariants */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Trust & Security
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Authoritative 10-Minute Bay Lock</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Discrete Physical Bay Assignment</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Append-Only Escrow Ledger</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Zero Secret Leakage Compliance</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            ParkEazy Verified Parking Marketplace Platform
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenHostPortal}
              className="hover:text-slate-600 transition-colors"
            >
              Host Workspace
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="hover:text-slate-600 transition-colors"
            >
              Admin Governance
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
