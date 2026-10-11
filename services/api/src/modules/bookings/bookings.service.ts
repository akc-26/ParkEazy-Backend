import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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

  constructor(
    @Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService,
    @Optional() @Inject(DatabaseService) private readonly databaseService?: DatabaseService
  ) {
    this.seedSandboxBookings();
  }

  private isDbAvailable(): boolean {
    return Boolean(this.databaseService?.getPool() && this.databaseService.getHealthStatus().connected);
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
    const space = await this.facilitiesService.getSpace(spaceId);
    if (!space) {
      throw new NotFoundException(`Parking space ${spaceId} not found`);
    }

    // Check availability against existing bookings
    const isConflict = Array.from(this.sandboxBookings.values()).some((b) => {
      if (b.spaceId !== spaceId || b.status === 'cancelled') return false;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      const reqStart = new Date(startsAt).getTime();
      const reqEnd = new Date(endsAt).getTime();
      return reqStart < bEnd && reqEnd > bStart;
    });

    if (isConflict) {
      throw new ConflictException('Selected parking space is already booked during this time window.');
    }

    const now = Date.now();
    const hold: ReservationHold = {
      id: crypto.randomUUID(),
      spaceId,
      userId,
      startsAt,
      endsAt,
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(), // 10 minute lease
      isReleased: false,
      createdAt: new Date(now).toISOString(),
    };

    this.sandboxHolds.set(hold.id, hold);
    return hold;
  }

  public async createBooking(
    userId: string,
    tenantId: string,
    payload: CreateBookingPayload
  ): Promise<Booking> {
    const pricing = await this.calculatePricing(payload.spaceId, payload.startsAt, payload.endsAt);

    // Concurrency conflict check
    const isConflict = Array.from(this.sandboxBookings.values()).some((b) => {
      if (b.spaceId !== payload.spaceId || b.status === 'cancelled') return false;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      const reqStart = new Date(payload.startsAt).getTime();
      const reqEnd = new Date(payload.endsAt).getTime();
      return reqStart < bEnd && reqEnd > bStart;
    });

    if (isConflict) {
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
    return newBooking;
  }

  public async getMyBookings(userId: string): Promise<BookingDetailsResponse[]> {
    const list = Array.from(this.sandboxBookings.values())
      .filter((b) => b.customerId === userId || userId === '00000000-0000-4000-a000-000000000003')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Promise.all(list.map((b) => this.enrichBooking(b)));
  }

  public async getBookingById(id: string): Promise<BookingDetailsResponse> {
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return this.enrichBooking(booking);
  }

  public async checkIn(id: string): Promise<Booking> {
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

  public async checkOut(id: string): Promise<Booking> {
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

  public async extendBooking(id: string, additionalHours = 1): Promise<Booking> {
    const booking = this.sandboxBookings.get(id);
    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.status !== 'confirmed' && booking.status !== 'active') {
      throw new BadRequestException(`Cannot extend booking with status '${booking.status}'`);
    }

    const currentEnd = new Date(booking.endsAt).getTime();
    const newEnd = new Date(currentEnd + additionalHours * 60 * 60 * 1000).toISOString();

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
    return booking;
  }

  public async cancelBooking(
    id: string,
    reason?: string
  ): Promise<Booking & { refundAmountInr: number }> {
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
      paymentMethod: 'UPI (Google Pay / PhonePe)',
      paymentStatus: 'Paid',
      qrCodeToken: booking.qrAccessToken,
    };
  }

  public getAllBookings(): Booking[] {
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
      customerName: 'Arun Kumar',
      customerPhone: '+91 98765 00003',
      customerEmail: 'driver.arun@parkeazy.com',
    };
  }
}
