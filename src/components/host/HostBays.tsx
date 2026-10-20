import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Sliders,
  Wrench,
  CheckCircle2,
  Trash2,
  Zap,
  Shield,
  Car,
  X,
  AlertTriangle,
  Lock,
  Unlock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Facility, ParkingBay, VehicleCompatibility, BayStatus, User } from '../../types';
import { api } from '../../api';

interface HostBaysProps {
  facilities: Facility[];
  selectedFacilityId: string | null;
  onSelectFacility: (facilityId: string) => void;
  currentUser: User;
  onRefreshFacilities: () => void;
  bulkModalOpenInitial?: boolean;
}

export const HostBays: React.FC<HostBaysProps> = ({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  currentUser,
  onRefreshFacilities,
  bulkModalOpenInitial = false
}) => {
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedBay, setSelectedBay] = useState<ParkingBay | null>(null);

  // Modals
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(bulkModalOpenInitial);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState('Floor resurfacing and sensor recalibration');

  // Single Bay Form State
  const [singleBayForm, setSingleBayForm] = useState({
    identifier: '',
    zone: 'Level 1',
    vehicleCompatibility: ['sedan', 'suv'] as VehicleCompatibility[],
    lengthMeters: 5.0,
    widthMeters: 2.5,
    heightMeters: 2.2,
    isAccessibleADA: false,
    hasEvCharger: false,
    evPowerKw: 22,
    hourlyRateMultiplier: 1.0
  });

  // Bulk Bay Form State
  const [bulkBayForm, setBulkBayForm] = useState({
    prefix: 'L1-B',
    startIndex: 1,
    count: 6,
    zone: 'Level 1',
    vehicleCompatibility: ['sedan', 'suv'] as VehicleCompatibility[],
    lengthMeters: 5.0,
    widthMeters: 2.5,
    heightMeters: 2.2,
    isAccessibleADA: false,
    hasEvCharger: false,
    evPowerKw: 22,
    hourlyRateMultiplier: 1.0
  });

  const activeFacilityId = selectedFacilityId || facilities[0]?.id;

  useEffect(() => {
    if (activeFacilityId) {
      loadBays(activeFacilityId);
    }
  }, [activeFacilityId]);

  const loadBays = async (facId: string) => {
    try {
      setLoading(true);
      const res = await api.getBays(facId);
      setBays(res);
    } catch (err) {
      console.error('Failed to load bays', err);
    } finally {
      setLoading(false);
    }
  };

  const currentFacility = facilities.find(f => f.id === activeFacilityId);

  // Distinct zones
  const zones = Array.from(new Set(bays.map(b => b.zone || 'General')));

  // Filtered bays
  const filteredBays = bays.filter(b => {
    if (filterZone !== 'all' && b.zone !== filterZone) return false;
    if (filterType === 'ev' && !b.hasEvCharger) return false;
    if (filterType === 'ada' && !b.isAccessibleADA) return false;
    if (filterType === 'suv' && !b.vehicleCompatibility.includes('suv')) return false;
    if (filterType === 'motorcycle' && !b.vehicleCompatibility.includes('motorcycle')) return false;
    return true;
  });

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacilityId) return;
    try {
      await api.createBay(activeFacilityId, {
        identifier: singleBayForm.identifier,
        zone: singleBayForm.zone,
        vehicleCompatibility: singleBayForm.vehicleCompatibility,
        dimensions: {
          lengthMeters: Number(singleBayForm.lengthMeters),
          widthMeters: Number(singleBayForm.widthMeters),
          heightMeters: Number(singleBayForm.heightMeters)
        },
        isAccessibleADA: singleBayForm.isAccessibleADA,
        hasEvCharger: singleBayForm.hasEvCharger,
        evChargerDetails: singleBayForm.hasEvCharger ? {
          powerKw: Number(singleBayForm.evPowerKw),
          plugType: 'Type2'
        } : undefined,
        hourlyRateMultiplier: Number(singleBayForm.hourlyRateMultiplier)
      });
      setShowSingleModal(false);
      loadBays(activeFacilityId);
      onRefreshFacilities();
    } catch (err: any) {
      alert('Error creating bay: ' + err.message);
    }
  };

  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacilityId) return;
    try {
      await api.createBulkBays(activeFacilityId, {
        prefix: bulkBayForm.prefix,
        startIndex: Number(bulkBayForm.startIndex),
        count: Number(bulkBayForm.count),
        zone: bulkBayForm.zone,
        vehicleCompatibility: bulkBayForm.vehicleCompatibility,
        dimensions: {
          lengthMeters: Number(bulkBayForm.lengthMeters),
          widthMeters: Number(bulkBayForm.widthMeters),
          heightMeters: Number(bulkBayForm.heightMeters)
        },
        isAccessibleADA: bulkBayForm.isAccessibleADA,
        hasEvCharger: bulkBayForm.hasEvCharger,
        evPowerKw: Number(bulkBayForm.evPowerKw),
        hourlyRateMultiplier: Number(bulkBayForm.hourlyRateMultiplier)
      });
      setShowBulkModal(false);
      loadBays(activeFacilityId);
      onRefreshFacilities();
    } catch (err: any) {
      alert('Error bulk creating bays: ' + err.message);
    }
  };

  const handleSetStatus = async (bayId: string, status: BayStatus, reason?: string) => {
    try {
      await api.setBayStatus(bayId, status, reason);
      loadBays(activeFacilityId);
      setSelectedBay(null);
      setShowMaintenanceModal(false);
      onRefreshFacilities();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeleteBay = async (bayId: string) => {
    if (!confirm('Are you sure you want to delete this parking bay?')) return;
    try {
      await api.deleteBay(bayId);
      loadBays(activeFacilityId);
      setSelectedBay(null);
      onRefreshFacilities();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Bay & Layout Architecture
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activeFacilityId}
              onChange={e => onSelectFacility(e.target.value)}
              className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.totalBays} Bays)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSingleBayForm({
                identifier: `Bay-${bays.length + 1}`,
                zone: 'Level 1',
                vehicleCompatibility: ['sedan', 'suv'],
                lengthMeters: 5.0,
                widthMeters: 2.5,
                heightMeters: 2.2,
                isAccessibleADA: false,
                hasEvCharger: false,
                evPowerKw: 22,
                hourlyRateMultiplier: 1.0
              });
              setShowSingleModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Bay</span>
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bulk Bay Generator</span>
          </button>
        </div>
      </div>

      {/* Legend & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            Live Bay Statuses:
          </span>
          <span className="flex items-center gap-1 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Available
          </span>
          <span className="flex items-center gap-1 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-sky-500 animate-pulse" /> 15-min Hold
          </span>
          <span className="flex items-center gap-1 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> Occupied
          </span>
          <span className="flex items-center gap-1 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-slate-400" /> Maintenance
          </span>
          <span className="flex items-center gap-1 text-slate-700">
            <span className="w-3 h-3 rounded-full bg-indigo-500" /> Reserved
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterZone}
            onChange={e => setFilterZone(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="all">All Zones ({bays.length})</option>
            {zones.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="all">All Vehicle Types</option>
            <option value="ev">EV Fast Charging</option>
            <option value="ada">ADA Accessible</option>
            <option value="suv">SUV Compatible</option>
            <option value="motorcycle">Motorcycle</option>
          </select>
        </div>
      </div>

      {/* Visual Floor Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading floor map...</div>
      ) : filteredBays.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No parking bays found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create individual bays or use the bulk bay generator to populate this facility.
          </p>
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
          >
            Launch Bulk Bay Generator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {filteredBays.map(bay => {
            const isAvailable = bay.status === 'available';
            const isHeld = bay.status === 'held';
            const isOccupied = bay.status === 'occupied';
            const isMaintenance = bay.status === 'maintenance';
            const isReserved = bay.status === 'reserved';

            let bgBorder = 'bg-white border-slate-200 hover:border-slate-400';
            let indicator = 'bg-emerald-500';

            if (isAvailable) {
              bgBorder = 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500';
              indicator = 'bg-emerald-500';
            } else if (isHeld) {
              bgBorder = 'bg-sky-50/50 border-sky-300 hover:border-sky-500 ring-2 ring-sky-300/40';
              indicator = 'bg-sky-500 animate-pulse';
            } else if (isOccupied) {
              bgBorder = 'bg-amber-50/50 border-amber-300 hover:border-amber-500';
              indicator = 'bg-amber-500';
            } else if (isMaintenance) {
              bgBorder = 'bg-slate-100 border-slate-300 text-slate-400';
              indicator = 'bg-slate-400';
            } else if (isReserved) {
              bgBorder = 'bg-indigo-50/40 border-indigo-300 hover:border-indigo-500';
              indicator = 'bg-indigo-500';
            }

            return (
              <div
                key={bay.id}
                onClick={() => setSelectedBay(bay)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between ${bgBorder}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm tracking-tight">
                      {bay.identifier}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${indicator}`} />
                  </div>

                  <div className="text-[10px] text-slate-500 font-medium mb-2">
                    {bay.zone}
                  </div>

                  {/* Compatibility icons */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {bay.hasEvCharger && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> EV
                      </span>
                    )}
                    {bay.isAccessibleADA && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        ADA
                      </span>
                    )}
                    {bay.vehicleCompatibility.includes('motorcycle') && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        MOTO
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-slate-600 capitalize">
                    {bay.status}
                  </span>
                  {bay.hourlyRateMultiplier !== 1.0 && (
                    <span className="text-indigo-600 font-bold">
                      {bay.hourlyRateMultiplier}x
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bay Details & Action Modal */}
      {selectedBay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Parking Bay Inspector
                </span>
                <h3 className="font-bold text-slate-900 text-xl">
                  {selectedBay.identifier}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block">Zone:</span>
                  <span className="font-semibold text-slate-800">{selectedBay.zone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Current Status:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedBay.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dimensions:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedBay.dimensions.lengthMeters}m L × {selectedBay.dimensions.widthMeters}m W × {selectedBay.dimensions.heightMeters}m H
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Rate Multiplier:</span>
                  <span className="font-semibold text-slate-800">{selectedBay.hourlyRateMultiplier}x</span>
                </div>
              </div>

              {selectedBay.hasEvCharger && (
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-600" />
                  <span>
                    EV Fast Charger Installed ({selectedBay.evChargerDetails?.powerKw || 22} kW, {selectedBay.evChargerDetails?.plugType || 'Type2'})
                  </span>
                </div>
              )}

              {selectedBay.isAccessibleADA && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ADA Compliant Accessible Wide Bay</span>
                </div>
              )}

              {selectedBay.statusReason && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                  <span className="font-semibold">Status Reason:</span> {selectedBay.statusReason}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                {selectedBay.status === 'maintenance' ? (
                  <button
                    onClick={() => handleSetStatus(selectedBay.id, 'available')}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Reopen Bay</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowMaintenanceModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Put in Maintenance</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteBay(selectedBay.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs transition-colors border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Bay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Reason Modal */}
      {showMaintenanceModal && selectedBay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Block Bay for Maintenance
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mark {selectedBay.identifier} as offline. Customers will not be able to book this bay.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Maintenance Activity *
              </label>
              <input
                type="text"
                value={maintenanceReason}
                onChange={e => setMaintenanceReason(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetStatus(selectedBay.id, 'maintenance', maintenanceReason)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Bay Creation Modal */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                Create Single Parking Bay
              </h3>
              <button onClick={() => setShowSingleModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSingle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bay Identifier *</label>
                  <input
                    type="text"
                    required
                    value={singleBayForm.identifier}
                    onChange={e => setSingleBayForm({ ...singleBayForm, identifier: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone / Level *</label>
                  <input
                    type="text"
                    required
                    value={singleBayForm.zone}
                    onChange={e => setSingleBayForm({ ...singleBayForm, zone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Length (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={singleBayForm.lengthMeters}
                    onChange={e => setSingleBayForm({ ...singleBayForm, lengthMeters: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Width (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={singleBayForm.widthMeters}
                    onChange={e => setSingleBayForm({ ...singleBayForm, widthMeters: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Height (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={singleBayForm.heightMeters}
                    onChange={e => setSingleBayForm({ ...singleBayForm, heightMeters: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleBayForm.isAccessibleADA}
                    onChange={e => setSingleBayForm({ ...singleBayForm, isAccessibleADA: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>ADA Compliant Accessible Bay</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={singleBayForm.hasEvCharger}
                    onChange={e => setSingleBayForm({ ...singleBayForm, hasEvCharger: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Equipped with EV Fast Charger (22kW Type 2)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg"
                >
                  Create Bay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Bay Generator Wizard Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Bulk Parking Bay Generator
                </h3>
                <p className="text-[11px] text-slate-500">
                  Quickly generate 5 to 50 numbered bays with unified dimensions & specs.
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateBulk} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prefix *</label>
                  <input
                    type="text"
                    required
                    value={bulkBayForm.prefix}
                    onChange={e => setBulkBayForm({ ...bulkBayForm, prefix: e.target.value })}
                    placeholder="e.g. L1-B"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Num</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkBayForm.startIndex}
                    onChange={e => setBulkBayForm({ ...bulkBayForm, startIndex: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Count *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bulkBayForm.count}
                    onChange={e => setBulkBayForm({ ...bulkBayForm, count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Zone / Floor Level</label>
                <input
                  type="text"
                  value={bulkBayForm.zone}
                  onChange={e => setBulkBayForm({ ...bulkBayForm, zone: e.target.value })}
                  placeholder="Level 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800">Preview:</span> Will generate {bulkBayForm.count} bays from{' '}
                <span className="font-mono text-indigo-600 font-bold">
                  {bulkBayForm.prefix}{bulkBayForm.startIndex < 10 ? `0${bulkBayForm.startIndex}` : bulkBayForm.startIndex}
                </span>{' '}
                to{' '}
                <span className="font-mono text-indigo-600 font-bold">
                  {bulkBayForm.prefix}
                  {bulkBayForm.startIndex + bulkBayForm.count - 1 < 10
                    ? `0${bulkBayForm.startIndex + bulkBayForm.count - 1}`
                    : bulkBayForm.startIndex + bulkBayForm.count - 1}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkBayForm.hasEvCharger}
                    onChange={e => setBulkBayForm({ ...bulkBayForm, hasEvCharger: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Install EV Fast Charger on all generated bays (22kW)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkBayForm.isAccessibleADA}
                    onChange={e => setBulkBayForm({ ...bulkBayForm, isAccessibleADA: e.target.checked })}
                    className="rounded text-sky-600"
                  />
                  <span>Designate as ADA Accessible</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
                >
                  Generate {bulkBayForm.count} Bays
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
