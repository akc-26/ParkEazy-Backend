import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { VehicleType, SearchFilters } from '@parkeazy/shared-types';

interface Props {
  onNavigate: (path: string) => void;
  onApplyFilters?: (filters: SearchFilters, vehicle: VehicleType) => void;
  initialVehicle?: VehicleType;
  initialFilters?: SearchFilters;
}

export function SearchFiltersPreferencesPage({
  onNavigate,
  onApplyFilters,
  initialVehicle = 'car',
  initialFilters = {},
}: Props) {
  const { tenant } = useBrand();

  const [vehicleCategory, setVehicleCategory] = useState<VehicleType>(initialVehicle);
  const [carProfile, setCarProfile] = useState<'hatchback' | 'sedan' | 'compact_suv' | 'full_suv'>(
    initialFilters.carBodyProfile || 'sedan'
  );
  const [clearance, setClearance] = useState<'standard' | 'high'>(
    initialFilters.clearance || 'standard'
  );

  const [minRate, setMinRate] = useState<number>(initialFilters.minHourlyRate || 20);
  const [maxRate, setMaxRate] = useState<number>(initialFilters.maxHourlyRate || 70);

  // Amenity Checkboxes
  const [isCovered, setIsCovered] = useState<boolean>(initialFilters.isCovered ?? true);
  const [hasEvCharger, setHasEvCharger] = useState<boolean>(initialFilters.hasEvCharger ?? false);
  const [hasSecurityGuard, setHasSecurityGuard] = useState<boolean>(
    initialFilters.hasSecurityGuard ?? true
  );
  const [hasCctv, setHasCctv] = useState<boolean>(initialFilters.hasCctv ?? true);
  const [hasAnprBarrier, setHasAnprBarrier] = useState<boolean>(
    initialFilters.hasAnprBarrier ?? false
  );
  const [isDisabledAccessible, setIsDisabledAccessible] = useState<boolean>(
    initialFilters.isDisabledAccessible ?? false
  );

  const handleReset = () => {
    setVehicleCategory('car');
    setCarProfile('sedan');
    setClearance('standard');
    setMinRate(20);
    setMaxRate(70);
    setIsCovered(false);
    setHasEvCharger(false);
    setHasSecurityGuard(false);
    setHasCctv(false);
    setHasAnprBarrier(false);
    setIsDisabledAccessible(false);
  };

  const handleApply = () => {
    const filters: SearchFilters = {
      isCovered,
      hasEvCharger,
      hasSecurityGuard,
      hasCctv,
      hasAnprBarrier,
      isDisabledAccessible,
      carBodyProfile: carProfile,
      clearance,
      minHourlyRate: minRate,
      maxHourlyRate: maxRate,
    };
    if (onApplyFilters) {
      onApplyFilters(filters, vehicleCategory);
    }
    // Navigate to search results with filter query params
    const queryParams = new URLSearchParams({
      vehicle: vehicleCategory,
      profile: carProfile,
      clearance,
      min: String(minRate),
      max: String(maxRate),
      covered: String(isCovered),
      ev: String(hasEvCharger),
      guard: String(hasSecurityGuard),
    });
    onNavigate(`/search?${queryParams.toString()}`);
  };

  const activeFiltersCount =
    (isCovered ? 1 : 0) +
    (hasEvCharger ? 1 : 0) +
    (hasSecurityGuard ? 1 : 0) +
    (hasCctv ? 1 : 0) +
    (hasAnprBarrier ? 1 : 0) +
    (isDisabledAccessible ? 1 : 0) +
    (clearance === 'high' ? 1 : 0);

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/search')}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline-sm text-base font-bold text-on-surface">
                Search Filters & Preferences
              </h1>
              <span className="text-xs text-on-surface-variant">
                {activeFiltersCount} active preferences
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-xs font-bold text-error hover:underline cursor-pointer"
            >
              Reset All
            </button>
            <button
              onClick={() => onNavigate('/search')}
              className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      </header>

      {/* FILTER BODY (search_filters_preferences_pe_uw_03_03) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-8">
        {/* SECTION 1: Vehicle & Space Fit */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">directions_car</span>
                <h2 className="font-headline-sm text-base font-bold text-on-surface">
                  1. Vehicle & Space Fit
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Ensure entry clearance and appropriate stall dimensions
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded text-primary bg-primary-fixed/40 text-xs font-bold">
              Essential
            </span>
          </div>

          {/* Vehicle Category Radio Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Two-Wheeler */}
            <div
              onClick={() => setVehicleCategory('bike')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                vehicleCategory === 'bike'
                  ? 'bg-primary-fixed/20 border-primary shadow-xs'
                  : 'bg-surface border-outline-variant/30 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-[28px] text-primary">two_wheeler</span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${vehicleCategory === 'bike' ? 'border-primary' : 'border-outline'}`}>
                  {vehicleCategory === 'bike' && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm text-on-surface block">Two-Wheeler</span>
                <span className="text-xs text-on-surface-variant">Scooters, Bikes • ~₹15/hr</span>
              </div>
            </div>

            {/* Three-Wheeler */}
            <div
              onClick={() => setVehicleCategory('auto')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                vehicleCategory === 'auto'
                  ? 'bg-primary-fixed/20 border-primary shadow-xs'
                  : 'bg-surface border-outline-variant/30 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-[28px] text-primary">electric_rickshaw</span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${vehicleCategory === 'auto' ? 'border-primary' : 'border-outline'}`}>
                  {vehicleCategory === 'auto' && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm text-on-surface block">Three-Wheeler</span>
                <span className="text-xs text-on-surface-variant">Auto / Mini Cabs • ~₹25/hr</span>
              </div>
            </div>

            {/* Four-Wheeler */}
            <div
              onClick={() => setVehicleCategory('car')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                vehicleCategory === 'car'
                  ? 'bg-primary-fixed/20 border-primary shadow-xs'
                  : 'bg-surface border-outline-variant/30 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-[28px] text-primary">directions_car</span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${vehicleCategory === 'car' ? 'border-primary' : 'border-outline'}`}>
                  {vehicleCategory === 'car' && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
              </div>
              <div>
                <span className="font-bold text-sm text-on-surface block">Four-Wheeler</span>
                <span className="text-xs text-on-surface-variant">Sedan, Hatchback, SUV • ~₹40/hr</span>
              </div>
            </div>
          </div>

          {/* Car Footprint Profile */}
          {vehicleCategory === 'car' && (
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Car Footprint / Body Profile
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['hatchback', 'sedan', 'compact_suv', 'full_suv'] as const).map((prof) => (
                  <button
                    key={prof}
                    type="button"
                    onClick={() => setCarProfile(prof)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      carProfile === prof
                        ? 'bg-primary-container text-on-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {prof.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clearance Height */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Clearance Height Tolerance
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-surface-container-low rounded-xl">
              <div
                onClick={() => setClearance('standard')}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  clearance === 'standard'
                    ? 'bg-surface-container-lowest shadow-xs border border-primary/20'
                    : 'hover:bg-surface-container-lowest/60'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">height</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-on-surface block">Standard Clearance</span>
                  <span className="text-[11px] text-on-surface-variant">&gt; 2.0m (Standard cars & sedans)</span>
                </div>
              </div>

              <div
                onClick={() => setClearance('high')}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  clearance === 'high'
                    ? 'bg-surface-container-lowest shadow-xs border border-primary/20'
                    : 'hover:bg-surface-container-lowest/60'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">garage</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-on-surface block">High Clearance</span>
                  <span className="text-[11px] text-on-surface-variant">&gt; 2.4m (Roof carriers & SUVs)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Hourly Rate Range */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">currency_rupee</span>
              <div>
                <h2 className="font-headline-sm text-base font-bold text-on-surface">
                  2. Hourly Rate Range (₹/hr)
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Chennai typical baseline: ₹30 - ₹60/hr
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
              <span className="text-xs font-bold text-primary">₹{minRate}</span>
              <span className="text-xs text-on-surface-variant">to</span>
              <span className="text-xs font-bold text-primary">₹{maxRate}</span>
              <span className="text-xs text-on-surface-variant">/hr</span>
            </div>
          </div>

          {/* Histogram Visualizer Canvas */}
          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <div className="h-12 flex items-end justify-between gap-1 px-2 pt-2">
              {[20, 35, 65, 90, 100, 80, 50, 25, 15].map((h, idx) => (
                <div
                  key={idx}
                  style={{ height: `${h}%` }}
                  className={`w-full rounded-t transition-all ${
                    idx >= 2 && idx <= 6 ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={maxRate}
                onChange={(e) => setMaxRate(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
              <span>₹15/hr (Economy)</span>
              <span className="text-primary font-bold">Optimal Value Band</span>
              <span>₹100/hr (Premium Valet)</span>
            </div>
          </div>
        </section>

        {/* SECTION 3: Space Type & Protection */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">format_image_left</span>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">
                3. Space Type & Protection
              </h2>
              <p className="text-xs text-on-surface-variant">
                Weather shielding, security personnel, and energy amenities
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Covered Parking */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={isCovered}
                onChange={(e) => setIsCovered(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">roofing</span>
                  <span className="text-sm font-bold text-on-surface">Covered Parking Roof</span>
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  Shield against Chennai sun & monsoon rains
                </span>
              </div>
            </label>

            {/* EV Fast Charging */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={hasEvCharger}
                onChange={(e) => setHasEvCharger(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">bolt</span>
                  <span className="text-sm font-bold text-on-surface">EV Fast Charging</span>
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  Type 2 AC & CCS2 charging plugs on bay
                </span>
              </div>
            </label>

            {/* 24/7 Security Guard */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={hasSecurityGuard}
                onChange={(e) => setHasSecurityGuard(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                  <span className="text-sm font-bold text-on-surface">24/7 Security Guard</span>
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  On-site uniformed attendant monitoring ingress
                </span>
              </div>
            </label>

            {/* CCTV Security */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={hasCctv}
                onChange={(e) => setHasCctv(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">videocam</span>
                  <span className="text-sm font-bold text-on-surface">CCTV Surveillance</span>
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  High-definition camera coverage with optical feed
                </span>
              </div>
            </label>

            {/* ANPR Barrier */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={hasAnprBarrier}
                onChange={(e) => setHasAnprBarrier(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">sensor_door</span>
                  <span className="text-sm font-bold text-on-surface">ANPR Boom Barrier</span>
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  Automatic number plate pass without tickets
                </span>
              </div>
            </label>

            {/* Wheelchair Accessible */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={isDisabledAccessible}
                onChange={(e) => setIsDisabledAccessible(e.target.checked)}
                className="mt-1 accent-primary w-4 h-4 rounded cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">accessible</span>
                  <span className="text-sm font-bold text-on-surface">Wheelchair Accessible</span>
                </div>
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  Wide bay with step-free elevator access
                </span>
              </div>
            </label>
          </div>
        </section>
      </main>

      {/* STICKY FOOTER */}
      <footer className="sticky bottom-0 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 py-4 px-4 sm:px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleReset}
            className="text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            Clear All Filters
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">done</span>
            <span>Apply Filters & View Spaces</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
