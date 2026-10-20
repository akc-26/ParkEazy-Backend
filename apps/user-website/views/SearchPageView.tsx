import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Car,
  Zap,
  Shield,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Building2,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  ParkingLocation,
  ParkingBay,
  BayType,
  SessionUser,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface SearchPageViewProps {
  searchParams: URLSearchParams;
  onNavigate: (path: string) => void;
  onSelectLocation: (loc: ParkingLocation) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast: (type: ToastType, message: string, title?: string) => void;
}

export type SortOption = 'price_asc' | 'price_desc' | 'bays_desc' | 'name_asc';

export const SearchPageView: React.FC<SearchPageViewProps> = ({
  searchParams,
  onNavigate,
  onSelectLocation,
  showToast,
}) => {
  // 1. Initialize filter states from URL search parameters
  const initialQuery = searchParams.get('q') || searchParams.get('city') || '';
  const initialDuration = Number(searchParams.get('duration')) || 2;
  const initialBayType = searchParams.get('bayType') || 'ALL';
  const initialEvOnly = searchParams.get('evOnly') === 'true' || initialBayType === 'EV_CHARGING';
  const initialCoveredOnly = searchParams.get('coveredOnly') === 'true' || initialBayType === 'COVERED';
  const initialMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 0;
  const initialSort = (searchParams.get('sort') as SortOption) || 'price_asc';

  const [query, setQuery] = useState(initialQuery);
  const [durationHours, setDurationHours] = useState(initialDuration);
  const [bayType, setBayType] = useState(initialBayType);
  const [evOnly, setEvOnly] = useState(initialEvOnly);
  const [coveredOnly, setCoveredOnly] = useState(initialCoveredOnly);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // 2. Inventory data states
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [baysByLocation, setBaysByLocation] = useState<Record<string, ParkingBay[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Synchronize filter state into browser URL query parameters without reloading
  const syncUrlParams = useCallback(
    (newParams: {
      q?: string;
      duration?: number;
      bayType?: string;
      evOnly?: boolean;
      coveredOnly?: boolean;
      maxPrice?: number;
      sort?: SortOption;
    }) => {
      const q = newParams.q !== undefined ? newParams.q : query;
      const d = newParams.duration !== undefined ? newParams.duration : durationHours;
      const bt = newParams.bayType !== undefined ? newParams.bayType : bayType;
      const ev = newParams.evOnly !== undefined ? newParams.evOnly : evOnly;
      const cov = newParams.coveredOnly !== undefined ? newParams.coveredOnly : coveredOnly;
      const mp = newParams.maxPrice !== undefined ? newParams.maxPrice : maxPrice;
      const s = newParams.sort !== undefined ? newParams.sort : sortOption;

      const sp = new URLSearchParams();
      if (q) sp.set('q', q);
      if (d && d !== 2) sp.set('duration', d.toString());
      if (bt && bt !== 'ALL') sp.set('bayType', bt);
      if (ev) sp.set('evOnly', 'true');
      if (cov) sp.set('coveredOnly', 'true');
      if (mp > 0) sp.set('maxPrice', mp.toString());
      if (s && s !== 'price_asc') sp.set('sort', s);

      const searchStr = sp.toString() ? `?${sp.toString()}` : '';
      const newUrl = `/search${searchStr}`;
      if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== newUrl) {
        window.history.replaceState({}, '', newUrl);
      }
    },
    [query, durationHours, bayType, evOnly, coveredOnly, maxPrice, sortOption]
  );

  // Fetch verified locations and their physical bays
  const fetchInventory = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);

    apiClient
      .getLocations()
      .then(async (locs) => {
        setLocations(locs);
        // Pre-fetch bay details to enable physical bay-level filtering
        const baysMap: Record<string, ParkingBay[]> = {};
        await Promise.all(
          locs.map(async (loc) => {
            try {
              const bays = await apiClient.getBays(loc.id);
              baysMap[loc.id] = bays;
            } catch {
              baysMap[loc.id] = [];
            }
          })
        );
        setBaysByLocation(baysMap);
        setIsLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to connect to parking inventory service.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Determine highest hourly rate from locations for dynamic slider bounds
  const highestHourlyRateDollars = useMemo(() => {
    if (locations.length === 0) return 15;
    const maxCents = Math.max(...locations.map((l) => l.hourlyRateCents));
    return Math.ceil(maxCents / 100);
  }, [locations]);

  // Apply real-time client-side filters
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // 1. Query / Destination match
      if (query.trim()) {
        const qLower = query.toLowerCase().trim();
        const nameMatch = loc.name.toLowerCase().includes(qLower);
        const cityMatch = loc.address.city.toLowerCase().includes(qLower);
        const stateMatch = loc.address.state.toLowerCase().includes(qLower);
        const addressMatch = loc.address.line1.toLowerCase().includes(qLower);
        const descMatch = loc.description.toLowerCase().includes(qLower);
        if (!nameMatch && !cityMatch && !stateMatch && !addressMatch && !descMatch) {
          return false;
        }
      }

      // 2. Max Price filter (in dollars)
      if (maxPrice > 0) {
        const hourlyDollars = loc.hourlyRateCents / 100;
        if (hourlyDollars > maxPrice) return false;
      }

      // 3. EV Charging filter
      if (evOnly) {
        const locHasEvAmenity = loc.amenities.some((a) =>
          a.toLowerCase().includes('ev')
        );
        const bays = baysByLocation[loc.id] || [];
        const baysHaveEv = bays.some((b) => b.isEvCharging || b.bayType === BayType.EV_CHARGING);
        if (!locHasEvAmenity && !baysHaveEv) return false;
      }

      // 4. Covered Parking filter
      if (coveredOnly) {
        const locHasCoveredAmenity = loc.amenities.some((a) =>
          a.toLowerCase().includes('covered')
        );
        const bays = baysByLocation[loc.id] || [];
        const baysHaveCovered = bays.some((b) => b.bayType === BayType.COVERED);
        if (!locHasCoveredAmenity && !baysHaveCovered) return false;
      }

      // 5. Bay Type filter
      if (bayType && bayType !== 'ALL') {
        const bays = baysByLocation[loc.id] || [];
        const hasMatchingBay = bays.some((b) => b.bayType === bayType);
        // Also check if location description or amenities align
        const hasAmenityAlign = loc.amenities.some((a) =>
          a.toUpperCase().replace(/\s+/g, '_').includes(bayType)
        );
        if (!hasMatchingBay && !hasAmenityAlign) return false;
      }

      return true;
    });
  }, [locations, baysByLocation, query, maxPrice, evOnly, coveredOnly, bayType]);

  // Apply deterministic sorting
  const sortedLocations = useMemo(() => {
    const list = [...filteredLocations];
    switch (sortOption) {
      case 'price_asc':
        return list.sort((a, b) => a.hourlyRateCents - b.hourlyRateCents);
      case 'price_desc':
        return list.sort((a, b) => b.hourlyRateCents - a.hourlyRateCents);
      case 'bays_desc':
        return list.sort((a, b) => b.totalBays - a.totalBays);
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [filteredLocations, sortOption]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setQuery('');
    setBayType('ALL');
    setEvOnly(false);
    setCoveredOnly(false);
    setMaxPrice(0);
    setSortOption('price_asc');
    syncUrlParams({
      q: '',
      bayType: 'ALL',
      evOnly: false,
      coveredOnly: false,
      maxPrice: 0,
      sort: 'price_asc',
    });
    showToast('info', 'Search filters have been reset.', 'Filters Reset');
  };

  const hasActiveFilters = Boolean(
    query.trim() ||
    bayType !== 'ALL' ||
    evOnly ||
    coveredOnly ||
    maxPrice > 0
  );

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* 1. Breadcrumb Navigation & Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="hover:text-[#087E8A] transition-colors"
          >
            Home
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">Search Spaces</span>
          {query && (
            <>
              <span>/</span>
              <span className="text-[#087E8A] truncate max-w-[150px]">“{query}”</span>
            </>
          )}
        </nav>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="font-semibold text-slate-900 font-mono tabular-nums">
            {sortedLocations.length}
          </span>
          <span>
            {sortedLocations.length === 1 ? 'facility available' : 'facilities available'}
          </span>
          <span className="text-slate-300">·</span>
          <span>10-min server lock guarantee</span>
        </div>
      </div>

      {/* 2. Desktop & Tablet Refinement Controls Bar */}
      <section className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Row A: Destination Search & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Destination Query Input */}
          <div className="md:col-span-6 relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Destination or Neighborhood
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  syncUrlParams({ q: e.target.value });
                }}
                placeholder="Search by city, street, or facility name..."
                className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    syncUrlParams({ q: '' });
                  }}
                  aria-label="Clear destination query"
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Duration (30m steps)
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={durationHours}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDurationHours(val);
                  syncUrlParams({ duration: val });
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
              >
                <option value={1}>1.0 Hour (Minimum)</option>
                <option value={1.5}>1.5 Hours</option>
                <option value={2}>2.0 Hours</option>
                <option value={3}>3.0 Hours</option>
                <option value={4}>4.0 Hours (Half Day)</option>
                <option value={8}>8.0 Hours (Full Day)</option>
                <option value={24}>24 Hours (Overnight)</option>
                <option value={48}>48 Hours</option>
                <option value={72}>72 Hours (Max Bound)</option>
              </select>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Sort Results
            </label>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={sortOption}
                onChange={(e) => {
                  const val = e.target.value as SortOption;
                  setSortOption(val);
                  syncUrlParams({ sort: val });
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="bays_desc">Most Available Bays</option>
                <option value="name_asc">Facility Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row B: Filter Chips, Price Slider & Quick Toggles */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* EV Charging Filter Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !evOnly;
                setEvOnly(next);
                syncUrlParams({ evOnly: next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                evOnly
                  ? 'bg-teal-50 text-[#087E8A] border-[#087E8A]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${evOnly ? 'text-[#087E8A]' : 'text-slate-400'}`} />
              <span>EV Charging Only</span>
              {evOnly && <Check className="w-3 h-3 text-[#087E8A]" />}
            </button>

            {/* Covered Garage Filter Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !coveredOnly;
                setCoveredOnly(next);
                syncUrlParams({ coveredOnly: next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                coveredOnly
                  ? 'bg-teal-50 text-[#087E8A] border-[#087E8A]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${coveredOnly ? 'text-[#087E8A]' : 'text-slate-400'}`} />
              <span>Covered Garage</span>
              {coveredOnly && <Check className="w-3 h-3 text-[#087E8A]" />}
            </button>

            {/* Bay Type Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium hidden sm:inline">Type:</span>
              <select
                value={bayType}
                onChange={(e) => {
                  setBayType(e.target.value);
                  syncUrlParams({ bayType: e.target.value });
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:border-[#087E8A]"
              >
                <option value="ALL">All Bay Types</option>
                <option value="COVERED">Covered Bays</option>
                <option value="EV_CHARGING">EV Dedicated</option>
                <option value="ACCESSIBLE">Accessible Bays</option>
                <option value="STANDARD">Standard Bays</option>
              </select>
            </div>

            {/* Price Filter Indicator / Slider */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-slate-500 font-medium">Max Rate:</span>
              <input
                type="range"
                min="0"
                max={highestHourlyRateDollars}
                step="1"
                value={maxPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxPrice(val);
                  syncUrlParams({ maxPrice: val });
                }}
                className="w-20 accent-[#087E8A] cursor-pointer"
              />
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                {maxPrice > 0 ? `$${maxPrice}/h` : 'Any Price'}
              </span>
            </div>
          </div>

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* 3. Active Filter Chips Feedback Strip */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium">Active criteria:</span>
          {query && (
            <span className="bg-teal-50 text-[#075762] border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Query: “{query}”</span>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  syncUrlParams({ q: '' });
                }}
                className="text-teal-600 hover:text-teal-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {evOnly && (
            <span className="bg-teal-50 text-[#075762] border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>EV Only</span>
              <button
                type="button"
                onClick={() => {
                  setEvOnly(false);
                  syncUrlParams({ evOnly: false });
                }}
                className="text-teal-600 hover:text-teal-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {coveredOnly && (
            <span className="bg-teal-50 text-[#075762] border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Covered Only</span>
              <button
                type="button"
                onClick={() => {
                  setCoveredOnly(false);
                  syncUrlParams({ coveredOnly: false });
                }}
                className="text-teal-600 hover:text-teal-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {bayType !== 'ALL' && (
            <span className="bg-teal-50 text-[#075762] border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Type: {bayType}</span>
              <button
                type="button"
                onClick={() => {
                  setBayType('ALL');
                  syncUrlParams({ bayType: 'ALL' });
                }}
                className="text-teal-600 hover:text-teal-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {maxPrice > 0 && (
            <span className="bg-teal-50 text-[#075762] border border-teal-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span>Max: ${maxPrice}/h</span>
              <button
                type="button"
                onClick={() => {
                  setMaxPrice(0);
                  syncUrlParams({ maxPrice: 0 });
                }}
                className="text-teal-600 hover:text-teal-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* 4. Results List, Loading, Error, or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-slate-200 p-5 h-96 animate-pulse flex flex-col justify-between"
            >
              <div className="w-full h-48 bg-slate-100 rounded-xl" />
              <div className="space-y-2.5 pt-4">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="h-6 w-20 bg-slate-100 rounded" />
                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-amber-900">
              Unable to load parking inventory
            </h3>
            <p className="text-xs text-amber-700 max-w-md mx-auto mt-1">
              {loadError}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInventory}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </Button>
        </div>
      ) : sortedLocations.length === 0 ? (
        <div className="p-10 sm:p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No parking spaces match your search criteria
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              We couldn't find available parking facilities matching your active filters. Try broadening your price range or removing amenity constraints.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              themeContext="user"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Active Filters</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/')}
            >
              Return to Homepage
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
          {sortedLocations.map((loc) => {
            const locBays = baysByLocation[loc.id] || [];
            const availableBays = locBays.filter((b) => b.status === 'AVAILABLE');
            const hasEv = locBays.some((b) => b.isEvCharging);
            const hourlyFormatted = (loc.hourlyRateCents / 100).toFixed(2);
            const dailyFormatted = (loc.dailyRateCents / 100).toFixed(2);

            return (
              <div
                key={loc.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col group"
              >
                {/* Location Image & Badges */}
                <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                  <img
                    src={loc.imageUrl}
                    alt={loc.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes('/src/assets/images/')) {
                        target.src = target.src.replace('/src/assets/images/', '/assets/images/');
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />

                  {/* Top Bar Overlay Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="bg-white/95 backdrop-blur-xs text-[11px] font-bold text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                      {loc.totalBays} Physical {loc.totalBays === 1 ? 'Bay' : 'Bays'}
                    </span>
                    {hasEv && (
                      <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                        <Zap className="w-3 h-3" />
                        <span>EV Equipped</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="bg-[#087E8A]/90 text-white text-[10px] font-semibold px-2 py-1 rounded-lg">
                      {loc.accessMethod.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onNavigate(`/spaces/${loc.id}`)}
                      className="text-left font-bold text-base text-slate-900 group-hover:text-[#087E8A] transition-colors line-clamp-1"
                    >
                      {loc.name}
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {loc.address.line1}, {loc.address.city}, {loc.address.state}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {loc.description}
                    </p>

                    {/* Amenities list (unboxed, clean bullet separators) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 pt-1">
                      {loc.amenities.slice(0, 4).map((amenity, idx) => (
                        <React.Fragment key={amenity}>
                          {idx > 0 && <span aria-hidden="true" className="text-slate-300">·</span>}
                          <span>{amenity}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Pricing and Action Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-[#162A2D] font-mono tabular-nums">
                        ${hourlyFormatted}
                        <span className="text-xs font-normal text-slate-500 font-sans"> / hour</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        ${dailyFormatted} / day max · ${loc.securityDepositCents / 100} deposit
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/spaces/${loc.id}`)}
                        className="px-3"
                      >
                        Bays
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        themeContext="user"
                        onClick={() => onSelectLocation(loc)}
                        className="px-3.5"
                      >
                        Reserve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
