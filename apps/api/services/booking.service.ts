import {
  BookingHold,
  BookingSummary,
  BookingStatus,
  BOOKING_CONSTRAINTS,
  BookingQuoteSnapshot,
  LedgerEntryType,
  LedgerAccountType,
  PaymentProvider,
  AccessMethod,
} from '../../../packages/contracts';
import { inventoryService } from './inventory.service';
import { ledgerService } from './ledger.service';
import { PaymentAdapterFactory } from './payment-adapter';
import { integrationsService } from './integrations.service';
import { AppError } from '../middleware/error-handler';

class BookingService {
  private holds: Map<string, BookingHold> = new Map();
  private idempotencyStore: Map<string, BookingSummary> = new Map();
  private bookings: BookingSummary[] = [
    {
      id: 'bk-2026-9810',
      bayId: 'bay-001-a',
      bayNumber: 'B2-30',
      locationId: 'loc-dt-001',
      locationName: 'Financial Tower Covered Facility',
      locationAddress: '450 Montgomery Street, San Francisco, CA 94104',
      locationTimezone: 'America/Los_Angeles',
      userId: 'usr-customer-001',
      userName: 'Alex Morgan',
      hostId: 'usr-host-001',
      startTimeUtc: '2026-10-16T14:00:00Z',
      endTimeUtc: '2026-10-16T18:00:00Z',
      status: BookingStatus.CONFIRMED,
      licensePlate: '7XYZ890',
      accessInstructions: 'Enter 4-digit PIN at entry keypad. Drive down to B2 level.',
      paymentDetails: {
        transactionId: 'ch_3N88xyz_parkeazy',
        provider: 'STRIPE',
        amountCents: 5750,
        currency: 'USD',
        paidAtUtc: '2026-10-16T08:05:00Z',
      },
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
      locationAddress: '1248 Oakridge Boulevard, Palo Alto, CA 94301',
      locationTimezone: 'America/Los_Angeles',
      userId: 'usr-customer-002',
      userName: 'Jordan Lee',
      hostId: 'usr-host-001',
      startTimeUtc: '2026-10-16T16:00:00Z',
      endTimeUtc: '2026-10-16T20:30:00Z',
      status: BookingStatus.ACTIVE,
      licensePlate: 'EV-8821',
      accessInstructions: 'Park on the left side of driveway designated by EV Reserved marking.',
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

  public getBookingById(id: string): BookingSummary | undefined {
    return this.bookings.find((b) => b.id === id);
  }

  public getBookingsForUser(userId: string): BookingSummary[] {
    return this.bookings.filter((b) => b.userId === userId);
  }

  public getBookingsForHost(hostId: string): BookingSummary[] {
    return this.bookings.filter((b) => b.hostId === hostId);
  }

  public cancelBooking(
    bookingId: string,
    actorId: string,
    isAdmin = false,
    idempotencyKey?: string
  ): BookingSummary {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new AppError(`Booking '${bookingId}' not found.`, 404, 'NOT_FOUND');
    }

    if (!isAdmin && booking.userId !== actorId && booking.hostId !== actorId) {
      throw new AppError('Access denied. You do not have permission to cancel this reservation.', 403, 'FORBIDDEN');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError('Cannot cancel a completed reservation.', 400, 'INVALID_STATE');
    }

    if (booking.status === BookingStatus.ACTIVE) {
      throw new AppError('Cannot cancel an active parking session. Please check out instead.', 400, 'INVALID_STATE');
    }

    const now = new Date();
    const startTime = new Date(booking.startTimeUtc);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const totalPaid = booking.paymentDetails?.amountCents || booking.quote?.totalPayableCents || 0;
    const policyTier = booking.quote?.cancellationPolicyTier || 'STANDARD_48H';
    let refundRatio = 0;

    if (policyTier === 'FLEXIBLE_24H') {
      if (hoursUntilStart >= 24) {
        refundRatio = 1.0;
      } else if (hoursUntilStart >= 0) {
        refundRatio = 0.5;
      } else {
        refundRatio = 0;
      }
    } else if (policyTier === 'STRICT_7D') {
      if (hoursUntilStart >= 168) {
        refundRatio = 1.0;
      } else if (hoursUntilStart >= 48) {
        refundRatio = 0.5;
      } else {
        refundRatio = 0;
      }
    } else {
      // STANDARD_48H
      if (hoursUntilStart >= 48) {
        refundRatio = 1.0;
      } else if (hoursUntilStart >= 24) {
        refundRatio = 0.5;
      } else {
        refundRatio = 0;
      }
    }

    const refundAmountCents = Math.round(totalPaid * refundRatio);

    if (refundAmountCents > 0) {
      // Cancellation policy determines the refund amount, but this service has no
      // provider-confirmed refund operation. Never fabricate a provider transaction
      // ID or book a REFUND_PROCESSED ledger entry before the provider confirms it.
      // Persist/dispatch a refund request through a configured provider adapter before
      // transitioning this record to SUCCEEDED in a future provider-backed workflow.
      const refundId = `ref-${booking.id}-${(idempotencyKey || 'cancel').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`;
      booking.refundDetails = {
        refundId,
        bookingId: booking.id,
        amountCents: refundAmountCents,
        currency: booking.paymentDetails?.currency || booking.quote?.currency || 'USD',
        refundedAtUtc: now.toISOString(),
        reason: `Cancellation refund calculated under ${policyTier} policy (${Math.round(refundRatio * 100)}%)`,
        status: 'PENDING',
      };
    }

    booking.status = BookingStatus.CANCELLED;
    delete booking.gateCode;
    delete booking.accessInstructions;
    return booking;
  }

  public checkInBooking(bookingId: string, actorId: string, isAdmin = false): BookingSummary {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new AppError(`Booking '${bookingId}' not found.`, 404, 'NOT_FOUND');
    }

    if (!isAdmin && booking.userId !== actorId && booking.hostId !== actorId) {
      throw new AppError('Access denied. You do not have permission to check in for this reservation.', 403, 'FORBIDDEN');
    }

    if (booking.status === BookingStatus.ACTIVE) {
      return booking;
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError('Cannot check in to a cancelled reservation.', 400, 'INVALID_STATE');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new AppError('Cannot check in to a completed reservation.', 400, 'INVALID_STATE');
    }

    booking.status = BookingStatus.ACTIVE;
    booking.checkedInAtUtc = new Date().toISOString();
    return booking;
  }

  public checkOutBooking(bookingId: string, actorId: string, isAdmin = false): BookingSummary {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new AppError(`Booking '${bookingId}' not found.`, 404, 'NOT_FOUND');
    }

    if (!isAdmin && booking.userId !== actorId && booking.hostId !== actorId) {
      throw new AppError('Access denied. You do not have permission to check out this reservation.', 403, 'FORBIDDEN');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return booking;
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError('Cannot check out a cancelled reservation.', 400, 'INVALID_STATE');
    }
    if (booking.status !== BookingStatus.ACTIVE) {
      throw new AppError('Check-out is only allowed for an active parking session.', 400, 'INVALID_STATE');
    }

    const now = new Date();
    booking.checkedOutAtUtc = now.toISOString();

    // Check for overstay
    const scheduledEnd = new Date(booking.endTimeUtc);
    const diffMinutes = Math.floor((now.getTime() - scheduledEnd.getTime()) / (1000 * 60));

    if (diffMinutes > 15) {
      // Beyond 15-min grace period -> overstay fee charged
      const durationHours = booking.quote?.durationMinutes ? booking.quote.durationMinutes / 60 : 2;
      const hourlyRateCents = Math.round((booking.quote?.baseAmountCents || 2000) / durationHours);
      const overstayFeeCents = Math.round((diffMinutes / 60) * (hourlyRateCents * 1.5));

      booking.overstayDetails = {
        overstayMinutes: diffMinutes,
        overstayFeeCents,
        status: 'CHARGED',
      };
      booking.status = BookingStatus.COMPLETED;
    } else if (diffMinutes > 0) {
      // Within 15-minute grace period
      booking.overstayDetails = {
        overstayMinutes: diffMinutes,
        overstayFeeCents: 0,
        status: 'GRACE_PERIOD',
      };
      booking.status = BookingStatus.COMPLETED;
    } else {
      booking.overstayDetails = {
        overstayMinutes: 0,
        overstayFeeCents: 0,
        status: 'NONE',
      };
      booking.status = BookingStatus.COMPLETED;
    }

    return booking;
  }

  public extendBooking(
    bookingId: string,
    actorId: string,
    additionalMinutes: number,
    paymentIntentId?: string,
    isAdmin = false
  ): BookingSummary {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new AppError(`Booking '${bookingId}' not found.`, 404, 'NOT_FOUND');
    }

    if (!isAdmin && booking.userId !== actorId && booking.hostId !== actorId) {
      throw new AppError('Access denied. You do not have permission to extend this reservation.', 403, 'FORBIDDEN');
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.ACTIVE) {
      throw new AppError(`Cannot extend reservation in status '${booking.status}'.`, 400, 'INVALID_STATE');
    }

    if (additionalMinutes < 30 || additionalMinutes > 1440) {
      throw new AppError('Extension duration must be between 30 minutes and 24 hours.', 400, 'INVALID_DURATION');
    }

    if (additionalMinutes % 30 !== 0) {
      throw new AppError('Extension must be in 30-minute increments.', 400, 'INVALID_INCREMENT');
    }

    const currentEnd = new Date(booking.endTimeUtc);
    const newEnd = new Date(currentEnd.getTime() + additionalMinutes * 60000);

    // Conflict check on the same bay
    for (const b of this.bookings) {
      if (b.bayId === booking.bayId && b.id !== booking.id && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE)) {
        const bStart = new Date(b.startTimeUtc).getTime();
        const bEnd = new Date(b.endTimeUtc).getTime();
        if (currentEnd.getTime() < bEnd && newEnd.getTime() > bStart) {
          throw new AppError(
            'Cannot extend reservation: this bay is reserved by another customer immediately following your current booking.',
            409,
            'EXTENSION_CONFLICT'
          );
        }
      }
    }

    // Calculate extension pricing
    const durationHours = booking.quote?.durationMinutes ? booking.quote.durationMinutes / 60 : 2;
    const hourlyRateCents = Math.round((booking.quote?.baseAmountCents || 2000) / durationHours);
    const additionalBaseCents = Math.round((additionalMinutes / 60) * hourlyRateCents);
    const platformFeeCents = Math.round(additionalBaseCents * BOOKING_CONSTRAINTS.PLATFORM_FEE_RATE);
    const taxesCents = Math.round(additionalBaseCents * BOOKING_CONSTRAINTS.TAX_RATE);
    const totalAdditionalCents = additionalBaseCents + platformFeeCents + taxesCents;

    // Apply updates
    booking.endTimeUtc = newEnd.toISOString();
    if (booking.quote) {
      booking.quote.durationMinutes += additionalMinutes;
      booking.quote.baseAmountCents += additionalBaseCents;
      booking.quote.platformFeeCents += platformFeeCents;
      booking.quote.taxesCents += taxesCents;
      booking.quote.totalPayableCents += totalAdditionalCents;
    }

    if (booking.paymentDetails) {
      booking.paymentDetails.amountCents += totalAdditionalCents;
    }

    booking.extensionHistory = booking.extensionHistory || [];
    booking.extensionHistory.push({
      extendedAtUtc: new Date().toISOString(),
      additionalMinutes,
      additionalAmountCents: totalAdditionalCents,
      newEndTimeUtc: newEnd.toISOString(),
    });

    return booking;
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

    // Overlapping conflict check across active bookings
    for (const b of this.bookings) {
      if (b.bayId === bayId && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE)) {
        const bStart = new Date(b.startTimeUtc).getTime();
        const bEnd = new Date(b.endTimeUtc).getTime();
        if (startTimeUtc.getTime() < bEnd && endTimeUtc.getTime() > bStart) {
          throw new AppError('This parking bay is already booked during the requested time slot.', 409, 'BAY_UNAVAILABLE');
        }
      }
    }

    // Overlapping conflict check across active unexpired holds
    for (const [existingHoldId, existingHold] of this.holds.entries()) {
      if (existingHold.bayId === bayId) {
        if (new Date(existingHold.holdExpiresAtUtc).getTime() > now.getTime()) {
          const hStart = new Date(existingHold.startTimeUtc).getTime();
          const hEnd = new Date(existingHold.endTimeUtc).getTime();
          if (startTimeUtc.getTime() < hEnd && endTimeUtc.getTime() > hStart) {
            throw new AppError('This parking bay is temporarily locked by another reservation hold. Please try again in a few minutes or choose another bay.', 409, 'BAY_HELD');
          }
        } else {
          this.holds.delete(existingHoldId);
        }
      }
    }

    const baseAmountCents = Math.round((location.hourlyRateCents * durationMinutes) / 60);
    const platformFeeCents = Math.round(baseAmountCents * BOOKING_CONSTRAINTS.PLATFORM_FEE_RATE);
    const taxesCents = Math.round(baseAmountCents * BOOKING_CONSTRAINTS.TAX_RATE);
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

    if (new Date(hold.holdExpiresAtUtc).getTime() < Date.now()) {
      this.holds.delete(holdId);
      return null;
    }
    return hold;
  }

  public inspectHold(holdId: string): { hold: BookingHold | null; isExpired: boolean } {
    const hold = this.holds.get(holdId);
    if (!hold) {
      return { hold: null, isExpired: false };
    }
    const isExpired = new Date(hold.holdExpiresAtUtc).getTime() < Date.now();
    if (isExpired) {
      this.holds.delete(holdId);
      return { hold, isExpired: true };
    }
    return { hold, isExpired: false };
  }

  public async confirmBookingFromHold(params: {
    holdId: string;
    paymentIntentId: string;
    idempotencyKey: string;
    licensePlate: string;
    userId: string;
    userName?: string;
    paymentProvider?: string;
  }): Promise<BookingSummary> {
    const { holdId, paymentIntentId, idempotencyKey, licensePlate, userId, userName, paymentProvider } = params;

    // 1. Idempotency Check: if request was already completed with this key, return existing confirmed booking
    const existing = this.idempotencyStore.get(idempotencyKey);
    if (existing) {
      return existing;
    }

    // 1b. Hold-level Idempotency Check: if hold was already confirmed under a different key, return it
    const alreadyConfirmed = this.bookings.find((b) => b.holdId === holdId);
    if (alreadyConfirmed) {
      return alreadyConfirmed;
    }

    // 2. Validate Hold existence and expiration
    const { hold, isExpired } = this.inspectHold(holdId);
    if (!hold || isExpired) {
      throw new AppError(
        'The 10-minute hold reservation has expired or does not exist. Please re-select your preferred parking bay.',
        410,
        'HOLD_EXPIRED'
      );
    }

    // 2b. Validate Hold Ownership: prevent cross-account hold hijacking
    if (hold.userId && hold.userId !== userId) {
      throw new AppError(
        'You do not have permission to confirm a reservation hold created by another user.',
        403,
        'FORBIDDEN'
      );
    }

    // 3. Validate License Plate
    const cleanedPlate = (licensePlate || '').trim().toUpperCase();
    if (!cleanedPlate || cleanedPlate.length < 2 || cleanedPlate.length > 12) {
      throw new AppError('A valid vehicle license plate (2-12 alphanumeric characters) is required.', 400, 'INVALID_LICENSE_PLATE');
    }

    // 4. Validate Location and Bay still exist
    const location = inventoryService.getLocationById(hold.locationId);
    const bay = inventoryService.getBayById(hold.bayId);
    if (!location || !bay) {
      throw new AppError('Referenced parking facility or bay no longer exists in inventory.', 404, 'INVENTORY_NOT_FOUND');
    }

    // 5. Authoritative Payment Verification with active adapter
    const activeProvider = paymentProvider || integrationsService.getActiveGatewayConfig().activeProvider;
    const adapter = PaymentAdapterFactory.getAdapter(activeProvider);
    const paymentStatus = await adapter.getPaymentStatus(paymentIntentId);

    if (paymentStatus.status !== 'SUCCEEDED') {
      throw new AppError(
        `Payment has not been confirmed by payment provider (status: ${paymentStatus.status}). Booking cannot be finalized.`,
        402,
        'PAYMENT_UNVERIFIED'
      );
    }

    // Payment reuse prevention invariant: A payment transaction ID can only be applied once
    const alreadyUsedPayment = this.bookings.find(
      (b) => b.paymentDetails?.transactionId === paymentIntentId
    );
    if (alreadyUsedPayment) {
      throw new AppError(
        'This payment transaction has already been applied to another confirmed reservation.',
        409,
        'PAYMENT_ALREADY_USED'
      );
    }

    // Currency safety invariant: Verify payment currency matches authoritative quote
    if (paymentStatus.currency && paymentStatus.currency.toUpperCase() !== hold.quoteSnapshot.currency.toUpperCase()) {
      throw new AppError(
        `Payment currency (${paymentStatus.currency}) does not match authoritative quote currency (${hold.quoteSnapshot.currency}).`,
        400,
        'PAYMENT_CURRENCY_MISMATCH'
      );
    }

    // Amount safety invariant: Verify payment amount matches authoritative quote
    if (paymentStatus.amountCents !== hold.quoteSnapshot.totalPayableCents) {
      throw new AppError(
        `Payment amount (${paymentStatus.amountCents} cents) does not match authoritative quote total (${hold.quoteSnapshot.totalPayableCents} cents).`,
        400,
        'PAYMENT_AMOUNT_MISMATCH'
      );
    }

    // 6. Double-booking check across confirmed bookings
    for (const b of this.bookings) {
      if (b.bayId === hold.bayId && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE)) {
        const bStart = new Date(b.startTimeUtc).getTime();
        const bEnd = new Date(b.endTimeUtc).getTime();
        const reqStart = new Date(hold.startTimeUtc).getTime();
        const reqEnd = new Date(hold.endTimeUtc).getTime();
        if (reqStart < bEnd && reqEnd > bStart) {
          throw new AppError('This bay was simultaneously confirmed by another reservation.', 409, 'BAY_UNAVAILABLE');
        }
      }
    }

    // 7. Generate Confirmed Booking Record
    const bookingId = 'bk-2026-' + Math.floor(1000 + Math.random() * 9000);
    const gateCode = location.accessMethod === AccessMethod.GATE_CODE
      ? `PIN-${Math.floor(1000 + Math.random() * 9000)}`
      : `PASS-${Math.floor(1000 + Math.random() * 9000)}`;

    const confirmedBooking: BookingSummary = {
      id: bookingId,
      holdId: hold.holdId,
      bayId: hold.bayId,
      bayNumber: bay.bayNumber,
      locationId: hold.locationId,
      locationName: location.name,
      locationAddress: `${location.address.line1}, ${location.address.city}, ${location.address.state} ${location.address.postalCode}`,
      locationTimezone: location.timezone,
      userId,
      userName: userName || 'Customer Driver',
      hostId: location.hostId,
      startTimeUtc: hold.startTimeUtc,
      endTimeUtc: hold.endTimeUtc,
      status: BookingStatus.CONFIRMED,
      quote: hold.quoteSnapshot,
      licensePlate: cleanedPlate,
      accessInstructions: location.accessInstructions || 'Drive to entry gate and present digital pass.',
      gateCode,
      paymentDetails: {
        transactionId: paymentIntentId,
        provider: paymentStatus.provider || activeProvider,
        amountCents: hold.quoteSnapshot.totalPayableCents,
        currency: hold.quoteSnapshot.currency,
        paidAtUtc: new Date().toISOString(),
      },
      createdAtUtc: new Date().toISOString(),
    };

    // 8. Balanced Double-Entry Ledger Posting
    const providerEnum = activeProvider.toUpperCase() === 'STRIPE'
      ? PaymentProvider.STRIPE
      : activeProvider.toUpperCase() === 'RAZORPAY'
      ? PaymentProvider.RAZORPAY
      : PaymentProvider.INTERNAL_MOCK;

    // Entry 1: Total fee collected (Customer Payable -> Platform Commission Revenue)
    ledgerService.appendEntry({
      bookingId,
      entryType: LedgerEntryType.PARKING_FEE_COLLECTED,
      debitAccount: LedgerAccountType.CUSTOMER_PAYABLE,
      creditAccount: LedgerAccountType.PLATFORM_COMMISSION_REVENUE,
      amountCents: hold.quoteSnapshot.totalPayableCents,
      currency: hold.quoteSnapshot.currency,
      paymentProvider: providerEnum,
      providerTransactionId: paymentIntentId,
      description: `Authoritative booking fee collection via ${activeProvider}`,
      idempotencyKey: `${idempotencyKey}-fee-collected`,
    });

    // Entry 2: Segregated Escrow Deposit Allocation (Platform Commission Revenue -> Security Deposit Escrow)
    if (hold.quoteSnapshot.securityDepositCents > 0) {
      ledgerService.appendEntry({
        bookingId,
        entryType: LedgerEntryType.DEPOSIT_HELD,
        debitAccount: LedgerAccountType.PLATFORM_COMMISSION_REVENUE,
        creditAccount: LedgerAccountType.SECURITY_DEPOSIT_ESCROW,
        amountCents: hold.quoteSnapshot.securityDepositCents,
        currency: hold.quoteSnapshot.currency,
        paymentProvider: providerEnum,
        providerTransactionId: paymentIntentId,
        description: `Segregated security deposit escrow allocation for ${bookingId}`,
        idempotencyKey: `${idempotencyKey}-deposit-escrow`,
      });
    }

    // Entry 3: Host net revenue share accrual (Platform Commission Revenue -> Host Payable)
    const hostEarningsCents = Math.round(
      hold.quoteSnapshot.baseAmountCents * BOOKING_CONSTRAINTS.HOST_REVENUE_SHARE_RATE
    );
    if (hostEarningsCents > 0) {
      ledgerService.appendEntry({
        bookingId,
        entryType: LedgerEntryType.HOST_EARNING_ACCRUED,
        debitAccount: LedgerAccountType.PLATFORM_COMMISSION_REVENUE,
        creditAccount: LedgerAccountType.HOST_PAYABLE,
        amountCents: hostEarningsCents,
        currency: hold.quoteSnapshot.currency,
        paymentProvider: providerEnum,
        providerTransactionId: paymentIntentId,
        description: `Host 85% revenue share accrued for ${bookingId}`,
        idempotencyKey: `${idempotencyKey}-host-accrual`,
      });
    }

    // 9. Persist booking and clean up hold
    this.bookings.unshift(confirmedBooking);
    this.idempotencyStore.set(idempotencyKey, confirmedBooking);
    this.holds.delete(holdId);

    return confirmedBooking;
  }
}

export const bookingService = new BookingService();
