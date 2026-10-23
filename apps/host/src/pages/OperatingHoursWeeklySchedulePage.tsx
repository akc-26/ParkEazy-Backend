import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, OperatingSchedule } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { validateOperatingSchedules, validateTimezone } from '@parkeazy/validation';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

interface DaySchedule {
  dayName: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  isOpen: boolean;
  is24x7: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_WEEK: DaySchedule[] = [
  { dayName: 'Monday', dayOfWeek: 1, isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Tuesday', dayOfWeek: 2, isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Wednesday', dayOfWeek: 3, isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Thursday', dayOfWeek: 4, isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Friday', dayOfWeek: 5, isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:30' },
  { dayName: 'Saturday', dayOfWeek: 6, isOpen: true, is24x7: true, openTime: '00:00', closeTime: '23:59' },
  { dayName: 'Sunday', dayOfWeek: 7, isOpen: true, is24x7: true, openTime: '00:00', closeTime: '23:59' },
];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC'
];

export function OperatingHoursWeeklySchedulePage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_WEEK);
  const [timezone, setTimezone] = useState<string>('America/Los_Angeles');
  const [allowOvernight, setAllowOvernight] = useState(true);
  const [barrierAutoSync, setBarrierAutoSync] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    if (selectedFacilityId) {
      loadFacilitySchedule(selectedFacilityId);
    }
  }, [selectedFacilityId]);

  const loadFacilities = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.facilities.list();
      setFacilities(data);
      if (data.length > 0) {
        setSelectedFacilityId(data[0].id);
        if (data[0].timezone) {
          setTimezone(data[0].timezone);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load parking facilities.');
    } finally {
      setLoading(false);
    }
  };

  const loadFacilitySchedule = async (facilityId: string) => {
    try {
      const fac = facilities.find(f => f.id === facilityId);
      if (fac?.timezone) {
        setTimezone(fac.timezone);
      }
      const existing = await apiClient.facilities.getOperatingHours(facilityId);
      if (existing && existing.length > 0) {
        // Map from server OperatingSchedule records into our 7-day structure
        const mapped = DEFAULT_WEEK.map(template => {
          const found = existing.find(s => s.dayOfWeek === template.dayOfWeek);
          if (found) {
            const is24 = found.openTime === '00:00' && (found.closeTime === '23:59' || found.closeTime === '24:00');
            return {
              ...template,
              isOpen: !found.isClosed,
              is24x7: is24,
              openTime: found.openTime || '06:00',
              closeTime: found.closeTime || '23:00',
            };
          }
          return template;
        });
        setSchedule(mapped);
      }
    } catch (err: any) {
      // Keep default week if no schedules yet
    }
  };

  const handleToggleDay = (idx: number) => {
    setSchedule(
      schedule.map((d, i) => (i === idx ? { ...d, isOpen: !d.isOpen } : d))
    );
  };

  const handleToggle24x7 = (idx: number) => {
    setSchedule(
      schedule.map((d, i) =>
        i === idx
          ? {
              ...d,
              is24x7: !d.is24x7,
              openTime: !d.is24x7 ? '00:00' : '06:00',
              closeTime: !d.is24x7 ? '23:59' : '23:00',
            }
          : d
      )
    );
  };

  const handleTimeChange = (idx: number, field: 'openTime' | 'closeTime', val: string) => {
    setSchedule(
      schedule.map((d, i) => (i === idx ? { ...d, [field]: val } : d))
    );
  };

  const handleApplyToAll = (idx: number) => {
    const template = schedule[idx];
    setSchedule(
      schedule.map((d) => ({
        ...d,
        isOpen: template.isOpen,
        is24x7: template.is24x7,
        openTime: template.openTime,
        closeTime: template.closeTime,
      }))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId) {
      setErrorMsg('Please select a facility to configure operating hours.');
      return;
    }

    // Validate timezone
    const tzCheck = validateTimezone(timezone);
    if (!tzCheck.success) {
      setErrorMsg(tzCheck.errors[0] || 'Invalid facility timezone identifier.');
      return;
    }

    // Build payload
    const payload: OperatingSchedule[] = schedule.map(d => ({
      facilityId: selectedFacilityId,
      dayOfWeek: d.dayOfWeek,
      openTime: d.openTime,
      closeTime: d.closeTime,
      isClosed: !d.isOpen,
      isOvernight: allowOvernight && d.closeTime < d.openTime
    }));

    // Validate schedules
    const schedCheck = validateOperatingSchedules(payload);
    if (!schedCheck.success) {
      setErrorMsg(schedCheck.errors[0] || 'Invalid operating schedule values.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiClient.facilities.update(selectedFacilityId, { timezone });
      await apiClient.facilities.updateOperatingHours(selectedFacilityId, payload);
      setSuccessMsg('Operating hours and timezone saved successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save operating schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/pricing')} className="hover:underline">Tariffs</button>
              <span>/</span>
              <span className="text-[#0F766E]">Operating Hours (Section 3B)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Facility Operating Hours & Weekly Schedule
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                {timezone}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Define recurring hours of operation, open shifts, overnight stays, and entrance gate accessibility across the week.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/pricing')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Tariffs Overview
            </button>
            <button
              onClick={() => onNavigate('/host/pricing/closures')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Date Closures →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {/* Facility Selector & Timezone Bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-[#141B2C] shrink-0">Facility:</label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full sm:w-72 px-3 py-1.5 text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.city || 'Facility'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-[#141B2C] shrink-0">Timezone (IANA):</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full sm:w-60 px-3 py-1.5 text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none font-mono"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-semibold text-[#991B1B]">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            ✓ {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLS: SCHEDULE TABLE */}
          <form onSubmit={handleSave} className="lg:col-span-8 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                7-Day Weekly Shift Matrix
              </h2>
              <span className="text-xs text-[#64748B]">Auto-gate locking armed</span>
            </div>

            <div className="space-y-3">
              {schedule.map((day, idx) => (
                <div
                  key={day.dayName}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    day.isOpen
                      ? 'border-[#E2E8F0] bg-white'
                      : 'border-[#CBD5E1] bg-[#F8FAFC] opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:w-36">
                    <input
                      type="checkbox"
                      checked={day.isOpen}
                      onChange={() => handleToggleDay(idx)}
                      className="accent-[#0F766E] w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-[#141B2C]">{day.dayName}</span>
                      <div className="text-[10px] text-[#64748B]">
                        {day.isOpen ? (day.is24x7 ? '24 Hours' : 'Shift Mode') : 'Closed'}
                      </div>
                    </div>
                  </div>

                  {day.isOpen ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          disabled={day.is24x7}
                          value={day.openTime}
                          onChange={(e) => handleTimeChange(idx, 'openTime', e.target.value)}
                          className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded-lg outline-none font-mono disabled:bg-slate-100"
                        />
                        <span className="text-xs text-[#94A3B8]">to</span>
                        <input
                          type="time"
                          disabled={day.is24x7}
                          value={day.closeTime}
                          onChange={(e) => handleTimeChange(idx, 'closeTime', e.target.value)}
                          className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded-lg outline-none font-mono disabled:bg-slate-100"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-[#334155] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.is24x7}
                          onChange={() => handleToggle24x7(idx)}
                          className="accent-[#0F766E] w-3.5 h-3.5"
                        />
                        <span>24x7</span>
                      </label>
                    </div>
                  ) : (
                    <div className="text-xs text-[#D92D20] font-semibold italic">
                      Facility Closed — No Motorist Ingress Allowed
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleApplyToAll(idx)}
                    className="text-[11px] text-[#0F766E] hover:underline font-semibold ml-auto"
                  >
                    Copy to all
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button
                type="submit"
                disabled={saving || loading}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Syncing...' : '💾 Save Weekly Operating Schedule'}
              </button>
            </div>
          </form>

          {/* RIGHT 4 COLS: PROTOCOLS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>🛡️</span>
                <span>Gate Hardware & Night Rules</span>
              </h3>

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowOvernight}
                    onChange={(e) => setAllowOvernight(e.target.checked)}
                    className="accent-[#0F766E] w-4 h-4 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-[#141B2C]">Allow Overnight Stays</div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">
                      Vehicles that entered before closing can remain parked through the night.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={barrierAutoSync}
                    onChange={(e) => setBarrierAutoSync(e.target.checked)}
                    className="accent-[#0F766E] w-4 h-4 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-[#141B2C]">ANPR Barrier Sync</div>
                    <div className="text-[#64748B] text-[11px] mt-0.5">
                      Boom barriers automatically reject inbound cars during non-operational hours.
                    </div>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1] text-xs text-[#0F766E]">
                <strong>Timezone:</strong> {timezone}. Day boundaries and overnight rollover calculations are evaluated in this timezone without UTC drift.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
