import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  UserAccount,
  Booking,
  PricingCalculationResult,
  ReservationHold,
} from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  facilityIdParam?: string;
  spaceIdParam?: string;
  startsAtParam?: string;
  endsAtParam?: string;
  plateParam?: string;
  categoryParam?: string;
}

export function CustomerBookingCheckoutPage({
  currentUser,
  onNavigate,
  onLogout,
  facilityIdParam = '10000000-0000-4000-b000-000000000104',
  spaceIdParam = '10000000-0000-4000-b000-000000000104-01',
  startsAtParam,
  endsAtParam,
  plateParam = 'TN-09-CB-4821',
  categoryParam = 'car',
}: Props) {
  const { tenant } = useBrand();

  const [step, setStep] = useState<'review' | 'payment' | 'processing' | 'confirmed'>('review');
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [vehiclePlate, setVehiclePlate] = useState(plateParam);
  const [vehicleCategory] = useState<'car' | 'bike' | 'auto' | 'suv'>((categoryParam as any) || 'car');
  const [pricing, setPricing] = useState<PricingCalculationResult | null>(null);
  const [hold, setHold] = useState<ReservationHold | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const now = Date.now();
  const startsAt = startsAtParam || new Date(now + 60 * 60 * 1000).toISOString();
  const endsAt = endsAtParam || new Date(now + 3 * 60 * 60 * 1000).toISOString();

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    // 1. Calculate pricing
    client.bookings
      .calculatePricing({
        spaceId: spaceIdParam,
        startsAt,
        endsAt,
      })
      .then((res) => {
        setPricing(res);
        // 2. Request ephemeral hold lease to lock the bay
        return client.bookings.hold({
          spaceId: spaceIdParam,
          startsAt,
          endsAt,
        });
      })
      .then((h) => setHold(h))
      .catch((err) => {
        console.warn('Hold notice:', err.message);
      });
  }, [spaceIdParam, startsAt, endsAt]);

  const handlePayAndConfirm = async () => {
    setErrorMsg(null);
    setStep('processing');

    try {
      // Payment provider integration belongs to Part 08. Do not create a
      // confirmed booking or show a success state until the provider returns
      // an authoritative verified payment result.
      setStep('payment');
      if (hold?.id) {
        try { await client.bookings.releaseHold(hold.id); } catch { /* TTL expiry remains the final fallback. */ }
        setHold(null);
      }
      setErrorMsg('Secure payment processing is not configured yet. Your reservation has not been confirmed and you have not been charged. The temporary hold was released; retry after payment integration is enabled.');
      return;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Payment authorization failed. Please retry.');
      setStep('payment');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E7EC] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="font-extrabold text-lg text-[#101828]">
              {tenant.displayName} Checkout
            </span>
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E] bg-[#E6F7F4] px-3 py-1 rounded-full">
            <span>🔒 256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {step === 'confirmed' && confirmedBooking ? (
          /* CONFIRMED SCREEN (booking_confirmed_pe_uw_04_07) */
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#A7F3D0] shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center text-3xl mx-auto mb-4 border border-[#A7F3D0]">
                ✓
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E6F7F4] text-[#0F766E] uppercase tracking-wider">
                Booking Confirmed & Guaranteed
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans'] mt-2">
                Your Parking Bay is Secured!
              </h1>
              <p className="text-sm text-[#475467] mt-1">
                Booking Reference:{' '}
                <strong className="text-[#101828] font-mono text-base">
                  {confirmedBooking.bookingReference}
                </strong>
              </p>

              {/* Digital Access Pass Card */}
              <div className="mt-8 max-w-md mx-auto bg-[#F8FAFC] border-2 border-dashed border-[#0F766E]/40 rounded-3xl p-6 text-left relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Assigned Stall
                    </span>
                    <strong className="text-2xl font-black text-[#0F766E]">
                      Bay A-04
                    </strong>
                    <span className="text-xs text-[#64748B] block">Ground Level</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Vehicle Plate
                    </span>
                    <strong className="text-base font-mono font-bold text-[#101828]">
                      {confirmedBooking.vehiclePlate}
                    </strong>
                  </div>
                </div>

                {/* QR Access Token simulation */}
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="w-40 h-40 bg-white p-3 rounded-2xl border border-[#CBD5E1] shadow-xs flex items-center justify-center">
                    <div className="w-full h-full bg-[#101828] rounded-xl flex flex-col items-center justify-center text-white p-2 text-center">
                      <span className="text-2xl mb-1">🏁</span>
                      <span className="font-mono text-[10px] break-all leading-tight">
                        {confirmedBooking.qrAccessToken}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-[#2DD4BF] mt-1 font-bold">
                        SCAN AT BARRIER
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748B] mt-2 font-medium">
                    Show QR code at boom barrier scanner or entry gate
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#64748B] block">Arrival:</span>
                    <strong className="text-[#101828]">
                      {new Date(confirmedBooking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Departure:</span>
                    <strong className="text-[#101828]">
                      {new Date(confirmedBooking.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => onNavigate('/bookings')}
                  className="px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-sm cursor-pointer shadow-sm transition-all"
                >
                  View in My Bookings
                </button>
                <button
                  onClick={() => onNavigate(`/bookings/${confirmedBooking.id}/active`)}
                  className="px-6 py-3 rounded-xl bg-white border border-[#D0D5DD] hover:bg-[#F9FAFB] text-[#344054] font-semibold text-sm cursor-pointer shadow-xs transition-all"
                >
                  Open Active Session Pass
                </button>
              </div>
            </div>
          </div>
        ) : step === 'processing' ? (
          /* PROCESSING SCREEN (booking_processing_pe_uw_04_06) */
          <div className="bg-white rounded-3xl p-12 border border-[#E4E7EC] text-center max-w-md mx-auto shadow-sm">
            <div className="w-16 h-16 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-extrabold text-[#101828]">Authorizing Payment & Booking...</h2>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Locking parking space, creating gate access tokens, and verifying payment with gateway. Please do not close this window.
            </p>
          </div>
        ) : (
          /* STEP 1 & 2: REVIEW & PAYMENT (review_booking_price_breakdown_pe_uw_04_05 & choose_payment_method_pe_uw_05_01) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Booking summary & Payment selection */}
            <div className="md:col-span-2 space-y-6">
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Reservation summary card */}
              <div className="bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#E4E7EC] mb-4">
                  <h2 className="text-base font-bold text-[#101828]">Reservation Details</h2>
                  <span className="text-xs font-semibold text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                    Bay A-04 Reserved
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="text-[#64748B]">Facility:</span>
                    <strong className="text-[#101828] text-right font-semibold">
                      Anna Nagar Plaza Covered Parking
                    </strong>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#64748B]">Location:</span>
                    <span className="text-[#101828] text-right">
                      2nd Avenue, Near Roundtana, Anna Nagar East
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Schedule:</span>
                    <span className="text-[#101828] font-medium">
                      {new Date(startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                      {new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                      {new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({pricing?.durationHours || 2}h)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Vehicle Registration:</span>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="px-2.5 py-1 rounded-lg border border-[#D0D5DD] font-mono text-xs font-bold uppercase text-[#101828]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector (choose_payment_method_pe_uw_05_01) */}
              <div className="bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-xs">
                <h2 className="text-base font-bold text-[#101828] mb-4">Select Payment Method</h2>
                <div className="space-y-3">
                  <label
                    onClick={() => setSelectedMethod('upi')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedMethod === 'upi'
                        ? 'border-[#0F766E] bg-[#F0FDFA]'
                        : 'border-[#E4E7EC] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-[#101828]">UPI Instant Pay</strong>
                          <span className="text-[10px] bg-[#12B76A] text-white font-bold px-2 py-0.5 rounded-full">
                            Fastest
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B]">Google Pay, PhonePe, Paytm, BHIM</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedMethod === 'upi'}
                      onChange={() => setSelectedMethod('upi')}
                      className="w-4 h-4 text-[#0F766E]"
                    />
                  </label>

                  <label
                    onClick={() => setSelectedMethod('card')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedMethod === 'card'
                        ? 'border-[#0F766E] bg-[#F0FDFA]'
                        : 'border-[#E4E7EC] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <strong className="text-sm text-[#101828]">Credit or Debit Card</strong>
                        <p className="text-xs text-[#64748B]">Visa, MasterCard, RuPay</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedMethod === 'card'}
                      onChange={() => setSelectedMethod('card')}
                      className="w-4 h-4 text-[#0F766E]"
                    />
                  </label>

                  <label
                    onClick={() => setSelectedMethod('netbanking')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedMethod === 'netbanking'
                        ? 'border-[#0F766E] bg-[#F0FDFA]'
                        : 'border-[#E4E7EC] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏛️</span>
                      <div>
                        <strong className="text-sm text-[#101828]">Net Banking</strong>
                        <p className="text-xs text-[#64748B]">SBI, HDFC, ICICI, Axis, and 50+ Banks</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedMethod === 'netbanking'}
                      onChange={() => setSelectedMethod('netbanking')}
                      className="w-4 h-4 text-[#0F766E]"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Pricing Breakdown Review */}
            <div>
              <div className="bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-md sticky top-24">
                <h3 className="text-sm font-bold text-[#101828] pb-3 border-b border-[#E4E7EC] mb-4">
                  Payment Summary
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#475467]">
                    <span>Parking Fee ({pricing?.durationHours || 2}h)</span>
                    <span>₹{pricing?.baseAmountInr || 80}</span>
                  </div>
                  <div className="flex justify-between text-[#475467]">
                    <span>Platform Service Fee</span>
                    <span>₹{pricing?.platformFeeInr || 12}</span>
                  </div>
                  <div className="flex justify-between text-[#475467]">
                    <span>Goods & Services Tax (GST 18%)</span>
                    <span>₹{pricing?.taxInr || 16.56}</span>
                  </div>
                  <div className="pt-3 border-t border-[#E4E7EC] flex justify-between items-center text-sm">
                    <strong className="text-[#101828]">Total Amount</strong>
                    <strong className="text-2xl font-black text-[#0F766E] font-['Plus_Jakarta_Sans']">
                      ₹{pricing?.totalAmountInr || 108.56}
                    </strong>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handlePayAndConfirm}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-sm tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Pay ₹{pricing?.totalAmountInr || 108.56} & Confirm</span>
                  </button>
                  <p className="text-[11px] text-center text-[#64748B] mt-3">
                    Guaranteed slot held for 10 minutes. Fully refundable cancellation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
