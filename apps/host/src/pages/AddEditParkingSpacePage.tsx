import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  UserAccount,
  ParkingSpace,
  BayClassification,
  StallPosition,
  ManeuverabilityAngle,
  SurfaceFlooringCondition,
  VehicleType,
  SpaceStatus,
} from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  spaceId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function AddEditParkingSpacePage({ facilityId, spaceId, currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [bayIdentifier, setBayIdentifier] = useState('');
  const [floorLevel, setFloorLevel] = useState('Ground');
  const [vehicleCategory, setVehicleCategory] = useState<VehicleType>('car');
  const [classification, setClassification] = useState<BayClassification>('standard');
  const [stallPosition, setStallPosition] = useState<StallPosition>('single_independent');
  const [maneuverabilityAngle, setManeuverabilityAngle] = useState<ManeuverabilityAngle>('90_perpendicular');
  const [surfaceFlooring, setSurfaceFlooring] = useState<SurfaceFlooringCondition>('epoxy_coated');
  const [sensorId, setSensorId] = useState('');
  const [hasEvCharger, setHasEvCharger] = useState(false);
  const [evChargerPowerKw, setEvChargerPowerKw] = useState('22.0');
  const [evPlugType, setEvPlugType] = useState('Type 2 AC (7.4kW - 22kW)');
  const [isDisabledAccessible, setIsDisabledAccessible] = useState(false);
  const [hourlyRateInr, setHourlyRateInr] = useState('40');
  const [status, setStatus] = useState<SpaceStatus>('available');

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadSpace();
  }, [spaceId]);

  const loadSpace = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await apiClient.spaces.get(spaceId);
      setSpace(s);
      setBayIdentifier(s.bayIdentifier || s.spaceNumber || '');
      setFloorLevel(s.floorLevel || 'Ground');
      setVehicleCategory(s.vehicleCategory || 'car');
      setClassification(s.classification || 'standard');
      setStallPosition(s.stallPosition || 'single_independent');
      setManeuverabilityAngle(s.maneuverabilityAngle || '90_perpendicular');
      setSurfaceFlooring(s.surfaceFlooring || 'epoxy_coated');
      setSensorId(s.sensorId || '');
      setHasEvCharger(Boolean(s.hasEvCharger));
      setEvChargerPowerKw(String(s.evChargerPowerKw || 22.0));
      setEvPlugType(s.evPlugType || 'Type 2 AC (7.4kW - 22kW)');
      setIsDisabledAccessible(Boolean(s.isDisabledAccessible));
      setHourlyRateInr(String(s.hourlyRateInr || 40));
      setStatus(s.status || 'available');
    } catch (err: any) {
      setError(err?.message || 'Failed to load parking space details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!bayIdentifier.trim()) {
      setError('Bay identifier is required');
      return;
    }
    const rate = parseFloat(hourlyRateInr);
    if (isNaN(rate) || rate <= 0) {
      setError('Hourly rate must be a positive number');
      return;
    }

    setSaving(true);
    try {
      const updated = await apiClient.spaces.update(spaceId, {
        bayIdentifier: bayIdentifier.trim().toUpperCase(),
        floorLevel: floorLevel.trim(),
        vehicleCategory,
        classification,
        stallPosition,
        maneuverabilityAngle,
        surfaceFlooring,
        sensorId: sensorId.trim() || undefined,
        hasEvCharger,
        evChargerPowerKw: hasEvCharger ? parseFloat(evChargerPowerKw) || 22.0 : undefined,
        evPlugType: hasEvCharger ? evPlugType : undefined,
        isDisabledAccessible,
        hourlyRateInr: rate,
        status,
      });

      setSpace(updated);
      setSuccessMsg(`Bay ${updated.bayIdentifier} specifications updated successfully.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to update parking space');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9FF] flex items-center justify-center">
        <div className="text-center text-[#64748B]">
          <div className="inline-block w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium">Loading bay specifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate(`/host/facilities/${facilityId}/layout`)}
              className="text-xs font-semibold text-[#64748B] hover:text-[#141B2C] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Bay Matrix</span>
            </button>
            <div className="h-4 w-px bg-[#E2E8F0]"></div>
            <div>
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#141B2C] block">
                Edit Bay {space?.bayIdentifier}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">
                {space?.floorLevel} • ID: {space?.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded">
              PE-HW-02-05
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer shadow-xs"
            >
              {saving ? 'Saving...' : 'Save Draft Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs">
            {successMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-8">
          {/* SECTION 1: BAY IDENTITY & CLASSIFICATION */}
          <div>
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              Physical Bay Identification & Classification
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Identifier painted on the parking bay floor or pillar stencil.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Unique Bay Identifier *
                </label>
                <input
                  type="text"
                  value={bayIdentifier}
                  onChange={(e) => setBayIdentifier(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] font-mono font-bold text-xs text-[#141B2C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Floor Level / Zone *
                </label>
                <input
                  type="text"
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#141B2C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Vehicle Category *
                </label>
                <select
                  value={vehicleCategory}
                  onChange={(e) => setVehicleCategory(e.target.value as VehicleType)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#141B2C]"
                >
                  <option value="car">Car (Sedan / Hatchback)</option>
                  <option value="suv">SUV / Crossover</option>
                  <option value="bike">Two-Wheeler (Motorcycle)</option>
                  <option value="auto">Three-Wheeler (Auto)</option>
                </select>
              </div>
            </div>

            {/* CLASSIFICATION CARDS */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-[#141B2C] block mb-2">
                Bay Classification Profile
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'standard', label: 'Standard Bay', desc: 'Up to Mid-size Sedan' },
                  { id: 'compact', label: 'Compact Bay', desc: 'Hatchbacks only' },
                  { id: 'oversized', label: 'Oversized / Wide', desc: 'SUVs & Extra width' },
                  { id: 'tandem', label: 'Tandem Stall', desc: 'Front/Back paired' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setClassification(item.id as BayClassification)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      classification === item.id
                        ? 'border-[#0F766E] bg-[#ECFDF5]/50 ring-1 ring-[#0F766E]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <strong className="text-xs text-[#141B2C] block">{item.label}</strong>
                    <span className="text-[10px] text-[#64748B] block mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: STRUCTURAL POSITION & MANEUVERABILITY */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              Structural Stall Position & Maneuverability
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Physical structural factors that impact door opening clearance and turning radius.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Structural Stall Position
                </label>
                <select
                  value={stallPosition}
                  onChange={(e) => setStallPosition(e.target.value as StallPosition)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#141B2C]"
                >
                  <option value="single_independent">Single Independent (Open sides)</option>
                  <option value="pillar_left">Pillar Left Side</option>
                  <option value="pillar_right">Pillar Right Side</option>
                  <option value="wall_backing">Wall Backing / Dead End</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Ingress Angle
                </label>
                <select
                  value={maneuverabilityAngle}
                  onChange={(e) => setManeuverabilityAngle(e.target.value as ManeuverabilityAngle)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#141B2C]"
                >
                  <option value="90_perpendicular">90° Perpendicular Entry</option>
                  <option value="60_angled">60° Angled Forward Ingress</option>
                  <option value="parallel">Parallel Curb Staging</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Surface Flooring Condition
                </label>
                <select
                  value={surfaceFlooring}
                  onChange={(e) => setSurfaceFlooring(e.target.value as SurfaceFlooringCondition)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#141B2C]"
                >
                  <option value="epoxy_coated">Epoxy Coated (Smooth & Clean)</option>
                  <option value="concrete_pavers">Concrete Pavers</option>
                  <option value="asphalt">Asphalt Paving</option>
                  <option value="gravel">Compacted Gravel / Unpaved</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                Ultrasonic / IoT Sensor ID (Optional)
              </label>
              <input
                type="text"
                value={sensorId}
                onChange={(e) => setSensorId(e.target.value)}
                placeholder="e.g. SENSOR-ANNANAGAR-A01"
                className="w-full max-w-sm px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#141B2C] font-mono"
              />
            </div>
          </div>

          {/* SECTION 3: EV CHARGING & TARIFF */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              EV Charging & Pricing Tariff
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Configure EV charging hardware, accessibility provisions, and hourly pricing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC]">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={hasEvCharger}
                    onChange={(e) => setHasEvCharger(e.target.checked)}
                    className="w-4 h-4 text-[#0F766E] rounded"
                  />
                  <strong className="text-xs text-[#141B2C]">⚡ Dedicated EV Charger Installed</strong>
                </label>

                {hasEvCharger && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                        Charger Output Power (kW)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={evChargerPowerKw}
                        onChange={(e) => setEvChargerPowerKw(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                        Plug Standard
                      </label>
                      <select
                        value={evPlugType}
                        onChange={(e) => setEvPlugType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs"
                      >
                        <option value="Type 2 AC (7.4kW - 22kW)">Type 2 AC (7.4kW - 22kW)</option>
                        <option value="CCS2 DC Fast Charger (30kW - 60kW)">CCS2 DC Fast Charger (30kW - 60kW)</option>
                        <option value="15A Standard 3-Pin (3.3kW)">15A Standard 3-Pin Socket (3.3kW)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                    Base Hourly Tariff (₹ INR / Hour) *
                  </label>
                  <input
                    type="number"
                    value={hourlyRateInr}
                    onChange={(e) => setHourlyRateInr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] font-bold text-sm text-[#0F766E]"
                  />
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Customer billings and gross earnings are computed from this rate.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                    Operational Bay Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SpaceStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold"
                  >
                    <option value="available">Available (Live Bookable)</option>
                    <option value="occupied">Occupied (Currently in use)</option>
                    <option value="reserved">Reserved (Incoming booking pass)</option>
                    <option value="maintenance">Maintenance / Blocked (Offline)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDisabledAccessible}
                      onChange={(e) => setIsDisabledAccessible(e.target.checked)}
                      className="rounded text-[#0F766E]"
                    />
                    <span className="text-xs text-[#141B2C] font-medium">
                      Disabled Accessible (Extra wide side clearance & ramp access)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="border-t border-[#E2E8F0] pt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate(`/host/facilities/${facilityId}/layout`)}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              Cancel & Return to Matrix
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer shadow-xs"
            >
              {saving ? 'Saving...' : 'Save Draft Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
