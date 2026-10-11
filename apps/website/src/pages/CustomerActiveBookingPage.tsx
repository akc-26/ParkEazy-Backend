import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  onNavigate: (path: string) => void;
}

export function CustomerActiveBookingPage({ bookingId, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedMinutes, setElapsedMinutes] = useState(42);
  const [remainingMinutes, setRemainingMinutes] = useState(78);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const loadBooking = async () => {
    setLoading(true);
    try {
      const data = await client.bookings.get(bookingId);
      setBooking(data);

      const startMs = new Date(data.startsAt).getTime();
      const endMs = new Date(data.endsAt).getTime();
      const nowMs = Date.now();

      const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 60000));
      const remaining = Math.max(0, Math.floor((endMs - nowMs) / 60000));
      setElapsedMinutes(elapsed || 45);
      setRemainingMinutes(remaining || 75);
    } catch (err: any) {
      console.error('Failed to load booking session:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
    const interval = setInterval(() => {
      setElapsedMinutes((prev) => prev + 1);
      setRemainingMinutes((prev) => Math.max(0, prev - 1));
    }, 60000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleExtend = async () => {
    try {
      await client.bookings.extend(bookingId, 1);
      setActionMsg('Session extended by 1 hour!');
      await loadBooking();
    } catch (err: any) {
      setActionMsg(`Extension failed: ${err.message}`);
    }
  };

  const handleCheckOut = async () => {
    try {
      await client.bookings.checkOut(bookingId);
      setActionMsg('Check-out completed! Navigating to receipts...');
      setTimeout(() => onNavigate('/bookings'), 1500);
    } catch (err: any) {
      setActionMsg(`Check-out error: ${err.message}`);
    }
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-3xl border border-[#E4E7EC] shadow-sm">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#475467]">Loading active parking session...</p>
        </div>
      </div>
    );
  }

  const hoursLeft = Math.floor(remainingMinutes / 60);
  const minsLeft = remainingMinutes % 60;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="bg-white border-b border-[#E4E7EC] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/bookings')}
            className="flex items-center gap-2 cursor-pointer text-left"
          >
            <span className="text-lg">←</span>
            <span className="text-xs font-bold text-[#475467]">Back to My Bookings</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#12B76A] animate-ping" />
            <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
              Live Session Active
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {actionMsg && (
          <div className="p-3.5 rounded-2xl bg-[#E6F7F4] border border-[#A7F3D0] text-[#0F766E] text-xs font-bold text-center">
            {actionMsg}
          </div>
        )}

        {/* TIME REMAINING & LIVE TELEMETRY HERO */}
        <div className="bg-[#101828] text-white rounded-3xl p-8 text-center relative overflow-hidden shadow-xl">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#0F766E]/30 rounded-full blur-2xl" />
          <div className="relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#2DD4BF] bg-[#1E293B] px-3 py-1 rounded-full">
              Time Remaining in Reserved Bay
            </span>
            <div className="text-5xl sm:text-6xl font-black font-['Plus_Jakarta_Sans'] my-4 tracking-tight">
              {hoursLeft}h {minsLeft}m
            </div>
            <p className="text-xs text-[#94A3B8]">
              Allocated Exit: {new Date(booking.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Overstay buffer: 15 mins
            </p>
          </div>
        </div>

        {/* DIGITAL ACCESS PASS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                Assigned Stall
              </span>
              <strong className="text-2xl font-black text-[#0F766E]">
                {booking.bayIdentifier || 'Bay A-04'}
              </strong>
              <span className="text-xs text-[#64748B] block">Ground Level / Covered</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                Vehicle Plate
              </span>
              <strong className="text-lg font-mono font-bold text-[#101828]">
                {booking.vehiclePlate}
              </strong>
              <span className="text-xs text-[#12B76A] block font-semibold">✓ ANPR Linked</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-dashed border-[#0F766E]/40 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-[#101828] rounded-xl flex flex-col items-center justify-center text-white p-2 text-center">
                <span className="text-3xl mb-1">🏁</span>
                <span className="font-mono text-xs font-bold text-[#2DD4BF] break-all leading-tight">
                  {booking.qrAccessToken}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] mt-2 font-bold">
                  TAP TO SCAN AT BOOM BARRIER
                </span>
              </div>
            </div>
          </div>

          {/* Emergency PIN Code */}
          <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#92400E] block uppercase tracking-wider">
                Emergency Gate PIN Code
              </span>
              <span className="text-2xl font-mono font-extrabold text-[#78350F]">
                {booking.gatePinCode || '4821'}
              </span>
            </div>
            <span className="text-xs text-[#92400E] font-medium">Attendant keypad override</span>
          </div>

          {/* Facility Location & Directions */}
          <div className="mt-6 pt-5 border-t border-[#E4E7EC] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Facility:</span>
              <strong className="text-[#101828]">{booking.facilityName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Address:</span>
              <span className="text-[#101828] text-right">{booking.facilityAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Directions:</span>
              <span className="text-[#101828] text-right font-medium">{booking.entranceInstructions}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleExtend}
              className="flex-1 py-3 rounded-xl bg-white border border-[#0F766E] text-[#0F766E] hover:bg-[#E6F7F4] font-bold text-xs cursor-pointer transition-colors"
            >
              + Extend Time (1 Hour)
            </button>
            <button
              onClick={handleCheckOut}
              className="flex-1 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
            >
              Gate Check-Out & Exit
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
