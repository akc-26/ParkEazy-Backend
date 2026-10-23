import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db';
import { validateOperatingSchedules, validateClosure, validateMaintenance, validateMaintenanceTransition, validateTimezone } from '@parkeazy/validation';
import { availabilityService } from '../apps/api/services/availability.service';
import { pricingService } from '../apps/api/services/pricing.service';
import { User, FacilityClosure, FacilityMaintenance } from '../server/types';

describe('Section 3B: Operating Hours, Closures, and Maintenance Verification', () => {
  let hostA: User;
  let hostB: User;
  let testFacilityId: string;
  let testBayId: string;

  beforeEach(async () => {
    await db.initialize();

    hostA = (await db.findUserById('usr_host1'))!;
    hostB = (await db.findUserById('usr_host2'))!;

    // Create a dedicated facility owned by Host A
    const fac = await db.createFacility(
      hostA.id,
      {
        name: 'Sec3B Downtown Hub',
        address: '100 Mount Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600002',
        country: 'India',
        latitude: 13.0600,
        longitude: 80.2500,
        type: 'covered',
        totalSpots: 10,
        isCovered: true,
        operatingHours: '24/7',
        timezone: 'Asia/Kolkata',
      }
    );
    testFacilityId = fac.id;

    // Create a bay in the facility
    const bay = await db.createBay(
      testFacilityId,
      {
        bayNumber: 'B-01',
        floor: 'Ground',
        type: 'standard',
        supportedVehicleTypes: ['car'],
        pricePerHour: 50,
      },
      hostA
    );
    testBayId = bay.id;
  });

  // -------------------------------------------------------------------------
  // 1. Operating Hours & Timezone
  // -------------------------------------------------------------------------
  describe('Operating Hours & Timezone', () => {
    it('validates standard 7-day operating hours and overnight spans', () => {
      const validSchedules = [
        { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isClosed: false },
        { dayOfWeek: 2, openTime: '22:00', closeTime: '06:00', isClosed: false, isOvernight: true },
        { dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
      ];

      const res = validateOperatingSchedules(validSchedules);
      expect(res.success).toBe(true);
      expect(res.isValid).toBe(true);
    });

    it('rejects invalid time formats and duplicate day definitions', () => {
      // Invalid time format
      const invalidTime = validateOperatingSchedules([
        { dayOfWeek: 1, openTime: '25:00', closeTime: '12:00', isClosed: false },
      ]);
      expect(invalidTime.success).toBe(false);

      // Duplicate day
      const duplicateDay = validateOperatingSchedules([
        { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
        { dayOfWeek: 1, openTime: '18:00', closeTime: '22:00', isClosed: false },
      ]);
      expect(duplicateDay.success).toBe(false);
      expect(duplicateDay.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('validates IANA timezones and rejects invalid identifiers', () => {
      expect(validateTimezone('Asia/Kolkata').success).toBe(true);
      expect(validateTimezone('America/New_York').success).toBe(true);
      expect(validateTimezone('UTC').success).toBe(true);
      expect(validateTimezone('Invalid/Timezone_Foo').success).toBe(false);
      expect(validateTimezone('').success).toBe(false);
    });

    it('updates operating hours and timezone with ownership enforcement', async () => {
      // Host A can update
      const updated = await db.updateOperatingHours(
        testFacilityId,
        [
          { day: 'Monday', open: '06:00', close: '23:00', isClosed: false },
          { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true },
        ],
        hostA,
        'Asia/Kolkata'
      );
      expect(updated.operatingHours).toBeDefined();
      expect(updated.timezone).toBe('Asia/Kolkata');

      // Host B cannot update Host A's operating hours
      await expect(
        db.updateOperatingHours(
          testFacilityId,
          [{ day: 'Monday', open: '09:00', close: '17:00', isClosed: false }],
          hostB
        )
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Date-Specific Closures
  // -------------------------------------------------------------------------
  describe('Facility Closures', () => {
    it('creates, retrieves, and reconciles closure using dual schema naming', async () => {
      const closure = await db.createFacilityClosure(
        testFacilityId,
        {
          title: 'Monsoon Facility Maintenance Closure',
          reason: 'Severe weather alert and waterproofing',
          startsAt: '2026-11-01T08:00:00.000Z',
          endsAt: '2026-11-01T18:00:00.000Z',
        },
        hostA
      );

      expect(closure.id).toBeDefined();
      // Verifies both NestJS and Express field reconciliations
      expect(closure.startsAt).toBe('2026-11-01T08:00:00.000Z');
      expect(closure.endsAt).toBe('2026-11-01T18:00:00.000Z');
      expect(closure.startDate).toBe('2026-11-01T08:00:00.000Z');
      expect(closure.endDate).toBe('2026-11-01T18:00:00.000Z');

      const list = await db.getFacilityClosures(testFacilityId, hostA);
      expect(list.some(c => c.id === closure.id)).toBe(true);
    });

    it('rejects inverted date ranges (startsAt >= endsAt)', async () => {
      await expect(
        db.createFacilityClosure(
          testFacilityId,
          {
            title: 'Inverted closure',
            startsAt: '2026-11-05T18:00:00.000Z',
            endsAt: '2026-11-05T08:00:00.000Z',
          },
          hostA
        )
      ).rejects.toThrow();
    });

    it('rejects overlapping closures for the same facility', async () => {
      await db.createFacilityClosure(
        testFacilityId,
        {
          title: 'Morning Closure',
          startsAt: '2026-11-10T08:00:00.000Z',
          endsAt: '2026-11-10T14:00:00.000Z',
        },
        hostA
      );

      // Overlapping window
      await expect(
        db.createFacilityClosure(
          testFacilityId,
          {
            title: 'Conflicting Afternoon Overlap',
            startsAt: '2026-11-10T12:00:00.000Z',
            endsAt: '2026-11-10T16:00:00.000Z',
          },
          hostA
        )
      ).rejects.toThrow(/already exists|overlap/i);
    });

    it('preserves existing confirmed bookings and reports conflicts instead of deleting them', async () => {
      // Seed a confirmed booking on testBayId
      const bookingStart = '2026-11-15T10:00:00.000Z';
      const bookingEnd = '2026-11-15T12:00:00.000Z';

      await (db as any).withTransaction(async (client: any) => {
        await (db as any).persistEntity(
          'bookings',
          'bk_test_sec3b_conflict',
          {
            id: 'bk_test_sec3b_conflict',
            bookingReference: 'BK-CONF-3B',
            facilityId: testFacilityId,
            bayId: testBayId,
            userId: 'usr_cust1',
            status: 'confirmed',
            startTime: bookingStart,
            endTime: bookingEnd,
            totalAmount: 100,
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          client
        );
      });

      // Attempt to schedule a closure during that window
      await expect(
        db.createFacilityClosure(
          testFacilityId,
          {
            title: 'Surprise Closure',
            startsAt: '2026-11-15T09:00:00.000Z',
            endsAt: '2026-11-15T13:00:00.000Z',
          },
          hostA
        )
      ).rejects.toThrow(/Conflicting confirmed reservation/i);

      // Verify the booking was NOT cancelled or deleted
      const booking = await db.getBookingById('bk_test_sec3b_conflict');
      expect(booking).toBeDefined();
      expect(booking?.status).toBe('confirmed');
    });

    it('enforces host ownership and tenant isolation on closures', async () => {
      const closure = await db.createFacilityClosure(
        testFacilityId,
        {
          title: 'Host A Closure',
          startsAt: '2026-11-20T08:00:00.000Z',
          endsAt: '2026-11-20T12:00:00.000Z',
        },
        hostA
      );

      // Host B cannot view
      await expect(db.getFacilityClosures(testFacilityId, hostB)).rejects.toThrow(/Unauthorized/i);

      // Host B cannot update
      await expect(
        db.updateFacilityClosure(
          testFacilityId,
          closure.id,
          { title: 'Hacked Title' },
          hostB
        )
      ).rejects.toThrow(/Unauthorized/i);

      // Host B cannot delete
      await expect(
        db.deleteFacilityClosure(testFacilityId, closure.id, hostB)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Maintenance Scheduling & Transitions
  // -------------------------------------------------------------------------
  describe('Facility & Bay Maintenance', () => {
    it('creates bay-specific maintenance and updates bay status while preserving inventory', async () => {
      const maint = await db.createFacilityMaintenance(
        testFacilityId,
        {
          title: 'EV Charger Stall Rewiring',
          description: 'Scheduled Level 2 hardware inspection',
          spaceId: testBayId,
          status: 'in_progress',
          startsAt: '2026-12-01T09:00:00.000Z',
          endsAt: '2026-12-01T15:00:00.000Z',
        },
        hostA
      );

      expect(maint.id).toBeDefined();
      expect(maint.spaceId).toBe(testBayId);
      expect(maint.bayId).toBe(testBayId);
      expect(maint.startsAt).toBe('2026-12-01T09:00:00.000Z');
      expect(maint.endsAt).toBe('2026-12-01T15:00:00.000Z');

      // Bay status should transition to 'maintenance'
      const bay = await db.getBayById(testBayId);
      expect(bay?.status).toBe('maintenance');
    });

    it('validates state transitions: scheduled -> in_progress -> completed', async () => {
      const maint = await db.createFacilityMaintenance(
        testFacilityId,
        {
          title: 'Pressure Washing Bay',
          status: 'scheduled',
          startsAt: '2026-12-05T08:00:00.000Z',
          endsAt: '2026-12-05T12:00:00.000Z',
        },
        hostA
      );

      // scheduled -> in_progress is valid
      const inProg = await db.updateFacilityMaintenance(
        testFacilityId,
        maint.id,
        { status: 'in_progress' },
        hostA
      );
      expect(inProg.status).toBe('in_progress');

      // in_progress -> completed is valid
      const done = await db.updateFacilityMaintenance(
        testFacilityId,
        maint.id,
        { status: 'completed' },
        hostA
      );
      expect(done.status).toBe('completed');

      // completed -> scheduled is invalid
      await expect(
        db.updateFacilityMaintenance(
          testFacilityId,
          maint.id,
          { status: 'scheduled' },
          hostA
        )
      ).rejects.toThrow(/Invalid maintenance status transition/i);
    });

    it('enforces host ownership and tenant isolation on maintenance', async () => {
      const maint = await db.createFacilityMaintenance(
        testFacilityId,
        {
          title: 'Host A Maintenance',
          status: 'scheduled',
          startsAt: '2026-12-10T08:00:00.000Z',
          endsAt: '2026-12-10T12:00:00.000Z',
        },
        hostA
      );

      // Host B cannot list
      await expect(db.getFacilityMaintenance(testFacilityId, hostB)).rejects.toThrow(/Unauthorized/i);

      // Host B cannot update
      await expect(
        db.updateFacilityMaintenance(testFacilityId, maint.id, { status: 'cancelled' }, hostB)
      ).rejects.toThrow(/Unauthorized/i);

      // Host B cannot delete
      await expect(
        db.deleteFacilityMaintenance(testFacilityId, maint.id, hostB)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Downstream Availability Engine Integration
  // -------------------------------------------------------------------------
  describe('Downstream Availability Engine Integration', () => {
    it('correctly reports space unavailable when blocked by maintenance', async () => {
      const { inventoryService } = await import('../apps/api/services/inventory.service');
      const locations = inventoryService.getAllLocations();
      const facility = locations[0];
      const bays = inventoryService.getBaysByLocationId(facility.id);
      const targetBay = bays[0];

      // Create a maintenance block in availabilityService
      availabilityService.createMaintenanceBlock(
        facility.hostId,
        {
          facilityId: facility.id,
          spaceId: targetBay.id,
          title: 'Level 2 EV Hardware Check',
          description: 'Scheduled preventive maintenance',
          startTimeUtc: '2026-12-20T10:00:00.000Z',
          endTimeUtc: '2026-12-20T14:00:00.000Z',
        }
      );

      // Check availability during the maintenance window
      const result = availabilityService.calculateSpaceAvailability(
        facility.id,
        '2026-12-20T11:00:00.000Z',
        '2026-12-20T13:00:00.000Z'
      );

      const space = result.spaces.find(s => s.spaceId === targetBay.id);
      expect(space).toBeDefined();
      expect(space?.isAvailable).toBe(false);
      expect(space?.currentStatus).toContain('Maintenance');
    });

    it('correctly reports space unavailable when blocked by date-specific closure', async () => {
      const { inventoryService } = await import('../apps/api/services/inventory.service');
      const locations = inventoryService.getAllLocations();
      const facility = locations[0];

      // Add closure in pricingService
      pricingService.createClosure(
        facility.hostId,
        {
          facilityId: facility.id,
          title: 'Christmas Day Full Garage Deep Clean',
          reason: 'MAINTENANCE',
          startTimeUtc: '2026-12-25T00:00:00.000Z',
          endTimeUtc: '2026-12-25T23:59:59.000Z',
        },
        facility.hostId
      );

      const result = availabilityService.calculateSpaceAvailability(
        facility.id,
        '2026-12-25T10:00:00.000Z',
        '2026-12-25T12:00:00.000Z'
      );

      // All spaces in facility should be closed
      expect(result.spaces.every(s => !s.isAvailable)).toBe(true);
      expect(result.spaces[0].currentStatus).toContain('Closed');
    });
  });
});
