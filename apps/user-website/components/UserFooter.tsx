import React from 'react';

interface UserFooterProps {
  onOpenHostPortal: () => void;
}

export const UserFooter: React.FC<UserFooterProps> = ({ onOpenHostPortal }) => {
  return (
    <footer className="bg-white border-t border-slate-200 py-12">
      <div className="max-w-[1536px] mx-auto px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <a href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded bg-[#087E8A] text-white font-bold flex items-center justify-center text-sm">
                P
              </div>
              <span className="font-bold text-base text-[#162A2D]">ParkEazy</span>
            </a>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Peer-to-peer parking marketplace connecting drivers with secure parking spaces.
            </p>
            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} ParkEazy Technologies Inc. All rights reserved.
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><a href="#search" className="hover:text-[#087E8A]">Find Parking</a></li>
              <li><a href="#locations" className="hover:text-[#087E8A]">Covered Garages</a></li>
              <li><a href="#locations" className="hover:text-[#087E8A]">EV Charging Spots</a></li>
              <li><a href="#protection" className="hover:text-[#087E8A]">Security Deposit Escrow</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Hosting
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <button onClick={onOpenHostPortal} className="hover:text-[#087E8A] text-left">
                  Host Portal Workspace (/host/)
                </button>
              </li>
              <li><a href="#how-it-works" className="hover:text-[#087E8A]">Host Requirements</a></li>
              <li><a href="#how-it-works" className="hover:text-[#087E8A]">Earnings Calculator</a></li>
              <li><a href="#how-it-works" className="hover:text-[#087E8A]">Access Methods</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><span className="text-slate-500">Security & Deposit Guarantee</span></li>
              <li><span className="text-slate-500">Terms of Service</span></li>
              <li><span className="text-slate-500">Privacy Policy</span></li>
              <li><span className="text-slate-500">Dispute Resolution Rules</span></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
