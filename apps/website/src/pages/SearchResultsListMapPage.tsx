import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  SearchResultFacility,
  VehicleType,
  SearchSortOption,
  SearchFilters,
} from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
  initialQuery?: string;
  initialVehicle?: VehicleType;
  initialFilters?: SearchFilters;
}

export function SearchResultsListMapPage({
  onNavigate,
  initialQuery = 'Anna Nagar, Chennai',
  initialVehicle = 'car',
  initialFilters = {},
}: Props) {
  const { tenant } = useBrand();

  const [searchLocation, setSearchLocation] = useState(initialQuery);
  const [vehicle, setVehicle] = useState<VehicleType>(initialVehicle);
  const [sortBy, setSortBy] = useState<SearchSortOption>('recommended');
  const [activeChip, setActiveChip] = useState<string | null>('covered');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const [results, setResults] = useState<SearchResultFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState<'map' | 'satellite'>('map');

  const client = new ApiClient();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const queryFilters: SearchFilters = {
      ...initialFilters,
      isCovered: activeChip === 'covered' ? true : initialFilters.isCovered,
      hasEvCharger: activeChip === 'ev' ? true : initialFilters.hasEvCharger,
      hasSecurityGuard: activeChip === 'guard' ? true : initialFilters.hasSecurityGuard,
      maxHourlyRate: activeChip === 'under50' ? 50 : initialFilters.maxHourlyRate,
    };

    client.search
      .query({
        query: searchLocation,
        vehicleCategory: vehicle,
        sortBy,
        filters: queryFilters,
        durationHours: 4,
      })
      .then((res) => {
        if (isMounted) {
          setResults(res.results);
          if (res.results.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(res.results[0].facilityId);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          // If error or empty fallback to empty state
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchLocation, vehicle, sortBy, activeChip]);

  const selectedFacility = results.find((r) => r.facilityId === selectedFacilityId) || results[0];

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
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
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => onNavigate('/explore')}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Catalog
              </button>
              <button
                onClick={() => onNavigate('/search')}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-primary-container text-on-primary cursor-pointer"
              >
                Split Map & List
              </button>
              <button
                onClick={() => onNavigate('/search/list')}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                List View
              </button>
              <button
                onClick={() => onNavigate('/search/map')}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Fullscreen Map
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/search/filters')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Filters</span>
            </button>
            <button
              onClick={() => onNavigate('/search/empty')}
              className="hidden sm:inline-block text-[11px] text-on-surface-variant hover:text-on-surface"
            >
              Simulate 0 Results
            </button>
          </div>
        </div>
      </header>

      {/* TOP SEARCH BAR & VIEW SWITCHER DOCK */}
      <section className="bg-surface-container-lowest border-b border-outline-variant/30 px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Search Chips */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigate('/search/suggestions')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
              <span className="truncate max-w-[180px]">{searchLocation}</span>
              <span className="text-outline text-[12px]">edit</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface">
              <span className="material-symbols-outlined text-secondary text-[18px]">schedule</span>
              <span>Today, 14:00 → 18:00 (4 hrs)</span>
            </div>

            {/* Vehicle Selector */}
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
              {(['bike', 'auto', 'car'] as VehicleType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVehicle(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    vehicle === v
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Dropdown & Layout Mode Buttons */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center bg-surface-container-low px-3 py-1.5 rounded-lg text-xs">
              <span className="text-on-surface-variant uppercase font-bold mr-2 text-[10px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SearchSortOption)}
                className="bg-transparent font-bold text-on-surface focus:outline-none cursor-pointer text-xs"
              >
                <option value="recommended">Recommended (Distance & Rating)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="rating_desc">Highest Rated (4.8+)</option>
                <option value="distance_asc">Closest First (&lt; 500m)</option>
              </select>
            </div>

            <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
              <button
                onClick={() => onNavigate('/search')}
                className="p-1 rounded bg-primary-container text-on-primary shadow-xs"
                title="Split View"
              >
                <span className="material-symbols-outlined text-[18px]">vertical_split</span>
              </button>
              <button
                onClick={() => onNavigate('/search/list')}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                title="List View"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
              <button
                onClick={() => onNavigate('/search/map')}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                title="Map View"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Micro Filter Strip */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant shrink-0">
            Filters:
          </span>
          <button
            onClick={() => setActiveChip(activeChip === 'under50' ? null : 'under50')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer ${
              activeChip === 'under50'
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">currency_rupee</span>
            <span>Under ₹50/hr</span>
          </button>
          <button
            onClick={() => setActiveChip(activeChip === 'covered' ? null : 'covered')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer ${
              activeChip === 'covered'
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">roofing</span>
            <span>Covered Parking</span>
            {activeChip === 'covered' && <span className="material-symbols-outlined text-[12px]">check</span>}
          </button>
          <button
            onClick={() => setActiveChip(activeChip === 'guard' ? null : 'guard')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer ${
              activeChip === 'guard'
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span>24/7 Security</span>
            {activeChip === 'guard' && <span className="material-symbols-outlined text-[12px]">check</span>}
          </button>
          <button
            onClick={() => setActiveChip(activeChip === 'ev' ? null : 'ev')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer ${
              activeChip === 'ev'
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            <span>EV Charging</span>
            {activeChip === 'ev' && <span className="material-symbols-outlined text-[12px]">check</span>}
          </button>
          <button
            onClick={() => onNavigate('/search/filters')}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>All 7 Filters</span>
          </button>
        </div>
      </section>

      {/* SPLIT WORKSPACE: 60% FEED, 40% SPATIAL MAP (search_results_list_map_pe_uw_03_04) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LISTING FEED (col-span-7) ================= */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Available Spaces ({results.length} found near {searchLocation})
              </span>
              <span className="text-xs font-medium text-secondary">
                Live Sensor Telemetry Verified
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 bg-surface-container-low rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 space-y-3">
                <span className="material-symbols-outlined text-[40px] text-outline">search_off</span>
                <h3 className="font-bold text-base text-on-surface">No exact spots for this filter</h3>
                <p className="text-xs text-on-surface-variant">
                  Try broadening your distance radius or clearing strict amenity filters.
                </p>
                <button
                  onClick={() => onNavigate('/search/empty')}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold"
                >
                  View Alternative Suggestions
                </button>
              </div>
            ) : (
              results.map((item) => (
                <article
                  key={item.facilityId}
                  onClick={() => setSelectedFacilityId(item.facilityId)}
                  className={`bg-surface-container-lowest rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                    selectedFacilityId === item.facilityId
                      ? 'border-primary shadow-lg ring-2 ring-primary/20'
                      : 'border-outline-variant/30 hover:border-outline-variant hover:shadow-md'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4">
                    {/* Visual Section */}
                    <div className="sm:col-span-5 relative rounded-xl overflow-hidden h-44 sm:h-auto bg-surface-container">
                      <img
                        src={item.photos[0]}
                        alt={item.facilityName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        {item.isCovered ? 'Covered Basement' : 'Open Ground'}
                      </div>
                      <div
                        className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs ${
                          item.urgencyBadge === 'SPOTS LEFT'
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : item.urgencyBadge === 'FAST FILLING'
                            ? 'bg-tertiary-fixed text-tertiary'
                            : 'bg-surface-container-lowest/90 text-primary'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                        <span>{item.urgencyBadgeText}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="sm:col-span-7 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                              {item.facilityCode} • {item.locality}
                            </span>
                            <h3 className="font-headline-sm text-base font-bold text-on-surface mt-0.5 group-hover:text-primary transition-colors">
                              {item.facilityName}
                            </h3>
                          </div>
                        </div>

                        {/* Rating & Distance */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="material-symbols-outlined text-[14px] text-tertiary">star</span>
                            <span className="font-bold">{item.rating}</span>
                            <span className="text-on-surface-variant">({item.reviewCount})</span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-outline-variant" />
                          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-primary">pin_drop</span>
                            <span>{item.distanceMeters}m away • {item.walkingMinutes} mins walk</span>
                          </div>
                        </div>

                        {/* Amenities Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {item.amenities.slice(0, 3).map((a) => (
                            <span
                              key={a}
                              className="text-[10px] font-medium bg-surface-container-low text-on-surface px-2 py-0.5 rounded capitalize"
                            >
                              {a.replace('_', ' ')}
                            </span>
                          ))}
                          {item.supportedVehicles.map((v) => (
                            <span
                              key={v}
                              className="text-[10px] font-medium bg-surface-container-high text-primary px-2 py-0.5 rounded capitalize"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pricing & CTA */}
                      <div className="pt-3 mt-3 border-t border-outline-variant/20 flex items-end justify-between">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-headline-sm text-xl font-extrabold text-on-surface">
                              ₹{item.hourlyRateInr}
                            </span>
                            <span className="text-xs text-on-surface-variant">/hr</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant">
                            Total ₹{item.totalEstimatedInr} for 4 hrs
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(`/explore`);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary shadow-xs transition-all cursor-pointer"
                        >
                          <span>Reserve Space</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* ================= SPATIAL MAP CANVAS (col-span-5) ================= */}
          <aside className="lg:col-span-5 sticky top-24 h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden shadow-lg border border-outline-variant/30 bg-surface-container flex flex-col">
            {/* Interactive Top Map Toolbar */}
            <div className="p-3 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between z-20">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">radar</span>
                <span className="text-xs font-bold text-on-surface">
                  Chennai Radius (1.5 km)
                </span>
              </div>
              <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMapLayer('map')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    mapLayer === 'map' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('satellite')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                    mapLayer === 'satellite' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Satellite
                </button>
              </div>
            </div>

            {/* Stylized Vector Map Visualizer */}
            <div className="relative w-full flex-1 bg-surface-container-high overflow-hidden select-none">
              {/* Road grid lines SVG */}
              <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="road-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-surface" />
                    <path d="M 50 0 L 50 100 M 0 50 L 100 50" fill="none" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" className="text-outline-variant" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#road-grid)" />
                <line x1="0" y1="150" x2="600" y2="450" stroke="currentColor" strokeWidth="6" className="text-primary/20" />
                <line x1="80" y1="0" x2="500" y2="700" stroke="currentColor" strokeWidth="6" className="text-secondary/20" />
              </svg>

              {/* Current User Epicenter Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-ping" />
                <div className="-mt-6 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[13px]">person_pin</span>
                </div>
                <span className="bg-surface-container-lowest/90 px-2 py-0.5 rounded text-[10px] font-bold text-on-surface shadow-xs mt-1">
                  You are here
                </span>
              </div>

              {/* Interactive Facility Pins */}
              {results.map((fac, idx) => {
                const offsets = [
                  { top: '35%', left: '42%' },
                  { top: '65%', left: '62%' },
                  { top: '28%', left: '72%' },
                  { top: '75%', left: '30%' },
                ];
                const pos = offsets[idx % offsets.length];
                const isSelected = selectedFacilityId === fac.facilityId;

                return (
                  <div
                    key={fac.facilityId}
                    style={{ top: pos.top, left: pos.left }}
                    onClick={() => setSelectedFacilityId(fac.facilityId)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
                  >
                    <div
                      className={`px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1 shadow-md transition-all ${
                        isSelected
                          ? 'bg-primary text-on-primary scale-110 ring-4 ring-primary/20'
                          : 'bg-surface-container-lowest text-on-surface hover:scale-105 border border-outline-variant/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">local_parking</span>
                      <span>₹{fac.hourlyRateInr}</span>
                    </div>
                    <div
                      className={`w-2 h-2 rotate-45 -mt-1 shadow-sm ${
                        isSelected ? 'bg-primary' : 'bg-surface-container-lowest'
                      }`}
                    />
                  </div>
                );
              })}

              {/* Selected Facility Preview Card (Bottom Floating Drawer) */}
              {selectedFacility && (
                <div className="absolute bottom-4 left-4 right-4 z-30 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl p-3.5 border border-outline-variant/30 shadow-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedFacility.photos[0]}
                      alt={selectedFacility.facilityName}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded">
                          {selectedFacility.urgencyBadgeText}
                        </span>
                        <span className="text-xs font-bold text-on-surface">
                          ★ {selectedFacility.rating}
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-xs font-bold text-on-surface truncate mt-1">
                        {selectedFacility.facilityName}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {selectedFacility.distanceMeters}m away • ₹{selectedFacility.hourlyRateInr}/hr
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigate('/explore')}
                      className="px-3 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary transition-all shrink-0 cursor-pointer"
                    >
                      Book Bay
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
