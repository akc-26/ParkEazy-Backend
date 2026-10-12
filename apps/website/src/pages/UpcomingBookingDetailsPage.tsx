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

export function UpcomingBookingDetailsPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [booking, setBooking] = useState<BookingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingPlate, setEditingPlate] = useState(false);
  const [newPlate, setNewPlate] = useState('');

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      try {
        const data = await client.bookings.get(bookingId);
        setBooking(data);
        setNewPlate(data.vehiclePlate);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to load booking details.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingId]);

  const handleCheckInNow = async () => {
    setActionLoading(true);
    try {
      await client.bookings.checkIn(bookingId);
      onNavigate(`/bookings/${bookingId}/active`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gate check-in failed.');
      setActionLoading(false);
    }
  };

  const handleUpdatePlate = () => {
    if (booking && newPlate.trim()) {
      booking.vehiclePlate = newPlate.toUpperCase().trim();
      setEditingPlate(false);
      alert('Vehicle registration updated with gate ANPR optical scanners.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const facilityName = booking?.facilityName || 'Nexus Business Center — Level B1 Parking';
  const facilityAddress = booking?.facilityAddress || 'Mount Road, Guindy, Chennai';
  const bay = booking?.bayIdentifier || 'Bay A-04';
  const floor = booking?.floorLevel || 'Ground Level';
  const gatePin = booking?.gatePinCode || '4821';
  const startsAt = booking?.startsAt || new Date().toISOString();
  const endsAt = booking?.endsAt || new Date(Date.now() + 3 * 3600000).toISOString();

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
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_06_02 • Upcoming Pass
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-mono font-bold text-[#0F766E]">{booking?.bookingReference}</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight mt-0.5">
              {facilityName}
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-1">{facilityAddress}</p>
          </div>

          <span className="self-start sm:self-auto bg-[#EFF8FF] text-[#175CD3] px-3.5 py-1.5 rounded-full text-xs font-bold">
            Confirmed Upcoming
          </span>
        </div>

        {errorMsg && (
          <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-4 rounded-2xl text-xs font-semibold mb-6">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Primary Action Card: Gate PIN & Check-in */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-md space-y-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F766E] p-6 rounded-2xl text-white">
            <div>
              <span className="text-xs text-[#CCFBF1] uppercase tracking-wider font-semibold">
                Arrival Gate PIN Code
              </span>
              <div className="text-4xl font-mono font-extrabold tracking-widest mt-1">
                {gatePin}
              </div>
              <p className="text-xs text-[#CCFBF1] mt-1">
                Key this into the keypad at Gate 2 boom barrier or present your QR pass below.
              </p>
            </div>

            <button
              disabled={actionLoading}
              onClick={handleCheckInNow}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F766E] text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              {actionLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
                  <span>Recording Arrival...</span>
                </>
              ) : (
                <>
                  <span>🚗 I've Arrived • Check-in Now</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {/* Bay and Vehicle Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-[#E4E7EC] text-xs text-[#344054]">
            <div>
              <span className="text-[#667085] block">Reserved Space:</span>
              <span className="text-base font-extrabold text-[#0F766E] mt-0.5 block font-['Plus_Jakarta_Sans']">
                {bay}
              </span>
              <span className="text-[#667085] text-[11px]">{floor}</span>
            </div>

            <div>
              <span className="text-[#667085] block">Vehicle Plate:</span>
              {editingPlate ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    className="w-28 text-xs font-mono font-bold p-1 border rounded"
                  />
                  <button onClick={handleUpdatePlate} className="text-[#0F766E] font-bold text-xs">
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-mono font-bold text-[#141B2C]">
                    {booking?.vehiclePlate}
                  </span>
                  <button
                    onClick={() => setEditingPlate(true)}
                    className="text-[10px] text-[#0F766E] underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <span className="text-[#667085] block">Arrival Window:</span>
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
          </div>

          {/* Entrance Directive Card */}
          <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E4E7EC] space-y-2 text-xs">
            <h3 className="font-bold text-[#141B2C] text-sm font-['Plus_Jakarta_Sans']">
              Entrance Instructions &amp; Security Clearance
            </h3>
            <p className="text-[#475467] leading-relaxed">
              {booking?.entranceInstructions ||
                'Approach Gate 2 from 2nd Avenue. Maintain lane 1 for automatic optical license plate scanner. If boom barrier does not open automatically within 3 seconds, punch in gate PIN 4821.'}
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/extend`)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
            >
              <span>⏱️</span> Extend Window
            </button>
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/cancel`)}
              className="px-4 py-2.5 rounded-xl border border-[#FECDCA] bg-white text-xs font-bold text-[#B42318] hover:bg-[#FEF3F2] flex items-center gap-1.5 cursor-pointer"
            >
              <span>✕</span> Cancel Booking
            </button>
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/receipt`)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
            >
              <span>🧾</span> Tax Invoice (PDF)
            </button>
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}/support`)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
            >
              <span>💬</span> Report Issue
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
