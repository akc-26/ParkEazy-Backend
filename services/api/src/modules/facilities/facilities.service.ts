import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ConflictException, ServiceUnavailableException, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import {
  ParkingFacility,
  ParkingSpace,
  CreateFacilityPayload,
  UpdateFacilityPayload,
  CreateSpacePayload,
  BulkCreateSpacesPayload,
  UpdateSpacePayload,
  PublicationReadinessResult,
  PublicListingSummary,
  SpaceStatus,
  VehicleType,
  FuelCompatibility,
  VEHICLE_TYPES,
  FUEL_COMPATIBILITIES,
  ReadinessCheckItem,
  OperatingSchedule,
  FacilityClosure,
  FacilityMaintenance,
  MaintenanceStatus,
  CreateClosurePayload,
  UpdateClosurePayload,
  CreateMaintenancePayload,
  UpdateMaintenancePayload,
} from '@parkeazy/shared-types';
import {
  validateTimezone,
  validateOperatingSchedules,
  validateClosure,
  validateMaintenance,
  validateMaintenanceTransition,
} from '@parkeazy/validation';

export interface FacilityPhotoItem {
  id?: string;
  url: string;
  caption?: string;
  category?: string;
  isCover?: boolean;
  isPrimary?: boolean;
  uploadedAt?: string;
}

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  // In-memory records are strictly an opt-in demo/test fixture, never production inventory.
  private facilities: ParkingFacility[] = [];
  private spaces: ParkingSpace[] = [];
  private schedules: OperatingSchedule[] = [];
  private closures: FacilityClosure[] = [];
  private maintenance: FacilityMaintenance[] = [];
  private readonly demoMode: boolean;

  constructor(@Optional() private readonly databaseService?: DatabaseService) {
    this.demoMode = process.env.NODE_ENV === 'test' || process.env.PARKEAZY_DEMO_MODE === 'true';
    if (this.demoMode) this.seedInitialData();
  }

  private databaseAvailable(): boolean {
    return Boolean(this.databaseService?.getPool() && this.databaseService.getHealthStatus().connected);
  }

  /** Read current published inventory from PostgreSQL for search. Demo fixtures are opt-in only. */
  public async getSearchInventory(tenantId = 'default', arrivalTime?: string, durationHours = 2): Promise<{ facilities: ParkingFacility[]; spaces: ParkingSpace[] }> {
    if (this.databaseAvailable()) {
      const facilityRows = await this.databaseService!.query<any>(
        `SELECT f.*,
          (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=f.id AND s.tenant_id=f.tenant_id) AS total_spaces,
          (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=f.id AND s.tenant_id=f.tenant_id AND s.is_active=TRUE) AS active_spaces
         FROM parking_facilities f WHERE f.tenant_id=$1 AND f.status='published'`, [tenantId]);
      const spaceRows = await this.databaseService!.query<any>(
        `SELECT s.*, (
           s.status='available'
           AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.space_id=s.id AND b.status IN ('confirmed','active') AND b.ends_at > COALESCE($2::timestamptz, NOW()) AND b.starts_at < COALESCE($2::timestamptz, NOW()) + ($3::text || ' hours')::interval)
           AND NOT EXISTS (SELECT 1 FROM facility_closures c WHERE (c.space_id=s.id OR (c.facility_id=s.facility_id AND c.space_id IS NULL)) AND c.ends_at > COALESCE($2::timestamptz, NOW()) AND c.starts_at < COALESCE($2::timestamptz, NOW()) + ($3::text || ' hours')::interval)
           AND NOT EXISTS (SELECT 1 FROM facility_maintenance_periods m WHERE (m.space_id=s.id OR (m.facility_id=s.facility_id AND m.space_id IS NULL)) AND m.status IN ('scheduled', 'in_progress') AND m.ends_at > COALESCE($2::timestamptz, NOW()) AND m.starts_at < COALESCE($2::timestamptz, NOW()) + ($3::text || ' hours')::interval)
         ) AS currently_unbooked
         FROM parking_spaces s JOIN parking_facilities f ON f.id=s.facility_id AND f.tenant_id=s.tenant_id
         WHERE s.tenant_id=$1 AND f.status='published' AND s.is_active=TRUE`, [tenantId, arrivalTime || null, durationHours]);
      const facilities = facilityRows.map((r) => this.mapFacilityRow(r));
      const spaces = spaceRows.map((r) => this.mapSpaceRow(r, r.currently_unbooked ? 'available' : 'occupied'));
      return { facilities, spaces };
    }
    if (this.demoMode) {
      const start = arrivalTime ? new Date(arrivalTime).getTime() : Date.now();
      const end = start + durationHours * 3600 * 1000;
      const spaces = this.spaces.map((s) => {
        let isBlocked = s.status !== 'available';
        if (!isBlocked) {
          const hasClosure = this.closures.some((c) =>
            (c.spaceId === s.id || (c.facilityId === s.facilityId && !c.spaceId)) &&
            new Date(c.endsAt).getTime() > start && new Date(c.startsAt).getTime() < end
          );
          const hasMaint = this.maintenance.some((m) =>
            (m.spaceId === s.id || (m.facilityId === s.facilityId && !m.spaceId)) &&
            (m.status === 'scheduled' || m.status === 'in_progress') &&
            new Date(m.endsAt).getTime() > start && new Date(m.startsAt).getTime() < end
          );
          if (hasClosure || hasMaint) isBlocked = true;
        }
        return { ...s, status: (isBlocked ? 'occupied' : 'available') as SpaceStatus };
      });
      return { facilities: this.facilities, spaces };
    }
    throw new ServiceUnavailableException('Search inventory is unavailable. Configure PostgreSQL and apply migrations, or explicitly enable PARKEAZY_DEMO_MODE=true for local demo data.');
  }

  private mapFacilityRow(r: any): ParkingFacility {
    return {
      id: String(r.id),
      tenantId: String(r.tenant_id),
      hostId: String(r.host_id),
      facilityCode: r.facility_code,
      name: r.name,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2 ?? undefined,
      city: r.city,
      postalCode: r.postal_code,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      timezone: r.timezone ?? 'Asia/Kolkata',
      entranceInstructions: r.entrance_instructions ?? undefined,
      gatePinCode: r.gate_pin_code ?? undefined,
      isCovered: Boolean(r.is_covered),
      is24x7: Boolean(r.is_24_7),
      status: r.status,
      totalSpaces: Number(r.total_spaces ?? 0),
      activeSpaces: Number(r.active_spaces ?? 0),
      amenities: this.asStringArray(r.amenities),
      operatingModel: r.operating_model ?? 'commercial_garage',
      propertyOwner: r.property_owner ?? undefined,
      landmark: r.landmark ?? undefined,
      ingressType: r.ingress_type ?? undefined,
      maxHeightClearanceMeters: r.max_height_clearance_meters == null ? undefined : Number(r.max_height_clearance_meters),
      accessHotline: r.access_hotline ?? undefined,
      turnByTurnDirections: r.turn_by_turn_directions ?? undefined,
      pedestrianAccessInstructions: r.pedestrian_access_instructions ?? undefined,
      photos: Array.isArray(r.photos) ? r.photos : [],
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  private mapSpaceRow(r: any, status?: ParkingSpace['status']): ParkingSpace {
    const isActive = Boolean(r.is_active);
    const rawStatus = String(r.status ?? '').toLowerCase();
    const normalizedStatus: SpaceStatus = (['available', 'occupied', 'reserved', 'maintenance'] as const).includes(rawStatus as SpaceStatus)
      ? rawStatus as SpaceStatus
      : 'available';

    return {
      id: String(r.id),
      facilityId: String(r.facility_id),
      tenantId: String(r.tenant_id),
      bayIdentifier: r.bay_identifier,
      floorLevel: r.floor_level ?? 'Ground',
      vehicleCategory: this.asVehicleType(r.vehicle_category),
      hasEvCharger: Boolean(r.has_ev_charger),
      evChargerPowerKw: r.ev_charger_power_kw == null ? undefined : Number(r.ev_charger_power_kw),
      isDisabledAccessible: Boolean(r.is_disabled_accessible),
      hourlyRateInr: Number(r.hourly_rate_inr),
      isActive,
      // Activity is represented separately by isActive; SpaceStatus intentionally has no "inactive" member.
      status: status ?? normalizedStatus,
      classification: r.classification ?? 'standard',
      stallPosition: r.stall_position ?? 'single_independent',
      maneuverabilityAngle: r.maneuverability_angle ?? '90_perpendicular',
      surfaceFlooring: r.surface_flooring ?? 'epoxy_coated',
      sensorId: r.sensor_id ?? undefined,
      maxLengthMeters: r.max_length_meters == null ? undefined : Number(r.max_length_meters),
      maxWidthMeters: r.max_width_meters == null ? undefined : Number(r.max_width_meters),
      maxHeightMeters: r.max_height_meters == null ? undefined : Number(r.max_height_meters),
      maxWeightTonnes: r.max_weight_tonnes == null ? undefined : Number(r.max_weight_tonnes),
      allowedVehicleCategories: this.asVehicleTypeArray(r.allowed_vehicle_categories),
      fuelCompatibility: this.asFuelCompatibilityArray(r.fuel_compatibility),
      evPlugType: r.ev_plug_type ?? undefined,
      accessMethod: r.access_method ?? undefined,
      amenities: this.asStringArray(r.amenities),
      photos: Array.isArray(r.photos) ? r.photos : [],
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private asVehicleType(value: unknown): VehicleType {
    const candidate = String(value ?? '').toLowerCase();
    if (!(VEHICLE_TYPES as readonly string[]).includes(candidate)) {
      throw new Error(`Unsupported vehicle category in persisted parking space: ${candidate || '(empty)'}`);
    }
    return candidate as VehicleType;
  }

  private asVehicleTypeArray(value: unknown): VehicleType[] {
    return this.asStringArray(value).filter((item): item is VehicleType => (VEHICLE_TYPES as readonly string[]).includes(item));
  }

  private asFuelCompatibilityArray(value: unknown): FuelCompatibility[] {
    return this.asStringArray(value).filter((item): item is FuelCompatibility => (FUEL_COMPATIBILITIES as readonly string[]).includes(item));
  }

  private asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }
    return [];
  }

  private seedInitialData() {
    const defaultHostId = '00000000-0000-4000-a000-000000000002'; // Host A
    const tenantId = 'default';

    // Seed 1: Anna Nagar Plaza
    const fac1: ParkingFacility = {
      id: '7bf5f8dd-95b9-426e-993f-e747271ae424',
      tenantId,
      hostId: defaultHostId,
      facilityCode: '#FAC-0104',
      name: 'Anna Nagar Plaza Covered Garage',
      addressLine1: '12 2nd Avenue, Anna Nagar',
      city: 'Chennai',
      postalCode: '600040',
      latitude: 13.0850,
      longitude: 80.2100,
      isCovered: true,
      is24x7: true,
      status: 'published',
      totalSpaces: 24,
      activeSpaces: 24,
      amenities: ['ev_charger', 'covered_roof', 'cctv_security', 'guard_on_duty', 'elevator_access'],
      operatingModel: 'commercial_garage',
      maxHeightClearanceMeters: 2.4,
      entranceInstructions: 'Enter through North Ramp Gate 2. Scan mobile pass at ANPR barrier.',
      gatePinCode: '7492',
      accessHotline: '+91 44 2621 8899',
      turnByTurnDirections: 'Take 2nd Avenue, turn left after Anna Arch into plaza basement ramp.',
      pedestrianAccessInstructions: 'Take Core B Elevator to ground plaza. Night access PIN is 1984.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Seed 2: T. Nagar Grand Mall
    const fac2: ParkingFacility = {
      id: '55cd66fe-883f-4746-930c-87cb94870445',
      tenantId,
      hostId: defaultHostId,
      facilityCode: '#FAC-0105',
      name: 'T. Nagar Commercial Center',
      addressLine1: '45 Usman Road, T. Nagar',
      city: 'Chennai',
      postalCode: '600017',
      latitude: 13.0400,
      longitude: 80.2330,
      isCovered: true,
      is24x7: false,
      status: 'published',
      totalSpaces: 36,
      activeSpaces: 36,
      amenities: ['covered_roof', 'cctv_security', 'elevator_access'],
      operatingModel: 'commercial_garage',
      maxHeightClearanceMeters: 2.1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Seed 3: OMR Tech Hub
    const fac3: ParkingFacility = {
      id: '666843f5-aefe-4ca4-b4a2-750dfc1ee312',
      tenantId,
      hostId: defaultHostId,
      facilityCode: '#FAC-0106',
      name: 'OMR Cyber Gateway Parking',
      addressLine1: '100 Rajiv Gandhi Salai, Sholinganallur',
      city: 'Chennai',
      postalCode: '600119',
      latitude: 12.9000,
      longitude: 80.2280,
      isCovered: false,
      is24x7: true,
      status: 'published',
      totalSpaces: 48,
      activeSpaces: 48,
      amenities: ['ev_charger', 'cctv_security'],
      operatingModel: 'open_ground',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.facilities = [fac1, fac2, fac3];

    // Seed 24 bays for Anna Nagar Plaza
    for (let i = 1; i <= 12; i++) {
      const bayNum = i < 10 ? `0${i}` : `${i}`;
      this.spaces.push({
        id: `sp-anna-a${bayNum}`,
        facilityId: fac1.id,
        tenantId,
        bayIdentifier: `A-${bayNum}`,
        floorLevel: 'Basement 1',
        vehicleCategory: 'car',
        hasEvCharger: i === 4,
        evChargerPowerKw: i === 4 ? 22 : undefined,
        isDisabledAccessible: i === 1,
        hourlyRateInr: i === 4 ? 60 : 40,
        isActive: true,
        status: 'available',
        classification: i === 4 ? 'oversized' : 'standard',
        stallPosition: 'single_independent',
        maneuverabilityAngle: '90_perpendicular',
        surfaceFlooring: 'epoxy_coated',
        maxLengthMeters: 5.4,
        maxWidthMeters: 2.5,
        maxHeightMeters: 2.4,
        maxWeightTonnes: 3.5,
        allowedVehicleCategories: ['car', 'suv'],
        fuelCompatibility: ['petrol', 'diesel', 'electric'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    for (let i = 1; i <= 12; i++) {
      const bayNum = i < 10 ? `0${i}` : `${i}`;
      this.spaces.push({
        id: `sp-anna-b${bayNum}`,
        facilityId: fac1.id,
        tenantId,
        bayIdentifier: `B-${bayNum}`,
        floorLevel: 'Basement 2',
        vehicleCategory: i > 10 ? 'bike' : 'car',
        hasEvCharger: false,
        isDisabledAccessible: false,
        hourlyRateInr: i > 10 ? 20 : 40,
        isActive: true,
        status: 'available',
        classification: 'standard',
        stallPosition: 'single_independent',
        maneuverabilityAngle: '90_perpendicular',
        surfaceFlooring: 'epoxy_coated',
        maxLengthMeters: 5.0,
        maxWidthMeters: 2.4,
        maxHeightMeters: 2.2,
        maxWeightTonnes: 3.0,
        allowedVehicleCategories: i > 10 ? ['bike'] : ['car'],
        fuelCompatibility: ['petrol', 'diesel'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.logger.warn(`DEMO/TEST FIXTURES ONLY: initialized ${this.facilities.length} facilities and ${this.spaces.length} spaces; these are not live inventory.`);
  }

  // --- Facilities Management ---

  public async listHostFacilities(hostId: string, tenantId: string = 'default'): Promise<ParkingFacility[]> {
    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(`SELECT f.*, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=f.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=f.id AND s.is_active=TRUE) AS active_spaces FROM parking_facilities f WHERE f.tenant_id=$1 AND f.host_id=$2 ORDER BY f.created_at DESC`, [tenantId, hostId]);
      return rows.map((r) => this.mapFacilityRow(r));
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    return this.facilities.filter((f) => f.tenantId === tenantId && f.hostId === hostId);
  }

  public async getFacility(id: string, hostId?: string, tenantId: string = 'default'): Promise<ParkingFacility> {
    if (this.databaseAvailable()) {
      const params: unknown[] = [id, tenantId];
      const hostClause = hostId ? ' AND f.host_id=$3' : '';
      if (hostId) params.push(hostId);
      const rows = await this.databaseService!.query<any>(`SELECT f.*, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=f.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=f.id AND s.is_active=TRUE) AS active_spaces FROM parking_facilities f WHERE f.id=$1 AND f.tenant_id=$2${hostClause}`, params);
      if (!rows[0]) {
        const exists = await this.databaseService!.query<any>('SELECT host_id FROM parking_facilities WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        if (hostId && exists[0] && exists[0].host_id !== hostId) throw new ForbiddenException('You do not have permission to access this facility');
        throw new NotFoundException(`Facility with ID ${id} not found`);
      }
      return this.mapFacilityRow(rows[0]);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const facility = this.facilities.find((f) => f.id === id && f.tenantId === tenantId);
    if (!facility) {
      throw new NotFoundException(`Facility with ID ${id} not found`);
    }
    if (hostId && facility.hostId !== hostId) {
      throw new ForbiddenException('You do not have permission to access this facility');
    }
    return facility;
  }

  public async createFacility(
    hostId: string,
    tenantId: string = 'default',
    payload: CreateFacilityPayload
  ): Promise<ParkingFacility> {
    let facilityTimezone = 'Asia/Kolkata';
    if (payload.timezone) {
      const tzVal = validateTimezone(payload.timezone);
      if (!tzVal.success) {
        throw new BadRequestException(tzVal.errors.join(', '));
      }
      facilityTimezone = tzVal.data!;
    }

    if (this.databaseAvailable()) {
      const code = payload.facilityCode || `FAC-${Date.now().toString().slice(-12)}`;
      const rows = await this.databaseService!.query<any>(
        `INSERT INTO parking_facilities (
          tenant_id, host_id, facility_code, name, address_line1, address_line2, city, postal_code,
          latitude, longitude, entrance_instructions, gate_pin_code, is_covered, is_24_7, status,
          amenities, ingress_type, property_owner, landmark, max_height_clearance_meters, access_hotline,
          turn_by_turn_directions, pedestrian_access_instructions, photos, operating_model, timezone
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft',$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24,$25
        ) RETURNING *, 0::int AS total_spaces, 0::int AS active_spaces`,
        [
          tenantId, hostId, code, payload.name, payload.addressLine1, payload.addressLine2 || null, payload.city, payload.postalCode,
          payload.latitude, payload.longitude, payload.entranceInstructions || null, payload.gatePinCode || null, payload.isCovered ?? true,
          payload.is24x7 ?? true, JSON.stringify(payload.amenities || []), payload.ingressType || 'two_way_ramp', payload.propertyOwner || null,
          payload.landmark || null, payload.maxHeightClearanceMeters || 2.1, payload.accessHotline || null, payload.turnByTurnDirections || null,
          payload.pedestrianAccessInstructions || null, JSON.stringify(payload.photos || []), payload.operatingModel || 'commercial_garage',
          facilityTimezone
        ]
      );
      return this.mapFacilityRow(rows[0]);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const id = `fac-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const facilityCount = this.facilities.filter((f) => f.tenantId === tenantId).length + 1;
    const facilityCode = payload.facilityCode || `#FAC-${String(facilityCount).padStart(4, '0')}`;

    const newFacility: ParkingFacility = {
      id,
      tenantId,
      hostId,
      facilityCode,
      name: payload.name,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      postalCode: payload.postalCode,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timezone: facilityTimezone,
      operatingModel: payload.operatingModel || 'commercial_garage',
      propertyOwner: payload.propertyOwner,
      landmark: payload.landmark,
      entranceInstructions: payload.entranceInstructions,
      gatePinCode: payload.gatePinCode,
      ingressType: payload.ingressType || 'two_way_ramp',
      maxHeightClearanceMeters: payload.maxHeightClearanceMeters || 2.1,
      accessHotline: payload.accessHotline,
      turnByTurnDirections: payload.turnByTurnDirections,
      pedestrianAccessInstructions: payload.pedestrianAccessInstructions,
      isCovered: payload.isCovered ?? true,
      is24x7: payload.is24x7 ?? true,
      amenities: payload.amenities || [],
      photos: payload.photos || [],
      status: 'draft',
      totalSpaces: 0,
      activeSpaces: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.facilities.push(newFacility);

    // Initialize default weekly schedule (7 days)
    for (let day = 0; day <= 6; day++) {
      this.schedules.push({
        id: `sched-${id}-${day}`,
        facilityId: id,
        tenantId,
        dayOfWeek: day,
        openTime: '00:00',
        closeTime: '23:59',
        isClosed: false,
        isOvernight: false,
      });
    }

    this.logger.log(`Created new facility ${facilityCode} (${id}) for host ${hostId}`);
    return newFacility;
  }

  public async updateFacility(
    id: string,
    hostId: string,
    tenantId: string = 'default',
    payload: UpdateFacilityPayload
  ): Promise<ParkingFacility> {
    if (payload.timezone) {
      const tzVal = validateTimezone(payload.timezone);
      if (!tzVal.success) {
        throw new BadRequestException(tzVal.errors.join(', '));
      }
    }

    if (this.databaseAvailable()) {
      const columns: Record<string, string> = {
        facilityCode: 'facility_code',
        name: 'name',
        addressLine1: 'address_line1',
        addressLine2: 'address_line2',
        city: 'city',
        postalCode: 'postal_code',
        latitude: 'latitude',
        longitude: 'longitude',
        timezone: 'timezone',
        entranceInstructions: 'entrance_instructions',
        gatePinCode: 'gate_pin_code',
        isCovered: 'is_covered',
        is24x7: 'is_24_7',
        amenities: 'amenities',
        operatingModel: 'operating_model',
        propertyOwner: 'property_owner',
        landmark: 'landmark',
        ingressType: 'ingress_type',
        maxHeightClearanceMeters: 'max_height_clearance_meters',
        accessHotline: 'access_hotline',
        turnByTurnDirections: 'turn_by_turn_directions',
        pedestrianAccessInstructions: 'pedestrian_access_instructions',
        photos: 'photos'
      };
      const sets: string[] = [];
      const values: unknown[] = [id, tenantId, hostId];
      for (const [key, column] of Object.entries(columns)) {
        if ((payload as any)[key] !== undefined) {
          values.push(['amenities', 'photos'].includes(key) ? JSON.stringify((payload as any)[key]) : (payload as any)[key]);
          sets.push(`${column}=$${values.length}${['amenities', 'photos'].includes(key) ? '::jsonb' : ''}`);
        }
      }
      if (sets.length) {
        sets.push('updated_at=NOW()');
        const rows = await this.databaseService!.query<any>(
          `UPDATE parking_facilities SET ${sets.join(', ')} WHERE id=$1 AND tenant_id=$2 AND host_id=$3 RETURNING *, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id AND s.is_active=TRUE) AS active_spaces`,
          values
        );
        if (rows[0]) return this.mapFacilityRow(rows[0]);
      }
      return this.getFacility(id, hostId, tenantId);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const facility = await this.getFacility(id, hostId, tenantId);
    const safePayload = { ...payload };
    delete (safePayload as any).id;
    delete (safePayload as any).hostId;
    delete (safePayload as any).tenantId;
    delete (safePayload as any).createdAt;
    delete (safePayload as any).status;
    Object.assign(facility, safePayload, { updatedAt: new Date().toISOString() });
    return facility;
  }

  // --- Spaces Management ---

  public async listSpaces(facilityId: string, hostId?: string, tenantId: string = 'default'): Promise<ParkingSpace[]> {
    if (this.databaseAvailable()) {
      if (hostId) await this.getFacility(facilityId, hostId, tenantId);
      const rows = await this.databaseService!.query<any>('SELECT * FROM parking_spaces WHERE facility_id=$1 AND tenant_id=$2 ORDER BY bay_identifier', [facilityId, tenantId]);
      return rows.map((r) => this.mapSpaceRow(r));
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Space storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    if (hostId) {
      await this.getFacility(facilityId, hostId, tenantId);
    }
    return this.spaces.filter((s) => s.facilityId === facilityId && s.tenantId === tenantId);
  }

  public async getSpace(id: string, tenantId: string = 'default', hostId?: string): Promise<ParkingSpace> {
    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>('SELECT * FROM parking_spaces WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
      if (!rows[0]) throw new NotFoundException(`Parking space ${id} not found`);
      const space = this.mapSpaceRow(rows[0]);
      if (hostId) await this.getFacility(space.facilityId, hostId, tenantId);
      return space;
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Space storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const space = this.spaces.find((s) => s.id === id && s.tenantId === tenantId);
    if (!space) {
      throw new NotFoundException(`Parking space ${id} not found`);
    }
    if (hostId) await this.getFacility(space.facilityId, hostId, tenantId);
    return space;
  }

  public async createSpace(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: CreateSpacePayload
  ): Promise<ParkingSpace> {
    if (this.databaseAvailable()) {
      await this.getFacility(facilityId, hostId, tenantId);
      try {
        const rows = await this.databaseService!.query<any>(`INSERT INTO parking_spaces (facility_id, tenant_id, bay_identifier, floor_level, vehicle_category, has_ev_charger, ev_charger_power_kw, is_disabled_accessible, hourly_rate_inr, is_active, status, classification, stall_position, maneuverability_angle, surface_flooring, sensor_id, max_length_meters, max_width_meters, max_height_meters, max_weight_tonnes, allowed_vehicle_categories, fuel_compatibility, ev_plug_type, access_method, amenities, photos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,'available',$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb,$21,$22,$23::jsonb,$24::jsonb) RETURNING *`, [facilityId, tenantId, payload.bayIdentifier.toUpperCase(), payload.floorLevel || 'Ground', payload.vehicleCategory || 'car', payload.hasEvCharger ?? false, payload.evChargerPowerKw ?? null, payload.isDisabledAccessible ?? false, payload.hourlyRateInr, payload.classification || 'standard', payload.stallPosition || 'single_independent', payload.maneuverabilityAngle || '90_perpendicular', payload.surfaceFlooring || 'epoxy_coated', payload.sensorId || null, payload.maxLengthMeters || 5.4, payload.maxWidthMeters || 2.5, payload.maxHeightMeters || 2.4, payload.maxWeightTonnes || 3.5, JSON.stringify(payload.allowedVehicleCategories || [payload.vehicleCategory || 'car']), JSON.stringify(payload.fuelCompatibility || ['petrol','diesel','electric']), payload.evPlugType || null, payload.accessMethod || null, JSON.stringify(payload.amenities || []), JSON.stringify(payload.photos || [])]);
        return this.mapSpaceRow(rows[0]);
      } catch (error: any) { if (error?.code === '23505') throw new BadRequestException(`Bay identifier ${payload.bayIdentifier} already exists in this facility`); throw error; }
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Space storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const facility = await this.getFacility(facilityId, hostId, tenantId);

    // Duplicate bay identifier check
    const existing = this.spaces.find(
      (s) => s.facilityId === facilityId && s.bayIdentifier.toUpperCase() === payload.bayIdentifier.toUpperCase()
    );
    if (existing) {
      throw new BadRequestException(`Bay identifier ${payload.bayIdentifier} already exists in this facility`);
    }

    const spaceId = `sp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newSpace: ParkingSpace = {
      id: spaceId,
      facilityId,
      tenantId,
      bayIdentifier: payload.bayIdentifier.toUpperCase(),
      floorLevel: payload.floorLevel || 'Ground',
      vehicleCategory: payload.vehicleCategory || 'car',
      hasEvCharger: payload.hasEvCharger ?? false,
      evChargerPowerKw: payload.evChargerPowerKw,
      isDisabledAccessible: payload.isDisabledAccessible ?? false,
      hourlyRateInr: payload.hourlyRateInr,
      isActive: true,
      status: 'available',
      classification: payload.classification || 'standard',
      stallPosition: payload.stallPosition || 'single_independent',
      maneuverabilityAngle: payload.maneuverabilityAngle || '90_perpendicular',
      surfaceFlooring: payload.surfaceFlooring || 'epoxy_coated',
      sensorId: payload.sensorId,
      maxLengthMeters: payload.maxLengthMeters || 5.4,
      maxWidthMeters: payload.maxWidthMeters || 2.5,
      maxHeightMeters: payload.maxHeightMeters || 2.4,
      maxWeightTonnes: payload.maxWeightTonnes || 3.5,
      allowedVehicleCategories: payload.allowedVehicleCategories || [payload.vehicleCategory || 'car'],
      fuelCompatibility: payload.fuelCompatibility || ['petrol', 'diesel', 'electric'],
      evPlugType: payload.evPlugType,
      accessMethod: payload.accessMethod,
      amenities: payload.amenities,
      photos: payload.photos,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.spaces.push(newSpace);
    facility.totalSpaces = this.spaces.filter((s) => s.facilityId === facilityId).length;
    facility.activeSpaces = this.spaces.filter((s) => s.facilityId === facilityId && s.isActive).length;

    return newSpace;
  }

  public async bulkCreateSpaces(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: BulkCreateSpacesPayload | { spaces: CreateSpacePayload[] }
  ): Promise<ParkingSpace[]> {
    await this.getFacility(facilityId, hostId, tenantId);
    const created: ParkingSpace[] = [];

    if ('spaces' in payload && Array.isArray(payload.spaces)) {
      for (const spaceData of payload.spaces) {
        const space = await this.createSpace(facilityId, hostId, tenantId, spaceData);
        created.push(space);
      }
      return created;
    }

    const bulkPayload = payload as any;
    const startNum = bulkPayload.startNumber ?? 1;
    const endNum = bulkPayload.endNumber ?? (bulkPayload.count ? startNum + bulkPayload.count - 1 : startNum);
    const prefix = typeof bulkPayload.prefix === 'string' ? bulkPayload.prefix : 'BAY-';

    for (let i = startNum; i <= endNum; i++) {
      const bayNum = i < 10 ? `0${i}` : `${i}`;
      const bayIdentifier = prefix.endsWith('-') ? `${prefix}${bayNum}` : `${prefix}-${bayNum}`;

      // Skip duplicates if any
      const existing = this.databaseAvailable()
        ? (await this.databaseService!.query<any>('SELECT id FROM parking_spaces WHERE facility_id=$1 AND tenant_id=$2 AND UPPER(bay_identifier)=UPPER($3)', [facilityId, tenantId, bayIdentifier])).length > 0
        : this.spaces.some((s) => s.facilityId === facilityId && s.tenantId === tenantId && s.bayIdentifier.toUpperCase() === bayIdentifier.toUpperCase());
      if (!existing) {
        const space = await this.createSpace(facilityId, hostId, tenantId, {
          bayIdentifier,
          floorLevel: bulkPayload.floorLevel,
          vehicleCategory: bulkPayload.vehicleCategory,
          hourlyRateInr: bulkPayload.hourlyRateInr,
          classification: bulkPayload.classification,
          hasEvCharger: bulkPayload.hasEvCharger,
          isDisabledAccessible: bulkPayload.isDisabledAccessible,
        });
        created.push(space);
      }
    }

    return created;
  }

  public async updateSpace(
    spaceId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: UpdateSpacePayload
  ): Promise<ParkingSpace> {
    if (this.databaseAvailable()) {
      const space = await this.getSpace(spaceId, tenantId, hostId);
      await this.getFacility(space.facilityId, hostId, tenantId);
      const columns: Record<string, string> = { bayIdentifier: 'bay_identifier', floorLevel: 'floor_level', vehicleCategory: 'vehicle_category', hasEvCharger: 'has_ev_charger', evChargerPowerKw: 'ev_charger_power_kw', isDisabledAccessible: 'is_disabled_accessible', hourlyRateInr: 'hourly_rate_inr', isActive: 'is_active', classification: 'classification', stallPosition: 'stall_position', maneuverabilityAngle: 'maneuverability_angle', surfaceFlooring: 'surface_flooring', sensorId: 'sensor_id', maxLengthMeters: 'max_length_meters', maxWidthMeters: 'max_width_meters', maxHeightMeters: 'max_height_meters', maxWeightTonnes: 'max_weight_tonnes', allowedVehicleCategories: 'allowed_vehicle_categories', fuelCompatibility: 'fuel_compatibility', evPlugType: 'ev_plug_type', accessMethod: 'access_method', amenities: 'amenities', photos: 'photos' };
      const sets: string[] = []; const values: unknown[] = [spaceId, tenantId];
      for (const [key, column] of Object.entries(columns)) if ((payload as any)[key] !== undefined) { values.push(['allowedVehicleCategories','fuelCompatibility','amenities','photos'].includes(key) ? JSON.stringify((payload as any)[key]) : (payload as any)[key]); sets.push(`${column}=$${values.length}${['allowedVehicleCategories','fuelCompatibility','amenities','photos'].includes(key) ? '::jsonb' : ''}`); }
      if (sets.length) { sets.push('updated_at=NOW()'); const rows = await this.databaseService!.query<any>(`UPDATE parking_spaces SET ${sets.join(', ')} WHERE id=$1 AND tenant_id=$2 RETURNING *`, values); if (rows[0]) return this.mapSpaceRow(rows[0]); }
      return this.getSpace(spaceId, tenantId, hostId);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Space storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const space = await this.getSpace(spaceId, tenantId, hostId);
    await this.getFacility(space.facilityId, hostId, tenantId);
    const safePayload = { ...payload };
    delete (safePayload as any).id;
    delete (safePayload as any).facilityId;
    delete (safePayload as any).tenantId;
    delete (safePayload as any).createdAt;
    Object.assign(space, safePayload, { updatedAt: new Date().toISOString() });
    return space;
  }

  public async updateSpaceStatus(
    spaceId: string,
    hostId: string,
    tenantId: string = 'default',
    status: SpaceStatus
  ): Promise<ParkingSpace> {
    if (this.databaseAvailable()) {
      const space = await this.getSpace(spaceId, tenantId, hostId); await this.getFacility(space.facilityId, hostId, tenantId);
      const rows = await this.databaseService!.query<any>('UPDATE parking_spaces SET status=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *', [status, spaceId, tenantId]);
      if (!rows[0]) throw new NotFoundException(`Parking space ${spaceId} not found`);
      return this.mapSpaceRow(rows[0]);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Space storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const space = await this.getSpace(spaceId);
    await this.getFacility(space.facilityId, hostId, tenantId);
    space.status = status; space.updatedAt = new Date().toISOString(); return space;
  }

  // --- Publication Readiness & Lifecycle ---

  public async getPublicationReadiness(
    facilityId: string,
    hostId?: string,
    tenantId: string = 'default'
  ): Promise<PublicationReadinessResult> {
    const facility = await this.getFacility(facilityId, hostId, tenantId);
    const facilitySpaces = await this.listSpaces(facilityId, hostId, tenantId);

    const checks: ReadinessCheckItem[] = [
      {
        id: 'gps_coordinates',
        label: 'Geographic GPS Pin',
        passed: !!(facility.latitude && facility.longitude),
        category: 'facility',
        message: 'Valid coordinates registered for driver turn-by-turn navigation',
      },
      {
        id: 'physical_address',
        label: 'Complete Street Address',
        passed: !!(facility.addressLine1 && facility.city && facility.postalCode),
        category: 'facility',
        message: 'Postal address verified',
      },
      {
        id: 'bay_inventory',
        label: 'Physical Bay Inventory',
        passed: facilitySpaces.length > 0,
        category: 'space',
        message: facilitySpaces.length > 0 ? `${facilitySpaces.length} bays assigned` : 'At least 1 bay required',
      },
      {
        id: 'pricing_configured',
        label: 'Tariffs & Rates Configured',
        passed: facilitySpaces.some((s) => s.hourlyRateInr > 0),
        category: 'pricing',
        message: 'Active hourly rates configured',
      },
      {
        id: 'entrance_instructions',
        label: 'Gate Directives & Access Guidance',
        passed: !!facility.entranceInstructions || !!facility.gatePinCode,
        category: 'facility',
        message: 'Access instructions provided for arriving motorists',
      },
      {
        id: 'clearance_height',
        label: 'Height Clearance Defined',
        passed: (facility.maxHeightClearanceMeters || 0) > 0,
        category: 'facility',
        message: `${facility.maxHeightClearanceMeters}m clearance registered`,
      },
      {
        id: 'operating_model',
        label: 'Operating Architecture',
        passed: !!facility.operatingModel,
        category: 'facility',
        message: `Registered as ${facility.operatingModel}`,
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);
    const canPublish = checks.every((c) => c.passed);

    const missingRequirements = checks.filter((c) => !c.passed).map((c) => c.label);

    return {
      facilityId,
      isReady: canPublish,
      score,
      checks,
      canPublish,
      missingRequirements,
    };
  }

  public async publishFacility(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<ParkingFacility> {
    const readiness = await this.getPublicationReadiness(facilityId, hostId, tenantId);
    if (!readiness.canPublish) {
      throw new BadRequestException(
        `Facility cannot be published. Missing requirements: ${readiness.missingRequirements.join(', ')}`
      );
    }

    const facility = await this.getFacility(facilityId, hostId, tenantId);
    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(`UPDATE parking_facilities SET status='published', updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND host_id=$3 RETURNING *, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id AND s.is_active=TRUE) AS active_spaces`, [facilityId, tenantId, hostId]);
      if (!rows[0]) throw new NotFoundException(`Facility with ID ${facilityId} not found`);
      return this.mapFacilityRow(rows[0]);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const now = new Date().toISOString();
    facility.status = 'published';
    (facility as any).publishedAt = now;
    facility.updatedAt = now;
    this.logger.log(`Facility ${facility.facilityCode} (${facilityId}) published to marketplace`);
    return facility;
  }

  public async unpublishFacility(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<ParkingFacility> {
    const facility = await this.getFacility(facilityId, hostId, tenantId);
    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `UPDATE parking_facilities SET status='draft', updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND host_id=$3 RETURNING *, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id AND s.is_active=TRUE) AS active_spaces`,
        [facilityId, tenantId, hostId]
      );
      if (!rows[0]) throw new NotFoundException(`Facility with ID ${facilityId} not found`);
      return this.mapFacilityRow(rows[0]);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    facility.status = 'draft';
    facility.updatedAt = new Date().toISOString();
    this.logger.log(`Facility ${facility.facilityCode} (${facilityId}) unpublished to draft`);
    return facility;
  }

  public async updateFacilityStatus(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    status: 'draft' | 'published' | 'suspended' | 'archived' | 'under_review'
  ): Promise<ParkingFacility> {
    const allowed = ['draft', 'published', 'suspended', 'archived', 'under_review'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid publication status '${status}'. Permitted statuses are: ${allowed.join(', ')}`);
    }

    if (status === 'published') {
      return this.publishFacility(facilityId, hostId, tenantId);
    }

    const facility = await this.getFacility(facilityId, hostId, tenantId);
    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `UPDATE parking_facilities SET status=$1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND host_id=$4 RETURNING *, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id AND s.is_active=TRUE) AS active_spaces`,
        [status, facilityId, tenantId, hostId]
      );
      if (!rows[0]) throw new NotFoundException(`Facility with ID ${facilityId} not found`);
      return this.mapFacilityRow(rows[0]);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    facility.status = status as any;
    facility.updatedAt = new Date().toISOString();
    return facility;
  }

  public async deleteFacility(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<{ success: boolean; message: string }> {
    await this.getFacility(facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      // Check for active or confirmed bookings
      const activeBookings = await this.databaseService!.query<any>(
        `SELECT id FROM bookings WHERE facility_id=$1 AND tenant_id=$2 AND status IN ('confirmed', 'active') LIMIT 1`,
        [facilityId, tenantId]
      );
      if (activeBookings && activeBookings.length > 0) {
        throw new BadRequestException('Cannot delete facility with active or confirmed bookings. Please suspend or unpublish the facility instead.');
      }

      const pool = this.databaseService?.getPool();
      if (!pool) throw new ServiceUnavailableException('Database pool is unavailable');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM parking_spaces WHERE facility_id=$1 AND tenant_id=$2', [facilityId, tenantId]);
        await client.query('DELETE FROM parking_facilities WHERE id=$1 AND tenant_id=$2 AND host_id=$3', [facilityId, tenantId, hostId]);
        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    if (this.demoMode) {
      this.spaces = this.spaces.filter((s) => s.facilityId !== facilityId);
      this.facilities = this.facilities.filter((f) => f.id !== facilityId);
    }

    return { success: true, message: `Facility ${facilityId} removed successfully.` };
  }

  public async deleteSpace(
    spaceId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<{ success: boolean; message: string }> {
    const space = await this.getSpace(spaceId, tenantId, hostId);
    const facility = await this.getFacility(space.facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      const activeBookings = await this.databaseService!.query<any>(
        `SELECT id FROM bookings WHERE space_id=$1 AND tenant_id=$2 AND status IN ('confirmed', 'active') LIMIT 1`,
        [spaceId, tenantId]
      );
      if (activeBookings && activeBookings.length > 0) {
        throw new BadRequestException('Cannot delete space with active or confirmed bookings.');
      }

      await this.databaseService!.query('DELETE FROM parking_spaces WHERE id=$1 AND tenant_id=$2', [spaceId, tenantId]);
    }

    if (this.demoMode) {
      this.spaces = this.spaces.filter((s) => s.id !== spaceId);
      facility.totalSpaces = this.spaces.filter((s) => s.facilityId === space.facilityId).length;
      facility.activeSpaces = this.spaces.filter((s) => s.facilityId === space.facilityId && s.isActive).length;
    }

    return { success: true, message: `Parking space ${space.bayIdentifier} removed successfully.` };
  }

  public async bulkUpdateSpaces(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    updates: (Partial<UpdateSpacePayload> & { id: string })[]
  ): Promise<ParkingSpace[]> {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('An array of space update items is required.');
    }

    await this.getFacility(facilityId, hostId, tenantId);

    // Validate that all spaces belong to this facility
    for (const update of updates) {
      if (!update.id) {
        throw new BadRequestException('Each space update must include a valid space id.');
      }
      const existing = await this.getSpace(update.id, tenantId, hostId);
      if (existing.facilityId !== facilityId) {
        throw new BadRequestException(`Space '${update.id}' does not belong to facility '${facilityId}'. Reassignment is rejected.`);
      }
    }

    if (this.databaseAvailable()) {
      const pool = this.databaseService?.getPool();
      if (!pool) throw new ServiceUnavailableException('Database pool is unavailable');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const columns: Record<string, string> = {
          bayIdentifier: 'bay_identifier',
          floorLevel: 'floor_level',
          vehicleCategory: 'vehicle_category',
          hasEvCharger: 'has_ev_charger',
          evChargerPowerKw: 'ev_charger_power_kw',
          isDisabledAccessible: 'is_disabled_accessible',
          hourlyRateInr: 'hourly_rate_inr',
          isActive: 'is_active',
          classification: 'classification',
          stallPosition: 'stall_position',
          maneuverabilityAngle: 'maneuverability_angle',
          surfaceFlooring: 'surface_flooring',
          sensorId: 'sensor_id',
          maxLengthMeters: 'max_length_meters',
          maxWidthMeters: 'max_width_meters',
          maxHeightMeters: 'max_height_meters',
          maxWeightTonnes: 'max_weight_tonnes',
          allowedVehicleCategories: 'allowed_vehicle_categories',
          fuelCompatibility: 'fuel_compatibility',
          evPlugType: 'ev_plug_type',
          accessMethod: 'access_method',
          amenities: 'amenities',
          photos: 'photos',
        };

        const updatedSpaces: ParkingSpace[] = [];
        for (const update of updates) {
          const sets: string[] = [];
          const values: unknown[] = [update.id, tenantId, facilityId];

          for (const [key, column] of Object.entries(columns)) {
            if ((update as any)[key] !== undefined) {
              const isJson = ['allowedVehicleCategories', 'fuelCompatibility', 'amenities', 'photos'].includes(key);
              values.push(isJson ? JSON.stringify((update as any)[key]) : (update as any)[key]);
              sets.push(`${column}=$${values.length}${isJson ? '::jsonb' : ''}`);
            }
          }

          if (sets.length > 0) {
            sets.push('updated_at=NOW()');
            const res = await client.query<any>(
              `UPDATE parking_spaces SET ${sets.join(', ')} WHERE id=$1 AND tenant_id=$2 AND facility_id=$3 RETURNING *`,
              values
            );
            if (res.rows[0]) {
              updatedSpaces.push(this.mapSpaceRow(res.rows[0]));
            }
          } else {
            const current = await this.getSpace(update.id, tenantId, hostId);
            updatedSpaces.push(current);
          }
        }
        await client.query('COMMIT');
        return updatedSpaces;
      } catch (err: any) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    if (!this.demoMode) throw new ServiceUnavailableException('Space storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const results: ParkingSpace[] = [];
    for (const update of updates) {
      const space = await this.getSpace(update.id, tenantId, hostId);
      const safe = { ...update };
      delete (safe as any).id;
      delete (safe as any).facilityId;
      delete (safe as any).tenantId;
      Object.assign(space, safe, { updatedAt: new Date().toISOString() });
      results.push(space);
    }
    return results;
  }

  public async addFacilityPhoto(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    photo: Partial<FacilityPhotoItem>
  ): Promise<ParkingFacility> {
    if (!photo.url || typeof photo.url !== 'string' || photo.url.trim().length === 0) {
      throw new BadRequestException('A valid photo url is required.');
    }

    const facility = await this.getFacility(facilityId, hostId, tenantId);
    const photos: any[] = Array.isArray(facility.photos) ? [...facility.photos] : [];
    const isFirst = photos.length === 0;
    const isCover = photo.isCover !== undefined ? photo.isCover : isFirst;

    if (isCover) {
      photos.forEach((p) => { p.isCover = false; p.isPrimary = false; });
    }

    const newPhoto = {
      id: photo.id || `pho-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      url: photo.url,
      caption: photo.caption || undefined,
      category: photo.category || 'overview',
      isCover,
      isPrimary: isCover,
      createdAt: new Date().toISOString(),
    };
    photos.push(newPhoto);

    return this.updateFacility(facilityId, hostId, tenantId, { photos });
  }

  public async deleteFacilityPhoto(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    photoId: string
  ): Promise<ParkingFacility> {
    const facility = await this.getFacility(facilityId, hostId, tenantId);
    const photos: any[] = Array.isArray(facility.photos) ? [...facility.photos] : [];
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx === -1) {
      throw new NotFoundException(`Photo with ID '${photoId}' not found on facility.`);
    }

    const wasCover = photos[idx].isCover || photos[idx].isPrimary;
    photos.splice(idx, 1);
    if (wasCover && photos.length > 0) {
      photos[0].isCover = true;
      photos[0].isPrimary = true;
    }

    return this.updateFacility(facilityId, hostId, tenantId, { photos });
  }

  public async addSpacePhoto(
    spaceId: string,
    hostId: string,
    tenantId: string = 'default',
    photo: Partial<FacilityPhotoItem>
  ): Promise<ParkingSpace> {
    if (!photo.url || typeof photo.url !== 'string' || photo.url.trim().length === 0) {
      throw new BadRequestException('A valid photo url is required.');
    }

    const space = await this.getSpace(spaceId, tenantId, hostId);
    await this.getFacility(space.facilityId, hostId, tenantId);

    const photos: any[] = Array.isArray(space.photos) ? [...space.photos] : [];
    const newPhoto = {
      id: photo.id || `pho-sp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      url: photo.url,
      caption: photo.caption || undefined,
      isCover: photos.length === 0,
      createdAt: new Date().toISOString(),
    };
    photos.push(newPhoto);

    return this.updateSpace(spaceId, hostId, tenantId, { photos });
  }

  public async deleteSpacePhoto(
    spaceId: string,
    hostId: string,
    tenantId: string = 'default',
    photoId: string
  ): Promise<ParkingSpace> {
    const space = await this.getSpace(spaceId, tenantId, hostId);
    await this.getFacility(space.facilityId, hostId, tenantId);

    const photos: any[] = Array.isArray(space.photos) ? [...space.photos] : [];
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx === -1) {
      throw new NotFoundException(`Photo with ID '${photoId}' not found on space.`);
    }

    photos.splice(idx, 1);
    return this.updateSpace(spaceId, hostId, tenantId, { photos });
  }

  // --- Public Customer Feed (Redacted) ---

  public async listPublicListings(tenantId: string = 'default'): Promise<PublicListingSummary[]> {
    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(`SELECT f.*, COUNT(s.id)::int AS total_spaces, COUNT(s.id) FILTER (WHERE s.is_active=TRUE AND s.status='available')::int AS active_spaces, MIN(s.hourly_rate_inr) FILTER (WHERE s.is_active=TRUE) AS min_hourly_rate, COALESCE(jsonb_agg(DISTINCT s.vehicle_category) FILTER (WHERE s.id IS NOT NULL), '[]'::jsonb) AS supported_vehicles FROM parking_facilities f LEFT JOIN parking_spaces s ON s.facility_id=f.id AND s.tenant_id=f.tenant_id WHERE f.tenant_id=$1 AND f.status='published' GROUP BY f.id ORDER BY f.created_at DESC`, [tenantId]);
      return rows.map((r) => ({ id: String(r.id), facilityCode: r.facility_code, name: r.name, addressLine1: r.address_line1, city: r.city, postalCode: r.postal_code, latitude: Number(r.latitude), longitude: Number(r.longitude), isCovered: Boolean(r.is_covered), is24x7: Boolean(r.is_24_7), totalSpaces: Number(r.total_spaces || 0), activeSpaces: Number(r.active_spaces || 0), minHourlyRateInr: r.min_hourly_rate == null ? 0 : Number(r.min_hourly_rate), supportedVehicles: this.asStringArray(r.supported_vehicles) as any, amenities: this.asStringArray(r.amenities), operatingModel: r.operating_model || 'commercial_garage', maxHeightClearanceMeters: r.max_height_clearance_meters == null ? undefined : Number(r.max_height_clearance_meters) }));
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Public listing storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const publishedFacilities = this.facilities.filter((f) => f.tenantId === tenantId && f.status === 'published');
    return publishedFacilities.map((fac) => {
      const facSpaces = this.spaces.filter((s) => s.facilityId === fac.id);
      const rates = facSpaces.map((s) => s.hourlyRateInr).filter((r) => r > 0);
      const vehicleCats = Array.from(new Set(facSpaces.map((s) => s.vehicleCategory)));
      return { id: fac.id, facilityCode: fac.facilityCode, name: fac.name, addressLine1: fac.addressLine1, city: fac.city, postalCode: fac.postalCode, latitude: fac.latitude, longitude: fac.longitude, isCovered: fac.isCovered, is24x7: fac.is24x7, totalSpaces: facSpaces.length, activeSpaces: facSpaces.filter((s) => s.status === 'available').length, minHourlyRateInr: rates.length ? Math.min(...rates) : 0, supportedVehicles: vehicleCats, amenities: fac.amenities || [], operatingModel: fac.operatingModel, maxHeightClearanceMeters: fac.maxHeightClearanceMeters };
    });
  }

  public async getPublicListing(id: string, tenantId: string = 'default'): Promise<PublicListingSummary> {
    const list = await this.listPublicListings(tenantId);
    const item = list.find((l) => l.id === id);
    if (!item) {
      throw new NotFoundException(`Listing ${id} not found or not published`);
    }
    return item;
  }

  // =============================================================================
  // Section 3B: Operating Hours & Weekly Schedules
  // =============================================================================

  public async listOperatingSchedules(
    facilityId: string,
    hostId?: string,
    tenantId: string = 'default'
  ): Promise<OperatingSchedule[]> {
    const facility = await this.getFacility(facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `SELECT * FROM operating_schedules WHERE facility_id=$1 ORDER BY day_of_week ASC`,
        [facilityId]
      );
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: String(r.id),
          facilityId: String(r.facility_id),
          tenantId: r.tenant_id ? String(r.tenant_id) : tenantId,
          dayOfWeek: Number(r.day_of_week),
          openTime: String(r.open_time).substring(0, 5),
          closeTime: String(r.close_time).substring(0, 5),
          isClosed: Boolean(r.is_closed),
          isOvernight: Boolean(r.is_overnight),
        }));
      }
    }

    // Fallback or demo mode: check in-memory store
    const existing = this.schedules.filter((s) => s.facilityId === facilityId);
    if (existing.length === 7) {
      return [...existing].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    }

    // Default 7-day schedule based on facility is24x7
    const result: OperatingSchedule[] = [];
    for (let day = 0; day <= 6; day++) {
      const match = existing.find((s) => s.dayOfWeek === day);
      if (match) {
        result.push(match);
      } else {
        const def: OperatingSchedule = {
          id: `sched-${facilityId}-${day}`,
          facilityId,
          tenantId,
          dayOfWeek: day,
          openTime: facility.is24x7 ? '00:00' : '06:00',
          closeTime: facility.is24x7 ? '23:59' : '23:00',
          isClosed: false,
          isOvernight: false,
        };
        this.schedules.push(def);
        result.push(def);
      }
    }

    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  public async updateOperatingSchedules(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    schedules: OperatingSchedule[]
  ): Promise<OperatingSchedule[]> {
    const facility = await this.getFacility(facilityId, hostId, tenantId);

    const validation = validateOperatingSchedules(schedules);
    if (!validation.success) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    const validatedList = validation.data!;

    if (this.databaseAvailable()) {
      await this.databaseService!.transaction(async (client) => {
        for (const item of validatedList) {
          await client.query(
            `INSERT INTO operating_schedules (
               facility_id, tenant_id, day_of_week, open_time, close_time, is_closed, is_overnight
             ) VALUES (
               $1, $2, $3, $4::time, $5::time, $6, $7
             )
             ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
               open_time = EXCLUDED.open_time,
               close_time = EXCLUDED.close_time,
               is_closed = EXCLUDED.is_closed,
               is_overnight = EXCLUDED.is_overnight;`,
            [
              facilityId,
              tenantId,
              item.dayOfWeek,
              item.openTime,
              item.closeTime,
              item.isClosed,
              item.isOvernight,
            ]
          );
        }
      });
      return this.listOperatingSchedules(facilityId, hostId, tenantId);
    }

    if (!this.demoMode) {
      throw new ServiceUnavailableException('Schedule storage is unavailable.');
    }

    for (const item of validatedList) {
      const idx = this.schedules.findIndex(
        (s) => s.facilityId === facilityId && s.dayOfWeek === item.dayOfWeek
      );
      const entry: OperatingSchedule = {
        id: `sched-${facilityId}-${item.dayOfWeek}`,
        facilityId,
        tenantId,
        dayOfWeek: item.dayOfWeek,
        openTime: item.openTime,
        closeTime: item.closeTime,
        isClosed: item.isClosed,
        isOvernight: item.isOvernight,
      };
      if (idx >= 0) {
        this.schedules[idx] = entry;
      } else {
        this.schedules.push(entry);
      }
    }

    return this.listOperatingSchedules(facilityId, hostId, tenantId);
  }

  public async deleteOperatingSchedule(
    facilityId: string,
    scheduleId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<{ deleted: boolean }> {
    await this.getFacility(facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      await this.databaseService!.query(
        `DELETE FROM operating_schedules WHERE id=$1 AND facility_id=$2`,
        [scheduleId, facilityId]
      );
      return { deleted: true };
    }

    const idx = this.schedules.findIndex(
      (s) => (s.id === scheduleId || String(s.dayOfWeek) === scheduleId) && s.facilityId === facilityId
    );
    if (idx >= 0) {
      this.schedules.splice(idx, 1);
    }
    return { deleted: true };
  }

  // =============================================================================
  // Section 3B: Date-Specific Closures (Blackouts & Special Closures)
  // =============================================================================

  public async listClosures(
    facilityId: string,
    hostId?: string,
    tenantId: string = 'default'
  ): Promise<FacilityClosure[]> {
    await this.getFacility(facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `SELECT * FROM facility_closures WHERE facility_id=$1 AND tenant_id=$2 ORDER BY starts_at ASC`,
        [facilityId, tenantId]
      );
      return rows.map((r) => ({
        id: String(r.id),
        facilityId: String(r.facility_id),
        tenantId: String(r.tenant_id),
        spaceId: r.space_id ? String(r.space_id) : undefined,
        title: r.title,
        reason: r.reason,
        startsAt: new Date(r.starts_at).toISOString(),
        endsAt: new Date(r.ends_at).toISOString(),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }

    return this.closures
      .filter((c) => c.facilityId === facilityId && (!c.tenantId || c.tenantId === tenantId))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  public async createClosure(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: CreateClosurePayload
  ): Promise<FacilityClosure> {
    await this.getFacility(facilityId, hostId, tenantId);

    if (payload.spaceId) {
      await this.getSpace(payload.spaceId, tenantId, hostId);
    }

    const validation = validateClosure(payload);
    if (!validation.success) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    const validClosure = validation.data!;
    const startMs = Date.parse(validClosure.startsAt);
    const endMs = Date.parse(validClosure.endsAt);

    // 1. Conflict detection with existing closures (overlapping ranges)
    const existingClosures = await this.listClosures(facilityId, hostId, tenantId);
    const hasOverlap = existingClosures.some((c) => {
      // Overlap if same space or either is facility-wide
      if (validClosure.spaceId && c.spaceId && c.spaceId !== validClosure.spaceId) {
        return false;
      }
      const cStart = Date.parse(c.startsAt);
      const cEnd = Date.parse(c.endsAt);
      return Math.max(startMs, cStart) < Math.min(endMs, cEnd);
    });

    if (hasOverlap) {
      throw new BadRequestException('A facility closure already overlaps the specified date and time window.');
    }

    // 2. Conflict detection with existing confirmed / active customer reservations
    // INVARIANT: Do not delete, modify or invalidate reservations. Report conflicts instead.
    if (this.databaseAvailable()) {
      const spaceClause = validClosure.spaceId ? ' AND space_id=$5' : '';
      const params: any[] = [facilityId, tenantId, validClosure.startsAt, validClosure.endsAt];
      if (validClosure.spaceId) params.push(validClosure.spaceId);

      const bookingConflicts = await this.databaseService!.query<any>(
        `SELECT id, booking_reference, starts_at, ends_at FROM bookings
         WHERE facility_id=$1 AND tenant_id=$2 AND status IN ('confirmed', 'active')
           AND ends_at > $3::timestamptz AND starts_at < $4::timestamptz${spaceClause}`,
        params
      );

      if (bookingConflicts.length > 0) {
        const details = bookingConflicts
          .map((b) => `${b.booking_reference || b.id} (${new Date(b.starts_at).toISOString()} to ${new Date(b.ends_at).toISOString()})`)
          .join(', ');
        throw new ConflictException(
          `Cannot schedule closure. Confirmed customer reservation(s) exist during this interval: ${details}. Existing bookings cannot be automatically cancelled or altered.`
        );
      }

      const rows = await this.databaseService!.query<any>(
        `INSERT INTO facility_closures (facility_id, tenant_id, space_id, title, reason, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
         RETURNING *`,
        [
          facilityId,
          tenantId,
          validClosure.spaceId || null,
          validClosure.title,
          validClosure.reason,
          validClosure.startsAt,
          validClosure.endsAt,
        ]
      );

      return {
        id: String(rows[0].id),
        facilityId: String(rows[0].facility_id),
        tenantId: String(rows[0].tenant_id),
        spaceId: rows[0].space_id ? String(rows[0].space_id) : undefined,
        title: rows[0].title,
        reason: rows[0].reason,
        startsAt: new Date(rows[0].starts_at).toISOString(),
        endsAt: new Date(rows[0].ends_at).toISOString(),
        createdAt: new Date(rows[0].created_at).toISOString(),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      };
    }

    if (!this.demoMode) {
      throw new ServiceUnavailableException('Closure storage is unavailable.');
    }

    const created: FacilityClosure = {
      id: `cls-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      facilityId,
      tenantId,
      spaceId: validClosure.spaceId,
      title: validClosure.title,
      reason: validClosure.reason,
      startsAt: validClosure.startsAt,
      endsAt: validClosure.endsAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.closures.push(created);
    return created;
  }

  public async updateClosure(
    facilityId: string,
    closureId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: UpdateClosurePayload
  ): Promise<FacilityClosure> {
    await this.getFacility(facilityId, hostId, tenantId);

    const existingClosures = await this.listClosures(facilityId, hostId, tenantId);
    const existing = existingClosures.find((c) => c.id === closureId);
    if (!existing) {
      throw new NotFoundException(`Facility closure with ID '${closureId}' not found.`);
    }

    const merged = {
      title: payload.title !== undefined ? payload.title : existing.title,
      reason: payload.reason !== undefined ? payload.reason : existing.reason,
      startsAt: payload.startsAt !== undefined ? payload.startsAt : existing.startsAt,
      endsAt: payload.endsAt !== undefined ? payload.endsAt : existing.endsAt,
      spaceId: payload.spaceId !== undefined ? payload.spaceId : existing.spaceId,
    };

    const validation = validateClosure(merged);
    if (!validation.success) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    const valid = validation.data!;
    const startMs = Date.parse(valid.startsAt);
    const endMs = Date.parse(valid.endsAt);

    // Check overlap with other closures
    const hasOverlap = existingClosures.some((c) => {
      if (c.id === closureId) return false;
      if (valid.spaceId && c.spaceId && c.spaceId !== valid.spaceId) return false;
      const cStart = Date.parse(c.startsAt);
      const cEnd = Date.parse(c.endsAt);
      return Math.max(startMs, cStart) < Math.min(endMs, cEnd);
    });

    if (hasOverlap) {
      throw new BadRequestException('Updated closure window overlaps another existing closure.');
    }

    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `UPDATE facility_closures
         SET title=$1, reason=$2, starts_at=$3::timestamptz, ends_at=$4::timestamptz, space_id=$5, updated_at=NOW()
         WHERE id=$6 AND facility_id=$7 AND tenant_id=$8
         RETURNING *`,
        [
          valid.title,
          valid.reason,
          valid.startsAt,
          valid.endsAt,
          valid.spaceId || null,
          closureId,
          facilityId,
          tenantId,
        ]
      );
      if (!rows[0]) throw new NotFoundException(`Closure '${closureId}' not found`);
      return {
        id: String(rows[0].id),
        facilityId: String(rows[0].facility_id),
        tenantId: String(rows[0].tenant_id),
        spaceId: rows[0].space_id ? String(rows[0].space_id) : undefined,
        title: rows[0].title,
        reason: rows[0].reason,
        startsAt: new Date(rows[0].starts_at).toISOString(),
        endsAt: new Date(rows[0].ends_at).toISOString(),
        createdAt: new Date(rows[0].created_at).toISOString(),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      };
    }

    const idx = this.closures.findIndex((c) => c.id === closureId);
    if (idx >= 0) {
      this.closures[idx] = {
        ...this.closures[idx],
        title: valid.title,
        reason: valid.reason,
        startsAt: valid.startsAt,
        endsAt: valid.endsAt,
        spaceId: valid.spaceId,
        updatedAt: new Date().toISOString(),
      };
      return this.closures[idx];
    }

    throw new NotFoundException(`Closure '${closureId}' not found`);
  }

  public async deleteClosure(
    facilityId: string,
    closureId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<{ deleted: boolean }> {
    await this.getFacility(facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      const res = await this.databaseService!.query<any>(
        `DELETE FROM facility_closures WHERE id=$1 AND facility_id=$2 AND tenant_id=$3 RETURNING id`,
        [closureId, facilityId, tenantId]
      );
      if (!res[0]) throw new NotFoundException(`Closure with ID '${closureId}' not found.`);
      return { deleted: true };
    }

    const idx = this.closures.findIndex((c) => c.id === closureId && c.facilityId === facilityId);
    if (idx === -1) {
      throw new NotFoundException(`Closure with ID '${closureId}' not found.`);
    }
    this.closures.splice(idx, 1);
    return { deleted: true };
  }

  // =============================================================================
  // Section 3B: Facility & Bay Maintenance Scheduling
  // =============================================================================

  public async listMaintenance(
    facilityId: string,
    hostId?: string,
    tenantId: string = 'default'
  ): Promise<FacilityMaintenance[]> {
    await this.getFacility(facilityId, hostId, tenantId);

    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `SELECT * FROM facility_maintenance_periods WHERE facility_id=$1 AND tenant_id=$2 ORDER BY starts_at ASC`,
        [facilityId, tenantId]
      );
      return rows.map((r) => ({
        id: String(r.id),
        facilityId: String(r.facility_id),
        tenantId: String(r.tenant_id),
        spaceId: r.space_id ? String(r.space_id) : undefined,
        title: r.title,
        description: r.description ?? undefined,
        status: r.status as MaintenanceStatus,
        startsAt: new Date(r.starts_at).toISOString(),
        endsAt: new Date(r.ends_at).toISOString(),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }

    return this.maintenance
      .filter((m) => m.facilityId === facilityId && (!m.tenantId || m.tenantId === tenantId))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  public async createMaintenance(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: CreateMaintenancePayload
  ): Promise<FacilityMaintenance> {
    await this.getFacility(facilityId, hostId, tenantId);

    let targetSpace: ParkingSpace | null = null;
    if (payload.spaceId) {
      targetSpace = await this.getSpace(payload.spaceId, tenantId, hostId);
    }

    const validation = validateMaintenance(payload);
    if (!validation.success) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    const valid = validation.data!;

    if (this.databaseAvailable()) {
      const spaceClause = valid.spaceId ? ' AND space_id=$5' : '';
      const params: any[] = [facilityId, tenantId, valid.startsAt, valid.endsAt];
      if (valid.spaceId) params.push(valid.spaceId);

      const bookingConflicts = await this.databaseService!.query<any>(
        `SELECT id, booking_reference, starts_at, ends_at FROM bookings
         WHERE facility_id=$1 AND tenant_id=$2 AND status IN ('confirmed', 'active')
           AND ends_at > $3::timestamptz AND starts_at < $4::timestamptz${spaceClause}`,
        params
      );

      if (bookingConflicts.length > 0) {
        const details = bookingConflicts
          .map((b) => `${b.booking_reference || b.id} (${new Date(b.starts_at).toISOString()} to ${new Date(b.ends_at).toISOString()})`)
          .join(', ');
        throw new ConflictException(
          `Cannot schedule maintenance. Confirmed customer reservation(s) exist during this interval: ${details}. Existing bookings cannot be automatically cancelled or altered.`
        );
      }

      const rows = await this.databaseService!.query<any>(
        `INSERT INTO facility_maintenance_periods (facility_id, tenant_id, space_id, title, description, status, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
         RETURNING *`,
        [
          facilityId,
          tenantId,
          valid.spaceId || null,
          valid.title,
          valid.description || null,
          valid.status,
          valid.startsAt,
          valid.endsAt,
        ]
      );

      // If active maintenance on individual space, synchronize bay status to maintenance
      if (valid.spaceId && valid.status === 'in_progress') {
        await this.databaseService!.query(
          `UPDATE parking_spaces SET status='maintenance', updated_at=NOW() WHERE id=$1 AND facility_id=$2 AND tenant_id=$3`,
          [valid.spaceId, facilityId, tenantId]
        );
      }

      return {
        id: String(rows[0].id),
        facilityId: String(rows[0].facility_id),
        tenantId: String(rows[0].tenant_id),
        spaceId: rows[0].space_id ? String(rows[0].space_id) : undefined,
        title: rows[0].title,
        description: rows[0].description ?? undefined,
        status: rows[0].status as MaintenanceStatus,
        startsAt: new Date(rows[0].starts_at).toISOString(),
        endsAt: new Date(rows[0].ends_at).toISOString(),
        createdAt: new Date(rows[0].created_at).toISOString(),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      };
    }

    if (!this.demoMode) {
      throw new ServiceUnavailableException('Maintenance storage is unavailable.');
    }

    const created: FacilityMaintenance = {
      id: `mnt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      facilityId,
      tenantId,
      spaceId: valid.spaceId,
      title: valid.title,
      description: valid.description,
      status: valid.status,
      startsAt: valid.startsAt,
      endsAt: valid.endsAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.maintenance.push(created);

    // Bay status synchronization
    if (valid.spaceId && valid.status === 'in_progress' && targetSpace) {
      targetSpace.status = 'maintenance';
      targetSpace.updatedAt = new Date().toISOString();
    }

    return created;
  }

  public async updateMaintenance(
    facilityId: string,
    maintenanceId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: UpdateMaintenancePayload
  ): Promise<FacilityMaintenance> {
    await this.getFacility(facilityId, hostId, tenantId);

    const existingList = await this.listMaintenance(facilityId, hostId, tenantId);
    const existing = existingList.find((m) => m.id === maintenanceId);
    if (!existing) {
      throw new NotFoundException(`Maintenance period with ID '${maintenanceId}' not found.`);
    }

    // Validate state transition if status is being updated
    if (payload.status !== undefined && payload.status !== existing.status) {
      const transitionVal = validateMaintenanceTransition(existing.status, payload.status);
      if (!transitionVal.success) {
        throw new BadRequestException(transitionVal.errors.join('; '));
      }
    }

    const merged = {
      title: payload.title !== undefined ? payload.title : existing.title,
      description: payload.description !== undefined ? payload.description : existing.description,
      status: payload.status !== undefined ? payload.status : existing.status,
      startsAt: payload.startsAt !== undefined ? payload.startsAt : existing.startsAt,
      endsAt: payload.endsAt !== undefined ? payload.endsAt : existing.endsAt,
      spaceId: payload.spaceId !== undefined ? payload.spaceId : existing.spaceId,
    };

    const validation = validateMaintenance(merged);
    if (!validation.success) {
      throw new BadRequestException(validation.errors.join('; '));
    }

    const valid = validation.data!;

    if (this.databaseAvailable()) {
      const rows = await this.databaseService!.query<any>(
        `UPDATE facility_maintenance_periods
         SET title=$1, description=$2, status=$3, starts_at=$4::timestamptz, ends_at=$5::timestamptz, space_id=$6, updated_at=NOW()
         WHERE id=$7 AND facility_id=$8 AND tenant_id=$9
         RETURNING *`,
        [
          valid.title,
          valid.description || null,
          valid.status,
          valid.startsAt,
          valid.endsAt,
          valid.spaceId || null,
          maintenanceId,
          facilityId,
          tenantId,
        ]
      );

      // Synchronize bay status
      if (valid.spaceId) {
        if (valid.status === 'in_progress') {
          await this.databaseService!.query(
            `UPDATE parking_spaces SET status='maintenance', updated_at=NOW() WHERE id=$1 AND facility_id=$2 AND tenant_id=$3`,
            [valid.spaceId, facilityId, tenantId]
          );
        } else if (valid.status === 'completed' || valid.status === 'cancelled') {
          await this.databaseService!.query(
            `UPDATE parking_spaces SET status='available', updated_at=NOW() WHERE id=$1 AND facility_id=$2 AND tenant_id=$3 AND status='maintenance'`,
            [valid.spaceId, facilityId, tenantId]
          );
        }
      }

      return {
        id: String(rows[0].id),
        facilityId: String(rows[0].facility_id),
        tenantId: String(rows[0].tenant_id),
        spaceId: rows[0].space_id ? String(rows[0].space_id) : undefined,
        title: rows[0].title,
        description: rows[0].description ?? undefined,
        status: rows[0].status as MaintenanceStatus,
        startsAt: new Date(rows[0].starts_at).toISOString(),
        endsAt: new Date(rows[0].ends_at).toISOString(),
        createdAt: new Date(rows[0].created_at).toISOString(),
        updatedAt: new Date(rows[0].updated_at).toISOString(),
      };
    }

    const idx = this.maintenance.findIndex((m) => m.id === maintenanceId);
    if (idx >= 0) {
      const updated: FacilityMaintenance = {
        ...this.maintenance[idx],
        title: valid.title,
        description: valid.description,
        status: valid.status,
        startsAt: valid.startsAt,
        endsAt: valid.endsAt,
        spaceId: valid.spaceId,
        updatedAt: new Date().toISOString(),
      };
      this.maintenance[idx] = updated;

      // Update bay status
      if (valid.spaceId) {
        const space = this.spaces.find((s) => s.id === valid.spaceId);
        if (space) {
          if (valid.status === 'in_progress') {
            space.status = 'maintenance';
          } else if (valid.status === 'completed' || valid.status === 'cancelled') {
            if (space.status === 'maintenance') {
              space.status = 'available';
            }
          }
        }
      }

      return updated;
    }

    throw new NotFoundException(`Maintenance period '${maintenanceId}' not found`);
  }

  public async deleteMaintenance(
    facilityId: string,
    maintenanceId: string,
    hostId: string,
    tenantId: string = 'default'
  ): Promise<{ deleted: boolean }> {
    await this.getFacility(facilityId, hostId, tenantId);

    const existingList = await this.listMaintenance(facilityId, hostId, tenantId);
    const existing = existingList.find((m) => m.id === maintenanceId);
    if (!existing) {
      throw new NotFoundException(`Maintenance period with ID '${maintenanceId}' not found.`);
    }

    if (this.databaseAvailable()) {
      if (existing.spaceId && existing.status === 'in_progress') {
        await this.databaseService!.query(
          `UPDATE parking_spaces SET status='available', updated_at=NOW() WHERE id=$1 AND facility_id=$2 AND status='maintenance'`,
          [existing.spaceId, facilityId]
        );
      }
      await this.databaseService!.query(
        `DELETE FROM facility_maintenance_periods WHERE id=$1 AND facility_id=$2 AND tenant_id=$3`,
        [maintenanceId, facilityId, tenantId]
      );
      return { deleted: true };
    }

    const idx = this.maintenance.findIndex((m) => m.id === maintenanceId);
    if (idx >= 0) {
      const removed = this.maintenance[idx];
      if (removed.spaceId && removed.status === 'in_progress') {
        const space = this.spaces.find((s) => s.id === removed.spaceId);
        if (space && space.status === 'maintenance') {
          space.status = 'available';
        }
      }
      this.maintenance.splice(idx, 1);
    }

    return { deleted: true };
  }

  public getInternalFacilities(): ParkingFacility[] {
    return this.facilities;
  }

  public getInternalSpaces(facilityId?: string): ParkingSpace[] {
    return facilityId ? this.spaces.filter((s) => s.facilityId === facilityId) : this.spaces;
  }

  public getInternalSchedules(facilityId?: string): OperatingSchedule[] {
    return facilityId ? this.schedules.filter((s) => s.facilityId === facilityId) : this.schedules;
  }

  public getInternalClosures(facilityId?: string): FacilityClosure[] {
    return facilityId ? this.closures.filter((c) => c.facilityId === facilityId) : this.closures;
  }

  public getInternalMaintenance(facilityId?: string): FacilityMaintenance[] {
    return facilityId ? this.maintenance.filter((m) => m.facilityId === facilityId) : this.maintenance;
  }
}

