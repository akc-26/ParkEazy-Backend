import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
  ReadinessCheckItem,
} from '@parkeazy/shared-types';

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  // In-memory backing store for facilities & spaces (with pre-seeded production facilities)
  private facilities: ParkingFacility[] = [];
  private spaces: ParkingSpace[] = [];

  constructor() {
    this.seedInitialData();
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

    this.logger.log(`Initialized ${this.facilities.length} facilities and ${this.spaces.length} spaces in store`);
  }

  // --- Facilities Management ---

  public async listHostFacilities(hostId: string, tenantId: string = 'default'): Promise<ParkingFacility[]> {
    return this.facilities.filter((f) => f.tenantId === tenantId && f.hostId === hostId);
  }

  public async getFacility(id: string, hostId?: string, tenantId: string = 'default'): Promise<ParkingFacility> {
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
    const facility = await this.getFacility(id, hostId, tenantId);
    Object.assign(facility, payload, { updatedAt: new Date().toISOString() });
    return facility;
  }

  // --- Spaces Management ---

  public async listSpaces(facilityId: string, hostId?: string, tenantId: string = 'default'): Promise<ParkingSpace[]> {
    if (hostId) {
      await this.getFacility(facilityId, hostId, tenantId);
    }
    return this.spaces.filter((s) => s.facilityId === facilityId && s.tenantId === tenantId);
  }

  public async getSpace(id: string): Promise<ParkingSpace> {
    const space = this.spaces.find((s) => s.id === id);
    if (!space) {
      throw new NotFoundException(`Parking space ${id} not found`);
    }
    return space;
  }

  public async createSpace(
    facilityId: string,
    hostId: string,
    tenantId: string = 'default',
    payload: CreateSpacePayload
  ): Promise<ParkingSpace> {
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
      const existing = this.spaces.find(
        (s) => s.facilityId === facilityId && s.bayIdentifier.toUpperCase() === bayIdentifier.toUpperCase()
      );
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
    const space = await this.getSpace(spaceId);
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
    const space = await this.getSpace(spaceId);
    await this.getFacility(space.facilityId, hostId, tenantId);

    space.status = status;
    space.updatedAt = new Date().toISOString();
    return space;
  }

  // --- Publication Readiness & Lifecycle ---

  public async getPublicationReadiness(
    facilityId: string,
    hostId?: string,
    tenantId: string = 'default'
  ): Promise<PublicationReadinessResult> {
    const facility = await this.getFacility(facilityId, hostId, tenantId);
    const facilitySpaces = this.spaces.filter((s) => s.facilityId === facilityId);

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
    facility.status = 'published';
    facility.updatedAt = new Date().toISOString();
    this.logger.log(`Facility ${facility.facilityCode} (${facilityId}) published to marketplace`);
    return facility;
  }

  // --- Public Customer Feed (Redacted) ---

  public async listPublicListings(tenantId: string = 'default'): Promise<PublicListingSummary[]> {
    const publishedFacilities = this.facilities.filter((f) => f.tenantId === tenantId && f.status === 'published');

    return publishedFacilities.map((fac) => {
      const facSpaces = this.spaces.filter((s) => s.facilityId === fac.id);
      const rates = facSpaces.map((s) => s.hourlyRateInr).filter((r) => r > 0);
      const minRate = rates.length > 0 ? Math.min(...rates) : 40;
      const vehicleCats = Array.from(new Set(facSpaces.map((s) => s.vehicleCategory)));

      const summary: PublicListingSummary = {
        id: fac.id,
        facilityCode: fac.facilityCode,
        name: fac.name,
        addressLine1: fac.addressLine1,
        city: fac.city,
        postalCode: fac.postalCode,
        latitude: fac.latitude,
        longitude: fac.longitude,
        isCovered: fac.isCovered,
        is24x7: fac.is24x7,
        totalSpaces: facSpaces.length,
        activeSpaces: facSpaces.filter((s) => s.status === 'available').length,
        minHourlyRateInr: minRate,
        supportedVehicles: vehicleCats.length > 0 ? vehicleCats : ['car'],
        amenities: fac.amenities || [],
        operatingModel: fac.operatingModel,
        maxHeightClearanceMeters: fac.maxHeightClearanceMeters,
      };

      return summary;
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
