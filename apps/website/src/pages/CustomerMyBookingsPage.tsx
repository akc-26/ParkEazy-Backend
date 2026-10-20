import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  UserAccount,
  BookingDetailsResponse,
  TaxInvoiceReceipt,
} from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function CustomerMyBookingsPage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const { tenant } = useBrand();
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedBookingForPass, setSelectedBookingForPass] = useState<BookingDetailsResponse | null>(null);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState<BookingDetailsResponse | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<BookingDetailsResponse | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<TaxInvoiceReceipt | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const loadBookings = async () => {
    setLoading(true);
    try {
      const list = await client.bookings.getMyBookings();
      setBookings(list);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCheckIn = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await client.bookings.checkIn(bookingId);
      setMessage('Vehicle checked in successfully! Active timer started.');
      await loadBookings();
    } catch (err: any) {
      setMessage(`Check-in failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await client.bookings.checkOut(bookingId);
      setMessage('Vehicle checked out. Parking session completed!');
      await loadBookings();
    } catch (err: any) {
      setMessage(`Check-out failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (bookingId: string, hours = 1) => {
    setActionLoading(true);
    try {
      await client.bookings.extend(bookingId, hours);
      setMessage(`Booking extended by ${hours} hour(s)!`);
      setSelectedBookingForExtend(null);
      await loadBookings();
    } catch (err: any) {
      setMessage(`Extend failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await client.bookings.cancel(bookingId, 'Customer cancellation request');
      setMessage(`Booking cancelled! Refund of ₹${res.refundAmountInr || 0} processed.`);
      setSelectedBookingForCancel(null);
      await loadBookings();
    } catch (err: any) {
      setMessage(`Cancellation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewReceipt = async (bookingId: string) => {
    try {
      const receipt = await client.bookings.getReceipt(bookingId);
      setSelectedReceipt(receipt);
    } catch (err: any) {
      console.error('Failed to get receipt:', err);
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return b.status === 'active';
    if (activeTab === 'upcoming') return b.status === 'confirmed';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const activeCount = bookings.filter((b) => b.status === 'active').length;
  const upcomingCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold">
                P
              </div>
              <span className="font-extrabold text-xl text-[#101828]">
                {tenant.displayName}
              </span>
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#344054]">
              <button onClick={() => onNavigate('/explore')} className="hover:text-[#0F766E] cursor-pointer">
                Find Parking
              </button>
              <button onClick={() => onNavigate('/bookings')} className="text-[#0F766E] font-semibold cursor-pointer">
                My Bookings
              </button>
              <button onClick={() => onNavigate('/account/vehicles')} className="hover:text-[#101828] cursor-pointer">
                My Vehicles
              </button>
              <button onClick={() => onNavigate('/host/')} className="hover:text-[#0F766E] cursor-pointer">
                Become a Host
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('/account/profile')}
                  className="flex items-center gap-2 bg-[#F1F5F9] px-3 py-1.5 rounded-full text-xs font-semibold text-[#1E293B]"
                >
                  <span className="w-6 h-6 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                  </span>
                  <span>{currentUser.fullName || currentUser.email}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="text-xs text-[#667085] hover:text-[#B42318] font-medium"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO RIBBON */}
      <div className="bg-white border-b border-[#E4E7EC] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                  Customer Dashboard
                </span>
                {activeCount > 0 && (
                  <span className="text-xs font-semibold text-[#12B76A] bg-[#ECFDF3] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-ping" />
                    {activeCount} Live Session Active
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans']">
                My Bookings & Passes
              </h1>
              <p className="text-sm text-[#475467] mt-1">
                Manage upcoming parking reservations, live arrival check-ins, and tax receipts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/explore')}
                className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs tracking-wide shadow-xs cursor-pointer transition-colors"
              >
                + Book New Parking
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {message && (
            <div className="mt-4 p-3 rounded-xl bg-[#E6F7F4] border border-[#A7F3D0] text-[#0F766E] text-xs font-semibold flex items-center justify-between">
              <span>{message}</span>
              <button onClick={() => setMessage(null)} className="text-[#0F766E] font-bold">✕</button>
            </div>
          )}

          {/* FILTER TABS */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#101828] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#475467] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>All Bookings</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{bookings.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#475467] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>Active Now</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{activeCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upcoming'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#475467] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>Upcoming</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{upcomingCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#475467] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>Completed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{completedCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'cancelled'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'bg-[#F1F5F9] text-[#475467] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>Cancelled</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{cancelledCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOOKING CARDS FEED */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#64748B]">Retrieving parking bookings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E4E7EC] shadow-xs max-w-md mx-auto">
            <span className="text-4xl block mb-3">🚗</span>
            <h3 className="text-base font-bold text-[#101828]">No bookings found</h3>
            <p className="text-xs text-[#667085] mt-1 mb-6">
              You do not have any {activeTab !== 'all' ? activeTab : ''} parking bookings.
            </p>
            <button
              onClick={() => onNavigate('/explore')}
              className="px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] cursor-pointer shadow-xs"
            >
              Search & Reserve a Space
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const isItemActive = item.status === 'active';
              const isItemConfirmed = item.status === 'confirmed';
              const isItemCompleted = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl p-6 border transition-all shadow-xs ${
                    isItemActive
                      ? 'border-[#0F766E] ring-2 ring-[#0F766E]/10'
                      : 'border-[#E4E7EC] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Facility & Space Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                          {item.bookingReference}
                        </span>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isItemActive
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : isItemConfirmed
                              ? 'bg-[#E0E7FF] text-[#3730A3]'
                              : isItemCompleted
                              ? 'bg-[#F1F5F9] text-[#475467]'
                              : 'bg-[#FEF2F2] text-[#991B1B]'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          • {item.vehicleCategory.toUpperCase()} ({item.vehiclePlate})
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
                        {item.facilityName}
                      </h3>
                      <p className="text-xs text-[#64748B] flex items-center gap-1">
                        <span>📍</span> {item.facilityAddress}, {item.facilityCity}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#344054] pt-1">
                        <div>
                          <span className="text-[#64748B]">Allocated Bay:</span>{' '}
                          <strong className="text-[#101828] font-semibold">{item.bayIdentifier || 'Bay A-04'}</strong>
                        </div>
                        <div>
                          <span className="text-[#64748B]">Arrival:</span>{' '}
                          <span className="font-medium">
                            {new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(item.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">Exit By:</span>{' '}
                          <span className="font-medium">
                            {new Date(item.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">Gate PIN:</span>{' '}
                          <strong className="font-mono text-[#0F766E]">{item.gatePinCode || '4821'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Financial & Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#F1F5F9]">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] uppercase tracking-wider text-[#64748B] block">
                          Total Paid
                        </span>
                        <strong className="text-2xl font-black text-[#101828] font-['Plus_Jakarta_Sans']">
                          ₹{item.pricing?.totalAmountInr || 108.56}
                        </strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isItemConfirmed && (
                          <>
                            <button
                              onClick={() => handleCheckIn(item.id)}
                              disabled={actionLoading}
                              className="px-3.5 py-2 rounded-xl bg-[#12B76A] hover:bg-[#0E9F5D] text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              Gate Check-In
                            </button>
                            <button
                              onClick={() => setSelectedBookingForPass(item)}
                              className="px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              Show QR Pass
                            </button>
                            <button
                              onClick={() => setSelectedBookingForCancel(item)}
                              className="px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] hover:bg-[#FEF2F2] text-[#B42318] text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {isItemActive && (
                          <>
                            <button
                              onClick={() => handleCheckOut(item.id)}
                              disabled={actionLoading}
                              className="px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              Gate Check-Out
                            </button>
                            <button
                              onClick={() => setSelectedBookingForExtend(item)}
                              className="px-3.5 py-2 rounded-xl bg-white border border-[#0F766E] text-[#0F766E] hover:bg-[#E6F7F4] text-xs font-bold cursor-pointer transition-colors"
                            >
                              + Extend 1h
                            </button>
                            <button
                              onClick={() => setSelectedBookingForPass(item)}
                              className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              QR Pass
                            </button>
                          </>
                        )}

                        {isItemCompleted && (
                          <button
                            onClick={() => handleViewReceipt(item.id)}
                            className="px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] hover:bg-[#F8FAFC] text-[#344054] text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <span>📄 Tax Invoice</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL 1: Digital QR Access Pass (upcoming_booking_details_pe_uw_06_02) */}
        {selectedBookingForPass && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-[#E4E7EC] shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
                <strong className="text-sm font-bold text-[#101828]">
                  Digital Barrier Access Pass
                </strong>
                <button
                  onClick={() => setSelectedBookingForPass(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="my-6 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-48 h-48 bg-[#101828] text-white mx-auto rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                  <span className="text-3xl mb-2">🏁</span>
                  <p className="font-mono text-xs font-bold tracking-widest text-[#2DD4BF]">
                    {selectedBookingForPass.qrAccessToken}
                  </p>
                  <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] mt-2">
                    SCAN AT GATE SENSOR
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-around text-xs">
                  <div>
                    <span className="text-[#64748B] block">Assigned Bay:</span>
                    <strong className="text-lg font-black text-[#0F766E]">
                      {selectedBookingForPass.bayIdentifier || 'Bay A-04'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Gate PIN:</span>
                    <strong className="text-lg font-mono font-bold text-[#101828]">
                      {selectedBookingForPass.gatePinCode || '4821'}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#64748B] mb-5">
                License Plate Registered: <strong className="text-[#101828] font-mono">{selectedBookingForPass.vehiclePlate}</strong>
              </p>

              <button
                onClick={() => setSelectedBookingForPass(null)}
                className="w-full py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold cursor-pointer hover:bg-[#0D655E]"
              >
                Close Pass
              </button>
            </div>
          </div>
        )}

        {/* MODAL 2: Extend Parking Duration (extend_parking_duration_pe_uw_06_04) */}
        {selectedBookingForExtend && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-[#E4E7EC] shadow-2xl">
              <h3 className="text-base font-bold text-[#101828] mb-2">Extend Parking Duration</h3>
              <p className="text-xs text-[#64748B] mb-6">
                Current session exit time: {new Date(selectedBookingForExtend.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  onClick={() => handleExtend(selectedBookingForExtend.id, 1)}
                  className="p-3 rounded-xl border border-[#0F766E] bg-[#E6F7F4] text-[#0F766E] font-bold text-xs hover:bg-[#0F766E] hover:text-white transition-all cursor-pointer"
                >
                  +1 Hour
                  <span className="block text-[10px] font-normal mt-0.5">₹47.20</span>
                </button>
                <button
                  onClick={() => handleExtend(selectedBookingForExtend.id, 2)}
                  className="p-3 rounded-xl border border-[#0F766E] bg-[#E6F7F4] text-[#0F766E] font-bold text-xs hover:bg-[#0F766E] hover:text-white transition-all cursor-pointer"
                >
                  +2 Hours
                  <span className="block text-[10px] font-normal mt-0.5">₹94.40</span>
                </button>
                <button
                  onClick={() => handleExtend(selectedBookingForExtend.id, 4)}
                  className="p-3 rounded-xl border border-[#0F766E] bg-[#E6F7F4] text-[#0F766E] font-bold text-xs hover:bg-[#0F766E] hover:text-white transition-all cursor-pointer"
                >
                  +4 Hours
                  <span className="block text-[10px] font-normal mt-0.5">₹188.80</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedBookingForExtend(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-[#475467] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* MODAL 3: Cancel Booking Review (cancel_booking_review_pe_uw_06_05) */}
        {selectedBookingForCancel && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-[#E4E7EC] shadow-2xl">
              <span className="text-3xl block mb-2">⚠️</span>
              <h3 className="text-base font-bold text-[#101828]">Cancel Reservation?</h3>
              <p className="text-xs text-[#64748B] mt-1 mb-4">
                Booking reference: <strong className="font-mono">{selectedBookingForCancel.bookingReference}</strong>
              </p>

              <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-left text-xs mb-6">
                <span className="font-bold text-[#92400E] block mb-1">Cancellation Refund Policy:</span>
                <p className="text-[#78350F]">
                  • Cancellations made 2+ hours in advance receive a <strong>100% full refund</strong> (₹{selectedBookingForCancel.pricing.totalAmountInr}).
                </p>
                <p className="text-[#78350F] mt-1">
                  • Refunds are credited directly to your original payment method within 24 hours.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBookingForCancel(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-[#475467] text-xs font-semibold cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  onClick={() => handleCancel(selectedBookingForCancel.id)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#D92D20] text-white text-xs font-bold hover:bg-[#B42318] cursor-pointer"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: Tax Invoice Receipt (booking_history_receipts_pe_uw_06_07) */}
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E4E7EC] shadow-2xl text-left">
              <div className="flex justify-between items-center pb-4 border-b border-[#E4E7EC]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2 py-0.5 rounded-full">
                    Official Tax Invoice
                  </span>
                  <h3 className="text-lg font-extrabold text-[#101828] mt-1">
                    {selectedReceipt.invoiceNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-2.5 text-xs text-[#475467]">
                <div className="flex justify-between">
                  <span>Invoice Date:</span>
                  <strong className="text-[#101828]">{selectedReceipt.invoiceDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Booking Reference:</span>
                  <strong className="text-[#101828] font-mono">{selectedReceipt.bookingReference}</strong>
                </div>
                <div className="flex justify-between">
                  <span>SAC Code (Parking Services):</span>
                  <strong className="text-[#101828] font-mono">{selectedReceipt.sacCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Customer Name:</span>
                  <span className="text-[#101828] font-semibold">{selectedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vehicle Number:</span>
                  <span className="text-[#101828] font-mono font-semibold">{selectedReceipt.vehiclePlate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Facility:</span>
                  <span className="text-[#101828] font-medium">{selectedReceipt.facilityName}</span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="border-t border-b border-[#E4E7EC] py-3 my-2 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#475467]">
                  <span>Parking Space Charge ({selectedReceipt.durationHours}h)</span>
                  <span>₹{selectedReceipt.baseAmountInr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#475467]">
                  <span>Platform Conveniency Fee</span>
                  <span>₹{selectedReceipt.platformFeeInr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#475467]">
                  <span>Central GST (CGST 9%)</span>
                  <span>₹{selectedReceipt.cgstInr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#475467]">
                  <span>State GST (SGST 9%)</span>
                  <span>₹{selectedReceipt.sgstInr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#101828] pt-2 border-t border-[#F1F5F9]">
                  <span>Total Amount Paid</span>
                  <span className="text-[#0F766E]">₹{selectedReceipt.totalAmountInr.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[11px] text-[#64748B] flex justify-between py-1">
                <span>Payment Mode: {selectedReceipt.paymentMethod}</span>
                <span className="text-[#12B76A] font-bold">✓ {selectedReceipt.paymentStatus}</span>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] cursor-pointer"
                >
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-[#475467] text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
