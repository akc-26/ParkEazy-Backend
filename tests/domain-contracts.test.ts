import { describe, it, expect } from 'vitest';
import {
  USER_ROLES,
  VEHICLE_TYPES,
  BOOKING_STATUSES,
  SPACE_STATUSES,
  FACILITY_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  SETTLEMENT_STATUSES,
  type UserAccount,
  type ParkingFacility,
  type ParkingSpace,
  type Booking,
  type ReservationHold,
  type PaymentTransaction,
  type HostSettlement,
  type PaginatedResponse,
  type ApiErrorResponse,
} from '../packages/shared-types/src';

describe('Part 03: Shared Domain Contracts', () => {
  describe('Enumerations and Domain Status Sets', () => {
    it('should define authorized role identifiers for RBAC', () => {
      expect(USER_ROLES).toContain('customer');
      expect(USER_ROLES).toContain('host');
      expect(USER_ROLES).toContain('attendant');
      expect(USER_ROLES).toContain('superadmin');
      expect(USER_ROLES.length).toBe(4);
    });

    it('should define vehicle categories matching the design specifications', () => {
      expect(VEHICLE_TYPES).toContain('car');
      expect(VEHICLE_TYPES).toContain('bike');
      expect(VEHICLE_TYPES).toContain('auto');
      expect(VEHICLE_TYPES).toContain('suv');
      expect(VEHICLE_TYPES.length).toBe(4);
    });

    it('should define full booking lifecycle status values', () => {
      expect(BOOKING_STATUSES).toEqual([
        'pending',
        'confirmed',
        'active',
        'completed',
        'cancelled',
        'expired',
      ]);
    });

    it('should define space inventory and facility statuses', () => {
      expect(SPACE_STATUSES).toEqual(['available', 'occupied', 'reserved', 'maintenance']);
      expect(FACILITY_STATUSES).toEqual(['draft', 'under_review', 'published', 'suspended']);
    });

    it('should define neutral payment and settlement statuses', () => {
      expect(PAYMENT_PROVIDERS).toEqual(['razorpay', 'stripe', 'mock_gateway']);
      expect(PAYMENT_STATUSES).toEqual(['initiated', 'captured', 'failed', 'refunded']);
      expect(SETTLEMENT_STATUSES).toEqual(['scheduled', 'processing', 'completed', 'failed']);
    });
  });

  describe('Contract Structure & JSON Serialization', () => {
    it('should serialize and deserialize a complete UserAccount contract', () => {
      const user: UserAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: 'default',
        email: 'host.chennai@parkeazy.com',
        phone: '+919876543210',
        fullName: 'Senthil Murugan',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        roles: ['host'],
        createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z',
      };

      const json = JSON.stringify(user);
      const parsed = JSON.parse(json) as UserAccount;
      expect(parsed.id).toBe(user.id);
      expect(parsed.roles).toEqual(['host']);
      expect(parsed.status).toBe('active');
    });

    it('should construct a valid ParkingFacility domain model', () => {
      const facility: ParkingFacility = {
        id: '223e4567-e89b-12d3-a456-426614174001',
        tenantId: 'default',
        hostId: '123e4567-e89b-12d3-a456-426614174000',
        facilityCode: '#FAC-0104',
        name: 'Anna Nagar Plaza Parking',
        addressLine1: '2nd Avenue',
        city: 'Chennai',
        postalCode: '600102',
        latitude: 13.085038,
        longitude: 80.210137,
        isCovered: true,
        is24x7: false,
        status: 'published',
        totalSpaces: 24,
        activeSpaces: 24,
        amenities: ['CCTV', 'EV Fast Charging'],
        createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z',
      };

      expect(facility.facilityCode).toBe('#FAC-0104');
      expect(facility.latitude).toBeCloseTo(13.085, 2);
      expect(facility.amenities.length).toBe(2);
    });

    it('should verify Booking and ReservationHold structures without hardcoded policy', () => {
      const hold: ReservationHold = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        spaceId: '423e4567-e89b-12d3-a456-426614174003',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        startsAt: '2026-10-10T10:00:00.000Z',
        endsAt: '2026-10-10T14:00:00.000Z',
        expiresAt: '2026-10-10T10:10:00.000Z',
        isReleased: false,
        createdAt: '2026-10-10T10:00:00.000Z',
      };

      expect(hold.isReleased).toBe(false);
      expect(new Date(hold.expiresAt).getTime() - new Date(hold.startsAt).getTime()).toBe(600000);
    });

    it('should model standardized paginated and error responses', () => {
      const paginated: PaginatedResponse<string> = {
        items: ['item1', 'item2'],
        total: 50,
        page: 1,
        limit: 2,
        totalPages: 25,
        hasNextPage: true,
        hasPrevPage: false,
      };

      expect(paginated.hasNextPage).toBe(true);
      expect(paginated.totalPages).toBe(25);

      const err: ApiErrorResponse = {
        statusCode: 400,
        error: 'BadRequest',
        message: 'Validation Failed',
        validationErrors: ['email must be a valid email address'],
        timestamp: new Date().toISOString(),
        path: '/api/v1/users/register',
      };

      expect(err.statusCode).toBe(400);
      expect(err.validationErrors?.length).toBe(1);
    });
  });
});
