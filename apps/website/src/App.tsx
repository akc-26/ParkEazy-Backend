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
    if (target.startsWith('/host')) {
      if (onNavigateToHost) {
        onNavigateToHost();
        return;
      }
    }
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

  // --- Booking Checkout & Payment (pe_uw_04_02 to pe_uw_04_07 & pe_uw_05_01) ---
  if (currentPath === '/checkout') {
    return (
      <CustomerBookingCheckoutPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        facilityIdParam={searchParams.get('facilityId') || undefined}
        spaceIdParam={searchParams.get('spaceId') || undefined}
        startsAtParam={searchParams.get('startsAt') || undefined}
        endsAtParam={searchParams.get('endsAt') || undefined}
        plateParam={searchParams.get('plate') || undefined}
        categoryParam={searchParams.get('category') || undefined}
      />
    );
  }

  // --- Active Booking Session & Gate Pass (active_parking_session_pe_uw_06_03) ---
  if (currentPath.startsWith('/bookings/') && currentPath.endsWith('/active')) {
    const parts = currentPath.split('/');
    const bookingId = parts[2] || 'b0000001-0000-4000-8000-000000000001';
    return (
      <CustomerActiveBookingPage
        bookingId={bookingId}
        onNavigate={navigateTo}
      />
    );
  }

  // --- Customer My Bookings & Receipts (my_bookings_overview_pe_uw_06_01) ---
  if (currentPath === '/bookings' || currentPath === '/my-bookings') {
    return (
      <CustomerMyBookingsPage
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
