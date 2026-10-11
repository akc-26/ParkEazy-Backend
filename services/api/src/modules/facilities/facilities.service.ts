import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ServiceUnavailableException, Optional } from '@nestjs/common';
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
} from '@parkeazy/shared-types';

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  // In-memory records are strictly an opt-in demo/test fixture, never production inventory.
  private facilities: ParkingFacility[] = [];
  private spaces: ParkingSpace[] = [];
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
        `SELECT s.*, (s.status='available' AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.space_id=s.id AND b.status IN ('confirmed','active') AND b.ends_at > COALESCE($2::timestamptz, NOW()) AND b.starts_at < COALESCE($2::timestamptz, NOW()) + ($3::text || ' hours')::interval)) AS currently_unbooked
         FROM parking_spaces s JOIN parking_facilities f ON f.id=s.facility_id AND f.tenant_id=s.tenant_id
         WHERE s.tenant_id=$1 AND f.status='published' AND s.is_active=TRUE`, [tenantId, arrivalTime || null, durationHours]);
      const facilities = facilityRows.map((r) => this.mapFacilityRow(r));
      const spaces = spaceRows.map((r) => this.mapSpaceRow(r, r.currently_unbooked ? 'available' : 'occupied'));
      return { facilities, spaces };
    }
    if (this.demoMode) return { facilities: this.facilities, spaces: this.spaces };
    throw new ServiceUnavailableException('Search inventory is unavailable. Configure PostgreSQL and apply migrations, or explicitly enable PARKEAZY_DEMO_MODE=true for local demo data.');
  }

  private mapFacilityRow(r: any): ParkingFacility {
    return { id: String(r.id), tenantId: String(r.tenant_id), hostId: String(r.host_id), facilityCode: r.facility_code, name: r.name, addressLine1: r.address_line1, addressLine2: r.address_line2 ?? undefined, city: r.city, postalCode: r.postal_code, latitude: Number(r.latitude), longitude: Number(r.longitude), entranceInstructions: r.entrance_instructions ?? undefined, gatePinCode: r.gate_pin_code ?? undefined, isCovered: Boolean(r.is_covered), is24x7: Boolean(r.is_24_7), status: r.status, totalSpaces: Number(r.total_spaces ?? 0), activeSpaces: Number(r.active_spaces ?? 0), amenities: this.asStringArray(r.amenities), operatingModel: r.operating_model ?? 'commercial_garage', propertyOwner: r.property_owner ?? undefined, landmark: r.landmark ?? undefined, ingressType: r.ingress_type ?? undefined, maxHeightClearanceMeters: r.max_height_clearance_meters == null ? undefined : Number(r.max_height_clearance_meters), accessHotline: r.access_hotline ?? undefined, turnByTurnDirections: r.turn_by_turn_directions ?? undefined, pedestrianAccessInstructions: r.pedestrian_access_instructions ?? undefined, photos: Array.isArray(r.photos) ? r.photos : [], createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() };
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
    if (this.databaseAvailable()) {
      const code = payload.facilityCode || `FAC-${Date.now().toString().slice(-12)}`;
      const rows = await this.databaseService!.query<any>(`INSERT INTO parking_facilities (tenant_id, host_id, facility_code, name, address_line1, address_line2, city, postal_code, latitude, longitude, entrance_instructions, gate_pin_code, is_covered, is_24_7, status, amenities, ingress_type, property_owner, landmark, max_height_clearance_meters, access_hotline, turn_by_turn_directions, pedestrian_access_instructions, photos, operating_model) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft',$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24) RETURNING *, 0::int AS total_spaces, 0::int AS active_spaces`, [tenantId, hostId, code, payload.name, payload.addressLine1, payload.addressLine2 || null, payload.city, payload.postalCode, payload.latitude, payload.longitude, payload.entranceInstructions || null, payload.gatePinCode || null, payload.isCovered ?? true, payload.is24x7 ?? true, JSON.stringify(payload.amenities || []), payload.ingressType || 'two_way_ramp', payload.propertyOwner || null, payload.landmark || null, payload.maxHeightClearanceMeters || 2.1, payload.accessHotline || null, payload.turnByTurnDirections || null, payload.pedestrianAccessInstructions || null, JSON.stringify(payload.photos || []), payload.operatingModel || 'commercial_garage']);
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
    this.logger.log(`Created new facility ${facilityCode} (${id}) for host ${hostId}`);
    return newFacility;
  }

  public async updateFacility(
    id: string,
    hostId: string,
    tenantId: string = 'default',
    payload: UpdateFacilityPayload
  ): Promise<ParkingFacility> {
    if (this.databaseAvailable()) {
      const columns: Record<string, string> = { facilityCode: 'facility_code', name: 'name', addressLine1: 'address_line1', addressLine2: 'address_line2', city: 'city', postalCode: 'postal_code', latitude: 'latitude', longitude: 'longitude', entranceInstructions: 'entrance_instructions', gatePinCode: 'gate_pin_code', isCovered: 'is_covered', is24x7: 'is_24_7', amenities: 'amenities', operatingModel: 'operating_model', propertyOwner: 'property_owner', landmark: 'landmark', ingressType: 'ingress_type', maxHeightClearanceMeters: 'max_height_clearance_meters', accessHotline: 'access_hotline', turnByTurnDirections: 'turn_by_turn_directions', pedestrianAccessInstructions: 'pedestrian_access_instructions', photos: 'photos' };
      const sets: string[] = []; const values: unknown[] = [id, tenantId, hostId];
      for (const [key, column] of Object.entries(columns)) if ((payload as any)[key] !== undefined) { values.push(['amenities', 'photos'].includes(key) ? JSON.stringify((payload as any)[key]) : (payload as any)[key]); sets.push(`${column}=$${values.length}${['amenities', 'photos'].includes(key) ? '::jsonb' : ''}`); }
      if (sets.length) { sets.push('updated_at=NOW()'); const rows = await this.databaseService!.query<any>(`UPDATE parking_facilities SET ${sets.join(', ')} WHERE id=$1 AND tenant_id=$2 AND host_id=$3 RETURNING *, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id) AS total_spaces, (SELECT COUNT(*)::int FROM parking_spaces s WHERE s.facility_id=parking_facilities.id AND s.is_active=TRUE) AS active_spaces`, values); if (rows[0]) return this.mapFacilityRow(rows[0]); }
      return this.getFacility(id, hostId, tenantId);
    }
    if (!this.demoMode) throw new ServiceUnavailableException('Facility storage is unavailable; configure PostgreSQL or explicitly enable demo mode.');
    const facility = await this.getFacility(id, hostId, tenantId);
    Object.assign(facility, payload, { updatedAt: new Date().toISOString() });
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
    payload: BulkCreateSpacesPayload
  ): Promise<ParkingSpace[]> {
    await this.getFacility(facilityId, hostId, tenantId);
    const created: ParkingSpace[] = [];

    for (let i = payload.startNumber; i <= payload.endNumber; i++) {
      const bayNum = i < 10 ? `0${i}` : `${i}`;
      const bayIdentifier = `${payload.prefix}-${bayNum}`;

      // Skip duplicates if any
      const existing = this.databaseAvailable()
        ? (await this.databaseService!.query<any>('SELECT id FROM parking_spaces WHERE facility_id=$1 AND tenant_id=$2 AND UPPER(bay_identifier)=UPPER($3)', [facilityId, tenantId, bayIdentifier])).length > 0
        : this.spaces.some((s) => s.facilityId === facilityId && s.tenantId === tenantId && s.bayIdentifier.toUpperCase() === bayIdentifier.toUpperCase());
      if (!existing) {
        const space = await this.createSpace(facilityId, hostId, tenantId, {
          bayIdentifier,
          floorLevel: payload.floorLevel,
          vehicleCategory: payload.vehicleCategory,
          hourlyRateInr: payload.hourlyRateInr,
          classification: payload.classification,
          hasEvCharger: payload.hasEvCharger,
          isDisabledAccessible: payload.isDisabledAccessible,
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
    Object.assign(space, payload, { updatedAt: new Date().toISOString() });
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
    facility.status = 'published'; facility.updatedAt = new Date().toISOString();
    this.logger.log(`Facility ${facility.facilityCode} (${facilityId}) published to marketplace`); return facility;
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

  public getInternalFacilities(): ParkingFacility[] {
    return this.facilities;
  }

  public getInternalSpaces(facilityId?: string): ParkingSpace[] {
    return facilityId ? this.spaces.filter((s) => s.facilityId === facilityId) : this.spaces;
  }
}
