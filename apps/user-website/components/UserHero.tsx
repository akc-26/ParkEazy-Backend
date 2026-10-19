import React, { useState } from 'react';
import { Search, Clock, Car, ShieldCheck, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '../../../packages/ui';

interface UserHeroProps {
  onSearch: (params: { location: string; durationHours: number; bayType: string }) => void;
  onOpenHostPortal: () => void;
}

export const UserHero: React.FC<UserHeroProps> = ({ onSearch, onOpenHostPortal }) => {
  const [locationQuery, setLocationQuery] = useState('San Francisco, CA');
  const [durationHours, setDurationHours] = useState(2);
  const [bayType, setBayType] = useState('ALL');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ location: locationQuery, durationHours, bayType });
  };

  return (
    <section className="relative bg-[#F4F8F7] pt-6 pb-10 sm:pt-8 sm:pb-14 lg:pt-12 lg:pb-16 border-b border-slate-200">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-Column Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Headline, Value Proposition & Search Card */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-xs font-bold tracking-wider text-[#075762] uppercase mb-2 sm:mb-3">
                Peer-to-Peer Parking Marketplace
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#162A2D] tracking-tight leading-tight text-balance mb-3 sm:mb-4">
                Guaranteed parking, reserved before you arrive.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Book private covered garages, residential EV driveways, and secured transit bays with verified 10-minute hold protection and contactless gate access.
              </p>
            </div>

            {/* Parking Search Bar Component */}
            <form
              onSubmit={handleSubmit}
              id="search"
              className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Destination Input */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Destination or Neighborhood
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="e.g. Financial District, Palo Alto, Transit Hub"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                    />
                  </div>
                </div>

                {/* Duration Picker (30m increments, 1h-72h) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Booking Duration (1h – 72h)
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                    >
                      <option value={1}>1.0 Hour (Minimum)</option>
                      <option value={1.5}>1.5 Hours</option>
                      <option value={2}>2.0 Hours</option>
                      <option value={3}>3.0 Hours</option>
                      <option value={4}>4.0 Hours (Half Day)</option>
                      <option value={8}>8.0 Hours (Full Day)</option>
                      <option value={24}>24 Hours (Overnight)</option>
                      <option value={48}>48 Hours</option>
                      <option value={72}>72 Hours (Continuous Max)</option>
                    </select>
                  </div>
                </div>

                {/* Bay Type Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Space Preference
                  </label>
                  <div className="relative">
                    <Car className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={bayType}
                      onChange={(e) => setBayType(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                    >
                      <option value="ALL">All Available Spaces</option>
                      <option value="COVERED">Covered & Secured Garage</option>
                      <option value="EV_CHARGING">EV Charging Equipped</option>
                      <option value="ACCESSIBLE">Accessible Bay</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  10-minute hold lock guarantee
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  themeContext="user"
                  className="px-6 py-2.5"
                >
                  Search Available Bays
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Architectural Photography Focal Anchor */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="relative w-full h-full min-h-[340px] sm:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">
              {!imageError ? (
                <img
                  src="/assets/images/hero_parking_bay_1792157347279.jpg"
                  alt="Secured covered parking bay in San Francisco Financial District"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-90'
                  }`}
                  loading="eager"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/assets/images/hero_parking_bay_1792157347279.jpg') {
                      target.src = '/assets/images/hero_parking_bay_1792157347279.jpg';
                    } else {
                      setImageError(true);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-800 text-white text-center">
                  <MapPin className="w-10 h-10 text-teal-400 mb-3" />
                  <div className="font-bold text-sm mb-1">Financial District Covered Facility</div>
                  <div className="text-xs text-slate-400">Bay B2-30 · Reserved automated gate access</div>
                </div>
              )}

              {/* Verified Badge and Info Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 sm:p-7 text-white pointer-events-none">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified Financial Tower Facility · Bay B2-30</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                  Automated gate code entry, 24/7 CCTV surveillance, and reserved space assurance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Proof & Invariants Strip Below Hero Split */}
        <div className="mt-8 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="text-xs text-slate-500 font-medium">Hold Invariant</div>
            <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
              10 Minutes
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Server-enforced lock</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Duration Bounds</div>
            <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
              1h – 72h
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">30-min increments</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Turnaround Buffer</div>
            <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
              15 Min
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Transition window</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Escrow Security</div>
            <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
              100% Segregated
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Separate deposit ledger</div>
          </div>
        </div>
      </div>
    </section>
  );
};
