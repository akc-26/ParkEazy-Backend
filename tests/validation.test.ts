import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidIndianMobile,
  isValidVehiclePlate,
  isValidUuid,
  isValidTenantId,
  isValidBookingReference,
  isValidIsoDateTime,
  isValidTimeFormat,
  isValidGeoCoordinate,
  isValidPostalCode,
  isValidEnum,
  sanitizeString,
  validatePaginationParams,
  validateTimeWindow,
  validateCreateBooking,
  validateCreateFacility,
  validateCreateSpace,
  validateUserRegistration,
  validateSearchQuery,
} from '../packages/validation/src';

describe('Part 03: Runtime Input Validation & Boundaries', () => {
  describe('Common Field Validators', () => {
    it('should validate email addresses accurately', () => {
      expect(isValidEmail('test@parkeazy.com')).toBe(true);
      expect(isValidEmail('user.name+tag@sub.domain.co')).toBe(true);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });

    it('should validate Indian mobile numbers (+91 and 10 digits)', () => {
      expect(isValidIndianMobile('+919876543210')).toBe(true);
      expect(isValidIndianMobile('9876543210')).toBe(true);
      expect(isValidIndianMobile('+91-98765-43210')).toBe(true);
      expect(isValidIndianMobile('5876543210')).toBe(false);
      expect(isValidIndianMobile('123')).toBe(false);
      expect(isValidIndianMobile('abcdefghij')).toBe(false);
    });

    it('should validate Indian vehicle registration plate formats', () => {
      expect(isValidVehiclePlate('TN01AB1234')).toBe(true);
      expect(isValidVehiclePlate('TN-01-AB-1234')).toBe(true);
      expect(isValidVehiclePlate('DL04C1234')).toBe(true);
      expect(isValidVehiclePlate('KA 05 MN 9999')).toBe(true);
      expect(isValidVehiclePlate('123456')).toBe(false);
      expect(isValidVehiclePlate('ABCDEF')).toBe(false);
    });

    it('should validate UUID v4 strings', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('c9bf9e57-1685-4c89-bafb-ff5af830be8a')).toBe(true);
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456')).toBe(false);
    });

    it('should validate tenant identifiers', () => {
      expect(isValidTenantId('default')).toBe(true);
      expect(isValidTenantId('metro-chennai')).toBe(true);
      expect(isValidTenantId('tenant_123')).toBe(false);
      expect(isValidTenantId('')).toBe(false);
    });

    it('should validate booking references', () => {
      expect(isValidBookingReference('#PKZ-2026-9481')).toBe(true);
      expect(isValidBookingReference('PKZ-2026-9481')).toBe(true);
      expect(isValidBookingReference('INVALID-REF')).toBe(false);
    });

    it('should validate ISO-8601 date-times', () => {
      expect(isValidIsoDateTime('2026-10-10T12:00:00.000Z')).toBe(true);
      expect(isValidIsoDateTime('2026-10-10T12:00:00+05:30')).toBe(true);
      expect(isValidIsoDateTime('not-a-date')).toBe(false);
      expect(isValidIsoDateTime('2026-13-45')).toBe(false);
    });

    it('should validate 24-hour time strings', () => {
      expect(isValidTimeFormat('08:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('00:00:00')).toBe(true);
      expect(isValidTimeFormat('25:00')).toBe(false);
      expect(isValidTimeFormat('12:60')).toBe(false);
    });

    it('should validate geographic coordinates', () => {
      expect(isValidGeoCoordinate(13.0827, 80.2707)).toBe(true);
      expect(isValidGeoCoordinate(91.0, 80.0)).toBe(false);
      expect(isValidGeoCoordinate(13.0, 181.0)).toBe(false);
      expect(isValidGeoCoordinate(NaN, 80.0)).toBe(false);
    });

    it('should validate 6-digit Indian PIN codes', () => {
      expect(isValidPostalCode('600001')).toBe(true);
      expect(isValidPostalCode('600102')).toBe(true);
      expect(isValidPostalCode('012345')).toBe(false);
      expect(isValidPostalCode('60000')).toBe(false);
      expect(isValidPostalCode('6000001')).toBe(false);
    });

    it('should sanitize untrusted strings and strip HTML tags', () => {
      expect(sanitizeString('  Hello World  ')).toBe('Hello World');
      expect(sanitizeString('<script>alert("xss")</script>Test')).toBe('scriptalert("xss")/scriptTest');
    });
  });

  describe('Pagination Validation', () => {
    it('should supply default pagination parameters', () => {
      const res = validatePaginationParams(null);
      expect(res.success).toBe(true);
      expect(res.data?.page).toBe(1);
      expect(res.data?.limit).toBe(20);
    });

    it('should accept valid custom page and limit', () => {
      const res = validatePaginationParams({ page: '3', limit: '50' });
      expect(res.success).toBe(true);
      expect(res.data?.page).toBe(3);
      expect(res.data?.limit).toBe(50);
    });

    it('should enforce maximum limit ceiling', () => {
      const res = validatePaginationParams({ limit: 500 }, { maxLimit: 100 });
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain('limit cannot exceed 100');
    });

    it('should reject non-integer or negative page numbers', () => {
      const res = validatePaginationParams({ page: -1 });
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain('page must be an integer');
    });
  });

  describe('Domain Request Validation', () => {
    it('should validate booking time windows correctly', () => {
      const start = '2026-10-10T10:00:00.000Z';
      const end = '2026-10-10T12:00:00.000Z';
      const res = validateTimeWindow(start, end);
      expect(res.success).toBe(true);
      expect(res.data?.durationMinutes).toBe(120);

      // Reversed time
      const invalidRes = validateTimeWindow(end, start);
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.errors[0]).toContain('endsAt must be chronologically after startsAt');

      // Less than minimum 15 mins
      const tooShort = validateTimeWindow(start, '2026-10-10T10:05:00.000Z');
      expect(tooShort.success).toBe(false);
      expect(tooShort.errors[0]).toContain('at least 15 minutes');
    });

    it('should validate a complete create booking request', () => {
      const validPayload = {
        spaceId: '123e4567-e89b-12d3-a456-426614174000',
        facilityId: '223e4567-e89b-12d3-a456-426614174001',
        vehiclePlate: 'TN-01-AB-1234',
        vehicleCategory: 'car',
        startsAt: '2026-10-10T10:00:00.000Z',
        endsAt: '2026-10-10T12:00:00.000Z',
      };

      const res = validateCreateBooking(validPayload);
      expect(res.success).toBe(true);
      expect(res.data?.vehiclePlate).toBe('TN01AB1234');
      expect(res.data?.tenantId).toBe('default');

      // Invalid category
      const badCategory = validateCreateBooking({ ...validPayload, vehicleCategory: 'truck' });
      expect(badCategory.success).toBe(false);
      expect(badCategory.errors[0]).toContain('vehicleCategory must be one of');
    });

    it('should validate facility creation requests with bounds checking', () => {
      const validFacility = {
        hostId: '123e4567-e89b-12d3-a456-426614174000',
        facilityCode: '#FAC-0104',
        name: 'Anna Nagar Plaza Parking',
        addressLine1: '2nd Avenue East',
        city: 'Chennai',
        postalCode: '600102',
        latitude: 13.085038,
        longitude: 80.210137,
        isCovered: true,
        is24x7: false,
        gatePinCode: '4821',
        amenities: ['CCTV', 'EV Charger'],
      };

      const res = validateCreateFacility(validFacility);
      expect(res.success).toBe(true);
      expect(res.data?.latitude).toBe(13.085038);
      expect(res.data?.amenities).toHaveLength(2);

      // Bad coordinates
      const badCoords = validateCreateFacility({ ...validFacility, latitude: 105.0 });
      expect(badCoords.success).toBe(false);
      expect(badCoords.errors.some(e => e.includes('geographic coordinates'))).toBe(true);
    });

    it('should validate space creation and enforce positive rates', () => {
      const validSpace = {
        facilityId: '223e4567-e89b-12d3-a456-426614174001',
        bayIdentifier: 'A-01',
        floorLevel: 'Ground',
        vehicleCategory: 'car',
        hasEvCharger: true,
        evChargerPowerKw: 22.0,
        isDisabledAccessible: false,
        hourlyRateInr: 40.0,
      };

      const res = validateCreateSpace(validSpace);
      expect(res.success).toBe(true);
      expect(res.data?.bayIdentifier).toBe('A-01');

      // Negative hourly rate
      const badRate = validateCreateSpace({ ...validSpace, hourlyRateInr: -10 });
      expect(badRate.success).toBe(false);
      expect(badRate.errors[0]).toContain('hourlyRateInr must be a positive number');
    });

    it('should validate user registration and reject short passwords', () => {
      const validUser = {
        email: 'newuser@parkeazy.com',
        phone: '+919876543210',
        fullName: 'Karthik Raja',
        role: 'customer',
        password: 'securePassword123',
      };

      const res = validateUserRegistration(validUser);
      expect(res.success).toBe(true);
      expect(res.data?.email).toBe('newuser@parkeazy.com');

      const shortPwd = validateUserRegistration({ ...validUser, password: 'short' });
      expect(shortPwd.success).toBe(false);
      expect(shortPwd.errors[0]).toContain('password must be at least 8 characters');
    });

    it('should validate search query radius within 50km', () => {
      const validSearch = {
        latitude: 13.0827,
        longitude: 80.2707,
        radiusMeters: 5000,
        vehicleCategory: 'car',
      };

      const res = validateSearchQuery(validSearch);
      expect(res.success).toBe(true);
      expect(res.data?.radiusMeters).toBe(5000);

      const excessiveRadius = validateSearchQuery({ ...validSearch, radiusMeters: 60000 });
      expect(excessiveRadius.success).toBe(false);
      expect(excessiveRadius.errors[0]).toContain('radiusMeters must be a positive number up to 50,000');
    });
  });
});
