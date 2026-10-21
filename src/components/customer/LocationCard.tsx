import React, { useState } from 'react';
import { MapPin, Zap, Shield, Key } from 'lucide-react';
import { Facility } from '../../types';

interface LocationCardProps {
  facility: Facility;
  onSelect: (facility: Facility) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ facility, onSelect }) => {
  const [imageError, setImageError] = useState(false);

  // Fallback rate calculation: base rate or $4.50/hr
  const baseRate = facility.pricingRules && facility.pricingRules[0]?.baseHourlyRate
    ? facility.pricingRules[0].baseHourlyRate
    : 4.50;
  const dailyRate = facility.pricingRules && facility.pricingRules[0]?.dailyMaxRate
    ? facility.pricingRules[0].dailyMaxRate
    : 32.00;

  const defaultPhoto = facility.photos && facility.photos.length > 0
    ? facility.photos[0]
    : '/assets/images/hero_parking_bay_1792157347279.jpg';

  const amenitiesList: string[] = [];
  if (facility.amenities.covered) amenitiesList.push('Covered Garage');
  if (facility.amenities.evCharging) amenitiesList.push('EV Fast Charging (22kW)');
  if (facility.amenities.cctv) amenitiesList.push('24/7 CCTV');
  if (facility.amenities.securityGuard) amenitiesList.push('Security Attendant');
  if (facility.amenities.wheelchairAccessible) amenitiesList.push('ADA Accessible');
  if (facility.amenities.automatedBarrier) amenitiesList.push('Automated Barrier Arm');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col">
      {/* Location Image with Clean Overlay */}
      <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
        {!imageError ? (
          <img
            src={defaultPhoto}
            alt={facility.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            <MapPin className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-[11px] font-medium text-slate-500">{facility.name}</span>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
          {facility.totalBays} Physical {facility.totalBays === 1 ? 'Bay' : 'Bays'}
        </div>

        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-xs text-[10px] font-semibold text-white px-2 py-0.5 rounded-md flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{facility.activeBays} Live Available</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-base font-bold text-slate-900 line-clamp-1">
            {facility.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {facility.address}, {facility.city}
          </span>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {facility.description}
        </p>

        {/* Amenities / Features List (Clean unboxed text with typographic dot separators) */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-5">
          {amenitiesList.slice(0, 3).map((amenity, idx) => (
            <React.Fragment key={amenity}>
              {idx > 0 && <span aria-hidden="true" className="text-slate-300">·</span>}
              <span>{amenity}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Price and Action Footer */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              ${baseRate.toFixed(2)}
              <span className="text-xs font-normal text-slate-500 font-sans"> / hour</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              ${dailyRate.toFixed(2)} / day max
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(facility)}
            className="rounded-lg bg-[#087E8A] hover:bg-[#076D77] active:bg-[#075762] text-white text-xs font-semibold px-4 py-2 transition-colors shadow-xs"
          >
            Reserve Bay
          </button>
        </div>
      </div>
    </div>
  );
};
