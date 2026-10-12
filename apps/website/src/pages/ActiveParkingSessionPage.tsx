import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function ActiveParkingSessionPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(5400); // 1h 30m default

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadActive() {
      try {
        const data = await client.bookings.get(bookingId);
        setBooking(data);

        const endMs = new Date(data.endsAt).getTime();
        const diff = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        setRemainingSeconds(diff);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load active session.');
      } finally {
        setLoading(false);
      }
    }
    loadActive();
  }, [bookingId]);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckOut = async () => {
    setCheckingOut(true);
    setErrorMsg(null);
    try {
      await client.bookings.checkOut(bookingId);
      // Navigate to completed receipt
      onNavigate(`/bookings/${bookingId}/receipt`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Check-out failed.');
      setCheckingOut(false);
    }
  };

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const isOverstay = remainingSeconds === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const facilityName = booking?.facilityName || 'Metro Grande Covered Parking';
  const bay = booking?.bayIdentifier || 'Bay A-04';
  const floor = booking?.floorLevel || 'Ground Level';
  const gatePin = booking?.gatePinCode || '4821';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/bookings')}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to All Bookings
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold animate-pulse">
              ● Live Session
            </span>
            <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2.5 py-1 rounded-full font-mono">
              pe_uw_06_03
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Overstay Warning Banner if timer expired */}
        {isOverstay && (
          <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl p-4 sm:p-5 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-[#912018]">Scheduled Departure Window Expired</h3>
                <p className="text-xs text-[#B42318]">
                  15-minute grace period active. Avoid late overstay surcharge by extending or exiting.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/overstay`)}
              className="px-3.5 py-2 bg-[#D92D20] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Resolve Overstay →
            </button>
          </div>
        )}

        {/* Live Countdown Dashboard Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-md space-y-8 mb-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider block">
              Active Parking Duration Remaining
            </span>
            <div className="text-5xl sm:text-6xl font-mono font-extrabold text-[#141B2C] tracking-tight">
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
              <span className="text-[#0F766E]">{String(seconds).padStart(2, '0')}</span>
            </div>
            <p className="text-xs text-[#667085]">
              Scheduled departure at{' '}
              <strong className="text-[#141B2C]">
                {booking?.endsAt ? new Date(booking.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:14 PM'}
              </strong>
            </p>
          </div>

          {/* Stall and Facility Meta */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E4E7EC] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#344054]">
            <div>
              <span className="text-[#667085] block">Current Stall:</span>
              <span className="text-base font-extrabold text-[#0F766E] mt-0.5 block font-['Plus_Jakarta_Sans']">
                {bay}
              </span>
              <span className="text-[#667085] text-[11px]">{floor}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Plate Number:</span>
              <span className="text-sm font-mono font-bold text-[#141B2C] mt-0.5 block">
                {booking?.vehiclePlate || 'TN-09-CB-4821'}
              </span>
            </div>
            <div>
              <span className="text-[#667085] block">Checked In:</span>
              <span className="text-xs font-bold text-[#141B2C] mt-0.5 block">
                {booking?.actualCheckInAt ? new Date(booking.actualCheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
              </span>
            </div>
            <div>
              <span className="text-[#667085] block">Exit Gate PIN:</span>
              <span className="text-base font-mono font-extrabold text-[#141B2C] mt-0.5 block">
                {gatePin}
              </span>
            </div>
          </div>

          {/* QR Pass for pedestrian return */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 rounded-2xl border border-[#E4E7EC] bg-[#E6F7F4]/30">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-[#0F766E] uppercase">Pedestrian Entry Pass</span>
              <h4 className="text-sm font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Need to re-enter the parking building?
              </h4>
              <p className="text-xs text-[#667085] max-w-sm">
                Scan this dynamic QR token at pedestrian night turnstiles and elevator lobbies.
              </p>
            </div>
            <div className="w-24 h-24 bg-white p-2 rounded-xl border border-[#BCE8E0] shadow-xs flex items-center justify-center shrink-0">
              <span className="font-mono text-[9px] text-[#0F766E] text-center font-bold">
                [QR-SESSION-PASS]
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-3 rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Primary Operations Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/extend`)}
              className="py-3.5 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⏱️</span> Extend Duration (+1 hr)
            </button>

            <button
              disabled={checkingOut}
              onClick={handleCheckOut}
              className="py-3.5 px-6 rounded-xl border-2 border-[#D92D20] text-[#D92D20] hover:bg-[#FEF3F2] font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {checkingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#D92D20] border-t-transparent rounded-full animate-spin"></div>
                  <span>Releasing Stall &amp; Opening Gate...</span>
                </>
              ) : (
                <>
                  <span>🚗 End Session &amp; Check Out</span>
                </>
              )}
            </button>
          </div>

          {/* Auxiliary Help Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-[#E4E7EC] text-xs text-[#667085]">
            <button
              onClick={() =>
                window.open(
                  `https://maps.google.com/?q=${encodeURIComponent('Anna Nagar Plaza Covered Parking Chennai')}`,
                  '_blank'
                )
              }
              className="hover:text-[#0F766E] flex items-center gap-1 cursor-pointer"
            >
              <span>🚶</span> Walking Return Route
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/support`)}
              className="hover:text-[#0F766E] flex items-center gap-1 cursor-pointer"
            >
              <span>⚠️</span> Report Space Issue
            </button>
            <span>•</span>
            <button
              onClick={() => alert('Opening live chat with facility desk...')}
              className="hover:text-[#0F766E] flex items-center gap-1 cursor-pointer"
            >
              <span>💬</span> Live Desk Chat
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
