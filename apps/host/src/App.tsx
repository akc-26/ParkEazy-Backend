import React, { useState, useEffect } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';

// Group 1: Auth & Onboarding Pages (pe_hw_01_01 to pe_hw_01_09) - Design: HP-01
import { HostLoginPage } from './pages/HostLoginPage';
import { HostRegisterPage } from './pages/HostRegisterPage';
import { HostVerificationPage } from './pages/HostVerificationPage';
import { HostPasswordRecoveryPage } from './pages/HostPasswordRecoveryPage';
import { HostOnboardingOverviewPage } from './pages/HostOnboardingOverviewPage';
import { HostProfileContactDetailsPage } from './pages/HostProfileContactDetailsPage';
import { HostEligibilityPage } from './pages/HostEligibilityPage';
import { HostApplicationStatusPage } from './pages/HostApplicationStatusPage';
import { HostAccessExceptionsPage } from './pages/HostAccessExceptionsPage';

// Group 2: Host Operations Dashboard & Metrics (pe_hp_02_01, pe_hp_04_01, pe_hp_07_01) - Design: HP-02, HP-04, HP-07
import { HostOperationsDashboardPage } from './pages/HostOperationsDashboardPage';
import { HostBookingOperationsPage } from './pages/HostBookingOperationsPage';
import { HostSpacesInventoryManagementPage } from './pages/HostSpacesInventoryManagementPage';

// Group 3: Facility Setup & Physical Spaces (pe_hw_02_01 to pe_hw_02_09) - Design: HP-03, HP-04
import { HostSpacesOverviewPage } from './pages/HostSpacesOverviewPage';
import { AddParkingFacilityWizardPage } from './pages/AddParkingFacilityWizardPage';
import { FacilityDetailsEntrancePage } from './pages/FacilityDetailsEntrancePage';
import { PhysicalInventoryBayLayoutPage } from './pages/PhysicalInventoryBayLayoutPage';
import { AddEditParkingSpacePage } from './pages/AddEditParkingSpacePage';
import { VehicleCompatibilityRestrictionsPage } from './pages/VehicleCompatibilityRestrictionsPage';
import { SpaceAmenitiesAccessInstructionsPage } from './pages/SpaceAmenitiesAccessInstructionsPage';
import { PhotosListingPreviewPage } from './pages/PhotosListingPreviewPage';
import { InventoryValidationPublicationReadinessPage } from './pages/InventoryValidationPublicationReadinessPage';

// Group 4: Availability Schedules & Space Pricing (pe_hw_03_01 to pe_hw_03_09) - Design: HP-05, HP-06
import { AvailabilityPricingOverviewPage } from './pages/AvailabilityPricingOverviewPage';
import { SpacePricingConfigurationPage } from './pages/SpacePricingConfigurationPage';
import { OperatingHoursWeeklySchedulePage } from './pages/OperatingHoursWeeklySchedulePage';
import { DateSpecificAvailabilityClosuresPage } from './pages/DateSpecificAvailabilityClosuresPage';
import { BookingDurationAdvanceBookingRulesPage } from './pages/BookingDurationAdvanceBookingRulesPage';
import { PricingPreviewEarningsEstimatePage } from './pages/PricingPreviewEarningsEstimatePage';
import { BulkPricingScheduleUpdatesPage } from './pages/BulkPricingScheduleUpdatesPage';
import { AvailabilityConflictChangeReviewPage } from './pages/AvailabilityConflictChangeReviewPage';
import { PricingAvailabilityChangeHistoryPage } from './pages/PricingAvailabilityChangeHistoryPage';

// Group 5: Arrivals, Check-In & Gate Operations (pe_hw_04_01 to pe_hw_04_09) - Design: HP-07, HP-08, HP-09
import { HostBookingOperationsOverviewPage } from './pages/HostBookingOperationsOverviewPage';
import { BookingListSearchPage } from './pages/BookingListSearchPage';
import { BookingDetailsCommercialTermsPage } from './pages/BookingDetailsCommercialTermsPage';
import { ArrivalCheckInOperationsPage } from './pages/ArrivalCheckInOperationsPage';
import { ActiveParkingOccupancyPage } from './pages/ActiveParkingOccupancyPage';
import { DepartureCheckOutOperationsPage } from './pages/DepartureCheckOutOperationsPage';
import { ExtensionRequestsDecisionsPage } from './pages/ExtensionRequestsDecisionsPage';
import { BookingExceptionsConflictResolutionPage } from './pages/BookingExceptionsConflictResolutionPage';
import { OperationalActivityBookingAuditPage } from './pages/OperationalActivityBookingAuditPage';

// Group 6: Host Earnings, Financials & Settlements (pe_hw_05_01 to pe_hw_05_09) - Design: HP-10
import { HostEarningsFinancialOverviewPage } from './pages/HostEarningsFinancialOverviewPage';
import { BookingLevelEarningsLedgerPage } from './pages/BookingLevelEarningsLedgerPage';
import { PlatformCommissionFeeBreakdownPage } from './pages/PlatformCommissionFeeBreakdownPage';
import { PayoutAccountSettlementSettingsPage } from './pages/PayoutAccountSettlementSettingsPage';
import { PayoutScheduleUpcomingSettlementsPage } from './pages/PayoutScheduleUpcomingSettlementsPage';
import { PayoutHistorySettlementDetailsPage } from './pages/PayoutHistorySettlementDetailsPage';
import { RefundsAdjustmentsDisputedTransactionsPage } from './pages/RefundsAdjustmentsDisputedTransactionsPage';
import { EarningsReportsExportCentrePage } from './pages/EarningsReportsExportCentrePage';
import { FinancialExceptionsReconciliationStatesPage } from './pages/FinancialExceptionsReconciliationStatesPage';

// Group 7: Workspace, Team & Account Settings (pe_hw_06_01 to pe_hw_06_09) - Design: HP-11, HP-12, HP-13
import { HostWorkspaceSettingsOverviewPage } from './pages/HostWorkspaceSettingsOverviewPage';
import { HostProfileBusinessDetailsPage } from './pages/HostProfileBusinessDetailsPage';
import { FacilityPreferencesOperationalSettingsPage } from './pages/FacilityPreferencesOperationalSettingsPage';
import { TeamMembersInvitationsPage } from './pages/TeamMembersInvitationsPage';
import { RolesPermissionManagementPage } from './pages/RolesPermissionManagementPage';
import { NotificationCentreActivityAlertsPage } from './pages/NotificationCentreActivityAlertsPage';
import { NotificationPreferencesDeliveryChannelsPage } from './pages/NotificationPreferencesDeliveryChannelsPage';
import { SecuritySessionsAccountAccessPage } from './pages/SecuritySessionsAccountAccessPage';
import { HelpSupportHostAccountIssuesPage } from './pages/HelpSupportHostAccountIssuesPage';

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

  const [showScreenNavigator, setShowScreenNavigator] = useState(false);

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

  const defaultFacilityId = '7bf5f8dd-95b9-426e-993f-e747271ae424';
  const defaultSpaceId = 'sp-anna-04';

  const extractParam = (path: string, pattern: RegExp, fallback: string): string => {
    const match = path.match(pattern);
    return match && match[1] && match[1] !== 'undefined' ? match[1] : fallback;
  };

  // --- 57 APPROVED SCREEN ROUTING ENGINE ---

  // GROUP 1: AUTH & ONBOARDING (9 SCREENS) - HP-01
  if (currentPath === '/host/login') {
    return <HostLoginPage onNavigate={navigateTo} onSuccess={handleAuthSuccess} />;
  }
  if (currentPath === '/host/register' || currentPath === '/host/signup') {
    return <HostRegisterPage onNavigate={navigateTo} onSuccess={handleAuthSuccess} />;
  }
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
  if (currentPath === '/host/forgot-password' || currentPath === '/host/password-recovery') {
    return <HostPasswordRecoveryPage onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/onboarding' || currentPath === '/host/onboarding/overview') {
    return <HostOnboardingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/onboarding/profile' || currentPath === '/host/profile' || currentPath === '/host/onboarding/contact') {
    return <HostProfileContactDetailsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/onboarding/eligibility' || currentPath === '/host/eligibility') {
    return <HostEligibilityPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/application-status' || currentPath === '/host/onboarding/status') {
    return <HostApplicationStatusPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/exceptions' || currentPath === '/host/access-status' || currentPath === '/host/onboarding/exceptions') {
    return <HostAccessExceptionsPage onNavigate={navigateTo} />;
  }

  // GROUP 2: HOST OPERATIONS DASHBOARD & METRICS (3 SCREENS) - HP-02, HP-04, HP-07
  if (currentPath === '/host/dashboard') {
    return <HostOperationsDashboardPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/operations/manifest') {
    return <HostBookingOperationsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/spaces/matrix' || currentPath === '/host/matrix') {
    return <HostSpacesInventoryManagementPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // GROUP 3: FACILITY SETUP & PHYSICAL SPACES (9 SCREENS) - HP-03, HP-04
  if (currentPath === '/host/spaces') {
    return <HostSpacesOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/facilities/new') {
    return <AddParkingFacilityWizardPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/gate')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/gate/, defaultFacilityId);
    return <FacilityDetailsEntrancePage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/layout')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/layout/, defaultFacilityId);
    return <PhysicalInventoryBayLayoutPage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/edit')) {
    const spId = extractParam(currentPath, /\/host\/spaces\/([^/]+)\/edit/, defaultSpaceId);
    return <AddEditParkingSpacePage facilityId={defaultFacilityId} spaceId={spId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/restrictions')) {
    const spId = extractParam(currentPath, /\/host\/spaces\/([^/]+)\/restrictions/, defaultSpaceId);
    return <VehicleCompatibilityRestrictionsPage facilityId={defaultFacilityId} spaceId={spId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/spaces/') && currentPath.endsWith('/amenities')) {
    const spId = extractParam(currentPath, /\/host\/spaces\/([^/]+)\/amenities/, defaultSpaceId);
    return <SpaceAmenitiesAccessInstructionsPage facilityId={defaultFacilityId} spaceId={spId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/preview')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/preview/, defaultFacilityId);
    return <PhotosListingPreviewPage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/facilities/') && currentPath.endsWith('/publish')) {
    const facId = extractParam(currentPath, /\/host\/facilities\/([^/]+)\/publish/, defaultFacilityId);
    return <InventoryValidationPublicationReadinessPage facilityId={facId} currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // GROUP 4: AVAILABILITY SCHEDULES & PRICING (9 SCREENS) - HP-05, HP-06
  if (currentPath === '/host/pricing' || currentPath === '/host/pricing/overview') {
    return <AvailabilityPricingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/rates') {
    return <SpacePricingConfigurationPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/schedule' || currentPath === '/host/pricing/hours') {
    return <OperatingHoursWeeklySchedulePage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/closures') {
    return <DateSpecificAvailabilityClosuresPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/rules') {
    return <BookingDurationAdvanceBookingRulesPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/estimate' || currentPath === '/host/pricing/simulator') {
    return <PricingPreviewEarningsEstimatePage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/bulk') {
    return <BulkPricingScheduleUpdatesPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/conflicts') {
    return <AvailabilityConflictChangeReviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/pricing/history' || currentPath === '/host/pricing/audit') {
    return <PricingAvailabilityChangeHistoryPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // GROUP 5: ARRIVALS, CHECK-IN & GATE OPERATIONS (9 SCREENS) - HP-07, HP-08, HP-09
  if (currentPath === '/host/gate' || currentPath === '/host/operations' || currentPath === '/host/bookings') {
    return <HostBookingOperationsOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/search') {
    return <BookingListSearchPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath.startsWith('/host/gate/bookings/')) {
    const bookingId = extractParam(currentPath, /\/host\/gate\/bookings\/([^/]+)/, '5987de02-55dc-4b62-9285-12cb19ebbd45');
    return <BookingDetailsCommercialTermsPage bookingId={bookingId} currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/check-in') {
    return <ArrivalCheckInOperationsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/occupancy') {
    return <ActiveParkingOccupancyPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/check-out') {
    return <DepartureCheckOutOperationsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/extensions') {
    return <ExtensionRequestsDecisionsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/conflicts') {
    return <BookingExceptionsConflictResolutionPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/gate/audit') {
    return <OperationalActivityBookingAuditPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // GROUP 6: HOST EARNINGS, FINANCIALS & SETTLEMENTS (9 SCREENS) - HP-10
  if (currentPath === '/host/earnings' || currentPath === '/host/financials') {
    return <HostEarningsFinancialOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/ledger') {
    return <BookingLevelEarningsLedgerPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/fees') {
    return <PlatformCommissionFeeBreakdownPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/account') {
    return <PayoutAccountSettlementSettingsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/schedule') {
    return <PayoutScheduleUpcomingSettlementsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/payouts' || currentPath === '/host/earnings/history') {
    return <PayoutHistorySettlementDetailsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/disputes') {
    return <RefundsAdjustmentsDisputedTransactionsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/export') {
    return <EarningsReportsExportCentrePage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/earnings/exceptions') {
    return <FinancialExceptionsReconciliationStatesPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // GROUP 7: WORKSPACE, TEAM & ACCOUNT SETTINGS (9 SCREENS) - HP-11, HP-12, HP-13
  if (currentPath === '/host/settings') {
    return <HostWorkspaceSettingsOverviewPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/business') {
    return <HostProfileBusinessDetailsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/operations') {
    return <FacilityPreferencesOperationalSettingsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/team') {
    return <TeamMembersInvitationsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/roles') {
    return <RolesPermissionManagementPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/notifications') {
    return <NotificationCentreActivityAlertsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/channels') {
    return <NotificationPreferencesDeliveryChannelsPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/security') {
    return <SecuritySessionsAccountAccessPage currentUser={currentUser} onNavigate={navigateTo} />;
  }
  if (currentPath === '/host/settings/support') {
    return <HelpSupportHostAccountIssuesPage currentUser={currentUser} onNavigate={navigateTo} />;
  }

  // DEFAULT ROOT FOR HOST: Render Operations Dashboard (HP-02)
  return <HostOperationsDashboardPage currentUser={currentUser} onNavigate={navigateTo} />;
}

export default function HostApp() {
  return (
    <BrandProvider>
      <HostPortalContent />
    </BrandProvider>
  );
}
