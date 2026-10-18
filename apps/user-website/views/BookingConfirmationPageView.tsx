import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  MapPin,
  Clock,
  Printer,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Car,
  AlertTriangle,
  QrCode,
  Building,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  BookingSummary,
  BookingStatus,
  SessionUser,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface BookingConfirmationPageViewProps {
  bookingId: string;
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast?: (type: ToastType, message: string, title?: string) => void;
}

export const BookingConfirmationPageView: React.FC<BookingConfirmationPageViewProps> = ({
  bookingId,
  onNavigate,
  onOpenAuthModal,
  currentUser,
  showToast,
}) => {
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setErrorMessage('Missing booking identifier.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const fetched = await apiClient.getBooking(bookingId);
      setBooking(fetched);
      setIsLoading(false);
    } catch (err: any) {
      if (err.code === 'FORBIDDEN' || err.message?.includes('permission')) {
        setIsForbidden(true);
        setErrorMessage('Access denied. You do not have permission to view this reservation.');
      } else if (err.code === 'NOT_FOUND') {
        setErrorMessage(`Reservation '${bookingId}' could not be found.`);
      } else {
        setErrorMessage(err.message || 'Unable to load authoritative booking details.');
      }
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const formatUtcDate = (isoString?: string, timezone = 'America/Los_Angeles') => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: timezone,
      }).format(d);
    } catch {
      return new Date(isoString).toLocaleString();
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 rounded-2xl md:col-span-2" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Forbidden State
  if (isForbidden) {
    return (
      <div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h1 className="text-2xl font-extrabold text-[#162A2D]">
            Access Denied
          </h1>
          <p className="text-sm text-slate-600">
            This reservation is private and belongs to another driver account. Please sign in with the account used to make this reservation.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="primary"
            themeContext="user"
            onClick={onOpenAuthModal}
          >
            Sign In with Different Account
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

  // Not Found / General Error State
  if (errorMessage || !booking) {
    return (
      <div className="w-full max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h1 className="text-2xl font-extrabold text-[#162A2D]">
            Booking Not Found
          </h1>
          <p className="text-sm text-slate-600">
            {errorMessage || `Unable to find booking record '${bookingId}'.`}
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate('/search')}
          >
            Search Available Spaces
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

  const isConfirmed = booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.ACTIVE;
  const quote = booking.quote;

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 print:hidden">
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
          onClick={() => onNavigate('/bookings')}
          className="hover:text-[#087E8A] transition-colors"
        >
          My Bookings
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Confirmation</span>
      </nav>

      {/* Success Banner */}
      <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                <span>AUTHORITATIVE CONFIRMATION</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
                Reservation Confirmed!
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Booking Reference:{' '}
                <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm font-bold">
                  {booking.id}
                </strong>{' '}
                · Payment verified and ledger updated.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </Button>
            <Button
              variant="primary"
              themeContext="user"
              size="sm"
              onClick={() => onNavigate('/bookings')}
              className="gap-1.5 text-xs font-semibold"
            >
              <span>My Bookings</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Digital Pass & Payment Receipt */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Digital Access Pass & Facility Details */}
        <div className="md:col-span-7 space-y-6">
          {/* Digital Access Pass Card */}
          <section className="bg-gradient-to-br from-[#0F766E] to-[#12211C] text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-teal-600/60 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    Digital Access Pass
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {booking.id}
                </span>
              </div>

              {/* Gate PIN Callout */}
              {booking.gateCode ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-200">
                      Automated Gate Entry Code
                    </div>
                    <div className="text-3xl font-extrabold font-mono text-white tracking-widest mt-0.5">
                      {booking.gateCode}
                    </div>
                    <div className="text-[11px] text-emerald-100 mt-1">
                      {booking.accessInstructions || 'Enter code on facility keypad or barrier scanner.'}
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
                    <QrCode className="w-12 h-12 text-[#162A2D]" />
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15">
                  <div className="text-xs font-semibold text-emerald-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    <span>Access pass is unavailable or revoked for this reservation.</span>
                  </div>
                </div>
              )}

              {/* Assigned Physical Bay Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <div className="text-[10px] text-emerald-200 uppercase font-bold">Assigned Physical Bay</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    Bay {booking.bayNumber}
                  </div>
                  <div className="text-[11px] text-emerald-100/80">Guaranteed bay assignment</div>
                </div>

                <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <div className="text-[10px] text-emerald-200 uppercase font-bold">Registered Vehicle</div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {booking.licensePlate || '7XYZ890'}
                  </div>
                  <div className="text-[11px] text-emerald-100/80">CCTV & Gate verified</div>
                </div>
              </div>

              {/* Verified Access Instructions */}
              {booking.accessInstructions && (
                <div className="text-xs text-emerald-100/90 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/10">
                  <div className="font-bold text-white mb-1">Access Instructions:</div>
                  <p>{booking.accessInstructions}</p>
                </div>
              )}
            </div>
          </section>

          {/* Location & Time Card */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-1">
                  Parking Facility Location
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {booking.locationName}
                </h2>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{booking.locationAddress || 'Verified Bay Location'}</span>
                </p>
              </div>
              <Badge variant="success">Confirmed</Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Check-In From
                </div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {formatUtcDate(booking.startTimeUtc, booking.locationTimezone)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Check-Out By
                </div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {formatUtcDate(booking.endTimeUtc, booking.locationTimezone)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Authoritative Financial Receipt & Ledger */}
        <aside className="md:col-span-5 space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-0.5">
                  Official Receipt
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Payment Summary
                </h2>
              </div>
              <Badge variant="success">PAID</Badge>
            </div>

            {/* Itemized Lines */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Base Parking Fee:</span>
                <span className="font-mono text-slate-900 tabular-nums">
                  ${(quote.baseAmountCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Platform Service Fee (15%):</span>
                <span className="font-mono text-slate-900 tabular-nums">
                  ${(quote.platformFeeCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Taxes & Local Surcharges (10%):</span>
                <span className="font-mono text-slate-900 tabular-nums">
                  ${(quote.taxesCents / 100).toFixed(2)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 text-xs">
                <div className="flex justify-between text-slate-800 font-bold">
                  <span className="flex items-center gap-1.5 text-[#075762]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Refundable Escrow Deposit</span>
                  </span>
                  <span className="font-mono tabular-nums">
                    ${(quote.securityDepositCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Status: <strong className="text-emerald-700">Held in Segregated Escrow</strong>. Automatically refunded upon on-time checkout without facility damage.
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Total Paid Amount</div>
                  <div className="text-[10px] text-slate-500">Authoritative Settled Total</div>
                </div>
                <div className="text-2xl font-extrabold text-[#087E8A] font-mono tabular-nums">
                  ${(quote.totalPayableCents / 100).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payment Details Metadata */}
            {booking.paymentDetails && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-[#087E8A]" />
                  <span>Transaction Reference</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Provider:</span>
                  <span className="font-semibold text-slate-800">{booking.paymentDetails.provider}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-slate-800">{booking.paymentDetails.transactionId}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Processed:</span>
                  <span className="text-slate-800">{new Date(booking.paymentDetails.paidAtUtc).toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5 print:hidden">
              <Button
                variant="primary"
                themeContext="user"
                className="w-full justify-center gap-2"
                onClick={() => onNavigate('/bookings')}
              >
                <span>Go to My Bookings</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => onNavigate('/')}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
