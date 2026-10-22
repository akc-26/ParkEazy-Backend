import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

interface DaySchedule {
  dayName: string;
  isOpen: boolean;
  is24x7: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_WEEK: DaySchedule[] = [
  { dayName: 'Monday', isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Tuesday', isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Wednesday', isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Thursday', isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:00' },
  { dayName: 'Friday', isOpen: true, is24x7: false, openTime: '06:00', closeTime: '23:30' },
  { dayName: 'Saturday', isOpen: true, is24x7: true, openTime: '00:00', closeTime: '23:59' },
  { dayName: 'Sunday', isOpen: true, is24x7: true, openTime: '00:00', closeTime: '23:59' },
];

export function OperatingHoursWeeklySchedulePage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_WEEK);
  const [allowOvernight, setAllowOvernight] = useState(true);
  const [barrierAutoSync, setBarrierAutoSync] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    alert(`Applied ${template.dayName} schedule to all 7 days.`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Operating schedule saved locally. This schedule has not been synchronized with gate barriers or booking availability.');
    }, 400);
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
              <span className="text-[#0F766E]">Operating Hours (pe_hw_03_03)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Facility Operating Hours & Weekly Schedule
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                Indian Standard Time (IST)
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Define recurring hours of operation, open shifts, night access locks, and entry gate accessibility across the week.
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
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            {successMsg}
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
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
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
                <strong>Timezone:</strong> IST (UTC+05:30). Day boundaries reset at 00:00 midnight without daylight saving deviations.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
