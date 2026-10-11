import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';

interface Props {
  onNavigate: (path: string) => void;
}

export function SearchLoadingPermissionStatesPage({ onNavigate }: Props) {
  const { tenant } = useBrand();
  const [activeTab, setActiveTab] = useState<'loading' | 'permission' | 'denied' | 'error'>('loading');
  const [progressPct, setProgressPct] = useState(68);

  const triggerRequery = () => {
    setProgressPct(0);
    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <span className="hidden sm:inline-block text-xs bg-surface-container px-2.5 py-1 rounded-full text-on-surface-variant font-semibold">
              Search States & Diagnostics
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerRequery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
              <span>Re-trigger Query Cycle</span>
            </button>
            <button
              onClick={() => onNavigate('/search')}
              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container cursor-pointer"
            >
              Live Search Results
            </button>
          </div>
        </div>
      </header>

      {/* STATE SELECTOR TABS (search_loading_error_location_permission_states_pe_uw_03_08) */}
      <div className="bg-surface-container-low border-b border-outline-variant/30 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mr-2">
            Select State:
          </span>
          <button
            onClick={() => setActiveTab('loading')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'loading'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            01. Live Search Loading & Skeleton
          </button>
          <button
            onClick={() => setActiveTab('permission')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'permission'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            02. Location Permission Prompt
          </button>
          <button
            onClick={() => setActiveTab('denied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'denied'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            03. Permission Denied Recovery
          </button>
          <button
            onClick={() => setActiveTab('error')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'error'
                ? 'bg-primary-container text-on-primary shadow-xs'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            04. Network & Sensor Error
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* STATE 01: LOADING SKELETON */}
        {activeTab === 'loading' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                  01
                </span>
                <h2 className="font-headline-lg text-lg font-bold text-on-surface">
                  Live Search Loading & Sensor Telemetry
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-bold">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span>Simulating real-time WebSocket telemetry stream (45ms ping)</span>
              </div>
            </div>

            {/* Pulsing Telemetry Ingest Header */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">radar</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary ring-2 ring-white animate-ping" />
                </div>
                <div>
                  <h3 className="font-headline-md text-sm font-bold text-on-surface">
                    Finding verified bays near Anna Nagar...
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Anna Nagar West • Standard Sedan • Today, 14:00 - 18:00
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1 w-full md:w-64">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">Gate telemetry ingest</span>
                  <span className="font-bold text-primary">{progressPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-outline">18 of 24 hubs confirmed clear</span>
              </div>
            </div>

            {/* Split Skeleton Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs space-y-3"
                  >
                    <div className="h-40 rounded-xl bg-surface-container-high animate-pulse" />
                    <div className="h-4 w-48 bg-surface-container-high rounded animate-pulse" />
                    <div className="h-3 w-64 bg-surface-container-low rounded animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5 h-96 rounded-2xl bg-surface-container-low border border-outline-variant/20 p-4 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-surface-container-high animate-pulse flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[28px] text-outline">map</span>
                </div>
                <span className="text-xs font-bold text-on-surface">Rendering Spatial Coordinates</span>
                <span className="text-[11px] text-on-surface-variant mt-1">
                  Plotting GPS pins on high-resolution Chennai tile layer
                </span>
              </div>
            </div>
          </section>
        )}

        {/* STATE 02: LOCATION PERMISSION PROMPT */}
        {activeTab === 'permission' && (
          <section className="max-w-2xl mx-auto py-8">
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 shadow-xl text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-[36px]">near_me</span>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-secondary-fixed/50 text-secondary text-xs font-bold uppercase">
                  Hyperlocal Search
                </span>
                <h2 className="font-headline-xl text-2xl font-bold text-on-surface mt-2">
                  Allow Location Access for Nearby Parking
                </h2>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-2">
                  ParkEazy uses your current GPS position to identify open parking bays within 500 meters of your destination and calculate walking ETA.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-on-surface font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]">security</span>
                  <span>Privacy Guarantee:</span>
                </div>
                <p className="text-on-surface-variant">
                  Your coordinates are used strictly for immediate radius sorting and are never sold or retained beyond this search query session.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => onNavigate('/search')}
                  className="flex-1 py-3 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">my_location</span>
                  <span>Allow Location Access</span>
                </button>
                <button
                  onClick={() => onNavigate('/search/suggestions')}
                  className="py-3 px-6 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-sm transition-colors cursor-pointer"
                >
                  Enter Landmark Manually
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STATE 03: PERMISSION DENIED RECOVERY */}
        {activeTab === 'denied' && (
          <section className="max-w-2xl mx-auto py-8">
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 shadow-xl text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-error-container text-on-error-container mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">location_off</span>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-error-container text-error text-xs font-bold uppercase">
                  Location Blocked
                </span>
                <h2 className="font-headline-xl text-2xl font-bold text-on-surface mt-2">
                  Browser Location Permission Denied
                </h2>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-2">
                  We couldn’t detect your location because browser permissions are disabled for this site. You can easily enable it or search by area name.
                </p>
              </div>

              {/* Instructions steps */}
              <div className="p-4 rounded-xl bg-surface-container-low text-left space-y-3 text-xs">
                <span className="font-bold text-on-surface block uppercase tracking-wider text-[10px]">
                  How to unblock in your browser:
                </span>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-bold shrink-0">1</span>
                  <span>Click the lock or tune icon beside the URL address bar.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-bold shrink-0">2</span>
                  <span>Set <strong>Location</strong> permission from 'Blocked' to 'Allow'.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-bold shrink-0">3</span>
                  <span>Reload this page or search directly using the hub suggestions below.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => onNavigate('/search/suggestions')}
                  className="flex-1 py-3 px-6 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  <span>Search by Landmark / Metro</span>
                </button>
                <button
                  onClick={() => onNavigate('/explore')}
                  className="py-3 px-6 rounded-xl bg-surface-container text-on-surface font-semibold text-sm cursor-pointer"
                >
                  View All Hubs
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STATE 04: NETWORK & SENSOR ERROR */}
        {activeTab === 'error' && (
          <section className="max-w-2xl mx-auto py-8">
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 shadow-xl text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-tertiary-fixed text-tertiary mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">wifi_off</span>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-error-container text-error text-xs font-bold uppercase">
                  Service Timeout (504)
                </span>
                <h2 className="font-headline-xl text-2xl font-bold text-on-surface mt-2">
                  Sensor Telemetry Feed Temporarily Interrupted
                </h2>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto mt-2">
                  Unable to establish a live sensor sync with barrier controllers in Anna Nagar. Offline cached rates and reservations remain active.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
                <button
                  onClick={triggerRequery}
                  className="py-3 px-6 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  <span>Retry Sensor Connection</span>
                </button>
                <button
                  onClick={() => onNavigate('/search')}
                  className="py-3 px-6 rounded-xl bg-surface-container text-on-surface font-semibold text-sm cursor-pointer"
                >
                  Continue with Cached Bays
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
