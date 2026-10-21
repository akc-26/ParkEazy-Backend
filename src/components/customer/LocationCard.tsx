import React from 'react';
import { MapPin, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { Facility } from '../../types';

interface LocationCardProps {
  facility: Facility;
  onSelect: (facility: Facility) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ facility, onSelect }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between font-sans">
      <div>
        <div className="relative h-44 bg-slate-100 overflow-hidden">
          <img
            src={facility.photos?.[0] || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'}
            alt={facility.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{facility.activeBays} Bays Live Available</span>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">
            {facility.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{facility.address}, {facility.city}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
            <div>
              <span className="text-slate-400 block">Clearance:</span>
              <span className="font-semibold text-slate-800">{facility.clearanceHeightMeters}m</span>
            </div>
            <div>
              <span className="text-slate-400 block">Gate Access:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {facility.gateType?.replace(/_/g, ' ') || 'Automated'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {facility.amenities?.evCharging && (
              <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> EV Fast Charge
              </span>
            )}
            {facility.amenities?.covered && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Covered
              </span>
            )}
            {facility.amenities?.securityGuard && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                Security Guard
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        <button
          onClick={() => onSelect(facility)}
          className="w-full py-2.5 px-4 bg-[#087E8A] hover:bg-[#076D77] active:bg-[#065A63] text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Bays & Reserve</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
