import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  User as UserIcon,
  Search,
  CalendarCheck,
  ChevronDown,
  LogOut,
  Building2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../packages/ui';
import { SessionUser } from '../../../packages/contracts';

interface UserHeaderProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
  onNavigateToHostPortal: () => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  isSessionLoading?: boolean;
  onSignOut: () => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  currentPath = '/',
  onNavigate,
  onNavigateToHostPortal,
  onOpenAuthModal,
  currentUser,
  isSessionLoading = false,
  onSignOut,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Handler for navigation links (handles both route navigation and homepage anchors)
  const handleNavClick = (
    e: React.MouseEvent,
    target: string,
    isAnchor = false
  ) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);

    if (isAnchor) {
      if (currentPath === '/' || currentPath === '/index.html') {
        const el = document.querySelector(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      // If on another route, navigate to home with anchor
      onNavigate('/' + target);
      return;
    }

    onNavigate(target);
  };

  const isSearchActive = currentPath === '/search';
  const isBookingsActive = currentPath === '/bookings';
  const isProfileActive = currentPath === '/profile';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-[#087E8A] rounded-lg p-1 -m-1"
            aria-label="ParkEazy Home"
          >
            <div className="w-9 h-9 rounded-lg bg-[#087E8A] flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-[#076D77] transition-colors">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-[#162A2D] whitespace-nowrap">
              ParkEazy
            </span>
          </a>

          {/* Zone 2: Navigation Links (Desktop: Anti-Slop Single-Line, Contextual Active State) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium text-slate-600"
          >
            <a
              href="/search"
              onClick={(e) => handleNavClick(e, '/search')}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                isSearchActive
                  ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                  : 'border-transparent hover:text-[#087E8A]'
              }`}
            >
              Find Parking
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, '#how-it-works', true)}
              className="border-b-2 border-transparent hover:text-[#087E8A] transition-colors whitespace-nowrap py-1"
            >
              How It Works
            </a>
            <a
              href="#locations"
              onClick={(e) => handleNavClick(e, '#locations', true)}
              className="border-b-2 border-transparent hover:text-[#087E8A] transition-colors whitespace-nowrap py-1"
            >
              Locations
            </a>
            <a
              href="/bookings"
              onClick={(e) => {
                if (!currentUser) {
                  e.preventDefault();
                  onOpenAuthModal();
                } else {
                  handleNavClick(e, '/bookings');
                }
              }}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                isBookingsActive
                  ? 'text-[#087E8A] font-semibold border-[#087E8A]'
                  : 'border-transparent hover:text-[#087E8A]'
              }`}
            >
              My Bookings
            </a>
          </nav>

          {/* Zone 3: Primary Actions & Account Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Host Portal Link */}
            <button
              type="button"
              onClick={onNavigateToHostPortal}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#075762] hover:text-[#087E8A] px-3 py-1.5 rounded-lg hover:bg-teal-50/60 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Become a Host</span>
            </button>

            {/* Authentication States */}
            {isSessionLoading ? (
              <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
            ) : currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-all focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                >
                  <div className="w-6 h-6 rounded-full bg-[#087E8A]/10 text-[#087E8A] flex items-center justify-center font-bold text-xs">
                    {currentUser.firstName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-medium text-slate-700 hidden sm:inline max-w-[100px] truncate">
                    {currentUser.firstName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {currentUser.firstName} {currentUser.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {currentUser.email}
                      </div>
                      <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-[#087E8A]">
                        {currentUser.roles?.[0] || 'Customer'}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => handleNavClick(e, '/bookings')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                          isBookingsActive
                            ? 'text-[#087E8A] font-semibold bg-teal-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        <CalendarCheck className="w-4 h-4 text-slate-400" />
                        <span>My Bookings</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => handleNavClick(e, '/profile')}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                          isProfileActive
                            ? 'text-[#087E8A] font-semibold bg-teal-50/50'
                            : 'text-slate-700'
                        }`}
                      >
                        <Sliders className="w-4 h-4 text-slate-400" />
                        <span>Profile & Vehicles</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <a
                  href="/login"
                  onClick={(e) => handleNavClick(e, '/login')}
                  className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#087E8A] hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  onClick={(e) => handleNavClick(e, '/register')}
                  className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#087E8A] hover:bg-[#076D77] transition-colors shadow-xs"
                >
                  Register
                </a>
              </div>
            )}

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-900" />
              ) : (
                <Menu className="w-5 h-5 text-slate-900" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu Panel */}
          <nav
            aria-label="Mobile Navigation"
            className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200">
              <a
                href="/"
                onClick={(e) => handleNavClick(e, '/')}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-[#087E8A] flex items-center justify-center text-white font-bold text-base shadow-xs">
                  P
                </div>
                <span className="text-lg font-bold text-[#162A2D]">ParkEazy</span>
              </a>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Status Card in Drawer */}
            <div className="p-4 border-b border-slate-100 bg-[#F4F8F7]/70">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#087E8A] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {currentUser.firstName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.firstName} {currentUser.lastName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">
                    Sign in to manage reservations, vehicle details, and gate PINs.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleNavClick(e, '/login')}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
                    >
                      Sign In as Driver
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleNavClick(e, '/register')}
                      className="w-full py-2 px-3 text-xs font-semibold rounded-lg text-white bg-[#087E8A] hover:bg-[#076D77] transition-colors text-center shadow-xs"
                    >
                      Create Driver Account
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Links List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                Marketplace
              </div>
              <button
                type="button"
                onClick={(e) => handleNavClick(e, '/search')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                  isSearchActive
                    ? 'bg-teal-50 text-[#087E8A] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Search className="w-4 h-4 text-[#087E8A]" />
                <span>Find Parking Spaces</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleNavClick(e, '#how-it-works', true)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <div className="w-4 h-4 rounded-full border border-slate-400 text-[10px] font-mono flex items-center justify-center">
                  i
                </div>
                <span>How It Works</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleNavClick(e, '#locations', true)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <div className="w-4 h-4 text-slate-500 flex items-center justify-center">
                  📍
                </div>
                <span>Available Locations</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  if (!currentUser) {
                    setIsMobileMenuOpen(false);
                    onOpenAuthModal();
                  } else {
                    handleNavClick(e, '/bookings');
                  }
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                  isBookingsActive
                    ? 'bg-teal-50 text-[#087E8A] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-[#087E8A]" />
                <span>My Bookings</span>
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={(e) => handleNavClick(e, '/profile')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                    isProfileActive
                      ? 'bg-teal-50 text-[#087E8A] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-[#087E8A]" />
                  <span>Profile & Vehicles</span>
                </button>
              )}

              <div className="pt-4 mt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Partner Portals
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onNavigateToHostPortal();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#075762] hover:bg-teal-50 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-[#087E8A]" />
                    <span>Host Portal Workspace</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            {currentUser && (
              <div className="p-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of ParkEazy</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
};
