import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function DepartureCheckOutOperationsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [activeSessions, setActiveSessions] = useState<BookingDetailsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailsResponse | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [departureSuccess, setDepartureSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadActive();
  }, []);

  const loadActive = async () => {
    setLoading(true);
    try {
      const data = await apiClient.host.getBookings();
      setActiveSessions(data.filter((b) => b.status === 'active' || (b.status as string) === 'ACTIVE' || b.status === 'confirmed' || (b.status as string) === 'CONFIRMED'));
    } catch {
      setActiveSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDeparture = async (id: string, plate?: string, bay?: string) => {
    setProcessingId(id);
    setErrorMsg(null);
    try {
      await apiClient.bookings.checkOut(id);
      setDepartureSuccess(`Vehicle ${plate || 'TN-09-CB-4821'} successfully vacated ${bay || 'Bay A-01'}. Exit barrier raised!`);
      await loadActive();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Check-out failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-08 • Departure & Check-Out
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_06 • Exit Gate Clearance</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Departure Check-Out Operations
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/gate/occupancy')}
            className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC]"
          >
            ← Occupancy Map
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {departureSuccess && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {departureSuccess}</span>
            <button onClick={() => setDepartureSuccess(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-[#FEE2E2] border border-[#FCA5A5] p-4 rounded-xl text-xs text-[#991B1B] font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
                Vehicles Currently Parked (Ready for Exit Clearance)
              </h2>
              <p className="text-xs text-[#64748B]">
                Verify license plate, check for overstays or unpaid surcharges, and trigger exit barrier.
              </p>
            </div>
            <span className="text-xs font-bold text-[#0F766E] bg-[#E6F7F4] px-3 py-1 rounded-full">
              {activeSessions.length} Active in Lot
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B]">Querying gate telemetry...</div>
          ) : activeSessions.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              No active vehicle sessions recorded at this moment.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {activeSessions.map((b) => (
                <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#E6F7F4] text-[#0F766E] flex flex-col items-center justify-center font-bold text-xs shrink-0">
                      <span>BAY</span>
                      <span className="text-sm">{b.bayIdentifier ? b.bayIdentifier.slice(-3) : 'A01'}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-[#101828]">{b.vehiclePlate || 'TN-09-CB-4821'}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475467]">{b.vehicleCategory || 'car'}</span>
                        <span className="text-xs text-[#64748B] font-mono">#{b.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-xs text-[#475467] mt-1">
                        Driver: <strong className="text-[#101828]">{b.customerName || 'Arun Kumar'}</strong> • Entry: {new Date(b.startsAt).toLocaleTimeString()} • Expected Exit: {new Date(b.endsAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleExecuteDeparture(b.id, b.vehiclePlate, b.bayIdentifier)}
                      disabled={processingId === b.id}
                      className="px-4 py-2 bg-[#F59E0B] text-white rounded-xl text-xs font-bold hover:bg-[#D97706] disabled:opacity-50 shadow-xs"
                    >
                      {processingId === b.id ? 'Raising Barrier...' : 'Clear Departure Barrier 🚗'}
                    </button>
                    <button
                      onClick={() => onNavigate(`/host/gate/bookings/${b.id}`)}
                      className="px-3 py-2 border border-[#CBD5E1] rounded-xl text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]"
                    >
                      Invoice Card
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
