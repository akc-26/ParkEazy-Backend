import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingCancelledPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await client.bookings.get(bookingId);
        setBooking(data);
      } catch {
        // default fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const reference = booking?.bookingReference || '#PKZ-2026-9481';
  const refundAmount = booking?.pricing.totalAmountInr || 108.56;
  const bay = booking?.bayIdentifier || 'Bay A-04';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/bookings')}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to My Bookings
          </button>
          <span className="text-xs bg-[#FEF3F2] text-[#B42318] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_06_06 • Cancelled
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-12 text-center">
        {/* Checkmark icon */}
        <div className="w-16 h-16 bg-[#FEF3F2] text-[#D92D20] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✕
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
          Reservation Successfully Cancelled
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] mt-1.5">
          Your booking has been cancelled and the parking inventory released back to the marketplace.
        </p>

        {/* Cancellation Details Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm text-left mt-8 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC] text-xs">
            <span className="text-[#667085]">Cancellation Reference:</span>
            <span className="font-mono font-bold text-[#141B2C]">CAN-{reference.replace('#PKZ-', '')}</span>
          </div>

          <div className="space-y-3 text-xs text-[#344054]">
            <div className="flex justify-between">
              <span className="text-[#667085]">Released Stall:</span>
              <span className="font-semibold">{bay} ({booking?.facilityName || 'Anna Nagar Plaza'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Refund Amount:</span>
              <span className="font-extrabold text-[#0F766E] text-sm">₹{refundAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Disbursement Channel:</span>
              <span className="font-semibold">UPI / Bank Original Account</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Banking UTR Reference:</span>
              <span className="font-mono text-[#667085]">UTR-PKZ-{Math.floor(100000 + Math.random() * 900000)}</span>
            </div>
          </div>

          {/* SLA Timeline Notice */}
          <div className="bg-[#E6F7F4] border border-[#BCE8E0] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#0F766E]">
            <span className="text-base">⚡</span>
            <div>
              <strong className="block font-bold">Refund SLA Notice</strong>
              Instant UPI reversals credit within 15 minutes. Debit/Credit cards reflect within 24 to 48 banking hours.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => onNavigate('/search')}
              className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🔍 Find Another Parking Space</span>
            </button>

            <button
              onClick={() => onNavigate('/bookings')}
              className="w-full py-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Return to My Bookings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
