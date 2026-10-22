import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

// 26 Catalog Screens
import { HOST_WORKSPACE_SCREENS, HostWorkspaceScreen } from './pages/HostWorkspaceScreens';

// Auth & Eligibility
import { HostLoginPage } from './pages/HostLoginPage';
import { HostRegisterPage } from './pages/HostRegisterPage';
import { HostVerificationPage } from './pages/HostVerificationPage';
import { HostPasswordRecoveryPage } from './pages/HostPasswordRecoveryPage';
import { HostEligibilityPage } from './pages/HostEligibilityPage';
import { HostApplicationStatusPage } from './pages/HostApplicationStatusPage';
import { HostAccessExceptionsPage } from './pages/HostAccessExceptionsPage';
import { HostOnboardingOverviewPage } from './pages/HostOnboardingOverviewPage';
import { HostProfileContactDetailsPage } from './pages/HostProfileContactDetailsPage';

// Facilities & Spaces
import { HostSpacesOverviewPage } from './pages/HostSpacesOverviewPage';
import { HostSpacesInventoryManagementPage } from './pages/HostSpacesInventoryManagementPage';
import { AddParkingFacilityWizardPage } from './pages/AddParkingFacilityWizardPage';
import { FacilityDetailsEntrancePage } from './pages/FacilityDetailsEntrancePage';
import { PhysicalInventoryBayLayoutPage } from './pages/PhysicalInventoryBayLayoutPage';
import { AddEditParkingSpacePage } from './pages/AddEditParkingSpacePage';
import { VehicleCompatibilityRestrictionsPage } from './pages/VehicleCompatibilityRestrictionsPage';
import { SpaceAmenitiesAccessInstructionsPage } from './pages/SpaceAmenitiesAccessInstructionsPage';
import { PhotosListingPreviewPage } from './pages/PhotosListingPreviewPage';
import { InventoryValidationPublicationReadinessPage } from './pages/InventoryValidationPublicationReadinessPage';

// Pricing & Availability
import { AvailabilityPricingOverviewPage } from './pages/AvailabilityPricingOverviewPage';
import { SpacePricingConfigurationPage } from './pages/SpacePricingConfigurationPage';
import { OperatingHoursWeeklySchedulePage } from './pages/OperatingHoursWeeklySchedulePage';
import { DateSpecificAvailabilityClosuresPage } from './pages/DateSpecificAvailabilityClosuresPage';
import { BookingDurationAdvanceBookingRulesPage } from './pages/BookingDurationAdvanceBookingRulesPage';
import { PricingPreviewEarningsEstimatePage } from './pages/PricingPreviewEarningsEstimatePage';
import { BulkPricingScheduleUpdatesPage } from './pages/BulkPricingScheduleUpdatesPage';
import { AvailabilityConflictChangeReviewPage } from './pages/AvailabilityConflictChangeReviewPage';
import { PricingAvailabilityChangeHistoryPage } from './pages/PricingAvailabilityChangeHistoryPage';

// Operations & Financials Overviews
import { HostBookingOperationsOverviewPage } from './pages/HostBookingOperationsOverviewPage';
import { HostEarningsFinancialOverviewPage } from './pages/HostEarningsFinancialOverviewPage';

// Icons
import {
  LayoutDashboard,
  Building,
  DollarSign,
  Car,
  Wallet,
  CheckCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  Settings,
  LogOut,
  Bell,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface HostAppProps {
  onNavigateToWebsite?: () => void;
  onNavigateToAdmin?: () => void;
}

export function HostPortalContent({ onNavigateToWebsite, onNavigateToAdmin }: HostAppProps = {}) {
  const { tenant } = useBrand();

  // Active URL pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      return p.startsWith('/host') ? p : '/host/';
    }
    return '/host/';
  });

  // Authenticated Host user state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Selected resource context (facility & space)
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  // Live dashboard metrics state
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any | null>(null);

  const apiClient = useMemo(() => new ParkEazyApiClient({ baseUrl: '/api/v1' }), []);

  // Synchronize route with browser history
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p.startsWith('/host') ? p : '/host/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/host/${path}`;
    window.history.pushState({}, '', normalized);
    setCurrentPath(normalized);
  }, []);

  // Session verification and current-user restoration
  const loadHostSession = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const user = await apiClient.auth.me();
      if (user && (user.roles?.includes('host') || user.roles?.includes('superadmin') || user.role === 'host')) {
        setCurrentUser(user);
        // Load facilities for authenticated host
        try {
          const facs = await apiClient.facilities.list();
          setFacilities(facs);
          if (facs.length > 0 && !selectedFacilityId) {
            setSelectedFacilityId(facs[0].id);
          }
        } catch {
          setFacilities([]);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, [apiClient, selectedFacilityId]);

  useEffect(() => {
    loadHostSession();
  }, [loadHostSession]);

  // Load real Host dashboard data from authoritative endpoints
  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [facs, occ, bks, earn] = await Promise.all([
        apiClient.facilities.list().catch(() => []),
        apiClient.host.getOccupancy().catch(() => []),
        apiClient.host.getBookings().catch(() => []),
        apiClient.host.getEarnings().catch(() => null),
      ]);
      setFacilities(facs);
      setOccupancyData(occ);
      setBookingsData(bks);
      setEarningsData(earn);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err: any) {
      setDashboardError(err.message || 'Unable to retrieve live host metrics');
    } finally {
      setDashboardLoading(false);
    }
  }, [apiClient, currentUser, selectedFacilityId]);

  useEffect(() => {
    if (currentUser && (currentPath === '/host' || currentPath === '/host/')) {
      loadDashboardData();
    }
  }, [currentUser, currentPath, loadDashboardData]);

  const handleLogout = async () => {
    try {
      await apiClient.auth.logout();
    } catch {
      // ignore
    } finally {
      setCurrentUser(null);
      setFacilities([]);
      setSelectedFacilityId(null);
      navigateTo('/host/login');
    }
  };

  const handleAuthSuccess = (user: UserAccount, _tokens: AuthTokenPair) => {
    setCurrentUser(user);
    if (user.status === 'pending_verification') {
      navigateTo('/host/verify');
    } else {
      navigateTo('/host/');
    }
  };

  // Auth routes matching
  const isAuthRoute =
    currentPath === '/host/login' ||
    currentPath === '/host/register' ||
    currentPath === '/host/verify' ||
    currentPath === '/host/forgot-password';

  // 1. Loading screen while verifying authenticated session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Restoring Host Session...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated flows (Dedicated Login, Register, Forgot Password, Verification)
  if (!currentUser) {
    if (currentPath === '/host/register') {
      return <HostRegisterPage onNavigate={navigateTo} onSuccess={handleAuthSuccess} />;
    }
    if (currentPath === '/host/forgot-password') {
      return <HostPasswordRecoveryPage onNavigate={navigateTo} />;
    }
    if (currentPath === '/host/verify') {
      return (
        <HostVerificationPage
          currentUser={currentUser}
          onNavigate={navigateTo}
          onSuccess={() => {
            loadHostSession();
            navigateTo('/host/');
          }}
        />
      );
    }
    // Default unauthenticated fallback -> Host Login
    return (
      <HostLoginPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
        returnUrl={currentPath !== '/host/login' ? currentPath : '/host/'}
      />
    );
  }

  // If user is pending verification, enforce verification screen
  if (currentUser.status === 'pending_verification' && currentPath !== '/host/verify') {
    return (
      <HostVerificationPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onSuccess={() => {
          loadHostSession();
          navigateTo('/host/');
        }}
      />
    );
  }

  // Missing real-resource context guard component
  const missingResourceContext = (
    <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
        <Building className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-slate-800">Real Resource Context Required</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
        Please select or register a valid parking facility to view or edit this operational surface.
        Demo or fabricated identifiers are not permitted.
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => navigateTo('/host/facilities/new')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
        >
          Add Parking Facility
        </button>
        <button
          onClick={() => navigateTo('/host/spaces')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
        >
          View Facilities
        </button>
      </div>
    </div>
  );

  // Check 26 Host Workspace Catalog screens
  const catalogScreen = HOST_WORKSPACE_SCREENS.find((screen) => screen.route === currentPath);
  if (catalogScreen) {
    return <HostWorkspaceScreen path={currentPath} onNavigate={navigateTo} />;
  }

  // Navigation Items for Sidebar
  const navGroups = [
    {
      group: 'Overview',
      items: [
        { route: '/host/', label: 'Operations Dashboard', icon: LayoutDashboard },
        { route: '/host/onboarding', label: 'Onboarding Overview', icon: ShieldCheck },
        { route: '/host/onboarding/profile', label: 'Host Profile', icon: Building },
        { route: '/host/onboarding/eligibility', label: 'Eligibility Checklist', icon: CheckCircle },
        { route: '/host/application-status', label: 'Application Status', icon: Clock },
      ],
    },
    {
      group: 'Inventory & Facilities',
      items: [
        { route: '/host/spaces', label: 'Spaces Overview', icon: Building },
        { route: '/host/facilities/new', label: 'Add Facility Wizard', icon: PlusCircle },
        { route: '/host/spaces/matrix', label: 'Inventory Management', icon: Car },
      ],
    },
    {
      group: 'Pricing & Tariffs',
      items: [
        { route: '/host/pricing', label: 'Rates & Availability', icon: DollarSign },
        { route: '/host/pricing/rates', label: 'Space Rates Config', icon: Settings },
        { route: '/host/pricing/schedule', label: 'Weekly Hours Schedule', icon: Clock },
        { route: '/host/pricing/closures', label: 'Availability Closures', icon: AlertTriangle },
        { route: '/host/pricing/rules', label: 'Duration & Advance Rules', icon: ShieldCheck },
        { route: '/host/pricing/estimate', label: 'Pricing Preview Estimate', icon: DollarSign },
        { route: '/host/pricing/bulk', label: 'Bulk Pricing Schedule', icon: Settings },
        { route: '/host/pricing/conflicts', label: 'Availability Conflicts', icon: AlertTriangle },
        { route: '/host/pricing/history', label: 'Tariff Change History', icon: Clock },
      ],
    },
    {
      group: 'Operations',
      items: [
        { route: '/host/operations', label: 'Operations Overview', icon: CheckCircle },
        { route: '/host/operations/manifest', label: 'Operations Manifest (26)', icon: Clock },
        { route: '/host/operations/occupancy', label: 'Live Bay Occupancy (26)', icon: Car },
        { route: '/host/operations/bookings', label: 'Booking Search (26)', icon: Building },
        { route: '/host/operations/check-in', label: 'Check-In Gate (26)', icon: CheckCircle },
        { route: '/host/operations/check-out', label: 'Check-Out Gate (26)', icon: CheckCircle },
      ],
    },
    {
      group: 'Earnings & Settings',
      items: [
        { route: '/host/earnings', label: 'Financial Overview', icon: Wallet },
        { route: '/host/earnings/ledger', label: 'Transaction Ledger (26)', icon: DollarSign },
        { route: '/host/settings', label: 'Workspace Settings (26)', icon: Settings },
        { route: '/host/settings/support', label: 'Help & Support (26)', icon: ShieldCheck },
      ],
    },
  ];

  // Derive live dashboard calculations
  const totalFacilities = facilities.length;
  const totalBays = occupancyData.reduce((acc, curr) => acc + (curr.totalSpaces || 0), 0);
  const occupiedBays = occupancyData.reduce((acc, curr) => acc + (curr.occupiedSpaces || 0), 0);
  const occupancyPercent = totalBays > 0 ? Math.round((occupiedBays / totalBays) * 100) : 0;
  const grossRevenue = earningsData?.grossEarningsInr || 0;
  const netEarnings = earningsData?.netPayoutInr || 0;

  // Active or upcoming bookings
  const confirmedBookings = bookingsData.filter((b) => b.status === 'confirmed' || b.status === 'active');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              P
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight">Host Workspace</div>
              <div className="text-[10px] text-emerald-400 font-medium">{tenant.displayName}</div>
            </div>
          </div>
        </div>

        <nav className="p-2 space-y-4 flex-1 overflow-y-auto">
          {navGroups.map((g) => (
            <div key={g.group} className="space-y-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {g.group}
              </div>
              {g.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigateTo(item.route)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Authenticated User Footprint & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <div className="truncate mr-2">
            <div className="font-semibold text-white truncate">{currentUser.fullName}</div>
            <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTENT */}
      <div className="flex-1 overflow-y-auto min-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Host Portal</span>
            <span>/</span>
            <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {currentPath}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToWebsite && (
              <button
                onClick={onNavigateToWebsite}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-700 font-medium px-2.5 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <span>Customer Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-700 font-medium px-2.5 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <span>Admin Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => navigateTo('/host/settings/notifications')}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 relative"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Route Content Switching */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {/* 1. Host Dashboard (Live Data, No hardcoded metrics) */}
          {(currentPath === '/host' || currentPath === '/host/') && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Host Operations Overview</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Live operational metrics derived directly from authenticated host facilities and bookings.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadDashboardData()}
                    disabled={dashboardLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dashboardLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => navigateTo('/host/facilities/new')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Facility</span>
                  </button>
                  <button
                    onClick={() => navigateTo('/host/operations/manifest')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Operations Manifest</span>
                  </button>
                </div>
              </div>

              {dashboardError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                  <span>{dashboardError}</span>
                  <button
                    onClick={() => loadDashboardData()}
                    className="underline font-bold hover:text-rose-900"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Real Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => navigateTo('/host/operations/occupancy')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Bay Occupancy</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {totalBays > 0 ? `${occupiedBays} / ${totalBays} Bays` : '0 Bays Configured'}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 font-medium">
                    {totalBays > 0 ? `${occupancyPercent}% Active Occupancy` : 'No spaces registered'}
                  </div>
                </div>

                <div
                  onClick={() => navigateTo('/host/earnings')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Host Earnings</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">₹{grossRevenue.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-1">Net receivable: ₹{netEarnings.toFixed(2)}</div>
                </div>

                <div
                  onClick={() => navigateTo('/host/spaces')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Facilities</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {totalFacilities} {totalFacilities === 1 ? 'Location' : 'Locations'}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 font-medium">
                    {totalFacilities > 0 ? 'Managed under this host account' : 'Register your first facility'}
                  </div>
                </div>

                <div
                  onClick={() => navigateTo('/host/operations')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Bookings</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {confirmedBookings.length} {confirmedBookings.length === 1 ? 'Reservation' : 'Reservations'}
                  </div>
                  <div className="text-xs text-sky-600 mt-1 font-medium">
                    {bookingsData.length} total lifetime bookings
                  </div>
                </div>
              </div>

              {/* Real Host Facilities & Bookings lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Facility quick list */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 text-sm">Your Parking Facilities</h3>
                    <button
                      onClick={() => navigateTo('/host/spaces')}
                      className="text-xs text-emerald-600 font-medium hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  {facilities.length > 0 ? (
                    <div className="space-y-3">
                      {facilities.slice(0, 4).map((f) => (
                        <div
                          key={f.id}
                          className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-xs text-slate-900">{f.name || f.businessName}</div>
                            <div className="text-[11px] text-slate-500">
                              {f.addressLine1 || f.city} · {f.totalSpaces ?? f.spaceCount ?? 0} Bays
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 capitalize">
                            {f.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p>No parking facilities registered yet under this host account.</p>
                      <button
                        onClick={() => navigateTo('/host/facilities/new')}
                        className="mt-2 text-emerald-600 font-semibold hover:underline"
                      >
                        + Create your first facility
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent bookings list */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 text-sm">Recent Booking Activity</h3>
                    <button
                      onClick={() => navigateTo('/host/operations/bookings')}
                      className="text-xs text-emerald-600 font-medium hover:underline"
                    >
                      Manage Bookings
                    </button>
                  </div>
                  {bookingsData.length > 0 ? (
                    <div className="space-y-3">
                      {bookingsData.slice(0, 4).map((b) => (
                        <div
                          key={b.id}
                          className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-xs text-slate-900">
                              {b.bookingReference || b.id} · {b.bayIdentifier || 'Space Assigned'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Vehicle: {b.vehiclePlate || '—'} · {new Date(b.startsAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                              b.status === 'confirmed' || b.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p>No bookings recorded for your facilities yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Onboarding routes */}
          {currentPath === '/host/onboarding' && (
            <HostOnboardingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/onboarding/profile' && (
            <HostProfileContactDetailsPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/onboarding/eligibility' && (
            <HostEligibilityPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/application-status' && (
            <HostApplicationStatusPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/exceptions' && (
            <HostAccessExceptionsPage onNavigate={navigateTo} />
          )}

          {/* 3. Facilities & Spaces */}
          {currentPath === '/host/spaces' && (
            <HostSpacesOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/spaces/matrix' && (
            <HostSpacesInventoryManagementPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/facilities/new' && (
            <AddParkingFacilityWizardPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/preview') && (
            selectedFacilityId ? (
              <PhotosListingPreviewPage
                facilityId={selectedFacilityId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}
          {currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/gate') && (
            selectedFacilityId ? (
              <FacilityDetailsEntrancePage
                facilityId={selectedFacilityId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}
          {currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/layout') && (
            selectedFacilityId ? (
              <PhysicalInventoryBayLayoutPage
                facilityId={selectedFacilityId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}
          {currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/publish') && (
            selectedFacilityId ? (
              <InventoryValidationPublicationReadinessPage
                facilityId={selectedFacilityId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}
          {currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/edit') && (
            selectedFacilityId && selectedSpaceId ? (
              <AddEditParkingSpacePage
                facilityId={selectedFacilityId}
                spaceId={selectedSpaceId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}
          {currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/restrictions') && (
            selectedFacilityId && selectedSpaceId ? (
              <VehicleCompatibilityRestrictionsPage
                facilityId={selectedFacilityId}
                spaceId={selectedSpaceId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}
          {currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/amenities') && (
            selectedFacilityId && selectedSpaceId ? (
              <SpaceAmenitiesAccessInstructionsPage
                facilityId={selectedFacilityId}
                spaceId={selectedSpaceId}
                currentUser={currentUser}
                onNavigate={navigateTo}
              />
            ) : missingResourceContext
          )}

          {/* 4. Pricing & Tariffs */}
          {currentPath === '/host/pricing' && (
            <AvailabilityPricingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/rates' && (
            <SpacePricingConfigurationPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/schedule' && (
            <OperatingHoursWeeklySchedulePage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/closures' && (
            <DateSpecificAvailabilityClosuresPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/rules' && (
            <BookingDurationAdvanceBookingRulesPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/estimate' && (
            <PricingPreviewEarningsEstimatePage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/bulk' && (
            <BulkPricingScheduleUpdatesPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/conflicts' && (
            <AvailabilityConflictChangeReviewPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/pricing/history' && (
            <PricingAvailabilityChangeHistoryPage currentUser={currentUser} onNavigate={navigateTo} />
          )}

          {/* 5. Overviews */}
          {currentPath === '/host/operations' && (
            <HostBookingOperationsOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
          {currentPath === '/host/earnings' && (
            <HostEarningsFinancialOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function HostApp(props: HostAppProps = {}) {
  return (
    <BrandProvider>
      <HostPortalContent {...props} />
    </BrandProvider>
  );
}
