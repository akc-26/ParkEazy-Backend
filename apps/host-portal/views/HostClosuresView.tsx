import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  FacilityClosure,
  CreateFacilityClosureRequest,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostClosuresViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostClosuresView: React.FC<HostClosuresViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id ?? '';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [closures, setClosures] = useState<FacilityClosure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBayId, setFormBayId] = useState('');
  const [formReason, setFormReason] = useState<CreateFacilityClosureRequest['reason']>('MAINTENANCE');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFacilities = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const facs = await apiClient.getHostFacilities(hostId);
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load facilities.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const loadClosuresAndBays = useCallback(async () => {
    if (!selectedFacilityId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [closuresData, baysData] = await Promise.all([
        apiClient.getClosures(hostId, selectedFacilityId),
        apiClient.getHostFacilityBays(selectedFacilityId, hostId),
      ]);
      setClosures(closuresData);
      setBays(baysData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load closures.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadClosuresAndBays();
  }, [loadClosuresAndBays]);

  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormBayId('');
    setFormReason('MAINTENANCE');

    // Default start time: tomorrow at 08:00 local
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startStr = tomorrow.toISOString().substring(0, 11) + '08:00';
    const endStr = tomorrow.toISOString().substring(0, 11) + '17:00';
    setFormStartTime(startStr);
    setFormEndTime(endStr);
    setIsModalOpen(true);
  };

  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const startUtc = new Date(formStartTime).toISOString();
    const endUtc = new Date(formEndTime).toISOString();

    if (new Date(endUtc).getTime() <= new Date(startUtc).getTime()) {
      setErrorMessage('End time must be strictly after start time.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createClosure(hostId, {
        facilityId: selectedFacilityId,
        bayId: formBayId || undefined,
        title: formTitle.trim(),
        reason: formReason,
        startTimeUtc: startUtc,
        endTimeUtc: endUtc,
      });

      setSuccessMessage('Closure scheduled successfully. Driver bookings and holds verified.');
      setIsModalOpen(false);
      await loadClosuresAndBays();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to schedule closure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveClosure = async (closureId: string) => {
    if (!window.confirm('Are you sure you want to remove this closure? The time slot will immediately become available for customer reservations.')) {
      return;
    }
    try {
      await apiClient.removeClosure(hostId, closureId);
      setSuccessMessage('Closure removed successfully.');
      await loadClosuresAndBays();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove closure.');
    }
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div
      data-screen-id="pe_hw_03_04"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/host')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
              H
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Host Studio
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">
                ParkEazy Host Hub
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 font-semibold">{currentUser?.email}</span>
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <HostSubNav
        currentPath="/host/pricing/closures"
        onNavigate={onNavigate}
        activeModule="pricing"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Host Portal</span>
              <span>/</span>
              <span>Pricing &amp; Policies</span>
              <span>/</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                pe_hw_03_04
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Facility Closures &amp; Unavailable Periods
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Schedule temporary facility closures, holiday blockouts, or space-level maintenance with booking-protection guarantees.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label htmlFor="facility-closure-select" className="text-slate-500 font-medium">Facility:</label>
              <select
                id="facility-closure-select"
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.address.city})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              themeContext="host"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Closure</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Protection Invariant Notice */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-950">
          <ShieldAlert className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Confirmed Booking Protection Invariant:</span> Under platform policy, host closures
            cannot unilaterally cancel, move, or overwrite existing confirmed customer reservations or active 10-minute checkout holds.
            Any proposed closure period that intersects a confirmed booking will be rejected by the backend conflict validator.
          </div>
        </div>

        {/* Closures Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active &amp; Scheduled Closures</h2>
              <p className="text-xs text-slate-500">
                Unavailable periods configured for {selectedFacility?.name}.
              </p>
            </div>
            <Badge variant="default">{closures.length} Scheduled</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Closure Title</th>
                  <th className="py-3 px-4">Affected Scope</th>
                  <th className="py-3 px-4">Reason Category</th>
                  <th className="py-3 px-4">Start Time (UTC)</th>
                  <th className="py-3 px-4">End Time (UTC)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {closures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No closures scheduled. All parking spaces follow standard operating schedules.
                    </td>
                  </tr>
                ) : (
                  closures.map((c) => {
                    const targetBay = c.bayId ? bays.find((b) => b.id === c.bayId) : null;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{c.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          {c.bayId ? (
                            <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              Bay {targetBay?.bayNumber || c.bayId}
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Entire Facility
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                            {c.reason}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {c.startTimeUtc}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {c.endTimeUtc}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveClosure(c.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            title="Remove Closure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Closure Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  Schedule Facility Closure
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClosure} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Closure Title &amp; Public Notice
                  </label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Annual Gate Motor Inspection &amp; Maintenance"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Affected Scope
                    </label>
                    <select
                      value={formBayId}
                      onChange={(e) => setFormBayId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">All Spaces (Full Facility)</option>
                      {bays.map((b) => (
                        <option key={b.id} value={b.id}>
                          Bay {b.bayNumber} ({b.bayType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reason Category
                    </label>
                    <select
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="EVENT">Special Event</option>
                      <option value="HOLIDAY">Holiday Closure</option>
                      <option value="WEATHER">Weather Advisory</option>
                      <option value="OTHER">Other Reason</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Start Date &amp; Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      End Date &amp; Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <strong>Conflict Check:</strong> The server will immediately verify that no active checkout holds
                  or confirmed driver bookings intersect this window.
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    themeContext="host"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Validating...' : 'Confirm Closure'}
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
