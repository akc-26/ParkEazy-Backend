import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Clock,
  Car,
  Zap,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Info,
  Lock,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  ParkingLocation,
  ParkingBay,
  BookingHold,
  BayStatus,
  BayType,
  SessionUser,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface SpaceDetailsPageViewProps {
  spaceId: string;
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast: (type: ToastType, message: string, title?: string) => void;
}

export const SpaceDetailsPageView: React.FC<SpaceDetailsPageViewProps> = ({
  spaceId,
  onNavigate,
  showToast,
}) => {
  const [location, setLocation] = useState<ParkingLocation | null>(null);
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [selectedBayId, setSelectedBayId] = useState<string>('');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [activeHold, setActiveHold] = useState<BookingHold | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  // 1. Fetch location and discrete physical bays from real backend endpoints
  const fetchSpaceData = useCallback(() => {
    setIsLoading(true);
    setErrorMsg(null);

    Promise.all([
      apiClient.getLocation(spaceId),
      apiClient.getBays(spaceId),
    ])
      .then(([loc, fetchedBays]) => {
        setLocation(loc);
        setBays(fetchedBays);
        // Default to first available bay
        const firstAvailable = fetchedBays.find((b) => b.status === BayStatus.AVAILABLE);
        if (firstAvailable) {
          setSelectedBayId(firstAvailable.id);
        } else if (fetchedBays.length > 0) {
          setSelectedBayId(fetchedBays[0].id);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Parking space not found.');
        setIsLoading(false);
      });
  }, [spaceId]);

  useEffect(() => {
    fetchSpaceData();
  }, [fetchSpaceData]);

  // 2. Active Hold Countdown Timer (Persistent 10-Minute Lock)
  useEffect(() => {
    if (!activeHold) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(activeHold.holdExpiresAtUtc).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        setActiveHold(null);
        showToast('warning', 'Your 10-minute hold has expired. Please re-select a bay.', 'Hold Expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold, showToast]);

  // Format seconds into MM:SS
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 3. Initiate Real Booking Hold via POST /api/v1/bookings/hold
  const handleInitiateHold = async () => {
    if (!location || !selectedBayId) return;
    const selectedBay = bays.find((b) => b.id === selectedBayId);
    if (!selectedBay) return;

    if (selectedBay.status !== BayStatus.AVAILABLE) {
      setHoldError(`Bay ${selectedBay.bayNumber} is not currently available for reservation.`);
      return;
    }

    setIsHolding(true);
    setHoldError(null);

    const durationMinutes = Math.round(durationHours * 60);

    try {
      const hold = await apiClient.createHold({
        bayId: selectedBay.id,
        locationId: location.id,
        durationMinutes,
      });

      setActiveHold(hold);
      setRemainingSeconds(hold.holdDurationSeconds || 600);
      showToast(
        'success',
        `Bay ${selectedBay.bayNumber} locked for 10 minutes. Hold ID: ${hold.holdId}`,
        'Bay Hold Established'
      );
    } catch (err: any) {
      const msg = err.message || 'Failed to establish bay hold on server.';
      setHoldError(msg);
      showToast('error', msg, 'Hold Failed');
    } finally {
      setIsHolding(false);
    }
  };

  // 4. Rate Calculations
  const selectedBay = useMemo(() => {
    return bays.find((b) => b.id === selectedBayId) || null;
  }, [bays, selectedBayId]);

  const pricing = useMemo(() => {
    if (!location) return { hourly: 0, subtotal: 0, deposit: 0, fee: 0, taxes: 0, total: 0 };
    const hourly = location.hourlyRateCents / 100;
    const subtotal = hourly * durationHours;
    const deposit = location.securityDepositCents / 100;
    const fee = subtotal * 0.15;
    const taxes = subtotal * 0.1;
    const total = subtotal + deposit + fee + taxes;

    return {
      hourly: hourly.toFixed(2),
      subtotal: subtotal.toFixed(2),
      deposit: deposit.toFixed(2),
      fee: fee.toFixed(2),
      taxes: taxes.toFixed(2),
      total: total.toFixed(2),
    };
  }, [location, durationHours]);

  // Loading State
  if (isLoading) {
    return (
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-96 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-8 bg-slate-200 rounded w-2/3" />
            <div className="h-32 bg-slate-200 rounded-xl" />
          </div>
          <div className="lg:col-span-4 h-80 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (errorMsg || !location) {
    return (
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-extrabold text-[#162A2D]">
            Parking Location Not Found
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            No facility matches identifier <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{spaceId}</code>. It may have been renamed or suspended by platform operations.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button
            variant="primary"
            themeContext="user"
            size="sm"
            onClick={() => onNavigate('/search')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Search Spaces</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSpaceData}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  const availableBaysCount = bays.filter((b) => b.status === BayStatus.AVAILABLE).length;

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* 1. Breadcrumb Bar */}
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
        <span className="font-semibold text-slate-800 truncate max-w-[200px]">
          {location.name}
        </span>
      </nav>

      {/* 2. Top Location Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Verified Marketplace Inventory
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-[#087E8A] border border-teal-200">
              {location.accessMethod.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {location.id}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
            {location.name}
          </h1>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {location.address.line1}, {location.address.city}, {location.address.state} {location.address.postalCode}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">{location.timezone}</span>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <div className="text-2xl font-extrabold text-[#162A2D] font-mono tabular-nums">
            ${pricing.hourly}
            <span className="text-sm font-normal text-slate-500 font-sans"> / hour</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
            ${(location.dailyRateCents / 100).toFixed(2)} daily cap · ${pricing.deposit} deposit
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Details & Bays (8 cols) vs Sticky Hold Module (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Photo Showcase, Invariants, Bays List & Policies */}
        <div className="lg:col-span-8 space-y-8">
          {/* Facility Photography Showcase */}
          <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
            {!imageError ? (
              <img
                src={location.imageUrl}
                alt={location.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.includes('/src/assets/images/')) {
                    target.src = target.src.replace('/src/assets/images/', '/assets/images/');
                  } else {
                    setImageError(true);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-800 text-white text-center">
                <Building2 className="w-12 h-12 text-teal-400 mb-2" />
                <div className="font-bold text-sm">{location.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{location.address.line1}</div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5 sm:p-6 text-white pointer-events-none">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>24/7 Monitored Access · {availableBaysCount} of {bays.length} Bays Available</span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-1">
                  {location.description}
                </p>
              </div>
            </div>
          </div>

          {/* 3-Pillar Invariants Bento Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#087E8A] flex items-center justify-center mb-2.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">
                10-Minute Hold Lock
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Server-side temporary reservation locks the physical bay so no other driver can claim it.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#087E8A] flex items-center justify-center mb-2.5">
                <Car className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">
                Discrete Bay Assignment
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                You reserve an exact physical bay (e.g. Bay B2-30) rather than a general parking quota.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#087E8A] flex items-center justify-center mb-2.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">
                Segregated Escrow
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Security deposit is isolated in a separate ledger and automatically released post-checkout.
              </p>
            </div>
          </div>

          {/* Discrete Physical Bays Selection Section */}
          <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-0.5">
                  Discrete Bay Verification
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Select a Physical Parking Bay ({availableBaysCount} Available)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Connected to <code className="font-mono text-slate-700">/api/v1/inventory/locations/:id/bays</code>
              </span>
            </div>

            {bays.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No physical bays registered for this facility.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {bays.map((bay) => {
                  const isAvailable = bay.status === BayStatus.AVAILABLE;
                  const isSelected = selectedBayId === bay.id;

                  return (
                    <button
                      key={bay.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedBayId(bay.id);
                        setHoldError(null);
                      }}
                      className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-3 ${
                        isSelected && isAvailable
                          ? 'border-[#087E8A] bg-teal-50/50 ring-2 ring-[#087E8A]'
                          : isAvailable
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                          : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <span>Bay {bay.bayNumber}</span>
                            {isSelected && isAvailable && (
                              <CheckCircle2 className="w-4 h-4 text-[#087E8A]" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {bay.levelOrFloor ? `${bay.levelOrFloor} · ` : ''}
                            {bay.bayType.replace('_', ' ')}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800'
                              : bay.status === BayStatus.HELD
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isAvailable ? 'Available' : bay.status}
                        </span>
                      </div>

                      {/* Specs Strip */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100/80">
                        {bay.isEvCharging && (
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Zap className="w-3.5 h-3.5" />
                            <span>{bay.evChargerKw ? `${bay.evChargerKw}kW EV` : 'EV Equipped'}</span>
                          </span>
                        )}
                        {bay.maxVehicleHeightMeters && (
                          <span>Max Height: {bay.maxVehicleHeightMeters}m</span>
                        )}
                        {bay.hasCctv && <span>· CCTV</span>}
                        {bay.notes && (
                          <span className="text-slate-400 italic">· {bay.notes}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Access Procedure & Security Policy */}
          <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Access Instructions & Security Policy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <div className="font-bold text-slate-800 mb-1">
                  Access Method: {location.accessMethod.replace('_', ' ')}
                </div>
                <p>
                  {location.accessInstructions ||
                    'Detailed gate PIN instructions will be provided on your digital access pass once your booking is confirmed.'}
                </p>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-1">
                  Amenities Included
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {location.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-medium text-[11px]"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Sticky Interactive Hold & Quote Module */}
        <aside className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-5">
            {/* Header of Hold Card */}
            <div>
              <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-1">
                Reservation & Quote
              </div>
              <h2 className="text-xl font-extrabold text-[#162A2D]">
                {activeHold ? 'Bay Hold Active' : 'Hold Your Space'}
              </h2>
            </div>

            {/* Error Banner */}
            {holdError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{holdError}</span>
              </div>
            )}

            {/* If Active Hold is Established */}
            {activeHold ? (
              <div className="space-y-4">
                {/* 10-Minute Countdown Banner */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Authoritative Server Lock Active
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">
                    {formatSeconds(remainingSeconds)}
                  </div>
                  <p className="text-[11px] text-emerald-600">
                    Bay {selectedBay?.bayNumber} is reserved. Complete checkout before timer expires.
                  </p>
                </div>

                {/* Quote Breakdown */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Hold Reference:</span>
                    <span className="font-mono text-slate-900 font-semibold">{activeHold.holdId}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Selected Bay:</span>
                    <span className="font-semibold text-slate-900">Bay {selectedBay?.bayNumber}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Duration:</span>
                    <span className="font-semibold text-slate-900">{durationHours} Hours</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                    <span>Base Parking:</span>
                    <span className="font-mono text-slate-900">${(activeHold.quoteSnapshot.baseAmountCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee (15%):</span>
                    <span className="font-mono text-slate-900">${(activeHold.quoteSnapshot.platformFeeCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxes (10%):</span>
                    <span className="font-mono text-slate-900">${(activeHold.quoteSnapshot.taxesCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Refundable Escrow Deposit:</span>
                    <span className="font-mono text-slate-900">${(activeHold.quoteSnapshot.securityDepositCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                    <span>Total Payable:</span>
                    <span className="font-mono">${(activeHold.quoteSnapshot.totalPayableCents / 100).toFixed(2)}</span>
                  </div>
                </div>

                {/* Hold Action CTAs */}
                <div className="space-y-2 pt-1">
                  <Button
                    variant="primary"
                    themeContext="user"
                    className="w-full justify-center gap-2 py-2.5"
                    onClick={() => {
                      onNavigate(
                        `/booking/review?holdId=${activeHold.holdId}&bayId=${activeHold.bayId}&locationId=${activeHold.locationId}`
                      );
                    }}
                  >
                    <span>Proceed to Booking Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      setActiveHold(null);
                      showToast('info', 'Hold released. You may select another bay.', 'Hold Cleared');
                    }}
                  >
                    Release Hold & Change Bay
                  </Button>
                </div>
              </div>
            ) : (
              /* If No Hold Active Yet: Configuration & Trigger */
              <div className="space-y-4">
                {/* Selected Bay Confirmation */}
                <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#087E8A]" />
                    <span className="font-semibold text-slate-800">
                      {selectedBay ? `Bay ${selectedBay.bayNumber}` : 'No Bay Selected'}
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-800 font-medium">
                    {selectedBay?.bayType.replace('_', ' ') || 'Select Bay'}
                  </span>
                </div>

                {/* Duration Picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Booking Duration (1h – 72h)
                  </label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                  >
                    <option value={1}>1.0 Hour (Minimum)</option>
                    <option value={1.5}>1.5 Hours</option>
                    <option value={2}>2.0 Hours</option>
                    <option value={3}>3.0 Hours</option>
                    <option value={4}>4.0 Hours (Half Day)</option>
                    <option value={8}>8.0 Hours (Full Day)</option>
                    <option value={24}>24 Hours (Overnight)</option>
                    <option value={48}>48 Hours (2 Days)</option>
                    <option value={72}>72 Hours (Max Bound)</option>
                  </select>
                </div>

                {/* Live Quote Breakdown */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Parking ({durationHours}h @ ${pricing.hourly}/h):</span>
                    <span className="font-mono text-slate-900 tabular-nums">${pricing.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee (15%):</span>
                    <span className="font-mono text-slate-900 tabular-nums">${pricing.fee}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Taxes (10%):</span>
                    <span className="font-mono text-slate-900 tabular-nums">${pricing.taxes}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Refundable Deposit (Escrow):</span>
                    <span className="font-mono text-slate-900 tabular-nums">${pricing.deposit}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                    <span>Estimated Total:</span>
                    <span className="font-mono tabular-nums">${pricing.total}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Initiates an authoritative 10-minute hold lock (`POST /api/v1/bookings/hold`) to guarantee physical bay identity.
                  </span>
                </div>

                {/* Primary Hold Button */}
                <Button
                  variant="primary"
                  themeContext="user"
                  className="w-full justify-center gap-2 py-2.5 font-bold"
                  isLoading={isHolding}
                  disabled={!selectedBay || selectedBay.status !== BayStatus.AVAILABLE}
                  onClick={handleInitiateHold}
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Bay for 10 Minutes</span>
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
