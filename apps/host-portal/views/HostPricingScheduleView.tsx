import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Info,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  FacilityOperatingDay,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPricingScheduleViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const HostPricingScheduleView: React.FC<HostPricingScheduleViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id ?? '';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [schedule, setSchedule] = useState<FacilityOperatingDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const loadSchedule = useCallback(async () => {
    if (!selectedFacilityId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getOperatingHours(hostId, selectedFacilityId);
      setSchedule(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load schedule.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleDayChange = (
    dayIndex: number,
    field: keyof FacilityOperatingDay,
    value: any
  ) => {
    setSchedule((prev) => {
      const copy = [...prev];
      const entry = { ...copy[dayIndex], [field]: value };
      if (field === 'openTime' || field === 'closeTime') {
        entry.isOvernight = entry.closeTime < entry.openTime;
      }
      copy[dayIndex] = entry;
      return copy;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await apiClient.updateOperatingHours(
        hostId,
        selectedFacilityId,
        schedule
      );
      setSchedule(updated);
      setSuccessMessage('Weekly operating schedule saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply24_7 = () => {
    setSchedule((prev) =>
      prev.map((d) => ({
        ...d,
        isClosed: false,
        openTime: '00:00',
        closeTime: '23:59',
        isOvernight: false,
      }))
    );
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div
      data-screen-id="pe_hw_03_03"
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
        currentPath="/host/pricing/schedule"
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
                pe_hw_03_03
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Operating Hours &amp; Weekly Schedules
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Set gate access and booking windows by day of the week, with timezone alignment and overnight crossing.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label htmlFor="facility-schedule-select" className="text-slate-500 font-medium">Facility:</label>
              <select
                id="facility-schedule-select"
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
              variant="outline"
              size="sm"
              onClick={handleApply24_7}
              className="text-xs"
            >
              Set All to 24/7 Access
            </Button>

            <Button
              variant="primary"
              size="sm"
              themeContext="host"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Schedule'}</span>
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

        {selectedFacility && (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900 text-xs">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Timezone Invariant:</span> All driver booking inquiries and scheduled checkouts for{' '}
              <span className="font-semibold">{selectedFacility.name}</span> will be resolved against the local timezone{' '}
              <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300">
                {selectedFacility.timezone}
              </span>
              . Overnight intervals that cross midnight are calculated authoritatively by the backend engine.
            </div>
          </div>
        )}

        {/* 7-Day Weekly Schedule Grid */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Weekly Operating Windows
            </h2>
            <div className="text-xs text-slate-500 font-mono">
              7 Days Active Configuration
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {schedule.map((day, idx) => (
              <div
                key={day.dayOfWeek}
                className={`p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  day.isClosed ? 'bg-slate-50/60 opacity-75' : 'hover:bg-slate-50/40'
                }`}
              >
                <div className="w-36 shrink-0">
                  <div className="font-bold text-sm text-slate-900">
                    {DAY_NAMES[day.dayOfWeek]}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Day #{day.dayOfWeek}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap flex-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                    <input
                      type="checkbox"
                      checked={day.isClosed}
                      onChange={(e) => handleDayChange(idx, 'isClosed', e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className={day.isClosed ? 'font-bold text-red-700' : 'text-slate-600'}>
                      {day.isClosed ? 'Closed All Day' : 'Open for Bookings'}
                    </span>
                  </label>

                  {!day.isClosed && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-slate-500">Opens:</span>
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={(e) => handleDayChange(idx, 'openTime', e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 font-mono text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <span className="text-slate-400 font-mono">&rarr;</span>

                      <div className="flex items-center gap-1.5 text-xs">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-slate-500">Closes:</span>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={(e) => handleDayChange(idx, 'closeTime', e.target.value)}
                          className="px-2 py-1 rounded border border-slate-300 font-mono text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {day.isOvernight && (
                        <Badge variant="warning" className="text-[10px]">
                          Crosses Midnight (+1 Day)
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {day.isClosed ? (
                    <span className="text-red-700 font-mono text-xs font-semibold bg-red-50 px-2 py-1 rounded border border-red-200">
                      CLOSED
                    </span>
                  ) : (
                    <span className="text-emerald-800 font-mono text-xs font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      {day.openTime} – {day.closeTime}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
