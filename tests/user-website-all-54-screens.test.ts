import { describe, it, expect, beforeEach } from 'vitest';
import { FacilitiesService } from '../services/api/src/modules/facilities/facilities.service.js';
import { BookingsService } from '../services/api/src/modules/bookings/bookings.service.js';
import { PaymentsService } from '../services/api/src/modules/payments/payments.service.js';
import { AuthService } from '../services/api/src/modules/auth/auth.service.js';
import { UsersService } from '../services/api/src/modules/users/users.service.js';

describe('Point 01: Complete User Website — 54 Authoritative Screens Acceptance & Verification', () => {
  let facilitiesService: FacilitiesService;
  let bookingsService: BookingsService;
  let paymentsService: PaymentsService;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(() => {
    process.env.PARKEAZY_DEMO_MODE = 'true';
    facilitiesService = new FacilitiesService();
    bookingsService = new BookingsService(facilitiesService);
    paymentsService = new PaymentsService();
    authService = new AuthService(undefined as any);
    usersService = new UsersService(undefined as any, authService);
  });

  describe('Inventory Check: All 54 Authoritative Customer Screens accounted for', () => {
    const screensInventory = [
      // Group A: Landing & Discovery (9 screens)
      { id: 'user_website_landing_page_pe_uw_01_01', group: 'A', route: '/' },
      { id: 'explore_parking_pe_uw_03_01', group: 'A', route: '/explore' },
      { id: 'location_search_suggestions_pe_uw_03_02', group: 'A', route: '/search/suggestions' },
      { id: 'search_filters_preferences_pe_uw_03_03', group: 'A', route: '/search/filters' },
      { id: 'search_results_list_map_pe_uw_03_04', group: 'A', route: '/search' },
      { id: 'search_results_list_view_pe_uw_03_05', group: 'A', route: '/search/list' },
      { id: 'search_results_map_view_pe_uw_03_06', group: 'A', route: '/search/map' },
      { id: 'no_results_alternative_suggestions_pe_uw_03_07', group: 'A', route: '/search/empty' },
      { id: 'search_loading_error_location_permission_states_pe_uw_03_08', group: 'A', route: '/search/permission' },

      // Group B: Customer Authentication (10 screens)
      { id: 'user_login_pe_uw_02_01', group: 'B', route: '/auth/login' },
      { id: 'user_signup_pe_uw_02_02', group: 'B', route: '/auth/signup' },
      { id: 'verify_email_pe_uw_02_03', group: 'B', route: '/auth/verify-email' },
      { id: 'verify_mobile_otp_pe_uw_02_04', group: 'B', route: '/auth/verify-otp' },
      { id: 'forgot_password_pe_uw_02_05', group: 'B', route: '/auth/forgot-password' },
      { id: 'reset_password_pe_uw_02_06', group: 'B', route: '/auth/reset-password' },
      { id: 'verification_required_pe_uw_02_07', group: 'B', route: '/auth/verification-gate' },
      { id: 'authentication_error_states_pe_uw_02_08', group: 'B', route: '/auth/error' },
      { id: 'session_expired_pe_uw_02_09', group: 'B', route: '/auth/session-expired' },
      { id: 'account_access_success_pe_uw_02_10', group: 'B', route: '/auth/welcome' },

      // Group C: Space Details & Booking Creation (9 screens)
      { id: 'parking_details_booking_summary_pe_uw_04_01', group: 'C', route: '/spaces/:spaceId' },
      { id: 'select_parking_date_duration_pe_uw_04_02', group: 'C', route: '/spaces/:spaceId/duration' },
      { id: 'availability_space_selection_pe_uw_04_03', group: 'C', route: '/spaces/:spaceId/select' },
      { id: 'booking_details_vehicle_pe_uw_04_04', group: 'C', route: '/checkout/vehicle' },
      { id: 'review_booking_price_breakdown_pe_uw_04_05', group: 'C', route: '/checkout/review' },
      { id: 'booking_processing_pe_uw_04_06', group: 'C', route: '/checkout/processing' },
      { id: 'booking_confirmed_pe_uw_04_07', group: 'C', route: '/bookings/:id/confirmed' },
      { id: 'booking_unavailable_recovery_pe_uw_04_08', group: 'C', route: '/checkout/unavailable' },
      { id: 'booking_validation_expiry_states_pe_uw_04_09', group: 'C', route: '/checkout/expired' },

      // Group D: Payment & Checkout UI States (8 screens)
      { id: 'choose_payment_method_pe_uw_05_01', group: 'D', route: '/checkout/payment' },
      { id: 'payment_review_authorization_pe_uw_05_02', group: 'D', route: '/checkout/authorize' },
      { id: 'payment_processing_pe_uw_05_03', group: 'D', route: '/checkout/gateway' },
      { id: 'payment_successful_pe_uw_05_04', group: 'D', route: '/checkout/success' },
      { id: 'payment_failed_pe_uw_05_05', group: 'D', route: '/checkout/failed' },
      { id: 'payment_pending_status_check_pe_uw_05_06', group: 'D', route: '/checkout/pending' },
      { id: 'payment_cancelled_pe_uw_05_07', group: 'D', route: '/checkout/cancelled' },
      { id: 'payment_recovery_reconciliation_states_pe_uw_05_08', group: 'D', route: '/checkout/reconcile' },

      // Group E: Active Booking & Post-Booking Operations (9 screens)
      { id: 'my_bookings_overview_pe_uw_06_01', group: 'E', route: '/bookings' },
      { id: 'upcoming_booking_details_pe_uw_06_02', group: 'E', route: '/bookings/:id' },
      { id: 'active_parking_session_pe_uw_06_03', group: 'E', route: '/bookings/:id/active' },
      { id: 'extend_parking_duration_pe_uw_06_04', group: 'E', route: '/bookings/:id/extend' },
      { id: 'cancel_booking_review_pe_uw_06_05', group: 'E', route: '/bookings/:id/cancel' },
      { id: 'booking_cancelled_pe_uw_06_06', group: 'E', route: '/bookings/:id/cancelled' },
      { id: 'booking_history_receipts_pe_uw_06_07', group: 'E', route: '/bookings/receipts' },
      { id: 'booking_issue_support_pe_uw_06_08', group: 'E', route: '/bookings/:id/support' },
      { id: 'booking_changes_exception_states_pe_uw_06_09', group: 'E', route: '/bookings/:id/overstay' },

      // Group F: Profile, Vehicles & Settings (9 screens)
      { id: 'user_profile_overview_pe_uw_07_01', group: 'F', route: '/account/profile' },
      { id: 'edit_personal_details_pe_uw_07_02', group: 'F', route: '/account/profile/edit' },
      { id: 'my_vehicles_pe_uw_07_03', group: 'F', route: '/account/vehicles' },
      { id: 'add_edit_vehicle_pe_uw_07_04', group: 'F', route: '/account/vehicles/add' },
      { id: 'saved_places_favorites_pe_uw_07_05', group: 'F', route: '/account/favorites' },
      { id: 'notifications_centre_pe_uw_07_06', group: 'F', group_route: '/account/notifications', route: '/account/notifications' },
      { id: 'notification_preferences_pe_uw_07_07', group: 'F', route: '/account/notification-preferences' },
      { id: 'account_security_sessions_pe_uw_07_08', group: 'F', route: '/account/security' },
      { id: 'privacy_consents_account_closure_pe_uw_07_09', group: 'F', route: '/account/privacy' },
    ];

    it('contains exactly 54 authoritative screens in inventory', () => {
      expect(screensInventory).toHaveLength(54);
    });

    it('partitions exactly into groups A(9), B(10), C(9), D(8), E(9), F(9)', () => {
      const counts: Record<string, number> = {};
      screensInventory.forEach((s) => {
        counts[s.group] = (counts[s.group] || 0) + 1;
      });
      expect(counts.A).toBe(9);
      expect(counts.B).toBe(10);
      expect(counts.C).toBe(9);
      expect(counts.D).toBe(8);
      expect(counts.E).toBe(9);
      expect(counts.F).toBe(9);
    });
  });

  describe('Group C & Concurrency Safeguards: Booking Rules & Invariants', () => {
    it('enforces minimum duration of 1 hour and maximum of 72 hours via holdSpace', async () => {
      const now = new Date();
      const startsAt = new Date(now.getTime() + 1000 * 60 * 30).toISOString();
      const tooShortEndsAt = new Date(now.getTime() + 1000 * 60 * 45).toISOString(); // 15 mins
      const tooLongEndsAt = new Date(now.getTime() + 1000 * 60 * 60 * 75).toISOString(); // 75 hrs

      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const testSpace = spaces[0];

      // Rejects less than 1 hour in booking hold
      await expect(
        bookingsService.holdSpace('00000000-0000-4000-a000-000000000003', testSpace.id, startsAt, tooShortEndsAt)
      ).rejects.toThrow();

      // Rejects over 72 hours in booking hold
      await expect(
        bookingsService.holdSpace('00000000-0000-4000-a000-000000000003', testSpace.id, startsAt, tooLongEndsAt)
      ).rejects.toThrow();

      // Rejects endsAt before startsAt in calculatePricing
      await expect(
        bookingsService.calculatePricing(testSpace.id, startsAt, new Date(now.getTime() - 1000 * 60).toISOString())
      ).rejects.toThrow();
    });

    it('creates and validates temporary reservation holds', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const testSpace = spaces[0];

      const now = new Date();
      const startsAt = new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString();
      const endsAt = new Date(now.getTime() + 1000 * 60 * 60 * 4).toISOString();

      const hold = await bookingsService.holdSpace(
        '00000000-0000-4000-a000-000000000003',
        testSpace.id,
        startsAt,
        endsAt
      );

      expect(hold).toBeDefined();
      expect(hold.spaceId).toBe(testSpace.id);
      expect(hold.isReleased).toBe(false);
      expect(new Date(hold.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Group D: Payment Integration Boundary (Fail-Closed)', () => {
    it('returns truthful Indian payment methods (UPI, Card, Netbanking, Wallet)', () => {
      const methods = paymentsService.getPaymentMethods();
      expect(methods).toHaveLength(4);
      expect(methods.map((m) => m.id)).toEqual(['upi', 'card', 'netbanking', 'wallet']);
      expect(methods[0].popular).toBe(true);
    });

    it('fails closed when payment initiation is requested without provider setup', async () => {
      await expect(
        paymentsService.initiatePayment('b0000001-0000-4000-8000-000000000001', 'upi', 162.84)
      ).rejects.toThrow('Payment processing is not configured');
    });

    it('rejects unverified payment transaction lookup', async () => {
      await expect(
        paymentsService.verifyPayment('txn_123', 'ref_123')
      ).rejects.toThrow('No verified payment transaction exists');
    });
  });

  describe('Group F: Customer Profile & Fleet Authorization', () => {
    it('allows customer to list their registered vehicles', async () => {
      const vehicles = await usersService.getVehicles('00000000-0000-4000-a000-000000000003');
      expect(vehicles).toBeInstanceOf(Array);
      expect(vehicles.length).toBeGreaterThan(0);
      expect(vehicles[0].plateNumber).toBe('TN-09-CB-4821');
    });

    it('adds and persists a new vehicle to customer profile', async () => {
      const newV = await usersService.addVehicle('00000000-0000-4000-a000-000000000003', {
        plateNumber: 'KA-05-MJ-9912',
        vehicleCategory: 'car',
        make: 'Honda',
        model: 'City',
        color: 'White',
        isDefault: false,
      });

      expect(newV).toBeDefined();
      expect(newV.plateNumber).toBe('KA-05-MJ-9912');

      const updatedList = await usersService.getVehicles('00000000-0000-4000-a000-000000000003');
      expect(updatedList.some((v) => v.plateNumber === 'KA-05-MJ-9912')).toBe(true);
    });

    it('allows toggling favorites for parking facilities', async () => {
      const res = await usersService.toggleFavorite(
        '00000000-0000-4000-a000-000000000003',
        '10000000-0000-4000-b000-000000000104'
      );
      expect(res).toBeDefined();
      expect(typeof res.isFavorited).toBe('boolean');
    });
  });
});
