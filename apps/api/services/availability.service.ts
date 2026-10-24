import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  RecurringAvailabilitySchedule,
  AvailabilityOverride,
  MaintenanceBlock,
  CreateMaintenanceBlockRequest,
  CalendarEvent,
  AvailabilityInterval,
  SpaceAvailabilitySummary,
  ValidateAvailabilityChangeRequest,
  ValidateAvailabilityChangeResponse,
  PricingConflict,
  BookingStatus,
} from '../../../packages/contracts';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/error-handler';
import { inventoryService } from './inventory.service';
import { bookingService } from './booking.service';
import { pricingService } from './pricing.service';
import { db } from '../../../server/db';
import {
  isInstantWithinOperatingHours,
  getFacilityLocalDateTime,
  resolveFacilityTimezone,
} from '../../../server/timezone';

export class AvailabilityService {
  private static instance: AvailabilityService;
  private readonly storageFilePath: string;

  private recurringSchedules: RecurringAvailabilitySchedule[] = [];
  private dateOverrides: AvailabilityOverride[] = [];
  private maintenanceBlocks: MaintenanceBlock[] = [];

  private constructor() {
    this.storageFilePath = path.resolve(
      process.cwd(),
      'apps/api/database/data/availability_store.json'
    );
    this.loadFromDisk();
  }

  public static getInstance(): AvailabilityService {
    if (!AvailabilityService.instance) {
      AvailabilityService.instance = new AvailabilityService();
    }
    return AvailabilityService.instance;
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.recurringSchedules) || Array.isArray(parsed.maintenanceBlocks)) {
          this.recurringSchedules = Array.isArray(parsed.recurringSchedules) ? parsed.recurringSchedules : [];
          this.dateOverrides = Array.isArray(parsed.dateOverrides) ? parsed.dateOverrides : [];
          this.maintenanceBlocks = Array.isArray(parsed.maintenanceBlocks) ? parsed.maintenanceBlocks : [];
          return;
        }
      }
    } catch (err: any) {
      console.warn('[ParkEazy-Availability] Could not load availability store from disk:', err.message);
    }

    // Default seed maintenance blocks
    this.maintenanceBlocks = [
      {
        id: 'mb-001',
        hostId: 'usr-host-001',
        facilityId: 'loc-dt-001',
        spaceId: 'bay-001-c',
        spaceNumber: 'B2-32 (EV)',
        title: 'EV Charger 22kW Cable Inspection & Diagnostic',
        description: 'Scheduled preventive maintenance and software firmware update on Level 2 charger.',
        startTimeUtc: '2026-10-19T08:00:00Z',
        endTimeUtc: '2026-10-19T12:00:00Z',
        status: 'SCHEDULED',
        createdAtUtc: '2026-10-15T10:00:00Z',
        updatedAtUtc: '2026-10-15T10:00:00Z',
      },
    ];
    this.saveToDisk();
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        recurringSchedules: this.recurringSchedules,
        dateOverrides: this.dateOverrides,
        maintenanceBlocks: this.maintenanceBlocks,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ParkEazy-Availability] Error writing availability storage:', err.message);
    }
  }

  // --------------------------------------------------------------------------
  // Authoritative Availability Calculation Engine (Persisted Integration)
  // --------------------------------------------------------------------------

  private getFacilityRecord(facilityId: string): any {
    const fromInventory = inventoryService.getLocationById(facilityId);
    if (fromInventory) {
      return {
        ...fromInventory,
        status: fromInventory.status ? String(fromInventory.status).toLowerCase() : 'active',
        operatingHours: fromInventory.operatingHours,
        timezone: fromInventory.timezone || 'Asia/Kolkata',
      };
    }
    const dbFac = ((db as any).data?.facilities || []).find((f: any) => f.id === facilityId);
    if (dbFac) {
      return {
        id: dbFac.id,
        hostId: dbFac.hostId,
        name: dbFac.name,
        status: dbFac.status ? String(dbFac.status).toLowerCase() : 'active',
        operatingHours: dbFac.operatingHours,
        timezone: dbFac.timezone || 'Asia/Kolkata',
      };
    }
    return undefined;
  }

  private getFacilityBays(facilityId: string): any[] {
    const bays = inventoryService.getBaysByLocationId(facilityId);
    if (bays && bays.length > 0) {
      return bays.map((b: any) => ({
        ...b,
        id: b.id,
        locationId: b.locationId || facilityId,
        bayNumber: b.bayNumber || b.identifier || b.id,
        levelOrFloor: b.levelOrFloor || b.floor || 'Ground',
        bayType: b.bayType || b.type || 'standard',
        status: b.status ? String(b.status).toLowerCase() : 'available',
        vehicleCompatibility: b.vehicleCompatibility || b.supportedVehicleTypes || ['sedan', 'car'],
        supportedVehicleTypes: b.supportedVehicleTypes || b.vehicleCompatibility || ['sedan', 'car'],
        isEvCharging: b.hasEvCharger || b.isEvCharging || false,
      }));
    }
    const dbBays = ((db as any).data?.bays || []).filter((b: any) => b.facilityId === facilityId);
    return dbBays.map((b: any) => ({
      id: b.id,
      locationId: b.facilityId,
      bayNumber: b.identifier || b.bayNumber || b.id,
      levelOrFloor: b.zone || b.floor || 'Ground',
      bayType: b.type || 'standard',
      status: b.status ? String(b.status).toLowerCase() : 'available',
      vehicleCompatibility: b.vehicleCompatibility || b.supportedVehicleTypes || ['sedan', 'car'],
      supportedVehicleTypes: b.supportedVehicleTypes || b.vehicleCompatibility || ['sedan', 'car'],
      isEvCharging: b.hasEvCharger || b.isEvCharging || false,
    }));
  }

  private getAuthoritativeClosures(hostId: string, facilityId: string): any[] {
    const dbClosures = ((db as any).data?.closures || []).filter(
      (c: any) => c.facilityId === facilityId
    );
    const psClosures = pricingService.getClosuresForHost(hostId, facilityId);
    const map = new Map<string, any>();
    for (const c of [...dbClosures, ...psClosures]) {
      if (c && c.id) {
        const startIso = c.startsAt || c.startDate || c.startTimeUtc || c.startTime;
        const endIso = c.endsAt || c.endDate || c.endTimeUtc || c.endTime;
        const bay = c.bayId || c.spaceId || (c.affectedBayIds && c.affectedBayIds.length > 0 ? c.affectedBayIds[0] : undefined);
        map.set(c.id, {
          id: c.id,
          hostId: c.hostId || hostId,
          facilityId: c.facilityId,
          bayId: bay,
          spaceId: bay,
          affectedBayIds: c.affectedBayIds || (bay ? [bay] : undefined),
          title: c.title || c.reason || 'Scheduled Facility Closure',
          reason: c.reason || 'MAINTENANCE',
          startTimeUtc: startIso,
          endTimeUtc: endIso,
          startsAt: startIso,
          endsAt: endIso,
        });
      }
    }
    return Array.from(map.values());
  }

  private getAuthoritativeMaintenance(facilityId: string): any[] {
    const dbMaintenance = ((db as any).data?.maintenance || []).filter(
      (m: any) => m.facilityId === facilityId && (
        !m.status || m.status === 'scheduled' || m.status === 'in_progress' ||
        m.status === 'SCHEDULED' || m.status === 'ACTIVE'
      )
    );
    const mbBlocks = this.maintenanceBlocks.filter(
      (m) => m.facilityId === facilityId && (m.status === 'SCHEDULED' || m.status === 'ACTIVE')
    );
    const map = new Map<string, any>();
    for (const m of [...dbMaintenance, ...mbBlocks]) {
      if (m && m.id) {
        const startIso = m.startsAt || m.startTime || m.startTimeUtc;
        const endIso = m.endsAt || m.endTime || m.endTimeUtc;
        const space = m.spaceId || m.bayId || undefined;
        map.set(m.id, {
          id: m.id,
          hostId: m.hostId,
          facilityId: m.facilityId,
          spaceId: space,
          bayId: space,
          spaceNumber: m.spaceNumber || 'Space',
          title: m.title || 'Scheduled Maintenance',
          description: m.description,
          status: m.status,
          startTimeUtc: startIso,
          endTimeUtc: endIso,
          startsAt: startIso,
          endsAt: endIso,
        });
      }
    }
    return Array.from(map.values());
  }

  private getAuthoritativeBookings(facilityId: string): any[] {
    const dbBookings = ((db as any).data?.bookings || []).filter(
      (b: any) => (b.facilityId === facilityId || b.locationId === facilityId) && (
        b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'active' ||
        b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE
      )
    );
    const psBookings = bookingService.getAllBookings().filter(
      (b) => b.locationId === facilityId && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ACTIVE)
    );
    const map = new Map<string, any>();
    for (const b of [...dbBookings, ...psBookings]) {
      if (b && b.id) {
        map.set(b.id, {
          id: b.id,
          bayId: b.bayId || b.spaceId,
          locationId: b.facilityId || b.locationId,
          userName: b.userName || b.customerName || 'Customer',
          bayNumber: b.bayNumber || b.spaceNumber || b.bayId,
          licensePlate: b.licensePlate,
          status: b.status,
          startTimeUtc: b.startTimeUtc || b.startTime,
          endTimeUtc: b.endTimeUtc || b.endTime,
          quote: b.quote || { totalPayableCents: ((b.grossAmount || b.totalAmount || 0) * 100) },
        });
      }
    }
    return Array.from(map.values());
  }

  public isBayCompatibleWithVehicle(bay: any, requestedCategory?: string): boolean {
    if (!requestedCategory || requestedCategory.toUpperCase() === 'ALL') {
      return true;
    }
    const target = requestedCategory.toLowerCase().trim();
    const supported: string[] = [
      ...(bay.supportedVehicleTypes || []),
      ...(bay.vehicleCompatibility || []),
    ].map((s: string) => String(s).toLowerCase().trim());

    if (supported.length === 0) return true;
    if (supported.includes('all') || supported.includes('standard')) return true;

    if (target === 'car' || target === 'sedan' || target === 'compact') {
      if (
        supported.includes('car') ||
        supported.includes('sedan') ||
        supported.includes('compact') ||
        supported.includes('standard')
      ) {
        return true;
      }
    }

    if (target === 'suv') {
      if (
        supported.includes('suv') ||
        supported.includes('oversized') ||
        supported.includes('van_truck')
      ) {
        return true;
      }
    }

    if (target === 'ev') {
      if (
        bay.isEvCharging ||
        bay.hasEvCharger ||
        supported.includes('ev') ||
        bay.bayType === 'ev' ||
        bay.bayType === 'EV_CHARGING'
      ) {
        return true;
      }
    }

    if (target === 'motorcycle' || target === 'two_wheeler') {
      if (supported.includes('motorcycle') || supported.includes('two_wheeler')) {
        return true;
      }
    }

    if (target === 'truck' || target === 'van' || target === 'bus_truck' || target === 'van_truck') {
      if (
        supported.includes('truck') ||
        supported.includes('van') ||
        supported.includes('bus_truck') ||
        supported.includes('van_truck') ||
        supported.includes('oversized')
      ) {
        return true;
      }
    }

    return supported.includes(target);
  }

  public calculateSpaceAvailability(
    facilityId: string,
    startTimeUtc: string,
    endTimeUtc: string,
    spaceId?: string,
    vehicleCategory?: string
  ): SpaceAvailabilitySummary {
    const facility = this.getFacilityRecord(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' not found.`);
    }

    const allBays = this.getFacilityBays(facilityId);
    const targetBays = spaceId ? allBays.filter((b: any) => b.id === spaceId) : allBays;

    const reqStart = new Date(startTimeUtc).getTime();
    const reqEnd = new Date(endTimeUtc).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
      throw new AppError('Invalid time interval: end time must be after start time.', 400, 'INVALID_BOUNDS');
    }

    // 1. Facility publication and operational status check
    const facilityStatus = (facility.status || 'active').toLowerCase();
    const isFacilityOperational = facilityStatus === 'active' || facilityStatus === 'published' || facilityStatus === 'approved';

    let unavailabilityReason: string | null = null;
    if (!isFacilityOperational) {
      unavailabilityReason = `Facility is currently not operational or published (status: ${facilityStatus}).`;
    }

    // 2. Facility operating hours and timezone check (Section 3B)
    const facilityTz = resolveFacilityTimezone(facility.timezone);
    let operatingHours = facility.operatingHours;
    if (!operatingHours) {
      try {
        const psHours = pricingService.getOperatingHours(facilityId);
        if (psHours && psHours.length > 0) {
          operatingHours = psHours;
        }
      } catch {}
    }

    let isOutsideOperatingHours = false;
    let operatingHoursReason: string | null = null;
    if (operatingHours && operatingHours !== '24/7' && (operatingHours as any).is24x7 !== true) {
      const startInHours = isInstantWithinOperatingHours(startTimeUtc, operatingHours, facilityTz);
      const endInHours = isInstantWithinOperatingHours(endTimeUtc, operatingHours, facilityTz);

      if (!startInHours || !endInHours) {
        isOutsideOperatingHours = true;
        operatingHoursReason = 'Requested parking period falls outside facility operating hours.';
      } else {
        // Sample intermediate times if duration spans multiple hours
        const stepMs = 60 * 60 * 1000;
        for (let t = reqStart + stepMs; t < reqEnd; t += stepMs) {
          if (!isInstantWithinOperatingHours(new Date(t).toISOString(), operatingHours, facilityTz)) {
            isOutsideOperatingHours = true;
            const midLocal = getFacilityLocalDateTime(new Date(t), facilityTz);
            operatingHoursReason = `Facility is closed during interval on ${midLocal.dayName} at ${midLocal.timeString}.`;
            break;
          }
        }
      }
    }

    if (isOutsideOperatingHours && !unavailabilityReason) {
      unavailabilityReason = operatingHoursReason || 'Requested time window falls outside facility operating hours.';
    }

    const confirmedBookings = this.getAuthoritativeBookings(facilityId);
    const activeHolds = bookingService.getActiveHolds().filter((h) => h.locationId === facilityId);
    const activeClosures = this.getAuthoritativeClosures(facility.hostId, facilityId);
    const activeBlocks = this.getAuthoritativeMaintenance(facilityId);

    let availableCount = 0;
    let occupiedCount = 0;
    let heldCount = 0;
    let blockedCount = 0;
    const eligibleBayIds: string[] = [];

    const spacesList = targetBays.map((bay: any) => {
      let isAvailable = true;
      let status = 'Available';
      let nextBookingStartsUtc: string | undefined;

      // Check facility operational status
      if (!isFacilityOperational) {
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable: false,
          currentStatus: `Facility Inactive (${facilityStatus})`,
          nextBookingStartsUtc,
        };
      }

      // Check operating hours
      if (isOutsideOperatingHours) {
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable: false,
          currentStatus: 'Outside Operating Hours',
          nextBookingStartsUtc,
        };
      }

      // Check bay operational status
      const bayStatus = (bay.status || 'available').toLowerCase();
      if (bayStatus === 'maintenance') {
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable: false,
          currentStatus: 'Maintenance (Bay Inactive)',
          nextBookingStartsUtc,
        };
      }
      if (bayStatus === 'retired' || bayStatus === 'suspended') {
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable: false,
          currentStatus: 'Retired',
          nextBookingStartsUtc,
        };
      }

      // Check vehicle category compatibility
      if (vehicleCategory && !this.isBayCompatibleWithVehicle(bay, vehicleCategory)) {
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable: false,
          currentStatus: `Ineligible (Vehicle Category Mismatch for ${vehicleCategory})`,
          nextBookingStartsUtc,
        };
      }

      // Check facility-wide or bay-specific closures
      const overlappingClosure = activeClosures.find((c: any) => {
        const cBay = c.bayId || c.spaceId;
        if (cBay && cBay !== bay.id) {
          if (!c.affectedBayIds || !c.affectedBayIds.includes(bay.id)) {
            return false;
          }
        }
        const cStart = new Date(c.startTimeUtc).getTime();
        const cEnd = new Date(c.endTimeUtc).getTime();
        return Math.max(reqStart, cStart) < Math.min(reqEnd, cEnd);
      });

      if (overlappingClosure) {
        isAvailable = false;
        status = `Closed: ${overlappingClosure.title}`;
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable,
          currentStatus: status,
          nextBookingStartsUtc,
        };
      }

      // Check maintenance blocks
      const overlappingBlock = activeBlocks.find((m: any) => {
        const mBay = m.spaceId || m.bayId;
        if (mBay && mBay !== bay.id) return false;
        const mStart = new Date(m.startTimeUtc).getTime();
        const mEnd = new Date(m.endTimeUtc).getTime();
        return Math.max(reqStart, mStart) < Math.min(reqEnd, mEnd);
      });

      if (overlappingBlock) {
        isAvailable = false;
        status = `Maintenance: ${overlappingBlock.title}`;
        blockedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable,
          currentStatus: status,
          nextBookingStartsUtc,
        };
      }

      // Check confirmed bookings (with 15m transition buffer)
      const bufferMs = 15 * 60 * 1000;
      const overlappingBooking = confirmedBookings.find((b: any) => {
        if (b.bayId !== bay.id) return false;
        const bStart = new Date(b.startTimeUtc).getTime();
        const bEnd = new Date(b.endTimeUtc).getTime() + bufferMs;
        return Math.max(reqStart, bStart) < Math.min(reqEnd, bEnd);
      });

      if (overlappingBooking) {
        isAvailable = false;
        status = `Occupied (Booking ${overlappingBooking.id})`;
        nextBookingStartsUtc = overlappingBooking.startTimeUtc;
        occupiedCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable,
          currentStatus: status,
          nextBookingStartsUtc,
        };
      }

      // Check active holds (10-minute hold lock)
      const overlappingHold = activeHolds.find((h) => {
        if (h.bayId !== bay.id) return false;
        const hStart = new Date(h.startTimeUtc).getTime();
        const hEnd = new Date(h.endTimeUtc).getTime() + bufferMs;
        return Math.max(reqStart, hStart) < Math.min(reqEnd, hEnd);
      });

      if (overlappingHold) {
        isAvailable = false;
        status = 'Locked (Active Checkout Hold)';
        heldCount++;
        return {
          spaceId: bay.id,
          spaceNumber: bay.bayNumber,
          levelOrFloor: bay.levelOrFloor,
          isAvailable,
          currentStatus: status,
          nextBookingStartsUtc,
        };
      }

      availableCount++;
      eligibleBayIds.push(bay.id);
      return {
        spaceId: bay.id,
        spaceNumber: bay.bayNumber,
        levelOrFloor: bay.levelOrFloor,
        isAvailable: true,
        currentStatus: 'Available',
        nextBookingStartsUtc,
      };
    });

    if (availableCount === 0 && !unavailabilityReason) {
      const facilityWideClosure = activeClosures.find((c: any) => {
        const cBay = c.bayId || c.spaceId;
        if (cBay) return false;
        const cStart = new Date(c.startTimeUtc || c.startsAt || c.startDate).getTime();
        const cEnd = new Date(c.endTimeUtc || c.endsAt || c.endDate).getTime();
        return Math.max(reqStart, cStart) < Math.min(reqEnd, cEnd);
      });
      const facilityWideMaintenance = activeBlocks.find((m: any) => {
        const mBay = m.bayId || m.spaceId;
        if (mBay) return false;
        const mStart = new Date(m.startTimeUtc || m.startsAt || m.startTime).getTime();
        const mEnd = new Date(m.endTimeUtc || m.endsAt || m.endTime).getTime();
        return Math.max(reqStart, mStart) < Math.min(reqEnd, mEnd);
      });

      if (facilityWideClosure) {
        unavailabilityReason = `Facility is closed: ${facilityWideClosure.title || facilityWideClosure.reason || 'Scheduled Facility Closure'}.`;
      } else if (facilityWideMaintenance) {
        unavailabilityReason = `Facility is undergoing maintenance: ${facilityWideMaintenance.title || 'Scheduled Maintenance'}.`;
      } else if (vehicleCategory && targetBays.some((b: any) => !this.isBayCompatibleWithVehicle(b, vehicleCategory))) {
        unavailabilityReason = `No parking bays at this facility are compatible with vehicle category '${vehicleCategory}'.`;
      } else {
        unavailabilityReason = 'All parking bays are currently occupied, reserved, or undergoing maintenance during the requested period.';
      }
    }

    return {
      facilityId,
      facilityName: facility.name,
      totalSpaces: targetBays.length,
      availableSpacesCount: availableCount,
      occupiedSpacesCount: occupiedCount,
      heldSpacesCount: heldCount,
      blockedSpacesCount: blockedCount,
      unavailabilityReason,
      eligibleBayIds,
      spaces: spacesList,
    };
  }

  // --------------------------------------------------------------------------
  // Calendar Events Aggregator (pe_hw_04_01)
  // --------------------------------------------------------------------------

  public getCalendarEvents(
    hostId: string,
    facilityId: string,
    startRangeUtc: string,
    endRangeUtc: string,
    spaceId?: string
  ): CalendarEvent[] {
    const facility = this.getFacilityRecord(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    const rangeStart = new Date(startRangeUtc).getTime();
    const rangeEnd = new Date(endRangeUtc).getTime();

    const events: CalendarEvent[] = [];

    // 1. Confirmed Bookings (Protected reservations)
    const bookings = this.getAuthoritativeBookings(facilityId).filter((b: any) => {
      if (b.locationId !== facilityId) return false;
      if (spaceId && b.bayId !== spaceId) return false;

      const bStart = new Date(b.startTimeUtc).getTime();
      const bEnd = new Date(b.endTimeUtc).getTime();
      return Math.max(rangeStart, bStart) < Math.min(rangeEnd, bEnd);
    });

    for (const b of bookings) {
      events.push({
        id: b.id,
        facilityId: b.locationId,
        facilityName: facility.name,
        spaceId: b.bayId,
        spaceNumber: b.bayNumber,
        eventType: 'CONFIRMED_BOOKING',
        title: `Reserved: ${b.userName} (${b.bayNumber})`,
        startTimeUtc: b.startTimeUtc,
        endTimeUtc: b.endTimeUtc,
        status: b.status,
        accessibleBadgeText: 'Confirmed Reservation',
        isProtectedReservation: true,
        customerName: b.userName,
        licensePlate: b.licensePlate,
        notes: `Total Paid: $${(b.quote.totalPayableCents / 100).toFixed(2)} • Ref: ${b.id}`,
      });
    }

    // 2. Active Checkout Holds (10-minute hold lock)
    const holds = bookingService.getActiveHolds().filter((h) => {
      if (h.locationId !== facilityId) return false;
      if (spaceId && h.bayId !== spaceId) return false;

      const hStart = new Date(h.startTimeUtc).getTime();
      const hEnd = new Date(h.endTimeUtc).getTime();
      return Math.max(rangeStart, hStart) < Math.min(rangeEnd, hEnd);
    });

    for (const h of holds) {
      const bay = inventoryService.getBayById(h.bayId);
      events.push({
        id: h.holdId,
        facilityId: h.locationId,
        facilityName: facility.name,
        spaceId: h.bayId,
        spaceNumber: bay?.bayNumber || 'Bay',
        eventType: 'ACTIVE_HOLD',
        title: `Hold Lock: ${bay?.bayNumber || 'Space'}`,
        startTimeUtc: h.startTimeUtc,
        endTimeUtc: h.endTimeUtc,
        status: 'HOLD_PENDING',
        accessibleBadgeText: 'Active 10-Minute Hold',
        isProtectedReservation: true,
        notes: `Hold expires at ${h.holdExpiresAtUtc}`,
      });
    }

    // 3. Maintenance Blocks
    const blocks = this.getAuthoritativeMaintenance(facilityId).filter((m: any) => {
      if (spaceId && m.spaceId && m.spaceId !== spaceId) return false;

      const mStart = new Date(m.startTimeUtc).getTime();
      const mEnd = new Date(m.endTimeUtc).getTime();
      return Math.max(rangeStart, mStart) < Math.min(rangeEnd, mEnd);
    });

    for (const m of blocks) {
      events.push({
        id: m.id,
        facilityId: m.facilityId,
        facilityName: facility.name,
        spaceId: m.spaceId,
        spaceNumber: m.spaceNumber,
        eventType: 'MAINTENANCE_BLOCK',
        title: `Maintenance: ${m.title}`,
        startTimeUtc: m.startTimeUtc,
        endTimeUtc: m.endTimeUtc,
        status: m.status,
        accessibleBadgeText: 'Maintenance Block',
        isProtectedReservation: false,
        notes: m.description,
      });
    }

    // 4. Closures
    const closures = this.getAuthoritativeClosures(hostId, facilityId).filter((c: any) => {
      if (spaceId && c.bayId && c.bayId !== spaceId) return false;
      const cStart = new Date(c.startTimeUtc).getTime();
      const cEnd = new Date(c.endTimeUtc).getTime();
      return Math.max(rangeStart, cStart) < Math.min(rangeEnd, cEnd);
    });

    for (const c of closures) {
      let spaceNumber: string | undefined;
      if (c.bayId) {
        const bay = inventoryService.getBayById(c.bayId);
        spaceNumber = bay?.bayNumber;
      }
      events.push({
        id: c.id,
        facilityId: c.facilityId,
        facilityName: facility.name,
        spaceId: c.bayId,
        spaceNumber,
        eventType: 'FACILITY_CLOSURE',
        title: `Closure: ${c.title}`,
        startTimeUtc: c.startTimeUtc,
        endTimeUtc: c.endTimeUtc,
        status: 'CLOSED',
        accessibleBadgeText: 'Closure',
        isProtectedReservation: false,
        notes: `Reason: ${c.reason}`,
      });
    }

    return events.sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());
  }

  // --------------------------------------------------------------------------
  // Recurring Availability Schedules (pe_hw_04_02)
  // --------------------------------------------------------------------------

  public getRecurringSchedules(hostId: string, facilityId: string): RecurringAvailabilitySchedule[] {
    return this.recurringSchedules.filter((s) => s.hostId === hostId && s.facilityId === facilityId);
  }

  public setRecurringSchedule(
    hostId: string,
    facilityId: string,
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      spaceId?: string;
    }>
  ): RecurringAvailabilitySchedule[] {
    const facility = inventoryService.getLocationById(facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    // Remove old schedules for these entries
    this.recurringSchedules = this.recurringSchedules.filter(
      (s) => !(s.hostId === hostId && s.facilityId === facilityId)
    );

    const nowIso = new Date().toISOString();
    for (const item of schedules) {
      this.recurringSchedules.push({
        id: 'sch-' + crypto.randomUUID().substring(0, 8),
        hostId,
        facilityId,
        spaceId: item.spaceId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        isAvailable: item.isAvailable,
        createdAtUtc: nowIso,
        updatedAtUtc: nowIso,
      });
    }

    this.saveToDisk();
    return this.getRecurringSchedules(hostId, facilityId);
  }

  // --------------------------------------------------------------------------
  // Date Overrides & Exceptions (pe_hw_04_03)
  // --------------------------------------------------------------------------

  public getDateOverrides(hostId: string, facilityId: string): AvailabilityOverride[] {
    return this.dateOverrides.filter((o) => o.hostId === hostId && o.facilityId === facilityId);
  }

  public createDateOverride(
    hostId: string,
    override: {
      facilityId: string;
      spaceId?: string;
      date: string;
      isAvailable: boolean;
      startTime?: string;
      endTime?: string;
      reason: string;
    }
  ): AvailabilityOverride {
    const facility = inventoryService.getLocationById(override.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${override.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    const newOverride: AvailabilityOverride = {
      id: 'ovr-' + crypto.randomUUID().substring(0, 8),
      hostId,
      facilityId: override.facilityId,
      spaceId: override.spaceId,
      date: override.date,
      isAvailable: override.isAvailable,
      startTime: override.startTime,
      endTime: override.endTime,
      reason: override.reason.trim(),
      createdAtUtc: new Date().toISOString(),
    };

    this.dateOverrides.unshift(newOverride);
    this.saveToDisk();
    return newOverride;
  }

  public removeDateOverride(hostId: string, overrideId: string): void {
    const idx = this.dateOverrides.findIndex((o) => o.id === overrideId);
    if (idx < 0) {
      throw new NotFoundError(`Override '${overrideId}' not found.`);
    }
    if (this.dateOverrides[idx].hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this override.');
    }
    this.dateOverrides.splice(idx, 1);
    this.saveToDisk();
  }

  // --------------------------------------------------------------------------
  // Maintenance Blocks (pe_hw_04_04)
  // --------------------------------------------------------------------------

  public getMaintenanceBlocks(hostId: string, facilityId?: string): MaintenanceBlock[] {
    return this.maintenanceBlocks.filter((m) => {
      if (m.hostId !== hostId) return false;
      if (facilityId && m.facilityId !== facilityId) return false;
      return true;
    });
  }

  public createMaintenanceBlock(
    hostId: string,
    req: CreateMaintenanceBlockRequest
  ): MaintenanceBlock {
    const facility = inventoryService.getLocationById(req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    const bay = inventoryService.getBayById(req.spaceId);
    if (!bay || bay.locationId !== req.facilityId) {
      throw new NotFoundError(`Space '${req.spaceId}' not found in facility '${req.facilityId}'.`);
    }

    const start = new Date(req.startTimeUtc).getTime();
    const end = new Date(req.endTimeUtc).getTime();

    if (isNaN(start) || isNaN(end) || end <= start) {
      throw new AppError('End time must be strictly after start time.', 400, 'INVALID_TIME_RANGE');
    }

    // MANDATORY INVARIANT: Cannot schedule a maintenance block if it overlaps a confirmed booking!
    const confirmedBookings = bookingService.getAllBookings().filter((b) => {
      if (b.bayId !== req.spaceId) return false;
      if (b.status !== BookingStatus.CONFIRMED && b.status !== BookingStatus.ACTIVE) return false;
      const bStart = new Date(b.startTimeUtc).getTime();
      const bEnd = new Date(b.endTimeUtc).getTime();
      return Math.max(start, bStart) < Math.min(end, bEnd);
    });

    if (confirmedBookings.length > 0) {
      throw new AppError(
        `Cannot create maintenance block. Space ${bay.bayNumber} has confirmed driver reservations during this period (${confirmedBookings[0].id}: ${confirmedBookings[0].startTimeUtc} to ${confirmedBookings[0].endTimeUtc}). Confirmed bookings cannot be overwritten.`,
        409,
        'MAINTENANCE_OVERLAPS_CONFIRMED_BOOKINGS'
      );
    }

    // Also check active holds
    const activeHolds = bookingService.getActiveHolds().filter((h) => {
      if (h.bayId !== req.spaceId) return false;
      const hStart = new Date(h.startTimeUtc).getTime();
      const hEnd = new Date(h.endTimeUtc).getTime();
      return Math.max(start, hStart) < Math.min(end, hEnd);
    });

    if (activeHolds.length > 0) {
      throw new AppError(
        `Cannot create maintenance block. Space ${bay.bayNumber} is locked by an active customer checkout hold. Please retry after checkout completes or expires.`,
        409,
        'MAINTENANCE_OVERLAPS_ACTIVE_HOLD'
      );
    }

    const block: MaintenanceBlock = {
      id: 'mb-' + crypto.randomUUID().substring(0, 8),
      hostId,
      facilityId: req.facilityId,
      spaceId: req.spaceId,
      spaceNumber: bay.bayNumber,
      title: req.title.trim(),
      description: req.description?.trim(),
      startTimeUtc: req.startTimeUtc,
      endTimeUtc: req.endTimeUtc,
      status: 'SCHEDULED',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    };

    this.maintenanceBlocks.unshift(block);
    this.saveToDisk();
    return block;
  }

  public removeMaintenanceBlock(hostId: string, blockId: string): void {
    const idx = this.maintenanceBlocks.findIndex((m) => m.id === blockId);
    if (idx < 0) {
      throw new NotFoundError(`Maintenance block '${blockId}' not found.`);
    }
    if (this.maintenanceBlocks[idx].hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this maintenance block.');
    }

    this.maintenanceBlocks.splice(idx, 1);
    this.saveToDisk();
  }

  // --------------------------------------------------------------------------
  // Validate Availability Change (pe_hw_04_05)
  // --------------------------------------------------------------------------

  public validateAvailabilityChange(
    hostId: string,
    req: ValidateAvailabilityChangeRequest
  ): ValidateAvailabilityChangeResponse {
    const facility = inventoryService.getLocationById(req.facilityId);
    if (!facility) {
      throw new NotFoundError(`Facility '${req.facilityId}' not found.`);
    }
    if (facility.hostId !== hostId) {
      throw new ForbiddenError('Access denied. You do not own this facility.');
    }

    const reqStart = new Date(req.startTimeUtc).getTime();
    const reqEnd = new Date(req.endTimeUtc).getTime();

    const conflicts: PricingConflict[] = [];

    // Find overlapping confirmed bookings
    const confirmedBookings = bookingService.getAllBookings().filter((b) => {
      if (b.locationId !== req.facilityId) return false;
      if (req.spaceId && b.bayId !== req.spaceId) return false;
      if (b.status !== BookingStatus.CONFIRMED && b.status !== BookingStatus.ACTIVE) return false;

      const bStart = new Date(b.startTimeUtc).getTime();
      const bEnd = new Date(b.endTimeUtc).getTime();
      return Math.max(reqStart, bStart) < Math.min(reqEnd, bEnd);
    });

    for (const b of confirmedBookings) {
      conflicts.push({
        id: 'cnf-' + crypto.randomUUID().substring(0, 8),
        facilityId: req.facilityId,
        facilityName: facility.name,
        spaceId: b.bayId,
        spaceNumber: b.bayNumber,
        type: 'CONFIRMED_BOOKING_OVERLAP',
        severity: 'CRITICAL',
        message: `Overlaps confirmed booking ${b.id} (${b.userName}) from ${b.startTimeUtc} to ${b.endTimeUtc}`,
        startTimeUtc: b.startTimeUtc,
        endTimeUtc: b.endTimeUtc,
        bookingReference: b.id,
        suggestedAction: 'Protected reservation: change time window or preserve customer booking.',
      });
    }

    // Find active holds
    const activeHolds = bookingService.getActiveHolds().filter((h) => {
      if (h.locationId !== req.facilityId) return false;
      if (req.spaceId && h.bayId !== req.spaceId) return false;

      const hStart = new Date(h.startTimeUtc).getTime();
      const hEnd = new Date(h.endTimeUtc).getTime();
      return Math.max(reqStart, hStart) < Math.min(reqEnd, hEnd);
    });

    for (const h of activeHolds) {
      const bay = inventoryService.getBayById(h.bayId);
      conflicts.push({
        id: 'cnf-' + crypto.randomUUID().substring(0, 8),
        facilityId: req.facilityId,
        facilityName: facility.name,
        spaceId: h.bayId,
        spaceNumber: bay?.bayNumber,
        type: 'ACTIVE_HOLD_OVERLAP',
        severity: 'CRITICAL',
        message: `Overlaps active customer checkout hold on ${bay?.bayNumber || 'space'} (expires in <10m)`,
        startTimeUtc: h.startTimeUtc,
        endTimeUtc: h.endTimeUtc,
        suggestedAction: 'Wait for customer checkout completion or hold expiration.',
      });
    }

    const hasConflicts = conflicts.length > 0;
    const canApply = !hasConflicts;

    return {
      canApply,
      hasConflicts,
      conflicts,
      protectedBookingsCount: confirmedBookings.length,
      activeHoldsCount: activeHolds.length,
      message: canApply
        ? 'Validation successful. Zero conflicts detected with protected reservations.'
        : `Validation failed: ${conflicts.length} conflict(s) detected with active customer bookings or holds.`,
    };
  }
}

export const availabilityService = AvailabilityService.getInstance();
