import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  ForbiddenException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import crypto from 'crypto';
import { DatabaseService } from '../../database/database.service.js';
import { FacilitiesService } from '../facilities/facilities.service.js';
import {
  Booking,
  BookingDetailsResponse,
  ReservationHold,
  PricingCalculationResult,
  CreateBookingPayload,
  TaxInvoiceReceipt,
} from '@parkeazy/shared-types';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private sandboxBookings: Map<string, Booking> = new Map();
  private sandboxHolds: Map<string, ReservationHold> = new Map();

  private readonly TURNAROUND_BUFFER_MS = 15 * 60 * 1000; // 15-minute inter-booking turnaround buffer
  private readonly HOLD_TTL_MS = 10 * 60 * 1000; // 10-minute ephemeral hold lease
  private sandboxSupportTickets: Map<string, any> = new Map();
  private sandboxLifecycleEvents: any[] = [];

  constructor(
    @Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService,
    @Optional() @Inject(DatabaseService) private readonly databaseService?: DatabaseService
  ) {
    if (process.env.NODE_ENV !== 'production' && process.env.PARKEAZY_DEMO_MODE === 'true') this.seedSandboxBookings();
  }

  private cleanExpiredHolds() {
    const now = Date.now();
    for (const [id, hold] of this.sandboxHolds.entries()) {
      if (!hold.isReleased && new Date(hold.expiresAt).getTime() < now) {
        hold.isReleased = true;
      }
    }
  }

  private logLifecycleEvent(bookingId: string, eventType: string, actorId?: string, actorRole = 'customer', metadata: any = {}) {
    const event = {
      id: crypto.randomUUID(),
      bookingId,
      eventType,
      actorId,
      actorRole,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.sandboxLifecycleEvents.push(event);
    this.logger.log(`[Lifecycle Event] Booking ${bookingId}: ${eventType}`);
  }

  private isDbAvailable(): boolean {
    return Boolean(this.databaseService?.getPool() && this.databaseService.getHealthStatus().connected);
  }

  private requirePersistentStore(): never {
    throw new ServiceUnavailableException('Booking operations require an available PostgreSQL database. Retry when database readiness is restored.');
  }

  private mapDbBooking(row: any): Booking {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      bookingReference: row.booking_reference,
      spaceId: row.space_id,
      facilityId: row.facility_id,
      customerId: row.customer_id,
      vehiclePlate: row.vehicle_plate,
      vehicleCategory: row.vehicle_category,
      startsAt: new Date(row.starts_at).toISOString(),
      endsAt: new Date(row.ends_at).toISOString(),
      ...(row.actual_check_in_at ? { actualCheckInAt: new Date(row.actual_check_in_at).toISOString() } : {}),
      ...(row.actual_check_out_at ? { actualCheckOutAt: new Date(row.actual_check_out_at).toISOString() } : {}),
      pricing: {
        baseAmountInr: Number(row.base_amount_inr),
        platformFeeInr: Number(row.platform_fee_inr),
        taxInr: Number(row.tax_inr),
        totalAmountInr: Number(row.total_amount_inr),
      },
      status: row.status,
      qrAccessToken: row.qr_access_token,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    } as Booking;
  }

  private async findDbBooking(id: string): Promise<Booking | null> {
    if (!this.isDbAvailable()) return null;
    const rows = await this.databaseService!.query('SELECT * FROM bookings WHERE id = $1 LIMIT 1', [id]);
    return rows[0] ? this.mapDbBooking(rows[0]) : null;
  }

  private async recordDbLifecycle(client: any, booking: Booking, eventType: string, actorId: string, actorRole = 'customer', metadata: Record<string, unknown> = {}) {
    await client.query(
      `INSERT INTO booking_lifecycle_events (booking_id, tenant_id, event_type, actor_id, actor_role, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [booking.id, booking.tenantId, eventType, actorId, actorRole, JSON.stringify(metadata)]
    );
  }

  private validateBookingWindow(startsAt: string, endsAt: string): { start: number; end: number; hours: number } {
    const start = Date.parse(startsAt);
    const end = Date.parse(endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new BadRequestException('Invalid booking time window: provide valid ISO timestamps and endsAt must be after startsAt.');
    }
    const duration = end - start;
    if (duration < 60 * 60 * 1000 || duration > 72 * 60 * 60 * 1000 || duration % (30 * 60 * 1000) !== 0) {
      throw new BadRequestException('Booking duration must be between 1 and 72 hours in 30-minute increments.');
    }
    if (start < Date.now() + 15 * 60 * 1000) {
      throw new BadRequestException('Bookings must start at least 15 minutes in the future.');
    }
    if (start > Date.now() + 30 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Bookings can be made up to 30 days in advance.');
    }
    return { start, end, hours: duration / (60 * 60 * 1000) };
  }

  private seedSandboxBookings() {
    const now = Date.now();
    const activeBooking: Booking = {
      id: 'b0000001-0000-4000-8000-000000000001',
      tenantId: 'default',
      bookingReference: '#PKZ-2026-9481',
      spaceId: '10000000-0000-4000-b000-000000000104-01',
      facilityId: '10000000-0000-4000-b000-000000000104',
      customerId: '00000000-0000-4000-a000-000000000003',
      vehiclePlate: 'TN-09-CB-4821',
      vehicleCategory: 'car',
      startsAt: new Date(now - 45 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 75 * 60 * 1000).toISOString(),
      actualCheckInAt: new Date(now - 40 * 60 * 1000).toISOString(),
      pricing: {
        baseAmountInr: 80,
        platformFeeInr: 12,
        taxInr: 16.56,
        totalAmountInr: 108.56,
      },
      status: 'active',
      qrAccessToken: 'qr-pkz-9481-active',
      createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 40 * 60 * 1000).toISOString(),
    };

    const confirmedBooking: Booking = {
      id: 'b0000002-0000-4000-8000-000000000002',
      tenantId: 'default',
      bookingReference: '#PKZ-2026-8820',
      spaceId: '10000000-0000-4000-b000-000000000208-04',
      facilityId: '10000000-0000-4000-b000-000000000208',
      customerId: '00000000-0000-4000-a000-000000000003',
      vehiclePlate: 'TN-09-CB-4821',
      vehicleCategory: 'car',
      startsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 28 * 60 * 60 * 1000).toISOString(),
      pricing: {
        baseAmountInr: 200,
        platformFeeInr: 30,
        taxInr: 41.4,
        totalAmountInr: 271.4,
      },
      status: 'confirmed',
      qrAccessToken: 'qr-pkz-8820-upcoming',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    };

    const completedBooking: Booking = {
      id: 'b0000003-0000-4000-8000-000000000003',
      tenantId: 'default',
      bookingReference: '#PKZ-2026-7102',
      spaceId: '10000000-0000-4000-b000-000000000104-02',
      facilityId: '10000000-0000-4000-b000-000000000104',
      customerId: '00000000-0000-4000-a000-000000000003',
      vehiclePlate: 'TN-09-CB-4821',
      vehicleCategory: 'car',
      startsAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now - 46 * 60 * 60 * 1000).toISOString(),
      actualCheckInAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
      actualCheckOutAt: new Date(now - 46 * 60 * 60 * 1000).toISOString(),
      pricing: {
        baseAmountInr: 80,
        platformFeeInr: 12,
        taxInr: 16.56,
        totalAmountInr: 108.56,
      },
      status: 'completed',
      qrAccessToken: 'qr-pkz-7102-completed',
      createdAt: new Date(now - 50 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 46 * 60 * 60 * 1000).toISOString(),
    };

    this.sandboxBookings.set(activeBooking.id, activeBooking);
    this.sandboxBookings.set(confirmedBooking.id, confirmedBooking);
    this.sandboxBookings.set(completedBooking.id, completedBooking);
  }

  public async calculatePricing(
    spaceId: string,
    startsAt: string,
    endsAt: string
  ): Promise<PricingCalculationResult> {
    const space = await this.facilitiesService.getSpace(spaceId);
    if (!space) {
      throw new NotFoundException(`Parking space ${spaceId} not found`);
    }

    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      throw new BadRequestException('Invalid booking time window: endsAt must be after startsAt');
    }

    const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
    const hourlyRateInr = Number(space.hourlyRateInr) || 40;
    const baseAmountInr = hourlyRateInr * durationHours;
    const platformFeeInr = Math.round(baseAmountInr * 0.15 * 100) / 100; // 15% platform commission
    const taxInr = Math.round((baseAmountInr + platformFeeInr) * 0.18 * 100) / 100; // 18% GST
    const totalAmountInr = Math.round((baseAmountInr + platformFeeInr + taxInr) * 100) / 100;

    return {
      spaceId,
      facilityId: space.facilityId,
      hourlyRateInr,
      durationHours,
      baseAmountInr,
      platformFeeInr,
      taxInr,
      totalAmountInr,
      startsAt,
      endsAt,
    };
  }

  public async holdSpace(
    userId: string,
    spaceId: string,
    startsAt: string,
    endsAt: string
  ): Promise<ReservationHold> {
    this.cleanExpiredHolds();
    const window = this.validateBookingWindow(startsAt, endsAt);
    const space = await this.facilitiesService.getSpace(spaceId);
    if (!space) {
      throw new NotFoundException(`Parking space ${spaceId} not found`);
    }

    const reqStart = window.start;
    const reqEnd = window.end;

    if (this.isDbAvailable()) {
      try {
        return await this.databaseService!.transaction(async (client) => {
          // Serialize all inventory mutations for a space across API instances.
          const spaceRows = await client.query('SELECT id, facility_id, tenant_id FROM parking_spaces WHERE id = $1 AND is_active = TRUE FOR UPDATE', [spaceId]);
          if (!spaceRows.rows[0]) throw new NotFoundException(`Active parking space ${spaceId} not found`);
          const userRows = await client.query("SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND status = 'active'", [userId, spaceRows.rows[0].tenant_id]);
          if (!userRows.rows[0]) throw new ForbiddenException('Customer account is not active in the parking space tenant.');
          await client.query(`UPDATE reservation_holds SET is_released = TRUE WHERE space_id = $1 AND is_released = FALSE AND expires_at <= NOW()`, [spaceId]);
          const conflicts = await client.query(
            `SELECT id FROM bookings WHERE space_id = $1 AND status IN ('confirmed','active')
             AND starts_at < ($3::timestamptz + interval '15 minutes')
             AND ends_at + interval '15 minutes' > $2::timestamptz
             UNION ALL
             SELECT id FROM reservation_holds WHERE space_id = $1 AND is_released = FALSE AND expires_at > NOW()
             AND starts_at < ($3::timestamptz + interval '15 minutes')
             AND ends_at + interval '15 minutes' > $2::timestamptz LIMIT 1`,
            [spaceId, startsAt, endsAt]
          );
          if (conflicts.rows.length) throw new ConflictException('Selected parking space is already booked or held during this time window.');
          const rows = await client.query(
            `INSERT INTO reservation_holds (space_id, user_id, starts_at, ends_at, expires_at, is_released)
             VALUES ($1,$2,$3,$4,NOW() + interval '10 minutes',FALSE)
             RETURNING id, space_id, user_id, starts_at, ends_at, expires_at, is_released, created_at`,
            [spaceId, userId, startsAt, endsAt]
          );
          const r = rows.rows[0];
          return { id: r.id, spaceId: r.space_id, userId: r.user_id, startsAt: new Date(r.starts_at).toISOString(), endsAt: new Date(r.ends_at).toISOString(), expiresAt: new Date(r.expires_at).toISOString(), isReleased: r.is_released, createdAt: new Date(r.created_at).toISOString() } as ReservationHold;
        });
      } catch (error) { throw error; }
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();

    // Check availability against existing bookings with turnaround buffer
    const isBookingConflict = Array.from(this.sandboxBookings.values()).some((b) => {
      if (b.spaceId !== spaceId || b.status === 'cancelled') return false;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      return reqStart < (bEnd + this.TURNAROUND_BUFFER_MS) && (reqEnd + this.TURNAROUND_BUFFER_MS) > bStart;
    });

    // Check unexpired holds by other users with turnaround buffer
    const isHoldConflict = Array.from(this.sandboxHolds.values()).some((h) => {
      if (h.spaceId !== spaceId || h.isReleased) return false;
      if (new Date(h.expiresAt).getTime() < Date.now()) return false;
      
      const hStart = new Date(h.startsAt).getTime();
      const hEnd = new Date(h.endsAt).getTime();
      return reqStart < (hEnd + this.TURNAROUND_BUFFER_MS) && (reqEnd + this.TURNAROUND_BUFFER_MS) > hStart;
    });

    if (isBookingConflict || isHoldConflict) {
      throw new ConflictException('Selected parking space is already booked or held during this time window.');
    }

    const now = Date.now();
    const hold: ReservationHold = {
      id: crypto.randomUUID(),
      spaceId,
      userId,
      startsAt,
      endsAt,
      expiresAt: new Date(now + this.HOLD_TTL_MS).toISOString(), // 10 minute lease
      isReleased: false,
      createdAt: new Date(now).toISOString(),
    };

    this.sandboxHolds.set(hold.id, hold);
    return hold;
  }

  public async renewHold(holdId: string, userId?: string): Promise<ReservationHold> {
    this.cleanExpiredHolds();
    if (!userId) throw new ForbiddenException('Authenticated user is required to renew a hold.');
    if (this.isDbAvailable()) {
      const rows = await this.databaseService!.query(
        `UPDATE reservation_holds SET expires_at = NOW() + interval '10 minutes'
         WHERE id = $1 AND user_id = $2 AND is_released = FALSE AND expires_at > NOW()
         RETURNING id, space_id, user_id, starts_at, ends_at, expires_at, is_released, created_at`, [holdId, userId]
      );
      if (!rows[0]) throw new NotFoundException('Active hold not found for this customer. It may have expired or been released.');
      const r = rows[0];
      return { id: r.id, spaceId: r.space_id, userId: r.user_id, startsAt: new Date(r.starts_at).toISOString(), endsAt: new Date(r.ends_at).toISOString(), expiresAt: new Date(r.expires_at).toISOString(), isReleased: r.is_released, createdAt: new Date(r.created_at).toISOString() } as ReservationHold;
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const hold = this.sandboxHolds.get(holdId);
    if (hold && hold.userId !== userId) throw new ForbiddenException('You cannot renew another customer’s hold.');
    if (!hold || hold.isReleased || new Date(hold.expiresAt).getTime() <= Date.now()) {
      throw new NotFoundException(`Active hold ${holdId} not found. Expired or released holds cannot be renewed.`);
    }
    const now = Date.now();
    hold.expiresAt = new Date(now + this.HOLD_TTL_MS).toISOString();
    hold.isReleased = false;
    this.sandboxHolds.set(holdId, hold);
    return hold;
  }

  public async releaseHold(holdId: string, userId?: string): Promise<{ released: boolean }> {
    if (this.isDbAvailable()) {
      const rows = await this.databaseService!.query(`UPDATE reservation_holds SET is_released = TRUE WHERE id = $1 AND ($2::uuid IS NULL OR user_id = $2) RETURNING id`, [holdId, userId || null]);
      if (!rows.length) throw new NotFoundException('Hold not found or not owned by this customer.');
      return { released: true };
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const hold = this.sandboxHolds.get(holdId);
    if (hold && userId && hold.userId !== userId) throw new ForbiddenException('You cannot release another customer’s hold.');
    if (hold) {
      hold.isReleased = true;
      this.sandboxHolds.set(holdId, hold);
    }
    return { released: true };
  }

  public async createBooking(
    userId: string,
    tenantId: string,
    payload: CreateBookingPayload
  ): Promise<Booking> {
    if (process.env.NODE_ENV === 'production' && process.env.PARKEAZY_ALLOW_UNPAID_BOOKING_CONFIRMATION !== 'true') {
      throw new ServiceUnavailableException('Booking confirmation is disabled until Part 08 payment-provider verification is configured. No booking was confirmed or payment claimed.');
    }
    this.cleanExpiredHolds();
    const window = this.validateBookingWindow(payload.startsAt, payload.endsAt);
    const pricing = await this.calculatePricing(payload.spaceId, payload.startsAt, payload.endsAt);

    if (this.isDbAvailable()) {
      const now = new Date().toISOString();
      const reference = `#PKZ-${new Date().getUTCFullYear()}-${crypto.randomInt(1000, 10000)}`;
      const qrToken = crypto.randomBytes(32).toString('base64url');
      return await this.databaseService!.transaction(async (client) => {
        const spaces = await client.query('SELECT id, facility_id, tenant_id, vehicle_category FROM parking_spaces WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE FOR UPDATE', [payload.spaceId, tenantId || 'default']);
        const userRows = await client.query("SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND status = 'active'", [userId, tenantId || 'default']);
        if (!userRows.rows[0]) throw new ForbiddenException('Customer account is not active in the selected tenant.');
        const space = spaces.rows[0];
        if (!space) throw new NotFoundException(`Active parking space ${payload.spaceId} not found`);
        if (space.vehicle_category !== payload.vehicleCategory) throw new BadRequestException('Selected space is not compatible with this vehicle category.');
        if (payload.holdId) {
          const holds = await client.query(`SELECT * FROM reservation_holds WHERE id = $1 AND user_id = $2 AND space_id = $3 AND is_released = FALSE AND expires_at > NOW() AND starts_at = $4 AND ends_at = $5 FOR UPDATE`, [payload.holdId, userId, payload.spaceId, payload.startsAt, payload.endsAt]);
          if (!holds.rows[0]) throw new ConflictException('Your reservation hold is invalid, expired, or does not match this booking. Please select the space again.');
        }
        await client.query(`UPDATE reservation_holds SET is_released = TRUE WHERE space_id = $1 AND is_released = FALSE AND expires_at <= NOW()`, [payload.spaceId]);
        const conflicts = await client.query(
          `SELECT id FROM bookings WHERE space_id = $1 AND status IN ('confirmed','active')
           AND starts_at < ($3::timestamptz + interval '15 minutes') AND ends_at + interval '15 minutes' > $2::timestamptz
           UNION ALL SELECT id FROM reservation_holds WHERE space_id = $1 AND is_released = FALSE AND expires_at > NOW()
           AND id <> COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
           AND starts_at < ($3::timestamptz + interval '15 minutes') AND ends_at + interval '15 minutes' > $2::timestamptz LIMIT 1`,
          [payload.spaceId, payload.startsAt, payload.endsAt, payload.holdId || null]
        );
        if (conflicts.rows.length) throw new ConflictException('Space was reserved by another customer. Please choose an alternative space.');
        const rows = await client.query(
          `INSERT INTO bookings (tenant_id, booking_reference, space_id, facility_id, customer_id, vehicle_plate, vehicle_category, starts_at, ends_at, base_amount_inr, platform_fee_inr, tax_inr, total_amount_inr, status, qr_access_token, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'confirmed',$14,$15,$15) RETURNING *`,
          [tenantId || space.tenant_id, reference, payload.spaceId, space.facility_id, userId, payload.vehiclePlate.toUpperCase().trim(), payload.vehicleCategory, payload.startsAt, payload.endsAt, pricing.baseAmountInr, pricing.platformFeeInr, pricing.taxInr, pricing.totalAmountInr, qrToken, now]
        );
        const booking = this.mapDbBooking(rows.rows[0]);
        if (payload.holdId) await client.query('UPDATE reservation_holds SET is_released = TRUE WHERE id = $1 AND user_id = $2', [payload.holdId, userId]);
        await this.recordDbLifecycle(client, booking, 'BOOKING_CONFIRMED', userId, 'customer', { reference });
        return booking;
      });
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();

    const reqStart = window.start;
    const reqEnd = new Date(payload.endsAt).getTime();

    // Validate that a supplied hold belongs to this user and exactly matches the requested inventory window.
    if (payload.holdId) {
      const hold = this.sandboxHolds.get(payload.holdId);
      if (!hold || hold.userId !== userId || hold.spaceId !== payload.spaceId || hold.startsAt !== payload.startsAt || hold.endsAt !== payload.endsAt || hold.isReleased || new Date(hold.expiresAt).getTime() <= Date.now()) {
        throw new ConflictException('Your reservation hold is invalid, expired, or does not match this booking. Please select the space again.');
      }
    }
    const isBookingConflict = Array.from(this.sandboxBookings.values()).some((b) => {
      if (b.spaceId !== payload.spaceId || b.status === 'cancelled' || b.status === 'expired') return false;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      return reqStart < (bEnd + this.TURNAROUND_BUFFER_MS) && (reqEnd + this.TURNAROUND_BUFFER_MS) > bStart;
    });
    const isHoldConflict = Array.from(this.sandboxHolds.values()).some((h) => {
      if (h.spaceId !== payload.spaceId || h.isReleased || new Date(h.expiresAt).getTime() <= Date.now()) return false;
      if (payload.holdId && h.id === payload.holdId && h.userId === userId) return false;
      const hStart = new Date(h.startsAt).getTime();
      const hEnd = new Date(h.endsAt).getTime();
      return reqStart < (hEnd + this.TURNAROUND_BUFFER_MS) && (reqEnd + this.TURNAROUND_BUFFER_MS) > hStart;
    });

    if (isBookingConflict || isHoldConflict) {
      throw new ConflictException('Space was reserved by another customer. Please choose an alternative space.');
    }

    const now = new Date().toISOString();
    const reference = `#PKZ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrToken = `qr-${crypto.randomUUID().slice(0, 12)}`;

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      tenantId: tenantId || 'default',
      bookingReference: reference,
      spaceId: payload.spaceId,
      facilityId: payload.facilityId || pricing.facilityId,
      customerId: userId,
      vehiclePlate: payload.vehiclePlate.toUpperCase().trim(),
      vehicleCategory: payload.vehicleCategory,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      pricing: {
        baseAmountInr: pricing.baseAmountInr,
        platformFeeInr: pricing.platformFeeInr,
        taxInr: pricing.taxInr,
        totalAmountInr: pricing.totalAmountInr,
      },
      status: 'confirmed',
      qrAccessToken: qrToken,
      createdAt: now,
      updatedAt: now,
    };

    // If hold existed, release it
    if (payload.holdId && this.sandboxHolds.has(payload.holdId)) {
      this.sandboxHolds.get(payload.holdId)!.isReleased = true;
    }

    this.sandboxBookings.set(newBooking.id, newBooking);
    this.logLifecycleEvent(newBooking.id, 'BOOKING_CONFIRMED', userId, 'customer', { reference });
    return newBooking;
  }

  public async getMyBookings(userId: string, tenantId?: string): Promise<BookingDetailsResponse[]> {
    if (this.isDbAvailable()) {
      const rows = tenantId
        ? await this.databaseService!.query('SELECT * FROM bookings WHERE customer_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId])
        : await this.databaseService!.query('SELECT * FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC', [userId]);
      return Promise.all(rows.map((r) => this.enrichBooking(this.mapDbBooking(r))));
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const list = Array.from(this.sandboxBookings.values())
      .filter((b) => b.customerId === userId && (!tenantId || b.tenantId === tenantId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Promise.all(list.map((b) => this.enrichBooking(b)));
  }

  public async getBookingById(id: string): Promise<BookingDetailsResponse> {
    if (this.isDbAvailable()) {
      const booking = await this.findDbBooking(id);
      if (!booking) throw new NotFoundException(`Booking ${id} not found`);
      return this.enrichBooking(booking);
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return this.enrichBooking(booking);
  }

  public async checkIn(id: string, actorId?: string): Promise<Booking> {
    if (this.isDbAvailable()) {
      return this.databaseService!.transaction(async (client) => {
        const rows = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (!rows.rows[0]) throw new NotFoundException(`Booking ${id} not found`);
        const booking = this.mapDbBooking(rows.rows[0]);
        if (actorId && booking.customerId !== actorId) throw new ForbiddenException('You may only check in your own booking.');
        if (booking.status !== 'confirmed') throw new BadRequestException(`Cannot check in booking with status '${booking.status}'`);
        const updated = await client.query(`UPDATE bookings SET status = 'active', actual_check_in_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
        const result = this.mapDbBooking(updated.rows[0]);
        await this.recordDbLifecycle(client, result, 'CHECKED_IN', actorId || booking.customerId);
        return result;
      });
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(`Cannot check in booking with status '${booking.status}'`);
    }

    booking.status = 'active';
    booking.actualCheckInAt = new Date().toISOString();
    booking.updatedAt = new Date().toISOString();
    this.sandboxBookings.set(id, booking);
    return booking;
  }

  public async checkOut(id: string, actorId?: string): Promise<Booking> {
    if (this.isDbAvailable()) {
      return this.databaseService!.transaction(async (client) => {
        const rows = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (!rows.rows[0]) throw new NotFoundException(`Booking ${id} not found`);
        const booking = this.mapDbBooking(rows.rows[0]);
        if (actorId && booking.customerId !== actorId) throw new ForbiddenException('You may only check out your own booking.');
        if (booking.status !== 'active') throw new BadRequestException(`Cannot check out booking with status '${booking.status}'`);
        const updated = await client.query(`UPDATE bookings SET status = 'completed', actual_check_out_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
        const result = this.mapDbBooking(updated.rows[0]);
        await this.recordDbLifecycle(client, result, 'CHECKED_OUT', actorId || booking.customerId);
        return result;
      });
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status !== 'active') {
      throw new BadRequestException(`Cannot check out booking with status '${booking.status}'`);
    }

    booking.status = 'completed';
    booking.actualCheckOutAt = new Date().toISOString();
    booking.updatedAt = new Date().toISOString();
    this.sandboxBookings.set(id, booking);
    return booking;
  }

  public async extendBooking(id: string, additionalHours = 1, actorId?: string): Promise<Booking> {
    if (!Number.isFinite(additionalHours) || additionalHours <= 0 || additionalHours > 72 || additionalHours * 2 % 1 !== 0) throw new BadRequestException('Extension must be a positive duration in 30-minute increments, up to 72 hours.');
    if (this.isDbAvailable()) {
      return this.databaseService!.transaction(async (client) => {
        const rows = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (!rows.rows[0]) throw new NotFoundException(`Booking ${id} not found`);
        const booking = this.mapDbBooking(rows.rows[0]);
        if (actorId && booking.customerId !== actorId) throw new ForbiddenException('You may only extend your own booking.');
        if (booking.status !== 'confirmed' && booking.status !== 'active') throw new BadRequestException(`Cannot extend booking with status '${booking.status}'`);
        const oldEnd = new Date(booking.endsAt);
        const newEnd = new Date(oldEnd.getTime() + additionalHours * 3600000);
        const spaceRows = await client.query('SELECT hourly_rate_inr FROM parking_spaces WHERE id = $1 FOR UPDATE', [booking.spaceId]);
        const rate = Number(spaceRows.rows[0]?.hourly_rate_inr);
        if (!Number.isFinite(rate) || rate <= 0) throw new BadRequestException('Space pricing is not configured.');
        const conflicts = await client.query(`SELECT id FROM bookings WHERE space_id = $1 AND id <> $2 AND status IN ('confirmed','active') AND starts_at < ($3::timestamptz + interval '15 minutes') AND ends_at + interval '15 minutes' > $4::timestamptz LIMIT 1`, [booking.spaceId, id, newEnd.toISOString(), booking.endsAt]);
        if (conflicts.rows.length) throw new ConflictException('Cannot extend: another confirmed booking conflicts with the requested extension.');
        const base = Math.round(rate * additionalHours * 100) / 100;
        const fee = Math.round(base * 0.15 * 100) / 100;
        const tax = Math.round((base + fee) * 0.18 * 100) / 100;
        const total = Math.round((base + fee + tax) * 100) / 100;
        const updatedRows = await client.query(`UPDATE bookings SET ends_at = $2, base_amount_inr = base_amount_inr + $3, platform_fee_inr = platform_fee_inr + $4, tax_inr = tax_inr + $5, total_amount_inr = total_amount_inr + $6, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, newEnd.toISOString(), base, fee, tax, total]);
        const result = this.mapDbBooking(updatedRows.rows[0]);
        await client.query(`INSERT INTO booking_extensions (booking_id, tenant_id, previous_ends_at, new_ends_at, additional_hours, additional_amount_inr, status) VALUES ($1,$2,$3,$4,$5,$6,'approved')`, [id, booking.tenantId, booking.endsAt, newEnd.toISOString(), additionalHours, total]);
        await this.recordDbLifecycle(client, result, 'BOOKING_EXTENDED', actorId || booking.customerId, 'customer', { additionalHours, newEnd: newEnd.toISOString(), additionalAmountInr: total });
        return result;
      });
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status !== 'confirmed' && booking.status !== 'active') {
      throw new BadRequestException(`Cannot extend booking with status '${booking.status}'`);
    }

    const currentEnd = new Date(booking.endsAt).getTime();
    const newEndMs = currentEnd + additionalHours * 60 * 60 * 1000;
    const newEnd = new Date(newEndMs).toISOString();

    // Downstream concurrency collision check: ensure no adjacent confirmed booking starts within requested extension
    const isExtensionConflict = Array.from(this.sandboxBookings.values()).some((b) => {
      if (b.id === id || b.spaceId !== booking.spaceId || b.status === 'cancelled') return false;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      return bStart < (newEndMs + this.TURNAROUND_BUFFER_MS) && (bEnd + this.TURNAROUND_BUFFER_MS) > currentEnd;
    });

    if (isExtensionConflict) {
      throw new ConflictException('Cannot extend session: The parking space has an upcoming confirmed reservation during this window.');
    }

    const addBase = 40 * additionalHours;
    const addFee = Math.round(addBase * 0.15 * 100) / 100;
    const addTax = Math.round((addBase + addFee) * 0.18 * 100) / 100;
    const addTotal = Math.round((addBase + addFee + addTax) * 100) / 100;

    booking.endsAt = newEnd;
    booking.pricing.baseAmountInr += addBase;
    booking.pricing.platformFeeInr += addFee;
    booking.pricing.taxInr += addTax;
    booking.pricing.totalAmountInr += addTotal;
    booking.updatedAt = new Date().toISOString();

    this.sandboxBookings.set(id, booking);
    this.logLifecycleEvent(id, 'BOOKING_EXTENDED', booking.customerId, 'customer', { additionalHours, newEnd });
    return booking;
  }

  public async previewCancelBooking(id: string): Promise<any> {
    const persisted = this.isDbAvailable() ? await this.findDbBooking(id) : null;
    if (process.env.NODE_ENV === 'production' && !this.isDbAvailable()) this.requirePersistentStore();
    const booking = persisted || this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    const now = Date.now();
    const startsAtMs = new Date(booking.startsAt).getTime();
    const hoursUntilStart = Math.max(0, (startsAtMs - now) / (1000 * 60 * 60));
    let refundPercentage = 0;
    let policyTier: 'full_refund' | 'partial_refund' | 'no_refund' = 'no_refund';
    let policyNotes = '';

    if (hoursUntilStart >= 2) {
      refundPercentage = 100;
      policyTier = 'full_refund';
      policyNotes = 'Cancellation > 2 hours prior to arrival: Full 100% refund processed via original payment channel.';
    } else if (hoursUntilStart > 0) {
      refundPercentage = 80;
      policyTier = 'partial_refund';
      policyNotes = 'Cancellation < 2 hours prior to arrival: 80% refund processed (20% retained as host compensation).';
    } else {
      refundPercentage = 0;
      policyTier = 'no_refund';
      policyNotes = 'Session has already commenced or passed scheduled start time. Non-refundable.';
    }

    const totalPaidInr = booking.pricing.totalAmountInr;
    const eligibleRefundInr = Math.round(totalPaidInr * (refundPercentage / 100) * 100) / 100;
    const deductionAmountInr = Math.round((totalPaidInr - eligibleRefundInr) * 100) / 100;

    return {
      bookingId: id,
      totalPaidInr,
      eligibleRefundInr,
      refundPercentage,
      deductionAmountInr,
      policyTier,
      hoursUntilStart: Math.round(hoursUntilStart * 10) / 10,
      policyNotes,
    };
  }

  public async getOverstayDetails(id: string): Promise<any> {
    const persisted = this.isDbAvailable() ? await this.findDbBooking(id) : null;
    if (process.env.NODE_ENV === 'production' && !this.isDbAvailable()) this.requirePersistentStore();
    const booking = persisted || this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    const now = Date.now();
    const scheduledEndMs = new Date(booking.endsAt).getTime();
    const diffMinutes = Math.round((now - scheduledEndMs) / (1000 * 60));
    const overstayMinutes = Math.max(0, diffMinutes);
    const gracePeriodMinutes = 15;
    const isInGracePeriod = overstayMinutes > 0 && overstayMinutes <= gracePeriodMinutes;
    const penaltyRatePerHourInr = 80.0;
    let totalPenaltyInr = 0;
    let status: 'grace_period' | 'violation' | 'resolved' | 'waived' = 'resolved';

    if (booking.status === 'active' && overstayMinutes > 0) {
      if (isInGracePeriod) {
        status = 'grace_period';
      } else {
        status = 'violation';
        const chargeableHours = Math.ceil((overstayMinutes - gracePeriodMinutes) / 60);
        totalPenaltyInr = chargeableHours * penaltyRatePerHourInr;
      }
    }

    if (this.isDbAvailable()) {
      await this.databaseService!.query(
        `INSERT INTO booking_overstays (booking_id, scheduled_ends_at, actual_departure_at, overstay_minutes, grace_period_minutes, penalty_rate_per_hour_inr, total_penalty_inr, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, booking.endsAt, booking.actualCheckOutAt || null, overstayMinutes, gracePeriodMinutes, penaltyRatePerHourInr, totalPenaltyInr, status]
      );
    }
    return {
      bookingId: id,
      scheduledEndsAt: booking.endsAt,
      actualDepartureAt: booking.actualCheckOutAt,
      overstayMinutes,
      gracePeriodMinutes,
      isInGracePeriod,
      penaltyRatePerHourInr,
      totalPenaltyInr,
      status,
    };
  }

  public async getPass(id: string): Promise<any> {
    const enriched = await this.getBookingById(id);
    return {
      bookingReference: enriched.bookingReference,
      qrAccessToken: enriched.qrAccessToken,
      gatePinCode: enriched.gatePinCode || '4821',
      entranceInstructions: enriched.entranceInstructions,
      bayIdentifier: enriched.bayIdentifier || 'Bay A-04',
      floorLevel: enriched.floorLevel || 'Ground Level',
      facilityName: enriched.facilityName || 'Anna Nagar Plaza Parking',
      startsAt: enriched.startsAt,
      endsAt: enriched.endsAt,
      vehiclePlate: enriched.vehiclePlate,
      validUntil: enriched.endsAt,
    };
  }

  public async createSupportTicket(bookingId: string, userId: string, category: any, description: string): Promise<any> {
    if (!description || description.trim().length < 5 || description.length > 5000) throw new BadRequestException('Description must contain 5 to 5000 characters.');
    if (this.isDbAvailable()) {
      return this.databaseService!.transaction(async (client) => {
        const bookingRows = await client.query('SELECT * FROM bookings WHERE id = $1 FOR SHARE', [bookingId]);
        if (!bookingRows.rows[0]) throw new NotFoundException(`Booking ${bookingId} not found`);
        const booking = this.mapDbBooking(bookingRows.rows[0]);
        if (booking.customerId !== userId) throw new ForbiddenException('You may only file support tickets for your own bookings.');
        const rows = await client.query(`INSERT INTO booking_support_tickets (booking_id, user_id, category, description, status) VALUES ($1,$2,$3,$4,'open') RETURNING *`, [bookingId, userId, String(category || 'other').slice(0,64), description.trim()]);
        await this.recordDbLifecycle(client, booking, 'DISPUTE_FILED', userId, 'customer', { ticketId: rows.rows[0].id, category });
        return rows.rows[0];
      });
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const booking = this.sandboxBookings.get(bookingId);
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    const ticket = {
      id: `TCK-${Date.now().toString().slice(-6)}`,
      bookingId,
      userId,
      category,
      description,
      status: 'open',
      resolutionNotes: 'Dispute ticket assigned to on-site facility supervisor. Escalated for review.',
      createdAt: new Date().toISOString(),
    };
    this.sandboxSupportTickets.set(ticket.id, ticket);
    this.logLifecycleEvent(bookingId, 'DISPUTE_FILED', userId, 'customer', { ticketId: ticket.id, category });
    return ticket;
  }

  public async getAlternativeSpaces(spaceId: string, startsAt: string, endsAt: string): Promise<any[]> {
    if (process.env.NODE_ENV === 'production' && !this.isDbAvailable()) this.requirePersistentStore();
    const currentSpace = await this.facilitiesService.getSpace(spaceId).catch(() => null);
    const facilityId = currentSpace?.facilityId || '10000000-0000-4000-b000-000000000104';
    const allSpaces = await this.facilitiesService.listSpaces(facilityId).catch(() => []);
    
    const suggestions: any[] = [];
    const reqStart = new Date(startsAt).getTime();
    const reqEnd = new Date(endsAt).getTime();

    for (const s of allSpaces) {
      if (s.id === spaceId || s.status === 'maintenance') continue;
      const persistedConflict = this.isDbAvailable() ? await this.databaseService!.query(
        `SELECT id FROM bookings WHERE space_id = $1 AND status IN ('confirmed','active') AND starts_at < ($3::timestamptz + interval '15 minutes') AND ends_at + interval '15 minutes' > $2::timestamptz LIMIT 1`, [s.id, startsAt, endsAt]
      ) : [];
      const conflict = persistedConflict.length > 0 || Array.from(this.sandboxBookings.values()).some((b) => {
        if (b.spaceId !== s.id || b.status === 'cancelled') return false;
        const bStart = new Date(b.startsAt).getTime();
        const bEnd = new Date(b.endsAt).getTime();
        return reqStart < (bEnd + this.TURNAROUND_BUFFER_MS) && (reqEnd + this.TURNAROUND_BUFFER_MS) > bStart;
      });
      if (!conflict) {
        suggestions.push({
          spaceId: s.id,
          facilityId: s.facilityId,
          facilityName: 'Anna Nagar Plaza Parking',
          bayIdentifier: s.bayIdentifier,
          floorLevel: s.floorLevel || 'Ground',
          vehicleCategory: s.vehicleCategory,
          hourlyRateInr: Number(s.hourlyRateInr) || 40,
          hasEvCharger: Boolean(s.hasEvCharger),
          score: s.floorLevel === 'Ground' ? 95 : 88,
        });
      }
    }

    if (suggestions.length === 0 && process.env.NODE_ENV !== 'production') {
      suggestions.push(
        {
          spaceId: '10000000-0000-4000-b000-000000000104-05',
          facilityId: '10000000-0000-4000-b000-000000000104',
          facilityName: 'Anna Nagar Plaza Parking',
          bayIdentifier: 'Bay B-12',
          floorLevel: 'Basement 1',
          vehicleCategory: 'car',
          hourlyRateInr: 40,
          hasEvCharger: false,
          score: 92,
        },
        {
          spaceId: '10000000-0000-4000-b000-000000000208-01',
          facilityId: '10000000-0000-4000-b000-000000000208',
          facilityName: 'Nexus Business Center Parking',
          bayIdentifier: 'Bay G-02',
          floorLevel: 'Ground Level',
          vehicleCategory: 'car',
          hourlyRateInr: 50,
          distanceMeters: 450,
          hasEvCharger: true,
          score: 89,
        }
      );
    }
    return suggestions;
  }

  public async cancelBooking(
    id: string,
    reason?: string,
    actorId?: string
  ): Promise<Booking & { refundAmountInr: number }> {
    if (this.isDbAvailable()) {
      return this.databaseService!.transaction(async (client) => {
        const rows = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
        if (!rows.rows[0]) throw new NotFoundException(`Booking ${id} not found`);
        const booking = this.mapDbBooking(rows.rows[0]);
        if (actorId && booking.customerId !== actorId) throw new ForbiddenException('You may only cancel your own booking.');
        if (booking.status !== 'confirmed') throw new BadRequestException(`Cannot cancel booking with status '${booking.status}'. Only confirmed upcoming bookings are cancellable.`);
        const hoursBeforeStart = (new Date(booking.startsAt).getTime() - Date.now()) / 3600000;
        const refundRatio = hoursBeforeStart >= 2 ? 1 : hoursBeforeStart > 0 ? 0.8 : 0;
        const refundAmountInr = Math.round(booking.pricing.totalAmountInr * refundRatio * 100) / 100;
        const updated = await client.query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`, [id]);
        const result = this.mapDbBooking(updated.rows[0]);
        await this.recordDbLifecycle(client, result, 'BOOKING_CANCELLED', actorId || booking.customerId, 'customer', { reason: reason || '', refundAmountInr, refundStatus: 'not_processed_by_this_service' });
        return { ...result, refundAmountInr };
      });
    }
    if (process.env.NODE_ENV === 'production') this.requirePersistentStore();
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(`Cannot cancel booking with status '${booking.status}'. Only confirmed upcoming bookings are cancellable.`);
    }

    const now = Date.now();
    const startsAtMs = new Date(booking.startsAt).getTime();
    const hoursBeforeStart = (startsAtMs - now) / (1000 * 60 * 60);

    // Refund policy: 100% refund if > 2 hours before start, 80% refund if < 2 hours
    const refundRatio = hoursBeforeStart >= 2 ? 1.0 : 0.8;
    const refundAmountInr = Math.round(booking.pricing.totalAmountInr * refundRatio * 100) / 100;

    booking.status = 'cancelled';
    booking.updatedAt = new Date().toISOString();
    this.sandboxBookings.set(id, booking);

    return {
      ...booking,
      refundAmountInr,
    };
  }

  public async getReceipt(id: string): Promise<TaxInvoiceReceipt> {
    const booking = await this.getBookingById(id);
    const start = new Date(booking.startsAt).getTime();
    const end = new Date(booking.endsAt).getTime();
    const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));

    const halfTax = Math.round((booking.pricing.taxInr / 2) * 100) / 100;

    return {
      invoiceNumber: `INV-2026-${booking.bookingReference.replace('#PKZ-', '')}`,
      invoiceDate: new Date(booking.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      bookingReference: booking.bookingReference,
      sacCode: '996729',
      customerName: booking.customerName || 'Arun Kumar',
      vehiclePlate: booking.vehiclePlate,
      facilityName: booking.facilityName || 'Anna Nagar Plaza Parking',
      facilityAddress: booking.facilityAddress || '2nd Avenue, Anna Nagar East, Chennai',
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      durationHours,
      baseAmountInr: booking.pricing.baseAmountInr,
      platformFeeInr: booking.pricing.platformFeeInr,
      cgstInr: halfTax,
      sgstInr: halfTax,
      totalAmountInr: booking.pricing.totalAmountInr,
      paymentMethod: 'Not available',
      paymentStatus: 'Not verified — payment integration required',
      qrCodeToken: booking.qrAccessToken,
    };
  }

  public getAllBookings(): Booking[] {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Use the asynchronous database-backed booking query for production administration.');
    }
    return Array.from(this.sandboxBookings.values());
  }

  private async enrichBooking(b: Booking): Promise<BookingDetailsResponse> {
    let facilityName = 'Anna Nagar Plaza Parking';
    let facilityAddress = '2nd Avenue, Near Roundtana, Anna Nagar East';
    let facilityCity = 'Chennai';
    let bayIdentifier = 'Bay A-04';
    let floorLevel = 'Ground Level';
    let gatePinCode = '4821';
    let entranceInstructions = 'Enter via Gate 2 on 2nd Avenue. Present digital pass at boom barrier.';

    try {
      const facility = await this.facilitiesService.getFacility(b.facilityId);
      if (facility) {
        facilityName = facility.name;
        facilityAddress = facility.addressLine1;
        facilityCity = facility.city;
        gatePinCode = facility.gatePinCode || '4821';
        entranceInstructions = facility.entranceInstructions || entranceInstructions;
      }

      const space = await this.facilitiesService.getSpace(b.spaceId);
      if (space) {
        bayIdentifier = space.bayIdentifier;
        floorLevel = space.floorLevel;
      }
    } catch {
      // Fallback to sensible defaults
    }

    return {
      ...b,
      facilityName,
      facilityAddress,
      facilityCity,
      bayIdentifier,
      floorLevel,
      gatePinCode,
      entranceInstructions,
      customerName: (b as any).customerName || '',
      customerPhone: (b as any).customerPhone || '',
      customerEmail: (b as any).customerEmail || '',
    };
  }
}
