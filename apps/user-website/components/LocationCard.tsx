import React, { useState } from 'react';
import { MapPin, Zap, Shield, Key } from 'lucide-react';
import { ParkingLocation } from '../../../packages/contracts';
import { Button } from '../../../packages/ui';

interface LocationCardProps {
  location: ParkingLocation;
  onSelect: (location: ParkingLocation) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location, onSelect }) => {
  const [imageError, setImageError] = useState(false);
  const formattedHourlyRate = (location.hourlyRateCents / 100).toFixed(2);
  const formattedDailyRate = (location.dailyRateCents / 100).toFixed(2);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col">
      {/* Location Image with Clean Overlay */}
      <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
        {location.imageUrl && !imageError ? (
          <img
            src={location.imageUrl}
            alt={location.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.includes('/src/assets/images/')) {
                target.src = target.src.replace('/src/assets/images/', '/assets/images/');
              } else {
                setImageError(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            <MapPin className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-[11px] font-medium text-slate-500">{location.name}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
          {location.totalBays} Physical {location.totalBays === 1 ? 'Bay' : 'Bays'}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-base font-bold text-slate-900 line-clamp-1">
            {location.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">
            {location.address.line1}, {location.address.city}
          </span>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {location.description}
        </p>

        {/* Amenities / Features List (No pill clutter: clean unboxed text) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-5">
          {location.amenities.slice(0, 3).map((amenity, idx) => (
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
              ${formattedHourlyRate}
              <span className="text-xs font-normal text-slate-500 font-sans"> / hour</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              ${formattedDailyRate} / day max
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            themeContext="user"
            onClick={() => onSelect(location)}
          >
            Reserve Bay
          </Button>
        </div>
      </div>
    </div>
  );
};
