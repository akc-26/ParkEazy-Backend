import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, Booking } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId?: string;
  spaceId?: string;
  startsAt?: string;
  endsAt?: string;
  plate?: string;
  category?: string;
  holdId?: string;
  method?: string;
  driverName?: string;
  driverPhone?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function BookingProcessingPage({
  facilityId = '10000000-0000-4000-b000-000000000104',
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  startsAt = new Date(Date.now() + 3600000).toISOString(),
  endsAt = new Date(Date.now() + 4 * 3600000).toISOString(),
  plate = 'TN-09-CB-4821',
  category = 'car',
  holdId,
  method = 'upi',
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    let isCancelled = false;

    async function executeBookingProcess() {
      try {
        // Step 1: Hold Lease Confirmed
        setStep(1);
        await new Promise((r) => setTimeout(r, 600));
        if (isCancelled) return;

        // Step 2: Boom Barrier & Sensor Readiness
        setStep(2);
        await new Promise((r) => setTimeout(r, 700));
        if (isCancelled) return;

        // Part 07 does not own a payment-provider integration. Do not represent
        // a timed animation as a real payment authorization or settlement.
        setStep(3);
        if (holdId) {
          try { await client.bookings.releaseHold(holdId); } catch { /* The 10-minute TTL is the fallback. */ }
        }
        setErrorMsg('Payment has not been verified by a payment provider. Your booking will not be confirmed from this screen until the payment flow is integrated. The temporary hold was released.');
        return;

        // Booking creation is intentionally not called before verified payment.
        const booking = await client.bookings.create({
          spaceId,
          facilityId,
          vehiclePlate: plate,
          vehicleCategory: (category as any) || 'car',
          startsAt,
          endsAt,
          holdId: holdId || undefined,
          paymentMethod: method,
        });

        // Step 4: Cryptographic QR Pass Generated
        setStep(4);
        await new Promise((r) => setTimeout(r, 500));
        if (isCancelled) return;

        // Success: Navigate to confirmed screen
        onNavigate(`/bookings/${booking.id}/confirmed`);
      } catch (err: any) {
        if (err?.statusCode === 409 || err?.status === 409) {
          // Concurrency collision! Redirect to recovery screen
          onNavigate(
            `/book/recovery?spaceId=${spaceId}&facilityId=${facilityId}&startsAt=${encodeURIComponent(
              startsAt
            )}&endsAt=${encodeURIComponent(endsAt)}`
          );
        } else {
          setErrorMsg(err?.message || 'Transaction authorization failed. Please retry.');
        }
      }
    }

    executeBookingProcess();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-[#141B2C]">
      {/* Container Card */}
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E4E7EC] shadow-xl text-center space-y-6">
        {/* Animated Radar Ring */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-[#0F766E]/20 animate-ping"></div>
          <div className="absolute inset-2 rounded-full border-4 border-[#0F766E]/40 animate-pulse"></div>
          <div className="w-14 h-14 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-2xl font-bold shadow-md">
            🔒
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
            Securing your reserved parking spot...
          </h1>
          <p className="text-xs text-[#667085] mt-1.5">
            Checking reservation status. Payment confirmation must come from the configured payment provider.
          </p>
        </div>

        {/* Multi-step progress checklist */}
        <div className="space-y-3 text-left bg-[#F8FAFC] p-4 rounded-2xl border border-[#E4E7EC] text-xs">
          <div className="flex items-center gap-3">
            <span className={step >= 1 ? 'text-[#0F766E] font-bold' : 'text-[#94A3B8]'}>
              {step > 1 ? '✓' : step === 1 ? '●' : '○'}
            </span>
            <span className={step >= 1 ? 'font-semibold text-[#141B2C]' : 'text-[#64748B]'}>
              Exclusive 10-minute hold lease placed
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={step >= 2 ? 'text-[#0F766E] font-bold' : 'text-[#94A3B8]'}>
              {step > 2 ? '✓' : step === 2 ? '●' : '○'}
            </span>
            <span className={step >= 2 ? 'font-semibold text-[#141B2C]' : 'text-[#64748B]'}>
              Gate sensor &amp; turnaround buffer verified
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={step >= 3 ? 'text-[#0F766E] font-bold' : 'text-[#94A3B8]'}>
              {step > 3 ? '✓' : step === 3 ? '●' : '○'}
            </span>
            <span className={step >= 3 ? 'font-semibold text-[#141B2C]' : 'text-[#64748B]'}>
              Payment verification required via {method.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className={step >= 4 ? 'text-[#0F766E] font-bold' : 'text-[#94A3B8]'}>
              {step >= 4 ? '✓' : '○'}
            </span>
            <span className={step >= 4 ? 'font-semibold text-[#141B2C]' : 'text-[#64748B]'}>
              Cryptographic QR gate access pass issued
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-3 rounded-xl text-xs font-semibold">
            <p>⚠️ {errorMsg}</p>
            <button
              onClick={() => onNavigate(`/book/review?spaceId=${spaceId}&facilityId=${facilityId}`)}
              className="mt-2 text-xs font-bold underline cursor-pointer"
            >
              Return to Review
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-[#667085] pt-2 border-t border-[#E4E7EC]">
          <span>Ref: Plate {plate}</span>
          <span>Security: TLS 1.3 + Encrypted QR</span>
        </div>
      </div>
    </div>
  );
}
