import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  ArrowLeft,
  Car,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  SlidersHorizontal,
  Search,
  Eye,
  RefreshCw,
  X,
  Compass,
} from 'lucide-react';
import { Button, Input, Card, Badge, Modal } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  BayType,
  BayStatus,
  VehicleCategory,
  CreateBayRequest,
} from '../../../packages/contracts';

interface HostFacilityLayoutViewProps {
  currentUser: SessionUser | null;
  facilityId: string;
  onNavigate: (path: string) => void;
}

export const HostFacilityLayoutView: React.FC<HostFacilityLayoutViewProps> = ({
  currentUser,
  facilityId,
  onNavigate,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Add Bay Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBayNumber, setNewBayNumber] = useState('');
  const [newBayType, setNewBayType] = useState<BayType>(BayType.STANDARD);
  const [newLevel, setNewLevel] = useState('Ground');
  const [newHeightMeters, setNewHeightMeters] = useState('2.2');
  const [newLengthMeters, setNewLengthMeters] = useState('5.2');
  const [newWidthMeters, setNewWidthMeters] = useState('2.2');
  const [newIsEvCharging, setNewIsEvCharging] = useState(false);
  const [newEvKw, setNewEvKw] = useState('11');
  const [newHasCctv, setNewHasCctv] = useState(true);
  const [newIsCovered, setNewIsCovered] = useState(true);
  const [newIsAccessible, setNewIsAccessible] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingBay, setIsSubmittingBay] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fac, spaces] = await Promise.all([
        apiClient.getHostFacility(hostId, facilityId),
        apiClient.getHostSpaces(hostId, facilityId),
      ]);
      setFacility(fac);
      setBays(spaces);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve bay layout.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, facilityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBay = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newBayNumber.trim()) {
      setAddError('Bay number / identifier is required.');
      return;
    }

    setIsSubmittingBay(true);
    try {
      const payload: CreateBayRequest = {
        bayNumber: newBayNumber.trim(),
        bayType: newBayType,
        levelOrFloor: newLevel.trim() || 'Ground',
        maxVehicleHeightMeters: parseFloat(newHeightMeters || '2.2'),
        maxVehicleLengthMeters: parseFloat(newLengthMeters || '5.2'),
        maxVehicleWidthMeters: parseFloat(newWidthMeters || '2.2'),
        isEvCharging: newIsEvCharging,
        evChargerKw: newIsEvCharging ? parseFloat(newEvKw || '7.4') : undefined,
        hasCctv: newHasCctv,
        isCovered: newIsCovered,
        isAccessible: newIsAccessible,
        notes: newNotes.trim() || undefined,
        status: BayStatus.AVAILABLE,
      };

      await apiClient.createHostSpace(hostId, facilityId, payload);
      setIsAddModalOpen(false);
      // Reset form
      setNewBayNumber('');
      setNewNotes('');
      setNewIsEvCharging(false);
      await loadData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create parking space.');
    } finally {
      setIsSubmittingBay(false);
    }
  };

  const handleDeleteBay = async (bayId: string, bayNumber: string) => {
    if (!window.confirm(`Are you sure you want to remove space '${bayNumber}'?`)) {
      return;
    }
    try {
      await apiClient.deleteHostSpace(hostId, facilityId, bayId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete parking space.');
    }
  };

  // Distinct levels for filter
  const uniqueLevels = Array.from(new Set(bays.map((b) => b.levelOrFloor || 'Ground')));

  // Filter bays
  const filteredBays = bays.filter((b) => {
    const matchesSearch =
      !searchQuery ||
      b.bayNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLevel = levelFilter === 'ALL' || (b.levelOrFloor || 'Ground') === levelFilter;
    const matchesType = typeFilter === 'ALL' || b.bayType === typeFilter;

    return matchesSearch && matchesLevel && matchesType;
  });

  return (
    <div
      data-screen-id="pe_hw_02_04"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facilityId}`)}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Facility
          </button>
        </div>
        <div className="text-xs font-mono text-emerald-400">
          pe_hw_02_04 • Physical Inventory &amp; Bay Layout
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => onNavigate('/host/spaces')}
                className="hover:underline"
              >
                Facilities
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => onNavigate(`/host/facilities/${facilityId}`)}
                className="hover:underline font-semibold"
              >
                {facility?.name || 'Facility'}
              </button>
              <span>/</span>
              <span className="text-emerald-700 font-bold">Physical Bay Layout</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#132A24] tracking-tight mt-1">
              Physical Parking Spaces &amp; Layout
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure each discrete parking bay, height limits, vehicle compatibility ratings, and charging hardware.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-slate-300"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              themeContext="host"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
              Add Parking Space
            </Button>
          </div>
        </div>

        {/* Layout Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-[#D8E2DE]">
            <span className="text-xs text-slate-500 block">Total Spaces Configured</span>
            <span className="text-2xl font-bold font-mono text-[#132A24] mt-1 block">
              {bays.length}
            </span>
          </Card>
          <Card className="p-4 bg-white border border-[#D8E2DE]">
            <span className="text-xs text-slate-500 block">Available for Booking</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
              {bays.filter((b) => b.status === BayStatus.AVAILABLE).length}
            </span>
          </Card>
          <Card className="p-4 bg-white border border-[#D8E2DE]">
            <span className="text-xs text-slate-500 block">EV Equipped Bays</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
              {bays.filter((b) => b.isEvCharging).length}
            </span>
          </Card>
          <Card className="p-4 bg-white border border-[#D8E2DE]">
            <span className="text-xs text-slate-500 block">Accessible (ADA)</span>
            <span className="text-2xl font-bold font-mono text-slate-700 mt-1 block">
              {bays.filter((b) => b.isAccessible).length}
            </span>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#D8E2DE] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bays by identifier (e.g. B2-30) or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700"
            >
              <option value="ALL">All Levels / Floors</option>
              {uniqueLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700"
            >
              <option value="ALL">All Bay Types</option>
              <option value={BayType.STANDARD}>Standard</option>
              <option value={BayType.EV_CHARGING}>EV Charging</option>
              <option value={BayType.ACCESSIBLE}>Accessible (ADA)</option>
              <option value={BayType.COVERED}>Covered</option>
              <option value={BayType.COMPACT}>Compact</option>
              <option value={BayType.OVERSIZED}>Oversized</option>
            </select>
          </div>
        </div>

        {/* Bays Layout Grid */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
            <p className="text-sm text-slate-600">Loading bay layout...</p>
          </div>
        ) : filteredBays.length === 0 ? (
          <div className="bg-white border border-[#D8E2DE] rounded-2xl p-12 text-center max-w-md mx-auto">
            <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              {bays.length === 0 ? 'No Parking Spaces Configured' : 'No Spaces Match Filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {bays.length === 0
                ? 'Add your first parking bay to define physical capacity, vehicle height limits, and EV specs.'
                : 'Try clearing your filters to see other spaces in this facility.'}
            </p>
            {bays.length === 0 && (
              <Button
                variant="primary"
                themeContext="host"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 bg-[#22C55E] font-bold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Space Now
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBays.map((bay) => (
              <div
                key={bay.id}
                className="bg-white rounded-xl border border-[#D8E2DE] p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-extrabold text-base text-[#132A24] bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {bay.bayNumber}
                    </span>
                    <Badge
                      variant={
                        bay.status === BayStatus.AVAILABLE
                          ? 'success'
                          : bay.status === BayStatus.OCCUPIED
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {bay.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bay Type:</span>
                      <span className="font-semibold text-slate-800">{bay.bayType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Level / Section:</span>
                      <span className="font-medium text-slate-700">{bay.levelOrFloor || 'Ground'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Height Clearance:</span>
                      <span className="font-mono text-slate-800">
                        {bay.maxVehicleHeightMeters ? `${bay.maxVehicleHeightMeters}m` : 'No Limit'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">EV Hardware:</span>
                      <span className="font-medium text-emerald-700">
                        {bay.isEvCharging ? `Active (${bay.evChargerKw || 7.4} kW)` : 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Security &amp; Cover:</span>
                      <span>
                        {bay.hasCctv ? 'CCTV' : 'No CCTV'} • {bay.isCovered ? 'Covered' : 'Open'}
                      </span>
                    </div>
                    {bay.notes && (
                      <p className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 italic line-clamp-1">
                        "{bay.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bay Management Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onNavigate(`/host/spaces/${bay.id}/edit`)}
                      className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200"
                      title="Edit Bay Properties"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/host/spaces/${bay.id}/restrictions`)}
                      className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200"
                      title="Vehicle Clearance & Restrictions"
                    >
                      Clearances
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/host/spaces/${bay.id}/amenities`)}
                      className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200"
                      title="Space Amenities"
                    >
                      Amenities
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBay(bay.id, bay.bayNumber)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Bay"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Space Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-base text-[#132A24]">
                    Add New Parking Space
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  {addError}
                </div>
              )}

              <form onSubmit={handleCreateBay} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Bay Identifier / Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B2-38, Bay 5"
                      value={newBayNumber}
                      onChange={(e) => setNewBayNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Level / Section
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ground, B2, Deck 1"
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bay Type</label>
                    <select
                      value={newBayType}
                      onChange={(e) => setNewBayType(e.target.value as BayType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value={BayType.STANDARD}>Standard Bay</option>
                      <option value={BayType.EV_CHARGING}>EV Charging Bay</option>
                      <option value={BayType.ACCESSIBLE}>Accessible / ADA Bay</option>
                      <option value={BayType.COVERED}>Covered Bay</option>
                      <option value={BayType.COMPACT}>Compact Bay</option>
                      <option value={BayType.OVERSIZED}>Oversized Vehicle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Height (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newHeightMeters}
                      onChange={(e) => setNewHeightMeters(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* EV Charging Config */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      EV Charging Equipped
                    </span>
                    <input
                      type="checkbox"
                      checked={newIsEvCharging}
                      onChange={(e) => setNewIsEvCharging(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                  </div>

                  {newIsEvCharging && (
                    <div className="pt-2 flex items-center gap-3">
                      <label className="font-medium text-slate-600">Charger Rating:</label>
                      <select
                        value={newEvKw}
                        onChange={(e) => setNewEvKw(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                      >
                        <option value="7.4">7.4 kW (Level 2)</option>
                        <option value="11">11.0 kW (Three-Phase AC)</option>
                        <option value="22">22.0 kW (Fast AC)</option>
                        <option value="50">50.0 kW (DC Fast Charger)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHasCctv}
                      onChange={(e) => setNewHasCctv(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>CCTV Active</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsCovered}
                      onChange={(e) => setNewIsCovered(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Covered</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsAccessible}
                      onChange={(e) => setNewIsAccessible(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Accessible</span>
                  </label>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bay Notes &amp; Driver Placement Guidance
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pillar on right side; wall box charger on front."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    themeContext="host"
                    size="sm"
                    disabled={isSubmittingBay}
                    className="font-bold bg-[#22C55E]"
                  >
                    {isSubmittingBay ? 'Adding...' : 'Create Space'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
