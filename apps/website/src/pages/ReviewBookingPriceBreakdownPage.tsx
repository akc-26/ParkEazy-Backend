import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, PricingCalculationResult, ParkingSpace, ParkingFacility } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId?: string;
  spaceId?: string;
  startsAt?: string;
  endsAt?: string;
  plate?: string;
  category?: string;
  driverName?: string;
  driverPhone?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function ReviewBookingPriceBreakdownPage({
  facilityId = '10000000-0000-4000-b000-000000000104',
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  startsAt = new Date(Date.now() + 3600000).toISOString(),
  endsAt = new Date(Date.now() + 4 * 3600000).toISOString(),
  plate = 'TN-09-CB-4821',
  category = 'car',
  driverName = 'Arun Kumar',
  driverPhone = '+91 98765 00003',
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [pricing, setPricing] = useState<PricingCalculationResult | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fac, sp, price] = await Promise.all([
          client.facilities.get(facilityId).catch(() => null),
          client.spaces.get(spaceId).catch(() => null),
          client.bookings.calculatePricing({ spaceId, startsAt, endsAt }),
        ]);
        setFacility(fac);
        setSpace(sp);
        setPricing(price);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to calculate booking breakdown.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [facilityId, spaceId, startsAt, endsAt]);

  const handleConfirmAndLock = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Step 1: Acquire ephemeral 10-minute hold lease
      const hold = await client.bookings.hold({ spaceId, startsAt, endsAt });

      // Step 2: Navigate to processing screen with hold ID
      onNavigate(
        `/book/processing?facilityId=${facilityId}&spaceId=${spaceId}&startsAt=${encodeURIComponent(
          startsAt
        )}&endsAt=${encodeURIComponent(endsAt)}&plate=${encodeURIComponent(
          plate
        )}&category=${category}&holdId=${hold.id}&method=${selectedPayment}&driverName=${encodeURIComponent(
          driverName
        )}&driverPhone=${encodeURIComponent(driverPhone)}`
      );
    } catch (err: any) {
      if (err?.statusCode === 409 || err?.status === 409) {
        // Concurrency Collision! Navigate directly to recovery screen
        onNavigate(
          `/book/recovery?spaceId=${spaceId}&facilityId=${facilityId}&startsAt=${encodeURIComponent(
            startsAt
          )}&endsAt=${encodeURIComponent(endsAt)}`
        );
      } else {
        setErrorMsg(err?.message || 'Could not acquire hold lease on this stall. Please choose another.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startFormatted = new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endFormatted = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = new Date(startsAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() =>
              onNavigate(
                `/book/vehicle?facilityId=${facilityId}&spaceId=${spaceId}&startsAt=${encodeURIComponent(
                  startsAt
                )}&endsAt=${encodeURIComponent(endsAt)}`
              )
            }
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Vehicle Details
          </button>
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_04_05
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Review Reservation &amp; Breakdown
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Review complete booking specifications and verified commercial tariff breakdown before reserving.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Reservation Specs */}
          <div className="md:col-span-2 space-y-6">
            {/* Booking Details Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#344054] uppercase tracking-wider">
                Parking Itinerary
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#E4E7EC] text-xs">
                <div>
                  <span className="text-[#667085] block">Facility &amp; Location:</span>
                  <span className="font-bold text-[#141B2C] text-sm block mt-0.5">
                    {facility?.name || 'Anna Nagar Plaza Parking'}
                  </span>
                  <span className="text-[#667085] block mt-0.5">
                    {facility?.addressLine1 || '2nd Avenue, Anna Nagar East, Chennai'}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block">Reserved Bay:</span>
                  <span className="font-extrabold text-[#0F766E] text-sm block mt-0.5">
                    {space?.bayIdentifier || 'Bay A-04'} ({space?.floorLevel || 'Ground Level'})
                  </span>
                  <span className="text-[#667085] block mt-0.5">
                    Clearance: {space?.maxHeightMeters || 2.4}m • {space?.vehicleCategory || 'Car'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#E4E7EC] text-xs">
                <div>
                  <span className="text-[#667085] block">Arrival &amp; Departure:</span>
                  <span className="font-bold text-[#141B2C] block mt-0.5">
                    {dateFormatted}
                  </span>
                  <span className="font-semibold text-[#0F766E] block mt-0.5">
                    {startFormatted} → {endFormatted} ({pricing?.durationHours || 3} Hours)
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block">Registered Vehicle:</span>
                  <span className="font-mono font-bold text-[#141B2C] text-sm block mt-0.5">
                    {plate}
                  </span>
                  <span className="text-[#667085] block mt-0.5 capitalize">
                    {category} • Driver: {driverName}
                  </span>
                </div>
              </div>

              {/* Concurrency Buffer Notice */}
              <div className="bg-[#E6F7F4] border border-[#BCE8E0] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#0F766E]">
                <span className="text-base">🛡️</span>
                <div>
                  <strong className="block font-bold">15-Minute Inter-Booking Turnaround Guarantee</strong>
                  This stall is protected by an automatic 15-minute clearance buffer on both ends. Double-bookings are mathematically excluded.
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#344054] uppercase tracking-wider">
                Select Payment Channel
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'upi', label: 'UPI / QR', desc: 'Google Pay, PhonePe, Paytm', icon: '📱' },
                  { id: 'card', label: 'Cards', desc: 'Visa, Mastercard, RuPay', icon: '💳' },
                  { id: 'netbanking', label: 'Net Banking', desc: 'All Major Indian Banks', icon: '🏦' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedPayment(m.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPayment === m.id
                        ? 'border-[#0F766E] bg-[#E6F7F4] ring-1 ring-[#0F766E]'
                        : 'border-[#E4E7EC] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="text-xl mb-1">{m.icon}</div>
                    <div className="text-xs font-bold text-[#141B2C]">{m.label}</div>
                    <div className="text-[11px] text-[#667085] mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Price Breakdown & CTA */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#344054] uppercase tracking-wider">
                Price Breakdown
              </h2>

              <div className="space-y-2 text-xs text-[#667085]">
                <div className="flex justify-between">
                  <span>Base Rate ({pricing?.durationHours || 3}h × ₹{pricing?.hourlyRateInr || 40})</span>
                  <span className="font-semibold text-[#141B2C]">₹{pricing?.baseAmountInr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Service Fee (15%)</span>
                  <span className="font-semibold text-[#141B2C]">₹{pricing?.platformFeeInr.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (18% on fees)</span>
                  <span className="font-semibold text-[#141B2C]">₹{pricing?.taxInr.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-[#E4E7EC] flex justify-between text-base font-extrabold text-[#141B2C]">
                  <span>Total Payable</span>
                  <span className="text-[#0F766E]">₹{pricing?.totalAmountInr.toFixed(2)}</span>
                </div>
              </div>

              {/* Cancellation Policy Pill */}
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E4E7EC] text-[11px] text-[#475467] space-y-1">
                <strong className="block text-[#141B2C]">Cancellation Policy</strong>
                <p>• 100% refund up to 2 hours before scheduled arrival</p>
                <p>• 80% refund if cancelled under 2 hours (20% host retainer)</p>
              </div>

              {errorMsg && (
                <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-3 rounded-xl text-xs font-semibold">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* CTA Button */}
              <button
                disabled={submitting}
                onClick={handleConfirmAndLock}
                className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-[#94A3B8] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Locking Exclusive Bay...</span>
                  </>
                ) : (
                  <>
                    <span>Lock Space &amp; Confirm</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-[#667085] text-center">
                Ephemeral 10-Minute Hold Lease automatically secures your bay while processing.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
