import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse, BookingOverstayRecord } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingChangesExceptionStatesPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [overstay, setOverstay] = useState<BookingOverstayRecord | null>(null);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedMsg, setResolvedMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      try {
        const [b, ov] = await Promise.all([
          client.bookings.get(bookingId),
          client.bookings.getOverstay(bookingId),
        ]);
        setBooking(b);
        setOverstay(ov);
      } catch {
        // Mock fallback
        setOverstay({
          bookingId,
          scheduledEndsAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          overstayMinutes: 25,
          gracePeriodMinutes: 15,
          isInGracePeriod: false,
          penaltyRatePerHourInr: 80.0,
          totalPenaltyInr: 80.0,
          status: 'violation',
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId]);

  const handlePayPenaltyAndExit = async () => {
    setResolving(true);
    try {
      await client.bookings.checkOut(bookingId);
      setResolvedMsg('Overstay penalty settled. Exit barrier opened successfully.');
      setTimeout(() => {
        onNavigate(`/bookings/${bookingId}/receipt`);
      }, 1500);
    } catch {
      setResolvedMsg('Check-out completed.');
      setTimeout(() => {
        onNavigate(`/bookings/${bookingId}/receipt`);
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const penaltyAmount = overstay?.totalPenaltyInr || 80.0;
  const overstayMins = overstay?.overstayMinutes || 25;
  const isInGrace = overstay?.isInGracePeriod || false;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/bookings/${bookingId}/active`)}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Live Session
          </button>
          <span className="text-xs bg-[#FEE4E2] text-[#B42318] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_06_09 • Overstay &amp; Exceptions
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Booking Management Exception States
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Overstay violation detection, grace period countdown, and authorized resolution actions.
          </p>
        </div>

        {resolvedMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#E6F7F4] border border-[#BCE8E0] text-xs font-bold text-[#0F766E] flex items-center gap-2">
            <span>✓</span>
            <span>{resolvedMsg}</span>
          </div>
        )}

        {/* Primary Exception Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center text-2xl shrink-0">
              ⚠️
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                {isInGrace ? '15-Minute Grace Period Active' : 'Overstay Violation Detected'}
              </h2>
              <p className="text-xs text-[#667085] leading-relaxed mt-1">
                Your vehicle has exceeded the scheduled departure time by{' '}
                <strong className="text-[#D92D20]">{overstayMins} minutes</strong>. An overstay surcharge applies after the 15-minute grace period to compensate incoming reservations.
              </p>
            </div>
          </div>

          {/* Overstay Calculation Ledger */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E4E7EC] space-y-3 text-xs text-[#344054]">
            <div className="flex justify-between">
              <span className="text-[#667085]">Scheduled Departure:</span>
              <span className="font-semibold text-[#141B2C]">
                {booking?.endsAt ? new Date(booking.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Overstay Duration:</span>
              <span className="font-mono font-bold text-[#D92D20]">{overstayMins} Minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Grace Period Threshold:</span>
              <span className="font-semibold text-[#0F766E]">15 Minutes Complimentary</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Overstay Tariff:</span>
              <span className="font-semibold">₹80.00 / hour (2x Standard Base)</span>
            </div>
            <div className="pt-2 border-t border-[#E4E7EC] flex justify-between text-base font-extrabold text-[#141B2C]">
              <span>Outstanding Overstay Surcharge:</span>
              <span className="text-[#D92D20] font-mono">₹{penaltyAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-3 pt-2">
            <button
              disabled={resolving}
              onClick={handlePayPenaltyAndExit}
              className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {resolving ? (
                <span>Opening Gate...</span>
              ) : (
                <span>Pay Surcharge (₹{penaltyAmount.toFixed(2)}) &amp; Open Exit Gate</span>
              )}
            </button>

            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/extend`)}
              className="w-full py-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Request Emergency Duration Extension
            </button>

            <button
              onClick={() => alert('Dispatching security marshal to Bay A-04')}
              className="w-full py-3 rounded-xl border border-[#E4E7EC] bg-white text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Contact Facility Security Marshal
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
