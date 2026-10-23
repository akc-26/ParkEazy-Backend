import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  ArrowRight,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Car,
  Filter,
  ArrowUpDown,
  FileText,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  BookingSummary,
  BookingStatus,
  SessionUser,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface MyBookingsPageViewProps {
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  showToast?: (type: ToastType, message: string, title?: string) => void;
}

type BookingFilterTab = 'all' | 'upcoming' | 'active' | 'completed' | 'cancelled';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export const MyBookingsPageView: React.FC<MyBookingsPageViewProps> = ({
  onNavigate,
  onOpenAuthModal,
  currentUser,
  showToast,
}) => {
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookingFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState<BookingSummary | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await apiClient.getBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[MyBookings] Fetch error:', err);
      setLoadError(err.message || 'Unable to retrieve your reservations. Please check your network and retry.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Handle cancelling a reservation
  const handleCancelReservation = async (booking: BookingSummary) => {
    setCancellingId(booking.id);
    try {
      await apiClient.cancelBooking(booking.id);
      showToast?.(
        'success',
        `Reservation ${booking.id} has been cancelled successfully.`,
        'Booking Cancelled'
      );
      setConfirmCancelBooking(null);
      await fetchBookings();
    } catch (err: any) {
      console.error('[MyBookings] Cancel error:', err);
      showToast?.(
        'error',
        err.message || 'Failed to cancel reservation.',
        'Cancellation Failed'
      );
    } finally {
      setCancellingId(null);
    }
  };

  // Helper to categorize booking status
  const getBookingCategory = (booking: BookingSummary): BookingFilterTab => {
    const now = new Date();
    const start = new Date(booking.startTimeUtc);
    const end = new Date(booking.endTimeUtc);

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.OVERSTAYED || booking.status === BookingStatus.DISPUTED) {
      return 'cancelled';
    }
    if (booking.status === BookingStatus.COMPLETED || end < now) {
      return 'completed';
    }
    if (booking.status === BookingStatus.ACTIVE || (booking.status === BookingStatus.CONFIRMED && now >= start && now <= end)) {
      return 'active';
    }
    return 'upcoming';
  };

  // Filtered and sorted bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter((b) => getBookingCategory(b) === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.locationName.toLowerCase().includes(q) ||
          (b.locationAddress && b.locationAddress.toLowerCase().includes(q)) ||
          b.bayNumber.toLowerCase().includes(q) ||
          (b.licensePlate && b.licensePlate.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const timeA = new Date(a.startTimeUtc).getTime();
      const timeB = new Date(b.startTimeUtc).getTime();
      const priceA = a.quote?.totalPayableCents ?? 0;
      const priceB = b.quote?.totalPayableCents ?? 0;

      switch (sortBy) {
        case 'date-asc':
          return timeA - timeB;
        case 'date-desc':
          return timeB - timeA;
        case 'amount-desc':
          return priceB - priceA;
        case 'amount-asc':
          return priceA - priceB;
        default:
          return timeB - timeA;
      }
    });

    return result;
  }, [bookings, activeTab, searchQuery, sortBy]);

  // Tab counts
  const counts = useMemo(() => {
    const res = {
      all: bookings.length,
      upcoming: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const b of bookings) {
      const cat = getBookingCategory(b);
      res[cat]++;
    }
    return res;
  }, [bookings]);

  // Status Badge Renderer
  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case BookingStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] border border-teal-200 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#087E8A]" />
            Active Now
          </span>
        );
      case BookingStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            Completed
          </span>
        );
      case BookingStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case BookingStatus.HOLD_PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Hold Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Format currency helper
  const formatAmount = (cents: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  // Format date helper
  const formatDateTimeRange = (startUtc: string, endUtc: string) => {
    const start = new Date(startUtc);
    const end = new Date(endUtc);

    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;

    return { dateStr, startTime, endTime, hours };
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
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
        <span className="font-semibold text-slate-800">My Bookings</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Customer Reservations & Passes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              My Bookings
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              View your active parking passes, upcoming reservations, entry PIN codes, and payment receipts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBookings}
              disabled={isLoading || !currentUser}
              className="inline-flex items-center gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              themeContext="user"
              size="sm"
              onClick={() => onNavigate('/search')}
              className="inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Parking</span>
            </Button>
          </div>
        </div>

        {/* User Session Bar */}
        {currentUser ? (
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#087E8A] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {currentUser.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <span className="font-bold text-slate-800">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
                <span className="text-slate-500 ml-2">({currentUser.email})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Total Recorded:</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {bookings.length} {bookings.length === 1 ? 'reservation' : 'reservations'}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Authentication Required</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please sign in with your customer account to view your reservations, gate PIN codes, and receipts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                themeContext="user"
                size="sm"
                onClick={onOpenAuthModal}
              >
                Sign In as Driver
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {currentUser && (
        <div className="space-y-6">
          {/* Controls: Filter Tabs, Search, and Sort */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-[#087E8A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>All Bookings</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'all' ? 'bg-teal-900/40 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {counts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'active'
                      ? 'bg-[#087E8A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>Active</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'active' ? 'bg-teal-900/40 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {counts.active}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'upcoming'
                      ? 'bg-[#087E8A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>Upcoming</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'upcoming' ? 'bg-teal-900/40 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {counts.upcoming}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'completed'
                      ? 'bg-[#087E8A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>Completed</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'completed' ? 'bg-teal-900/40 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {counts.completed}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cancelled')}
                  className={`px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'cancelled'
                      ? 'bg-[#087E8A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>Cancelled</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'cancelled' ? 'bg-teal-900/40 text-teal-100' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {counts.cancelled}
                  </span>
                </button>
              </div>

              {/* Search and Sort Toolbar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bookings or locations..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087E8A] focus:border-transparent transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#087E8A] text-slate-700 cursor-pointer"
                  >
                    <option value="date-desc">Date: Newest First</option>
                    <option value="date-asc">Date: Oldest First</option>
                    <option value="amount-desc">Amount: Highest First</option>
                    <option value="amount-asc">Amount: Lowest First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error State with Retry */}
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-red-900">Failed to Load Bookings</h3>
              <p className="text-xs text-red-700 max-w-md mx-auto">{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBookings}
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry Request
              </Button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && !loadError && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-slate-200 rounded" />
                      <div className="h-3 w-64 bg-slate-100 rounded" />
                    </div>
                    <div className="h-6 w-24 bg-slate-200 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    <div className="h-10 bg-slate-100 rounded" />
                    <div className="h-10 bg-slate-100 rounded" />
                    <div className="h-10 bg-slate-100 rounded" />
                    <div className="h-10 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !loadError && filteredBookings.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-teal-50 text-[#087E8A] flex items-center justify-center mx-auto shadow-xs">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {searchQuery
                    ? 'No matching reservations found'
                    : activeTab === 'all'
                    ? 'No bookings yet'
                    : `No ${activeTab} reservations`}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {searchQuery
                    ? `No reservations matched your query "${searchQuery}". Clear your search or filter to see more.`
                    : 'Browse thousands of guaranteed parking spaces, reserve a bay in seconds, and access with secure PIN codes.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                {searchQuery ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    themeContext="user"
                    size="sm"
                    onClick={() => onNavigate('/search')}
                    className="inline-flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Parking Spaces</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Bookings List */}
          {!isLoading && !loadError && filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const { dateStr, startTime, endTime, hours } = formatDateTimeRange(
                  booking.startTimeUtc,
                  booking.endTimeUtc
                );
                const isUpcoming = getBookingCategory(booking) === 'upcoming';
                const isActive = getBookingCategory(booking) === 'active';
                const isEligibleForAccess =
                  booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.ACTIVE;

                return (
                  <div
                    key={booking.id}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md ${
                      isActive
                        ? 'border-teal-400 ring-2 ring-teal-100 shadow-sm'
                        : 'border-slate-200'
                    } p-5 sm:p-6 space-y-5`}
                  >
                    {/* Top Row: Ref, Location, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {booking.id}
                          </span>
                          {renderStatusBadge(booking.status)}
                          {booking.bayNumber && (
                            <span className="text-xs font-semibold text-slate-700 bg-teal-50 text-[#087E8A] px-2 py-0.5 rounded border border-teal-200">
                              Bay: {booking.bayNumber}
                            </span>
                          )}
                          {booking.licensePlate && (
                            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                              <Car className="w-3 h-3 text-slate-400" />
                              {booking.licensePlate}
                            </span>
                          )}
                        </div>

                        <h2 className="text-lg font-bold text-[#162A2D] pt-1">
                          {booking.locationName}
                        </h2>

                        {booking.locationAddress && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{booking.locationAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Right side: Amount & Paid badge */}
                      <div className="sm:text-right shrink-0 space-y-1">
                        <div className="text-xl font-extrabold text-[#162A2D]">
                          {formatAmount(booking.quote.totalPayableCents, booking.quote.currency)}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center sm:justify-end gap-1">
                          <CreditCard className="w-3 h-3 text-emerald-600" />
                          <span className="font-medium text-emerald-700">
                            {booking.paymentDetails?.provider || 'Paid'}
                          </span>
                          {booking.paymentDetails?.paidAtUtc && (
                            <span>
                              · {new Date(booking.paymentDetails.paidAtUtc).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Schedule Info & Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Reservation Date
                        </span>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#087E8A]" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Reserved Time Slot
                        </span>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#087E8A]" />
                          <span>{startTime} – {endTime}</span>
                          <span className="text-slate-500">({hours}h)</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Access & Entry Pass
                        </span>
                        {isEligibleForAccess && booking.gateCode ? (
                          <div className="font-mono font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>{booking.gateCode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">
                            {booking.status === BookingStatus.CANCELLED
                              ? 'Pass revoked'
                              : 'Provided on confirmation'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Booked on {new Date(booking.createdAtUtc).toLocaleDateString()}</span>
                        {booking.quote.cancellationPolicyTier && (
                          <>
                            <span>·</span>
                            <span className="text-slate-600 font-medium">
                              Policy: {booking.quote.cancellationPolicyTier.replace('_', ' ')}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Cancellation action for upcoming bookings */}
                        {isUpcoming && booking.status !== BookingStatus.CANCELLED && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmCancelBooking(booking)}
                            disabled={cancellingId === booking.id}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        )}

                        {/* View Booking Details */}
                        <Button
                          variant="primary"
                          themeContext="user"
                          size="sm"
                          onClick={() => onNavigate(`/bookings/${booking.id}`)}
                          className="inline-flex items-center gap-1.5"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      {confirmCancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cancel Reservation?
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: {confirmCancelBooking.id}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your reservation at{' '}
              <strong className="text-slate-800">{confirmCancelBooking.locationName}</strong>?
              Your entry gate PIN will be deactivated and the reserved bay will be returned to inventory.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Refundable:</span>
                <span className="font-bold text-slate-900">
                  {formatAmount(
                    confirmCancelBooking.quote.totalPayableCents,
                    confirmCancelBooking.quote.currency
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cancellation Policy:</span>
                <span>{confirmCancelBooking.quote.cancellationPolicyTier || 'STANDARD_48H'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancelBooking(null)}
                disabled={cancellingId === confirmCancelBooking.id}
              >
                Keep Reservation
              </Button>
              <Button
                variant="primary"
                themeContext="user"
                size="sm"
                onClick={() => handleCancelReservation(confirmCancelBooking)}
                disabled={cancellingId === confirmCancelBooking.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {cancellingId === confirmCancelBooking.id ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
