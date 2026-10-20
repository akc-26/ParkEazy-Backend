import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, ParkingSpace, SpaceStatus, VehicleType } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostSpacesInventoryManagementPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<ParkingFacility | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterEvOnly, setFilterEvOnly] = useState(false);
  const [filterAccessibleOnly, setFilterAccessibleOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Space Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBayId, setNewBayId] = useState('');
  const [newFloor, setNewFloor] = useState('Basement 1');
  const [newCategory, setNewCategory] = useState<VehicleType>('car');
  const [newRate, setNewRate] = useState('40');
  const [newHasEv, setNewHasEv] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const facList = await apiClient.facilities.list();
      setFacilities(facList);
      if (facList.length > 0) {
        const primary = facList[0];
        setSelectedFacility(primary);
        const spList = await apiClient.facilities.getSpaces(primary.id);
        setSpaces(spList);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFacility = async (fac: ParkingFacility) => {
    setSelectedFacility(fac);
    setLoading(true);
    try {
      const spList = await apiClient.facilities.getSpaces(fac.id);
      setSpaces(spList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load facility spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (space: ParkingSpace) => {
    const nextStatus: SpaceStatus = space.status === 'maintenance' ? 'available' : 'maintenance';
    try {
      const updated = await apiClient.spaces.updateStatus(space.id, nextStatus);
      setSpaces(spaces.map((s) => (s.id === space.id ? updated : s)));
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle space status');
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility || !newBayId) return;
    setActionLoading(true);
    try {
      const created = await apiClient.facilities.createSpace(selectedFacility.id, {
        bayIdentifier: newBayId.toUpperCase(),
        floorLevel: newFloor,
        vehicleCategory: newCategory,
        hourlyRateInr: parseFloat(newRate) || 40,
        hasEvCharger: newHasEv,
      });
      setSpaces([...spaces, created]);
      setShowAddModal(false);
      setNewBayId('');
    } catch (err: any) {
      alert(err?.message || 'Failed to add parking bay');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter calculations
  const floors = ['All', ...Array.from(new Set(spaces.map((s) => s.floorLevel || 'Ground')))];

  const filteredSpaces = spaces.filter((s) => {
    if (selectedFloor !== 'All' && s.floorLevel !== selectedFloor) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (filterEvOnly && !s.hasEvCharger) return false;
    if (filterAccessibleOnly && !s.isDisabledAccessible) return false;
    if (searchQuery && !s.bayIdentifier.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const availableCount = spaces.filter((s) => s.status === 'available').length;
  const occupiedCount = spaces.filter((s) => s.status === 'occupied').length;
  const reservedCount = spaces.filter((s) => s.status === 'reserved').length;
  const maintenanceCount = spaces.filter((s) => s.status === 'maintenance').length;

  if (loading && !selectedFacility) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#64748B]">Loading Inventory Matrix...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <span>Host Workspace</span>
              <span>/</span>
              <span>Inventory Management</span>
              <span>/</span>
              <span className="text-[#0F766E]">Bay Matrix (pe_hp_04_01)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Spaces & Physical Inventory Matrix
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                {spaces.length} Total Bays
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Interactive physical bay allocation grid, EV equipment tags, rates, and live operational status toggles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Facility Selector */}
            <select
              value={selectedFacility?.id || ''}
              onChange={(e) => {
                const fac = facilities.find((f) => f.id === e.target.value);
                if (fac) handleSelectFacility(fac);
              }}
              className="px-3 py-2 text-xs font-bold border border-[#CBD5E1] rounded-xl bg-white text-[#141B2C] outline-none"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facilityCode})
                </option>
              ))}
            </select>

            <button
              onClick={() => onNavigate(`/host/facilities/${selectedFacility?.id}/layout`)}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
            >
              ⚙️ Batch Generator
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Add Bay Slot</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-medium text-[#991B1B]">
            {error}
          </div>
        )}

        {/* STATUS PILLS & FILTERS BAR */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Bays', count: spaces.length, color: 'bg-[#F1F5F9] text-[#334155]' },
              { id: 'available', label: 'Available', count: availableCount, color: 'bg-[#DCFCE7] text-[#166534]' },
              { id: 'occupied', label: 'Occupied', count: occupiedCount, color: 'bg-[#E0F2FE] text-[#0369A1]' },
              { id: 'reserved', label: 'Reserved', count: reservedCount, color: 'bg-[#FEF3C7] text-[#92400E]' },
              { id: 'maintenance', label: 'Maintenance', count: maintenanceCount, color: 'bg-[#FEE2E2] text-[#991B1B]' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setStatusFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === p.id
                    ? 'ring-2 ring-[#0F766E] shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                } ${p.color}`}
              >
                <span>{p.label}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-white/70">
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Search & Floor Selection */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Filter by bay (e.g. A-04)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E] w-48"
            />

            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl text-xs font-semibold">
              {floors.map((fl) => (
                <button
                  key={fl}
                  onClick={() => setSelectedFloor(fl)}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                    selectedFloor === fl ? 'bg-white text-[#0F766E] shadow-xs font-bold' : 'text-[#64748B]'
                  }`}
                >
                  {fl}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-xs font-bold text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={filterEvOnly}
                onChange={(e) => setFilterEvOnly(e.target.checked)}
                className="accent-[#0F766E] w-3.5 h-3.5"
              />
              <span>⚡ EV Only</span>
            </label>
          </div>
        </div>

        {/* 24-BAY INTERACTIVE MATRIX GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSpaces.map((sp) => {
            const isAvail = sp.status === 'available';
            const isMaint = sp.status === 'maintenance';
            return (
              <div
                key={sp.id}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md relative flex flex-col justify-between ${
                  isMaint
                    ? 'border-[#FCA5A5] bg-[#FFF5F5]'
                    : isAvail
                    ? 'border-[#E2E8F0] hover:border-[#0F766E]'
                    : 'border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-base text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      {sp.bayIdentifier}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isAvail
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : isMaint
                          ? 'bg-[#FEE2E2] text-[#991B1B]'
                          : 'bg-[#E0F2FE] text-[#0369A1]'
                      }`}
                    >
                      {sp.status || 'available'}
                    </span>
                  </div>

                  <div className="text-xs text-[#64748B] flex items-center justify-between mb-3">
                    <span>{sp.floorLevel || 'Ground'}</span>
                    <span className="font-bold text-[#0F766E]">₹{sp.hourlyRateInr}/hr</span>
                  </div>

                  {/* Feature Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {sp.hasEvCharger && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] flex items-center gap-0.5">
                        ⚡ {sp.evChargerPowerKw || 22}kW EV
                      </span>
                    )}
                    {sp.isDisabledAccessible && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E0E7FF] text-[#4338CA]">
                        ♿ Accessible
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                      {sp.vehicleCategory || 'car'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate(`/host/spaces/${sp.id}/edit`)}
                      className="text-[#0F766E] font-bold hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <span className="text-[#CBD5E1]">•</span>
                    <button
                      onClick={() => onNavigate(`/host/spaces/${sp.id}/restrictions`)}
                      className="text-[#64748B] hover:text-[#141B2C] cursor-pointer"
                    >
                      Bounds
                    </button>
                    <span className="text-[#CBD5E1]">•</span>
                    <button
                      onClick={() => onNavigate(`/host/spaces/${sp.id}/amenities`)}
                      className="text-[#64748B] hover:text-[#141B2C] cursor-pointer"
                    >
                      Access
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(sp)}
                    title="Toggle operational status"
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer ${
                      isMaint
                        ? 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                        : 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECDD3]'
                    }`}
                  >
                    {isMaint ? 'Reopen' : 'Pause'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSpaces.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
            <span className="text-3xl">🔍</span>
            <div className="text-sm font-bold text-[#141B2C] mt-2">No matching parking bays found</div>
            <p className="text-xs text-[#64748B] mt-1">Try relaxing filters or search query.</p>
          </div>
        )}
      </div>

      {/* ADD SPACE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Add Single Parking Bay
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#94A3B8] hover:text-[#141B2C] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Bay Identifier (e.g. A-13)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A-13"
                  value={newBayId}
                  onChange={(e) => setNewBayId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E] uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Floor Level</label>
                  <select
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="Basement 1">Basement 1</option>
                    <option value="Basement 2">Basement 2</option>
                    <option value="Ground">Ground Floor</option>
                    <option value="Level 1">Level 1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Vehicle Category</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="car">Car / SUV</option>
                    <option value="bike">Two-Wheeler</option>
                    <option value="auto">Three-Wheeler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Hourly Tariff (₹)</label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#334155] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHasEv}
                      onChange={(e) => setNewHasEv(e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                    <span>⚡ EV Fast Charger</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm"
                >
                  {actionLoading ? 'Creating...' : 'Create Bay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
