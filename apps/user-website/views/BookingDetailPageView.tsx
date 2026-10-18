import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Car,
  Printer,
  KeyRound,
  QrCode,
  Building,
  DollarSign,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient, ApiError } from '../../../packages/api-client';
import {
  BookingSummary,
  BookingStatus,
  SessionUser,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface BookingDetailPageViewProps {
  bookingId: string;
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast?: (type: ToastType, message: string, title?: string) => void;
}

export const BookingDetailPageView: React.FC<BookingDetailPageViewProps> = ({
  bookingId,
  onNavigate,
  onOpenAuthModal,
  currentUser,
  showToast,
}) => {
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) {
      setErrorMessage('Missing booking reference identifier.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setErrorStatus(null);

    try {
      const data = await apiClient.getBooking(bookingId);
      setBooking(data);
    } catch (err: any) {
      console.error('[BookingDetails] Fetch error:', err);
      if (err instanceof ApiError) {
        if (err.code === 'FORBIDDEN' || err.message?.includes('denied') || err.message?.includes('permission')) {
          setErrorStatus(403);
          setErrorMessage('Access denied. You do not have permission to view this reservation.');
        } else if (err.code === 'NOT_FOUND') {
          setErrorStatus(404);
          setErrorMessage(`Reservation '${bookingId}' could not be found.`);
        } else if (err.code === 'UNAUTHORIZED') {
          setErrorStatus(401);
          setErrorMessage('Please sign in to view your reservation details.');
        } else {
          setErrorMessage(err.message || 'Unable to load booking details.');
        }
      } else {
        setErrorMessage(err.message || 'Network error loading booking details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const updated = await apiClient.cancelBooking(booking.id);
      setBooking(updated);
      setShowCancelModal(false);
      showToast?.('success', 'Your reservation has been cancelled.', 'Cancelled');
    } catch (err: any) {
      showToast?.('error', err.message || 'Failed to cancel reservation.', 'Cancellation Error');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatAmount = (cents: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  // Status Badge
  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed & Guaranteed
          </span>
        );
      case BookingStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] border border-teal-200 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#087E8A]" />
            Active Session
          </span>
        );
      case BookingStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            Completed
          </span>
        );
      case BookingStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const isEligibleForAccess =
    booking && (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.ACTIVE);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
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
          onClick={() => onNavigate('/bookings')}
          className="hover:text-[#087E8A] transition-colors"
        >
          My Bookings
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800 font-mono">
          {bookingId}
        </span>
      </nav>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Retrieving reservation details from ParkEazy...
          </p>
        </div>
      )}

      {/* 403 Forbidden State */}
      {!isLoading && errorStatus === 403 && (
        <div className="bg-white rounded-2xl border border-red-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <Lock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              Access Restricted
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              This reservation belongs to another customer account. You cannot view reservation details, gate passes, or receipts that do not belong to you.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              themeContext="user"
              size="sm"
              onClick={() => onNavigate('/bookings')}
            >
              Back to My Bookings
            </Button>
          </div>
        </div>
      )}

      {/* 404 Not Found State */}
      {!isLoading && errorStatus === 404 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              Reservation Not Found
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              No booking matched reference <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{bookingId}</code>. It may have been expired or does not exist.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              themeContext="user"
              size="sm"
              onClick={() => onNavigate('/bookings')}
            >
              View My Bookings
            </Button>
          </div>
        </div>
      )}

      {/* Generic Error / Unauthenticated State */}
      {!isLoading && errorMessage && errorStatus !== 403 && errorStatus !== 404 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-red-900">Unable to Display Reservation</h2>
          <p className="text-xs text-red-700 max-w-md mx-auto">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {!currentUser ? (
              <Button
                variant="primary"
                themeContext="user"
                size="sm"
                onClick={onOpenAuthModal}
              >
                Sign In
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBooking}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry Request
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/bookings')}
            >
              Back to Bookings
            </Button>
          </div>
        </div>
      )}

      {/* Main Booking Details Display */}
      {!isLoading && booking && (
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/bookings')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087E8A] hover:underline mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to My Bookings</span>
                </button>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight font-mono">
                    {booking.id}
                  </h1>
                  {renderStatusBadge(booking.status)}
                </div>
                <p className="text-xs text-slate-500">
                  Booked on {new Date(booking.createdAtUtc).toLocaleString()} · Timezone: {booking.locationTimezone || 'America/Los_Angeles'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </Button>

                {booking.status === BookingStatus.CONFIRMED && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelModal(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>

            {/* Access Pass Highlight Card */}
            {isEligibleForAccess && booking.gateCode ? (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#087E8A] text-white">
                    <KeyRound className="w-3 h-3" />
                    <span>Digital Entry Pass</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Your Bay Access PIN
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md">
                    {booking.accessInstructions ||
                      'Present this PIN at the facility entry keypad or barrier terminal to open gate.'}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-teal-200 shadow-xs shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Gate PIN Code
                    </span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-wider">
                      {booking.gateCode}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-700">
                    <QrCode className="w-8 h-8 text-[#087E8A]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {booking.status === BookingStatus.CANCELLED
                    ? 'Access pass revoked: This reservation has been cancelled and gate credentials deactivated.'
                    : booking.status === BookingStatus.COMPLETED
                    ? 'Access pass expired: Parking session has concluded.'
                    : 'Digital entry pass is generated upon authoritative reservation confirmation.'}
                </span>
              </div>
            )}
          </div>

          {/* Grid Layout: Location & Bay Details vs Payment & Quote */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Parking & Schedule Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Location & Bay Info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building className="w-4 h-4 text-[#087E8A]" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Facility & Bay Assignment
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-[#162A2D]">
                      {booking.locationName}
                    </h4>
                    {booking.locationAddress && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{booking.locationAddress}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned Bay
                      </span>
                      <span className="text-sm font-extrabold text-[#087E8A] mt-0.5 block">
                        {booking.bayNumber}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Registered Vehicle
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-800 mt-0.5 block">
                        {booking.licensePlate || 'Not Recorded'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Cancellation Policy
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                        {booking.quote?.cancellationPolicyTier || 'STANDARD_48H'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reservation Schedule */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Clock className="w-4 h-4 text-[#087E8A]" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Reservation Window
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Arrival (Start Time)
                    </span>
                    <span className="text-sm font-bold text-slate-900 block">
                      {new Date(booking.startTimeUtc).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Guaranteed spot reserved
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Departure (End Time)
                    </span>
                    <span className="text-sm font-bold text-slate-900 block">
                      {new Date(booking.endTimeUtc).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Duration: {booking.quote?.durationMinutes ? `${Math.round(booking.quote.durationMinutes / 60 * 10) / 10} hours` : 'Standard'}
                    </span>
                  </div>
                </div>

                {/* Additional timestamps if present */}
                {(booking.checkedInAtUtc || booking.checkedOutAtUtc) && (
                  <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-slate-700 flex flex-wrap gap-4">
                    {booking.checkedInAtUtc && (
                      <div>
                        <span className="font-semibold text-slate-500">Checked In:</span>{' '}
                        <span>{new Date(booking.checkedInAtUtc).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {booking.checkedOutAtUtc && (
                      <div>
                        <span className="font-semibold text-slate-500">Checked Out:</span>{' '}
                        <span>{new Date(booking.checkedOutAtUtc).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Price Breakdown & Payment Details */}
            <div className="space-y-6">
              {/* Payment Receipt */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Payment Receipt
                  </h3>
                </div>

                {/* Safe payment details (no sensitive credentials) */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Payment Status</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Paid & Verified
                    </span>
                  </div>

                  {booking.paymentDetails?.transactionId && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Transaction Ref</span>
                      <span className="font-mono text-slate-800 font-semibold truncate max-w-[150px]">
                        {booking.paymentDetails.transactionId}
                      </span>
                    </div>
                  )}

                  {booking.paymentDetails?.provider && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Payment Gateway</span>
                      <span className="font-semibold text-slate-800">
                        {booking.paymentDetails.provider}
                      </span>
                    </div>
                  )}

                  {booking.paymentDetails?.paidAtUtc && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Processed At</span>
                      <span className="text-slate-700">
                        {new Date(booking.paymentDetails.paidAtUtc).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Parking Subtotal</span>
                    <span>{formatAmount(booking.quote.baseAmountCents, booking.quote.currency)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Platform Service Fee</span>
                    <span>{formatAmount(booking.quote.platformFeeCents, booking.quote.currency)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Municipal Parking Taxes</span>
                    <span>{formatAmount(booking.quote.taxesCents, booking.quote.currency)}</span>
                  </div>

                  {booking.quote.securityDepositCents > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Refundable Deposit</span>
                      <span>{formatAmount(booking.quote.securityDepositCents, booking.quote.currency)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>Total Charged</span>
                    <span className="text-[#087E8A]">
                      {formatAmount(booking.quote.totalPayableCents, booking.quote.currency)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Secured by ParkEazy Escrow. Zero payment card details are stored or logged.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelModal && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cancel Reservation?
                </h3>
                <p className="text-xs text-slate-500">
                  {booking.id} · {booking.locationName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this reservation? The access PIN will be revoked immediately and the allocated parking bay released.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                No, Keep It
              </Button>
              <Button
                variant="primary"
                themeContext="user"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Reservation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
