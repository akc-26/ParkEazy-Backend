import React from 'react';

interface UserFooterProps {
  onNavigate: (path: string) => void;
  onOpenHostPortal: () => void;
}

export const UserFooter: React.FC<UserFooterProps> = ({
  onNavigate,
  onOpenHostPortal,
}) => {
  const handleNav = (e: React.MouseEvent, target: string, isAnchor = false) => {
    e.preventDefault();
    if (isAnchor) {
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      onNavigate('/' + target);
      return;
    }
    onNavigate(target);
  };

  return (
    <footer className="bg-white border-t border-slate-200 py-10 sm:py-14 mt-auto">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand Wordmark and Info */}
          <div>
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="flex items-center gap-2 mb-3 focus:outline-none focus:ring-2 focus:ring-[#087E8A] rounded-lg p-0.5"
            >
              <div className="w-7 h-7 rounded bg-[#087E8A] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                P
              </div>
              <span className="font-bold text-base text-[#162A2D]">ParkEazy</span>
            </a>
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
                <a
                  href="/search"
                  onClick={(e) => handleNav(e, '/search')}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Find Parking Spaces
                </a>
              </li>
              <li>
                <a
                  href="/#locations"
                  onClick={(e) => handleNav(e, '#locations', true)}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Featured Locations
                </a>
              </li>
              <li>
                <a
                  href="/search?bayType=COVERED"
                  onClick={(e) => handleNav(e, '/search?bayType=COVERED')}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Covered & Secured Garages
                </a>
              </li>
              <li>
                <a
                  href="/search?bayType=EV_CHARGING"
                  onClick={(e) => handleNav(e, '/search?bayType=EV_CHARGING')}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  EV Charging Bays
                </a>
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
                  Become a Host (Host Studio) →
                </button>
              </li>
              <li>
                <a
                  href="/#how-it-works"
                  onClick={(e) => handleNav(e, '#how-it-works', true)}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Host Requirements & Guarantees
                </a>
              </li>
              <li>
                <a
                  href="/#how-it-works"
                  onClick={(e) => handleNav(e, '#how-it-works', true)}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Automated Gate Access Methods
                </a>
              </li>
              <li>
                <a
                  href="/#how-it-works"
                  onClick={(e) => handleNav(e, '#how-it-works', true)}
                  className="hover:text-[#087E8A] transition-colors"
                >
                  Segregated Escrow Protection
                </a>
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
            ParkEazy Platform · Certified for Phase 5 Module 2
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
              onClick={() => onNavigate('/admin/')}
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
