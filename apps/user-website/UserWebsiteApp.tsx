import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../packages/ui';
import { apiClient } from '../../packages/api-client';
import { ParkingLocation, SessionUser } from '../../packages/contracts';
import { UserHeader } from './components/UserHeader';
import { UserHero } from './components/UserHero';
import { LocationCard } from './components/LocationCard';
import { UserFooter } from './components/UserFooter';
import { HoldReservationModal } from './components/HoldReservationModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import {
  ToastNotification,
  ToastItem,
  ToastType,
} from './components/ToastNotification';
import { SearchPageView } from './views/SearchPageView';
import { SpaceDetailsPageView } from './views/SpaceDetailsPageView';
import { AuthPageView } from './views/AuthPageView';
import {
  BookingReviewPendingView,
  CheckoutPendingView,
  BookingConfirmationPendingView,
  BookingsPendingView,
  ProfilePendingView,
} from './views/RoutePendingView';

interface UserWebsiteAppProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const UserWebsiteApp: React.FC<UserWebsiteAppProps> = ({
  currentPath = '/',
  onNavigate,
}) => {
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Toast Helper
  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, durationMs?: number) => {
      const id = 'toast-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
      setToasts((prev) => [...prev, { id, type, message, title, durationMs }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch verified inventory
  const fetchLocations = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    apiClient
      .getLocations()
      .then((data) => {
        setLocations(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('[ParkEazy-Frontend] Non-blocking locations API notice:', err.message);
        setLoadError(err.message || 'Unable to connect to inventory service.');
        setIsLoading(false);
      });
  }, []);

  // Check active session & load inventory on mount
  useEffect(() => {
    fetchLocations();

    // Verify session
    setIsSessionLoading(true);
    apiClient
      .getSession()
      .then((res) => {
        if (res && res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch((err) => {
        console.warn('[ParkEazy-Frontend] Session check notice:', err.message);
        setCurrentUser(null);
      })
      .finally(() => {
        setIsSessionLoading(false);
      });
  }, [fetchLocations]);

  // Handle URL-based auth triggers (e.g. /login, /register)
  useEffect(() => {
    if (currentPath === '/login' || currentPath === '/register') {
      setIsAuthModalOpen(true);
    }
  }, [currentPath]);

  // Handle Selection of Location for Hold Modal
  const handleSelectLocation = (loc: ParkingLocation) => {
    setSelectedLocation(loc);
    setIsHoldModalOpen(true);
  };

  // Sign In Success Handler
  const handleAuthSuccess = (user: SessionUser) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    showToast(
      'success',
      `Welcome back, ${user.firstName}! Your customer account is active.`,
      'Signed In'
    );
    // If was on login/register route, navigate to /
    if (currentPath === '/login' || currentPath === '/register') {
      onNavigate('/');
    }
  };

  // Sign Out Handler
  const handleSignOut = () => {
    apiClient.setAuthToken(null);
    setCurrentUser(null);
    showToast('info', 'You have been signed out of ParkEazy.', 'Signed Out');
  };

  // Parse path and query parameters
  const { pathname, searchParams, spaceId, bookingId } = useMemo(() => {
    let rawPath = currentPath;
    let rawSearch = '';
    const qIndex = rawPath.indexOf('?');
    if (qIndex !== -1) {
      rawSearch = rawPath.substring(qIndex);
      rawPath = rawPath.substring(0, qIndex);
    } else if (typeof window !== 'undefined' && window.location.search) {
      rawSearch = window.location.search;
    }

    const cleanPath = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(rawSearch);

    // Match /spaces/:id
    const spacesMatch = cleanPath.match(/^\/spaces\/([^/]+)$/);
    const matchedSpaceId = spacesMatch ? spacesMatch[1] : null;

    // Match /booking/confirmation/:id
    const confirmMatch = cleanPath.match(/^\/booking\/confirmation\/([^/]+)$/);
    const matchedBookingId = confirmMatch ? confirmMatch[1] : null;

    return {
      pathname: cleanPath,
      searchParams: params,
      spaceId: matchedSpaceId,
      bookingId: matchedBookingId,
    };
  }, [currentPath]);

  // Render view corresponding to route
  const renderActiveView = () => {
    if (pathname === '/search') {
      return (
        <SearchPageView
          searchParams={searchParams}
          onNavigate={onNavigate}
          onSelectLocation={handleSelectLocation}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
          showToast={showToast}
        />
      );
    }

    if (spaceId) {
      return (
        <SpaceDetailsPageView
          spaceId={spaceId}
          onNavigate={onNavigate}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
          showToast={showToast}
        />
      );
    }

    if (pathname === '/booking/review') {
      return (
        <BookingReviewPendingView
          onNavigate={onNavigate}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
        />
      );
    }

    if (pathname === '/checkout') {
      return (
        <CheckoutPendingView
          onNavigate={onNavigate}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
        />
      );
    }

    if (bookingId) {
      return (
        <BookingConfirmationPendingView
          onNavigate={onNavigate}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
          bookingId={bookingId}
        />
      );
    }

    if (pathname === '/bookings') {
      return (
        <BookingsPendingView
          onNavigate={onNavigate}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
        />
      );
    }

    if (pathname === '/profile') {
      return (
        <ProfilePendingView
          onNavigate={onNavigate}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      );
    }

    if (pathname === '/login') {
      return (
        <AuthPageView
          mode="login"
          onNavigate={onNavigate}
          onSuccess={handleAuthSuccess}
          currentUser={currentUser}
          showToast={showToast}
        />
      );
    }

    if (pathname === '/register') {
      return (
        <AuthPageView
          mode="register"
          onNavigate={onNavigate}
          onSuccess={handleAuthSuccess}
          currentUser={currentUser}
          showToast={showToast}
        />
      );
    }

    // Default: Homepage View (/ or /index.html)
    return (
      <>
        {/* Hero Section with Search Interface and Invariants Strip */}
        <UserHero
          onSearch={(params) => {
            if (params && (params.location || params.bayType !== 'ALL')) {
              const query = new URLSearchParams();
              if (params.location) query.set('q', params.location);
              if (params.durationHours) query.set('duration', params.durationHours.toString());
              if (params.bayType && params.bayType !== 'ALL') query.set('bayType', params.bayType);
              onNavigate(`/search?${query.toString()}`);
            } else {
              const locEl = document.getElementById('locations');
              if (locEl) locEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onOpenHostPortal={() => onNavigate('/host/')}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16 sm:space-y-20">
          {/* Core Capabilities Bento */}
          <section id="how-it-works" className="space-y-6 sm:space-y-8">
            <div>
              <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-2">
                Architecture & Invariants
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
                Designed for certainty, not parking lot guessing.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087E8A] flex items-center justify-center mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-mono font-bold text-[#087E8A] mb-1">
                    01. Authoritative 10-Minute Hold
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Persistent Lock Invariant
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When you pick a bay, the server places a temporary 600-second lock. Other drivers cannot book or race for your space while you review your quote.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087E8A] flex items-center justify-center mb-4">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-mono font-bold text-[#087E8A] mb-1">
                    02. Physical Bay Identity
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Discrete Bay Verification
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A location and a physical parking bay are modeled as separate entities. You reserve an exact physical bay (e.g. Bay B2-30 with EV charging), not an unassigned quota.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087E8A] flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-mono font-bold text-[#087E8A] mb-1">
                    03. Segregated Escrow
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Double-Entry Deposit Ledger
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Security deposits are tracked in an append-only ledger segregated from platform revenue and host payouts, ensuring automated refund release after checkout.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Parking Locations Section (Loading, Empty, Error Retry, Populated) */}
          <section id="locations" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-1">
                  Verified Inventory
                </div>
                <h2 className="text-2xl font-extrabold text-[#162A2D] tracking-tight">
                  Available Parking Spaces
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Connected to <span className="font-mono text-slate-700">/api/v1/inventory/locations</span>
                </span>
                <button
                  type="button"
                  onClick={fetchLocations}
                  aria-label="Refresh inventory"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#087E8A]' : ''}`} />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-xl border border-slate-200 p-5 h-80 animate-pulse flex flex-col justify-between"
                  >
                    <div className="w-full h-44 bg-slate-100 rounded-lg" />
                    <div className="space-y-2 pt-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <div className="text-sm font-bold text-amber-900">
                  Unable to connect to verified inventory
                </div>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                  {loadError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLocations}
                  className="gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Loading Inventory</span>
                </Button>
              </div>
            ) : locations.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800">
                  No active locations found in this market
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hosts frequently add new bays in downtown financial hubs and residential corridors.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLocations}
                >
                  Check Again
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                {locations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onSelect={handleSelectLocation}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Host Portal Conversion Banner */}
          <section className="bg-gradient-to-br from-[#0F766E] to-[#12211C] rounded-2xl p-8 sm:p-12 xl:p-14 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <div className="text-xs font-bold tracking-wider text-emerald-300 uppercase mb-2">
                Have an empty parking bay, driveway, or garage?
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
                Monetize your parking space with ParkEazy Host Portal.
              </h2>
              <p className="text-sm text-emerald-100/90 leading-relaxed mb-6">
                Manage physical bays, set hourly/daily rates, monitor automated gate access codes, and track earnings with automated payout settlements.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  themeContext="host"
                  onClick={() => onNavigate('/host/')}
                  className="gap-2 px-5 py-2.5"
                >
                  <span>Open Host Portal Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <div className="text-xs text-emerald-200/80">
                  85% host revenue share · No upfront subscription fee
                </div>
              </div>
            </div>
          </section>
        </main>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F8F7] text-[#162A2D] flex flex-col font-sans">
      {/* Public User Header (Clean 3-Zone Navigation & Mobile Drawer) */}
      <UserHeader
        currentPath={pathname}
        onNavigate={onNavigate}
        onNavigateToHostPortal={() => onNavigate('/host/')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        isSessionLoading={isSessionLoading}
        onSignOut={handleSignOut}
      />

      {/* Viewport Content */}
      <div className="flex-1 flex flex-col">{renderActiveView()}</div>

      {/* Shared Footer */}
      <UserFooter
        onNavigate={onNavigate}
        onOpenHostPortal={() => onNavigate('/host/')}
      />

      {/* Reservation & Hold Modal */}
      <HoldReservationModal
        location={selectedLocation}
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
