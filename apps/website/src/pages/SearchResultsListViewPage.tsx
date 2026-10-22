import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  SearchResultFacility,
  VehicleType,
  SearchSortOption,
} from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
  initialQuery?: string;
}

export function SearchResultsListViewPage({
  onNavigate,
  initialQuery = 'Anna Nagar, Chennai',
}: Props) {
  const { tenant } = useBrand();

  const [searchLocation, setSearchLocation] = useState(initialQuery);
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [sortBy, setSortBy] = useState<SearchSortOption>('recommended');
  const [results, setResults] = useState<SearchResultFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const client = new ApiClient();

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setApiError(null);

    client.search
      .query({
        query: searchLocation,
        vehicleCategory: vehicle,
        sortBy,
        durationHours: 4,
      })
      .then((res) => {
        if (isMounted) {
          setResults(res.results);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setApiError(err?.message || 'Unable to connect to ParkEazy search service');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchLocation, vehicle, sortBy, fetchTrigger]);

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {/* HEADER NAVIGATION */}
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
              onClick={() => onNavigate('/search')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold hover:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>Switch to Split Map</span>
            </button>
            <button
              onClick={() => onNavigate('/search/filters')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-bold hover:bg-primary cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Filters</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOP CONTROL BAR (search_results_list_view_pe_uw_03_05) */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/30 py-4 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigate('/search/suggestions')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
              <span>{searchLocation}</span>
              <span className="text-outline text-[12px]">edit</span>
            </button>

            {/* Vehicle pills */}
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
              {(['bike', 'auto', 'car'] as VehicleType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVehicle(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
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

          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </div>

      {/* FULL-WIDTH LISTING FEED */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-headline-md text-xl font-bold text-on-surface">
            Parking Listings in {searchLocation} ({results.length} spaces available)
          </h1>
          <span className="text-xs text-secondary font-bold">
            Live Booking Protection Enabled
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        ) : apiError ? (
          <div className="p-10 text-center bg-surface-container-lowest rounded-2xl border border-error/30 space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">wifi_off</span>
            </div>
            <h3 className="font-bold text-lg text-on-surface">Search Query Interrupted</h3>
            <p className="text-xs text-on-surface-variant">
              {apiError}
            </p>
            <button
              onClick={() => setFetchTrigger((prev) => prev + 1)}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm cursor-pointer"
            >
              Retry Search Query
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="p-10 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 space-y-4 max-w-lg mx-auto">
            <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
            <h3 className="font-bold text-lg text-on-surface">No spaces available in this location</h3>
            <p className="text-xs text-on-surface-variant">
              We couldn't find any parking facilities matching your criteria near {searchLocation}.
            </p>
            <button
              onClick={() => onNavigate('/search/empty')}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm cursor-pointer"
            >
              Explore Alternative Suggestions
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((item) => (
              <article
                key={item.facilityId}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative h-48 overflow-hidden bg-surface-container">
                  <img
                    src={item.photos[0]}
                    alt={item.facilityName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {item.isCovered ? 'Covered Roof' : 'Open Lot'}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <span>{item.urgencyBadgeText}</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {item.locality}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-on-surface">
                        <span className="material-symbols-outlined text-[14px] text-tertiary">star</span>
                        <span>{item.rating}</span>
                      </div>
                    </div>

                    <h3 className="font-headline-sm text-base font-bold text-on-surface mt-1">
                      {item.facilityName}
                    </h3>

                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">near_me</span>
                      <span>{item.distanceMeters}m away • {item.walkingMinutes} mins walk</span>
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="text-[10px] font-medium bg-surface-container-low text-on-surface px-2 py-0.5 rounded capitalize"
                        >
                          {a.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-sm text-xl font-extrabold text-on-surface">
                          ₹{item.hourlyRateInr}
                        </span>
                        <span className="text-xs text-on-surface-variant">/hr</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant">
                        ₹{item.totalEstimatedInr} for 4 hrs
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigate('/explore')}
                      className="px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary shadow-xs transition-all cursor-pointer"
                    >
                      Book Space
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
