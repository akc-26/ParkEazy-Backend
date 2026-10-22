import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, ParkingSpace, VehicleType } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PhysicalInventoryBayLayoutPage({ facilityId, currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('All');

  // Generator / Add Modal State
  const [showGenerator, setShowGenerator] = useState(false);
  const [showSingleAdd, setShowSingleAdd] = useState(false);
  const [genPrefix, setGenPrefix] = useState('A');
  const [genStart, setGenStart] = useState('1');
  const [genEnd, setGenEnd] = useState('12');
  const [genFloor, setGenFloor] = useState('Basement 1');
  const [genCategory, setGenCategory] = useState<VehicleType>('car');
  const [genRate, setGenRate] = useState('40');
  const [genHasEv, setGenHasEv] = useState(false);

  // Single Add State
  const [singleBay, setSingleBay] = useState('');
  const [singleFloor, setSingleFloor] = useState('Basement 1');
  const [singleCategory, setSingleCategory] = useState<VehicleType>('car');
  const [singleRate, setSingleRate] = useState('40');
  const [singleHasEv, setSingleHasEv] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadData();
  }, [facilityId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const f = await apiClient.facilities.get(facilityId);
      const s = await apiClient.facilities.getSpaces(facilityId);
      setFacility(f);
      setSpaces(s);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parking inventory');
    } finally {
      setLoading(false);
    }
  };

  const floors = ['All', ...Array.from(new Set(spaces.map((s) => s.floorLevel || 'Ground')))];

  const filteredSpaces = spaces.filter((s) => {
    if (selectedFloor !== 'All' && (s.floorLevel || 'Ground') !== selectedFloor) return false;
    return true;
  });

  const handleRunGenerator = async () => {
    setError(null);
    const start = parseInt(genStart, 10);
    const end = parseInt(genEnd, 10);
    const rate = parseFloat(genRate);

    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      setError('Please provide a valid bay slot number range (e.g. 1 to 20)');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      setError('Hourly rate must be greater than 0');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.facilities.bulkCreateSpaces(facilityId, {
        prefix: genPrefix.trim().toUpperCase(),
        startNumber: start,
        endNumber: end,
        floorLevel: genFloor,
        vehicleCategory: genCategory,
        hourlyRateInr: rate,
        hasEvCharger: genHasEv,
      });

      setShowGenerator(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to bulk generate bays');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSingleBay = async () => {
    setError(null);
    if (!singleBay.trim()) {
      setError('Bay identifier is required (e.g. A-15)');
      return;
    }
    const rate = parseFloat(singleRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Hourly rate must be greater than 0');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.facilities.createSpace(facilityId, {
        bayIdentifier: singleBay.trim().toUpperCase(),
        floorLevel: singleFloor,
        vehicleCategory: singleCategory,
        hourlyRateInr: rate,
        hasEvCharger: singleHasEv,
      });

      setSingleBay('');
      setShowSingleAdd(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add bay');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/host/spaces')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#141B2C] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Facilities</span>
            </button>
            <div className="h-4 w-px bg-[#E2E8F0]"></div>
            <div>
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#141B2C] block">
                {facility?.name || 'Bay Layout & Matrix'}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">
                {facility?.facilityCode} • {spaces.length} Bays Configured
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded">
              PE-HW-02-04
            </span>
            <button
              onClick={() => onNavigate(`/host/facilities/${facilityId}/restrictions`)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer shadow-xs"
            >
              Vehicle Rules →
            </button>
          </div>
        </div>
      </header>

      {/* WIZARD PROGRESS BAR */}
      <div className="bg-white border-b border-[#E2E8F0] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#0F766E] font-medium cursor-pointer" onClick={() => onNavigate('/host/spaces')}>
            <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#0F766E] flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Facility Info</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#0F766E] mx-4"></div>
          <div className="flex items-center gap-2 text-[#0F766E] font-medium cursor-pointer" onClick={() => onNavigate(`/host/facilities/${facilityId}/gate`)}>
            <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#0F766E] flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Entrance & Gate</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#0F766E] mx-4"></div>
          <div className="flex items-center gap-2 text-[#0F766E] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-[10px]">3</span>
            <span>Bay Layout</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-4"></div>
          <div className="flex items-center gap-2 text-[#64748B] cursor-pointer" onClick={() => onNavigate(`/host/facilities/${facilityId}/publish`)}>
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px]">4</span>
            <span>Publish Audit</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* EXPLANATORY CALLOUT */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 mb-8 flex items-start gap-3 shadow-xs">
          <span className="material-symbols-outlined text-[#2563EB] text-[20px] shrink-0 mt-0.5">info</span>
          <div className="text-xs text-[#1E3A8A]">
            <strong className="font-bold block mb-0.5">
              Physical Inventory ≠ Live Bookable Inventory
            </strong>
            Physical bays represent structural parking geometry and painted floor demarcation. Motorists can only book bays that are configured with positive tariffs, valid dimensions, and marked active.
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs">
            {error}
          </div>
        )}

        {/* CONTROLS ROW */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* FLOOR FILTER CHIPS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <span className="text-xs text-[#64748B] font-semibold shrink-0">Level / Floor:</span>
            {floors.map((fl) => (
              <button
                key={fl}
                onClick={() => setSelectedFloor(fl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition ${
                  selectedFloor === fl
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
              >
                {fl}
              </button>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSingleAdd(true)}
              className="px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#141B2C] hover:bg-[#F8FAFC] transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Single Bay</span>
            </button>
            <button
              onClick={() => setShowGenerator(true)}
              className="px-3.5 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>Quick Generator (Bulk)</span>
            </button>
          </div>
        </div>

        {/* BULK GENERATOR MODAL */}
        {showGenerator && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0F766E]">auto_fix_high</span>
                  <span>Bulk Bay Slot Generator</span>
                </h3>
                <button onClick={() => setShowGenerator(false)} className="text-[#64748B] hover:text-[#141B2C] cursor-pointer">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Bay Prefix (e.g. A, B, L1)</label>
                  <input
                    type="text"
                    value={genPrefix}
                    onChange={(e) => setGenPrefix(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Start Number</label>
                    <input
                      type="number"
                      value={genStart}
                      onChange={(e) => setGenStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">End Number</label>
                    <input
                      type="number"
                      value={genEnd}
                      onChange={(e) => setGenEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Floor / Sub-Zone</label>
                    <input
                      type="text"
                      value={genFloor}
                      onChange={(e) => setGenFloor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Vehicle Category</label>
                    <select
                      value={genCategory}
                      onChange={(e) => setGenCategory(e.target.value as VehicleType)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    >
                      <option value="car">Car / Sedan</option>
                      <option value="suv">SUV / Oversized</option>
                      <option value="bike">Two-Wheeler</option>
                      <option value="auto">Three-Wheeler</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="font-semibold block mb-1">Hourly Tariff (₹/hr)</label>
                    <input
                      type="number"
                      value={genRate}
                      onChange={(e) => setGenRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    />
                  </div>
                  <div className="pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genHasEv}
                        onChange={(e) => setGenHasEv(e.target.checked)}
                        className="rounded text-[#0F766E]"
                      />
                      <span className="font-semibold">EV Fast Charger</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowGenerator(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRunGenerator}
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d655e]"
                  >
                    {actionLoading ? 'Generating...' : 'Generate Bays'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SINGLE BAY MODAL */}
        {showSingleAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Add Single Parking Bay
                </h3>
                <button onClick={() => setShowSingleAdd(false)} className="text-[#64748B] hover:text-[#141B2C] cursor-pointer">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Bay Identifier * (e.g. A-13)</label>
                  <input
                    type="text"
                    value={singleBay}
                    onChange={(e) => setSingleBay(e.target.value)}
                    placeholder="A-13"
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Floor Level</label>
                    <input
                      type="text"
                      value={singleFloor}
                      onChange={(e) => setSingleFloor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Vehicle Category</label>
                    <select
                      value={singleCategory}
                      onChange={(e) => setSingleCategory(e.target.value as VehicleType)}
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                    >
                      <option value="car">Car</option>
                      <option value="suv">SUV</option>
                      <option value="bike">Bike</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Hourly Tariff (₹/hr)</label>
                  <input
                    type="number"
                    value={singleRate}
                    onChange={(e) => setSingleRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={singleHasEv}
                      onChange={(e) => setSingleHasEv(e.target.checked)}
                      className="rounded text-[#0F766E]"
                    />
                    <span className="font-semibold">EV Fast Charger Present</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowSingleAdd(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSingleBay}
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0d655e]"
                  >
                    {actionLoading ? 'Saving...' : 'Add Bay'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BAY MATRIX GRID */}
        {loading ? (
          <div className="py-20 text-center text-[#64748B]">
            <div className="inline-block w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-medium">Loading bay matrix...</p>
          </div>
        ) : filteredSpaces.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center max-w-md mx-auto shadow-xs">
            <span className="material-symbols-outlined text-[36px] text-[#64748B] mb-2 block">grid_off</span>
            <h4 className="text-sm font-bold text-[#141B2C]">No Bays in this Level</h4>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              Use the Quick Generator above to create sequential parking bays.
            </p>
            <button
              onClick={() => setShowGenerator(true)}
              className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold"
            >
              Open Bulk Generator
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredSpaces.map((space) => (
              <div
                key={space.id}
                onClick={() => onNavigate(`/host/facilities/${facilityId}/spaces/${space.id}/edit`)}
                className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 hover:border-[#0F766E] hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-[#141B2C] group-hover:text-[#0F766E]">
                      {space.bayIdentifier}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        space.status === 'maintenance'
                          ? 'bg-[#F3F4F6] text-[#6B7280]'
                          : space.status === 'occupied'
                          ? 'bg-[#FEF2F2] text-[#EF4444]'
                          : space.status === 'reserved'
                          ? 'bg-[#FFFBEB] text-[#D97706]'
                          : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                    >
                      {space.status || 'Active'}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#64748B] truncate">
                    {space.floorLevel || 'Ground'}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569] font-medium uppercase">
                      {space.vehicleCategory}
                    </span>
                    {space.hasEvCharger && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#CCFBF1] text-[#0F766E] font-bold">
                        ⚡ EV
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
                  <strong className="text-[#0F766E]">₹{space.hourlyRateInr}/hr</strong>
                  <span className="text-[#94A3B8] group-hover:text-[#0F766E] text-[10px] font-medium">Edit →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER NAVIGATION */}
        <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/host/facilities/${facilityId}/gate`)}
            className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer"
          >
            ← Back to Entrance Details
          </button>
          <button
            onClick={() => onNavigate(`/host/facilities/${facilityId}/restrictions`)}
            className="px-5 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer shadow-xs"
          >
            Configure Vehicle Compatibility →
          </button>
        </div>
      </main>
    </div>
  );
}
