import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db';
import {
  validateRatePlanInput,
  detectPricingRuleConflict,
  resolveApplicablePricingRule,
  validatePriceQuoteRequest,
} from '@parkeazy/validation';
import { pricingService } from '../apps/api/services/pricing.service';
import { availabilityService } from '../apps/api/services/availability.service';
import { User, RatePlan, Facility, ParkingBay } from '../server/types';

describe('Section 3C: Pricing Rules and Real Availability Verification', () => {
  let hostA: User;
  let hostB: User;
  let facilityA: Facility;
  let baySedan: ParkingBay;
  let baySuv: ParkingBay;
  let bayMotorcycle: ParkingBay;

  beforeEach(async () => {
    await db.initialize();

    hostA = (await db.findUserById('usr_host1'))!;
    hostB = (await db.findUserById('usr_host2'))!;

    // Create facility owned by Host A with Kolkata timezone (Section 3B baseline)
    const fac = await db.createFacility(
      hostA.id,
      {
        name: 'Sec3C Metro Hub Chennai',
        address: '45 Anna Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600002',
        country: 'India',
        latitude: 13.06,
        longitude: 80.25,
        type: 'covered',
        totalSpots: 3,
        isCovered: true,
        operatingHours: {
          is24x7: false,
          monday: { open: '08:00', close: '20:00', isOpen: true },
          tuesday: { open: '08:00', close: '20:00', isOpen: true },
          wednesday: { open: '08:00', close: '20:00', isOpen: true },
          thursday: { open: '08:00', close: '20:00', isOpen: true },
          friday: { open: '08:00', close: '20:00', isOpen: true },
          saturday: { open: '08:00', close: '20:00', isOpen: true },
          sunday: { open: '08:00', close: '20:00', isOpen: true },
        },
        timezone: 'Asia/Kolkata',
      }
    );

    // Make facility active/published
    facilityA = await db.updateFacility(fac.id, { status: 'active' }, hostA);

    // Create bays with different vehicle compatibilities
    baySedan = await db.createBay(
      facilityA.id,
      {
        bayNumber: 'BAY-SEDAN',
        identifier: 'BAY-SEDAN',
        floor: 'Ground',
        type: 'standard',
        vehicleCompatibility: ['sedan', 'compact'],
        supportedVehicleTypes: ['sedan', 'compact'],
        pricePerHour: 50,
      },
      hostA
    );

    baySuv = await db.createBay(
      facilityA.id,
      {
        bayNumber: 'BAY-SUV',
        identifier: 'BAY-SUV',
        floor: 'Ground',
        type: 'large',
        vehicleCompatibility: ['suv', 'sedan'],
        supportedVehicleTypes: ['suv', 'sedan'],
        pricePerHour: 75,
      },
      hostA
    );

    bayMotorcycle = await db.createBay(
      facilityA.id,
      {
        bayNumber: 'BAY-MOTO',
        identifier: 'BAY-MOTO',
        floor: 'Ground',
        type: 'compact',
        vehicleCompatibility: ['motorcycle', 'two_wheeler'],
        supportedVehicleTypes: ['motorcycle', 'two_wheeler'],
        pricePerHour: 25,
      },
      hostA
    );
  });

  // =========================================================================
  // SCOPE A: PRICING RULES & RATE PLANS
  // =========================================================================
  describe('Scope A — Rate Plans Configuration & Validation', () => {
    it('creates a facility-wide rate plan with valid parameters', async () => {
      const plan = await db.createRatePlan(
        facilityA.id,
        {
          name: 'General Day Tariff',
          hourlyRateCents: 500, // $5.00
          dailyRateCents: 3500, // $35.00
          vehicleCategory: 'ALL',
          minBookingMinutes: 60,
          maxBookingMinutes: 1440,
          stepMinutes: 30,
          isActive: true,
        },
        hostA
      );

      expect(plan.id).toBeDefined();
      expect(plan.facilityId).toBe(facilityA.id);
      expect(plan.hourlyRateCents).toBe(500);
      expect(plan.dailyRateCents).toBe(3500);
      expect(plan.isActive).toBe(true);

      const fetched = await db.getRatePlanById(plan.id);
      expect(fetched?.name).toBe('General Day Tariff');
    });

    it('rejects negative hourly or daily rates', async () => {
      await expect(
        db.createRatePlan(
          facilityA.id,
          {
            name: 'Negative Rate Tariff',
            hourlyRateCents: -100,
            dailyRateCents: 2000,
          },
          hostA
        )
      ).rejects.toThrow(/negative/i);

      await expect(
        db.createRatePlan(
          facilityA.id,
          {
            name: 'Negative Daily Tariff',
            hourlyRateCents: 500,
            dailyRateCents: -500,
          },
          hostA
        )
      ).rejects.toThrow(/negative/i);
    });

    it('rejects duration where maxBookingMinutes < minBookingMinutes', async () => {
      await expect(
        db.createRatePlan(
          facilityA.id,
          {
            name: 'Invalid Duration Tariff',
            hourlyRateCents: 400,
            dailyRateCents: 3000,
            minBookingMinutes: 120,
            maxBookingMinutes: 60, // less than min!
          },
          hostA
        )
      ).rejects.toThrow(/cannot be less than/i);
    });

    it('rejects invalid effective date range where until <= from', () => {
      const val = validateRatePlanInput({
        facilityId: facilityA.id,
        name: 'Invalid Date Tariff',
        hourlyRateCents: 500,
        dailyRateCents: 3000,
        effectiveFromUtc: '2026-11-01T10:00:00Z',
        effectiveUntilUtc: '2026-11-01T08:00:00Z', // before from!
      });

      expect(val.success).toBe(false);
      expect(val.errors[0]).toMatch(/chronologically after/i);
    });

    it('detects and rejects overlapping active rules for the same scope and category', async () => {
      await db.createRatePlan(
        facilityA.id,
        {
          name: 'Sedan Standard',
          vehicleCategory: 'SEDAN',
          hourlyRateCents: 600,
          dailyRateCents: 4000,
          isActive: true,
        },
        hostA
      );

      // Attempting to create an overlapping active rule for the same facility and category
      await expect(
        db.createRatePlan(
          facilityA.id,
          {
            name: 'Sedan Conflicting Standard',
            vehicleCategory: 'SEDAN',
            hourlyRateCents: 700,
            dailyRateCents: 4500,
            isActive: true,
          },
          hostA
        )
      ).rejects.toThrow(/conflict/i);
    });

    it('enforces tenant isolation: host B cannot edit or delete host A rate plans', async () => {
      const plan = await db.createRatePlan(
        facilityA.id,
        {
          name: 'Host A Proprietary Tariff',
          hourlyRateCents: 800,
          dailyRateCents: 5000,
        },
        hostA
      );

      // Host B tries to update
      await expect(
        db.updateRatePlan(plan.id, { hourlyRateCents: 100 }, hostB)
      ).rejects.toThrow(/Unauthorized/i);

      // Host B tries to delete
      await expect(
        db.deleteRatePlan(plan.id, hostB)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  // =========================================================================
  // SCOPE A: 5-TIER STRICT RULE PRECEDENCE
  // =========================================================================
  describe('Scope A — Strict 5-Tier Rule Precedence Resolution', () => {
    it('correctly resolves Tier 1 (Bay + Vehicle Category Match) over all lower tiers', async () => {
      // Tier 4: Facility-wide + ALL
      const facAll = await db.createRatePlan(
        facilityA.id,
        {
          name: 'Tier 4 Fac ALL',
          vehicleCategory: 'ALL',
          hourlyRateCents: 400,
          dailyRateCents: 2500,
        },
        hostA
      );

      // Tier 3: Facility-wide + SEDAN
      const facSedan = await db.createRatePlan(
        facilityA.id,
        {
          name: 'Tier 3 Fac SEDAN',
          vehicleCategory: 'SEDAN',
          hourlyRateCents: 550,
          dailyRateCents: 3500,
        },
        hostA
      );

      // Tier 2: Bay + ALL
      const bayAll = await db.createRatePlan(
        facilityA.id,
        {
          name: 'Tier 2 Bay ALL',
          bayId: baySedan.id,
          vehicleCategory: 'ALL',
          hourlyRateCents: 650,
          dailyRateCents: 4000,
        },
        hostA
      );

      // Tier 1: Bay + SEDAN
      const baySedanPlan = await db.createRatePlan(
        facilityA.id,
        {
          name: 'Tier 1 Bay SEDAN Specific',
          bayId: baySedan.id,
          vehicleCategory: 'SEDAN',
          hourlyRateCents: 900,
          dailyRateCents: 6000,
        },
        hostA
      );

      const allPlans = [facAll, facSedan, bayAll, baySedanPlan];

      // 1. Query for BaySedan with SEDAN category -> Should hit Tier 1
      const tier1Res = resolveApplicablePricingRule(
        allPlans,
        { hourlyRateCents: 500, dailyRateCents: 3000 },
        { bayId: baySedan.id, vehicleCategory: 'SEDAN' }
      );
      expect(tier1Res?.ruleId).toBe(baySedanPlan.id);
      expect(tier1Res?.hourlyRateCents).toBe(900);
      expect(tier1Res?.precedenceTier).toBe('BAY_VEHICLE');

      // 2. Query for BaySedan with SUV category -> No Tier 1, hits Tier 2 (Bay ALL)
      const tier2Res = resolveApplicablePricingRule(
        allPlans,
        { hourlyRateCents: 500, dailyRateCents: 3000 },
        { bayId: baySedan.id, vehicleCategory: 'SUV' }
      );
      expect(tier2Res?.ruleId).toBe(bayAll.id);
      expect(tier2Res?.hourlyRateCents).toBe(650);
      expect(tier2Res?.precedenceTier).toBe('BAY_ALL');

      // 3. Query without bayId for SEDAN -> Should hit Tier 3 (Facility SEDAN)
      const tier3Res = resolveApplicablePricingRule(
        allPlans,
        { hourlyRateCents: 500, dailyRateCents: 3000 },
        { vehicleCategory: 'SEDAN' }
      );
      expect(tier3Res?.ruleId).toBe(facSedan.id);
      expect(tier3Res?.hourlyRateCents).toBe(550);
      expect(tier3Res?.precedenceTier).toBe('FACILITY_VEHICLE');

      // 4. Query without bayId for MOTORCYCLE -> No Tier 3, hits Tier 4 (Facility ALL)
      const tier4Res = resolveApplicablePricingRule(
        allPlans,
        { hourlyRateCents: 500, dailyRateCents: 3000 },
        { vehicleCategory: 'MOTORCYCLE' }
      );
      expect(tier4Res?.ruleId).toBe(facAll.id);
      expect(tier4Res?.hourlyRateCents).toBe(400);
      expect(tier4Res?.precedenceTier).toBe('FACILITY_ALL');

      // 5. Query with no matching rules -> Hits Tier 5 (Facility Baseline Default)
      const tier5Res = resolveApplicablePricingRule(
        [],
        { hourlyRateCents: 333, dailyRateCents: 2222 },
        { vehicleCategory: 'TRUCK' }
      );
      expect(tier5Res?.hourlyRateCents).toBe(333);
      expect(tier5Res?.precedenceTier).toBe('FACILITY_DEFAULT');
    });
  });

  // =========================================================================
  // SCOPE B: REAL AVAILABILITY ENGINE
  // =========================================================================
  describe('Scope B — Server-Side Real Availability Engine', () => {
    it('returns unavailable when facility is suspended or inactive', async () => {
      // Set facility to inactive
      await db.updateFacility(facilityA.id, { status: 'suspended' }, hostA);

      const avail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-21T04:00:00Z', // 09:30 AM IST
        '2026-10-21T06:00:00Z'
      );

      expect(avail.availableSpacesCount).toBe(0);
      expect(avail.unavailabilityReason).toMatch(/not currently active/i);
    });

    it('evaluates operating hours in facility timezone (Asia/Kolkata)', async () => {
      // Facility opens at 08:00 AM IST (02:30 UTC) and closes at 20:00 PM IST (14:30 UTC)
      // Query at 23:00 IST (17:30 UTC) -> should be outside operating hours
      const nightAvail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-21T17:30:00Z',
        '2026-10-21T19:30:00Z'
      );

      expect(nightAvail.availableSpacesCount).toBe(0);
      expect(nightAvail.unavailabilityReason).toMatch(/operating hours/i);

      // Query at 10:00 AM IST (04:30 UTC) -> inside operating hours!
      const dayAvail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-21T04:30:00Z',
        '2026-10-21T06:30:00Z'
      );

      expect(dayAvail.availableSpacesCount).toBe(3); // All 3 bays available
      expect(dayAvail.unavailabilityReason).toBeNull();
    });

    it('considers date-specific facility closure authoritative', async () => {
      // Schedule closure for tomorrow
      await db.createFacilityClosure(
        facilityA.id,
        {
          title: 'Deep Drainage Cleaning',
          reason: 'Maintenance',
          startDate: '2026-10-22',
          endDate: '2026-10-22',
          startsAt: '2026-10-22T00:00:00Z',
          endsAt: '2026-10-22T23:59:59Z',
        },
        hostA
      );

      const avail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-22T05:00:00Z',
        '2026-10-22T08:00:00Z'
      );

      expect(avail.availableSpacesCount).toBe(0);
      expect(avail.unavailabilityReason).toMatch(/closed/i);
    });

    it('blocks only the specific bay during bay maintenance', async () => {
      // Schedule maintenance specifically on baySedan
      await db.createFacilityMaintenance(
        facilityA.id,
        {
          title: 'Line painting',
          bayId: baySedan.id,
          startsAt: '2026-10-23T04:00:00Z',
          endsAt: '2026-10-23T08:00:00Z',
          status: 'scheduled',
        },
        hostA
      );

      const avail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-23T05:00:00Z',
        '2026-10-23T07:00:00Z'
      );

      // baySedan is blocked, but baySuv and bayMotorcycle are available
      expect(avail.availableSpacesCount).toBe(2);
      expect(avail.blockedSpacesCount).toBe(1);
      expect(avail.eligibleBayIds).not.toContain(baySedan.id);
      expect(avail.eligibleBayIds).toContain(baySuv.id);
      expect(avail.eligibleBayIds).toContain(bayMotorcycle.id);
    });

    it('filters availability by vehicle category compatibility', async () => {
      // Query specifically for MOTORCYCLE
      const motoAvail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-24T05:00:00Z',
        '2026-10-24T07:00:00Z',
        { vehicleCategory: 'MOTORCYCLE' }
      );

      // Only bayMotorcycle supports motorcycle
      expect(motoAvail.eligibleBayIds).toContain(bayMotorcycle.id);
      expect(motoAvail.eligibleBayIds).not.toContain(baySedan.id);
      expect(motoAvail.availableSpacesCount).toBe(1);
    });

    it('enforces 15-minute turnaround buffer around confirmed bookings', async () => {
      // Create confirmed booking on baySedan from 05:00 to 07:00 UTC
      await db.createBooking({
        facilityId: facilityA.id,
        bayId: baySedan.id,
        customerId: 'usr_cust1',
        customerName: 'Test Driver',
        customerPhone: '+919999999999',
        customerEmail: 'driver@test.com',
        licensePlate: 'TN-01-AB-1234',
        vehicleMakeModel: 'Hyundai Verna',
        startTime: '2026-10-25T05:00:00Z',
        endTime: '2026-10-25T07:00:00Z',
        grossAmount: 100,
        platformFee: 15,
        hostNetEarnings: 85,
        taxAmount: 10,
        status: 'confirmed',
      });

      // Query specifically for baySedan starting at 07:05 (within the 15-minute buffer until 07:15)
      const bufferAvail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-25T07:05:00Z',
        '2026-10-25T09:00:00Z',
        { bayId: baySedan.id }
      );

      // Must be unavailable due to 15m buffer transition
      expect(bufferAvail.availableSpacesCount).toBe(0);
      expect(bufferAvail.spaces[0].isAvailable).toBe(false);

      // Query starting at 07:16 (after the 15-minute buffer)
      const afterBufferAvail = await db.calculateRealAvailability(
        facilityA.id,
        '2026-10-25T07:16:00Z',
        '2026-10-25T09:00:00Z',
        { bayId: baySedan.id }
      );

      expect(afterBufferAvail.availableSpacesCount).toBe(1);
      expect(afterBufferAvail.spaces[0].isAvailable).toBe(true);
    });
  });

  // =========================================================================
  // SCOPE C: PRICE QUOTE & AVAILABILITY RESPONSE
  // =========================================================================
  describe('Scope C — Authoritative Price Quote & Unified Response', () => {
    it('produces server-calculated quote with hourly billing and real availability', async () => {
      await db.createRatePlan(
        facilityA.id,
        {
          name: 'Standard Hourly Plan',
          hourlyRateCents: 600, // $6.00/hr
          dailyRateCents: 4000, // $40.00/day
          vehicleCategory: 'ALL',
        },
        hostA
      );

      // 3-hour stay during open hours
      const quote = await db.calculateAuthoritativeQuote(
        facilityA.id,
        '2026-10-26T04:00:00Z',
        '2026-10-26T07:00:00Z'
      );

      expect(quote.isAvailable).toBe(true);
      expect(quote.billableHours).toBe(3);
      expect(quote.appliedHourlyRateCents).toBe(600);
      expect(quote.rateTierApplied).toBe('HOURLY');
      expect(quote.baseAmountCents).toBe(1800); // 3 * 600
      expect(quote.platformFeeCents).toBe(Math.round(1800 * 0.15)); // 270
      expect(quote.taxesCents).toBe(Math.round(1800 * 0.10)); // 180
      expect(quote.securityDepositCents).toBe(2000);
      expect(quote.totalPayableCents).toBe(1800 + 2000 + 270 + 180);
      expect(quote.isInformationalQuote).toBe(true);
      expect(quote.availableCapacity).toBe(3);
      expect(quote.breakdown.length).toBeGreaterThanOrEqual(4);
    });

    it('caps billable amount at daily rate when hourly total exceeds daily cap', async () => {
      await db.createRatePlan(
        facilityA.id,
        {
          name: 'Capped Plan',
          hourlyRateCents: 800, // $8.00/hr
          dailyRateCents: 3000, // $30.00/day (cap reached at 4 hours)
          vehicleCategory: 'ALL',
        },
        hostA
      );

      // 6-hour stay (6 * 800 = 4800, but capped at 3000)
      const quote = await db.calculateAuthoritativeQuote(
        facilityA.id,
        '2026-10-26T04:00:00Z',
        '2026-10-26T10:00:00Z'
      );

      expect(quote.rateTierApplied).toBe('DAILY');
      expect(quote.baseAmountCents).toBe(3000);
      expect(quote.breakdown[0].description).toMatch(/Daily Capped/i);
    });

    it('returns zero availability and explicit reason when duration falls outside operating hours', async () => {
      const quote = await db.calculateAuthoritativeQuote(
        facilityA.id,
        '2026-10-26T18:00:00Z', // 11:30 PM IST (facility closed)
        '2026-10-26T21:00:00Z'
      );

      expect(quote.isAvailable).toBe(false);
      expect(quote.availableCapacity).toBe(0);
      expect(quote.unavailabilityReason).toMatch(/operating hours/i);
    });
  });
});
