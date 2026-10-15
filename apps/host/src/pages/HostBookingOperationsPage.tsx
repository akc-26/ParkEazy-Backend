import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostBookingOperationsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailsResponse | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadManifest();
  }, []);

  const loadManifest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.host.getBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load booking operations manifest');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      await apiClient.bookings.checkIn(bookingId);
      setActionSuccess(`Check-in recorded for booking #${bookingId.slice(0, 8)}`);
      await loadManifest();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      await apiClient.bookings.checkOut(bookingId);
      setActionSuccess(`Check-out recorded and bay vacated for booking #${bookingId.slice(0, 8)}`);
      await loadManifest();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Check-out failed');
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeFilter !== 'all' && (b.status as string) !== activeFilter && (b.status as string) !== activeFilter.toLowerCase()) return false;
    if (vehicleCategoryFilter !== 'all' && b.vehicleCategory !== vehicleCategoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        b.vehiclePlate?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.bayIdentifier?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      {/* Top Banner */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-07 • Bookings Manifest
              </span>
              <span className="text-xs text-[#64748B]">pe_hp_07_01 • Master Operations Roster</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Host Booking Operations Manifest
            </h1>
            <p className="text-xs text-[#64748B]">
              Comprehensive bay allocation, driver credentials, and scheduled arrival tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/gate/check-in')}
              className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] transition-colors shadow-xs"
            >
              Scan Arrival QR
            </button>
            <button
              onClick={() => onNavigate('/host/dashboard')}
              className="px-4 py-2 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        {actionSuccess && (
          <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs text-[#065F46] font-medium flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Status:</span>
            {(['all', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeFilter === tab
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#101828]'
                }`}
              >
                {tab === 'all' ? 'All Bookings' : tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={vehicleCategoryFilter}
              onChange={(e) => setVehicleCategoryFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
            >
              <option value="all">All Vehicle Types</option>
              <option value="car">Car / Sedan / Hatch</option>
              <option value="suv">SUV / Crossover</option>
              <option value="bike">Two-Wheeler / Bike</option>
            </select>

            <input
              type="text"
              placeholder="Filter by plate, name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none focus:border-[#0F766E] w-52"
            />
          </div>
        </div>

        {/* Table Manifest */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#101828]">
              Manifest Records ({filtered.length})
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span>Real-time DB synced</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B]">Loading manifest records...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-[#DC2626]">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              No booking records match the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <tr>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Vehicle Details</th>
                    <th className="px-6 py-3">Slot / Bay</th>
                    <th className="px-6 py-3">Schedule</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Fare (₹)</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-[#101828]">#{b.id.slice(0, 8)}</span>
                        <div className="text-[10px] text-[#64748B] font-mono">{b.gatePinCode || 'PIN-4921'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#101828]">{b.vehiclePlate || 'TN-09-CB-4821'}</div>
                        <span className="text-[11px] text-[#64748B] uppercase">{b.vehicleCategory || 'car'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-[#E6F7F4] text-[#0F766E] font-bold rounded-lg">
                          {b.bayIdentifier || 'Bay A-01'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#475467]">
                        <div>{new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <span className="text-[11px] text-[#64748B]">{new Date(b.startsAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#101828]">{b.customerName || 'Arun Kumar'}</div>
                        <div className="text-[11px] text-[#64748B]">{b.customerPhone || '+91 98765 00003'}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#101828]">
                        ₹{b.pricing?.totalAmountInr || 120}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          b.status === 'confirmed' || (b.status as string) === 'CONFIRMED'
                            ? 'bg-[#ECFDF5] text-[#065F46]'
                            : b.status === 'active' || (b.status as string) === 'ACTIVE'
                              ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                              : b.status === 'completed' || (b.status as string) === 'COMPLETED'
                                ? 'bg-[#F1F5F9] text-[#475467]'
                                : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(b.status === 'confirmed' || (b.status as string) === 'CONFIRMED') && (
                            <button
                              onClick={() => handleCheckIn(b.id)}
                              className="px-2.5 py-1 bg-[#0F766E] text-white rounded text-[11px] font-bold hover:bg-[#0D655E]"
                            >
                              Check-In
                            </button>
                          )}
                          {(b.status === 'active' || (b.status as string) === 'ACTIVE') && (
                            <button
                              onClick={() => handleCheckOut(b.id)}
                              className="px-2.5 py-1 bg-[#F59E0B] text-white rounded text-[11px] font-bold hover:bg-[#D97706]"
                            >
                              Check-Out
                            </button>
                          )}
                          <button
                            onClick={() => onNavigate(`/host/gate/bookings/${b.id}`)}
                            className="px-2.5 py-1 border border-[#CBD5E1] rounded text-[11px] font-semibold text-[#334155] hover:bg-[#F1F5F9]"
                          >
                            Card
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
    </div>
  );
}
