import { PricingBreakdown } from './payment';

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'expired',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface BookingStub {
  id: string;
  referenceNumber: string;
  spaceId: string;
  facilityId: string;
  vehicleRegistration: string;
  status: BookingStatus;
  startTime: string;
  endTime: string;
  totalAmountInr: number;
}

/**
 * Ephemeral Reservation Hold Lease (Concurrency Lock)
 * 
 * Note on DEC-04: The hold duration TTL (e.g. 10 minutes / 600s) is an unapproved
 * conceptual proposal pending final sign-off in PART_01_DECISIONS_REGISTER.md.
 * The contract models dynamic startsAt, endsAt, and expiresAt timestamps
 * without hardcoding a fixed commercial duration policy.
 */
export interface ReservationHold {
  id: string; // UUID
  spaceId: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  isReleased: boolean;
  createdAt: string;
}

export interface Booking {
  id: string; // UUID
  tenantId: string;
  bookingReference: string; // e.g. '#PKZ-2026-9481'
  spaceId: string;
  facilityId: string;
  customerId: string;
  vehiclePlate: string;
  vehicleCategory: 'car' | 'bike' | 'auto' | 'suv';
  startsAt: string;
  endsAt: string;
  actualCheckInAt?: string;
  actualCheckOutAt?: string;
  pricing: PricingBreakdown;
  status: BookingStatus;
  qrAccessToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  tenantId?: string;
  spaceId: string;
  facilityId: string;
  vehiclePlate: string;
  vehicleCategory: 'car' | 'bike' | 'auto' | 'suv';
  startsAt: string;
  endsAt: string;
}
