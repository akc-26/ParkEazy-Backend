import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingSpace, VehicleType, FuelCompatibility } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  spaceId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

interface VehiclePreset {
  name: string;
  category: VehicleType;
  length: number;
  width: number;
  height: number;
  weight: number;
  fuel: FuelCompatibility;
}

const VEHICLE_PRESETS: VehiclePreset[] = [
  { name: 'Hyundai Creta (Mid SUV)', category: 'car', length: 4.30, width: 1.79, height: 1.63, weight: 1.35, fuel: 'petrol' },
  { name: 'Toyota Fortuner (Full SUV)', category: 'car', length: 4.79, width: 1.85, height: 1.83, weight: 2.18, fuel: 'diesel' },
  { name: 'Tata Nexon EV (Electric)', category: 'car', length: 3.99, width: 1.81, height: 1.61, weight: 1.40, fuel: 'electric' },
  { name: 'Royal Enfield Classic 350', category: 'bike', length: 2.14, width: 0.78, height: 1.09, weight: 0.19, fuel: 'petrol' },
  { name: 'Force Traveller (Commercial)', category: 'car', length: 5.68, width: 1.97, height: 2.55, weight: 3.65, fuel: 'diesel' },
];

export function VehicleCompatibilityRestrictionsPage({
  facilityId,
  spaceId,
  currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Configuration
  const [allowedCategories, setAllowedCategories] = useState<VehicleType[]>(['car']);
  const [maxLength, setMaxLength] = useState('5.40');
  const [maxWidth, setMaxWidth] = useState('2.50');
  const [maxHeight, setMaxHeight] = useState('2.40');
  const [maxWeight, setMaxWeight] = useState('3.50');
  const [allowedFuels, setAllowedFuels] = useState<FuelCompatibility[]>(['petrol', 'diesel', 'electric']);

  // Simulator State
  const [simPreset, setSimPreset] = useState<string>(VEHICLE_PRESETS[0].name);
  const [simLength, setSimLength] = useState(VEHICLE_PRESETS[0].length);
  const [simWidth, setSimWidth] = useState(VEHICLE_PRESETS[0].width);
  const [simHeight, setSimHeight] = useState(VEHICLE_PRESETS[0].height);
  const [simWeight, setSimWeight] = useState(VEHICLE_PRESETS[0].weight);
  const [simCategory, setSimCategory] = useState<VehicleType>(VEHICLE_PRESETS[0].category);
  const [simFuel, setSimFuel] = useState<FuelCompatibility>(VEHICLE_PRESETS[0].fuel);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadSpace();
  }, [spaceId]);

  const loadSpace = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.spaces.get(spaceId);
      setSpace(data);
      if (data.allowedVehicleCategories && data.allowedVehicleCategories.length > 0) {
        setAllowedCategories(data.allowedVehicleCategories);
      }
      if (data.maxLengthMeters) setMaxLength(data.maxLengthMeters.toString());
      if (data.maxWidthMeters) setMaxWidth(data.maxWidthMeters.toString());
      if (data.maxHeightMeters) setMaxHeight(data.maxHeightMeters.toString());
      if (data.maxWeightTonnes) setMaxWeight(data.maxWeightTonnes.toString());
      if (data.fuelCompatibility && data.fuelCompatibility.length > 0) {
        setAllowedFuels(data.fuelCompatibility);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load space details');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetName: string) => {
    setSimPreset(presetName);
    const p = VEHICLE_PRESETS.find((x) => x.name === presetName);
    if (p) {
      setSimLength(p.length);
      setSimWidth(p.width);
      setSimHeight(p.height);
      setSimWeight(p.weight);
      setSimCategory(p.category);
      setSimFuel(p.fuel);
    }
  };

  const toggleCategory = (cat: VehicleType) => {
    if (allowedCategories.includes(cat)) {
      if (allowedCategories.length > 1) {
        setAllowedCategories(allowedCategories.filter((c) => c !== cat));
      }
    } else {
      setAllowedCategories([...allowedCategories, cat]);
    }
  };

  const toggleFuel = (fuel: FuelCompatibility) => {
    if (allowedFuels.includes(fuel)) {
      if (allowedFuels.length > 1) {
        setAllowedFuels(allowedFuels.filter((f) => f !== fuel));
      }
    } else {
      setAllowedFuels([...allowedFuels, fuel]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.spaces.update(spaceId, {
        allowedVehicleCategories: allowedCategories,
        maxLengthMeters: parseFloat(maxLength),
        maxWidthMeters: parseFloat(maxWidth),
        maxHeightMeters: parseFloat(maxHeight),
        maxWeightTonnes: parseFloat(maxWeight),
        fuelCompatibility: allowedFuels,
      });
      setSuccessMsg('Vehicle compatibility parameters successfully committed to motor database.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update vehicle restrictions');
    } finally {
      setSaving(false);
    }
  };

  // Compatibility Checks
  const numMaxLength = parseFloat(maxLength) || 5.4;
  const numMaxWidth = parseFloat(maxWidth) || 2.5;
  const numMaxHeight = parseFloat(maxHeight) || 2.4;
  const numMaxWeight = parseFloat(maxWeight) || 3.5;

  const lengthOk = simLength <= numMaxLength;
  const widthOk = simWidth <= numMaxWidth;
  const heightOk = simHeight <= numMaxHeight;
  const weightOk = simWeight <= numMaxWeight;
  const categoryOk = allowedCategories.includes(simCategory);
  const fuelOk = allowedFuels.includes(simFuel);

  const isCompatible = lengthOk && widthOk && heightOk && weightOk && categoryOk && fuelOk;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#64748B]">Auditing Dimensional Specifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/spaces')} className="hover:underline">Spaces</button>
              <span>/</span>
              <span>Bay {space?.bayIdentifier || 'A-04'}</span>
              <span>/</span>
              <span className="text-[#0F766E]">Vehicle Compatibility (pe_hw_02_06)</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Vehicle Compatibility & Dimensional Restrictions
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Define physical envelopes, clearance boundaries, and powertrain access for Bay {space?.bayIdentifier || 'A-04'}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(`/host/spaces/${spaceId}/edit`)}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Bay Details
            </button>
            <button
              onClick={() => onNavigate(`/host/spaces/${spaceId}/amenities`)}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Amenities & Access →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-medium text-[#991B1B]">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLS: FORM CONFIG */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
            {/* 1. CATEGORIES */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚗</span>
                  <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    1. Allowed Vehicle Categories
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-1 rounded-full uppercase">
                  {allowedCategories.length} Selected
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'car', label: 'Four-Wheeler', sub: 'Hatchbacks, Sedans, SUVs', icon: '🚙' },
                  { id: 'bike', label: 'Two-Wheeler', sub: 'Scooters & Motorcycles', icon: '🛵' },
                  { id: 'auto', label: 'Three-Wheeler', sub: 'Passenger Auto Rickshaws', icon: '🛺' },
                ].map((cat) => {
                  const active = allowedCategories.includes(cat.id as VehicleType);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id as VehicleType)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        active
                          ? 'border-[#0F766E] bg-[#F0FDFA] ring-2 ring-[#0F766E]/20'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="text-2xl mb-2">{cat.icon}</div>
                      <div className="font-bold text-xs text-[#141B2C]">{cat.label}</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">{cat.sub}</div>
                      <div className="mt-3 text-[11px] font-semibold text-[#0F766E]">
                        {active ? '✓ Authorized' : '+ Authorize'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. PHYSICAL DIMENSIONS */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📏</span>
                  <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    2. Physical Clearance & Dimension Limits
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#64748B]">Metric (ISO 3833)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Max Length (Meters)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={maxLength}
                      onChange={(e) => setMaxLength(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#94A3B8]">m</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Standard sedan: ~4.5m, Full SUV: ~5.0m</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Max Width (Meters)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={maxWidth}
                      onChange={(e) => setMaxWidth(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#94A3B8]">m</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Includes side mirrors folded margin</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Max Height Clearance</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={maxHeight}
                      onChange={(e) => setMaxHeight(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#94A3B8]">m</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Basement beam & sprinkler clearance</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Max Gross Weight</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#94A3B8]">T</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Elevated slab load threshold</p>
                </div>
              </div>
            </div>

            {/* 3. FUEL & POWERTRAIN */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    3. Fuel & Powertrain Compatibility
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'petrol', label: 'Petrol (BS6/E20)', icon: '⛽' },
                  { id: 'diesel', label: 'Diesel', icon: '🛢️' },
                  { id: 'electric', label: 'Electric (BEV)', icon: '⚡' },
                  { id: 'cng', label: 'CNG / LPG', icon: '🔥' },
                ].map((fuel) => {
                  const active = allowedFuels.includes(fuel.id as FuelCompatibility);
                  return (
                    <button
                      key={fuel.id}
                      type="button"
                      onClick={() => toggleFuel(fuel.id as FuelCompatibility)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]'
                          : 'border-[#E2E8F0] bg-white text-[#64748B]'
                      }`}
                    >
                      <div className="text-lg">{fuel.icon}</div>
                      <div className="text-xs font-bold mt-1">{fuel.label}</div>
                      <div className="text-[10px] mt-0.5">{active ? '✓ Allowed' : '✕ Restricted'}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {saving ? 'Committing Bounds...' : '💾 Save Compatibility Rules'}
              </button>
            </div>
          </form>

          {/* RIGHT 5 COLS: COMPATIBILITY SIMULATOR */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔬</span>
                  <div>
                    <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      Compatibility Simulator
                    </h2>
                    <p className="text-[11px] text-[#64748B]">Real-time vehicle bounding box verification</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#F1F5F9] text-[#334155] px-2 py-0.5 rounded">
                  Live Matrix
                </span>
              </div>

              {/* BLUEPRINT SVG */}
              <div className="bg-[#0B132B] rounded-xl p-4 text-white relative mb-4">
                <div className="text-[10px] font-mono text-[#64D2FF] mb-2 flex justify-between">
                  <span>BAY BLUEPRINT: {numMaxLength}m × {numMaxWidth}m</span>
                  <span>CLEARANCE: {numMaxHeight}m</span>
                </div>
                <svg viewBox="0 0 320 130" className="w-full h-auto">
                  {/* Outer Bay */}
                  <rect x="20" y="10" width="280" height="110" rx="8" fill="#1C2541" stroke="#3A506B" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Vehicle Silhouette */}
                  <rect
                    x="50"
                    y="25"
                    width={Math.min(220, (simLength / numMaxLength) * 220)}
                    height={Math.min(80, (simWidth / numMaxWidth) * 80)}
                    rx="12"
                    fill={isCompatible ? '#0F766E' : '#E11D48'}
                    fillOpacity="0.4"
                    stroke={isCompatible ? '#2DD4BF' : '#F43F5E'}
                    strokeWidth="2"
                  />
                  {/* Labels */}
                  <text x="160" y="70" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                    {simPreset}
                  </text>
                  <text x="160" y="86" textAnchor="middle" fill="#CBD5E1" fontSize="9">
                    {simLength}m × {simWidth}m • {simHeight}m H
                  </text>
                </svg>

                <div className="mt-3 pt-3 border-t border-[#1C2541] flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Audit Result:</span>
                  <span
                    className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                      isCompatible
                        ? 'bg-[#027A48] text-white'
                        : 'bg-[#D92D20] text-white'
                    }`}
                  >
                    {isCompatible ? '✓ COMPATIBLE — ADMITTED' : '✕ INCOMPATIBLE — CLASH'}
                  </span>
                </div>
              </div>

              {/* PRESETS DROPDOWN */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#334155] mb-1">Select Benchmark Model</label>
                <select
                  value={simPreset}
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                >
                  {VEHICLE_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.length}m × {p.width}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* CHECKLIST TABLE */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                  <span className="text-[#64748B]">Length Check ({simLength}m vs {numMaxLength}m max)</span>
                  <span className={lengthOk ? 'text-[#027A48] font-bold' : 'text-[#D92D20] font-bold'}>
                    {lengthOk ? '✓ PASS' : '✕ OVERSIZE'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                  <span className="text-[#64748B]">Width Check ({simWidth}m vs {numMaxWidth}m max)</span>
                  <span className={widthOk ? 'text-[#027A48] font-bold' : 'text-[#D92D20] font-bold'}>
                    {widthOk ? '✓ PASS' : '✕ OVERSIZE'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                  <span className="text-[#64748B]">Height Check ({simHeight}m vs {numMaxHeight}m max)</span>
                  <span className={heightOk ? 'text-[#027A48] font-bold' : 'text-[#D92D20] font-bold'}>
                    {heightOk ? '✓ PASS' : '✕ OVERHEAD CLASH'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                  <span className="text-[#64748B]">Category Permit ({simCategory.toUpperCase()})</span>
                  <span className={categoryOk ? 'text-[#027A48] font-bold' : 'text-[#D92D20] font-bold'}>
                    {categoryOk ? '✓ ALLOWED' : '✕ RESTRICTED'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC]">
                  <span className="text-[#64748B]">Fuel Authorization ({simFuel.toUpperCase()})</span>
                  <span className={fuelOk ? 'text-[#027A48] font-bold' : 'text-[#D92D20] font-bold'}>
                    {fuelOk ? '✓ ADMITTED' : '✕ BARRED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
