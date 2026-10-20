import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { LocationSuggestion, VehicleType } from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
  onSelectLocation?: (location: LocationSuggestion) => void;
  initialQuery?: string;
}

export function LocationSearchSuggestionsPage({
  onNavigate,
  onSelectLocation,
  initialQuery = 'Anna',
}: Props) {
  const { tenant } = useBrand();
  const [query, setQuery] = useState(initialQuery);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('car');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Anna Nagar Roundtana, Chennai',
    'Nexus Vijaya Mall, Vadapalani',
  ]);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const client = new ApiClient();

  useEffect(() => {
    let isMounted = true;
    client.search.getSuggestions(query).then((data) => {
      if (isMounted) {
        setSuggestions(data);
      }
    }).catch(() => {
      // Fallback suggestions
      if (isMounted) {
        setSuggestions([
          {
            id: 'hub-anna-nagar',
            title: 'Anna Nagar Roundtana, Chennai',
            subtitle: 'Near Roundtana Metro & Roundtana Police Booth',
            type: 'metro_station',
            coordinates: { latitude: 13.0850, longitude: 80.2100 },
            verifiedSpacesAvailable: 24,
            tags: ['Metro Station', 'Covered Garage', 'EV Charging'],
            distanceKm: 0.8,
          },
          {
            id: 'hub-t-nagar',
            title: 'T. Nagar Commercial Center',
            subtitle: 'Commercial shopping arcade & Usman Road',
            type: 'commercial_hub',
            coordinates: { latitude: 13.0400, longitude: 80.2330 },
            verifiedSpacesAvailable: 36,
            tags: ['Multi-Level', 'ANPR Barrier', 'CCTV Security'],
            distanceKm: 2.1,
          },
          {
            id: 'hub-vadapalani',
            title: 'Nexus Vijaya Mall, Vadapalani',
            subtitle: 'Multi-level covered mall basement parking',
            type: 'commercial_hub',
            coordinates: { latitude: 13.0520, longitude: 80.2120 },
            verifiedSpacesAvailable: 48,
            tags: ['Mall Basement', 'Valet Available'],
            distanceKm: 3.4,
          },
        ]);
      }
    });
    return () => { isMounted = false; };
  }, [query]);

  const handleSelect = (item: LocationSuggestion) => {
    if (onSelectLocation) {
      onSelectLocation(item);
    }
    // Update recent searches
    if (!recentSearches.includes(item.title)) {
      setRecentSearches([item.title, ...recentSearches.slice(0, 4)]);
    }
    onNavigate(`/search?q=${encodeURIComponent(item.title)}&lat=${item.coordinates.latitude}&lng=${item.coordinates.longitude}&vehicle=${selectedVehicle}`);
  };

  const handleGpsTrigger = () => {
    setIsDetectingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsDetectingGps(false);
          onNavigate(`/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&q=Current+Location&vehicle=${selectedVehicle}`);
        },
        () => {
          setIsDetectingGps(false);
          // Fallback to Anna Nagar coordinates
          onNavigate('/search/permission');
        },
        { timeout: 5000 }
      );
    } else {
      setIsDetectingGps(false);
      onNavigate('/search/permission');
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/explore')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </header>

      {/* AUTOCOMPLETE CONTAINER (location_search_suggestions_pe_uw_03_02) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Active Focused Search Dock */}
        <div className="relative bg-surface-container-lowest rounded-2xl p-2 sm:p-3 shadow-xl border border-outline-variant/30 mb-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
            {/* Destination Input */}
            <div className="relative flex-1 bg-surface-container-low rounded-xl p-3 border border-primary/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[22px]">pin_drop</span>
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-primary">
                    Destination
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Where do you want to park?"
                      className="w-full bg-transparent font-headline-sm text-lg font-bold text-on-surface focus:outline-none p-0 tracking-tight"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="w-6 h-6 rounded-full bg-surface-container-high hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pulsing Typing Indicator Badge */}
              <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-ping" />
                <span>Typing suggestions...</span>
              </div>
            </div>

            {/* When Info */}
            <div className="hidden lg:flex flex-1 px-4 py-2 hover:bg-surface-container-low rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    When
                  </span>
                  <span className="text-xs font-semibold text-on-surface truncate">
                    Today, 14:00 → 18:00
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Pill */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
              {(['bike', 'auto', 'car'] as VehicleType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSelectedVehicle(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    selectedVehicle === v
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Search CTA */}
            <button
              onClick={() => onNavigate(`/search?q=${encodeURIComponent(query)}&vehicle=${selectedVehicle}`)}
              className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* DROPDOWN AUTOCOMPLETE CARD */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden">
          {/* SECTION A: Current Location GPS Quick Trigger */}
          <div className="p-3 bg-gradient-to-r from-surface-container-low to-surface-container-lowest border-b border-outline-variant/30">
            <button
              onClick={handleGpsTrigger}
              disabled={isDetectingGps}
              className="w-full p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors flex items-center justify-between text-left group shadow-xs cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">
                    {isDetectingGps ? 'sync' : 'my_location'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                      Use My Current Location
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary text-[11px] font-bold">
                      Near You
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {isDetectingGps ? 'Detecting high-precision GPS...' : 'Detect GPS for nearest parking within 2 km'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[11px] text-on-surface-variant/80 bg-surface-container px-2 py-1 rounded">
                  Permission required
                </span>
                <span className="material-symbols-outlined text-primary text-[20px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* SECTION B: Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">history</span>
                    <span className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                      Recent Searches
                    </span>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1 mt-1">
                  {recentSearches.map((rec) => (
                    <div
                      key={rec}
                      onClick={() => onNavigate(`/search?q=${encodeURIComponent(rec)}`)}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0 group-hover:bg-primary-fixed group-hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-on-surface truncate block">
                            {rec}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            Searched recently
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline text-[18px]">north_west</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION C: Live Matching Suggestions */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">assistant_navigation</span>
                  <span className="text-xs uppercase tracking-wider font-bold text-on-surface-variant">
                    Suggested Locations & Transit Hubs
                  </span>
                </div>
                <span className="text-xs text-primary font-semibold">
                  {suggestions.length} verified destinations
                </span>
              </div>

              <div className="space-y-2 mt-1">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="group p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer shadow-xs border border-transparent hover:border-primary/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <span className="material-symbols-outlined text-[20px]">
                            {item.type === 'metro_station' ? 'train' : item.type === 'commercial_hub' ? 'apartment' : 'storefront'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-headline-sm text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                              {item.title}
                            </h4>
                            <span className="text-[10px] font-bold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded-full shrink-0">
                              {item.verifiedSpacesAvailable} bays free
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                            {item.subtitle}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-medium bg-surface-container-lowest text-on-surface-variant px-2 py-0.5 rounded"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-on-surface block">
                          ~{item.distanceKm || 1.2} km
                        </span>
                        <span className="text-[11px] text-primary font-semibold group-hover:underline">
                          Select →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
