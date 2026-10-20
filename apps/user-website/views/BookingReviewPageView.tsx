import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Car,
  KeyRound,
  CheckCircle2,
  Calendar,
  Zap,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  BookingHold,
  ParkingLocation,
  ParkingBay,
  SessionUser,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface BookingReviewPageViewProps {
  searchParams: URLSearchParams;
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast?: (type: ToastType, message: string, title?: string) => void;
}

export const BookingReviewPageView: React.FC<BookingReviewPageViewProps> = ({
  searchParams,
  onNavigate,
  onOpenAuthModal,
  currentUser,
  showToast,
}) => {
  const holdId = searchParams.get('holdId') || '';
  const initialLocationId = searchParams.get('locationId') || '';
  const initialBayId = searchParams.get('bayId') || '';

  const [hold, setHold] = useState<BookingHold | null>(null);
  const [location, setLocation] = useState<ParkingLocation | null>(null);
  const [bay, setBay] = useState<ParkingBay | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isHoldExpired, setIsHoldExpired] = useState(false);
  const [licensePlate, setLicensePlate] = useState('7XYZ890');
  const [plateError, setPlateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Hold, Location, and Bay
  const loadBookingData = useCallback(async () => {
    if (!holdId) {
      setErrorMessage('No reservation hold identifier provided. Please select a parking space first.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch Authoritative Hold from backend
      const fetchedHold = await apiClient.getHold(holdId);
      setHold(fetchedHold);

      const expiresAt = new Date(fetchedHold.holdExpiresAtUtc).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        setIsHoldExpired(true);
      }

      // 2. Fetch Location
      const targetLocId = fetchedHold.locationId || initialLocationId;
      if (targetLocId) {
        const fetchedLocation = await apiClient.getLocation(targetLocId);
        setLocation(fetchedLocation);
      }

      // 3. Fetch Bay
      const targetBayId = fetchedHold.bayId || initialBayId;
      if (targetLocId && targetBayId) {
        const bays = await apiClient.getBays(targetLocId);
        const matchedBay = bays.find((b) => b.id === targetBayId) || null;
        setBay(matchedBay);
      }

      setIsLoading(false);
    } catch (err: any) {
      const code = err.code;
      if (code === 'HOLD_EXPIRED') {
        setIsHoldExpired(true);
        setErrorMessage('The 10-minute hold reservation has expired on the server. Please re-select your parking bay.');
      } else {
        setErrorMessage(err.message || 'Unable to load booking hold details.');
      }
      setIsLoading(false);
    }
  }, [holdId, initialLocationId, initialBayId]);

  useEffect(() => {
    loadBookingData();
  }, [loadBookingData]);

  // Live Synchronized Countdown Timer
  useEffect(() => {
    if (!hold || isHoldExpired) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(hold.holdExpiresAtUtc).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        setIsHoldExpired(true);
        clearInterval(interval);
        if (showToast) {
          showToast(
            'warning',
            'Your 10-minute hold reservation has expired. Please re-select a parking space.',
            'Hold Expired'
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hold, isHoldExpired, showToast]);

  // Format time countdown MM:SS
  const timerFormatted = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, [remainingSeconds]);

  // Format date helper
  const formatUtcDate = (isoString?: string, timezone = 'America/Los_Angeles') => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: timezone,
      }).format(d);
    } catch {
      return new Date(isoString).toLocaleString();
    }
  };

  // Validate license plate
  const validatePlate = (val: string) => {
    const cleaned = val.trim().toUpperCase();
    if (!cleaned) {
      setPlateError('License plate is required for security verification.');
      return false;
    }
    if (cleaned.length < 2 || cleaned.length > 12) {
      setPlateError('License plate must be between 2 and 12 characters.');
      return false;
    }
    const regex = /^[A-Z0-9\-\s]{2,12}$/;
    if (!regex.test(cleaned)) {
      setPlateError('License plate can only contain letters, numbers, and hyphens.');
      return false;
    }
    setPlateError(null);
    return true;
  };

  // Continue to Checkout
  const handleProceedToCheckout = () => {
    if (isHoldExpired) {
      if (showToast) {
        showToast('error', 'Hold has expired. Please return to Space Details to re-select.', 'Expired Hold');
      }
      return;
    }

    if (!validatePlate(licensePlate)) {
      return;
    }

    if (!currentUser) {
      if (showToast) {
        showToast('info', 'Please sign in to finalize your booking checkout.', 'Sign In Required');
      }
      onOpenAuthModal();
      return;
    }

    onNavigate(
      `/checkout?holdId=${hold?.holdId}&plate=${encodeURIComponent(licensePlate.trim().toUpperCase())}`
    );
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="h-48 bg-slate-200 rounded-2xl" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
          </div>
          <div className="lg:col-span-5 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error / Invalid Hold State
  if (errorMessage && !hold) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h1 className="text-2xl font-extrabold text-[#162A2D]">
            Reservation Hold Unavailable
          </h1>
          <p className="text-sm text-slate-600">
            {errorMessage}
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate(location?.id ? `/spaces/${location.id}` : '/search')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Select Available Parking Space</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('/')}
          >
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const quote = hold?.quoteSnapshot;
  const isTimeCritical = remainingSeconds <= 120 && !isHoldExpired;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => onNavigate('/search')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Spaces
        </button>
        <span>/</span>
        {location && (
          <>
            <button
              type="button"
              onClick={() => onNavigate(`/spaces/${location.id}`)}
              className="hover:text-[#087E8A] transition-colors truncate max-w-[180px]"
            >
              {location.name}
            </button>
            <span>/</span>
          </>
        )}
        <span className="font-semibold text-slate-800">Booking Review</span>
      </nav>

      {/* Header and Countdown Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authoritative Server Hold</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
            Review Your Reservation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hold ID: <code className="font-mono font-bold text-slate-700">{hold?.holdId}</code> · Verified against authoritative backend quote snapshot.
          </p>
        </div>

        {/* Live Synchronized Hold Timer */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            isHoldExpired
              ? 'bg-red-50 border-red-200 text-red-800'
              : isTimeCritical
              ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <Clock className={`w-5 h-5 shrink-0 ${isHoldExpired ? 'text-red-600' : isTimeCritical ? 'text-amber-600' : 'text-emerald-600'}`} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider">
              {isHoldExpired ? 'Hold Status' : 'Temporary Hold Timer'}
            </div>
            <div className="text-lg font-mono font-extrabold tabular-nums">
              {isHoldExpired ? 'EXPIRED' : timerFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Hold Expiration Warning Banner if Expired */}
      {isHoldExpired && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-900">
                10-Minute Hold Window Expired
              </div>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                To guarantee zero double-bookings, parking holds expire after 600 seconds. Please return to Space Details to re-select this bay.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            themeContext="user"
            size="sm"
            onClick={() => onNavigate(location?.id ? `/spaces/${location.id}` : '/search')}
            className="shrink-0 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Select Bay</span>
          </Button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Location, Bay & Vehicle Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Parking Location & Bay Entity Card */}
          <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-1">
                  Location & Discrete Bay
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {location?.name || 'ParkEazy Parking Facility'}
                </h2>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {location?.address.line1}, {location?.address.city}, {location?.address.state} {location?.address.postalCode}
                  </span>
                </p>
              </div>
              <Badge variant="success">Verified Facility</Badge>
            </div>

            {/* Bay Specification Strip */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Assigned Bay
                </div>
                <div className="text-sm font-bold text-[#087E8A] mt-0.5">
                  Bay {bay?.bayNumber || 'Standard'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {bay?.levelOrFloor ? `Level ${bay.levelOrFloor}` : 'Ground'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Bay Type
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  {bay?.isEvCharging && <Zap className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{bay?.bayType?.replace('_', ' ') || 'Standard'}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {bay?.isEvCharging ? `${bay.evChargerKw || 7.4}kW Level 2` : 'General parking'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Max Clearance
                </div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {bay?.maxVehicleHeightMeters ? `${bay.maxVehicleHeightMeters}m clearance` : 'Standard clearance'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {bay?.hasCctv ? 'CCTV Covered' : 'Well-lit'}
                </div>
              </div>
            </div>

            {/* Time Slot Schedule */}
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reserved Timeframe</span>
                </div>
                <div className="text-xs text-slate-700">
                  <span className="font-semibold">Start:</span> {formatUtcDate(hold?.startTimeUtc, location?.timezone)}
                </div>
                <div className="text-xs text-slate-700">
                  <span className="font-semibold">End:</span> {formatUtcDate(hold?.endTimeUtc, location?.timezone)}
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-teal-200/80 sm:pl-4">
                <div className="text-[11px] text-slate-500 font-medium">Total Duration</div>
                <div className="text-base font-bold text-[#087E8A]">
                  {(hold?.quoteSnapshot.durationMinutes || 0) / 60} Hours
                </div>
                <div className="text-[10px] text-slate-500">30-min precision</div>
              </div>
            </div>
          </section>

          {/* Vehicle License Plate Registration */}
          <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[#087E8A]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Vehicle Registration (Required)
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the license plate of the vehicle that will park in this bay. This is required for gate PIN access verification and automated CCTV parking enforcement.
            </p>

            <div className="max-w-md space-y-2">
              <label htmlFor="licensePlate" className="block text-xs font-semibold text-slate-700">
                License Plate Number
              </label>
              <div className="relative">
                <input
                  id="licensePlate"
                  type="text"
                  maxLength={12}
                  value={licensePlate}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setLicensePlate(val);
                    validatePlate(val);
                  }}
                  placeholder="e.g. 7XYZ890"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono uppercase font-bold tracking-wider transition-colors ${
                    plateError
                      ? 'border-red-400 bg-red-50/30 text-red-900 focus:ring-red-200'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#087E8A] focus:ring-2 focus:ring-teal-100'
                  }`}
                />
              </div>
              {plateError && (
                <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{plateError}</span>
                </div>
              )}
            </div>

            {currentUser && (
              <div className="text-xs text-slate-500">
                Driver account: <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.email})
              </div>
            )}
          </section>

          {/* Cancellation Terms & Security Policy */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cancellation & Access Policy
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tier: {quote?.cancellationPolicyTier || 'STANDARD_48H'}</span>
                </div>
                <span>
                  Free cancellation up to 48 hours prior to start time. Security deposit is 100% refundable upon cancellation.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#087E8A]" />
                  <span>Digital Access Pass</span>
                </div>
                <span>
                  Authoritative gate PIN / access pass instructions are generated upon verified payment confirmation.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Authoritative Itemized Quote Breakdown */}
        <aside className="lg:col-span-5 sticky top-24 space-y-5">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-md space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-1">
                Authoritative Pricing
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Itemized Price Breakdown
              </h2>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Quote ID: <span className="font-mono text-slate-700">{quote?.quoteId}</span>
              </div>
            </div>

            {quote ? (
              <div className="space-y-3 text-xs">
                {/* Base Parking Rate */}
                <div className="flex justify-between text-slate-600">
                  <div>
                    <span className="font-medium text-slate-800">Base Parking</span>
                    <div className="text-[11px] text-slate-500">
                      {quote.durationMinutes / 60} hours @ ${(location?.hourlyRateCents || 650) / 100}/h
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    ${(quote.baseAmountCents / 100).toFixed(2)}
                  </span>
                </div>

                {/* Platform Fee 15% */}
                <div className="flex justify-between text-slate-600">
                  <div>
                    <span className="font-medium text-slate-800">Platform Service Fee</span>
                    <div className="text-[11px] text-slate-500">15% platform infrastructure & support</div>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    ${(quote.platformFeeCents / 100).toFixed(2)}
                  </span>
                </div>

                {/* Taxes 10% */}
                <div className="flex justify-between text-slate-600">
                  <div>
                    <span className="font-medium text-slate-800">Estimated Taxes</span>
                    <div className="text-[11px] text-slate-500">10% municipal parking surcharge</div>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    ${(quote.taxesCents / 100).toFixed(2)}
                  </span>
                </div>

                {/* Refundable Escrow Deposit */}
                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 space-y-1">
                  <div className="flex justify-between text-slate-800">
                    <span className="font-bold flex items-center gap-1.5 text-[#075762]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Segregated Escrow Deposit</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      ${(quote.securityDepositCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Held in a dedicated, segregated escrow account. Isolated from platform commission and host earnings. Automatically released post-checkout.
                  </p>
                </div>

                {/* Total Payable */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Total Payable Amount</div>
                    <div className="text-[11px] text-slate-500">Includes parking, taxes & refundable deposit</div>
                  </div>
                  <div className="text-2xl font-extrabold text-[#087E8A] font-mono tabular-nums">
                    ${(quote.totalPayableCents / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-4">
                Quote details not available.
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                themeContext="user"
                className="w-full justify-center gap-2 py-3 text-sm font-bold shadow-sm"
                disabled={isHoldExpired}
                onClick={handleProceedToCheckout}
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-1.5"
                onClick={() => {
                  onNavigate(location?.id ? `/spaces/${location.id}` : '/search');
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Booking Details</span>
              </Button>
            </div>

            {/* Security Guarantee Invariant */}
            <div className="text-[11px] text-slate-500 text-center leading-normal">
              🔒 Authoritative price lock guaranteed for the duration of the 10-minute hold.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
