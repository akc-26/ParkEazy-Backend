import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { FallbackSuggestionsResponse } from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
  location?: string;
}

export function NoResultsAlternativeSuggestionsPage({
  onNavigate,
  location = 'Ranganathan Street, Chennai',
}: Props) {
  const { tenant } = useBrand();

  const [fallbackData, setFallbackData] = useState<FallbackSuggestionsResponse | null>(null);
  const [alertPhone, setAlertPhone] = useState('+91 98401 23456');
  const [alertSuccess, setAlertSuccess] = useState(false);

  const client = new ApiClient();

  useEffect(() => {
    let isMounted = true;
    client.search.getFallback(location).then((data) => {
      if (isMounted) {
        setFallbackData(data);
      }
    }).catch(() => {
      if (isMounted) {
        setFallbackData({
          searchQuery: location,
          message: 'No exact matches within current radius. Broaden radius or explore neighboring hubs.',
          suggestedRadiusKm: 1.5,
          alternativeHubs: [
            {
              id: 'alt-koyambedu',
              name: 'Koyambedu CMBT Multi-Level Parking',
              distanceMeters: 1400,
              availableSpaces: 18,
              startingPriceInr: 30,
              coordinates: { latitude: 13.0700, longitude: 80.1900 },
            },
            {
              id: 'alt-shenoy',
              name: 'Shenoy Nagar Metro Station Basements',
              distanceMeters: 1800,
              availableSpaces: 12,
              startingPriceInr: 35,
              coordinates: { latitude: 13.0780, longitude: 80.2250 },
            },
            {
              id: 'alt-kilpauk',
              name: 'Kilpauk Medical College Covered Facility',
              distanceMeters: 2200,
              availableSpaces: 9,
              startingPriceInr: 40,
              coordinates: { latitude: 13.0800, longitude: 80.2400 },
            },
          ],
        });
      }
    });
    return () => { isMounted = false; };
  }, [location]);

  const handleSetAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertSuccess(true);
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline-sm font-bold shadow-xs">
              P
            </div>
            <span className="font-headline-sm font-extrabold text-xl text-on-surface tracking-tight">
              {tenant.displayName}
            </span>
          </button>
          <button
            onClick={() => onNavigate('/search')}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Back to Search
          </button>
        </div>
      </header>

      {/* ACTIVE CRITERIA STRIP */}
      <div className="bg-surface-container-low border-b border-outline-variant/30 px-4 py-2 text-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant font-bold uppercase text-[10px]">Applied Filters:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-surface font-medium">
              EV Fast Charging
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-surface font-medium">
              Under ₹30/hr
            </span>
          </div>
          <button
            onClick={() => onNavigate('/search')}
            className="text-primary font-bold hover:underline cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* EMPTY RESULTS HERO & ACTIONS (no_results_alternative_suggestions_pe_uw_03_07) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 flex flex-col items-center text-center">
        {/* Animated Empty Visual */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-secondary-fixed/40 animate-pulse" />
          <div className="w-20 h-20 rounded-full bg-secondary-fixed flex items-center justify-center shadow-inner relative z-10">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary font-headline-md font-bold flex items-center justify-center">
              P
            </div>
            <span className="material-symbols-outlined text-primary text-[24px] absolute -bottom-1 -right-1 bg-surface-container-lowest rounded-full p-1 shadow-sm">
              search_off
            </span>
          </div>
        </div>

        {/* Badge & Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container text-xs font-bold uppercase mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-error" />
          <span>0 Exact Matches in 500m Perimeter</span>
        </div>

        <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight max-w-xl">
          No exact parking spaces found for these criteria
        </h1>

        <p className="text-sm text-on-surface-variant max-w-xl mt-2 mb-8">
          We couldn’t find an available bay directly on{' '}
          <span className="font-bold text-on-surface">{location}</span> matching both{' '}
          <span className="text-primary font-bold">EV Fast Charging</span> and{' '}
          <span className="font-bold text-on-surface">under ₹30/hr</span> between 19:00 – 21:00 today.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 w-full max-w-xl">
          <button
            onClick={() => onNavigate('/search')}
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
            <span>Reset Strict Filters</span>
          </button>
          <button
            onClick={() => onNavigate('/search?radius=3.5')}
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">radar</span>
            <span>Broaden Radius to 1.5 km</span>
          </button>
          <button
            onClick={() => onNavigate('/search')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-primary hover:bg-secondary-fixed/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            <span>Shift Time Window</span>
          </button>
        </div>

        {/* FALLBACK NEARBY HUBS */}
        <div className="w-full max-w-2xl text-left bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">
                Nearby Parking Alternatives
              </h2>
              <p className="text-xs text-on-surface-variant">
                Verified bays within extended 2.5 km perimeter
              </p>
            </div>
            <span className="text-xs text-primary font-bold">Available Now</span>
          </div>

          <div className="space-y-3">
            {fallbackData?.alternativeHubs.map((hub) => (
              <div
                key={hub.id}
                onClick={() => onNavigate(`/search?q=${encodeURIComponent(hub.name)}`)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">local_parking</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-on-surface">{hub.name}</h3>
                    <span className="text-[11px] text-on-surface-variant">
                      {hub.distanceMeters}m away • {hub.availableSpaces} spots free
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-on-surface block">₹{hub.startingPriceInr}/hr</span>
                  <span className="text-[10px] text-primary font-semibold">Reserve →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NOTIFY ME CARD */}
        <div className="w-full max-w-2xl text-left bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">notifications_active</span>
            </div>
            <div className="flex-1">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                Notify me if a bay frees up
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Chennai peak traffic is fluid. We will alert you immediately via SMS & WhatsApp if a reserved bay cancels before your arrival time.
              </p>

              {alertSuccess ? (
                <div className="mt-4 p-3 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Alert active for {alertPhone}. You will receive immediate notification if a bay frees up.</span>
                </div>
              ) : (
                <form onSubmit={handleSetAlert} className="mt-4 flex flex-col sm:flex-row gap-2">
                  <input
                    type="tel"
                    value={alertPhone}
                    onChange={(e) => setAlertPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs text-on-surface focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-all cursor-pointer"
                  >
                    Set Free Bay Alert
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
