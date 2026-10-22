import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  SearchResultFacility,
  VehicleType,
} from '@parkeazy/shared-types';
import { ApiClient } from '@parkeazy/api-client';

interface Props {
  onNavigate: (path: string) => void;
  initialQuery?: string;
}

export function SearchResultsMapViewPage({
  onNavigate,
  initialQuery = 'Anna Nagar, Chennai',
}: Props) {
  const { tenant } = useBrand();

  const [searchLocation, setSearchLocation] = useState(initialQuery);
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [radiusKm, setRadiusKm] = useState<number>(2.5);
  const [mapLayer, setMapLayer] = useState<'map' | 'satellite'>('map');

  const [results, setResults] = useState<SearchResultFacility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const client = new ApiClient();

  useEffect(() => {
    let isMounted = true;
    client.search
      .query({
        query: searchLocation,
        vehicleCategory: vehicle,
        radiusKm,
        durationHours: 4,
      })
      .then((res) => {
        if (isMounted) {
          setResults(res.results);
          if (res.results.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(res.results[0].facilityId);
          }
        }
      })
      .catch(() => {
        // Fallback
      });

    return () => {
      isMounted = false;
    };
  }, [searchLocation, vehicle, radiusKm]);

  const selectedFacility = results.find((r) => r.facilityId === selectedFacilityId) || results[0];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-surface font-body-md text-on-surface relative">
      {/* FLOATING TOP NAVIGATION & SEARCH PILL */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => onNavigate('/')}
            className="w-11 h-11 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md shadow-md flex items-center justify-center text-primary font-bold text-lg border border-outline-variant/30 cursor-pointer"
          >
            P
          </button>

          {/* Search Pill */}
          <div className="bg-surface-container-lowest/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border border-outline-variant/30 flex items-center gap-3">
            <button
              onClick={() => onNavigate('/search/suggestions')}
              className="flex items-center gap-2 cursor-pointer text-left"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                  Location
                </span>
                <span className="text-xs font-bold text-on-surface truncate block max-w-[140px]">
                  {searchLocation}
                </span>
              </div>
            </button>

            <div className="h-6 w-px bg-outline-variant/40" />

            <div className="flex items-center gap-1">
              {(['bike', 'car'] as VehicleType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVehicle(v)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                    vehicle === v
                      ? 'bg-primary-container text-on-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Switchers & Radius Controller */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Radius selector */}
          <div className="hidden sm:flex items-center gap-1 bg-surface-container-lowest/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-outline-variant/30 text-xs">
            <span className="text-on-surface-variant font-bold text-[10px]">Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="bg-transparent font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="1.0">1.0 km</option>
              <option value="2.5">2.5 km</option>
              <option value="5.0">5.0 km</option>
            </select>
          </div>

          <div className="flex items-center bg-surface-container-lowest/95 backdrop-blur-md p-1 rounded-2xl shadow-md border border-outline-variant/30">
            <button
              onClick={() => onNavigate('/search')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Split View
            </button>
            <button
              onClick={() => onNavigate('/search/list')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              List Only
            </button>
            <button
              onClick={() => setMapLayer(mapLayer === 'map' ? 'satellite' : 'map')}
              className="px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
            >
              {mapLayer === 'map' ? 'Satellite' : 'Roadmap'}
            </button>
          </div>
        </div>
      </header>

      {/* FULLSCREEN MAP CANVAS (search_results_map_view_pe_uw_03_06) */}
      <div className="w-full h-full relative bg-surface-container-high overflow-hidden select-none">
        {/* Vector SVG Roadmap */}
        <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="road-grid-fullscreen" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-on-surface" />
              <path d="M 60 0 L 60 120 M 0 60 L 120 60" fill="none" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" className="text-outline-variant" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#road-grid-fullscreen)" />
          <line x1="0" y1="200" x2="1400" y2="800" stroke="currentColor" strokeWidth="10" className="text-primary/20" />
          <line x1="200" y1="0" x2="1000" y2="1200" stroke="currentColor" strokeWidth="8" className="text-secondary/20" />
        </svg>

        {/* Center GPS pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
          <span className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-ping" />
          <div className="-mt-8 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[16px]">my_location</span>
          </div>
          <span className="bg-surface-container-lowest/90 px-2.5 py-1 rounded text-xs font-bold text-on-surface shadow-xs mt-1">
            Search Center • {searchLocation}
          </span>
        </div>

        {/* Interactive Map Pins */}
        {results.map((fac, idx) => {
          const positions = [
            { top: '38%', left: '46%' },
            { top: '60%', left: '58%' },
            { top: '30%', left: '68%' },
            { top: '72%', left: '38%' },
            { top: '48%', left: '28%' },
          ];
          const pos = positions[idx % positions.length];
          const isSelected = selectedFacilityId === fac.facilityId;

          return (
            <div
              key={fac.facilityId}
              style={{ top: pos.top, left: pos.left }}
              onClick={() => setSelectedFacilityId(fac.facilityId)}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
            >
              <div
                className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all ${
                  isSelected
                    ? 'bg-primary text-on-primary scale-125 ring-4 ring-primary/30 z-30'
                    : 'bg-surface-container-lowest text-on-surface hover:scale-110 border border-outline-variant/40'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">local_parking</span>
                <span>₹{fac.hourlyRateInr}/hr</span>
              </div>
              <div
                className={`w-2.5 h-2.5 rotate-45 -mt-1 shadow-sm ${
                  isSelected ? 'bg-primary' : 'bg-surface-container-lowest'
                }`}
              />
            </div>
          );
        })}

        {/* BOTTOM FLOATING CARD DRAWER */}
        {selectedFacility && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40">
            <div className="bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl p-4 border border-outline-variant/30 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedFacility.photos[0]}
                  alt={selectedFacility.facilityName}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded">
                      {selectedFacility.urgencyBadgeText}
                    </span>
                    <span className="text-xs font-bold text-on-surface flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px] text-tertiary">star</span>
                      <span>{selectedFacility.rating}</span>
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface truncate mt-1">
                    {selectedFacility.facilityName}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {selectedFacility.distanceMeters}m away • {selectedFacility.walkingMinutes} mins walk
                  </p>
                  <span className="text-xs font-bold text-primary block mt-1">
                    ₹{selectedFacility.hourlyRateInr}/hr (Total ₹{selectedFacility.totalEstimatedInr} for 4 hrs)
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() => onNavigate('/explore')}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary shadow-xs transition-all cursor-pointer text-center"
                >
                  Book Space Now
                </button>
                <button
                  onClick={() => onNavigate('/search')}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high text-center"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
