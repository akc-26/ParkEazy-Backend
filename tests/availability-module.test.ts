process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient, ApiError } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { inventoryService } from '../apps/api/services/inventory.service';
import { availabilityService } from '../apps/api/services/availability.service';
import { pricingService } from '../apps/api/services/pricing.service';
import { bookingService } from '../apps/api/services/booking.service';
import {
  UserRole,
  LocationStatus,
  PropertyType,
  AccessMethod,
  BookingStatus,
} from '../packages/contracts';

describe('HP-06 — Availability & Calendar Comprehensive Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let anonClient: ParkEazyApiClient;
  let hostAClient: ParkEazyApiClient;
  let hostBClient: ParkEazyApiClient;
  let customerClient: ParkEazyApiClient;

  const hostAId = 'usr-host-avail-a';
  const hostBId = 'usr-host-avail-b';
  const customerId = 'usr-customer-avail-1';
  let facilityAId: string;
  let bayA1Id: string;
  let bayA2Id: string;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        anonClient = new ParkEazyApiClient(baseUrl);
        hostAClient = new ParkEazyApiClient(baseUrl);
        hostBClient = new ParkEazyApiClient(baseUrl);
        customerClient = new ParkEazyApiClient(baseUrl);
        resolve();
      });
    });

    const hostAToken = authService.signToken(
      {
        id: hostAId,
        email: 'host.avail.a@parkeazy.internal',
        firstName: 'AvailHost',
        lastName: 'Alpha',
        roles: [UserRole.HOST],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    hostAClient.setAuthToken(hostAToken);

    const hostBToken = authService.signToken(
      {
        id: hostBId,
        email: 'host.avail.b@parkeazy.internal',
        firstName: 'AvailHost',
        lastName: 'Beta',
        roles: [UserRole.HOST],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    hostBClient.setAuthToken(hostBToken);

    const customerToken = authService.signToken(
      {
        id: customerId,
        email: 'customer.avail@parkeazy.internal',
        firstName: 'AvailDriver',
        lastName: 'Tester',
        roles: [UserRole.CUSTOMER],
        isHostVerified: false,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    customerClient.setAuthToken(customerToken);

    // Create facility and two bays
    const fac = inventoryService.createLocation(hostAId, {
      name: 'Alpha Availability Deck',
      description: 'Deck with multi-space availability and calendar tests.',
      propertyType: PropertyType.PARKING_LOT,
      address: {
        line1: '500 Howard Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        latitude: 37.788,
        longitude: -122.398,
      },
      timezone: 'America/Los_Angeles',
      accessMethod: AccessMethod.GATE_CODE,
      hourlyRateCents: 500,
      dailyRateCents: 3000,
      securityDepositCents: 2000,
      amenities: ['CCTV Security', 'Paved Surface'],
    });
    facilityAId = fac.id;

    const bay1 = inventoryService.createBay(facilityAId, hostAId, {
      bayNumber: 'D-01',
      levelOrFloor: 'G',
    });
    bayA1Id = bay1.id;

    const bay2 = inventoryService.createBay(facilityAId, hostAId, {
      bayNumber: 'D-02',
      levelOrFloor: 'G',
    });
    bayA2Id = bay2.id;
  });

  after(async () => {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('1. Available and Unavailable Space Query', async () => {
    const summary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-10T10:00:00Z',
      '2026-11-10T14:00:00Z'
    );

    assert.equal(summary.facilityId, facilityAId);
    assert.equal(summary.totalSpaces, 2);
    assert.equal(summary.availableSpacesCount, 2);
    assert.equal(summary.occupiedSpacesCount, 0);
  });

  test('2. Confirmed Bookings Block Correct Space and Interval', async () => {
    // Seed confirmed booking for bay 1
    const testBooking = {
      id: 'bk-avail-001',
      bayId: bayA1Id,
      bayNumber: 'D-01',
      locationId: facilityAId,
      locationName: 'Alpha Availability Deck',
      locationTimezone: 'America/Los_Angeles',
      userId: customerId,
      userName: 'AvailDriver Tester',
      hostId: hostAId,
      startTimeUtc: '2026-11-10T10:00:00Z',
      endTimeUtc: '2026-11-10T12:00:00Z',
      status: BookingStatus.CONFIRMED,
      licensePlate: 'CAL-991',
      quote: {
        quoteId: 'qt-avail-001',
        baseAmountCents: 1000,
        securityDepositCents: 2000,
        platformFeeCents: 150,
        taxesCents: 100,
        totalPayableCents: 3250,
        currency: 'USD',
        durationMinutes: 120,
        cancellationPolicyTier: 'STANDARD_48H' as const,
        quotedAtUtc: '2026-11-10T09:00:00Z',
      },
    };
    (bookingService as any).bookings.unshift(testBooking);

    // Query availability for overlapping time window
    const summary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-10T10:30:00Z',
      '2026-11-10T11:30:00Z'
    );

    assert.equal(summary.availableSpacesCount, 1);
    assert.equal(summary.occupiedSpacesCount, 1);
    const bay1Status = summary.spaces.find((s) => s.spaceId === bayA1Id);
    assert.equal(bay1Status?.isAvailable, false);
    assert.ok(bay1Status?.currentStatus.includes('Occupied'));
  });

  test('3. Temporary Checkout Holds Block Availability (10-Minute Lock)', async () => {
    // Seed active hold for bay 2
    const testHold = {
      holdId: 'hold-avail-002',
      bayId: bayA2Id,
      locationId: facilityAId,
      userId: customerId,
      startTimeUtc: '2026-11-10T15:00:00Z',
      endTimeUtc: '2026-11-10T17:00:00Z',
      holdExpiresAtUtc: new Date(Date.now() + 600000).toISOString(),
      holdDurationSeconds: 600,
      quoteSnapshot: {
        quoteId: 'qt-hold-002',
        baseAmountCents: 1000,
        securityDepositCents: 2000,
        platformFeeCents: 150,
        taxesCents: 100,
        totalPayableCents: 3250,
        currency: 'USD',
        durationMinutes: 120,
        cancellationPolicyTier: 'STANDARD_48H' as const,
        quotedAtUtc: new Date().toISOString(),
      },
    };
    (bookingService as any).holds.set(testHold.holdId, testHold);

    // Check availability during hold interval
    const summary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-10T15:30:00Z',
      '2026-11-10T16:30:00Z'
    );

    const bay2Status = summary.spaces.find((s) => s.spaceId === bayA2Id);
    assert.equal(bay2Status?.isAvailable, false);
    assert.ok(bay2Status?.currentStatus.includes('Hold'));
  });

  test('4. Expired Holds Stop Blocking Availability', async () => {
    // Expire the hold in the past
    const expiredHold = {
      holdId: 'hold-avail-expired',
      bayId: bayA2Id,
      locationId: facilityAId,
      userId: customerId,
      startTimeUtc: '2026-11-11T09:00:00Z',
      endTimeUtc: '2026-11-11T11:00:00Z',
      holdExpiresAtUtc: new Date(Date.now() - 5000).toISOString(),
      holdDurationSeconds: 600,
      quoteSnapshot: {
        quoteId: 'qt-hold-exp',
        baseAmountCents: 1000,
        securityDepositCents: 2000,
        platformFeeCents: 150,
        taxesCents: 100,
        totalPayableCents: 3250,
        currency: 'USD',
        durationMinutes: 120,
        cancellationPolicyTier: 'STANDARD_48H' as const,
        quotedAtUtc: new Date().toISOString(),
      },
    };
    (bookingService as any).holds.set(expiredHold.holdId, expiredHold);

    // Query availability
    const summary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-11T09:30:00Z',
      '2026-11-11T10:30:00Z'
    );

    const bay2Status = summary.spaces.find((s) => s.spaceId === bayA2Id);
    assert.equal(bay2Status?.isAvailable, true);
  });

  test('5. Maintenance Blocks and Closures Block Availability', async () => {
    // Create maintenance block for bay 2
    const block = await hostAClient.createMaintenanceBlock(hostAId, {
      facilityId: facilityAId,
      spaceId: bayA2Id,
      title: 'Sensor Replacement',
      startTimeUtc: '2026-11-12T08:00:00Z',
      endTimeUtc: '2026-11-12T12:00:00Z',
    });

    assert.ok(block.id);

    // Query availability during maintenance
    const summary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-12T09:00:00Z',
      '2026-11-12T11:00:00Z'
    );

    const bay2 = summary.spaces.find((s) => s.spaceId === bayA2Id);
    assert.equal(bay2?.isAvailable, false);
    assert.ok(bay2?.currentStatus.includes('Maintenance'));

    // Remove maintenance block
    await hostAClient.removeMaintenanceBlock(hostAId, block.id);
  });

  test('6. Recurring Availability Schedules and Date-Specific Overrides', async () => {
    // Set weekly recurring schedule
    const recurring = await hostAClient.setRecurringSchedules(hostAId, facilityAId, [
      { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', isAvailable: true },
      { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', isAvailable: true },
    ]);
    assert.equal(recurring.length, 2);

    // Set date override (holiday closure)
    const override = await hostAClient.createDateOverride(hostAId, {
      facilityId: facilityAId,
      date: '2026-11-26',
      isAvailable: false,
      reason: 'Thanksgiving Day Facility Closure',
    });
    assert.ok(override.id);
    assert.equal(override.isAvailable, false);

    // Clean up
    await hostAClient.removeDateOverride(hostAId, override.id);
  });

  test('7. 15-Minute Transition Buffer Enforcement', async () => {
    // Booking on bay 1 ends at 2026-11-10T12:00:00Z.
    // Querying interval starting at 12:05:00Z (< 15 min buffer) should report bay 1 as occupied!
    const summary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-10T12:05:00Z',
      '2026-11-10T13:00:00Z'
    );

    const bay1 = summary.spaces.find((s) => s.spaceId === bayA1Id);
    assert.equal(bay1?.isAvailable, false); // blocked by 15m transition buffer!

    // Interval starting after buffer (12:20:00Z) should be available
    const postBufferSummary = await hostAClient.getSpaceAvailability(
      hostAId,
      facilityAId,
      '2026-11-10T12:20:00Z',
      '2026-11-10T13:00:00Z'
    );
    const postBay1 = postBufferSummary.spaces.find((s) => s.spaceId === bayA1Id);
    assert.equal(postBay1?.isAvailable, true);
  });

  test('8. Conflicting Closure Changes Rejected (Confirmed Reservation Protection)', async () => {
    // Bay 1 has confirmed booking from 10:00 to 12:00 on 2026-11-10.
    // Host attempts to create a closure that covers this space and time:
    await assert.rejects(
      async () => {
        await hostAClient.createClosure(hostAId, {
          facilityId: facilityAId,
          bayId: bayA1Id,
          title: 'Power Washing Deck',
          reason: 'MAINTENANCE',
          startTimeUtc: '2026-11-10T09:00:00Z',
          endTimeUtc: '2026-11-10T13:00:00Z',
        });
      },
      (err: ApiError) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'CLOSURE_OVERLAPS_CONFIRMED_BOOKINGS');
        return true;
      }
    );
  });

  test('9. Confirmed Reservations Never Silently Removed or Modified', async () => {
    const bookings = bookingService.getAllBookings();
    const confirmedCountBefore = bookings.filter((b) => b.locationId === facilityAId).length;

    // Run availability validation for a proposed closure
    const validation = await hostAClient.validateAvailabilityChange(hostAId, {
      facilityId: facilityAId,
      startTimeUtc: '2026-11-10T10:00:00Z',
      endTimeUtc: '2026-11-10T12:00:00Z',
      proposedAction: 'CLOSE_PERIOD',
    });

    assert.equal(validation.canApply, false);
    assert.equal(validation.hasConflicts, true);
    assert.ok(validation.protectedBookingsCount >= 1);

    // Verify bookings count remains invariant
    const confirmedCountAfter = bookingService.getAllBookings().filter((b) => b.locationId === facilityAId).length;
    assert.equal(confirmedCountBefore, confirmedCountAfter);
  });

  test('10. Multi-Tenant Tenancy Protection — Host B Cannot Manage Host A Availability', async () => {
    await assert.rejects(
      async () => {
        await hostBClient.createMaintenanceBlock(hostBId, {
          facilityId: facilityAId,
          spaceId: bayA1Id,
          title: 'Cross-Tenant Block',
          startTimeUtc: '2026-11-20T10:00:00Z',
          endTimeUtc: '2026-11-20T14:00:00Z',
        });
      },
      (err: ApiError) => {
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
        return true;
      }
    );
  });

  test('11. Calendar Event Feed Aggregation', async () => {
    const events = await hostAClient.getCalendarEvents(
      hostAId,
      facilityAId,
      '2026-11-09T00:00:00Z',
      '2026-11-15T00:00:00Z'
    );

    assert.ok(Array.isArray(events));
    assert.ok(events.length >= 1);
    const bookingEvent = events.find((e) => e.eventType === 'CONFIRMED_BOOKING');
    assert.ok(bookingEvent);
    assert.equal(bookingEvent?.isProtectedReservation, true);
  });
});
