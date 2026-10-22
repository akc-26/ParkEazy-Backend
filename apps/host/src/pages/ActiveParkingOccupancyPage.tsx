import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function ActiveParkingOccupancyPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBay, setSelectedBay] = useState<any | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    apiClient.host.getOccupancy()
      .then((data) => setOccupancyData(data))
      .catch(() => setOccupancyData([]))
      .finally(() => setLoading(false));
  }, []);

  // Floor bays simulation grid (24 spots)
  const bays = Array.from({ length: 24 }).map((_, i) => {
    const isOccupied = i < 18;
    const isEv = i % 4 === 0;
    const identifier = `Bay ${String.fromCharCode(65 + Math.floor(i / 6))}-${(i % 6) + 1}`;
    return {
      id: `bay-${i + 1}`,
      identifier,
      isOccupied,
      isEv,
      plate: isOccupied ? `TN-09-CB-${4000 + i}` : null,
      driver: isOccupied ? (i % 2 === 0 ? 'Arun Kumar' : 'Suresh Babu') : null,
      elapsedMins: isOccupied ? 45 + (i * 7) : 0,
      durationMins: 120,
      isOverstay: isOccupied && i === 3, // Bay A-04 overstay
    };
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-08 • Live Bay Occupancy Map
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_05 • Spatial Occupancy Deck</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Active Parking Occupancy Map
            </h1>
            <p className="text-xs text-[#64748B]">
              Real-time floor layout with occupied/vacant bays, EV charge indicators, and overstay monitors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/gate/check-out')}
              className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
            >
              Departure Desk →
            </button>
            <button
              onClick={() => onNavigate('/host/gate/extensions')}
              className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC]"
            >
              Overstays & Extensions
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Legend */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#14B8A6]"></span>
              <span className="text-[#334155]">Occupied (18)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#E2E8F0]"></span>
              <span className="text-[#64748B]">Vacant / Open (6)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#DC2626] animate-pulse"></span>
              <span className="text-[#DC2626]">Overstay Violation (1)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">⚡</span>
              <span className="text-[#334155]">EV Fast Charger Active</span>
            </div>
          </div>

          <div className="text-xs text-[#64748B]">
            Sensors: Ultrasound Ultrasonic In-Ground Telemetry
          </div>
        </div>

        {/* Spatial Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {bays.map((bay) => (
            <div
              key={bay.id}
              onClick={() => setSelectedBay(bay)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                bay.isOverstay
                  ? 'bg-[#FEF2F2] border-[#FCA5A5] ring-2 ring-[#DC2626]'
                  : bay.isOccupied
                    ? 'bg-white border-[#CCFBF1] shadow-xs hover:border-[#0F766E]'
                    : 'bg-[#F8FAFC] border-dashed border-[#CBD5E1] hover:border-[#64748B]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-extrabold ${bay.isOverstay ? 'text-[#DC2626]' : 'text-[#101828]'}`}>
                  {bay.identifier}
                </span>
                {bay.isEv && <span className="text-xs">⚡</span>}
                <span className={`w-2.5 h-2.5 rounded-full ${
                  bay.isOverstay ? 'bg-[#DC2626] animate-pulse' : bay.isOccupied ? 'bg-[#14B8A6]' : 'bg-[#CBD5E1]'
                }`}></span>
              </div>

              {bay.isOccupied ? (
                <div className="text-xs">
                  <div className="font-mono font-bold text-[#101828] truncate">{bay.plate}</div>
                  <div className="text-[10px] text-[#64748B] truncate mt-0.5">{bay.driver}</div>
                  <div className="mt-2 text-[10px] text-[#0F766E] font-semibold">
                    {bay.isOverstay ? (
                      <span className="text-[#DC2626] font-bold">⚠️ OVERSTAY +24m</span>
                    ) : (
                      <span>Parked {bay.elapsedMins}m / {bay.durationMins}m</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#64748B] flex flex-col items-center justify-center py-2">
                  <span className="text-[11px] font-bold uppercase text-[#0F766E]">AVAILABLE</span>
                  <span className="text-[10px] text-[#94A3B8]">Instant Allocation</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selected Bay Modal / Drawer Preview */}
        {selectedBay && (
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-[#101828]">{selectedBay.identifier}</span>
                {selectedBay.isEv && <span className="text-xs bg-[#E6F7F4] text-[#0F766E] font-bold px-2 py-0.5 rounded">EV Stall</span>}
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  selectedBay.isOccupied ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}>
                  {selectedBay.isOccupied ? 'OCCUPIED' : 'VACANT'}
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                {selectedBay.isOccupied
                  ? `Vehicle: ${selectedBay.plate} • Driver: ${selectedBay.driver} • Duration: ${selectedBay.elapsedMins} mins`
                  : 'Ready for new arrivals or instant counter check-in.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedBay.isOccupied && (
                <button
                  onClick={() => onNavigate('/host/gate/check-out')}
                  className="px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-xs font-bold hover:bg-[#D97706]"
                >
                  Clear & Check-Out Bay
                </button>
              )}
              <button
                onClick={() => setSelectedBay(null)}
                className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
