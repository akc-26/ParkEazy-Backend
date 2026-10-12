import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  facilityId?: string;
  spaceId?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  initialStartsAt?: string;
  initialEndsAt?: string;
}

export function SelectParkingDateDurationPage({
  facilityId = '10000000-0000-4000-b000-000000000104',
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  currentUser: _currentUser,
  onNavigate,
  initialStartsAt,
  initialEndsAt: _initialEndsAt,
}: Props) {
  const { tenant } = useBrand();

  const now = new Date();
  const defaultStartDate = initialStartsAt
    ? new Date(initialStartsAt).toISOString().split('T')[0]
    : new Date(now.getTime() + 30 * 60 * 1000).toISOString().split('T')[0];

  const [date, setDate] = useState(defaultStartDate);
  const [startHour, setStartHour] = useState('10');
  const [startMinute, setStartMinute] = useState('00');
  const [durationHours, setDurationHours] = useState(3);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Quick preset handlers
  const handlePresetNow = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    setDate(d.toISOString().split('T')[0]);
    setStartHour(String(d.getHours()).padStart(2, '0'));
    setStartMinute(d.getMinutes() < 30 ? '30' : '00');
    setDurationHours(2);
    setValidationError(null);
  };

  const handlePresetTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
    setStartHour('09');
    setStartMinute('00');
    setDurationHours(4);
    setValidationError(null);
  };

  const handleContinue = () => {
    const scheduledStart = new Date(`${date}T${startHour}:${startMinute}:00Z`);
    const nowMs = Date.now();

    // Policy Rule 1: Minimum arrival lead time 15 minutes
    if (scheduledStart.getTime() < nowMs + 14 * 60 * 1000) {
      setValidationError('Arrival time must be at least 15 minutes in advance from now.');
      return;
    }

    // Policy Rule 2: Advance booking horizon max 30 days
    const maxHorizonMs = nowMs + 30 * 24 * 60 * 60 * 1000;
    if (scheduledStart.getTime() > maxHorizonMs) {
      setValidationError('Reservations can only be made up to 30 days in advance.');
      return;
    }

    // Policy Rule 3: Minimum booking duration 1 hour, Max 72 hours
    if (durationHours < 1 || durationHours > 72) {
      setValidationError('Booking duration must be between 1 hour and 72 continuous hours.');
      return;
    }

    const startsAt = scheduledStart.toISOString();
    const endsAt = new Date(scheduledStart.getTime() + durationHours * 3600000).toISOString();

    onNavigate(
      `/book/spaces?facilityId=${facilityId}&spaceId=${spaceId}&startsAt=${encodeURIComponent(
        startsAt
      )}&endsAt=${encodeURIComponent(endsAt)}`
    );
  };

  const calculatedEnd = new Date(
    new Date(`${date}T${startHour}:${startMinute}:00Z`).getTime() + durationHours * 3600000
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/spaces/${facilityId}`)}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Facility
          </button>
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_04_02
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            When do you need parking?
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Specify your arrival window and continuous stay duration. Real-time availability adapts instantly.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handlePresetNow}
            className="px-4 py-2 rounded-xl bg-white border border-[#E4E7EC] hover:border-[#0F766E] text-xs font-semibold text-[#141B2C] flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>⚡</span>
            <span>Now / Next 15 mins (Instant gate sync)</span>
          </button>
          <button
            onClick={handlePresetTomorrow}
            className="px-4 py-2 rounded-xl bg-white border border-[#E4E7EC] hover:border-[#0F766E] text-xs font-semibold text-[#141B2C] flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>🌅</span>
            <span>Tomorrow Morning (09:00 - 13:00)</span>
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
              Select Arrival Date
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setDate(e.target.value);
                setValidationError(null);
              }}
              className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
            />
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Arrival Hour
              </label>
              <select
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const val = String(i).padStart(2, '0');
                  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Minute (30m increments)
              </label>
              <select
                value={startMinute}
                onChange={(e) => setStartMinute(e.target.value)}
                className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              >
                <option value="00">:00</option>
                <option value="30">:30</option>
              </select>
            </div>
          </div>

          {/* Duration Slider & Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#344054] uppercase tracking-wider">
                Booking Duration: <span className="text-[#0F766E] font-extrabold">{durationHours} Hours</span>
              </label>
              <span className="text-xs text-[#667085]">Max 72 hours continuous</span>
            </div>

            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={durationHours > 24 ? 24 : durationHours}
              onChange={(e) => {
                setDurationHours(Number(e.target.value));
                setValidationError(null);
              }}
              className="w-full accent-[#0F766E] cursor-pointer"
            />

            <div className="flex flex-wrap gap-2 mt-3">
              {[1, 2, 3, 4, 6, 8, 12, 24, 48].map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setDurationHours(h);
                    setValidationError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    durationHours === h
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#475467] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {h} {h === 1 ? 'hr' : 'hrs'}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Window Preview Card */}
          <div className="bg-[#E6F7F4] border border-[#BCE8E0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#0F766E]">
            <div>
              <div className="font-bold text-sm">
                Window: {date} @ {startHour}:{startMinute} → Departure: {calculatedEnd.toISOString().slice(11, 16)} UTC
              </div>
              <div className="text-[11px] text-[#006B5F] mt-0.5">
                Includes mandatory 15-minute inter-booking turnaround buffer to avoid arrival collisions.
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold">Estimated Fare:</span>
              <div className="text-lg font-extrabold font-['Plus_Jakarta_Sans']">
                ₹{(40 * durationHours * 1.357).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            onClick={handleContinue}
            className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue to Space Selection</span>
            <span>→</span>
          </button>
        </div>
      </main>
    </div>
  );
}
