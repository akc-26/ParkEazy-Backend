import { Injectable, Logger, Inject, BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service.js';
import { FacilitiesService } from '../facilities/facilities.service.js';
import {
  BookingDetailsResponse,
  HostEarningsSummary,
  HostSettlement,
} from '@parkeazy/shared-types';

@Injectable()
export class HostOpsService {
  private readonly logger = new Logger(HostOpsService.name);

  constructor(
    @Inject(BookingsService) private readonly bookingsService: BookingsService,
    @Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService
  ) {}

  public async getHostBookings(hostId: string, tenantId = 'default'): Promise<BookingDetailsResponse[]> {
    const facilities = await this.facilitiesService.listHostFacilities(hostId, tenantId);
    const facilityIds = facilities.map((f) => f.id);
    return await this.bookingsService.getBookingsByFacilityIds(facilityIds, tenantId);
  }

  public async getOccupancy(hostId: string, tenantId = 'default') {
    const facilities = await this.facilitiesService.listHostFacilities(hostId, tenantId);

    return Promise.all(
      facilities.map(async (f) => {
        const spaces = await this.facilitiesService.listSpaces(f.id, hostId, tenantId);
        const facilityBookings = await this.bookingsService.getBookingsByFacilityIds([f.id], tenantId);
        const occupiedSpaceIds = new Set(
          facilityBookings
            .filter((b) => b.status === 'active' || b.status === 'confirmed')
            .map((b) => b.spaceId)
        );

        const spacesWithStatus = spaces.map((s) => ({
          ...s,
          isOccupied: occupiedSpaceIds.has(s.id),
        }));

        const occupiedSpaces = spacesWithStatus.filter((s) => s.isOccupied).length;
        const availableSpaces = spacesWithStatus.length - occupiedSpaces;

        return {
          facilityId: f.id,
          facilityName: f.name,
          totalSpaces: spaces.length,
          occupiedSpaces,
          availableSpaces,
          spaces: spacesWithStatus,
        };
      })
    );
  }

  public async getEarnings(hostId: string, tenantId = 'default'): Promise<HostEarningsSummary> {
    const bookings = await this.getHostBookings(hostId, tenantId);
    let grossEarningsInr = 0;
    let platformCommissionInr = 0;
    let completedBookingsCount = 0;
    let activeBookingsCount = 0;

    for (const booking of bookings) {
      if (booking.status === 'completed' || booking.status === 'active') {
        grossEarningsInr += booking.pricing.totalAmountInr;
        platformCommissionInr += (booking.pricing.platformFeeInr || 0);
        if (booking.status === 'completed') completedBookingsCount++;
        if (booking.status === 'active') activeBookingsCount++;
      }
    }

    grossEarningsInr = Math.round(grossEarningsInr * 100) / 100;
    platformCommissionInr = Math.round(platformCommissionInr * 100) / 100;
    const netPayoutInr = Math.round((grossEarningsInr - platformCommissionInr) * 100) / 100;

    return {
      grossEarningsInr,
      platformCommissionInr,
      netPayoutInr,
      disbursedPayoutsInr: 0,
      pendingBalanceInr: netPayoutInr,
      completedBookingsCount,
      activeBookingsCount,
    };
  }

  public async getLedger(hostId: string, tenantId = 'default') {
    const bookings = await this.getHostBookings(hostId, tenantId);
    return bookings.map((booking) => {
      const gross = booking.pricing.totalAmountInr;
      const commission = booking.pricing.platformFeeInr || 0;
      const hostProceeds = Math.round((gross - commission) * 100) / 100;
      return {
        id: booking.id,
        bookingReference: booking.bookingReference,
        date: booking.createdAt,
        space: booking.bayIdentifier || 'Bay A-01',
        facility: booking.facilityName || 'Anna Nagar Plaza Parking',
        grossAmountInr: gross,
        platformCommissionInr: commission,
        netProceedsInr: hostProceeds,
        status: booking.status,
      };
    });
  }

  public async getPayouts(hostId: string, tenantId = 'default'): Promise<HostSettlement[]> {
    this.logger.warn(
      `[HostOps] A persistent settlement provider has not been configured. Payout history is unavailable.`
    );
    return [];
  }

  public async requestPayout(hostId: string, tenantId = 'default'): Promise<HostSettlement> {
    throw new ServiceUnavailableException(
      'A persistent settlement provider has not been configured. No payout was created or marked as paid.'
    );
  }

  public async checkIn(bookingId: string, hostId: string, tenantId = 'default') {
    const booking = await this.bookingsService.getBookingById(bookingId);
    const facilities = await this.facilitiesService.listHostFacilities(hostId, tenantId);
    const facility = facilities.find((f) => f.id === booking.facilityId);
    if (!facility) {
      throw new ForbiddenException('Access denied: You do not operate the facility for this booking.');
    }
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot check in booking with status '${booking.status}'. Only confirmed bookings can be checked in.`
      );
    }
    return await this.bookingsService.checkIn(bookingId, hostId);
  }

  public async checkOut(bookingId: string, hostId: string, tenantId = 'default') {
    const booking = await this.bookingsService.getBookingById(bookingId);
    const facilities = await this.facilitiesService.listHostFacilities(hostId, tenantId);
    const facility = facilities.find((f) => f.id === booking.facilityId);
    if (!facility) {
      throw new ForbiddenException('Access denied: You do not operate the facility for this booking.');
    }
    if (booking.status !== 'active') {
      throw new BadRequestException(
        `Cannot check out booking with status '${booking.status}'. Only active bookings can be checked out.`
      );
    }
    return await this.bookingsService.checkOut(bookingId, hostId);
  }

  public async getAuditEvents(hostId: string, tenantId = 'default') {
    const facilities = await this.facilitiesService.listHostFacilities(hostId, tenantId);
    const facilityIds = facilities.map((f) => f.id);
    return await this.bookingsService.getLifecycleEventsByFacilityIds(facilityIds, tenantId);
  }

  public async getExtensionRequests(hostId: string, tenantId = 'default') {
    const facilities = await this.facilitiesService.listHostFacilities(hostId, tenantId);
    const facilityIds = facilities.map((f) => f.id);
    return await this.bookingsService.getExtensionRequestsByFacilityIds(facilityIds, tenantId);
  }

  public async decideExtensionRequest(
    requestId: string,
    decision: 'approve' | 'reject',
    hostId: string,
    tenantId = 'default'
  ) {
    return await this.bookingsService.decideExtensionRequest(requestId, decision, hostId, tenantId);
  }
}
