import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  spaceId?: string;
  facilityId?: string;
}

export function BookingValidationExpiryStatesPage({
  currentUser: _currentUser,
  onNavigate,
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  facilityId = '10000000-0000-4000-b000-000000000104',
}: Props) {
  const { tenant } = useBrand();

  const [activeScenario, setActiveScenario] = useState<
    'hold_expired' | 'min_duration' | 'max_duration' | 'buffer_conflict' | 'vehicle_mismatch'
  >('hold_expired');

  const [holdCountdown, setHoldCountdown] = useState(0); // 0s remaining = expired
  const [resolvedNotice, setResolvedNotice] = useState<string | null>(null);

  const handleRenewHold = () => {
    setHoldCountdown(600); // 10 minutes reset
    setResolvedNotice('Ephemeral hold lease renewed for 10 minutes (TTL +600s). Inventory locked exclusively.');
    setTimeout(() => {
      onNavigate(`/book/review?spaceId=${spaceId}&facilityId=${facilityId}`);
    }, 1500);
  };

  const handleFixMinDuration = () => {
    setResolvedNotice('Booking duration rounded up to 1-Hour mandatory commercial minimum.');
    setTimeout(() => {
      onNavigate(`/book/duration?spaceId=${spaceId}&facilityId=${facilityId}`);
    }, 1500);
  };

  const handleFixMaxDuration = () => {
    setResolvedNotice('Booking duration adjusted to 72-Hour continuous stay ceiling.');
    setTimeout(() => {
      onNavigate(`/book/duration?spaceId=${spaceId}&facilityId=${facilityId}`);
    }, 1500);
  };

  const handleFixTurnaround = () => {
    setResolvedNotice('Arrival shifted by +15 minutes to respect departure turnaround buffer.');
    setTimeout(() => {
      onNavigate(`/book/spaces?spaceId=${spaceId}&facilityId=${facilityId}`);
    }, 1500);
  };

  const handleFixVehicleCategory = () => {
    setResolvedNotice('Matched to standard SUV stall (Bay B-04) with 2.4m clearance.');
    setTimeout(() => {
      onNavigate(`/book/spaces?spaceId=${spaceId}&facilityId=${facilityId}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Home
          </button>
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_04_09 • Integrity States
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Booking Integrity, Validation &amp; Expiry States
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Deterministic enforcement of mathematical concurrency bounds, duration limits, and hold TTL policies.
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'hold_expired', label: '1. Ephemeral Hold Expired', icon: '⏱️' },
            { id: 'min_duration', label: '2. Min Duration (< 1 Hr)', icon: '⏳' },
            { id: 'max_duration', label: '3. Max Stay (> 72 Hrs)', icon: '📅' },
            { id: 'buffer_conflict', label: '4. Turnaround Buffer (15m)', icon: '🛡️' },
            { id: 'vehicle_mismatch', label: '5. Vehicle Category Mismatch', icon: '🚗' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveScenario(tab.id as any);
                setResolvedNotice(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeScenario === tab.id
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-white text-[#475467] border border-[#E4E7EC] hover:bg-[#F8FAFC]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {resolvedNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-[#E6F7F4] border border-[#BCE8E0] text-xs font-bold text-[#0F766E] flex items-center gap-2">
            <span>✓</span>
            <span>{resolvedNotice}</span>
          </div>
        )}

        {/* Scenario 1: Hold Expired */}
        {activeScenario === 'hold_expired' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center text-2xl shrink-0">
                ⏳
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Your 10-Minute Reservation Hold Has Expired
                </h2>
                <p className="text-xs text-[#667085] leading-relaxed">
                  To prevent stalls from being blocked indefinitely by abandoned checkouts, ParkEazy releases inventory leases after 600 seconds. Bay A-04 has been returned to available status.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E4E7EC] text-xs text-[#344054] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Previous Hold TTL:</span>
                <span className="font-mono font-bold text-[#D92D20]">00:00 (Expired)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Stall Current Status:</span>
                <span className="font-semibold text-[#0F766E]">Currently Still Available</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleRenewHold}
                className="py-3 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄 Renew 10-Minute Hold Lease</span>
              </button>
              <button
                onClick={() => onNavigate(`/spaces/${facilityId}`)}
                className="py-3 px-6 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Choose Another Bay
              </button>
            </div>
          </div>
        )}

        {/* Scenario 2: Minimum Duration */}
        {activeScenario === 'min_duration' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF0C7] text-[#DC6803] flex items-center justify-center text-2xl shrink-0">
                ⚠️
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Minimum Booking Duration Requirement (1 Hour)
                </h2>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Requested duration was 30 minutes. ParkEazy's commercial policy specifies a minimum continuous stay of 1 hour (60 minutes) to cover barrier cycle and parking marshaling overhead.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E4E7EC] text-xs text-[#344054] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Requested Duration:</span>
                <span className="font-bold text-[#D92D20]">30 Minutes (Invalid)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Mandatory Minimum:</span>
                <span className="font-bold text-[#0F766E]">60 Minutes (1 Hour)</span>
              </div>
            </div>

            <button
              onClick={handleFixMinDuration}
              className="py-3 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Adjust to 1 Hour &amp; Recalculate
            </button>
          </div>
        )}

        {/* Scenario 3: Maximum Duration */}
        {activeScenario === 'max_duration' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF0C7] text-[#DC6803] flex items-center justify-center text-2xl shrink-0">
                🛑
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Maximum Continuous Stay Limit Exceeded (72 Hours)
                </h2>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Requested booking exceeds 72 continuous hours (3 days). To ensure commercial rotation and prevent vehicle abandonment, long-term stays above 72 hours require monthly lease agreements.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E4E7EC] text-xs text-[#344054] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Requested Continuous Stay:</span>
                <span className="font-bold text-[#D92D20]">96 Hours (4 Days)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Maximum Single Session Limit:</span>
                <span className="font-bold text-[#0F766E]">72 Hours</span>
              </div>
            </div>

            <button
              onClick={handleFixMaxDuration}
              className="py-3 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Clamp Duration to 72 Hours Max
            </button>
          </div>
        )}

        {/* Scenario 4: Turnaround Buffer Conflict */}
        {activeScenario === 'buffer_conflict' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center text-2xl shrink-0">
                🛡️
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Turnaround Buffer Collision (15 Minutes)
                </h2>
                <p className="text-xs text-[#667085] leading-relaxed">
                  A prior reservation on this bay departs at 10:00 AM. While the spot is physically unbooked at 10:05 AM, ParkEazy mandates a 15-minute buffer until 10:15 AM to accommodate gate congestion and vehicle exit.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E4E7EC] text-xs text-[#344054] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Prior Booking Departure:</span>
                <span className="font-bold text-[#141B2C]">10:00 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Buffer Window End:</span>
                <span className="font-bold text-[#0F766E]">10:15 AM (Earliest Available Arrival)</span>
              </div>
            </div>

            <button
              onClick={handleFixTurnaround}
              className="py-3 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Shift Start Time to 10:15 AM (+15m)
            </button>
          </div>
        )}

        {/* Scenario 5: Vehicle Category Mismatch */}
        {activeScenario === 'vehicle_mismatch' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF0C7] text-[#DC6803] flex items-center justify-center text-2xl shrink-0">
                🚙
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Dimensional / Vehicle Category Clearance Incompatibility
                </h2>
                <p className="text-xs text-[#667085] leading-relaxed">
                  Selected stall is classified as compact (bike/small hatchback, max height 1.8m). Your registered vehicle is an SUV (requires 2.4m clearance and 5.4m stall length).
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E4E7EC] text-xs text-[#344054] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Vehicle Category:</span>
                <span className="font-bold text-[#141B2C]">SUV (Height ~1.95m)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Stall Restriction:</span>
                <span className="font-bold text-[#D92D20]">Compact Stalls Only (&lt; 1.8m)</span>
              </div>
            </div>

            <button
              onClick={handleFixVehicleCategory}
              className="py-3 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Auto-Switch to SUV Wide Bay (Bay B-04)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
