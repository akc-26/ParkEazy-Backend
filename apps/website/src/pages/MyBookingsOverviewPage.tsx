import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function MyBookingsOverviewPage({
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const loadBookings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await client.bookings.getMyBookings();
      setBookings(list);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to retrieve booking records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const activeCount = bookings.filter((b) => b.status === 'active').length;
  const upcomingCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pastCount = bookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'active') return b.status === 'active';
    if (activeTab === 'upcoming') return b.status === 'confirmed';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 cursor-pointer font-extrabold text-xl text-[#0F766E] font-['Plus_Jakarta_Sans']"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white text-sm font-bold">
                P
              </div>
              <span>ParkEazy</span>
            </button>
            <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold text-[#64748B]">
              <button onClick={() => onNavigate('/search')} className="hover:text-[#0F766E] cursor-pointer">
                Find Parking
              </button>
              <button onClick={() => onNavigate('/bookings/receipts')} className="hover:text-[#0F766E] cursor-pointer">
                Invoices &amp; Receipts
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
              pe_uw_06_01
            </span>
            <button
              onClick={loadBookings}
              className="text-xs font-bold text-[#0F766E] px-3 py-1.5 rounded-lg border border-[#0F766E] hover:bg-[#E6F7F4] flex items-center gap-1 cursor-pointer"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-1">
              Live sessions, verified gate passes, upcoming arrivals, and downloadable GST tax receipts.
            </p>
          </div>

          <button
            onClick={() => onNavigate('/search')}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            + Book Another Spot
          </button>
        </div>

        {/* Filter Segmented Tabs */}
        <div className="flex flex-wrap gap-2 pb-4 mb-6 border-b border-[#E4E7EC]">
          {[
            { id: 'all', label: `All (${bookings.length})` },
            { id: 'active', label: `Active Session (${activeCount})`, highlight: activeCount > 0 },
            { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
            { id: 'completed', label: `Past Completed (${pastCount})` },
            { id: 'cancelled', label: `Cancelled (${cancelledCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-white text-[#475467] border border-[#E4E7EC] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-4 rounded-2xl text-xs font-semibold mb-6">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Bookings List */}
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-[#E4E7EC] text-center space-y-4">
            <div className="text-4xl">🅿️</div>
            <h3 className="text-base font-bold text-[#141B2C]">No bookings found in this filter</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              You don’t have any reservations matching this status. Explore top garage locations across Chennai to reserve guaranteed parking.
            </p>
            <button
              onClick={() => onNavigate('/search')}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold cursor-pointer"
            >
              Find Available Spots
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const isActive = b.status === 'active';
              const isConfirmed = b.status === 'confirmed';
              const isCompleted = b.status === 'completed';
              const isCancelled = b.status === 'cancelled';

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl p-6 border transition-all ${
                    isActive
                      ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20 shadow-md'
                      : 'border-[#E4E7EC] hover:border-[#CBD5E1] shadow-xs'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E4E7EC]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs text-[#0F766E]">
                          {b.bookingReference}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-[#E6F7F4] text-[#0F766E] animate-pulse'
                              : isConfirmed
                              ? 'bg-[#EFF8FF] text-[#175CD3]'
                              : isCompleted
                              ? 'bg-[#F2F4F7] text-[#344054]'
                              : 'bg-[#FEF3F2] text-[#B42318]'
                          }`}
                        >
                          {isActive
                            ? '● Live Active Session'
                            : isConfirmed
                            ? 'Upcoming Confirmed'
                            : isCompleted
                            ? 'Completed'
                            : 'Cancelled'}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                        {b.facilityName || 'Anna Nagar Plaza Parking'}
                      </h2>
                      <p className="text-xs text-[#667085]">{b.facilityAddress}</p>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-xs text-[#667085] block">Total Amount</span>
                      <span className="text-lg font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                        ₹{b.pricing.totalAmountInr.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs text-[#344054]">
                    <div>
                      <span className="text-[#667085] block">Assigned Bay:</span>
                      <span className="font-extrabold text-[#0F766E] text-sm mt-0.5 block">
                        {b.bayIdentifier || 'Bay A-04'} ({b.floorLevel || 'Ground'})
                      </span>
                    </div>

                    <div>
                      <span className="text-[#667085] block">Vehicle Plate:</span>
                      <span className="font-mono font-bold text-sm text-[#141B2C] mt-0.5 block">
                        {b.vehiclePlate}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#667085] block">Scheduled Window:</span>
                      <span className="font-semibold block mt-0.5">
                        {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
                        {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[#667085] text-[11px]">
                        {new Date(b.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#667085] block">Gate PIN Code:</span>
                      <span className="font-mono font-extrabold text-sm text-[#141B2C] mt-0.5 block">
                        {b.gatePinCode || '4821'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-[#E4E7EC] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      {isConfirmed && (
                        <span className="text-[#175CD3] font-semibold">
                          Arrival instructions &amp; PIN code ready
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[#0F766E] font-semibold">
                          Currently parked in stall
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isActive && (
                        <button
                          onClick={() => onNavigate(`/bookings/${b.id}/active`)}
                          className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          View Live Session &amp; Pass →
                        </button>
                      )}

                      {isConfirmed && (
                        <>
                          <button
                            onClick={() => onNavigate(`/bookings/${b.id}`)}
                            className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Upcoming Pass &amp; Directions →
                          </button>
                          <button
                            onClick={() => onNavigate(`/bookings/${b.id}/cancel`)}
                            className="px-3 py-2 rounded-xl border border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2] text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <button
                          onClick={() => onNavigate(`/bookings/${b.id}/receipt`)}
                          className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#344054] text-xs font-bold cursor-pointer"
                        >
                          🧾 Tax Invoice (PDF)
                        </button>
                      )}

                      {isCancelled && (
                        <button
                          onClick={() => onNavigate(`/bookings/${b.id}/cancelled`)}
                          className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#344054] text-xs font-bold cursor-pointer"
                        >
                          Cancellation Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
