import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Car,
  Zap,
  Filter,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Lock,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  CalendarEvent,
  SpaceAvailabilitySummary,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostAvailabilityOverviewViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostAvailabilityOverviewView: React.FC<HostAvailabilityOverviewViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [selectedBayId, setSelectedBayId] = useState<string>('');

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availabilitySummary, setAvailabilitySummary] = useState<SpaceAvailabilitySummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Load calendar events and space availability
  const loadCalendarData = useCallback(async () => {
    if (!selectedFacilityId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Calculate date window based on viewMode
      const start = new Date(currentDate);
      const end = new Date(currentDate);

      if (viewMode === 'day') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (viewMode === 'week') {
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }

      const [eventsData, summaryData, baysData] = await Promise.all([
        apiClient.getCalendarEvents(
          hostId,
          selectedFacilityId,
          start.toISOString(),
          end.toISOString(),
          selectedBayId || undefined
        ),
        apiClient.getSpaceAvailability(
          hostId,
          selectedFacilityId,
          start.toISOString(),
          end.toISOString(),
          selectedBayId || undefined
        ),
        apiClient.getHostFacilityBays(selectedFacilityId, hostId),
      ]);

      setEvents(eventsData);
      setAvailabilitySummary(summaryData);
      setBays(baysData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load availability calendar.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId, selectedBayId, currentDate, viewMode]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handlePrevDate = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() - 1);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextDate = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() + 1);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  // Group events by day for week view
  const getDaysArray = () => {
    const days: Date[] = [];
    if (viewMode === 'day') {
      days.push(new Date(currentDate));
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
    } else {
      // Month: days of current month
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }
    }
    return days;
  };

  const daysList = getDaysArray();

  return (
    <div
      data-screen-id="pe_hw_04_01"
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
        currentPath="/host/availability"
        onNavigate={onNavigate}
        activeModule="availability"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Title and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Host Portal</span>
              <span>/</span>
              <span>Availability &amp; Calendar</span>
              <span>/</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                pe_hw_04_01
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Availability &amp; Master Reservation Calendar
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Live schedule of confirmed customer bookings, 10-minute hold locks, closures, and maintenance blocks.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/host/availability/schedule')}
              className="text-xs"
            >
              Recurring Schedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/host/availability/blocks')}
              className="text-xs flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              themeContext="host"
              onClick={() => onNavigate('/host/pricing/closures')}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Closure</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter Strip: Facility, Bay, Date Nav, View Toggle */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label htmlFor="avail-facility-select" className="text-slate-500 font-medium">Facility:</label>
              <select
                id="avail-facility-select"
                value={selectedFacilityId}
                onChange={(e) => {
                  setSelectedFacilityId(e.target.value);
                  setSelectedBayId('');
                }}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.address.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Layers className="w-4 h-4 text-slate-400" />
              <label htmlFor="avail-bay-select" className="text-slate-500 font-medium">Bay Filter:</label>
              <select
                id="avail-bay-select"
                value={selectedBayId}
                onChange={(e) => setSelectedBayId(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">All Spaces ({bays.length})</option>
                {bays.map((bay) => (
                  <option key={bay.id} value={bay.id}>
                    Bay {bay.bayNumber} ({bay.bayType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Navigation & View Mode */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={handlePrevDate}
                className="p-1 text-slate-600 hover:text-slate-900 rounded"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white rounded shadow-2xs"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextDate}
                className="p-1 text-slate-600 hover:text-slate-900 rounded"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="font-bold text-slate-800 text-xs font-mono">
              {currentDate.toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
                day: viewMode === 'day' ? 'numeric' : undefined,
              })}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'day' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'week' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'month' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Space Inventory Status Ticker */}
        {availabilitySummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Available Spaces</span>
                <span className="font-mono text-lg font-bold text-emerald-700">
                  {availabilitySummary.availableSpacesCount}
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Confirmed Booked</span>
                <span className="font-mono text-lg font-bold text-blue-700">
                  {availabilitySummary.occupiedSpacesCount}
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Temporary Holds</span>
                <span className="font-mono text-lg font-bold text-amber-700">
                  {availabilitySummary.heldSpacesCount}
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-50"></div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Maintenance / Closed</span>
                <span className="font-mono text-lg font-bold text-slate-700">
                  {availabilitySummary.blockedSpacesCount}
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-slate-100"></div>
            </div>
          </div>
        )}

        {/* Calendar Grid Representation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Legend */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-100 border border-blue-400 block"></span>
                <span>Confirmed Reservation (Protected)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 block"></span>
                <span>Active 10m Hold Lock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-purple-100 border border-purple-400 block"></span>
                <span>Maintenance Block</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 block"></span>
                <span>Closure</span>
              </div>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              {events.length} Events in active view window
            </div>
          </div>

          {/* Days Grid */}
          <div className={`grid ${viewMode === 'day' ? 'grid-cols-1' : viewMode === 'week' ? 'grid-cols-1 md:grid-cols-7' : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7'} divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[420px]`}>
            {daysList.map((dayDate, idx) => {
              const dayIso = dayDate.toISOString().substring(0, 10);
              const dayEvents = events.filter((e) => {
                const eventStart = e.startTimeUtc.substring(0, 10);
                const eventEnd = e.endTimeUtc.substring(0, 10);
                return dayIso >= eventStart && dayIso <= eventEnd;
              });

              const isToday = new Date().toISOString().substring(0, 10) === dayIso;

              return (
                <div
                  key={idx}
                  className={`p-3 flex flex-col justify-between ${
                    isToday ? 'bg-emerald-50/20' : 'bg-white'
                  }`}
                >
                  <div className="pb-2 border-b border-slate-100/80 mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-700">
                        {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                      <div className={`text-xs font-mono font-bold ${isToday ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {dayDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                      </div>
                    </div>
                    {isToday && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-2 flex-1 min-h-[140px]">
                    {dayEvents.length === 0 ? (
                      <div className="text-[11px] text-slate-300 italic pt-4 text-center">
                        All bays available
                      </div>
                    ) : (
                      dayEvents.map((evt) => {
                        const isBooking = evt.eventType === 'CONFIRMED_BOOKING';
                        const isHold = evt.eventType === 'ACTIVE_HOLD';
                        const isBlock = evt.eventType === 'MAINTENANCE_BLOCK';

                        return (
                          <div
                            key={evt.id}
                            className={`p-2 rounded-lg border text-[11px] space-y-1 shadow-2xs transition-all ${
                              isBooking
                                ? 'bg-blue-50/90 border-blue-200 text-blue-950'
                                : isHold
                                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                                : isBlock
                                ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                                : 'bg-rose-50/90 border-rose-200 text-rose-950'
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="truncate">{evt.title}</span>
                              {isBooking && <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                              {isHold && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                              {isBlock && <Wrench className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                            </div>

                            <div className="text-[10px] opacity-80 font-mono">
                              {new Date(evt.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {' '}&rarr;{' '}
                              {new Date(evt.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>

                            {evt.customerName && (
                              <div className="text-[10px] text-blue-800">
                                Driver: <strong>{evt.customerName}</strong>
                              </div>
                            )}

                            {evt.licensePlate && (
                              <div className="font-mono text-[9px] bg-white/80 px-1 py-0.5 rounded inline-block">
                                {evt.licensePlate}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
