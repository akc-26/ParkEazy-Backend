import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../server/db';
import {
  DEFAULT_FACILITY_TIMEZONE,
  resolveFacilityTimezone,
  isValidTimezone,
  getFacilityLocalDateTime,
  formatInFacilityTimezone,
  convertZonedTimeToUtc
} from '../server/timezone';
import { User, Facility } from '../server/types';

describe('Section 3B: Standardized Facility Timezone Consistency', () => {
  let hostA: User;

  beforeEach(async () => {
    await db.initialize();
    hostA = (await db.findUserById('usr_host1'))!;
  });

  // 1. Timezone default and resolver
  describe('Default and Fallback Behavior', () => {
    it('standardizes default facility timezone to Asia/Kolkata', () => {
      expect(DEFAULT_FACILITY_TIMEZONE).toBe('Asia/Kolkata');
      expect(resolveFacilityTimezone(undefined)).toBe('Asia/Kolkata');
      expect(resolveFacilityTimezone(null)).toBe('Asia/Kolkata');
      expect(resolveFacilityTimezone('')).toBe('Asia/Kolkata');
      expect(resolveFacilityTimezone('   ')).toBe('Asia/Kolkata');
      expect(resolveFacilityTimezone('invalid/timezone_xyz')).toBe('Asia/Kolkata');
    });

    it('creates a facility without explicit timezone and defaults to Asia/Kolkata', async () => {
      const fac = await db.createFacility(
        hostA.id,
        {
          name: 'Default Timezone Facility',
          address: '12 Anna Salai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600002',
          country: 'India',
          latitude: 13.08,
          longitude: 80.27,
          type: 'covered',
          totalSpots: 5,
          isCovered: true,
          operatingHours: '24/7',
          // timezone omitted intentionally
        }
      );

      expect(fac.timezone).toBe('Asia/Kolkata');

      const fetched = await db.getFacilityById(fac.id);
      expect(fetched?.timezone).toBe('Asia/Kolkata');

      const opHours = await db.getOperatingHours(fac.id, hostA);
      expect(opHours.timezone).toBe('Asia/Kolkata');
    });
  });

  // 2. Explicit valid timezones preserved
  describe('Explicit Timezone Preservation', () => {
    it('preserves valid explicit timezones such as America/New_York and Europe/London', async () => {
      const facNY = await db.createFacility(
        hostA.id,
        {
          name: 'Manhattan Hub',
          address: '350 5th Ave',
          city: 'New York',
          state: 'NY',
          postalCode: '10118',
          country: 'USA',
          latitude: 40.7484,
          longitude: -73.9857,
          type: 'multilevel',
          totalSpots: 20,
          isCovered: true,
          operatingHours: '24/7',
          timezone: 'America/New_York',
        }
      );

      expect(facNY.timezone).toBe('America/New_York');

      const fetchedNY = await db.getFacilityById(facNY.id);
      expect(fetchedNY?.timezone).toBe('America/New_York');

      const facLondon = await db.createFacility(
        hostA.id,
        {
          name: 'London Central Garage',
          address: '10 Downing St',
          city: 'London',
          state: 'Greater London',
          postalCode: 'SW1A 2AA',
          country: 'UK',
          latitude: 51.5034,
          longitude: -0.1276,
          type: 'covered',
          totalSpots: 10,
          isCovered: true,
          operatingHours: '24/7',
          timezone: 'Europe/London',
        }
      );

      expect(facLondon.timezone).toBe('Europe/London');
    });

    it('rejects invalid timezone during operating hours update', async () => {
      const fac = await db.createFacility(
        hostA.id,
        {
          name: 'Validation Facility',
          address: '10 Test Lane',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India',
          latitude: 13.08,
          longitude: 80.27,
          type: 'open',
          totalSpots: 5,
          isCovered: false,
          operatingHours: '24/7',
          timezone: 'Asia/Kolkata',
        }
      );

      await expect(
        db.updateOperatingHours(
          fac.id,
          [{ dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false }],
          hostA,
          'Mars/Olympus_Mons' // Invalid timezone
        )
      ).rejects.toThrow();
    });
  });

  // 3. Date boundaries and server-independent timezone calculations
  describe('Date Boundaries & Server-Independence', () => {
    it('correctly maps UTC boundary across day boundaries without relying on server timezone', () => {
      // 2026-10-23T20:00:00.000Z in UTC
      // Asia/Kolkata is UTC + 5:30 -> 2026-10-24 01:30:00 (Next day!)
      const utcDate = new Date('2026-10-23T20:00:00.000Z');
      const localKolkata = getFacilityLocalDateTime(utcDate, 'Asia/Kolkata');

      expect(localKolkata.year).toBe(2026);
      expect(localKolkata.month).toBe(10);
      expect(localKolkata.day).toBe(24);
      expect(localKolkata.hour).toBe(1);
      expect(localKolkata.minute).toBe(30);

      // In America/New_York (UTC - 4 in EDT) -> 2026-10-23 16:00:00 (Same day, 4 PM)
      const localNY = getFacilityLocalDateTime(utcDate, 'America/New_York');
      expect(localNY.year).toBe(2026);
      expect(localNY.month).toBe(10);
      expect(localNY.day).toBe(23);
      expect(localNY.hour).toBe(16);
      expect(localNY.minute).toBe(0);
    });

    it('correctly handles Daylight Saving Time (DST) transition dates for applicable timezones', () => {
      // In America/New_York, DST transitions in March and November
      // March 8, 2026: 01:59:59 EST (-5), then 03:00:00 EDT (-4)
      const beforeSpringForward = new Date('2026-03-08T06:59:00.000Z'); // 01:59 EST
      const afterSpringForward = new Date('2026-03-08T07:01:00.000Z');  // 03:01 EDT

      const localBefore = getFacilityLocalDateTime(beforeSpringForward, 'America/New_York');
      const localAfter = getFacilityLocalDateTime(afterSpringForward, 'America/New_York');

      expect(localBefore.hour).toBe(1);
      expect(localBefore.minute).toBe(59);

      expect(localAfter.hour).toBe(3);
      expect(localAfter.minute).toBe(1);
    });

    it('converts zoned facility local time to UTC accurately', () => {
      // 2026-11-01 09:00:00 in Asia/Kolkata (UTC + 5:30) -> 2026-11-01T03:30:00.000Z
      const utcIso = convertZonedTimeToUtc('2026-11-01', '09:00', 'Asia/Kolkata');
      expect(utcIso).toBe('2026-11-01T03:30:00.000Z');
    });
  });
});
