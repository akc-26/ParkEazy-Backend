import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Clock,
  Car,
  MapPin,
  Building2,
  Info,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient, ApiError } from '../../../packages/api-client';
import {
  BookingHold,
  ParkingLocation,
  ParkingBay,
  SessionUser,
  BookingSummary,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface CheckoutPageViewProps {
  searchParams: URLSearchParams;
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast?: (type: ToastType, message: string, title?: string) => void;
}

export const CheckoutPageView: React.FC<CheckoutPageViewProps> = ({
  searchParams,
  onNavigate,
  onOpenAuthModal,
  currentUser,
  showToast,
}) => {
  const holdId = searchParams.get('holdId') || '';
  const initialPlate = searchParams.get('plate') || '';

  const [hold, setHold] = useState<BookingHold | null>(null);
  const [location, setLocation] = useState<ParkingLocation | null>(null);
  const [bay, setBay] = useState<ParkingBay | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isHoldExpired, setIsHoldExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment form state
  const [selectedProvider, setSelectedProvider] = useState<'MOCK_PAYMENT' | 'STRIPE' | 'RAZORPAY'>('MOCK_PAYMENT');
  const [cardName, setCardName] = useState(
    currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Alex Morgan'
  );
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [licensePlate, setLicensePlate] = useState(initialPlate || '7XYZ890');

  // Checkout submission states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [ambiguousTransactionId, setAmbiguousTransactionId] = useState<string | null>(null);

  // Stable idempotency key for this checkout transaction (retained on retries)
  const idempotencyKeyRef = useRef<string>(
    'idemp_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36)
  );

  // Load hold and related entities
  const loadCheckoutData = useCallback(async () => {
    if (!holdId) {
      setErrorMessage('No booking hold found. Please return to Space Details to select an available bay.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fetchedHold = await apiClient.getHold(holdId);
      setHold(fetchedHold);

      const expiresAt = new Date(fetchedHold.holdExpiresAtUtc).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        setIsHoldExpired(true);
      }

      if (fetchedHold.locationId) {
        const fetchedLoc = await apiClient.getLocation(fetchedHold.locationId);
        setLocation(fetchedLoc);

        if (fetchedHold.bayId) {
          const bays = await apiClient.getBays(fetchedHold.locationId);
          setBay(bays.find((b) => b.id === fetchedHold.bayId) || null);
        }
      }

      setIsLoading(false);
    } catch (err: any) {
      if (err.code === 'HOLD_EXPIRED') {
        setIsHoldExpired(true);
        setErrorMessage('The 10-minute hold reservation has expired. Please re-select your parking space.');
      } else {
        setErrorMessage(err.message || 'Unable to retrieve hold reservation details.');
      }
      setIsLoading(false);
    }
  }, [holdId]);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  // Sync card name with currentUser if changed
  useEffect(() => {
    if (currentUser && !cardName) {
      setCardName(`${currentUser.firstName} ${currentUser.lastName}`.trim());
    }
  }, [currentUser, cardName]);

  // Hold Countdown
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
          showToast('error', 'The 10-minute hold has expired. Please re-select a bay.', 'Hold Expired');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hold, isHoldExpired, showToast]);

  const timerFormatted = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, [remainingSeconds]);

  // Authoritative Payment and Idempotent Booking Confirmation
  const handlePayAndConfirm = async () => {
    if (isHoldExpired) {
      setPaymentError('The reservation hold has expired. Please re-select your parking bay.');
      return;
    }

    if (!currentUser) {
      if (showToast) {
        showToast('info', 'Please sign in or register to complete your reservation.', 'Sign In Required');
      }
      onOpenAuthModal();
      return;
    }

    if (!hold) return;

    setIsProcessing(true);
    setPaymentError(null);

    const idempotencyKey = idempotencyKeyRef.current;
    const totalAmount = hold.quoteSnapshot.totalPayableCents;

    try {
      // Step 1: Create Server Payment Intent via active Payment Adapter
      const paymentIntent = await apiClient.createPaymentIntent({
        amountCents: totalAmount,
        currency: hold.quoteSnapshot.currency || 'USD',
        bookingId: hold.holdId,
        idempotencyKey,
        provider: selectedProvider,
      });

      if (!paymentIntent || !paymentIntent.success || paymentIntent.status !== 'SUCCEEDED') {
        const errorMsg =
          paymentIntent?.errorMessage ||
          `Payment could not be processed (status: ${paymentIntent?.status || 'UNKNOWN'}).`;
        setPaymentError(errorMsg);
        setIsProcessing(false);
        if (showToast) {
          showToast('error', errorMsg, 'Payment Failed');
        }
        return;
      }

      const transactionId = paymentIntent.transactionId;
      setAmbiguousTransactionId(transactionId);

      // Step 2: Authoritative Booking Confirmation and Ledger Invariant Posting
      const confirmedBooking: BookingSummary = await apiClient.confirmBooking({
        holdId: hold.holdId,
        paymentIntentId: transactionId,
        idempotencyKey,
        licensePlate: licensePlate.trim().toUpperCase() || '7XYZ890',
        paymentMethod: selectedProvider,
        provider: selectedProvider,
      });

      if (showToast) {
        showToast(
          'success',
          `Reservation ${confirmedBooking.id} confirmed! Gate PIN issued.`,
          'Payment Confirmed'
        );
      }

      // Step 3: Transition to Booking Confirmation Screen
      onNavigate(`/booking/confirmation/${confirmedBooking.id}`);
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during payment verification.';
      setPaymentError(errMsg);
      if (showToast) {
        showToast('error', errMsg, 'Checkout Error');
      }
      setIsProcessing(false);
    }
  };

  // Reconcile ambiguous transaction status before offering retry
  const handleReconcilePayment = async () => {
    if (!ambiguousTransactionId) return;
    setIsProcessing(true);
    try {
      const statusRes = await apiClient.getPaymentStatus(ambiguousTransactionId);
      if (statusRes.status === 'SUCCEEDED') {
        // Safe to retry confirmation with same key
        await handlePayAndConfirm();
      } else {
        setPaymentError(`Transaction status is ${statusRes.status}: ${statusRes.errorMessage || 'Try again.'}`);
        setIsProcessing(false);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Unable to reconcile payment status with gateway.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-5 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (errorMessage && !hold) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h1 className="text-2xl font-extrabold text-[#162A2D]">
            Checkout Unavailable
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
            <span>Select Available Space</span>
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
          onClick={() => onNavigate('/booking/review' + (hold ? `?holdId=${hold.holdId}` : ''))}
          className="hover:text-[#087E8A] transition-colors"
        >
          Review
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Checkout & Payment</span>
      </nav>

      {/* Header & Lock Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Idempotent Checkout</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
            Checkout & Payment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative Server Price Lock · Hold ID: <code className="font-mono font-bold text-slate-700">{hold?.holdId}</code>
          </p>
        </div>

        {/* Live Hold Countdown */}
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
              {isHoldExpired ? 'Lock Status' : 'Time Remaining to Pay'}
            </div>
            <div className="text-lg font-mono font-extrabold tabular-nums">
              {isHoldExpired ? 'EXPIRED' : timerFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Error Callout if Payment Fails */}
      {paymentError && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-red-900">Payment Could Not Be Finalized</div>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{paymentError}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-8">
            <Button
              variant="primary"
              themeContext="user"
              size="sm"
              onClick={ambiguousTransactionId ? handleReconcilePayment : handlePayAndConfirm}
              isLoading={isProcessing}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Payment</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/booking/review?holdId=${hold?.holdId}`)}
            >
              Back to Review
            </Button>
          </div>
        </div>
      )}

      {/* Hold Expired Warning */}
      {isHoldExpired && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-amber-900">Hold Expired During Checkout</div>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                To prevent duplicate reservations, your temporary hold has timed out. Please re-select this bay to establish a new hold.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            themeContext="user"
            size="sm"
            onClick={() => onNavigate(location?.id ? `/spaces/${location.id}` : '/search')}
            className="shrink-0"
          >
            Re-Select Bay
          </Button>
        </div>
      )}

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Payment Form & Gateway Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Payment Method Selector */}
          <section className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-0.5">
                  Secure Payment Gateway
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Select Payment Method
                </h2>
              </div>
              <Badge variant="info">SSL / TLS 256-Bit</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Mock Sandbox */}
              <button
                type="button"
                onClick={() => setSelectedProvider('MOCK_PAYMENT')}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 ${
                  selectedProvider === 'MOCK_PAYMENT'
                    ? 'border-[#087E8A] bg-teal-50/50 ring-2 ring-[#087E8A]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="w-5 h-5 text-[#087E8A]" />
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                    SANDBOX
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Mock Payment</div>
                  <div className="text-[11px] text-slate-500">Zero external fee · Instant settlement</div>
                </div>
              </button>

              {/* Option 2: Stripe */}
              <button
                type="button"
                onClick={() => setSelectedProvider('STRIPE')}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 ${
                  selectedProvider === 'STRIPE'
                    ? 'border-[#087E8A] bg-teal-50/50 ring-2 ring-[#087E8A]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                    STRIPE
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Credit / Debit Card</div>
                  <div className="text-[11px] text-slate-500">Visa, Mastercard, Amex</div>
                </div>
              </button>

              {/* Option 3: Razorpay */}
              <button
                type="button"
                onClick={() => setSelectedProvider('RAZORPAY')}
                className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 ${
                  selectedProvider === 'RAZORPAY'
                    ? 'border-[#087E8A] bg-teal-50/50 ring-2 ring-[#087E8A]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                    UPI / NET
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Razorpay</div>
                  <div className="text-[11px] text-slate-500">UPI, NetBanking & Cards</div>
                </div>
              </button>
            </div>

            {/* Simulated test helper banner */}
            {selectedProvider === 'MOCK_PAYMENT' && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#087E8A]" />
                  <span>Deterministic Sandbox Testing Mode</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Enter any test details. Test amounts with end digits <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">99999</code> trigger a simulated Card Decline; end digits <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">99998</code> trigger a Gateway Timeout.
                </p>
              </div>
            )}

            {/* Cardholder Input Fields */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cardholder Full Name
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-[#087E8A] focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:border-[#087E8A] focus:ring-2 focus:ring-teal-100"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:border-[#087E8A] focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:border-[#087E8A] focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Double-Entry Escrow Invariant Explanation */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#087E8A]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Segregated Escrow & Ledger Invariant
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your security deposit is tracked in an append-only double-entry ledger (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">SECURITY_DEPOSIT_ESCROW</code>) completely segregated from platform fees (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">PLATFORM_COMMISSION_REVENUE</code>) and host payouts (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">HOST_PAYABLE</code>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero platform revenue commingling</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automated refund release post-checkout</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Final Order Summary & Payment Button */}
        <aside className="lg:col-span-5 sticky top-24 space-y-5">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-md space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-1">
                Final Order Summary
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Reservation Details
              </h2>
            </div>

            {/* Compact Space & Bay Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900">
                {location?.name}
              </div>
              <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{location?.address.line1}, {location?.address.city}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-700">
                <span>Physical Bay:</span>
                <span className="font-bold text-[#087E8A]">Bay {bay?.bayNumber || 'Standard'}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Vehicle Plate:</span>
                <span className="font-mono font-bold text-slate-900">{licensePlate}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Duration:</span>
                <span className="font-medium text-slate-900">{(quote?.durationMinutes || 0) / 60} Hours</span>
              </div>
            </div>

            {/* Itemized Calculation */}
            {quote && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base Parking Fee:</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    ${(quote.baseAmountCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Platform Fee (15%):</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    ${(quote.platformFeeCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes (10%):</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    ${(quote.taxesCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Refundable Security Deposit:</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    ${(quote.securityDepositCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Total Payable Amount</div>
                    <div className="text-[10px] text-slate-500">Authorized by active hold</div>
                  </div>
                  <div className="text-2xl font-extrabold text-[#087E8A] font-mono tabular-nums">
                    ${(quote.totalPayableCents / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <div className="pt-2 space-y-3">
              <Button
                variant="primary"
                themeContext="user"
                className="w-full justify-center gap-2 py-3 text-sm font-bold shadow-sm"
                isLoading={isProcessing}
                disabled={isHoldExpired}
                onClick={handlePayAndConfirm}
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'Processing Payment & Hold Invariant...'
                    : `Pay $${((quote?.totalPayableCents || 0) / 100).toFixed(2)} & Confirm`}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-1.5"
                disabled={isProcessing}
                onClick={() => onNavigate(`/booking/review?holdId=${hold?.holdId}`)}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Review</span>
              </Button>
            </div>

            <div className="text-[10px] text-slate-500 text-center leading-relaxed">
              Cryptographic idempotency protection enabled. Submitting twice will not create duplicate charges or double bookings.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
