import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingSpace } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId?: string;
  spaceId?: string;
  startsAt?: string;
  endsAt?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function AvailabilitySpaceSelectionPage({
  facilityId = '10000000-0000-4000-b000-000000000104',
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  startsAt = new Date(Date.now() + 3600000).toISOString(),
  endsAt = new Date(Date.now() + 3 * 3600000).toISOString(),
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(spaceId);
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterEvOnly, setFilterEvOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadSpaces() {
      setLoading(true);
      try {
        const list = await client.facilities.getSpaces(facilityId);
        setSpaces(list);
        if (list.length > 0 && !list.some((s) => s.id === selectedSpaceId)) {
          setSelectedSpaceId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load spaces:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSpaces();
  }, [facilityId]);

  const filteredSpaces = spaces.filter((s) => {
    if (filterFloor !== 'all' && s.floorLevel !== filterFloor) return false;
    if (filterEvOnly && !s.hasEvCharger) return false;
    return true;
  });

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) || spaces[0];

  const handleContinue = () => {
    onNavigate(
      `/book/vehicle?facilityId=${facilityId}&spaceId=${selectedSpaceId}&startsAt=${encodeURIComponent(
        startsAt
      )}&endsAt=${encodeURIComponent(endsAt)}`
    );
  };

  const startFormatted = new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endFormatted = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() =>
              onNavigate(
                `/book/duration?facilityId=${facilityId}&spaceId=${selectedSpaceId}&startsAt=${encodeURIComponent(
                  startsAt
                )}&endsAt=${encodeURIComponent(endsAt)}`
              )
            }
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Schedule
          </button>
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_04_03
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Schedule Context Banner */}
        <div className="bg-[#E6F7F4] border border-[#BCE8E0] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F766E]">
              <span>⏱️ Active Selection Window</span>
              <span>•</span>
              <span>15m Turnaround Buffer Protected</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-[#141B2C] mt-0.5 font-['Plus_Jakarta_Sans']">
              {new Date(startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {startFormatted} — {endFormatted}
            </div>
          </div>
          <button
            onClick={() =>
              onNavigate(
                `/book/duration?facilityId=${facilityId}&spaceId=${selectedSpaceId}&startsAt=${encodeURIComponent(
                  startsAt
                )}&endsAt=${encodeURIComponent(endsAt)}`
              )
            }
            className="px-3.5 py-2 bg-white text-[#0F766E] border border-[#BCE8E0] rounded-xl text-xs font-bold shadow-xs hover:bg-[#F8FAFC] self-start sm:self-auto cursor-pointer"
          >
            Modify Schedule
          </button>
        </div>

        {/* Section Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
              Available Spaces for Your Booking Window
            </h1>
            <p className="text-xs text-[#667085] mt-1">
              Select your preferred parking bay. Real-time slot status reflects guaranteed turnaround clearances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white outline-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="Ground">Ground Level</option>
              <option value="Basement 1">Basement 1</option>
              <option value="Basement 2">Basement 2</option>
            </select>

            <button
              onClick={() => setFilterEvOnly(!filterEvOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterEvOnly
                  ? 'bg-[#0F766E] text-white border-[#0F766E]'
                  : 'bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F1F5F9]'
              }`}
            >
              ⚡ EV Chargers Only
            </button>
          </div>
        </div>

        {/* Bay Grid */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredSpaces.map((space) => {
              const isSelected = space.id === selectedSpaceId;
              const isOccupied = space.status === 'occupied';

              return (
                <div
                  key={space.id}
                  onClick={() => !isOccupied && setSelectedSpaceId(space.id)}
                  className={`rounded-2xl p-5 border transition-all cursor-pointer relative ${
                    isOccupied
                      ? 'bg-[#F8FAFC] border-[#E4E7EC] opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#E6F7F4]/40 border-[#0F766E] ring-2 ring-[#0F766E] shadow-sm'
                      : 'bg-white border-[#E4E7EC] hover:border-[#0F766E]/50 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-lg font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                        {space.bayIdentifier}
                      </span>
                      <span className="block text-xs font-semibold text-[#667085]">
                        {space.floorLevel}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-[#F2F4F7] text-[#667085]'
                          : isSelected
                          ? 'bg-[#0F766E] text-white'
                          : 'bg-[#E6F7F4] text-[#0F766E]'
                      }`}
                    >
                      {isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#344054] mb-4">
                    <div className="flex items-center gap-1.5">
                      <span>🚗</span>
                      <span>Category: <strong className="capitalize">{space.vehicleCategory}</strong></span>
                    </div>
                    {space.hasEvCharger && (
                      <div className="flex items-center gap-1.5 text-[#0F766E] font-semibold">
                        <span>⚡</span>
                        <span>EV Fast Charger ({space.evChargerPowerKw || 22} kW)</span>
                      </div>
                    )}
                    {space.isDisabledAccessible && (
                      <div className="flex items-center gap-1.5 text-[#344054]">
                        <span>♿</span>
                        <span>Disabled Accessible Stall</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs">
                    <span className="text-[#667085]">Rate:</span>
                    <span className="font-extrabold text-[#141B2C] text-sm">
                      ₹{space.hourlyRateInr}/hr
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Floating Bar */}
        <div className="sticky bottom-4 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#667085]">Selected Stall</div>
            <div className="text-base sm:text-lg font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              {selectedSpace ? `${selectedSpace.bayIdentifier} (${selectedSpace.floorLevel})` : 'Select a bay'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!selectedSpace || selectedSpace.status === 'occupied'}
              onClick={handleContinue}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-[#CBD5E1] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Driver Details</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
