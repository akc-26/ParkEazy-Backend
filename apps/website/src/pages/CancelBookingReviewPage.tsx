import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse, CancelPreviewResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function CancelBookingReviewPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [preview, setPreview] = useState<CancelPreviewResponse | null>(null);
  const [reason, setReason] = useState('Change of travel plans');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      try {
        const [b, prev] = await Promise.all([
          client.bookings.get(bookingId),
          client.bookings.cancelPreview(bookingId),
        ]);
        setBooking(b);
        setPreview(prev);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load cancellation review.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId]);

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setErrorMsg(null);
    try {
      await client.bookings.cancel(bookingId, reason);
      onNavigate(`/bookings/${bookingId}/cancelled`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Cancellation request failed.');
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalPaid = preview?.totalPaidInr || booking?.pricing.totalAmountInr || 108.56;
  const refundAmount = preview?.eligibleRefundInr || totalPaid;
  const refundPct = preview?.refundPercentage ?? 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/bookings/${bookingId}`)}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Keep Reservation
          </button>
          <span className="text-xs bg-[#FEE4E2] text-[#B42318] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_06_05 • Cancel Review
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Cancel Reservation Review
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Review your refund calculation according to the commercial cancellation policy before confirming.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-xs font-bold text-[#B42318]">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
          {/* Reservation Summary */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E4E7EC] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#667085]">Booking Reference:</span>
              <span className="font-mono font-bold text-[#141B2C]">{booking?.bookingReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Facility &amp; Stall:</span>
              <span className="font-semibold text-[#141B2C]">{booking?.facilityName} • {booking?.bayIdentifier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Scheduled Arrival:</span>
              <span className="font-semibold text-[#141B2C]">
                {booking?.startsAt ? new Date(booking.startsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>

          {/* Refund Calculation Breakdown Card */}
          <div className="bg-[#E6F7F4]/40 border border-[#BCE8E0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#BCE8E0]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Refund Calculation Summary
              </span>
              <span className="text-xs font-extrabold bg-[#0F766E] text-white px-2.5 py-0.5 rounded-full">
                {refundPct}% Refund Tier
              </span>
            </div>

            <div className="space-y-2 text-xs text-[#344054]">
              <div className="flex justify-between">
                <span>Original Total Paid:</span>
                <span className="font-semibold">₹{totalPaid.toFixed(2)}</span>
              </div>
              {preview && preview.deductionAmountInr > 0 && (
                <div className="flex justify-between text-[#B42318]">
                  <span>Cancellation Deduction (Host Fee):</span>
                  <span>-₹{preview.deductionAmountInr.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#BCE8E0] flex justify-between text-base font-extrabold text-[#0F766E]">
                <span>Net Refund to be Disbursed:</span>
                <span>₹{refundAmount.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#006B5F] leading-relaxed">
              {preview?.policyNotes ||
                'Cancellation > 2 hours prior to scheduled arrival: 100% full refund processed to your original payment channel.'}
            </p>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
              Reason for Cancellation
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs font-semibold px-4 py-3 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
            >
              <option value="Change of travel plans">Change of travel plans</option>
              <option value="Found alternative parking">Found alternative parking</option>
              <option value="Vehicle breakdown or delay">Vehicle breakdown or delay</option>
              <option value="Accidentally booked wrong time or facility">Accidentally booked wrong time or facility</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              disabled={cancelling}
              onClick={handleConfirmCancel}
              className="w-full py-3.5 rounded-xl bg-[#D92D20] hover:bg-[#B42318] disabled:bg-[#CBD5E1] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {cancelling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Cancellation...</span>
                </>
              ) : (
                <>
                  <span>Confirm &amp; Cancel Booking</span>
                </>
              )}
            </button>

            <button
              onClick={() => onNavigate(`/bookings/${bookingId}`)}
              className="w-full py-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Nevermind, Keep Reservation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
