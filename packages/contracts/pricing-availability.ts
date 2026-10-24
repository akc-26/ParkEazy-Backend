/**
 * Contracts for ParkEazy HP-05 Pricing & Policies and HP-06 Availability & Calendar
 *
 * Invariants Enforced:
 * 1. Monetary precision: All rates, deposits, and fees are stored in integer minor units (cents). Imprecise floating point arithmetic is banned.
 * 2. Confirmed booking protection: Confirmed reservations and unexpired holds take absolute precedence over availability updates.
 * 3. Exact temporal boundaries: UTC timestamps with facility timezone awareness.
 * 4. Multi-tenant host isolation: Hosts only access and configure rates/availability for their own facilities.
 */

import { VehicleCategory } from './inventory';

export interface RatePlan {
  id: string;
  hostId: string;
  facilityId: string;
  bayId?: string; // Optional space-specific rate override
  name: string;
  hourlyRateCents: number;
  dailyRateCents: number;
  minBillableMinutes: number; // e.g. 60
  minBookingMinutes: number; // e.g. 60
  maxBookingMinutes: number; // e.g. 4320 (72 hours)
  stepMinutes: number; // e.g. 30
  vehicleCategory?: VehicleCategory | 'ALL';
  effectiveFromUtc: string;
  effectiveUntilUtc?: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateRatePlanRequest {
  facilityId: string;
  bayId?: string;
  name: string;
  hourlyRateCents: number;
  dailyRateCents: number;
  minBillableMinutes?: number;
  minBookingMinutes?: number;
  maxBookingMinutes?: number;
  stepMinutes?: number;
  vehicleCategory?: VehicleCategory | 'ALL';
  effectiveFromUtc?: string;
  effectiveUntilUtc?: string;
}

export interface UpdateRatePlanRequest {
  name?: string;
  hourlyRateCents?: number;
  dailyRateCents?: number;
  minBillableMinutes?: number;
  minBookingMinutes?: number;
  maxBookingMinutes?: number;
  stepMinutes?: number;
  vehicleCategory?: VehicleCategory | 'ALL';
  effectiveFromUtc?: string;
  effectiveUntilUtc?: string;
  isActive?: boolean;
}

export interface FacilityOperatingDay {
  id?: string;
  facilityId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isClosed: boolean;
  openTime: string; // "06:00" (HH:mm)
  closeTime: string; // "22:00" (HH:mm)
  isOvernight: boolean; // true if closeTime < openTime (crosses midnight)
}

export interface UpdateOperatingHoursRequest {
  facilityId: string;
  schedule: Array<{
    dayOfWeek: number;
    isClosed: boolean;
    openTime: string;
    closeTime: string;
    isOvernight?: boolean;
  }>;
}

export interface PricingPolicy {
  id: string;
  facilityId: string;
  minDurationMinutes: number; // Default 60
  maxDurationMinutes: number; // Default 4320
  bookingIncrementMinutes: number; // Default 30
  transitionBufferMinutes: number; // Default 15
  cancellationPolicyTier: 'FLEXIBLE_24H' | 'STANDARD_48H' | 'STRICT_7D';
  securityDepositCents: number; // Default 2000 ($20.00)
  overstayPenaltyPerHourCents: number; // Default 1500 ($15.00/hr)
  effectiveFromUtc: string;
  updatedAtUtc: string;
}

export interface UpdatePricingPolicyRequest {
  facilityId: string;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  bookingIncrementMinutes?: number;
  transitionBufferMinutes?: number;
  cancellationPolicyTier?: 'FLEXIBLE_24H' | 'STANDARD_48H' | 'STRICT_7D';
  securityDepositCents?: number;
  overstayPenaltyPerHourCents?: number;
}

export interface FacilityClosure {
  id: string;
  hostId: string;
  facilityId: string;
  bayId?: string; // If undefined, applies to entire facility
  title: string;
  reason: 'MAINTENANCE' | 'EVENT' | 'HOLIDAY' | 'WEATHER' | 'OTHER';
  startTimeUtc: string;
  endTimeUtc: string;
  createdAtUtc: string;
}

export interface CreateFacilityClosureRequest {
  facilityId: string;
  bayId?: string;
  title: string;
  reason: 'MAINTENANCE' | 'EVENT' | 'HOLIDAY' | 'WEATHER' | 'OTHER';
  startTimeUtc: string;
  endTimeUtc: string;
}

export interface PriceEstimateRequest {
  facilityId: string;
  bayId?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  vehicleCategory?: VehicleCategory;
}

export interface PriceEstimateBreakdownItem {
  description: string;
  amountCents: number;
  unitRateCents?: number;
  quantity?: number;
  unitLabel?: string;
}

export interface PriceEstimateResponse {
  quoteId: string;
  facilityId: string;
  facilityName: string;
  bayId?: string;
  bayNumber?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  durationMinutes: number;
  billableHours: number;
  billableDays: number;
  appliedHourlyRateCents: number;
  appliedDailyRateCents: number;
  rateTierApplied: 'HOURLY' | 'DAILY' | 'HYBRID';
  baseAmountCents: number;
  securityDepositCents: number;
  platformFeeCents: number; // 15%
  taxesCents: number; // 10%
  totalPayableCents: number;
  currency: string;
  cancellationPolicyTier: 'FLEXIBLE_24H' | 'STANDARD_48H' | 'STRICT_7D';
  breakdown: PriceEstimateBreakdownItem[];
  quotedAtUtc: string;
}

export interface BulkPriceUpdateRequest {
  targetType: 'ALL_FACILITIES' | 'SELECTED_FACILITIES' | 'SELECTED_SPACES';
  facilityIds?: string[];
  spaceIds?: string[];
  rateAdjustment: {
    type: 'EXACT' | 'PERCENTAGE' | 'FIXED_OFFSET';
    hourlyRateCents?: number;
    dailyRateCents?: number;
    percentageChange?: number;
    hourlyChangeCents?: number;
    dailyChangeCents?: number;
  };
  effectiveFromUtc?: string;
  notes?: string;
}

export interface BulkPriceUpdateTargetPreview {
  facilityId: string;
  facilityName: string;
  spaceId?: string;
  spaceNumber?: string;
  currentHourlyRateCents: number;
  currentDailyRateCents: number;
  proposedHourlyRateCents: number;
  proposedDailyRateCents: number;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface BulkPriceUpdatePreviewResponse {
  totalTargetsCount: number;
  eligibleTargetsCount: number;
  conflictingTargetsCount: number;
  targets: BulkPriceUpdateTargetPreview[];
  summaryMessage: string;
}

export interface PricingConflict {
  id: string;
  facilityId: string;
  facilityName: string;
  spaceId?: string;
  spaceNumber?: string;
  type: 'CONFIRMED_BOOKING_OVERLAP' | 'ACTIVE_HOLD_OVERLAP' | 'CLOSURE_SCHEDULE_MISMATCH' | 'INVALID_DURATION_BOUNDS';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  startTimeUtc: string;
  endTimeUtc: string;
  bookingReference?: string;
  suggestedAction: string;
}

export interface PricingAuditRecord {
  id: string;
  hostId: string;
  facilityId: string;
  facilityName?: string;
  spaceId?: string;
  spaceNumber?: string;
  action:
    | 'RATE_CREATED'
    | 'RATE_UPDATED'
    | 'RATE_DEACTIVATED'
    | 'SCHEDULE_UPDATED'
    | 'POLICY_UPDATED'
    | 'CLOSURE_CREATED'
    | 'CLOSURE_REMOVED'
    | 'BULK_UPDATE_APPLIED';
  actorId: string;
  actorEmail?: string;
  previousValue?: any;
  newValue?: any;
  diffSummary: string;
  correlationId?: string;
  createdAtUtc: string;
}

// ----------------------------------------------------------------------------
// HP-06 Availability & Calendar Contracts
// ----------------------------------------------------------------------------

export interface RecurringAvailabilitySchedule {
  id: string;
  hostId: string;
  facilityId: string;
  spaceId?: string; // Optional space-level schedule
  dayOfWeek: number; // 0=Sunday..6=Saturday
  startTime: string; // "08:00"
  endTime: string; // "18:00"
  isAvailable: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface AvailabilityOverride {
  id: string;
  hostId: string;
  facilityId: string;
  spaceId?: string;
  date: string; // "YYYY-MM-DD"
  isAvailable: boolean;
  startTime?: string; // "10:00"
  endTime?: string; // "16:00"
  reason: string;
  createdAtUtc: string;
}

export interface MaintenanceBlock {
  id: string;
  hostId: string;
  facilityId: string;
  spaceId: string;
  spaceNumber: string;
  title: string;
  description?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateMaintenanceBlockRequest {
  facilityId: string;
  spaceId: string;
  title: string;
  description?: string;
  startTimeUtc: string;
  endTimeUtc: string;
}

export interface CalendarEvent {
  id: string;
  facilityId: string;
  facilityName: string;
  spaceId?: string;
  spaceNumber?: string;
  eventType: 'CONFIRMED_BOOKING' | 'ACTIVE_HOLD' | 'MAINTENANCE_BLOCK' | 'FACILITY_CLOSURE' | 'SCHEDULE_OVERRIDE';
  title: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string; // 'CONFIRMED', 'ACTIVE', 'SCHEDULED', 'BLOCKED'
  accessibleBadgeText: string;
  isProtectedReservation: boolean; // If true, cannot be overwritten or canceled by host
  customerName?: string;
  licensePlate?: string;
  notes?: string;
}

export interface AvailabilityInterval {
  spaceId: string;
  spaceNumber: string;
  isAvailable: boolean;
  statusLabel: 'Available' | 'Confirmed Booking' | 'Temporary Hold' | 'Maintenance Block' | 'Closed' | 'Outside Operating Hours';
  activeBookingId?: string;
  activeHoldId?: string;
  reason?: string;
  startTimeUtc: string;
  endTimeUtc: string;
}

export interface SpaceAvailabilitySummary {
  facilityId: string;
  facilityName: string;
  totalSpaces: number;
  availableSpacesCount: number;
  occupiedSpacesCount: number;
  heldSpacesCount: number;
  blockedSpacesCount: number;
  unavailabilityReason?: string | null;
  eligibleBayIds?: string[];
  spaces: Array<{
    spaceId: string;
    spaceNumber: string;
    levelOrFloor?: string;
    isAvailable: boolean;
    currentStatus: string;
    nextBookingStartsUtc?: string;
  }>;
}

export interface ValidateAvailabilityChangeRequest {
  facilityId: string;
  spaceId?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  proposedAction: 'CLOSE_PERIOD' | 'MAINTENANCE_BLOCK' | 'SCHEDULE_REDUCTION';
}

export interface ValidateAvailabilityChangeResponse {
  canApply: boolean;
  hasConflicts: boolean;
  conflicts: PricingConflict[];
  protectedBookingsCount: number;
  activeHoldsCount: number;
  message: string;
}

export interface QuoteAndAvailabilityResponse extends PriceEstimateResponse {
  isAvailable: boolean;
  availableCapacity: number;
  totalCapacity: number;
  eligibleBayIds: string[];
  eligibleBays?: Array<{
    spaceId: string;
    spaceNumber: string;
    levelOrFloor?: string;
    isAvailable: boolean;
    currentStatus: string;
  }>;
  applicablePricingRuleId: string;
  unavailabilityReason?: string | null;
  isInformationalQuote: boolean;
  vehicleCategory?: string;
  precedenceTier?: string;
}
