import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function ExtendParkingDurationPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [additionalHours, setAdditionalHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadBooking() {
      try {
        const data = await client.bookings.get(bookingId);
        setBooking(data);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load booking for extension.');
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId]);

  const handleConfirmExtension = async () => {
    setExtending(true);
    setErrorMsg(null);
    try {
      await client.bookings.extend(bookingId, additionalHours);
      setSuccessMsg(`Session successfully extended by ${additionalHours} hour(s)!`);
      setTimeout(() => {
        onNavigate(`/bookings/${bookingId}/active`);
      }, 1500);
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.status === 409) {
        setErrorMsg('Downstream Reservation Conflict: Another driver has confirmed a booking on this bay starting immediately after your current slot.');
      } else {
        setErrorMsg(err?.message || 'Extension could not be processed.');
      }
    } finally {
      setExtending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentEnd = booking?.endsAt ? new Date(booking.endsAt) : new Date();
  const newEnd = new Date(currentEnd.getTime() + additionalHours * 3600000);

  const baseRate = 40 * additionalHours;
  const platformFee = Math.round(baseRate * 0.15 * 100) / 100;
  const tax = Math.round((baseRate + platformFee) * 0.18 * 100) / 100;
  const totalPayable = Math.round((baseRate + platformFee + tax) * 100) / 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/bookings/${bookingId}/active`)}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Active Session
          </button>
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_06_04 • Session Extension
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Extend Parking Duration
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Need more time? Extend your current session without leaving your car or re-scanning your pass.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#E6F7F4] border border-[#BCE8E0] text-xs font-bold text-[#0F766E] flex items-center gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-xs font-bold text-[#B42318] flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
          {/* Current vs New Departure Comparison */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E4E7EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-[#667085] block">Current Departure:</span>
              <span className="text-sm font-bold text-[#141B2C] line-through block mt-0.5">
                {currentEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-xl text-[#0F766E] font-bold hidden sm:block">→</div>

            <div className="text-left sm:text-right">
              <span className="text-[#667085] block">New Extended Departure:</span>
              <span className="text-lg font-extrabold text-[#0F766E] font-['Plus_Jakarta_Sans'] block mt-0.5">
                {newEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Quick Extension Chips */}
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
              Select Additional Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { hours: 0.5, label: '+30 Mins', base: '₹20' },
                { hours: 1, label: '+1 Hour', base: '₹40' },
                { hours: 2, label: '+2 Hours', base: '₹80' },
              ].map((opt) => (
                <button
                  key={opt.hours}
                  onClick={() => setAdditionalHours(opt.hours)}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    additionalHours === opt.hours
                      ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E] font-bold ring-1 ring-[#0F766E]'
                      : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-[11px] text-[#667085] mt-0.5">{opt.base}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Downstream Concurrency Safeguard Note */}
          <div className="bg-[#E6F7F4] border border-[#BCE8E0] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#0F766E]">
            <span className="text-base">🛡️</span>
            <div>
              <strong className="block font-bold">Downstream Concurrency Verified</strong>
              Our availability engine re-validates the stall to ensure no upcoming reservations start during this extra window (+ 15m turnaround buffer).
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E4E7EC] space-y-2 text-xs text-[#667085]">
            <div className="flex justify-between">
              <span>Extension Base Rate (+{additionalHours}h)</span>
              <span>₹{baseRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Service Fee (15%)</span>
              <span>₹{platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Tax (18%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-[#E4E7EC] flex justify-between font-bold text-sm text-[#141B2C]">
              <span>Payable Now</span>
              <span className="text-[#0F766E]">₹{totalPayable.toFixed(2)}</span>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            disabled={extending}
            onClick={handleConfirmExtension}
            className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-[#CBD5E1] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {extending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Extending Session...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Pay Extension (₹{totalPayable.toFixed(2)})</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
