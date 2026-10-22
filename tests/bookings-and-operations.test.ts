import { describe, it, expect, beforeEach } from 'vitest';
import { FacilitiesService } from '../services/api/src/modules/facilities/facilities.service.js';
import { BookingsService } from '../services/api/src/modules/bookings/bookings.service.js';
import { HostOpsService } from '../services/api/src/modules/host/host.service.js';
import { AdminService } from '../services/api/src/modules/admin/admin.service.js';
import { AuthService } from '../services/api/src/modules/auth/auth.service.js';
import { UsersService } from '../services/api/src/modules/users/users.service.js';

describe('Part 06+: Bookings Lifecycle, Host Operations & Admin Panel Test Suite', () => {
  let facilitiesService: FacilitiesService;
  let bookingsService: BookingsService;
  let hostOpsService: HostOpsService;
  let adminService: AdminService;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(() => {
    process.env.PARKEAZY_DEMO_MODE = 'true';
    facilitiesService = new FacilitiesService();
    bookingsService = new BookingsService(facilitiesService);
    hostOpsService = new HostOpsService(bookingsService, facilitiesService);
    authService = new AuthService(undefined as any);
    usersService = new UsersService(undefined as any, authService);
    adminService = new AdminService(facilitiesService, bookingsService, authService, usersService);
  });

  describe('1. Booking Pricing Calculation & Business Rules', () => {
    it('should accurately calculate base amount, 15% platform commission, and 18% GST', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const testSpace = spaces[0];

      const now = new Date();
      const startsAt = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
      const endsAt = new Date(now.getTime() + 1000 * 60 * 60 * 4).toISOString(); // 3 hours

      const pricing = await bookingsService.calculatePricing(testSpace.id, startsAt, endsAt);
      expect(pricing.durationHours).toBe(3);
      expect(pricing.hourlyRateInr).toBe(40);
      expect(pricing.baseAmountInr).toBe(120);
      expect(pricing.platformFeeInr).toBe(18); // 15% of 120
      expect(pricing.taxInr).toBe(24.84); // 18% of (120 + 18)
      expect(pricing.totalAmountInr).toBe(162.84);
    });

    it('should reject invalid booking timeframes where endsAt is before startsAt', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const startsAt = '2026-03-20T14:00:00Z';
      const endsAt = '2026-03-20T12:00:00Z';

      await expect(
        bookingsService.calculatePricing(spaces[0].id, startsAt, endsAt)
      ).rejects.toThrow();
    });
  });

  describe('Part 07 booking window validation', () => {
    it('rejects booking requests that start too soon', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 65 * 60 * 1000).toISOString();
      await expect(bookingsService.holdSpace('00000000-0000-4000-a000-000000000003', spaces[0].id, startsAt, endsAt)).rejects.toThrow(/15 minutes/);
    });

    it('rejects booking windows over 72 hours', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 74 * 60 * 60 * 1000).toISOString();
      await expect(bookingsService.holdSpace('00000000-0000-4000-a000-000000000003', spaces[0].id, startsAt, endsAt)).rejects.toThrow(/72 hours/);
    });
  });

  describe('2. Ephemeral Hold Lease (Concurrency Control)', () => {
    it('should create a 10-minute hold lease and prevent conflicting holds', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const testSpace = spaces[0];

      const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

      const hold = await bookingsService.holdSpace(
        '00000000-0000-4000-a000-000000000003',
        testSpace.id,
        startsAt,
        endsAt
      );

      expect(hold.id).toBeDefined();
      expect(hold.isReleased).toBe(false);
      const expiresAtMs = new Date(hold.expiresAt).getTime();
      const createdAtMs = new Date(hold.createdAt).getTime();
      expect(expiresAtMs - createdAtMs).toBe(10 * 60 * 1000); // 10 minutes TTL
    });

    it('does not allow another customer to renew a hold', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const hold = await bookingsService.holdSpace('00000000-0000-4000-a000-000000000003', spaces[0].id, startsAt, endsAt);
      await expect(bookingsService.renewHold(hold.id, '00000000-0000-4000-a000-000000000004')).rejects.toThrow(/another customer/);
    });

    it('does not allow overlapping holds even for the same customer', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const userId = '00000000-0000-4000-a000-000000000003';
      await bookingsService.holdSpace(userId, spaces[0].id, startsAt, endsAt);
      await expect(bookingsService.holdSpace(userId, spaces[0].id, startsAt, endsAt)).rejects.toThrow(/already booked or held/);
    });
  });

  describe('3. Booking Lifecycle Operations', () => {
    it('should create confirmed booking and return valid QR access token', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const testSpace = spaces[0];

      const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

      const booking = await bookingsService.createBooking(
        '00000000-0000-4000-a000-000000000003',
        'default',
        {
          spaceId: testSpace.id,
          facilityId: facilities[0].id,
          vehiclePlate: 'TN-09-CB-4821',
          vehicleCategory: 'car',
          startsAt,
          endsAt,
        }
      );

      expect(booking.bookingReference).toMatch(/^#PKZ-2026-\d{4}$/);
      expect(booking.status).toBe('confirmed');
      expect(booking.qrAccessToken).toMatch(/^qr-/);
      expect(booking.vehiclePlate).toBe('TN-09-CB-4821');

      // Check-in
      const checkedIn = await bookingsService.checkIn(booking.id);
      expect(checkedIn.status).toBe('active');
      expect(checkedIn.actualCheckInAt).toBeDefined();

      // Extend
      const originalBase = booking.pricing.baseAmountInr;
      const extended = await bookingsService.extendBooking(booking.id, 1);
      expect(extended.pricing.baseAmountInr).toBeGreaterThan(originalBase);

      // Check-out
      const completed = await bookingsService.checkOut(booking.id);
      expect(completed.status).toBe('completed');
      expect(completed.actualCheckOutAt).toBeDefined();

      // Generate receipt
      const receipt = await bookingsService.getReceipt(booking.id);
      expect(receipt.sacCode).toBe('996729');
      expect(receipt.bookingReference).toBe(booking.bookingReference);
      expect(receipt.totalAmountInr).toBe(completed.pricing.totalAmountInr);
    });

    it('should calculate proper refund on cancellation', async () => {
      const facilities = await facilitiesService.listHostFacilities('00000000-0000-4000-a000-000000000002');
      const spaces = await facilitiesService.listSpaces(facilities[0].id);
      const testSpace = spaces[0];

      const now = Date.now();
      const startsAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
      const endsAt = new Date(now + 26 * 60 * 60 * 1000).toISOString();

      const booking = await bookingsService.createBooking(
        '00000000-0000-4000-a000-000000000003',
        'default',
        {
          spaceId: testSpace.id,
          facilityId: facilities[0].id,
          vehiclePlate: 'TN-09-CB-4821',
          vehicleCategory: 'car',
          startsAt,
          endsAt,
        }
      );

      const res = await bookingsService.cancelBooking(booking.id, 'Changed travel schedule');
      expect(res.status).toBe('cancelled');
      expect(res.refundAmountInr).toBe(booking.pricing.totalAmountInr); // 100% refund when > 2 hours ahead
    });
  });

  describe('4. Host Operations & Financial Summary', () => {
    it('should compute gross earnings, platform commission, and net payouts from bookings', async () => {
      const earnings = await hostOpsService.getEarnings('00000000-0000-4000-a000-000000000002');
      expect(earnings.grossEarningsInr).toBeGreaterThanOrEqual(0);
      expect(earnings.platformCommissionInr).toBeGreaterThanOrEqual(0);
      expect(earnings.netPayoutInr).toBeGreaterThanOrEqual(0);
      expect(earnings.pendingBalanceInr).toBeGreaterThanOrEqual(0);
    });

    it('should reject payout requests when settlement provider is not configured', async () => {
      await expect(
        hostOpsService.requestPayout('00000000-0000-4000-a000-000000000002')
      ).rejects.toThrow('persistent settlement provider has not been configured');
    });

    it('should return occupancy map across host facilities', async () => {
      const occupancy = await hostOpsService.getOccupancy('00000000-0000-4000-a000-000000000002');
      expect(occupancy.length).toBeGreaterThan(0);
      expect(occupancy[0].facilityName).toBeDefined();
      expect(occupancy[0].totalSpaces).toBeGreaterThan(0);
    });
  });

  describe('5. Platform Admin Governance', () => {
    it('should return platform overview metrics with user and financial counts', async () => {
      const overview = await adminService.getPlatformOverview();
      expect(overview.totalUsers).toBeGreaterThan(0);
      expect(overview.totalFacilities).toBeGreaterThan(0);
      expect(overview.grossVolumeInr).toBeGreaterThan(0);
      expect(overview.platformCommissionsInr).toBeGreaterThan(0);
    });

    it('should support moderating facility publication status and auditing action', async () => {
      const facilities = await adminService.getAllFacilities();
      const targetId = facilities[0].id;
      const updated = await adminService.moderateFacility(targetId, 'suspended');
      expect(updated.status).toBe('suspended');

      const auditLogs = adminService.getAuditLogs();
      expect(auditLogs[0].action).toBe('FACILITY_STATUS_MODERATED');
    });

    it('should approve host KYC verification and record audit trail', async () => {
      const approved = await adminService.approveHost('20000000-0000-4000-c000-000000000002');
      expect(approved.isApproved).toBe(true);
      expect(approved.kycStatus).toBe('verified');

      const auditLogs = adminService.getAuditLogs();
      expect(auditLogs[0].action).toBe('HOST_APPROVED');
    });
  });
});
