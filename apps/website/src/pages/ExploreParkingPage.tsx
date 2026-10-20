import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, VehicleType, ExploreCatalogHub } from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  initialVehicle?: VehicleType;
}

export function ExploreParkingPage({ currentUser, onNavigate, onLogout, initialVehicle = 'car' }: Props) {
  const { tenant } = useBrand();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(initialVehicle);
  const [searchLocation, setSearchLocation] = useState('Anna Nagar, Chennai');
  const [activeCategory, setActiveCategory] = useState<'all' | 'transit' | 'commercial' | 'mall' | 'ev_hub'>('all');
  const [hubs, setHubs] = useState<ExploreCatalogHub[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const client = new ApiClient();

  useEffect(() => {
    let isMounted = true;
    client.search.getExploreCatalog()
      .then((data) => {
        if (isMounted) {
          setHubs(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback static hubs
          setHubs([
            {
              id: 'cat-anna-nagar',
              name: 'Anna Nagar Metro & Shopping Hub',
              category: 'transit',
              badge: 'Top Pick • High Clearance',
              location: '2nd Avenue, Anna Nagar West',
              coordinates: { latitude: 13.0850, longitude: 80.2100 },
              startingPriceInr: 40,
              availableBays: 24,
              rating: 4.9,
              photoUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
            },
            {
              id: 'cat-t-nagar',
              name: 'T. Nagar Commercial Hub',
              category: 'commercial',
              badge: 'Covered • Multi-Level',
              location: 'Usman Road, T. Nagar',
              coordinates: { latitude: 13.0400, longitude: 80.2330 },
              startingPriceInr: 50,
              availableBays: 36,
              rating: 4.8,
              photoUrl: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80',
            },
            {
              id: 'cat-vadapalani',
              name: 'Nexus Vijaya Mall Super Hub',
              category: 'mall',
              badge: 'EV Fast Charging • 24/7',
              location: 'Vadapalani Concourse',
              coordinates: { latitude: 13.0520, longitude: 80.2120 },
              startingPriceInr: 45,
              availableBays: 48,
              rating: 4.7,
              photoUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80',
            },
            {
              id: 'cat-airport',
              name: 'Chennai Airport MLCP Terminal Hub',
              category: 'transit',
              badge: 'Flight Transit • ANPR Pass',
              location: 'Meenambakkam, GST Road',
              coordinates: { latitude: 12.9800, longitude: 80.1600 },
              startingPriceInr: 60,
              availableBays: 60,
              rating: 4.9,
              photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
            },
          ]);
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(`/search?q=${encodeURIComponent(searchLocation)}&vehicle=${selectedVehicle}`);
  };

  const filteredHubs = activeCategory === 'all'
    ? hubs
    : hubs.filter((h) => h.category === activeCategory);

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline-sm font-bold shadow-xs">
                P
              </div>
              <span className="font-headline-sm font-extrabold text-xl text-on-surface tracking-tight">
                {tenant.displayName}
              </span>
            </button>
            <nav className="hidden md:flex items-center gap-3">
              <button
                onClick={() => onNavigate('/explore')}
                className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-sm font-semibold transition-colors"
              >
                Find Parking
              </button>
              <button
                onClick={() => onNavigate('/search')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm font-medium transition-colors"
              >
                Map View
              </button>
              <button
                onClick={() => onNavigate('/search/filters')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm font-medium transition-colors"
              >
                Preferences
              </button>
              <button
                onClick={() => onNavigate('/search/permission')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-sm font-medium transition-colors"
              >
                Telemetry & GPS
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/')}
              className="hidden sm:inline-flex items-center text-sm font-semibold text-primary hover:bg-surface-container px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Become a Host
            </button>
            <div className="hidden sm:block h-5 w-px bg-outline-variant/40" />
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-on-surface bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/30">
                  {currentUser.fullName || currentUser.email}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="text-xs font-semibold text-error hover:underline cursor-pointer"
                  >
                    Logout
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/login')}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => onNavigate('/signup')}
                  className="px-4 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO & SEARCH DOCK (explore_parking_pe_uw_03_01) */}
      <section className="relative w-full pt-10 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-surface-container-high/40 via-surface to-surface overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto flex flex-col items-center">
          {/* Guarantee Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container text-primary text-xs font-bold mb-4 shadow-xs">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Metropolitan Spot Guarantee • 24 Hubs Online</span>
          </div>

          <div className="text-center max-w-3xl mb-8">
            <h1 className="font-headline-xl text-3xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-3">
              Explore Parking Across{' '}
              <span className="text-primary underline decoration-secondary-fixed decoration-4 underline-offset-4">
                Metropolitan Hubs
              </span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto">
              Reserve verified private bays, EV charging stations, and seamless barrier-free parking in real time.
            </p>
          </div>

          {/* Elevated Multi-Zone Search Dock */}
          <div className="w-full max-w-5xl bg-surface-container-lowest rounded-2xl shadow-xl p-3 sm:p-4 mb-8 border border-outline-variant/30">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              {/* Zone 1: Location */}
              <div
                onClick={() => onNavigate('/search/suggestions')}
                className="lg:col-span-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary text-[24px]">location_on</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Destination / Hub
                  </span>
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    placeholder="Search hub, metro station, airport..."
                    className="w-full bg-transparent text-sm font-semibold text-on-surface focus:outline-none truncate"
                  />
                </div>
              </div>

              {/* Zone 2: Date & Arrival / Departure */}
              <div className="lg:col-span-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-secondary text-[24px]">schedule</span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Arrival & Departure
                  </span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface truncate">
                    <span>Today, 14:00</span>
                    <span className="text-outline">→</span>
                    <span>Today, 18:00</span>
                    <span className="text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-surface-container-high">
                      (4 hrs)
                    </span>
                  </div>
                </div>
              </div>

              {/* Zone 3: Vehicle Type Selector Pills */}
              <div className="lg:col-span-3 flex items-center justify-between gap-1 p-1 rounded-xl bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => setSelectedVehicle('bike')}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-all text-xs font-semibold ${
                    selectedVehicle === 'bike'
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                    <span>Bike</span>
                  </div>
                  <span className="text-[10px] opacity-80">₹15/hr</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVehicle('auto')}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-all text-xs font-semibold ${
                    selectedVehicle === 'auto'
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">electric_rickshaw</span>
                    <span>Auto</span>
                  </div>
                  <span className="text-[10px] opacity-80">₹25/hr</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVehicle('car')}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-all text-xs font-semibold ${
                    selectedVehicle === 'car'
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">directions_car</span>
                    <span>Car</span>
                  </div>
                  <span className="text-[10px] opacity-80">₹40/hr</span>
                </button>
              </div>

              {/* Zone 4: Search CTA */}
              <div className="lg:col-span-1 flex items-center">
                <button
                  type="submit"
                  className="w-full h-13 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px]">search</span>
                  <span className="lg:hidden text-sm">Find Parking</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick-Filter Chips Dock */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-1">
              Top Categories:
            </span>
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              All Hubs
            </button>
            <button
              onClick={() => setActiveCategory('transit')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'transit'
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">train</span>
              <span>Metro & Railway Stations</span>
            </button>
            <button
              onClick={() => setActiveCategory('commercial')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'commercial'
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">apartment</span>
              <span>Commercial Districts</span>
            </button>
            <button
              onClick={() => setActiveCategory('mall')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === 'mall'
                  ? 'bg-primary-container text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              <span>Shopping Malls</span>
            </button>
            <button
              onClick={() => onNavigate('/search/filters')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container-lowest border border-primary/40 text-primary hover:bg-primary/10 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>More Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* DISCOVERY HUBS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-headline-md text-2xl font-bold text-on-surface">
              Featured Parking Facilities & Transit Hubs
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Instant guaranteed reservations with 24/7 attendant pass
            </p>
          </div>
          <button
            onClick={() => onNavigate('/search')}
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline cursor-pointer"
          >
            <span>Explore on Live Map</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredHubs.map((hub) => (
              <div
                key={hub.id}
                className="group bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-44 overflow-hidden bg-surface-container">
                  <img
                    src={hub.photoUrl}
                    alt={hub.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                    {hub.badge}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">star</span>
                    <span>{hub.rating}</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-headline-sm text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                      {hub.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[15px] text-primary">pin_drop</span>
                      <span>{hub.location}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-sm text-lg font-extrabold text-on-surface">
                          ₹{hub.startingPriceInr}
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">/hr</span>
                      </div>
                      <span className="text-[11px] text-secondary font-bold">
                        {hub.availableBays} bays free
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigate(`/search?q=${encodeURIComponent(hub.name)}`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-bold hover:bg-primary shadow-xs transition-all cursor-pointer"
                    >
                      <span>Book</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-outline-variant/30 bg-surface-container-lowest py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-on-surface-variant">
        <p>© 2026 {tenant.displayName} Inc. All rights reserved. • Chennai Metropolitan Transportation Corporation Authorized Partner.</p>
      </footer>
    </div>
  );
}
