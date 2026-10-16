import React from 'react';
import { Button } from '../../../packages/ui';
import { SessionUser } from '../../../packages/contracts';

interface UserHeaderProps {
  onNavigateToHostPortal: () => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  onSignOut: () => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  onNavigateToHostPortal,
  onOpenAuthModal,
  currentUser,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Single Text Element) */}
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-[#087E8A] flex items-center justify-center text-white font-bold text-lg shadow-xs">
            P
          </div>
          <span className="text-xl font-bold tracking-tight text-[#162A2D] whitespace-nowrap">
            ParkEazy
          </span>
        </a>

        {/* Zone 2: Navigation Links (Single-Line, Anti-Pill) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#search" className="hover:text-[#087E8A] transition-colors whitespace-nowrap">
            Find Parking
          </a>
          <a href="#how-it-works" className="hover:text-[#087E8A] transition-colors whitespace-nowrap">
            How It Works
          </a>
          <a href="#locations" className="hover:text-[#087E8A] transition-colors whitespace-nowrap">
            Locations
          </a>
          <a href="#protection" className="hover:text-[#087E8A] transition-colors whitespace-nowrap">
            Escrow & Protection
          </a>
        </nav>

        {/* Zone 3: Primary Actions (Host Entry Point & Customer Auth Only) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onNavigateToHostPortal}
            className="text-xs font-semibold text-[#075762] hover:text-[#087E8A] px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Become a Host
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700 hidden sm:inline">
                {currentUser.firstName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              themeContext="user"
              onClick={onOpenAuthModal}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
