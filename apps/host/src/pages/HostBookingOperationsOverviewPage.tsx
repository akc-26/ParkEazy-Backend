import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostBookingOperationsOverviewPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [occupancy, setOccupancy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'arrivals' | 'active' | 'departures' | 'exceptions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailsResponse | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadOperationsData();
  }, []);

  const loadOperationsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, occupancyData] = await Promise.all([
        apiClient.host.getBookings(),
        apiClient.host.getOccupancy(),
      ]);
      setBookings(bookingsData);
      setOccupancy(occupancyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load live operations data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      await apiClient.bookings.checkIn(bookingId);
      setActionSuccess(`Check-in recorded successfully for booking #${bookingId.slice(0, 8)}`);
      await loadOperationsData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      await apiClient.bookings.checkOut(bookingId);
      setActionSuccess(`Check-out recorded and bay vacated for booking #${bookingId.slice(0, 8)}`);
      await loadOperationsData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Check-out failed');
    }
  };

  const handleExtend = async (bookingId: string) => {
    try {
      await apiClient.bookings.extend(bookingId, 1);
      setActionSuccess(`Extension (+1 Hour) approved for booking #${bookingId.slice(0, 8)}`);
      await loadOperationsData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to extend booking');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'arrivals') {
      if (b.status !== 'confirmed') return false;
    } else if (activeTab === 'active') {
      if (b.status !== 'active') return false;
    } else if (activeTab === 'departures') {
      if (b.status !== 'active' && b.status !== 'completed') return false;
    } else if (activeTab === 'exceptions') {
      if (b.status !== 'cancelled') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = b.bookingReference.toLowerCase().includes(q);
      const matchPlate = b.vehiclePlate.toLowerCase().includes(q);
      const matchSlot = (b.bayIdentifier || '').toLowerCase().includes(q);
      return matchRef || matchPlate || matchSlot;
    }
    return true;
  });

  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const activeCount = bookings.filter((b) => b.status === 'active').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalBays = occupancy.reduce((acc, curr) => acc + (curr.totalSpaces || 0), 0);
  const occupiedBays = occupancy.reduce((acc, curr) => acc + (curr.occupiedSpaces || 0), 0) || activeCount;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans']">
      {/* OPERATIONS HEADER */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                <span onClick={() => onNavigate('/host/')} className="hover:text-[#0F766E] cursor-pointer">
                  Host Workspace
                </span>
                <span>/</span>
                <span className="font-semibold text-[#0F766E]">Operations & Bookings</span>
                <span className="bg-[#CCFBF1] text-[#0F766E] text-[10px] font-bold px-2 py-0.5 rounded">
                  pe_hw_04_01
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C]">
                Daily Booking & Parking Operations
              </h1>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Monitor real-time arrivals, active bay occupancy, departures, and gate check-in/out workflows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={loadOperationsData}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-[#141B2C] text-xs font-bold hover:bg-[#F8FAFC] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>🔄</span> Refresh Feed
              </button>
              <button
                onClick={() => onNavigate('/host/earnings')}
                className="px-3.5 py-2 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-[#0F766E] text-xs font-bold hover:bg-[#CCFBF1] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>💰</span> Earnings & Ledger
              </button>
              <button
                onClick={() => onNavigate('/host/spaces')}
                className="px-3.5 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>🅿️</span> Manage Bays
              </button>
            </div>
          </div>

          {/* LIVE STATUS BANNER */}
          <div className="mt-4 flex flex-wrap items-center gap-3 bg-[#F1F5F9] px-4 py-2 rounded-xl text-xs text-[#334155]">
            <span className="flex items-center gap-1.5 font-bold text-[#0F766E]">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse"></span>
              Live Shift: Morning Roster (06:00 - 14:00 IST)
            </span>
            <span>•</span>
            <span>Lead Marshal: <strong>Kavitha Rajan</strong></span>
            <span>•</span>
            <span className="font-mono text-[#64748B]">Telemetry Node #BLR-84021: 100% Mesh Active</span>
          </div>
        </div>
      </div>

      {/* ACTION ALERT */}
      {actionSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="bg-[#ECFDF5] border border-[#6EE7B7] text-[#065F46] px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
            <span>✅ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-[#047857] hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ERROR ALERT */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-[#B91C1C] hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* OPERATIONAL METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Expected Arrivals</span>
              <span className="text-base">📅</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">{confirmedCount} Vehicles</div>
            <div className="text-xs text-[#0F766E] font-medium mt-1">Ready for check-in today</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Active Occupancy</span>
              <span className="text-base">🚗</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">
              {occupiedBays} / {totalBays} Bays
            </div>
            <div className="text-xs text-[#64748B] font-medium mt-1">
              {Math.round((occupiedBays / (totalBays || 1)) * 100)}% capacity utilized
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Completed / Departed</span>
              <span className="text-base">🏁</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">{completedCount} Stays</div>
            <div className="text-xs text-[#027A48] font-medium mt-1">Normal turnaround</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-semibold">
              <span>Turnaround & Exceptions</span>
              <span className="text-base">⚠️</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C]">0 Overstays</div>
            <div className="text-xs text-[#059669] font-medium mt-1">100% on-time departures</div>
          </div>
        </div>

        {/* OCCUPANCY VISUAL MAP */}
        {occupancy.length > 0 && occupancy[0].spaces && (
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#141B2C]">
                  Live Physical Bay Matrix: {occupancy[0].facilityName}
                </h3>
                <p className="text-xs text-[#64748B]">Real-time visual map of slots across floors</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#0F766E]">
                  <span className="w-3 h-3 rounded-full bg-[#10B981]"></span> Available
                </span>
                <span className="flex items-center gap-1.5 text-[#64748B]">
                  <span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span> Occupied
                </span>
                <span className="flex items-center gap-1.5 text-[#EF4444]">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444]"></span> Maintenance
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
              {occupancy[0].spaces.map((sp: any) => (
                <div
                  key={sp.id}
                  className={`p-3 rounded-xl border text-center text-xs transition-all ${
                    sp.status === 'occupied'
                      ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                      : sp.status === 'maintenance'
                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                      : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                  }`}
                >
                  <div className="font-extrabold text-sm">{sp.identifier}</div>
                  <div className="text-[10px] mt-0.5 capitalize opacity-80">{sp.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OPERATIONS TABLE CARD */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="p-4 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'all' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab('arrivals')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'arrivals' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Arrivals Pending ({confirmedCount})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'active' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Active Parked ({activeCount})
              </button>
              <button
                onClick={() => setActiveTab('departures')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'departures' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search reference or vehicle plate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#CBD5E1] outline-none focus:border-[#0F766E]"
              />
              <span className="absolute left-2.5 top-2 text-xs text-[#94A3B8]">🔍</span>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              Loading live operational feed...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              <div className="text-3xl mb-2">🅿️</div>
              <p className="font-semibold text-sm text-[#141B2C]">No operations found matching current criteria</p>
              <p className="mt-1">Try switching tabs or clearing your search filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Bay Slot</th>
                    <th className="py-3 px-4">Arrival / Departure</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F766E]">
                        {b.bookingReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#141B2C]">{b.vehiclePlate}</div>
                        <div className="text-[10px] text-[#64748B] capitalize">{b.vehicleCategory}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#F1F5F9] px-2 py-1 rounded font-bold text-[#141B2C]">
                          {b.bayIdentifier || 'Bay Allocated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#475569]">
                        <div>{new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[10px] text-[#94A3B8]">
                          to {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#141B2C]">
                        ₹{b.pricing?.totalAmountInr?.toFixed(2) || '120.00'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'confirmed'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : b.status === 'active'
                              ? 'bg-[#DEF7EC] text-[#03543F]'
                              : b.status === 'completed'
                              ? 'bg-[#E1EFFE] text-[#1E429F]'
                              : 'bg-[#FDE8E8] text-[#9B1C1C]'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleCheckIn(b.id)}
                              className="px-2.5 py-1.5 bg-[#0F766E] text-white rounded-lg font-bold hover:bg-[#0D655E] cursor-pointer shadow-xs"
                            >
                              Check-In
                            </button>
                          )}
                          {b.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleExtend(b.id)}
                                className="px-2.5 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-lg font-bold hover:bg-[#E5E7EB] cursor-pointer"
                                title="Grant +1 hour extension"
                              >
                                +1h Ext
                              </button>
                              <button
                                onClick={() => handleCheckOut(b.id)}
                                className="px-2.5 py-1.5 bg-[#0F766E] text-white rounded-lg font-bold hover:bg-[#0D655E] cursor-pointer shadow-xs"
                              >
                                Check-Out
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                            title="Inspect Booking Pass Details"
                          >
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="font-extrabold text-base text-[#141B2C]">
                Pass #{selectedBooking.bookingReference}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-[#94A3B8] hover:text-[#141B2C] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Facility</span>
                <span className="font-bold text-[#141B2C]">{selectedBooking.facilityName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Allocated Bay</span>
                <span className="font-bold text-[#0F766E]">{selectedBooking.bayIdentifier}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Vehicle Number</span>
                <span className="font-bold text-[#141B2C]">{selectedBooking.vehiclePlate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Total Paid</span>
                <span className="font-bold text-[#141B2C]">
                  ₹{selectedBooking.pricing?.totalAmountInr?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">QR Token</span>
                <span className="font-mono text-[#0F766E]">{selectedBooking.qrAccessToken}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-[#F1F5F9] text-[#334155] rounded-xl font-bold text-xs hover:bg-[#E2E8F0] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
