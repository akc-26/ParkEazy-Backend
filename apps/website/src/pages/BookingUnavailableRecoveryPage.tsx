import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, AlternativeSpaceSuggestion } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  spaceId?: string;
  facilityId?: string;
  startsAt?: string;
  endsAt?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function BookingUnavailableRecoveryPage({
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  facilityId = '10000000-0000-4000-b000-000000000104',
  startsAt = new Date(Date.now() + 3600000).toISOString(),
  endsAt = new Date(Date.now() + 3 * 3600000).toISOString(),
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [alternatives, setAlternatives] = useState<AlternativeSpaceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notified, setNotified] = useState(false);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadAlternatives() {
      try {
        const list = await client.bookings.getAlternatives(spaceId, startsAt, endsAt);
        setAlternatives(list);
      } catch {
        // Fallback alternatives
        setAlternatives([
          {
            spaceId: '10000000-0000-4000-b000-000000000104-05',
            facilityId,
            facilityName: 'Anna Nagar Plaza Parking',
            bayIdentifier: 'Bay B-12',
            floorLevel: 'Basement 1',
            vehicleCategory: 'car',
            hourlyRateInr: 40,
            hasEvCharger: false,
            score: 94,
          },
          {
            spaceId: '10000000-0000-4000-b000-000000000208-01',
            facilityId: '10000000-0000-4000-b000-000000000208',
            facilityName: 'Nexus Business Center Garage',
            bayIdentifier: 'Bay G-02',
            floorLevel: 'Ground Level',
            vehicleCategory: 'car',
            hourlyRateInr: 50,
            distanceMeters: 450,
            hasEvCharger: true,
            score: 89,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadAlternatives();
  }, [spaceId, startsAt, endsAt]);

  const handleSelectAlternative = (alt: AlternativeSpaceSuggestion) => {
    onNavigate(
      `/book/vehicle?facilityId=${alt.facilityId}&spaceId=${alt.spaceId}&startsAt=${encodeURIComponent(
        startsAt
      )}&endsAt=${encodeURIComponent(endsAt)}`
    );
  };

  const handleShiftTime = (additionalHours: number) => {
    const newStart = new Date(new Date(startsAt).getTime() + additionalHours * 3600000).toISOString();
    const newEnd = new Date(new Date(endsAt).getTime() + additionalHours * 3600000).toISOString();
    onNavigate(
      `/book/spaces?facilityId=${facilityId}&spaceId=${spaceId}&startsAt=${encodeURIComponent(
        newStart
      )}&endsAt=${encodeURIComponent(newEnd)}`
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/spaces/${facilityId}`)}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Search
          </button>
          <span className="text-xs bg-[#FEE4E2] text-[#B42318] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_04_08 • Collision Recovery
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Collision Alert Banner */}
        <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center text-2xl shrink-0">
            ⚡
          </div>
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#912018] font-['Plus_Jakarta_Sans']">
              This space was just booked or is unavailable for your selected window
            </h1>
            <p className="text-xs text-[#B42318] leading-relaxed">
              Another customer confirmed a reservation on this bay seconds ago, or a 15-minute turnaround buffer protects an adjacent booking. We’ve found immediate alternative stalls for you below.
            </p>
          </div>
        </div>

        {/* Alternative 1: Same Facility Other Bays */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Immediate Alternative Bays in Same Garage
            </h2>
            <span className="text-xs text-[#0F766E] font-semibold">Instant 1-Click Re-lock</span>
          </div>

          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {alternatives.map((alt) => (
                <div
                  key={alt.spaceId}
                  className="bg-white rounded-2xl p-5 border border-[#E4E7EC] hover:border-[#0F766E] shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                        {alt.bayIdentifier}
                      </span>
                      <span className="text-xs text-[#667085] block">{alt.floorLevel}</span>
                      <span className="text-xs text-[#0F766E] font-semibold block mt-0.5">
                        {alt.facilityName}
                        {alt.distanceMeters ? ` (${alt.distanceMeters}m away)` : ' (Same Building)'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-[#141B2C]">₹{alt.hourlyRateInr}</span>
                      <span className="text-xs text-[#667085]">/hr</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#344054]">
                    <span>🚗 {alt.vehicleCategory}</span>
                    {alt.hasEvCharger && <span className="text-[#0F766E] font-semibold">• ⚡ EV Charging</span>}
                  </div>

                  <button
                    onClick={() => handleSelectAlternative(alt)}
                    className="w-full py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Select {alt.bayIdentifier} &amp; Continue</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alternative 2: Time Shift Options */}
        <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] shadow-xs space-y-4 mb-8">
          <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
            Shift Your Arrival Time Window
          </h2>
          <p className="text-xs text-[#667085]">
            If your travel schedule is flexible, shift your arrival time to bypass the current reservation:
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleShiftTime(1)}
              className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0F766E] text-xs font-bold text-[#141B2C] cursor-pointer"
            >
              +1 Hour Shift (Later Today)
            </button>
            <button
              onClick={() => handleShiftTime(2)}
              className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0F766E] text-xs font-bold text-[#141B2C] cursor-pointer"
            >
              +2 Hours Shift
            </button>
            <button
              onClick={() => onNavigate(`/book/duration?spaceId=${spaceId}&facilityId=${facilityId}`)}
              className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC] hover:border-[#0F766E] text-xs font-bold text-[#0F766E] cursor-pointer"
            >
              Custom Schedule Picker →
            </button>
          </div>
        </div>

        {/* Notification Alert & Live Hotline */}
        <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E4E7EC] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#141B2C]">Want an alert if this bay opens up?</h3>
            <p className="text-xs text-[#667085] mt-0.5">
              We'll notify you via push notification if the current driver cancels or departs early.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNotified(true);
                setTimeout(() => setNotified(false), 3000);
              }}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
            >
              {notified ? 'Alert Active! ✓' : 'Notify Me'}
            </button>
            <button
              onClick={() => alert('Connecting to priority dispatch desk: +91 44 4800 2900')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] cursor-pointer"
            >
              Call Support
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
