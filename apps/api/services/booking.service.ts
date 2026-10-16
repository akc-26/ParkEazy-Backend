import {
  BookingHold,
  BookingSummary,
  BookingStatus,
  BOOKING_CONSTRAINTS,
  BookingQuoteSnapshot,
} from '../../../packages/contracts';
import { inventoryService } from './inventory.service';
import { AppError } from '../middleware/error-handler';

class BookingService {
  private holds: Map<string, BookingHold> = new Map();
  private bookings: BookingSummary[] = [
    {
      id: 'bk-2026-9810',
      bayId: 'bay-001-a',
      bayNumber: 'B2-30',
      locationId: 'loc-dt-001',
      locationName: 'Financial Tower Covered Facility',
      locationTimezone: 'America/Los_Angeles',
      userId: 'usr-customer-001',
      userName: 'Alex Morgan',
      hostId: 'usr-host-001',
      startTimeUtc: '2026-10-16T14:00:00Z',
      endTimeUtc: '2026-10-16T18:00:00Z',
      status: BookingStatus.CONFIRMED,
      licensePlate: '7XYZ890',
      quote: {
        quoteId: 'qt-9810',
        baseAmountCents: 2600,
        securityDepositCents: 2500,
        platformFeeCents: 390,
        taxesCents: 260,
        totalPayableCents: 5750,
        currency: 'USD',
        durationMinutes: 240,
        cancellationPolicyTier: 'STANDARD_48H',
        quotedAtUtc: '2026-10-16T08:00:00Z',
      },
      createdAtUtc: '2026-10-16T08:05:00Z',
    },
    {
      id: 'bk-2026-9811',
      bayId: 'bay-002-a',
      bayNumber: 'Bay 1 (EV)',
      locationId: 'loc-res-002',
      locationName: 'Oakridge Residential Driveway & EV Point',
      locationTimezone: 'America/Los_Angeles',
      userId: 'usr-customer-002',
      userName: 'Jordan Lee',
      hostId: 'usr-host-001',
      startTimeUtc: '2026-10-16T16:00:00Z',
      endTimeUtc: '2026-10-16T20:30:00Z',
      status: BookingStatus.ACTIVE,
      licensePlate: 'EV-8821',
      checkedInAtUtc: '2026-10-16T16:02:00Z',
      quote: {
        quoteId: 'qt-9811',
        baseAmountCents: 2025,
        securityDepositCents: 1500,
        platformFeeCents: 300,
        taxesCents: 200,
        totalPayableCents: 4025,
        currency: 'USD',
        durationMinutes: 270,
        cancellationPolicyTier: 'FLEXIBLE_24H',
        quotedAtUtc: '2026-10-16T12:00:00Z',
      },
      createdAtUtc: '2026-10-16T12:05:00Z',
    },
  ];

  public getRules() {
    return {
      holdDurationSeconds: BOOKING_CONSTRAINTS.HOLD_DURATION_SECONDS, // 10 minutes
      minDurationHours: BOOKING_CONSTRAINTS.MIN_DURATION_HOURS, // 1 hour
      maxDurationHours: BOOKING_CONSTRAINTS.MAX_DURATION_HOURS, // 72 hours
      intervalMinutes: BOOKING_CONSTRAINTS.INCREMENT_MINUTES, // 30 minutes
      minLeadTimeMinutes: BOOKING_CONSTRAINTS.MIN_LEAD_TIME_MINUTES, // 15 minutes
      bookingHorizonDays: BOOKING_CONSTRAINTS.MAX_BOOKING_HORIZON_DAYS, // 30 days
      transitionBufferMinutes: BOOKING_CONSTRAINTS.TRANSITION_BUFFER_MINUTES, // 15 minutes
    };
  }

  public getAllBookings(): BookingSummary[] {
    return this.bookings;
  }

  public getBookingsForHost(hostId: string): BookingSummary[] {
    return this.bookings.filter((b) => b.hostId === hostId);
  }

  public createHold(bayId: string, locationId: string, userId: string, durationMinutes: number): BookingHold {
    const bay = inventoryService.getBayById(bayId);
    const location = inventoryService.getLocationById(locationId);

    if (!bay || !location) {
      throw new AppError('Specified parking bay or location does not exist.', 404, 'INVENTORY_NOT_FOUND');
    }

    if (durationMinutes < 60 || durationMinutes > 72 * 60) {
      throw new AppError('Duration must be between 1 hour and 72 continuous hours.', 400, 'INVALID_DURATION');
    }

    if (durationMinutes % 30 !== 0) {
      throw new AppError('Booking duration must be in 30-minute increments.', 400, 'INVALID_INCREMENT');
    }

    const now = new Date();
    const startTimeUtc = new Date(now.getTime() + 15 * 60000); // 15m lead time
    const endTimeUtc = new Date(startTimeUtc.getTime() + durationMinutes * 60000);
    const holdExpiresAtUtc = new Date(now.getTime() + BOOKING_CONSTRAINTS.HOLD_DURATION_SECONDS * 1000);

    const baseAmountCents = Math.round((location.hourlyRateCents * durationMinutes) / 60);
    const platformFeeCents = Math.round(baseAmountCents * 0.15);
    const taxesCents = Math.round(baseAmountCents * 0.1);
    const totalPayableCents = baseAmountCents + location.securityDepositCents + platformFeeCents + taxesCents;

    const quoteSnapshot: BookingQuoteSnapshot = {
      quoteId: 'qt-' + Math.random().toString(36).substring(2, 8),
      baseAmountCents,
      securityDepositCents: location.securityDepositCents,
      platformFeeCents,
      taxesCents,
      totalPayableCents,
      currency: 'USD',
      durationMinutes,
      cancellationPolicyTier: 'STANDARD_48H',
      quotedAtUtc: now.toISOString(),
    };

    const hold: BookingHold = {
      holdId: 'hold-' + Math.random().toString(36).substring(2, 9),
      bayId,
      locationId,
      userId,
      startTimeUtc: startTimeUtc.toISOString(),
      endTimeUtc: endTimeUtc.toISOString(),
      holdExpiresAtUtc: holdExpiresAtUtc.toISOString(),
      holdDurationSeconds: BOOKING_CONSTRAINTS.HOLD_DURATION_SECONDS,
      quoteSnapshot,
    };

    this.holds.set(hold.holdId, hold);
    return hold;
  }

  public getHold(holdId: string): BookingHold | null {
    const hold = this.holds.get(holdId);
    if (!hold) return null;

    // Check expiration
    if (new Date(hold.holdExpiresAtUtc).getTime() < Date.now()) {
      this.holds.delete(holdId);
      return null;
    }
    return hold;
  }
}

export const bookingService = new BookingService();
