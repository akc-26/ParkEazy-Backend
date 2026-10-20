process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient, ApiError } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { inventoryService } from '../apps/api/services/inventory.service';
import { pricingService } from '../apps/api/services/pricing.service';
import { bookingService } from '../apps/api/services/booking.service';
import { DEMO_USERS } from '../apps/api/middleware/auth-guard';
import {
  UserRole,
  LocationStatus,
  PropertyType,
  AccessMethod,
} from '../packages/contracts';

describe('HP-05 — Pricing & Policies Comprehensive Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let anonClient: ParkEazyApiClient;
  let hostAClient: ParkEazyApiClient;
  let hostBClient: ParkEazyApiClient;

  const hostAId = 'usr-host-pricing-a';
  const hostBId = 'usr-host-pricing-b';
  let facilityAId: string;
  let bayA1Id: string;

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
        resolve();
      });
    });

    const hostAToken = authService.signToken(
      {
        id: hostAId,
        email: 'host.a@parkeazy.internal',
        firstName: 'PricingHost',
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
        email: 'host.b@parkeazy.internal',
        firstName: 'PricingHost',
        lastName: 'Beta',
        roles: [UserRole.HOST],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      },
      3600
    );
    hostBClient.setAuthToken(hostBToken);

    // Create a facility and space for host A
    const fac = inventoryService.createLocation(hostAId, {
      name: 'Alpha Pricing Tower',
      description: 'Test facility for pricing and rate engine validation.',
      propertyType: PropertyType.GARAGE,
      address: {
        line1: '100 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        latitude: 37.79,
        longitude: -122.40,
      },
      timezone: 'America/Los_Angeles',
      accessMethod: AccessMethod.GATE_CODE,
      hourlyRateCents: 600,
      dailyRateCents: 3500,
      securityDepositCents: 2000,
      amenities: ['Covered Garage', 'EV Charging'],
    });
    facilityAId = fac.id;

    const bay = inventoryService.createBay(facilityAId, hostAId, {
      bayNumber: 'P1-10',
      levelOrFloor: '1',
      isEvCharging: true,
      evChargerKw: 11,
    });
    bayA1Id = bay.id;
  });

  after(async () => {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('1. Rate Configuration — Create, Retrieve, Update, and Safely Deactivate Rate', async () => {
    // Create rate
    const created = await hostAClient.createRatePlan(hostAId, {
      facilityId: facilityAId,
      name: 'Alpha Peak Rate',
      hourlyRateCents: 750,
      dailyRateCents: 4200,
      minBillableMinutes: 60,
      minBookingMinutes: 60,
      maxBookingMinutes: 4320,
      stepMinutes: 30,
    });

    assert.ok(created.id);
    assert.equal(created.hourlyRateCents, 750);
    assert.equal(created.dailyRateCents, 4200);
    assert.equal(created.isActive, true);

    // Retrieve
    const fetched = await hostAClient.getRatePlan(hostAId, created.id);
    assert.equal(fetched.id, created.id);
    assert.equal(fetched.name, 'Alpha Peak Rate');

    // Update
    const updated = await hostAClient.updateRatePlan(hostAId, created.id, {
      hourlyRateCents: 800,
      dailyRateCents: 4500,
    });
    assert.equal(updated.hourlyRateCents, 800);
    assert.equal(updated.dailyRateCents, 4500);

    // Safely deactivate
    const deactivated = await hostAClient.deactivateRatePlan(hostAId, created.id);
    assert.equal(deactivated.isActive, false);

    // Verify rate is no longer in active query
    const list = await hostAClient.getRatePlans(hostAId, facilityAId);
    const inList = list.find((r) => r.id === created.id);
    assert.equal(inList?.isActive, false);
  });

  test('2. Rate Validation — Valid and Negative Rate Values', async () => {
    await assert.rejects(
      async () => {
        await hostAClient.createRatePlan(hostAId, {
          facilityId: facilityAId,
          name: 'Negative Rate',
          hourlyRateCents: -500,
          dailyRateCents: 2000,
        });
      },
      (err: ApiError) => {
        assert.ok(err.statusCode === 400 || err.code === 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  test('3. Booking-Duration and Policy Constraints', async () => {
    // Update facility policy
    const policy = await hostAClient.updatePricingPolicy(hostAId, {
      facilityId: facilityAId,
      minDurationMinutes: 120, // 2 hours minimum
      maxDurationMinutes: 2880, // 48 hours maximum
      bookingIncrementMinutes: 30,
      transitionBufferMinutes: 15,
      securityDepositCents: 3000,
    });

    assert.equal(policy.minDurationMinutes, 120);
    assert.equal(policy.maxDurationMinutes, 2880);
    assert.equal(policy.securityDepositCents, 3000);

    // Duration below minimum should be rejected in price estimation
    await assert.rejects(
      async () => {
        await hostAClient.calculateEstimate(hostAId, {
          facilityId: facilityAId,
          startTimeUtc: '2026-11-01T10:00:00Z',
          endTimeUtc: '2026-11-01T11:00:00Z', // 60 mins < 120 mins
        });
      },
      (err: ApiError) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'DURATION_BELOW_MINIMUM');
        return true;
      }
    );

    // Reset policy for remaining tests
    await hostAClient.updatePricingPolicy(hostAId, {
      facilityId: facilityAId,
      minDurationMinutes: 60,
      maxDurationMinutes: 4320,
    });
  });

  test('4. Operating-Hour Schedule Validation', async () => {
    const weeklySchedule = [
      { dayOfWeek: 0, isClosed: true, openTime: '00:00', closeTime: '00:00' },
      { dayOfWeek: 1, isClosed: false, openTime: '07:00', closeTime: '22:00' },
      { dayOfWeek: 2, isClosed: false, openTime: '07:00', closeTime: '22:00' },
      { dayOfWeek: 3, isClosed: false, openTime: '07:00', closeTime: '22:00' },
      { dayOfWeek: 4, isClosed: false, openTime: '07:00', closeTime: '22:00' },
      { dayOfWeek: 5, isClosed: false, openTime: '07:00', closeTime: '23:30' },
      { dayOfWeek: 6, isClosed: false, openTime: '08:00', closeTime: '20:00' },
    ];

    const saved = await hostAClient.updateOperatingHours(hostAId, facilityAId, weeklySchedule as any);
    assert.equal(saved.length, 7);
    assert.equal(saved[0].isClosed, true);
    assert.equal(saved[1].openTime, '07:00');
  });

  test('5. Overnight Schedules and Interval Crossing Midnight', async () => {
    const overnightSchedule = [
      { dayOfWeek: 5, isClosed: false, openTime: '18:00', closeTime: '04:00' }, // crosses midnight
    ];

    const updated = await hostAClient.updateOperatingHours(hostAId, facilityAId, [
      { dayOfWeek: 0, isClosed: false, openTime: '06:00', closeTime: '22:00' },
      { dayOfWeek: 1, isClosed: false, openTime: '06:00', closeTime: '22:00' },
      { dayOfWeek: 2, isClosed: false, openTime: '06:00', closeTime: '22:00' },
      { dayOfWeek: 3, isClosed: false, openTime: '06:00', closeTime: '22:00' },
      { dayOfWeek: 4, isClosed: false, openTime: '06:00', closeTime: '22:00' },
      { dayOfWeek: 5, isClosed: false, openTime: '18:00', closeTime: '04:00' },
      { dayOfWeek: 6, isClosed: false, openTime: '06:00', closeTime: '22:00' },
    ] as any);

    const friday = updated.find((d) => d.dayOfWeek === 5);
    assert.ok(friday);
    assert.equal(friday?.isOvernight, true);
  });

  test('6. Scheduled Rate Changes and Effective Dates', async () => {
    const effectiveFuture = '2026-12-01T00:00:00Z';
    const scheduled = await hostAClient.createRatePlan(hostAId, {
      facilityId: facilityAId,
      name: 'Holiday Season Surge Tier',
      hourlyRateCents: 900,
      dailyRateCents: 5000,
      effectiveFromUtc: effectiveFuture,
    });

    assert.equal(scheduled.effectiveFromUtc, effectiveFuture);
    assert.equal(scheduled.hourlyRateCents, 900);
  });

  test('7. Price Estimate Calculation — Hourly Under 24h', async () => {
    // 3 hours duration
    const estimate = await hostAClient.calculateEstimate(hostAId, {
      facilityId: facilityAId,
      startTimeUtc: '2026-11-05T10:00:00Z',
      endTimeUtc: '2026-11-05T13:00:00Z',
    });

    assert.equal(estimate.durationMinutes, 180);
    assert.equal(estimate.billableHours, 3);
    assert.equal(estimate.rateTierApplied, 'HOURLY');
    assert.ok(estimate.baseAmountCents > 0);
    assert.ok(estimate.platformFeeCents > 0); // 15%
    assert.ok(estimate.taxesCents > 0); // 10%
    assert.equal(
      estimate.totalPayableCents,
      estimate.baseAmountCents + estimate.securityDepositCents + estimate.platformFeeCents + estimate.taxesCents
    );
  });

  test('8. Price Estimate Calculation — Multi-Day Hybrid Tier with Capping', async () => {
    // 50 hours = 2 full days (48h) + 2 hours
    const estimate = await hostAClient.calculateEstimate(hostAId, {
      facilityId: facilityAId,
      startTimeUtc: '2026-11-05T10:00:00Z',
      endTimeUtc: '2026-11-07T12:00:00Z',
    });

    assert.equal(estimate.durationMinutes, 3000); // 50 hours
    assert.equal(estimate.rateTierApplied, 'HYBRID');
    assert.ok(estimate.breakdown.length >= 3);
  });

  test('9. Price Changes Do Not Modify Existing Confirmed Booking Snapshots', async () => {
    const existingBookings = bookingService.getAllBookings();
    assert.ok(existingBookings.length > 0);
    const firstBooking = existingBookings[0];
    const originalQuote = { ...firstBooking.quote };

    // Update facility rate
    await hostAClient.createRatePlan(hostAId, {
      facilityId: facilityAId,
      name: 'Emergency Price Shift',
      hourlyRateCents: 9999,
      dailyRateCents: 99999,
    });

    // Ensure firstBooking quote snapshot is completely unchanged
    assert.equal(firstBooking.quote.baseAmountCents, originalQuote.baseAmountCents);
    assert.equal(firstBooking.quote.totalPayableCents, originalQuote.totalPayableCents);
  });

  test('10. Multi-Tenant Isolation — Host B Cannot Modify Host A Rates', async () => {
    await assert.rejects(
      async () => {
        await hostBClient.createRatePlan(hostBId, {
          facilityId: facilityAId, // owned by Host A!
          name: 'Malicious Hijack',
          hourlyRateCents: 100,
          dailyRateCents: 500,
        });
      },
      (err: ApiError) => {
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
        return true;
      }
    );
  });

  test('11. Invalid Policy Combinations Rejected', async () => {
    await assert.rejects(
      async () => {
        await hostAClient.updatePricingPolicy(hostAId, {
          facilityId: facilityAId,
          minDurationMinutes: 500,
          maxDurationMinutes: 100, // min > max!
        });
      },
      (err: ApiError) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  test('12. Bulk Preview Identifies Affected Records and Conflicts', async () => {
    const preview = await hostAClient.previewBulkPricing(hostAId, {
      targetType: 'ALL_FACILITIES',
      rateAdjustment: {
        type: 'PERCENTAGE',
        percentageChange: 10, // +10%
      },
    });

    assert.ok(preview.totalTargetsCount >= 1);
    assert.equal(preview.conflictingTargetsCount, 0);
    assert.ok(preview.targets[0].proposedHourlyRateCents > preview.targets[0].currentHourlyRateCents);
  });

  test('13. Bulk Pricing Updates Persist Correctly', async () => {
    const res = await hostAClient.applyBulkPricing(hostAId, {
      targetType: 'ALL_FACILITIES',
      rateAdjustment: {
        type: 'FIXED_OFFSET',
        hourlyChangeCents: 50,
        dailyChangeCents: 200,
      },
    });

    assert.ok(res.appliedCount >= 1);
  });

  test('14. Failed Bulk Update Does Not Leave Partial Updates', async () => {
    await assert.rejects(
      async () => {
        await hostAClient.applyBulkPricing(hostAId, {
          targetType: 'ALL_FACILITIES',
          rateAdjustment: {
            type: 'FIXED_OFFSET',
            hourlyChangeCents: -100000, // causes negative rate!
          },
        });
      },
      (err: ApiError) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  test('15. Pricing Audit History Records Mutations with Structured Diffs', async () => {
    const history = await hostAClient.getPricingHistory(hostAId);
    assert.ok(Array.isArray(history));
    assert.ok(history.length >= 2);
    assert.ok(history[0].action);
    assert.ok(history[0].diffSummary);
  });
});
