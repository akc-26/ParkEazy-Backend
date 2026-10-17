/**
 * Booking and Hold contracts for ParkEazy
 * Invariants:
 * - A booking hold lasts exactly 10 minutes (600 seconds) and is persistent on the server.
 * - Transition buffer is separate from hold and grace periods.
 * - Baseline booking duration: >= 1 hour, <= 72 continuous hours.
 * - 30-minute scheduling increments.
 * - Minimum lead time: 15 minutes.
 * - Booking horizon: 30 days.
 * - All times respect the location's specific timezone.
 */

export enum BookingStatus {
  HOLD_PENDING = 'HOLD_PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERSTAYED = 'OVERSTAYED',
  DISPUTED = 'DISPUTED',
}

export interface BookingHold {
  holdId: string;
  bayId: string;
  locationId: string;
  userId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  holdExpiresAtUtc: string; // Exactly 10 minutes from creation
  holdDurationSeconds: number; // 600
  quoteSnapshot: BookingQuoteSnapshot;
}

export interface BookingQuoteSnapshot {
  quoteId: string;
  baseAmountCents: number;
  securityDepositCents: number;
  platformFeeCents: number;
  taxesCents: number;
  totalPayableCents: number;
  currency: string;
  durationMinutes: number;
  cancellationPolicyTier: 'FLEXIBLE_24H' | 'STANDARD_48H' | 'STRICT_7D';
  quotedAtUtc: string;
}

export interface ConfirmBookingRequest {
  holdId: string;
  paymentIntentId: string;
  idempotencyKey: string;
  licensePlate: string;
  paymentMethod?: string;
  provider?: string;
}

export interface BookingSummary {
  id: string;
  holdId?: string;
  bayId: string;
  bayNumber: string;
  locationId: string;
  locationName: string;
  locationAddress?: string;
  locationTimezone: string;
  userId: string;
  userName: string;
  hostId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: BookingStatus;
  quote: BookingQuoteSnapshot;
  licensePlate?: string;
  accessInstructions?: string;
  gateCode?: string;
  paymentDetails?: {
    transactionId: string;
    provider: string;
    amountCents: number;
    currency: string;
    paidAtUtc: string;
  };
  refundDetails?: RefundRecord;
  extensionHistory?: {
    extendedAtUtc: string;
    additionalMinutes: number;
    additionalAmountCents: number;
    newEndTimeUtc: string;
  }[];
  overstayDetails?: {
    overstayMinutes: number;
    overstayFeeCents: number;
    status: 'NONE' | 'GRACE_PERIOD' | 'CHARGED' | 'DISPUTED';
  };
  checkedInAtUtc?: string;
  checkedOutAtUtc?: string;
  createdAtUtc: string;
}

export interface RefundRecord {
  refundId: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  refundedAtUtc: string;
  reason: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  transactionId?: string;
}

export const BOOKING_CONSTRAINTS = {
  HOLD_DURATION_SECONDS: 600, // 10 minutes persistent hold
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 72,
  INCREMENT_MINUTES: 30,
  MIN_LEAD_TIME_MINUTES: 15,
  MAX_BOOKING_HORIZON_DAYS: 30,
  TRANSITION_BUFFER_MINUTES: 15,
  PLATFORM_FEE_RATE: 0.15, // 15% platform service fee
  TAX_RATE: 0.10, // 10% municipal parking taxes
  HOST_REVENUE_SHARE_RATE: 0.85, // 85% host net revenue share
} as const;
