import React, { useState, useEffect } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair, VehicleType } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { CustomerLandingPage } from './pages/CustomerLandingPage';
import { CustomerLoginPage } from './pages/CustomerLoginPage';
import { CustomerSignupPage } from './pages/CustomerSignupPage';
import { CustomerVerifyEmailPage } from './pages/CustomerVerifyEmailPage';
import { CustomerVerifyMobileOtpPage } from './pages/CustomerVerifyMobileOtpPage';
import { CustomerForgotPasswordPage } from './pages/CustomerForgotPasswordPage';
import { CustomerResetPasswordPage } from './pages/CustomerResetPasswordPage';
import { CustomerVerificationRequiredPage } from './pages/CustomerVerificationRequiredPage';
import { CustomerAuthErrorStatesPage } from './pages/CustomerAuthErrorStatesPage';
import { CustomerSessionExpiredPage } from './pages/CustomerSessionExpiredPage';
import { CustomerAccessSuccessPage } from './pages/CustomerAccessSuccessPage';

// PH06: Availability, Search & Discovery Pages (8 authoritative screens)
import { ExploreParkingPage } from './pages/ExploreParkingPage';
import { LocationSearchSuggestionsPage } from './pages/LocationSearchSuggestionsPage';
import { SearchFiltersPreferencesPage } from './pages/SearchFiltersPreferencesPage';
import { SearchResultsListMapPage } from './pages/SearchResultsListMapPage';
import { SearchResultsListViewPage } from './pages/SearchResultsListViewPage';
import { SearchResultsMapViewPage } from './pages/SearchResultsMapViewPage';
import { NoResultsAlternativeSuggestionsPage } from './pages/NoResultsAlternativeSuggestionsPage';
import { SearchLoadingPermissionStatesPage } from './pages/SearchLoadingPermissionStatesPage';
import { ParkingFacilityDetailPage } from './pages/ParkingFacilityDetailPage';
import { CustomerBookingCheckoutPage } from './pages/CustomerBookingCheckoutPage';
import { CustomerMyBookingsPage } from './pages/CustomerMyBookingsPage';
import { CustomerActiveBookingPage } from './pages/CustomerActiveBookingPage';
import { CustomerProfileVehiclesPage } from './pages/CustomerProfileVehiclesPage';

// PH07: Booking Lifecycle & Concurrency Safeguards (18 authoritative screens)
import { ParkingDetailsBookingSummaryPage } from './pages/ParkingDetailsBookingSummaryPage';
import { SelectParkingDateDurationPage } from './pages/SelectParkingDateDurationPage';
import { AvailabilitySpaceSelectionPage } from './pages/AvailabilitySpaceSelectionPage';
import { BookingDetailsVehiclePage } from './pages/BookingDetailsVehiclePage';
import { ReviewBookingPriceBreakdownPage } from './pages/ReviewBookingPriceBreakdownPage';
import { BookingProcessingPage } from './pages/BookingProcessingPage';
import { BookingConfirmedPage } from './pages/BookingConfirmedPage';
import { BookingUnavailableRecoveryPage } from './pages/BookingUnavailableRecoveryPage';
import { BookingValidationExpiryStatesPage } from './pages/BookingValidationExpiryStatesPage';
import { ActiveParkingSessionPage } from './pages/ActiveParkingSessionPage';
import { ExtendParkingDurationPage } from './pages/ExtendParkingDurationPage';
import { UpcomingBookingDetailsPage } from './pages/UpcomingBookingDetailsPage';
import { CancelBookingReviewPage } from './pages/CancelBookingReviewPage';
import { BookingCancelledPage } from './pages/BookingCancelledPage';
import { BookingChangesExceptionStatesPage } from './pages/BookingChangesExceptionStatesPage';
import { BookingIssueSupportPage } from './pages/BookingIssueSupportPage';
import { BookingHistoryReceiptsPage } from './pages/BookingHistoryReceiptsPage';
import { MyBookingsOverviewPage } from './pages/MyBookingsOverviewPage';

// Host Portal & Admin Portal Same-Origin Integration
import { HostPortalContent } from '../../host/src/App';
import { AdminPanelContent } from '../../admin/src/App';

// UW-04: Payment & Recovery Screens (pe_uw_05_01 to pe_uw_05_08)
import { ChoosePaymentMethodPage } from './pages/ChoosePaymentMethodPage';
import { PaymentReviewAuthorizationPage } from './pages/PaymentReviewAuthorizationPage';
import { PaymentProcessingPage } from './pages/PaymentProcessingPage';
import { PaymentSuccessfulPage } from './pages/PaymentSuccessfulPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { PaymentPendingStatusPage } from './pages/PaymentPendingStatusPage';
import { PaymentCancelledPage } from './pages/PaymentCancelledPage';
import { PaymentRecoveryReconciliationPage } from './pages/PaymentRecoveryReconciliationPage';

export function EcosystemPortalBar({
  active,
  onNavigate,
}: {
  active: 'website' | 'host' | 'admin';
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="bg-[#101828] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#1E293B] shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-[#14B8A6] font-mono tracking-tight text-xs">ParkEazy Ecosystem</span>
        <span className="text-[#475569] hidden sm:inline">•</span>
        <span className="text-[11px] text-[#94A3B8] hidden sm:inline">Phase 1 (Parts 01–07) Monorepo</span>
      </div>
      <div className="flex items-center gap-1 bg-[#1E293B] p-0.5 rounded-lg">
        <button
          onClick={() => onNavigate('/')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            active === 'website' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          🌐 Customer Website
        </button>
        <button
          onClick={() => onNavigate('/host/')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            active === 'host' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          🏢 Host Portal (57 Screens)
        </button>
        <button
          onClick={() => onNavigate('/admin/')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            active === 'admin' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          ⚙️ Admin Panel
        </button>
      </div>
    </div>
  );
}

interface WebsiteAppProps {
  onNavigateToHost?: () => void;
}

export function getSafeReturnUrl(url?: string | null): string {
  if (!url) return '/auth/success';
  // Must be an internal path starting with / and not starting with // or containing backslashes
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) {
    return '/auth/success';
  }
  // Disallow scheme protocols like javascript:, https:, etc.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return '/auth/success';
  }
  return url;
}

export function CustomerWebsiteContent({ onNavigateToHost }: WebsiteAppProps = {}) {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  const [currentSearch, setCurrentSearch] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.search;
    }
    return '';
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('parkeazy_customer_user');
      const token = localStorage.getItem('parkeazy_customer_token');
      if (stored && token) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Verify stored session token against server
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('parkeazy_customer_token');
    const userStr = localStorage.getItem('parkeazy_customer_user');
    if (!token || !userStr) return;

    const client = new ParkEazyApiClient({ baseUrl: '/api/v1', initialToken: token });
    client.auth
      .getMe()
      .then((validatedUser) => {
        if (validatedUser) {
          setCurrentUser(validatedUser);
        }
      })
      .catch((err: any) => {
        if (err?.statusCode === 401 || err?.statusCode === 403) {
          localStorage.removeItem('parkeazy_customer_token');
          localStorage.removeItem('parkeazy_customer_user');
          setCurrentUser(null);
        }
      });
  }, []);

  const navigateTo = (target: string) => {
    if (typeof window !== 'undefined') {
      const [path, search = ''] = target.split('?');
      const searchStr = search ? `?${search}` : '';
      if (window.location.pathname !== path || window.location.search !== searchStr) {
        window.history.pushState({}, '', target);
      }
      setCurrentPath(path);
      setCurrentSearch(searchStr);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
        setCurrentSearch(window.location.search);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthSuccess = (user: UserAccount, tokens: AuthTokenPair) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('parkeazy_customer_user', JSON.stringify(user));
      localStorage.setItem('parkeazy_customer_token', tokens.accessToken);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parkeazy_customer_user');
      localStorage.removeItem('parkeazy_customer_token');
    }
    navigateTo('/login');
  };

  const searchParams = new URLSearchParams(currentSearch);
  const locationParam = searchParams.get('q') || searchParams.get('location') || undefined;
  const vehicleParam = (searchParams.get('vehicle') as VehicleType) || undefined;

  // --- Cross-Portal Same-Origin Bridge (User Website, Host Portal, Admin Panel) ---
  if (currentPath.startsWith('/host')) {
    return (
      <div className="flex flex-col min-h-screen">
        <EcosystemPortalBar active="host" onNavigate={navigateTo} />
        <HostPortalContent
          onNavigateToWebsite={() => navigateTo('/')}
          onNavigateToAdmin={() => navigateTo('/admin/')}
        />
      </div>
    );
  }

  if (currentPath.startsWith('/admin')) {
    return (
      <div className="flex flex-col min-h-screen">
        <EcosystemPortalBar active="admin" onNavigate={navigateTo} />
        <AdminPanelContent
          onNavigateToWebsite={() => navigateTo('/')}
          onNavigateToHost={() => navigateTo('/host/')}
        />
      </div>
    );
  }

  // --- PH06: Availability, Search & Discovery Routes ---

  // 1. Explore Parking Catalog (explore_parking_pe_uw_03_01)
  if (currentPath === '/explore' || currentPath === '/find-parking') {
    return (
      <ExploreParkingPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        initialVehicle={vehicleParam}
      />
    );
  }

  // 2. Location Search Suggestions Autocomplete (location_search_suggestions_pe_uw_03_02)
  if (currentPath === '/search/suggestions') {
    return (
      <LocationSearchSuggestionsPage
        onNavigate={navigateTo}
        initialQuery={locationParam}
      />
    );
  }

  // 3. Search Filters & Preferences (search_filters_preferences_pe_uw_03_03)
  if (currentPath === '/search/filters') {
    return (
      <SearchFiltersPreferencesPage
        onNavigate={navigateTo}
        initialVehicle={vehicleParam}
      />
    );
  }

  // 4. Search Results List & Map Split View (search_results_list_map_pe_uw_03_04)
  if (currentPath === '/search') {
    return (
      <SearchResultsListMapPage
        onNavigate={navigateTo}
        initialQuery={locationParam}
        initialVehicle={vehicleParam}
      />
    );
  }

  // 5. Search Results Pure Listing Feed (search_results_list_view_pe_uw_03_05)
  if (currentPath === '/search/list') {
    return (
      <SearchResultsListViewPage
        onNavigate={navigateTo}
        initialQuery={locationParam}
      />
    );
  }

  // 6. Search Results Fullscreen Map (search_results_map_view_pe_uw_03_06)
  if (currentPath === '/search/map') {
    return (
      <SearchResultsMapViewPage
        onNavigate={navigateTo}
        initialQuery={locationParam}
      />
    );
  }

  // 7. No Results & Fallback Alternative Suggestions (no_results_alternative_suggestions_pe_uw_03_07)
  if (currentPath === '/search/empty' || currentPath === '/search/fallback') {
    return (
      <NoResultsAlternativeSuggestionsPage
        onNavigate={navigateTo}
        location={locationParam}
      />
    );
  }

  // 8. Search Loading & Geolocation Permission States (search_loading_error_location_permission_states_pe_uw_03_08)
  if (currentPath === '/search/permission' || currentPath === '/search/states') {
    return (
      <SearchLoadingPermissionStatesPage
        onNavigate={navigateTo}
      />
    );
  }

  // --- PH04: Authentication & Account Routes ---

  // 1. Customer Login (pe_uw_02_01)
  if (currentPath === '/login') {
    const rawReturnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');
    const safeReturn = getSafeReturnUrl(rawReturnUrl);

    return (
      <CustomerLoginPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
        returnUrl={safeReturn}
      />
    );
  }

  // 2. Customer Signup (pe_uw_02_02)
  if (currentPath === '/signup') {
    return (
      <CustomerSignupPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // 3. Verify Email (pe_uw_02_03)
  if (currentPath === '/verify-email') {
    return (
      <CustomerVerifyEmailPage
        onNavigate={navigateTo}
        initialEmail={currentUser?.email}
      />
    );
  }

  // 4. Verify Mobile OTP (pe_uw_02_04)
  if (currentPath === '/verify-mobile') {
    return (
      <CustomerVerifyMobileOtpPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
        initialPhone={currentUser?.phone}
      />
    );
  }

  // 5. Forgot Password (pe_uw_02_05)
  if (currentPath === '/forgot-password') {
    return <CustomerForgotPasswordPage onNavigate={navigateTo} />;
  }

  // 6. Reset Password (pe_uw_02_06)
  if (currentPath === '/reset-password') {
    return <CustomerResetPasswordPage onNavigate={navigateTo} />;
  }

  // 7. Verification Required (pe_uw_02_07)
  if (currentPath === '/verification-required') {
    return (
      <CustomerVerificationRequiredPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 8. Authentication Error States (pe_uw_02_08)
  if (currentPath === '/auth/error') {
    return <CustomerAuthErrorStatesPage onNavigate={navigateTo} />;
  }

  // 9. Session Expired (pe_uw_02_09)
  if (currentPath === '/session-expired') {
    return <CustomerSessionExpiredPage onNavigate={navigateTo} />;
  }

  // 10. Access Success / Account Verified (pe_uw_02_10)
  if (currentPath === '/auth/success' || currentPath === '/access-success') {
    return (
      <CustomerAccessSuccessPage
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // --- Parking Details & Spaces (parking_details_booking_summary_pe_uw_04_01) ---
  if (currentPath.startsWith('/facilities/') || currentPath.startsWith('/spaces/')) {
    const parts = currentPath.split('/');
    const facilityOrSpaceId = parts[2] || '10000000-0000-4000-b000-000000000104';
    return (
      <ParkingFacilityDetailPage
        facilityId={facilityOrSpaceId}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // --- PH07 Flow 1: Booking Lifecycle & Concurrency Reservation (pe_uw_04_01 to 04_09) ---

  // 1. Parking Details & Booking Summary (pe_uw_04_01)
  if (currentPath === '/book/summary' || currentPath === '/book/details') {
    return (
      <ParkingDetailsBookingSummaryPage
        facilityId={searchParams.get('facilityId') || undefined}
        spaceId={searchParams.get('spaceId') || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 2. Select Parking Date & Duration (pe_uw_04_02)
  if (currentPath === '/book/schedule' || currentPath === '/book/duration' || currentPath === '/book/dates') {
    return (
      <SelectParkingDateDurationPage
        facilityId={searchParams.get('facilityId') || undefined}
        spaceId={searchParams.get('spaceId') || undefined}
        initialStartsAt={searchParams.get('startsAt') || undefined}
        initialEndsAt={searchParams.get('endsAt') || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Availability Space Selection (pe_uw_04_03)
  if (currentPath === '/book/spaces') {
    return (
      <AvailabilitySpaceSelectionPage
        facilityId={searchParams.get('facilityId') || undefined}
        spaceId={searchParams.get('spaceId') || undefined}
        startsAt={searchParams.get('startsAt') || undefined}
        endsAt={searchParams.get('endsAt') || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 4. Booking Details & Vehicle Assignment (pe_uw_04_04)
  if (currentPath === '/book/vehicle') {
    return (
      <BookingDetailsVehiclePage
        facilityId={searchParams.get('facilityId') || undefined}
        spaceId={searchParams.get('spaceId') || undefined}
        startsAt={searchParams.get('startsAt') || undefined}
        endsAt={searchParams.get('endsAt') || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Review Booking Price Breakdown & Exclusive Hold (pe_uw_04_05)
  if (currentPath === '/book/review' || currentPath === '/checkout') {
    return (
      <ReviewBookingPriceBreakdownPage
        facilityId={searchParams.get('facilityId') || undefined}
        spaceId={searchParams.get('spaceId') || undefined}
        startsAt={searchParams.get('startsAt') || undefined}
        endsAt={searchParams.get('endsAt') || undefined}
        plate={searchParams.get('plate') || undefined}
        category={searchParams.get('category') || undefined}
        driverName={searchParams.get('driverName') || currentUser?.fullName || undefined}
        driverPhone={searchParams.get('driverPhone') || currentUser?.phone || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 6. Booking Processing & Concurrency Hold State (pe_uw_04_06)
  if (currentPath === '/book/processing') {
    return (
      <BookingProcessingPage
        facilityId={searchParams.get('facilityId') || undefined}
        spaceId={searchParams.get('spaceId') || undefined}
        startsAt={searchParams.get('startsAt') || undefined}
        endsAt={searchParams.get('endsAt') || undefined}
        plate={searchParams.get('plate') || undefined}
        category={searchParams.get('category') || undefined}
        holdId={searchParams.get('holdId') || undefined}
        method={searchParams.get('method') || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 7. Booking Confirmed & Gate Pass / QR (pe_uw_04_07)
  if (
    currentPath === '/book/confirmed' ||
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/confirmed'))
  ) {
    const bookingId =
      currentPath.startsWith('/bookings/')
        ? currentPath.split('/')[2]
        : searchParams.get('bookingId') || 'b0000001-0000-4000-8000-000000000001';
    return (
      <BookingConfirmedPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 8. Booking Unavailable & Concurrency Recovery (pe_uw_04_08)
  if (currentPath === '/book/unavailable' || currentPath === '/book/recovery') {
    return (
      <BookingUnavailableRecoveryPage
        spaceId={searchParams.get('spaceId') || undefined}
        facilityId={searchParams.get('facilityId') || undefined}
        startsAt={searchParams.get('startsAt') || undefined}
        endsAt={searchParams.get('endsAt') || undefined}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 9. Booking Validation & Expiry States (pe_uw_04_09)
  if (currentPath === '/book/validation' || currentPath === '/book/expired') {
    return (
      <BookingValidationExpiryStatesPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        spaceId={searchParams.get('spaceId') || undefined}
        facilityId={searchParams.get('facilityId') || undefined}
      />
    );
  }

  // --- UW-04: Payments, Booking Results & Recovery States (pe_uw_05_01 to pe_uw_05_08) ---

  // Choose Payment Method (pe_uw_05_01)
  if (currentPath === '/payment/methods' || currentPath === '/checkout/payment') {
    return (
      <ChoosePaymentMethodPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        spaceIdParam={searchParams.get('spaceId') || undefined}
        startsAtParam={searchParams.get('startsAt') || undefined}
        endsAtParam={searchParams.get('endsAt') || undefined}
        plateParam={searchParams.get('plate') || undefined}
      />
    );
  }

  // Payment Review & Escrow Authorization (pe_uw_05_02)
  if (currentPath === '/payment/review') {
    return <PaymentReviewAuthorizationPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Payment Gateway Processing State (pe_uw_05_03)
  if (currentPath === '/payment/processing') {
    return <PaymentProcessingPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Payment Successful Receipt (pe_uw_05_04)
  if (currentPath === '/payment/success') {
    return <PaymentSuccessfulPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Payment Declined / Failed State (pe_uw_05_05)
  if (currentPath === '/payment/failed') {
    return <PaymentFailedPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Payment Pending Bank Confirmation (pe_uw_05_06)
  if (currentPath === '/payment/pending') {
    return <PaymentPendingStatusPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Payment User Cancelled (pe_uw_05_07)
  if (currentPath === '/payment/cancelled') {
    return <PaymentCancelledPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Payment Recovery & Reconciliation (pe_uw_05_08)
  if (currentPath === '/payment/recovery') {
    return <PaymentRecoveryReconciliationPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // --- PH07 Flow 2: Active / Post-Booking Lifecycle Management (pe_uw_06_01 to 06_09) ---

  // 10. Active Parking Session & Gate Pass (pe_uw_06_01)
  if (
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/active')) ||
    currentPath === '/session/active'
  ) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || searchParams.get('bookingId') || 'b0000001-0000-4000-8000-000000000001';
    return (
      <ActiveParkingSessionPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // 11. Extend Parking Duration (pe_uw_06_02)
  if (
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/extend')) ||
    currentPath === '/session/extend'
  ) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || searchParams.get('bookingId') || 'b0000001-0000-4000-8000-000000000001';
    return (
      <ExtendParkingDurationPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // 13. Cancel Booking Review (pe_uw_06_04)
  if (currentPath.startsWith('/bookings/') && currentPath.endsWith('/cancel')) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || 'b0000001-0000-4000-8000-000000000001';
    return (
      <CancelBookingReviewPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // 14. Booking Cancelled Confirmation (pe_uw_06_05)
  if (currentPath.startsWith('/bookings/') && currentPath.endsWith('/cancelled')) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || 'b0000001-0000-4000-8000-000000000001';
    return (
      <BookingCancelledPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // 15. Booking Overstay & Exception States (pe_uw_06_06)
  if (
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/exceptions')) ||
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/overstay')) ||
    currentPath === '/booking/exceptions'
  ) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || searchParams.get('bookingId') || 'b0000001-0000-4000-8000-000000000001';
    return (
      <BookingChangesExceptionStatesPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // 16. Booking Issue & Support Dispute (pe_uw_06_07)
  if (
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/support')) ||
    currentPath === '/booking/support'
  ) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || searchParams.get('bookingId') || 'b0000001-0000-4000-8000-000000000001';
    return (
      <BookingIssueSupportPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // 17. Booking History & Tax Invoice Receipts (pe_uw_06_08)
  if (
    currentPath === '/bookings/history' ||
    currentPath === '/bookings/receipts' ||
    (currentPath.startsWith('/bookings/') && currentPath.endsWith('/receipt'))
  ) {
    const parts = currentPath.split('/');
    const bookingIdParam = currentPath.endsWith('/receipt') ? parts[2] : searchParams.get('bookingId') || undefined;
    return (
      <BookingHistoryReceiptsPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        bookingIdParam={bookingIdParam}
      />
    );
  }

  // 12. Upcoming Booking Details (pe_uw_06_03)
  if (
    currentPath.startsWith('/bookings/') &&
    !currentPath.includes('/active') &&
    !currentPath.includes('/cancel') &&
    !currentPath.includes('/extend') &&
    !currentPath.includes('/receipt') &&
    !currentPath.includes('/support') &&
    !currentPath.includes('/exceptions') &&
    !currentPath.includes('/overstay') &&
    !currentPath.includes('/confirmed')
  ) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || 'b0000001-0000-4000-8000-000000000001';
    return (
      <UpcomingBookingDetailsPage
        bookingId={bookingId}
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 18. Customer My Bookings Overview (pe_uw_06_09)
  if (currentPath === '/bookings' || currentPath === '/my-bookings' || currentPath === '/bookings/overview') {
    return (
      <MyBookingsOverviewPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // --- Customer Profile, Vehicles & Saved Places (pe_uw_07_01 to pe_uw_07_05) ---
  if (currentPath.startsWith('/account/') || currentPath === '/profile') {
    const initialTab = currentPath.includes('profile')
      ? 'profile'
      : currentPath.includes('favorite')
      ? 'favorites'
      : 'vehicles';
    return (
      <CustomerProfileVehiclesPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        initialTab={initialTab}
      />
    );
  }

  // Default: Customer Marketplace Landing Page (pe_uw_01_01)
  return (
    <CustomerLandingPage
      currentUser={currentUser}
      onNavigate={navigateTo}
      onLogout={handleLogout}
    />
  );
}

export default function CustomerWebsiteApp() {
  return (
    <BrandProvider>
      <CustomerWebsiteContent />
    </BrandProvider>
  );
}
