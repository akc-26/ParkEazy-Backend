import React, { useState, useEffect } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';

// Auth & Onboarding Pages (Part 04)
import { HostLoginPage } from './pages/HostLoginPage';
import { HostRegisterPage } from './pages/HostRegisterPage';
import { HostVerificationPage } from './pages/HostVerificationPage';
import { HostPasswordRecoveryPage } from './pages/HostPasswordRecoveryPage';
import { HostOnboardingOverviewPage } from './pages/HostOnboardingOverviewPage';
import { HostProfileContactDetailsPage } from './pages/HostProfileContactDetailsPage';
import { HostEligibilityPage } from './pages/HostEligibilityPage';
import { HostApplicationStatusPage } from './pages/HostApplicationStatusPage';
import { HostAccessExceptionsPage } from './pages/HostAccessExceptionsPage';

// Phase 05: Facility Setup & Physical Spaces (pe_hw_02_01 to pe_hw_02_09 + pe_hp_04_01)
import { HostSpacesOverviewPage } from './pages/HostSpacesOverviewPage';
import { AddParkingFacilityWizardPage } from './pages/AddParkingFacilityWizardPage';
import { FacilityDetailsEntrancePage } from './pages/FacilityDetailsEntrancePage';
import { PhysicalInventoryBayLayoutPage } from './pages/PhysicalInventoryBayLayoutPage';
import { AddEditParkingSpacePage } from './pages/AddEditParkingSpacePage';
import { VehicleCompatibilityRestrictionsPage } from './pages/VehicleCompatibilityRestrictionsPage';
import { SpaceAmenitiesAccessInstructionsPage } from './pages/SpaceAmenitiesAccessInstructionsPage';
import { PhotosListingPreviewPage } from './pages/PhotosListingPreviewPage';
import { InventoryValidationPublicationReadinessPage } from './pages/InventoryValidationPublicationReadinessPage';
import { HostSpacesInventoryManagementPage } from './pages/HostSpacesInventoryManagementPage';

// Phase 05: Availability Schedules & Pricing (pe_hw_03_01 to pe_hw_03_09)
import { AvailabilityPricingOverviewPage } from './pages/AvailabilityPricingOverviewPage';
import { SpacePricingConfigurationPage } from './pages/SpacePricingConfigurationPage';
import { OperatingHoursWeeklySchedulePage } from './pages/OperatingHoursWeeklySchedulePage';
import { DateSpecificAvailabilityClosuresPage } from './pages/DateSpecificAvailabilityClosuresPage';
import { BookingDurationAdvanceBookingRulesPage } from './pages/BookingDurationAdvanceBookingRulesPage';
import { PricingPreviewEarningsEstimatePage } from './pages/PricingPreviewEarningsEstimatePage';
import { BulkPricingScheduleUpdatesPage } from './pages/BulkPricingScheduleUpdatesPage';
import { AvailabilityConflictChangeReviewPage } from './pages/AvailabilityConflictChangeReviewPage';
import { PricingAvailabilityChangeHistoryPage } from './pages/PricingAvailabilityChangeHistoryPage';

interface HostAppProps {
  onNavigateToWebsite?: () => void;
  onNavigateToAdmin?: () => void;
}

export function HostPortalContent({ onNavigateToWebsite, onNavigateToAdmin }: HostAppProps = {}) {
  const { tenant } = useBrand();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/host/';
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('parkeazy_host_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthSuccess = (user: UserAccount, tokens: AuthTokenPair) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('parkeazy_host_user', JSON.stringify(user));
      localStorage.setItem('parkeazy_host_token', tokens.accessToken);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parkeazy_host_user');
      localStorage.removeItem('parkeazy_host_token');
    }
    navigateTo('/host/login');
  };

  // Helper route extractors
  const defaultFacilityId = '7bf5f8dd-95b9-426e-993f-e747271ae424'; // Anna Nagar Plaza default
  const defaultSpaceId = 'sp-anna-04';

  const extractParam = (path: string, pattern: RegExp, fallback: string): string => {
    const match = path.match(pattern);
    return match && match[1] && match[1] !== 'undefined' ? match[1] : fallback;
  };

  // --- ROUTING ENGINE ---

  // 1. Host Login
  if (currentPath === '/host/login') {
    return (
      <HostLoginPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // 2. Host Register
  if (currentPath === '/host/register' || currentPath === '/host/signup') {
    return (
      <HostRegisterPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // 3. Host Verification
  if (currentPath === '/host/verify' || currentPath === '/host/verification') {
    return (
      <HostVerificationPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onSuccess={() => {
          if (currentUser) {
            const updated = { ...currentUser, phoneVerified: true };
            setCurrentUser(updated);
            localStorage.setItem('parkeazy_host_user', JSON.stringify(updated));
          }
          navigateTo('/host/onboarding');
        }}
      />
    );
  }

  // 4. Password Recovery
  if (currentPath === '/host/forgot-password' || currentPath === '/host/password-recovery') {
    return <HostPasswordRecoveryPage onNavigate={navigateTo} />;
  }

  // 5. Onboarding Overview
  if (currentPath === '/host/onboarding' || currentPath === '/host/onboarding/overview') {
    return <HostOnboardingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 6. Onboarding Profile
  if (currentPath === '/host/onboarding/profile' || currentPath === '/host/profile') {
    return <HostProfileContactDetailsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 7. Onboarding Eligibility
  if (currentPath === '/host/onboarding/eligibility' || currentPath === '/host/eligibility') {
    return <HostEligibilityPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 8. Application Status
  if (currentPath === '/host/application-status' || currentPath === '/host/onboarding/status') {
    return <HostApplicationStatusPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 9. Exceptions
  if (currentPath === '/host/exceptions' || currentPath === '/host/access-status') {
    return <HostAccessExceptionsPage onNavigate={navigateTo} />;
  }

  // --- PHASE 05: FACILITY SETUP & SPACES ROUTES ---

  // 10. Spaces Overview (pe_hw_02_01)
  if (currentPath === '/host/spaces') {
    return <HostSpacesOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 11. Add Facility Wizard (pe_hw_02_02)
  if (currentPath === '/host/facilities/new') {
    return <AddParkingFacilityWizardPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 12. Facility Gate Details & Entrance (pe_hw_02_03)
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/gate')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/gate/, defaultFacilityId);
    return <FacilityDetailsEntrancePage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 13. Physical Inventory Bay Layout (pe_hw_02_04)
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/layout')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/layout/, defaultFacilityId);
    return <PhysicalInventoryBayLayoutPage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 14. Add / Edit Space (pe_hw_02_05)
  if (currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/edit')) {
    const spId = extractParam(currentPath, /\/host\/spaces\/([^/]+)\/edit/, defaultSpaceId);
    return <AddEditParkingSpacePage facilityId={defaultFacilityId} spaceId={spId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 15. Vehicle Compatibility & Restrictions (pe_hw_02_06)
  if (currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/restrictions')) {
    const spId = extractParam(currentPath, /\/host\/spaces\/([^/]+)\/restrictions/, defaultSpaceId);
    return <VehicleCompatibilityRestrictionsPage facilityId={defaultFacilityId} spaceId={spId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 16. Amenities & Access Instructions (pe_hw_02_07)
  if (currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/amenities')) {
    const spId = extractParam(currentPath, /\/host\/spaces\/([^/]+)\/amenities/, defaultSpaceId);
    return <SpaceAmenitiesAccessInstructionsPage facilityId={defaultFacilityId} spaceId={spId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 17. Photos & Listing Preview (pe_hw_02_08)
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/preview')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/preview/, defaultFacilityId);
    return <PhotosListingPreviewPage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 18. Publication Readiness Pre-Flight Checklist (pe_hw_02_09)
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/publish')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/publish/, defaultFacilityId);
    return <InventoryValidationPublicationReadinessPage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 19. Full Interactive Bay Matrix Visualizer (pe_hp_04_01)
  if (currentPath === '/host/spaces/matrix' || currentPath === '/host/matrix') {
    return <HostSpacesInventoryManagementPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // --- PHASE 05: AVAILABILITY & PRICING ROUTES ---

  // 20. Tariffs & Availability Overview (pe_hw_03_01)
  if (currentPath === '/host/pricing' || currentPath === '/host/pricing/overview') {
    return <AvailabilityPricingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 21. Configure Rates & Dynamic Multipliers (pe_hw_03_02)
  if (currentPath === '/host/pricing/rates') {
    return <SpacePricingConfigurationPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 22. Weekly Operating Hours & Shifts (pe_hw_03_03)
  if (currentPath === '/host/pricing/schedule' || currentPath === '/host/pricing/hours') {
    return <OperatingHoursWeeklySchedulePage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 23. Date Closures & Maintenance Holidays (pe_hw_03_04)
  if (currentPath === '/host/pricing/closures') {
    return <DateSpecificAvailabilityClosuresPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 24. Booking Duration Limits & Horizon (pe_hw_03_05)
  if (currentPath === '/host/pricing/rules') {
    return <BookingDurationAdvanceBookingRulesPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 25. Earnings Calculator & Driver Bill Preview (pe_hw_03_06)
  if (currentPath === '/host/pricing/estimate' || currentPath === '/host/pricing/simulator') {
    return <PricingPreviewEarningsEstimatePage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 26. Bulk Tariff & Schedule Modifier (pe_hw_03_07)
  if (currentPath === '/host/pricing/bulk') {
    return <BulkPricingScheduleUpdatesPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 27. Schedule Conflict Resolution (pe_hw_03_08)
  if (currentPath === '/host/pricing/conflicts') {
    return <AvailabilityConflictChangeReviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // 28. Tariff Audit Log & History (pe_hw_03_09)
  if (currentPath === '/host/pricing/history' || currentPath === '/host/pricing/audit') {
    return <PricingAvailabilityChangeHistoryPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // Default: Host Operations Dashboard (`/host` or `/host/`)
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* HOST WORKSPACE TOPBAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('/host/')}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center font-bold text-white text-sm">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[#141B2C] text-sm font-['Plus_Jakarta_Sans']">
                  {tenant.displayName} Host
                </span>
                <span className="text-[10px] font-semibold text-[#0F766E] uppercase tracking-wider">
                  Operations Console
                </span>
              </div>
            </button>

            {/* MAIN HOST TABS */}
            <nav className="hidden md:flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => navigateTo('/host/')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currentPath === '/host/' || currentPath === '/host'
                    ? 'bg-white text-[#0F766E] shadow-xs font-bold'
                    : 'text-[#64748B] hover:text-[#141B2C]'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigateTo('/host/spaces')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currentPath.startsWith('/host/spaces') || currentPath.startsWith('/host/facilities')
                    ? 'bg-white text-[#0F766E] shadow-xs font-bold'
                    : 'text-[#64748B] hover:text-[#141B2C]'
                }`}
              >
                Spaces & Inventory
              </button>
              <button
                onClick={() => navigateTo('/host/pricing')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  currentPath.startsWith('/host/pricing')
                    ? 'bg-white text-[#0F766E] shadow-xs font-bold'
                    : 'text-[#64748B] hover:text-[#141B2C]'
                }`}
              >
                Tariffs & Pricing
              </button>
              <button
                onClick={() => navigateTo('/host/spaces/matrix')}
                className="px-3 py-1.5 rounded-lg text-[#64748B] hover:text-[#141B2C] transition-all cursor-pointer"
              >
                24-Bay Matrix
              </button>
            </nav>
          </div>

          {/* RIGHT TOOLS & SCREEN SWITCHER */}
          <div className="flex items-center gap-3">
            {/* Phase 05 Screen Quick Switcher Dropdown */}
            <div className="hidden lg:flex items-center gap-1.5 bg-[#F0FDFA] border border-[#CCFBF1] px-2.5 py-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-[#0F766E] uppercase font-mono">PH05 Screens:</span>
              <select
                onChange={(e) => {
                  if (e.target.value) navigateTo(e.target.value);
                }}
                value={currentPath}
                className="bg-transparent text-[#0F766E] font-semibold text-xs outline-none cursor-pointer"
              >
                <option value="/host/">Dashboard (/host/)</option>
                <optgroup label="Group 3: Facility & Physical Spaces">
                  <option value="/host/spaces">pe_hw_02_01: Spaces Overview</option>
                  <option value="/host/facilities/new">pe_hw_02_02: Add Facility Wizard</option>
                  <option value={`/host/facilities/${defaultFacilityId}/gate`}>pe_hw_02_03: Gate & Entrance</option>
                  <option value={`/host/facilities/${defaultFacilityId}/layout`}>pe_hw_02_04: Bay Layout Matrix</option>
                  <option value={`/host/spaces/${defaultSpaceId}/edit`}>pe_hw_02_05: Edit Individual Bay</option>
                  <option value={`/host/spaces/${defaultSpaceId}/restrictions`}>pe_hw_02_06: Vehicle Compatibility</option>
                  <option value={`/host/spaces/${defaultSpaceId}/amenities`}>pe_hw_02_07: Amenities & Directives</option>
                  <option value={`/host/facilities/${defaultFacilityId}/preview`}>pe_hw_02_08: Photos & Listing Preview</option>
                  <option value={`/host/facilities/${defaultFacilityId}/publish`}>pe_hw_02_09: Publication Readiness</option>
                  <option value="/host/spaces/matrix">pe_hp_04_01: Interactive Bay Manager</option>
                </optgroup>
                <optgroup label="Group 4: Tariffs, Operating Hours & Pricing">
                  <option value="/host/pricing">pe_hw_03_01: Tariff Overview & Surge</option>
                  <option value="/host/pricing/rates">pe_hw_03_02: Configure Rate Rules</option>
                  <option value="/host/pricing/schedule">pe_hw_03_03: Weekly Operating Hours</option>
                  <option value="/host/pricing/closures">pe_hw_03_04: Date Closures</option>
                  <option value="/host/pricing/rules">pe_hw_03_05: Booking Horizons & Buffers</option>
                  <option value="/host/pricing/estimate">pe_hw_03_06: Driver Simulator & Earnings</option>
                  <option value="/host/pricing/bulk">pe_hw_03_07: Bulk Tariff Modifier</option>
                  <option value="/host/pricing/conflicts">pe_hw_03_08: Conflict Resolution</option>
                  <option value="/host/pricing/history">pe_hw_03_09: Tariff Audit Log</option>
                </optgroup>
              </select>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#141B2C] hidden sm:inline">
                  {currentUser.fullName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateTo('/host/login')}
                  className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-bold shadow-xs hover:bg-[#0D655E] cursor-pointer"
                >
                  Host Login
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Host Operations Command
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Active Facility: <strong>Anna Nagar Plaza Covered Garage (#FAC-0104)</strong> • 24 Physical Bays
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/host/facilities/new')}
              className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Add Parking Facility</span>
            </button>
            <button
              onClick={() => navigateTo('/host/spaces/matrix')}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Visual 24-Bay Matrix
            </button>
          </div>
        </div>

        {/* 4-COLUMN METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Today's Earnings</span>
              <span className="text-lg">₹</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">₹4,820.00</div>
            <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-semibold mt-1">
              <span>+14% vs ystd</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">Ledger synced</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Active Occupancy</span>
              <span className="text-lg">🚗</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">18 / 24</div>
            <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-semibold mt-1">
              <span>75% Capacity</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">6 bays free</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Today's Check-ins</span>
              <span className="text-lg">⏱️</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">42 Arrivals</div>
            <div className="flex items-center gap-1.5 text-xs text-[#027A48] font-semibold mt-1">
              <span>+8 vs average</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">0 overstays</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
              <span>Pending Payout</span>
              <span className="text-lg">🏦</span>
            </div>
            <div className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">₹28,450.00</div>
            <div className="flex items-center gap-1.5 text-xs text-[#0F766E] font-semibold mt-1">
              <span>Direct NEFT</span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-[#64748B] font-normal">Weekly cycle</span>
            </div>
          </div>
        </div>

        {/* WORKSPACE SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* CARD 1: INVENTORY MANAGEMENT */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Inventory Management
                </span>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  pe_hp_04_01
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                Parking Bay & Slot Allocations
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Configure 24 physical bays across Basements 1 & 2, EV chargers, dimensional clearances, and equipment tags.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Slots: <strong>24 Registered</strong></span>
              <button
                onClick={() => navigateTo('/host/spaces')}
                className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
              >
                Manage Bays →
              </button>
            </div>
          </div>

          {/* CARD 2: TARIFFS & OPERATING HOURS */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Commercial Tariffs
                </span>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  pe_hw_03_01
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                Rates, Hours & Peak Multipliers
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Base hourly rates, surge curves, 7-day weekly operating hours, holiday closures, and driver billing simulator.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Base: <strong>₹40.00/hr</strong></span>
              <button
                onClick={() => navigateTo('/host/pricing')}
                className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
              >
                Pricing Hub →
              </button>
            </div>
          </div>

          {/* CARD 3: PUBLICATION READINESS AUDIT */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Listing Status
                </span>
                <span className="text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  pe_hw_02_09
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141B2C] mb-1 font-['Plus_Jakarta_Sans']">
                Publication Readiness Audit
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Pre-flight checklist evaluating GPS precision, minimum bay quotas, safety rules, and driver marketplace status.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#027A48] font-bold">✓ 100% Certified</span>
              <button
                onClick={() => navigateTo(`/host/facilities/${defaultFacilityId}/publish`)}
                className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
              >
                Pre-Flight Audit →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System (Part 05).</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Monorepo App: <code>apps/host</code></span>
            <span>•</span>
            <button onClick={() => navigateTo('/host/spaces')} className="hover:underline">
              Host Inventory
            </button>
            <span>•</span>
            <button onClick={() => navigateTo('/host/pricing')} className="hover:underline">
              Pricing Hub
            </button>
            {onNavigateToWebsite && (
              <>
                <span>•</span>
                <button onClick={onNavigateToWebsite} className="hover:underline">
                  Customer Website
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HostPortalApp() {
  return (
    <BrandProvider>
      <HostPortalContent />
    </BrandProvider>
  );
}
