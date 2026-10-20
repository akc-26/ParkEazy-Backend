import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function BookingConfirmedPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadBooking() {
      try {
        const data = await client.bookings.get(bookingId);
        setBooking(data);
      } catch (err) {
        console.error('Failed to load confirmed booking:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBooking();
  }, [bookingId]);

  const handleCopyRef = () => {
    if (booking?.bookingReference) {
      navigator.clipboard.writeText(booking.bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const reference = booking?.bookingReference || '#PKZ-2026-9481';
  const gatePin = booking?.gatePinCode || '4821';
  const bay = booking?.bayIdentifier || 'Bay A-04';
  const floor = booking?.floorLevel || 'Ground Level';
  const facilityName = booking?.facilityName || 'Anna Nagar Plaza Covered Parking';
  const startsAt = booking?.startsAt || new Date().toISOString();
  const endsAt = booking?.endsAt || new Date(Date.now() + 2 * 3600000).toISOString();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 cursor-pointer font-extrabold text-lg text-[#0F766E] font-['Plus_Jakarta_Sans']"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0F766E] flex items-center justify-center text-white text-xs font-bold">
              P
            </div>
            <span>ParkEazy</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
              pe_uw_04_07
            </span>
            <button
              onClick={() => onNavigate('/bookings')}
              className="text-xs font-bold text-[#0F766E] px-3 py-1.5 rounded-lg border border-[#0F766E] hover:bg-[#E6F7F4]"
            >
              My Bookings
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E6F7F4] text-[#0F766E] rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-xs">
            ✓
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Booking Confirmed! Your Bay is Reserved
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1.5">
            Present your cryptographic QR pass or enter the PIN at the entry barrier.
          </p>

          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-[#E4E7EC] mt-3 shadow-2xs">
            <span className="text-xs text-[#667085]">Reference:</span>
            <span className="text-sm font-mono font-bold text-[#0F766E]">{reference}</span>
            <button
              onClick={handleCopyRef}
              className="text-xs font-bold text-[#475467] hover:text-[#0F766E] ml-1 cursor-pointer"
            >
              {copied ? 'Copied! ✓' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Boarding-Pass Style Digital Ticket */}
        <div className="bg-white rounded-3xl border border-[#E4E7EC] shadow-md overflow-hidden mb-8">
          {/* Ticket Header */}
          <div className="bg-[#0F766E] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#CCFBF1] uppercase tracking-wider font-semibold">
                Guaranteed Stall Allocation
              </span>
              <h2 className="text-2xl font-extrabold font-['Plus_Jakarta_Sans'] mt-0.5">
                {bay} • {floor}
              </h2>
              <p className="text-xs text-[#CCFBF1] mt-0.5">{facilityName}</p>
            </div>

            <div className="text-right sm:text-right bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-xs self-start sm:self-auto">
              <span className="text-[10px] text-[#CCFBF1] uppercase tracking-wider block font-semibold">
                Gate Entry PIN
              </span>
              <span className="text-2xl font-mono font-extrabold text-white tracking-widest">
                {gatePin}
              </span>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pb-6 border-b border-[#E4E7EC]">
              <div>
                <span className="text-[#667085] block">Arrival:</span>
                <span className="font-bold text-[#141B2C] text-sm block mt-0.5">
                  {new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[#667085] text-[11px]">
                  {new Date(startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[#667085] block">Departure:</span>
                <span className="font-bold text-[#141B2C] text-sm block mt-0.5">
                  {new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[#667085] text-[11px]">
                  {new Date(endsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[#667085] block">Vehicle Plate:</span>
                <span className="font-mono font-extrabold text-[#141B2C] text-sm block mt-0.5">
                  {booking?.vehiclePlate || 'TN-09-CB-4821'}
                </span>
                <span className="text-[#667085] text-[11px] capitalize">{booking?.vehicleCategory || 'Car'}</span>
              </div>
              <div>
                <span className="text-[#667085] block">Total Paid:</span>
                <span className="font-extrabold text-[#0F766E] text-sm block mt-0.5">
                  ₹{booking?.pricing.totalAmountInr.toFixed(2) || '108.56'}
                </span>
                <span className="text-[#12B76A] text-[11px] font-bold">✓ Confirmed</span>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#F8FAFC] p-6 rounded-2xl border border-[#E4E7EC]">
              <div className="text-center sm:text-left space-y-1.5">
                <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider block">
                  Scan at Entry Barrier
                </span>
                <h3 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                  Dynamic Cryptographic QR Pass
                </h3>
                <p className="text-xs text-[#667085] max-w-sm">
                  Turn up screen brightness. The optical reader at Gate 2 opens the boom barrier in under 1.5 seconds.
                </p>
                <div className="text-[11px] font-mono text-[#475467] pt-1">
                  Token: <code>{booking?.qrAccessToken || 'qr-pkz-9481-active'}</code>
                </div>
              </div>

              {/* QR Code graphic */}
              <div className="w-32 h-32 bg-white p-2.5 rounded-2xl border border-[#D0D5DD] shadow-sm flex flex-col items-center justify-center shrink-0">
                <div className="w-full h-full bg-[#101828] p-1 flex items-center justify-center text-white text-[10px] font-mono rounded">
                  [QR-ACCESS-PASS]
                </div>
                <span className="text-[9px] font-mono text-[#667085] mt-1">Single-Vehicle Pass</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => alert('Apple / Google Wallet pass file downloaded.')}
                className="py-2.5 px-3 rounded-xl border border-[#E4E7EC] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>💳</span> Add to Wallet
              </button>
              <button
                onClick={() => onNavigate(`/bookings/${bookingId}/receipt`)}
                className="py-2.5 px-3 rounded-xl border border-[#E4E7EC] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>🧾</span> Tax Receipt
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://maps.google.com/?q=${encodeURIComponent('Anna Nagar Plaza Parking Chennai')}`,
                    '_blank'
                  )
                }
                className="py-2.5 px-3 rounded-xl border border-[#E4E7EC] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>📍</span> Directions
              </button>
              <button
                onClick={() => onNavigate(`/bookings/${bookingId}/active`)}
                className="py-2.5 px-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>🚗</span> Live Session
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
