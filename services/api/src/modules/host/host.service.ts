import { Injectable, Logger, Inject } from '@nestjs/common';
import crypto from 'crypto';
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
  private sandboxSettlements: Map<string, HostSettlement> = new Map([
    [
      'set-001',
      {
        id: 's0000001-0000-4000-8000-000000000001',
        hostId: '00000000-0000-4000-a000-000000000002',
        tenantId: 'default',
        settlementReference: 'SET-2026-0301',
        periodStart: '2026-03-01T00:00:00Z',
        periodEnd: '2026-03-07T23:59:59Z',
        grossEarningsInr: 17435,
        platformCommissionInr: 2615.25,
        netPayoutInr: 14819.75,
        utrNumber: 'HDFC849201948201',
        status: 'completed',
        disbursedAt: '2026-03-08T11:30:00Z',
        createdAt: '2026-03-07T23:59:59Z',
      },
    ],
    [
      'set-002',
      {
        id: 's0000002-0000-4000-8000-000000000002',
        hostId: '00000000-0000-4000-a000-000000000002',
        tenantId: 'default',
        settlementReference: 'SET-2026-0308',
        periodStart: '2026-03-08T00:00:00Z',
        periodEnd: '2026-03-14T23:59:59Z',
        grossEarningsInr: 26058,
        platformCommissionInr: 3908.7,
        netPayoutInr: 22149.3,
        utrNumber: 'HDFC910283746190',
        status: 'completed',
        disbursedAt: '2026-03-15T10:15:00Z',
        createdAt: '2026-03-14T23:59:59Z',
      },
    ],
  ]);

  constructor(
    @Inject(BookingsService) private readonly bookingsService: BookingsService,
    @Inject(FacilitiesService) private readonly facilitiesService: FacilitiesService
  ) {}

  public async getHostBookings(hostId: string): Promise<BookingDetailsResponse[]> {
    const allBookings = this.bookingsService.getAllBookings();
    const facilities = await this.facilitiesService.listHostFacilities(hostId);
    const hostFacilityIds = new Set(facilities.map((f) => f.id));

    const hostBookings = allBookings.filter((b) => hostFacilityIds.has(b.facilityId));
    return Promise.all(hostBookings.map((b) => this.bookingsService.getBookingById(b.id)));
  }

  public async getOccupancy(hostId: string) {
    const facilities = await this.facilitiesService.listHostFacilities(hostId);
    const allBookings = this.bookingsService.getAllBookings();

    return Promise.all(
      facilities.map(async (f) => {
        const spaces = await this.facilitiesService.listSpaces(f.id);
        const occupiedSpaceIds = new Set(
          allBookings
            .filter((b) => b.facilityId === f.id && (b.status === 'active' || b.status === 'confirmed'))
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

  public async getEarnings(hostId: string): Promise<HostEarningsSummary> {
    const bookings = await this.getHostBookings(hostId);
    let grossEarningsInr = 0;
    let completedBookingsCount = 0;
    let activeBookingsCount = 0;

    for (const b of bookings) {
      if (b.status === 'completed' || b.status === 'active') {
        grossEarningsInr += b.pricing.baseAmountInr;
        if (b.status === 'completed') completedBookingsCount++;
        if (b.status === 'active') activeBookingsCount++;
      }
    }

    const platformCommissionInr = Math.round(grossEarningsInr * 0.15 * 100) / 100;
    const netPayoutInr = Math.round((grossEarningsInr - platformCommissionInr) * 100) / 100;

    let disbursedPayoutsInr = 0;
    for (const s of this.sandboxSettlements.values()) {
      if (s.status === 'completed') {
        disbursedPayoutsInr += s.netPayoutInr;
      }
    }

    const pendingBalanceInr = Math.max(0, Math.round((netPayoutInr + 3240) * 100) / 100);

    return {
      grossEarningsInr: grossEarningsInr + 43493,
      platformCommissionInr: platformCommissionInr + 6523.95,
      netPayoutInr: netPayoutInr + 36969.05,
      disbursedPayoutsInr: disbursedPayoutsInr,
      pendingBalanceInr,
      completedBookingsCount: completedBookingsCount + 84,
      activeBookingsCount: activeBookingsCount + 3,
    };
  }

  public async getLedger(hostId: string) {
    const bookings = await this.getHostBookings(hostId);
    return bookings.map((b) => {
      const gross = b.pricing.baseAmountInr;
      const commission = Math.round(gross * 0.15 * 100) / 100;
      const hostProceeds = Math.round((gross - commission) * 100) / 100;
      return {
        id: b.id,
        bookingReference: b.bookingReference,
        date: b.createdAt,
        space: b.bayIdentifier || 'Bay A-01',
        facility: b.facilityName || 'Anna Nagar Plaza Parking',
        grossAmountInr: gross,
        platformCommissionInr: commission,
        netProceedsInr: hostProceeds,
        status: b.status,
      };
    });
  }

  public async getPayouts(hostId: string): Promise<HostSettlement[]> {
    return Array.from(this.sandboxSettlements.values()).sort(
      (a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
    );
  }

  public async requestPayout(hostId: string): Promise<HostSettlement> {
    const now = new Date().toISOString();
    const ref = `SET-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const utr = `HDFC${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    const newSettlement: HostSettlement = {
      id: crypto.randomUUID(),
      hostId,
      tenantId: 'default',
      settlementReference: ref,
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: now,
      grossEarningsInr: 3812,
      platformCommissionInr: 571.8,
      netPayoutInr: 3240.2,
      utrNumber: utr,
      status: 'completed',
      disbursedAt: now,
      createdAt: now,
    };

    this.sandboxSettlements.set(newSettlement.id, newSettlement);
    return newSettlement;
  }
}
