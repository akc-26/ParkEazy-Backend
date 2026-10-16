import React, { useState, useEffect } from 'react';
import { UserHeader } from './components/UserHeader';
import { UserHero } from './components/UserHero';
import { LocationCard } from './components/LocationCard';
import { UserFooter } from './components/UserFooter';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { HoldReservationModal } from './components/HoldReservationModal';
import { ParkingLocation, SessionUser } from '../../packages/contracts';
import { apiClient } from '../../packages/api-client';
import { ShieldCheck, ArrowRight, Clock, KeyRound } from 'lucide-react';
import { Button } from '../../packages/ui';

interface UserWebsiteAppProps {
  onNavigate: (path: string) => void;
}

export const UserWebsiteApp: React.FC<UserWebsiteAppProps> = ({ onNavigate }) => {
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // Probe backend inventory
    apiClient
      .getLocations()
      .then((data) => {
        setLocations(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load locations from API:', err);
        setIsLoading(false);
      });

    // Check existing session
    apiClient
      .getSession()
      .then((res) => {
        if (res.user) setCurrentUser(res.user);
      })
      .catch(() => {});
  }, []);

  const handleSelectLocation = (loc: ParkingLocation) => {
    setSelectedLocation(loc);
    setIsHoldModalOpen(true);
  };

  const handleSignOut = () => {
    apiClient.setAuthToken(null);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F8F7] text-[#162A2D] flex flex-col font-sans">
      {/* Public User Header (Clean Marketplace Navigation Only) */}
      <UserHeader
        onNavigateToHostPortal={() => onNavigate('/host/')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Hero Section with Search Interface and Balanced Grid */}
      <UserHero
        onSearch={() => {
          const locEl = document.getElementById('locations');
          if (locEl) locEl.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenHostPortal={() => onNavigate('/host/')}
      />

      {/* Main Content Viewport (Balanced responsive container) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16 sm:space-y-20">
        {/* Core Capabilities Bento (Anti-Slop Numbered Sequence) */}
        <section id="how-it-works" className="space-y-6 sm:space-y-8">
          <div>
            <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-2">
              Architecture & Mechanism
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

        {/* Featured Parking Locations Section */}
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
            <div className="text-xs text-slate-500">
              Connected live to <span className="font-mono text-slate-700">/api/v1/inventory/locations</span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-xl border border-slate-200 p-5 h-80 animate-pulse"></div>
              ))}
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

        {/* Host Portal Conversion Banner (Explicit Entry Point) */}
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

      {/* Footer */}
      <UserFooter onOpenHostPortal={() => onNavigate('/host/')} />

      {/* Reservation & Hold Modal */}
      <HoldReservationModal
        location={selectedLocation}
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
      />

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
};
