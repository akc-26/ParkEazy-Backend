import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingListSearchPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [plateQuery, setPlateQuery] = useState('');
  const [bookingIdQuery, setBookingIdQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [bayQuery, setBayQuery] = useState('');
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    apiClient.host.getBookings()
      .then((data) => setBookings(data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const results = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter.toLowerCase() && b.status !== statusFilter) return false;
    if (plateQuery && !b.vehiclePlate?.toLowerCase().includes(plateQuery.toLowerCase())) return false;
    if (bookingIdQuery && !b.id.toLowerCase().includes(bookingIdQuery.toLowerCase())) return false;
    if (phoneQuery && !b.customerPhone?.includes(phoneQuery)) return false;
    if (bayQuery && !b.bayIdentifier?.toLowerCase().includes(bayQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-07 • Booking Search
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_02 • Gate Plate & Manifest Filter</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Booking Search & Plate Filter
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/gate/check-in')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Arrival QR Scanner →
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Search Parameter Card */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs">
          <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider mb-4">
            Gate Query Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Vehicle Plate</label>
              <input
                type="text"
                placeholder="e.g. TN-09-CB-4821"
                value={plateQuery}
                onChange={(e) => setPlateQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Booking Ref ID</label>
              <input
                type="text"
                placeholder="e.g. 5987de02"
                value={bookingIdQuery}
                onChange={(e) => setBookingIdQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Assigned Bay</label>
              <input
                type="text"
                placeholder="e.g. Bay A-01"
                value={bayQuery}
                onChange={(e) => setBayQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Driver Phone</label>
              <input
                type="text"
                placeholder="e.g. 98765"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Lifecycle Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="ALL">All States</option>
                <option value="CONFIRMED">CONFIRMED (Expected)</option>
                <option value="ACTIVE">ACTIVE (Parked in Bay)</option>
                <option value="COMPLETED">COMPLETED (Vacated)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#64748B]">Showing {results.length} matching reservations</span>
            <button
              onClick={() => {
                setPlateQuery('');
                setBookingIdQuery('');
                setPhoneQuery('');
                setBayQuery('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-[#DC2626] font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#64748B]">Querying database...</div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              No active or upcoming reservations found matching query parameters.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {results.map((b) => (
                <div key={b.id} className="p-4 hover:bg-[#F8FAFC] flex items-center justify-between gap-4 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-sm">
                      {b.bayIdentifier ? b.bayIdentifier.slice(-3) : 'BAY'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#101828] font-mono">{b.vehiclePlate || 'TN-09-CB-4821'}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475467]">
                          {b.vehicleCategory || 'car'}
                        </span>
                        <span className="text-xs text-[#64748B] font-mono">#{b.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-xs text-[#475467] mt-0.5">
                        {b.customerName || 'Arun Kumar'} • {b.customerPhone || '+91 98765 00003'} • Schedule: {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      b.status === 'confirmed' || (b.status as string) === 'CONFIRMED'
                        ? 'bg-[#ECFDF5] text-[#065F46]'
                        : b.status === 'active' || (b.status as string) === 'ACTIVE'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                          : 'bg-[#F1F5F9] text-[#475467]'
                    }`}>
                      {b.status}
                    </span>
                    <button
                      onClick={() => onNavigate(`/host/gate/bookings/${b.id}`)}
                      className="px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#0F766E] hover:bg-[#E6F7F4]"
                    >
                      View Details →
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
